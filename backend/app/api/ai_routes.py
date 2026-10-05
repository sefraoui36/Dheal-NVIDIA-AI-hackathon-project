"""Nemotron AI analysis + Q&A."""

import json
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.ai.nemotron_client import analyze_replay, ask_replay
from app.models.schemas import AskRequest, ReplayRequest
from app.services.replay_service import _compute_trust_score, build_replay

router = APIRouter(prefix="/ai", tags=["ai"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
HISTORY_DIR = DATA_DIR / "trust_history"
HISTORY_DIR.mkdir(parents=True, exist_ok=True)


def _history_path(user_id: str) -> Path:
    return HISTORY_DIR / f"{user_id}.json"


def _load_history(user_id: str) -> list[dict]:
    p = _history_path(user_id)
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return []


def _seed_history_if_needed(user_id: str) -> None:
    entries = _load_history(user_id)
    if len(entries) >= 5:
        return

    today = datetime.utcnow().date()
    story = [
        (6, 100, "EXCELLENT"),
        (5, 100, "EXCELLENT"),
        (4, 92, "EXCELLENT"),
        (3, 58, "DEGRADED"),
        (2, 88, "GOOD"),
        (1, 100, "EXCELLENT"),
    ]
    seeded = []
    for offset, score, tier in story:
        d = today - timedelta(days=offset)
        seeded.append({"date": d.isoformat(), "score": score, "tier": tier})

    _history_path(user_id).write_text(
        json.dumps(seeded, indent=2), encoding="utf-8"
    )


def _append_history(user_id: str, score: int, tier: str) -> None:
    _seed_history_if_needed(user_id)
    entries = _load_history(user_id)

    today = datetime.utcnow().date().isoformat()
    entries = [e for e in entries if e.get("date") != today]
    entries.append({"date": today, "score": score, "tier": tier})

    entries.sort(key=lambda e: e["date"])
    entries = entries[-30:]

    _history_path(user_id).write_text(
        json.dumps(entries, indent=2), encoding="utf-8"
    )


@router.post("/analyze")
def ai_analyze(req: ReplayRequest):
    try:
        replay = build_replay(req.user_id, hours=req.hours)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        result = analyze_replay(replay)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Nemotron call failed: {e}")

    confidence = result.get("confidence") if isinstance(result, dict) else None
    trust_score = _compute_trust_score(
        replay["integrity"],
        replay["summary"],
        ai_confidence=confidence,
    )

    _append_history(req.user_id, trust_score["score"], trust_score["tier"])

    return {
        "replay_summary": replay["summary"],
        "analysis": result,
        "trust_score": trust_score,
    }


@router.post("/ask")
def ai_ask(req: AskRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        replay = build_replay(req.user_id, hours=req.hours)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        result = ask_replay(replay, req.question)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Nemotron call failed: {e}")

    return {"question": req.question, "answer": result}