"""
Quarantine layer: combine anomaly + validator into a per-record verdict.

Three-tier verdict:
  TRUSTED     - no violation, no extreme anomaly
  SUSPICIOUS  - extreme z-score (likely artifact / tampering) but physically possible
  FLAGGED     - physiological violation (impossible value)

Hash-chain break is handled at the file level by integrity.py, not per-record.
"""

from app.core.anomaly import detect_anomalies, load_baseline
from app.core.validator import check_ranges


def classify_record(
    record: dict,
    baseline: dict,
    z_threshold: float = 3.0,
    extreme_z: float = 15.0,
) -> dict:
    violations = check_ranges(record)
    anomalies = detect_anomalies(record, baseline, threshold=z_threshold)

    reasons = []
    for v in violations:
        reasons.append(
            f"{v['metric']}={v['value']} outside physiological range {v['expected_range']}"
        )

    if violations:
        verdict = "FLAGGED"
    elif any(a["z"] >= extreme_z for a in anomalies):
        verdict = "SUSPICIOUS"
        for a in anomalies:
            if a["z"] >= extreme_z:
                reasons.append(
                    f"{a['metric']}={a['value']} is {a['z']:.1f} sigma from baseline "
                    f"(mean={a['mean']}, std={a['std']}) - likely artifact or tampering"
                )
    else:
        verdict = "TRUSTED"

    return {
        "verdict": verdict,
        "reasons": reasons,
        "anomalies": anomalies,
        "violations": violations,
    }


if __name__ == "__main__":
    baseline = load_baseline("user_001")

    normal = {"heart_rate": 75, "sleep_hours": 7.0, "steps": 300,
              "activity_minutes": 30, "stress_level": 4}

    # real but unusual (possible health event, not tampering)
    spike = {"heart_rate": 130, "sleep_hours": 7.0, "steps": 300,
             "activity_minutes": 30, "stress_level": 4}

    # injected / implausible
    attack = {"heart_rate": 198, "sleep_hours": 7.0, "steps": 300,
              "activity_minutes": 30, "stress_level": 4}

    # physically impossible
    impossible = {"heart_rate": 500, "sleep_hours": -3, "steps": 999999,
                  "activity_minutes": 30, "stress_level": 4}

    for name, rec in [("normal", normal), ("spike", spike),
                      ("attack", attack), ("impossible", impossible)]:
        result = classify_record(rec, baseline)
        print(f"\n{name.upper():12s} -> {result['verdict']}")
        if result["reasons"]:
            for r in result["reasons"]:
                print(f"    reason: {r}")
        if result["anomalies"]:
            for a in result["anomalies"]:
                print(f"    anomaly: {a['metric']} z={a['z']} ({a['severity']})")