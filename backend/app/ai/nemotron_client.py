"""
Nemotron client via Nebius Token Factory (OpenAI-compatible API).

Reads NEBIUS_API_KEY and NEMOTRON_MODEL from .env.
Records telemetry (latency, tokens, cost estimate) for the last call.
"""

import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from app.ai.prompt_builder import build_ask_prompt, build_prompt

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ENV_PATH)

BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1/")
MODEL = os.getenv("NEMOTRON_MODEL", "nvidia/Nemotron-3_5-Lightning")

# ---- pricing per 1M tokens (USD, approximate — update if prices change) ----
PRICING = {
    "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B": {"input": 0.03, "output": 0.12},
    "nvidia/Nemotron-3_5-Lightning": {"input": 0.06, "output": 0.24},
    "nvidia/Nemotron-3-Super": {"input": 0.30, "output": 1.20},
    "nvidia/Nemotron-3-Ultra-550b-a55b": {"input": 1.20, "output": 4.80},
}
DEFAULT_PRICING = {"input": 0.10, "output": 0.40}

# ---- in-memory telemetry (last call only) ----
LAST_CALL: dict = {}


def _client() -> OpenAI:
    key = os.getenv("NEBIUS_API_KEY")
    if not key:
        raise RuntimeError("NEBIUS_API_KEY missing from .env")
    return OpenAI(base_url=BASE_URL, api_key=key)


def _record_telemetry(
    kind: str,
    model: str,
    latency_ms: int,
    prompt_tokens: int,
    completion_tokens: int,
) -> None:
    rates = PRICING.get(model, DEFAULT_PRICING)
    cost_in = (prompt_tokens / 1_000_000) * rates["input"]
    cost_out = (completion_tokens / 1_000_000) * rates["output"]

    LAST_CALL.update(
        {
            "kind": kind,  # "analyze" | "ask"
            "model": model,
            "latency_ms": latency_ms,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "cost_usd": round(cost_in + cost_out, 6),
            "timestamp": time.time(),
            "provider": "Nebius Token Factory",
        }
    )


def get_last_telemetry() -> dict:
    return LAST_CALL or {
        "kind": None,
        "model": MODEL,
        "latency_ms": None,
        "prompt_tokens": None,
        "completion_tokens": None,
        "total_tokens": None,
        "cost_usd": None,
        "timestamp": None,
        "provider": "Nebius Token Factory",
    }


def list_models() -> list[str]:
    return [m.id for m in _client().models.list().data]


def _call_nemotron(messages: list[dict], kind: str, temperature: float = 0.2) -> dict:
    """Internal — sends the request and records telemetry."""
    started = time.time()

    resp = _client().chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=temperature,
        response_format={"type": "json_object"},
        max_tokens=2000,
    )

    latency_ms = int((time.time() - started) * 1000)

    usage = getattr(resp, "usage", None)
    prompt_tokens = getattr(usage, "prompt_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "completion_tokens", 0) if usage else 0

    _record_telemetry(
        kind=kind,
        model=MODEL,
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )

    content = resp.choices[0].message.content or ""

    # Strip any prose before the first "{" and after the last "}"
    first = content.find("{")
    last = content.rfind("}")
    if first != -1 and last != -1 and last > first:
        content = content[first : last + 1]

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Return a valid schema so the frontend never crashes
        return {
            "headline": "Analysis could not be completed reliably.",
            "what_changed": [
                "The model returned unstructured output this time.",
                "This is a known limitation of the current model run.",
            ],
            "evidence_used": [],
            "unreliable_evidence": [
                "The last AI attempt returned unparseable output and was discarded.",
            ],
            "confidence": "LIMITED",
            "confidence_reason": "The AI could not produce structured output for this window.",
            "next_steps": [
                "Retry the analysis.",
                "If the problem persists, reduce the window size or restart the backend.",
            ],
            "disclaimer": "Not a diagnosis. No reliable analysis is available for this window.",
            "_debug_raw": content[:500],
        }


def analyze_replay(replay: dict, temperature: float = 0.2) -> dict:
    """Send the replay to Nemotron and return parsed JSON."""
    messages = build_prompt(replay)
    return _call_nemotron(messages, kind="analyze", temperature=temperature)


def ask_replay(replay: dict, question: str, temperature: float = 0.2) -> dict:
    """Send a user question + replay context to Nemotron. Returns parsed JSON."""
    messages = build_ask_prompt(replay, question)
    return _call_nemotron(messages, kind="ask", temperature=temperature)


if __name__ == "__main__":
    print("Available models:")
    for m in list_models():
        print(f"  {m}")
def prepare_doctor_visit(replay: dict, temperature: float = 0.3) -> dict:
    """Send the replay to Nemotron for doctor-visit preparation."""
    from app.ai.prompt_builder import build_prep_prompt

    messages = build_prep_prompt(replay)
    return _call_nemotron(messages, kind="prep", temperature=temperature)
def generate_family_advice(
    profile: dict,
    timeline_summary: dict,
    timeline_rows: list,
    temperature: float = 0.7,
) -> dict:
    """Generate one short daily advice line for a family member."""
    from app.ai.prompt_builder import build_family_advice_prompt

    messages = build_family_advice_prompt(
        profile, timeline_summary, timeline_rows
    )
    return _call_nemotron(messages, kind="advice", temperature=temperature)