"""Data endpoints: upload-free demo mode — reads the synthetic CSVs directly."""

from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.core.integrity import verify_chain
from app.services.replay_service import load_timeline

router = APIRouter(prefix="/data", tags=["data"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


@router.get("/raw/{user_id}")
def get_raw(user_id: str, hours: int = 72):
    try:
        df = load_timeline(user_id, hours=hours)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"user_id": user_id, "rows": df.to_dict(orient="records")}


@router.get("/integrity/{user_id}")
def get_integrity(user_id: str):
    try:
        return verify_chain(user_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))