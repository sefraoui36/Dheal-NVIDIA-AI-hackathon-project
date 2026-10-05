"""
Generate synthetic wearable health data for one fictional user.
Output: backend/data/raw/user_001.csv
"""

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

# ---------- config ----------
USER_ID = "user_001"
DAYS = 14
SEED = 42
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)

np.random.seed(SEED)

# ---------- timestamps ----------
timestamps = pd.date_range(
    start="2026-09-01 00:00:00",
    periods=DAYS * 24,
    freq="h",
)

n = len(timestamps)

# ---------- realistic-ish signals ----------
# heart rate: day/night rhythm + noise
hour_of_day = timestamps.hour.to_numpy()
hr_base = 75 + 5 * np.sin((hour_of_day - 6) * np.pi / 12)  # higher midday, lower at night
heart_rate = np.clip(np.random.normal(hr_base, 4), 55, 110).astype(int)

# sleep: one value per day, repeated across that day's hours
sleep_per_night = np.random.normal(7.2, 0.8, DAYS).clip(5.0, 9.5)
sleep_hours = np.repeat(sleep_per_night, 24).round(2)

# steps: cumulative-ish, higher during waking hours
steps = np.random.poisson(350, n)
steps[hour_of_day < 6] = np.random.poisson(20, (hour_of_day < 6).sum())

# activity minutes
activity_minutes = np.random.poisson(30, n)

# stress 1-10
stress_level = np.clip(np.random.normal(4.5, 1.5, n), 1, 10).astype(int)

# source
source = np.array(["wearable"] * n)

# ---------- build dataframe ----------
df = pd.DataFrame({
    "timestamp": timestamps,
    "user_id": USER_ID,
    "heart_rate": heart_rate,
    "sleep_hours": sleep_hours,
    "steps": steps,
    "activity_minutes": activity_minutes,
    "stress_level": stress_level,
    "source": source,
})

# ---------- SHA-256 hash chain ----------
# each record's hash depends on the previous record's hash → tampering breaks the chain
hashes = []
prev_hash = "GENESIS"
for _, row in df.iterrows():
    payload = (
        f"{prev_hash}|{row['timestamp']}|{row['user_id']}|"
        f"{row['heart_rate']}|{row['sleep_hours']}|{row['steps']}|"
        f"{row['activity_minutes']}|{row['stress_level']}|{row['source']}"
    )
    h = hashlib.sha256(payload.encode()).hexdigest()
    hashes.append(h)
    prev_hash = h

df["record_hash"] = hashes

# ---------- write ----------
out_path = OUT_DIR / f"{USER_ID}.csv"
df.to_csv(out_path, index=False)

print(f"✅ Wrote {len(df)} rows → {out_path}")
print(f"   HR range: {df['heart_rate'].min()}–{df['heart_rate'].max()} bpm")
print(f"   Mean HR : {df['heart_rate'].mean():.1f} bpm")
print(f"   First hash: {df['record_hash'].iloc[0][:16]}…")
print(f"   Last  hash: {df['record_hash'].iloc[-1][:16]}…")