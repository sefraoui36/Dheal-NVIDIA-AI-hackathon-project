"""
Replay service: the orchestrator.

Takes a user_id and an optional event timestamp, and produces a structured
"HealthReplay" object:

  {
    "user_id": ...,
    "window": {"start": ..., "end": ..., "hours": 72},
    "baseline": {...},
    "timeline": [ {ts, metrics, verdict, reasons, anomalies}, ... ],
    "summary": {
       "total_records": ...,
       "trusted": ...,
       "suspicious": ...,
       "flagged": ...,
       "missing_gaps": [...],
    },
    "integrity": {"valid": bool, ...},
    "what_changed": {...},
    "trust_score": {"score": int, "tier": str, "breakdown": {...}},
  }

This object is what we send to Nemotron.
"""

import json
from pathlib import Path

import pandas as pd

from app.core.anomaly import load_baseline
from app.core.integrity import verify_chain
from app.core.quarantine import classify_record
from app.core.validator import detect_missing

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"

METRICS = ["heart_rate", "sleep_hours", "steps", "activity_minutes", "stress_level"]


def load_timeline(user_id: str, hours: int = 72) -> pd.DataFrame:
    """Load the last `hours` of raw data for a user."""
    path = RAW_DIR / f"{user_id}.csv"
    if not path.exists():
        raise FileNotFoundError(f"No raw data for user {user_id}: {path}")
    df = pd.read_csv(path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df.tail(hours).reset_index(drop=True)


def _row_to_record(row: pd.Series) -> dict:
    return {m: row[m] for m in METRICS}


def _compute_trust_score(
    integrity: dict,
    summary: dict,
    ai_confidence: str | None = None,
) -> dict:
    """
    Compute a 0-100 trust score for the current window.
    Uses integrity + trusted ratio; AI confidence is added by the endpoint.
    """
    # integrity component (0-40)
    integrity_score = 40 if integrity.get("valid") else 0

    # trusted ratio component (0-40)
    total = summary.get("total_records", 0) or 1
    trusted = summary.get("trusted", 0)
    trusted_ratio = trusted / total
    ratio_score = int(round(trusted_ratio * 40))

    # ai confidence component (0-20) - defaults to neutral if not provided
    confidence_map = {"HIGH": 20, "MODERATE": 12, "LIMITED": 4, None: 12}
    ai_score = confidence_map.get(ai_confidence, 12)

    score = integrity_score + ratio_score + ai_score

    if score >= 90:
        tier = "EXCELLENT"
    elif score >= 70:
        tier = "GOOD"
    elif score >= 40:
        tier = "DEGRADED"
    else:
        tier = "UNTRUSTWORTHY"

    return {
        "score": score,
        "tier": tier,
        "breakdown": {
            "integrity": integrity_score,
            "trusted_ratio": ratio_score,
            "ai_confidence": ai_score,
        },
    }
def _population_baseline() -> dict:
    """
    Published reference ranges for a healthy adult (age 30-50).
    Sources: American Heart Association (resting HR), CDC (sleep, steps),
    WHO (activity minutes). These are population reference values — not
    real users — for context, not diagnosis.
    """
    return {
        "heart_rate": {
            "mean": 72.0,
            "std": 8.0,
            "lower_bound": 60.0,
            "upper_bound": 100.0,
            "label": "Resting, adult",
            "source": "American Heart Association",
        },
        "sleep_hours": {
            "mean": 7.0,
            "std": 0.9,
            "lower_bound": 7.0,
            "upper_bound": 9.0,
            "label": "Adults 18–64",
            "source": "CDC / National Sleep Foundation",
        },
        "steps": {
            "mean": 7500.0,
            "std": 3000.0,
            "lower_bound": 4000.0,
            "upper_bound": 12000.0,
            "label": "Daily average",
            "source": "CDC NHANES",
        },
        "activity_minutes": {
            "mean": 30.0,
            "std": 8.0,
            "lower_bound": 22.0,
            "upper_bound": 60.0,
            "label": "Moderate, per day",
            "source": "WHO",
        },
        "stress_level": {
            "mean": 4.0,
            "std": 1.5,
            "lower_bound": 1.0,
            "upper_bound": 7.0,
            "label": "Self-reported 1–10",
            "source": "Perceived Stress Scale (PSS) reference",
        },
    }

def build_replay(user_id: str = "user_001", hours: int = 72) -> dict:
    baseline = load_baseline(user_id)
    df = load_timeline(user_id, hours=hours)
    integrity = verify_chain(user_id)

    timeline = []
    counts = {"TRUSTED": 0, "SUSPICIOUS": 0, "FLAGGED": 0}

    for _, row in df.iterrows():
        record = _row_to_record(row)
        verdict = classify_record(record, baseline)
        counts[verdict["verdict"]] += 1

        timeline.append(
            {
                "timestamp": str(row["timestamp"]),
                "metrics": record,
                "verdict": verdict["verdict"],
                "reasons": verdict["reasons"],
                "anomalies": verdict["anomalies"],
                "violations": verdict["violations"],
            }
        )

    # missing-data check across the window
    gaps = detect_missing([{"timestamp": r["timestamp"]} for r in timeline])

    # what changed: biggest anomaly in the window
    all_anomalies = [
        {"timestamp": r["timestamp"], **a}
        for r in timeline
        for a in r["anomalies"]
    ]
    all_anomalies.sort(key=lambda x: abs(x["z"]), reverse=True)
    top = all_anomalies[:5]

    summary = {
        "total_records": len(timeline),
        "trusted": counts["TRUSTED"],
        "suspicious": counts["SUSPICIOUS"],
        "flagged": counts["FLAGGED"],
        "missing_gaps": gaps,
    }

    # trust score (computed without AI confidence here — the endpoint overrides)
    trust_score = _compute_trust_score(integrity, summary)

    replay = {
        "user_id": user_id,
        "window": {
            "start": timeline[0]["timestamp"] if timeline else None,
            "end": timeline[-1]["timestamp"] if timeline else None,
            "hours": hours,
        },
        "baseline": baseline["metrics"],
        "population_baseline": _population_baseline(),
        "timeline": timeline,
        "summary": summary,
        "integrity": integrity,
        "trust_score": trust_score,
        "what_changed": {
            "top_anomalies": top,
            "activity_context": _activity_context(df),
        },
    }
    return replay


def _activity_context(df: pd.DataFrame) -> dict:
    """Simple context: was activity normal across the window?"""
    return {
        "mean_steps": round(float(df["steps"].mean()), 1),
        "mean_activity_minutes": round(float(df["activity_minutes"].mean()), 1),
        "mean_stress": round(float(df["stress_level"].mean()), 2),
    }


if __name__ == "__main__":
    replay = build_replay("user_001", hours=72)
    print(json.dumps(replay["summary"], indent=2))
    print("\nIntegrity:", replay["integrity"])
    print("\nTrust score:", replay["trust_score"])
    print("\nTop anomalies:")
    for a in replay["what_changed"]["top_anomalies"]:
        print(f"  {a['timestamp']}  {a['metric']}={a['value']}  z={a['z']}")

    out = DATA_DIR / "processed" / "replay_user_001.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(replay, indent=2))
    print(f"\nFull replay written -> {out}")