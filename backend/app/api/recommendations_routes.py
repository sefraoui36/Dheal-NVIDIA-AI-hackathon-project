"""
Health recommendations endpoint.

One daily plan per user + goal. Cached per day so we don't call Nemotron
on every page load.
"""

import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai.nemotron_client import (
    generate_recommendations,
    generate_recommendations_lightning,
)
from app.services.recommendation_engine import build_recommendations_rule_based


router = APIRouter(prefix="/recommendations", tags=["recommendations"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROFILES_DIR = DATA_DIR / "profiles"
RECOMMENDATIONS_DIR = DATA_DIR / "recommendations"
RECOMMENDATIONS_DIR.mkdir(parents=True, exist_ok=True)

VALID_GOALS = {
    "lose_weight",
    "gain_weight",
    "improve_fitness",
    "improve_sleep",
    "reduce_stress",
}

# In-memory cache: { "user_id:goal:date": {...} }
RECOMMENDATIONS_CACHE: dict = {}


class RecommendationRequest(BaseModel):
    user_id: str
    goal: str
    available_minutes: int = 30
    force: bool = False


def _load_profile(user_id: str) -> dict:
    p = PROFILES_DIR / f"{user_id}.json"
    if not p.exists():
        return {"user_id": user_id, "name": "User"}
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {"user_id": user_id, "name": "User"}


def _condition_names(user_id: str) -> list[str]:
    profile = _load_profile(user_id)
    return profile.get("conditions", [])


@router.post("/generate")
def generate(req: RecommendationRequest):
    if req.goal not in VALID_GOALS:
        raise HTTPException(
            status_code=400, detail=f"Unsupported goal: {req.goal}"
        )
    if req.available_minutes not in (10, 15, 30, 45, 60):
        req.available_minutes = 30

    today = datetime.utcnow().date().isoformat()
    cache_key = f"{req.user_id}:{req.goal}:{req.available_minutes}:{today}"

    # return cached unless force
    if not req.force:
        cached = RECOMMENDATIONS_CACHE.get(cache_key)
        if cached:
            return cached

    profile = _load_profile(req.user_id)
    conditions = profile.get("conditions", [])

    # 1) try Nemotron first
    # ---- 1) Try Nano ----
    # ---- 1) Try Lightning (Nano is unreliable for this prompt) ----
    result: dict | None = None
    source = "nemotron_lightning"
    try:
        candidate = generate_recommendations_lightning(
            profile, req.goal, req.available_minutes, conditions
        )
        if (
                isinstance(candidate, dict)
                and candidate.get("movement")
                and candidate.get("food")
                and candidate.get("wellness")
                and candidate.get("why")
        ):
            result = candidate
            print("[recommendations] Lightning OK")
        else:
            print(f"[recommendations] Lightning returned: {candidate}")
    except Exception as e:
        print(f"[recommendations] Lightning failed: {e}")

    # ---- 2) Rule-based fallback ----
    if result is None:
        print("[recommendations] using rule-based fallback")
        result = build_recommendations_rule_based(req.user_id, req.goal)
        source = "rule_based"

    payload = {
        "user_id": req.user_id,
        "goal": req.goal,
        "available_minutes": req.available_minutes,
        "date": today,
        "movement": result.get("movement"),
        "food": result.get("food"),
        "wellness": result.get("wellness"),
        "why": result.get("why"),
        "movement_tag": result.get("movement_tag", "general_move"),
        "food_tag": result.get("food_tag", "general_food"),
        "conditions": conditions,
        "source": source,
        "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    RECOMMENDATIONS_CACHE[cache_key] = payload
    return payload


@router.get("/goals")
def list_goals():
    return {
        "goals": [
            {"key": "lose_weight", "label": "Lose weight", "icon": "monitor_weight"},
            {"key": "gain_weight", "label": "Gain weight", "icon": "fitness_center"},
            {"key": "improve_fitness", "label": "Improve fitness", "icon": "directions_run"},
            {"key": "improve_sleep", "label": "Improve sleep", "icon": "bedtime"},
            {"key": "reduce_stress", "label": "Reduce stress", "icon": "spa"},
        ]
    }
