"""
Profile endpoints — one profile per family member.
"""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.services.conditions import CONDITIONS, get_condition

router = APIRouter(prefix="/profiles", tags=["profiles"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROFILES_DIR = DATA_DIR / "profiles"
PROFILES_DIR.mkdir(parents=True, exist_ok=True)


def _profile_path(user_id: str) -> Path:
    return PROFILES_DIR / f"{user_id}.json"


def _load_profile(user_id: str) -> dict | None:
    p = _profile_path(user_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


@router.get("")
def list_profiles():
    profiles = []
    for f in sorted(PROFILES_DIR.glob("*.json")):
        try:
            profiles.append(json.loads(f.read_text(encoding="utf-8-sig")))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
    return {"profiles": profiles}


@router.get("/conditions")
def list_conditions():
    return {"conditions": CONDITIONS}


@router.get("/{user_id}")
def get_profile(user_id: str):
    profile = _load_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"No profile for {user_id}")

    profile["condition_details"] = [
        get_condition(c) for c in profile.get("conditions", [])
    ]
    return profile