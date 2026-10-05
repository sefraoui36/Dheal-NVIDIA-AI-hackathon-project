"""
Telemetry endpoints — expose Nebius Token Factory usage and trust history.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter

from app.ai.nemotron_client import MODEL, get_last_telemetry

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
HISTORY_DIR = DATA_DIR / "trust_history"
HISTORY_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/last")
def last_call():
    data = get_last_telemetry()
    data["configured_model"] = MODEL
    return data


@router.get("/trust-history/{user_id}")
def trust_history(user_id: str, days: int = 7):
    p = HISTORY_DIR / f"{user_id}.json"
    stored: list[dict] = []
    if p.exists():
        try:
            stored = json.loads(p.read_text(encoding="utf-8-sig"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            stored = []

    by_date = {e["date"]: e for e in stored}

    out = []
    today = datetime.utcnow().date()
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        iso = d.isoformat()
        entry = by_date.get(iso)
        out.append(
            {
                "date": iso,
                "score": entry["score"] if entry else None,
                "tier": entry["tier"] if entry else None,
            }
        )

    return {"user_id": user_id, "days": days, "history": out}