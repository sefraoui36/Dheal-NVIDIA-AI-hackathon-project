"""
Compute a personal baseline (mean / std / min / max) per metric.
Output: backend/data/baseline/user_001.json
"""

import json
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"
BASELINE_DIR = DATA_DIR / "baseline"
BASELINE_DIR.mkdir(parents=True, exist_ok=True)

METRICS = ["heart_rate", "sleep_hours", "steps", "activity_minutes", "stress_level"]


def compute_baseline(user_id: str = "user_001") -> dict:
    csv_path = RAW_DIR / f"{user_id}.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing raw data: {csv_path}")

    df = pd.read_csv(csv_path)

    baseline = {"user_id": user_id, "n_records": int(len(df)), "metrics": {}}

    for metric in METRICS:
        series = df[metric]
        mean = float(series.mean())
        std = float(series.std())
        baseline["metrics"][metric] = {
            "mean": round(mean, 3),
            "std": round(std, 3),
            "min": float(series.min()),
            "max": float(series.max()),
            "lower_bound": round(mean - 3 * std, 3),
            "upper_bound": round(mean + 3 * std, 3),
        }

    out_path = BASELINE_DIR / f"{user_id}.json"
    out_path.write_text(json.dumps(baseline, indent=2))

    print(f"Baseline written -> {out_path}")
    for metric, stats in baseline["metrics"].items():
        print(
            f"   {metric:18s} "
            f"mean={stats['mean']:>7.2f}  "
            f"std={stats['std']:>6.2f}  "
            f"range=[{stats['lower_bound']:.1f}, {stats['upper_bound']:.1f}]"
        )
    return baseline

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        for uid in sys.argv[1:]:
            compute_baseline(uid)
    else:
        for uid in ["user_001", "user_002", "user_003", "user_004", "user_005"]:
            try:
                compute_baseline(uid)
            except FileNotFoundError:
                print(f"  (skipped {uid} — no raw CSV)")