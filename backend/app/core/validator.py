"""
Physiological / integrity validator.

Two responsibilities:
1. Range check — is the value physically possible?
2. Missing-data check — is the timestamp series complete?

Anything that fails → FLAGGED.
"""

import hashlib
from datetime import datetime

# Hard physiological limits — anything outside is physically impossible
PHYSIOLOGICAL_RANGES = {
    "heart_rate":       (20, 250),      # bpm
    "sleep_hours":      (0, 24),        # hours/day
    "steps":            (0, 100_000),   # per hour bucket
    "activity_minutes": (0, 60),        # minutes per hour
    "stress_level":     (1, 10),        # 1-10 scale
}

EXPECTED_INTERVAL_MINUTES = 60


def check_ranges(record: dict) -> list[dict]:
    """Return list of violations (empty if clean)."""
    violations = []
    for metric, (lo, hi) in PHYSIOLOGICAL_RANGES.items():
        if metric not in record or record[metric] is None:
            continue
        value = float(record[metric])
        if value < lo or value > hi:
            violations.append({
                "metric": metric,
                "value": value,
                "expected_range": [lo, hi],
                "reason": "out_of_physiological_range",
            })
    return violations


def verify_hash_chain(records: list[dict]) -> dict:
    """
    Recompute the hash chain and compare with stored hashes.
    records: list of dicts with keys timestamp, user_id, heart_rate, sleep_hours,
             steps, activity_minutes, stress_level, source, record_hash
    Returns {"valid": bool, "broken_at_index": int|None, "total": int}
    """
    prev_hash = "GENESIS"
    for i, row in enumerate(records):
        payload = (
            f"{prev_hash}|{row['timestamp']}|{row['user_id']}|"
            f"{row['heart_rate']}|{row['sleep_hours']}|{row['steps']}|"
            f"{row['activity_minutes']}|{row['stress_level']}|{row['source']}"
        )
        expected = hashlib.sha256(payload.encode()).hexdigest()
        if expected != row["record_hash"]:
            return {"valid": False, "broken_at_index": i, "total": len(records)}
        prev_hash = expected
    return {"valid": True, "broken_at_index": None, "total": len(records)}


def detect_missing(records: list[dict]) -> list[dict]:
    """
    Detect gaps > EXPECTED_INTERVAL_MINUTES between consecutive timestamps.
    Returns list of {"after": ts, "before": ts, "gap_minutes": n}
    """
    gaps = []
    if len(records) < 2:
        return gaps

    timestamps = [datetime.fromisoformat(str(r["timestamp"])) for r in records]
    for i in range(1, len(timestamps)):
        delta = (timestamps[i] - timestamps[i - 1]).total_seconds() / 60
        if delta > EXPECTED_INTERVAL_MINUTES:
            gaps.append({
                "after": str(timestamps[i - 1]),
                "before": str(timestamps[i]),
                "gap_minutes": int(delta),
            })
    return gaps


if __name__ == "__main__":
    # range test
    print("Normal  ->", check_ranges({"heart_rate": 75, "sleep_hours": 7, "steps": 300,
                                      "activity_minutes": 30, "stress_level": 4}))
    print("Attack  ->", check_ranges({"heart_rate": 500, "sleep_hours": -3, "steps": 999_999,
                                      "activity_minutes": 30, "stress_level": 4}))

    # missing test
    sample = [
        {"timestamp": "2026-09-01 12:00:00"},
        {"timestamp": "2026-09-01 12:15:00"},
        {"timestamp": "2026-09-01 14:00:00"},
    ]
    print("Gaps    ->", detect_missing(sample))