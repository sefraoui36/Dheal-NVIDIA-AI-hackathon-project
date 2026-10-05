"""
Simulate a data-poisoning attack on the raw CSV.

Injects an implausible heart-rate value inside the last 72h window AND
recomputes the hash chain (so the attack looks "internally consistent" —
which is why we need the ML + range layers, not just hashing).

Writes to: backend/data/raw/user_001_attacked.csv
"""

import hashlib
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"

USER_ID = "user_001"
ATTACK_HOUR_OFFSET = 6       # 6h before the last record -> inside the 72h replay window
INJECTED_HR = 198


def _recompute_hashes(df: pd.DataFrame) -> pd.DataFrame:
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
    df = df.copy()
    df["record_hash"] = hashes
    return df


def simulate() -> Path:
    src = RAW_DIR / f"{USER_ID}.csv"
    dst = RAW_DIR / f"{USER_ID}_attacked.csv"

    df = pd.read_csv(src)
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    attack_ts = df["timestamp"].iloc[-1] - pd.Timedelta(hours=ATTACK_HOUR_OFFSET)
    mask = df["timestamp"] == attack_ts
    if not mask.any():
        raise ValueError(
            f"Could not find timestamp {attack_ts} in {src}. "
            f"Last record: {df['timestamp'].iloc[-1]}"
        )

    before = int(df.loc[mask, "heart_rate"].iloc[0])
    df.loc[mask, "heart_rate"] = INJECTED_HR

    # normalise timestamp back to string before hashing (matches generator format)
    df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")
    df = _recompute_hashes(df)
    df.to_csv(dst, index=False)

    print(f"Attack simulated -> {dst}")
    print(f"  {attack_ts}: heart_rate {before} -> {INJECTED_HR}")
    print(f"  Hashes recomputed (chain will still validate - that's the point)")
    return dst


if __name__ == "__main__":
    simulate()