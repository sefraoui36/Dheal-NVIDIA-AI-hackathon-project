"""Simulate-attack endpoint — the demo button."""

import shutil
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.models.schemas import SimulateAttackRequest

router = APIRouter(prefix="/simulate-attack", tags=["demo"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"


@router.post("")
def simulate_attack(req: SimulateAttackRequest):
    user_id = req.user_id
    src = RAW_DIR / f"{user_id}.csv"
    dst = RAW_DIR / f"{user_id}_attacked.csv"
    backup = RAW_DIR / f"{user_id}_original.csv"

    if not src.exists():
        raise HTTPException(status_code=404, detail=f"No data for {user_id}")

    # keep a pristine backup once
    if not backup.exists():
        shutil.copy2(src, backup)

    df = pd.read_csv(backup)
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    attack_ts = df["timestamp"].iloc[-1] - pd.Timedelta(hours=req.attack_hour_offset)
    mask = df["timestamp"] == attack_ts
    if not mask.any():
        raise HTTPException(status_code=400, detail=f"No row at {attack_ts}")

    original_hr = int(df.loc[mask, "heart_rate"].iloc[0])
    df.loc[mask, "heart_rate"] = req.injected_hr

    # recompute hashes so the chain still validates (poisoning simulation)
    import hashlib

    df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")
    hashes = []
    prev = "GENESIS"
    for _, row in df.iterrows():
        payload = (
            f"{prev}|{row['timestamp']}|{row['user_id']}|"
            f"{row['heart_rate']}|{row['sleep_hours']}|{row['steps']}|"
            f"{row['activity_minutes']}|{row['stress_level']}|{row['source']}"
        )
        h = hashlib.sha256(payload.encode()).hexdigest()
        hashes.append(h)
        prev = h
    df["record_hash"] = hashes

    df.to_csv(dst, index=False)
    shutil.copy2(dst, src)  # swap in as the "live" file

    return {
        "status": "injected",
        "user_id": user_id,
        "attack_timestamp": str(attack_ts),
        "original_hr": original_hr,
        "injected_hr": req.injected_hr,
        "attacked_file": str(dst),
    }


@router.post("/restore")
def restore(user_id: str = "user_001"):
    backup = RAW_DIR / f"{user_id}_original.csv"
    live = RAW_DIR / f"{user_id}.csv"
    if not backup.exists():
        raise HTTPException(status_code=404, detail="No backup available")
    shutil.copy2(backup, live)
    return {"status": "restored", "user_id": user_id}