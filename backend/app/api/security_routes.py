"""Security Guardian endpoints: integrity + range + missing."""

from fastapi import APIRouter, HTTPException

from app.core.integrity import verify_chain
from app.core.validator import check_ranges, detect_missing
from app.services.replay_service import load_timeline

router = APIRouter(prefix="/security", tags=["security"])


@router.get("/analyze/{user_id}")
def analyze_security(user_id: str, hours: int = 72):
    try:
        df = load_timeline(user_id, hours=hours)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    integrity = verify_chain(user_id)

    violations = []
    for _, row in df.iterrows():
        for v in check_ranges(row.to_dict()):
            v["timestamp"] = str(row["timestamp"])
            violations.append(v)

    gaps = detect_missing([{"timestamp": str(ts)} for ts in df["timestamp"]])

    return {
        "user_id": user_id,
        "integrity": integrity,
        "range_violations": violations,
        "missing_gaps": gaps,
    }