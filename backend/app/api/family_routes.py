"""
Family advice endpoint.

Generates one short daily advice line per family member using Nemotron.
Caches per user per day — only regenerates if forced or if the cached
entry is from a previous day.
"""

import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai.nemotron_client import generate_family_advice
from app.services.replay_service import build_replay

router = APIRouter(prefix="/family", tags=["family"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROFILES_DIR = DATA_DIR / "profiles"
ADVICE_DIR = DATA_DIR / "advice"
ADVICE_DIR.mkdir(parents=True, exist_ok=True)


class AdviceRequest(BaseModel):
    user_id: str
    force: bool = False


def _profile_path(user_id: str) -> Path:
    return PROFILES_DIR / f"{user_id}.json"


def _advice_path(user_id: str) -> Path:
    return ADVICE_DIR / f"{user_id}.json"


def _load_profile(user_id: str) -> dict:
    p = _profile_path(user_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"No profile for {user_id}")
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=500, detail="Profile JSON is corrupted")


def _load_advice(user_id: str) -> dict | None:
    p = _advice_path(user_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _save_advice(user_id: str, data: dict) -> None:
    _advice_path(user_id).write_text(
        json.dumps(data, indent=2), encoding="utf-8"
    )


@router.post("/advice")
def get_advice(req: AdviceRequest):
    today = datetime.utcnow().date().isoformat()

    # return cached advice unless forced
    if not req.force:
        cached = _load_advice(req.user_id)
        if cached and cached.get("date") == today:
            return cached

    profile = _load_profile(req.user_id)
    try:
        replay = build_replay(req.user_id, hours=24)
    except FileNotFoundError:
        result = {
            "text": f"Hi {profile.get('name', 'there')} — no data logged yet today.",
        }
    else:
        try:
            result = generate_family_advice(
                profile,
                replay["summary"],
                replay["timeline"],
            )
            if not isinstance(result, dict) or "text" not in result:
                result = {"text": "Everything looks steady today."}
        except Exception as e:
            raise HTTPException(
                status_code=502, detail=f"Advice generation failed: {e}"
            )

    payload = {
        "user_id": req.user_id,
        "name": profile.get("name", "User"),
        "date": today,
        "text": result["text"],
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    _save_advice(req.user_id, payload)
    return payload