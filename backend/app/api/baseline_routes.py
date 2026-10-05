"""Baseline endpoint — returns the learned personal baseline."""

from fastapi import APIRouter, HTTPException

from app.core.anomaly import load_baseline

router = APIRouter(prefix="/baseline", tags=["baseline"])


@router.get("/{user_id}")
def get_baseline(user_id: str):
    try:
        return load_baseline(user_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))