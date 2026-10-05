"""Timeline endpoint — returns the replay-shaped timeline for the dashboard."""

from fastapi import APIRouter, HTTPException

from app.services.replay_service import build_replay

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/{user_id}")
def get_timeline(user_id: str, hours: int = 72):
    try:
        replay = build_replay(user_id, hours=hours)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {
        "user_id": user_id,
        "window": replay["window"],
        "timeline": replay["timeline"],
        "summary": replay["summary"],
    }