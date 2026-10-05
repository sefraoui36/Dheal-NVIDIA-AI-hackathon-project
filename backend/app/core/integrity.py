"""
Integrity layer: verify the SHA-256 hash chain of the raw CSV.

If any row was modified after generation, the chain breaks at that row
and every row after it. We report the first broken index.
"""

import hashlib
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"


def load_raw(user_id: str = "user_001") -> pd.DataFrame:
    path = RAW_DIR / f"{user_id}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Raw data not found: {path}")
    return pd.read_csv(path)


def _hash_row(prev_hash: str, row: pd.Series) -> str:
    payload = (
        f"{prev_hash}|{row['timestamp']}|{row['user_id']}|"
        f"{row['heart_rate']}|{row['sleep_hours']}|{row['steps']}|"
        f"{row['activity_minutes']}|{row['stress_level']}|{row['source']}"
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def verify_chain(user_id: str = "user_001") -> dict:
    """
    Recompute the hash chain from the raw CSV and compare.
    Returns:
      {
        "valid": bool,
        "total": int,
        "broken_at_index": int | None,
        "broken_at_timestamp": str | None,
      }
    """
    df = load_raw(user_id)
    prev_hash = "GENESIS"

    for i, row in df.iterrows():
        expected = _hash_row(prev_hash, row)
        if expected != row["record_hash"]:
            return {
                "valid": False,
                "total": len(df),
                "broken_at_index": int(i),
                "broken_at_timestamp": str(row["timestamp"]),
            }
        prev_hash = expected

    return {
        "valid": True,
        "total": len(df),
        "broken_at_index": None,
        "broken_at_timestamp": None,
    }


if __name__ == "__main__":
    print("Chain check:", verify_chain("user_001"))