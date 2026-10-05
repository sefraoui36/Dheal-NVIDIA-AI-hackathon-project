"""
Mood check-in endpoints.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.schemas import MoodEntry

router = APIRouter(prefix="/mood", tags=["mood"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
MOOD_DIR = DATA_DIR / "mood"
MOOD_DIR.mkdir(parents=True, exist_ok=True)


def _path(user_id: str) -> Path:
    return MOOD_DIR / f"{user_id}.json"


def _load(user_id: str) -> list[dict]:
    p = _path(user_id)
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return []


def _save(user_id: str, entries: list[dict]) -> None:
    _path(user_id).write_text(
        json.dumps(entries, indent=2), encoding="utf-8"
    )


@router.post("")
def log_mood(entry: MoodEntry):
    if entry.score < 1 or entry.score > 5:
        raise HTTPException(
            status_code=400, detail="score must be between 1 and 5"
        )

    entries = _load(entry.user_id)
    ts = datetime.utcnow().isoformat(timespec="seconds")
    entries.append(
        {"timestamp": ts, "score": entry.score, "note": entry.note}
    )
    _save(entry.user_id, entries)
    return {"status": "ok", "timestamp": ts}


@router.get("/{user_id}")
def get_mood(user_id: str, days: int = 7):
    entries = _load(user_id)

    cutoff = datetime.utcnow() - timedelta(days=days)
    recent = []
    for e in entries:
        try:
            t = datetime.fromisoformat(e["timestamp"])
        except (ValueError, KeyError):
            continue
        if t >= cutoff:
            recent.append(e)

    if not recent and entries:
        recent = entries[-14:]

    by_day: dict[str, list[int]] = {}
    for e in recent:
        day = e["timestamp"][:10]
        by_day.setdefault(day, []).append(e["score"])

    daily = [
        {
            "date": day,
            "avg_score": round(sum(scores) / len(scores), 2),
            "count": len(scores),
        }
        for day, scores in sorted(by_day.items())
    ]

    today_str = datetime.utcnow().date().isoformat()
    today_entries = [e for e in recent if e["timestamp"].startswith(today_str)]
    today_score = today_entries[-1]["score"] if today_entries else None

    return {
        "user_id": user_id,
        "days": days,
        "today": today_score,
        "daily": daily,
        "entries": recent,
    }