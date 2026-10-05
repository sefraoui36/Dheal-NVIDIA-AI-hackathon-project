"""
Generate distinct synthetic watch data for each family member.

Each person gets a different baseline (HR mean, sleep, steps, stress)
and a natural story arc (e.g. Grandpa's pain improving, Sister's HR
slowly rising during pregnancy).

Writes: backend/data/raw/user_00X.csv
Skips:  backend/data/raw/user_001.csv  (Grandma's data is already used
        by the demo and shouldn't be regenerated mid-build)
"""

import hashlib
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

DAYS = 14
SEED = 2026


# ---------------------------------------------------------------
# Profile definitions — each user gets different baselines & story
# ---------------------------------------------------------------

PROFILES = {
    "user_002": {
        "name": "Grandpa",
        "hr_mean": 72,
        "hr_std": 6,
        "sleep_mean": 7.8,
        "sleep_std": 0.5,
        "steps_scale": 60,        # low activity (arthritis + recovery)
        "activity_mean": 18,      # gentle movement
        "stress_mean": 3.5,
        # story: HR slowly normalizes over the 14 days (recovery)
        "hr_trend": lambda day: 4 * np.exp(-day / 5),
        # story: sleep improves slightly
        "sleep_trend": lambda day: 0.3 * (1 - np.exp(-day / 4)),
    },
    "user_003": {
        "name": "Mom",
        "hr_mean": 70,
        "hr_std": 4,
        "sleep_mean": 6.2,        # shorter sleep (menopause)
        "sleep_std": 0.7,
        "steps_scale": 100,
        "activity_mean": 28,
        "stress_mean": 5.2,       # slightly higher stress
        "hr_trend": lambda day: 0,
        "sleep_trend": lambda day: -0.25 * (day / 14),  # gradual decline
    },
    "user_004": {
        "name": "Dad",
        "hr_mean": 74,
        "hr_std": 5,
        "sleep_mean": 7.0,
        "sleep_std": 0.4,
        "steps_scale": 220,       # high activity
        "activity_mean": 42,
        "stress_mean": 4.5,
        "hr_trend": lambda day: 0,
        "sleep_trend": lambda day: 0,
    },
    "user_005": {
        "name": "Sister",
        "hr_mean": 84,            # higher resting HR (pregnancy)
        "hr_std": 7,
        "sleep_mean": 6.8,
        "sleep_std": 0.6,
        "steps_scale": 130,
        "activity_mean": 22,      # gentler
        "stress_mean": 4.0,
        # story: HR rising week-over-week (second trimester pattern)
        "hr_trend": lambda day: 2.5 * (day / 14),
        # story: sleep gradually declining as pregnancy progresses
        "sleep_trend": lambda day: -0.4 * (day / 14),
    },
}


# ---------------------------------------------------------------
# Generation
# ---------------------------------------------------------------


def _hash_row(prev_hash: str, row: pd.Series) -> str:
    payload = (
        f"{prev_hash}|{row['timestamp']}|{row['user_id']}|"
        f"{row['heart_rate']}|{row['sleep_hours']}|{row['steps']}|"
        f"{row['activity_minutes']}|{row['stress_level']}|{row['source']}"
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def _generate(user_id: str, spec: dict) -> pd.DataFrame:
    np.random.seed(SEED + hash(user_id) % 10_000)

    hours = pd.date_range("2026-09-01 00:00:00", periods=DAYS * 24, freq="h")
    n = len(hours)
    day_index = np.arange(n) // 24  # 0..13
    hour_of_day = hours.hour.to_numpy()

    # HR with circadian rhythm + per-user trend
    hr_circadian = 6 * np.sin((hour_of_day - 6) * np.pi / 12)
    hr_trend = np.array([spec["hr_trend"](d) for d in day_index])
    hr_base = spec["hr_mean"] + hr_circadian + hr_trend
    heart_rate = np.clip(
        np.random.normal(hr_base, spec["hr_std"]), 50, 130
    ).astype(int)

    # Sleep — one value per night, repeated across the day's hours
    sleep_per_night = np.array([
        spec["sleep_mean"] + spec["sleep_trend"](d) + np.random.normal(0, spec["sleep_std"])
        for d in range(DAYS)
    ]).clip(4.5, 9.5)
    sleep_hours = np.repeat(sleep_per_night, 24).round(2)

    # Steps — low at night, higher during waking hours
    base_steps = np.random.poisson(spec["steps_scale"], n)
    # weekend boost
    is_weekend = pd.Series(hours.dayofweek).isin([5, 6]).to_numpy()
    base_steps = (base_steps * (1 + 0.25 * is_weekend)).astype(int)
    base_steps[hour_of_day < 6] = np.random.poisson(15, (hour_of_day < 6).sum())

    # Activity minutes
    activity_minutes = np.random.poisson(spec["activity_mean"], n)

    # Stress — 1-10 scale
    stress_level = np.clip(
        np.random.normal(spec["stress_mean"], 1.5, n), 1, 10
    ).astype(int)

    source = np.array(["wearable"] * n)

    df = pd.DataFrame({
        "timestamp": hours,
        "user_id": user_id,
        "heart_rate": heart_rate,
        "sleep_hours": sleep_hours,
        "steps": base_steps,
        "activity_minutes": activity_minutes,
        "stress_level": stress_level,
        "source": source,
    })

    # hash chain
    hashes = []
    prev = "GENESIS"
    for _, row in df.iterrows():
        prev = _hash_row(prev, row)
        hashes.append(prev)
    df["record_hash"] = hashes

    return df


def main():
    print("Generating family watch data…\n")

    for user_id, spec in PROFILES.items():
        df = _generate(user_id, spec)
        out = RAW_DIR / f"{user_id}.csv"
        df.to_csv(out, index=False)

        hr_min, hr_max = df["heart_rate"].min(), df["heart_rate"].max()
        sleep_mean = df["sleep_hours"].mean()
        steps_mean = df["steps"].mean()

        print(
            f"  ✅ {user_id} ({spec['name']:8s})  "
            f"HR {hr_min:>3}–{hr_max:<3}  "
            f"sleep {sleep_mean:.2f}h  "
            f"steps/h {steps_mean:>5.1f}"
        )

    print("\nDone. user_001 (Grandma) intentionally skipped — keep existing.")


if __name__ == "__main__":
    main()