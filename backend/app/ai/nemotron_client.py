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

from app.ai.prompt_builder import (
    SYSTEM_PROMPT,
    build_ask_prompt,
    build_prompt,
)

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ENV_PATH)

BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1/")
MODEL = os.getenv("NEMOTRON_MODEL", "nvidia/Nemotron-3_5-Lightning")

# A friendlier system prompt for social/challenge content
CHALLENGE_SYSTEM_PROMPT = """You are a warm, friendly referee and coach for a
family health challenge. You write short, kind, specific messages grounded in
the actual data you are given.

Never mean. Never sarcastic. Never medical advice. Never diagnose. Never give
dietary prescriptions.

Always return valid JSON matching the requested schema. No prose outside JSON.
"""

# ---- pricing per 1M tokens (USD, approximate) ----
PRICING = {
    "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B": {"input": 0.03, "output": 0.12},
    "nvidia/Nemotron-3_5-Lightning": {"input": 0.06, "output": 0.24},
    "nvidia/Nemotron-3-Super": {"input": 0.30, "output": 1.20},
    "nvidia/Nemotron-3-Ultra-550b-a55b": {"input": 1.20, "output": 4.80},
}
DEFAULT_PRICING = {"input": 0.10, "output": 0.40}

# ---- in-memory telemetry (last call only) ----
LAST_CALL: dict = {}

# ---- per-day commentary cache: { "challenge_id:date": {...} } ----
COMMENTARY_CACHE: dict = {}


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
            "kind": kind,
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


def _call_nemotron(
    messages: list[dict],
    kind: str,
    temperature: float = 0.2,
    max_tokens: int = 2000,
    model_override: str | None = None,
) -> dict:
    """Internal — sends the request and records telemetry."""
    started = time.time()
    active_model = model_override or MODEL

    resp = _client().chat.completions.create(
        model=active_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    latency_ms = int((time.time() - started) * 1000)

    usage = getattr(resp, "usage", None)
    prompt_tokens = getattr(usage, "prompt_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "completion_tokens", 0) if usage else 0

    _record_telemetry(
        kind=kind,
        model=active_model,
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )

    content = resp.choices[0].message.content or ""

    # 1) trim whitespace
    content = content.strip()

    # 2) extract everything between the first "{" and last "}"
    first = content.find("{")
    last = content.rfind("}")
    if first != -1 and last != -1 and last > first:
        content = content[first : last + 1]

    # 3) if the JSON is truncated (no closing brace), try to close it
    if content.startswith("{") and not content.endswith("}"):
        if content.count('"') % 2 == 1:
            content += '"'
        content += "}"

    # 4) parse
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        print(f"[DEBUG nemotron] JSON parse failed on: {content[:400]!r}")
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


# ------------------------------------------------------------------
# Analysis / ask / prep
# ------------------------------------------------------------------


def analyze_replay(replay: dict, temperature: float = 0.2) -> dict:
    """Send the replay to Nemotron and return parsed JSON."""
    messages = build_prompt(replay)
    return _call_nemotron(messages, kind="analyze", temperature=temperature)


def ask_replay(replay: dict, question: str, temperature: float = 0.2) -> dict:
    """Send a user question + replay context to Nemotron. Returns parsed JSON."""
    messages = build_ask_prompt(replay, question)
    return _call_nemotron(messages, kind="ask", temperature=temperature)


def prepare_doctor_visit(replay: dict, temperature: float = 0.3) -> dict:
    """Send the replay to Nemotron for doctor-visit preparation."""
    from app.ai.prompt_builder import build_prep_prompt

    messages = build_prep_prompt(replay)
    return _call_nemotron(messages, kind="prep", temperature=temperature)


# ------------------------------------------------------------------
# Family advice
# ------------------------------------------------------------------


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


# ------------------------------------------------------------------
# Challenges — coach + cheer
# ------------------------------------------------------------------


def generate_challenge_commentary(
    leaderboard: dict,
    progress: dict,
    activity: dict,
) -> dict:
    """
    Coach's read on the race.

    Uses TWO small calls to Nano instead of one big one — Nano handles
    short prompts reliably but chokes on large ones.
    """
    challenge_name = leaderboard["challenge"]["name"]
    unit = activity["unit"]
    leader = leaderboard.get("winner") or {}

    names = [r["name"] for r in leaderboard.get("leaderboard", [])]
    totals = [r["verified_total"] for r in leaderboard.get("leaderboard", [])]
    daily_summary = []
    for s in progress.get("series", []):
        recent = s["daily"][-4:]
        values = "/".join(str(round(v)) for v in recent)
        daily_summary.append(f"{s['name']}: {values}")

    # --------- CALL 1: the coach paragraph ----------
    prompt1 = (
        f"Challenge: {challenge_name}. "
        f"Activity: {activity['label']} ({unit}). "
        f"Leader: {leader.get('name', '—')} with {leader.get('verified_total', 0)}{unit}. "
        f"All totals: " + ", ".join(f"{n}={t}{unit}" for n, t in zip(names, totals)) + ". "
        f"Last 4 days per person: " + "; ".join(daily_summary) + ". "
        "Write 3 warm sentences (max 60 words) explaining the race shape: "
        "the leader's pattern, one other person's trend, and who could close the gap. "
        "Never medical. "
        'Return only JSON: {"text": "..."}'
    )

    result1 = _call_nemotron(
        messages=[
            {"role": "system", "content": "Return JSON only."},
            {"role": "user", "content": prompt1},
        ],
        kind="commentary",
        temperature=0.6,
        max_tokens=400,
    )

    text = result1.get("text") if isinstance(result1, dict) else None
    if not text:
        text = (
            f"{leader.get('name', 'The leader')} is currently ahead "
            f"with {leader.get('verified_total', 0)} {unit}. "
            "Everyone is doing well — keep it up!"
        )

    # --------- CALL 2: per-person suggestions ----------
    suggestions: list[dict] = []
    for r in leaderboard.get("leaderboard", [])[:4]:
        s_name = r["name"]
        s_total = r["verified_total"]
        s_gap = leader.get("verified_total", 0) - s_total

        prompt2 = (
            f"Person: {s_name}. Their total: {s_total}{unit}. "
            f"Gap to leader: {s_gap}{unit}. "
            "Write 6-8 words describing their race pattern, and one short "
            "non-medical suggestion (max 12 words) for the rest of the challenge. "
            'Return JSON: {"pattern": "...", "suggestion": "..."}'
        )

        try:
            result2 = _call_nemotron(
                messages=[
                    {"role": "system", "content": "Return JSON only."},
                    {"role": "user", "content": prompt2},
                ],
                kind="commentary",
                temperature=0.6,
                max_tokens=200,
            )
            pattern = (
                result2.get("pattern", "steady progress")
                if isinstance(result2, dict)
                else "steady progress"
            )
            suggestion = (
                result2.get("suggestion", "keep the daily routine")
                if isinstance(result2, dict)
                else "keep the daily routine"
            )
        except Exception as e:
            print(f"[DEBUG commentary] person {s_name} failed: {e}")
            pattern = "steady progress"
            suggestion = "keep the daily routine"

        suggestions.append({
            "name": s_name,
            "pattern": pattern,
            "suggestion": suggestion,
        })

    return {
        "text": text,
        "per_person": suggestions,
    }


def generate_challenge_cheer(
    target_name: str,
    target_total: float,
    target_daily: list,
    leader_name: str,
    leader_total: float,
    activity_label: str,
    activity_unit: str,
) -> dict:
    """
    Generate a short, personal cheer for one participant — grounded in
    their actual day-by-day trend, not just the totals.
    """
    gap = leader_total - target_total
    daily_str = ", ".join(str(round(v)) for v in target_daily[-5:])

    user_prompt = f"""Write a short, warm, personal cheer message to
{target_name} in a {activity_label} challenge.

Their last few days (day-by-day): [{daily_str}]
Their total: {target_total} {activity_unit}
Leader ({leader_name}): {leader_total} {activity_unit}
Gap to close: {gap} {activity_unit}

Write ONE sentence (max 25 words) that:
- References their actual trend if meaningful
  ("three strong days in a row", "you're picking up pace",
   "one big day could close the gap")
- Feels personal and kind
- Is specific, not generic
- Never mean, never sarcastic, never medical advice

Return STRICT JSON: {{ "text": "the message" }}"""

    return _call_nemotron(
        messages=[
            {"role": "system", "content": CHALLENGE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        kind="cheer",
        temperature=0.7,
        max_tokens=200,
    )


# ------------------------------------------------------------------
# Recommendations
# ------------------------------------------------------------------


def generate_recommendations(
    profile: dict,
    goal: str,
    available_minutes: int,
    conditions: list[str],
) -> dict:
    """
    Generate the daily plan: movement + food + wellness + why.
    Uses Nano with a strict JSON-only system prompt.
    """
    from app.ai.prompt_builder import build_recommendations_prompt

    messages = build_recommendations_prompt(
        profile, goal, available_minutes, conditions
    )

    messages[0] = {
        "role": "system",
        "content": (
            "You are a helpful assistant. Return ONLY valid JSON. "
            "Do NOT write any reasoning, thinking, or explanation. "
            "The first character of your response must be '{'. "
            "The last character must be '}'."
        ),
    }

    return _call_nemotron(
        messages=messages,
        kind="recommendations",
        temperature=0.6,
        max_tokens=1500,
        model_override="nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    )


def generate_recommendations_lightning(
    profile: dict,
    goal: str,
    available_minutes: int,
    conditions: list[str],
) -> dict:
    """
    Same as generate_recommendations, but uses Nemotron Lightning
    instead of Nano. Lightning leaks chain-of-thought, so we use the
    strict CHALLENGE_SYSTEM_PROMPT and give it enough tokens to finish.
    """
    from app.ai.prompt_builder import build_recommendations_prompt

    messages = build_recommendations_prompt(
        profile, goal, available_minutes, conditions
    )

    messages[0] = {
        "role": "system",
        "content": (
            "You are a helpful assistant. Return ONLY valid JSON. "
            "Do NOT write any reasoning, thinking, or explanation. "
            "The first character of your response must be '{'. "
            "The last character must be '}'."
        ),
    }

    return _call_nemotron(
        messages=messages,
        kind="recommendations",
        temperature=0.5,
        max_tokens=4000,
        model_override="nvidia/Nemotron-3_5-Lightning",
    )


# ------------------------------------------------------------------
# Mood support
# ------------------------------------------------------------------


def generate_mood_response(
    profile: dict,
    user_message: str,
    recent_mood: list,
    crisis: bool = False,
    health_context: str = "",
    force_health_analysis: bool = False,
) -> dict:
    """
    Generate a warm, brief reply for the mood-support chat.
    Passes the user's real health context so the reply is DHeal-specific.

    Uses Lightning (not Nano) because Nano returns empty on prompts
    with health context. Lightning handles the longer prompt reliably.
    """
    from app.ai.prompt_builder import build_mood_prompt

    messages = build_mood_prompt(
        profile=profile,
        user_message=user_message,
        recent_mood=recent_mood,
        crisis=crisis,
        health_context=health_context,
        force_health_analysis=force_health_analysis,
    )

    # Override the system prompt with a strict JSON-only one, since
    # Lightning tends to leak chain-of-thought otherwise.
    messages[0] = {
        "role": "system",
        "content": (
            "You are DHeal Guardian — a warm wellness companion that "
            "knows the user's real health data. "
            "You ALWAYS reply in the same language as the user's message. "
            "Return ONLY valid JSON. Do NOT write any reasoning, thinking, "
            "or explanation outside the JSON. "
            "The first character of your response must be '{' and the last "
            "must be '}'. No prose, no markdown, no preambles."
        ),
    }

    return _call_nemotron(
        messages=messages,
        kind="mood_support",
        temperature=0.6,
        max_tokens=2500,
        model_override="nvidia/Nemotron-3_5-Lightning",
    )


if __name__ == "__main__":
    print("Available models:")
    for m in list_models():
        print(f"  {m}")