"""
Generic tracking endpoints.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.schemas import TrackingEntry
from app.services.insights.arthritis import analyze_arthritis
from app.services.insights.diabetes import analyze_diabetes
from app.services.insights.hypertension import analyze_hypertension
from app.services.insights.menopause import analyze_menopause
from app.services.insights.pregnancy import analyze_pregnancy
from app.services.insights.recovery import analyze_recovery

router = APIRouter(prefix="/tracking", tags=["tracking"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
TRACKING_DIR = DATA_DIR / "tracking"
PROFILES_DIR = DATA_DIR / "profiles"
RAW_DIR = DATA_DIR / "raw"

TRACKING_DIR.mkdir(parents=True, exist_ok=True)


VALID_TYPES = {
    "glucose", "water", "meal", "bp", "salt", "pain", "stiffness",
    "wound", "mobility", "hot_flash", "night_sweat", "mood", "kick", "weight",
}


def _path(user_id: str) -> Path:
    return TRACKING_DIR / f"{user_id}.json"


def _load(user_id: str) -> list[dict]:
    p = _path(user_id)
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return []


def _save(user_id: str, entries: list[dict]) -> None:
    _path(user_id).write_text(json.dumps(entries, indent=2), encoding="utf-8")


def _load_profile(user_id: str) -> dict:
    p = PROFILES_DIR / f"{user_id}.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}


def _load_watch_rows(user_id: str, hours: int = 168) -> list[dict]:
    """Load the last `hours` of watch data as plain dicts with metrics."""
    import pandas as pd

    path = RAW_DIR / f"{user_id}.csv"
    if not path.exists():
        return []
    df = pd.read_csv(path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").tail(hours)
    rows = []
    for _, r in df.iterrows():
        rows.append({
            "timestamp": str(r["timestamp"]),
            "metrics": {
                "heart_rate": int(r["heart_rate"]),
                "sleep_hours": float(r["sleep_hours"]),
                "steps": int(r["steps"]),
                "activity_minutes": int(r["activity_minutes"]),
                "stress_level": int(r["stress_level"]),
            },
        })
    return rows


@router.post("")
def log_entry(entry: TrackingEntry):
    if entry.type not in VALID_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Unknown tracking type: {entry.type}"
        )

    entries = _load(entry.user_id)
    ts = datetime.utcnow().isoformat(timespec="seconds")
    entries.append({"type": entry.type, "timestamp": ts, **entry.data})
    entries = entries[-500:]
    _save(entry.user_id, entries)
    return {"status": "ok", "timestamp": ts}


@router.get("/{user_id}")
def get_entries(user_id: str, type: str | None = None, days: int = 7):
    entries = _load(user_id)

    cutoff = datetime.utcnow() - timedelta(days=days)
    recent = []
    for e in entries:
        try:
            t = datetime.fromisoformat(e["timestamp"])
        except (ValueError, KeyError):
            continue
        if t >= cutoff:
            if type is None or e.get("type") == type:
                recent.append(e)

    if not recent and entries:
        fallback = [
            e for e in entries
            if type is None or e.get("type") == type
        ]
        recent = fallback[-30:]

    # ---- condition-specific insights ----
    insights: list[str] = []
    profile = _load_profile(user_id)
    conditions = profile.get("conditions", [])
    watch = _load_watch_rows(user_id, hours=168)

    if "type_2_diabetes" in conditions:
        insights.extend(analyze_diabetes(watch, recent))

    if "hypertension" in conditions:
        insights.extend(analyze_hypertension(watch, recent))

    if "arthritis" in conditions:
        insights.extend(analyze_arthritis(watch, recent))

    if "post_surgery_recovery" in conditions:
        insights.extend(analyze_recovery(watch, recent))

    if "menopause" in conditions:
        insights.extend(analyze_menopause(watch, recent))

    # Pregnancy: give the analyzer ALL entries + the profile
    if any(c.startswith("pregnancy") for c in conditions):
        insights.extend(analyze_pregnancy(watch, entries, profile))

    return {
        "user_id": user_id,
        "type_filter": type,
        "days": days,
        "entries": recent,
        "insights": insights,
    }