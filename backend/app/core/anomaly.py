"""
Anomaly detection against the personal baseline.

For each metric, compute a z-score:
    z = (value - mean) / std

If |z| > threshold (default 3.0) → anomalous for this user.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
BASELINE_DIR = DATA_DIR / "baseline"

DEFAULT_Z_THRESHOLD = 3.0


def load_baseline(user_id: str = "user_001") -> dict:
    path = BASELINE_DIR / f"{user_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Baseline not found: {path}. Run app.core.baseline first.")
    return json.loads(path.read_text())


def z_score(value: float, mean: float, std: float) -> float:
    if std == 0:
        return 0.0
    return (value - mean) / std


def detect_anomalies(record: dict, baseline: dict, threshold: float = DEFAULT_Z_THRESHOLD) -> list[dict]:
    """
    record: {"heart_rate": 198, "sleep_hours": 7.2, ...}
    baseline: output of compute_baseline()
    Returns list of anomalies: [{"metric": ..., "value": ..., "z": ..., "severity": ...}]
    """
    anomalies = []
    for metric, stats in baseline["metrics"].items():
        if metric not in record or record[metric] is None:
            continue
        value = float(record[metric])
        z = z_score(value, stats["mean"], stats["std"])
        if abs(z) > threshold:
            anomalies.append({
                "metric": metric,
                "value": value,
                "z": round(z, 3),
                "mean": stats["mean"],
                "std": stats["std"],
                "severity": "high" if abs(z) > 5 else "medium",
            })
    return anomalies


if __name__ == "__main__":
    baseline = load_baseline("user_001")

    # normal record — should return no anomalies
    normal = {"heart_rate": 75, "sleep_hours": 7.0, "steps": 300, "activity_minutes": 30, "stress_level": 4}
    print("Normal record  ->", detect_anomalies(normal, baseline))

    # injected attack — 198 bpm
    attacked = {"heart_rate": 198, "sleep_hours": 7.0, "steps": 300, "activity_minutes": 30, "stress_level": 4}
    print("Attacked record ->", detect_anomalies(attacked, baseline))