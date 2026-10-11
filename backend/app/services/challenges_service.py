"""
Challenges service — multi-activity, trust-verified, family + friends.

Supports:
  - Activities: running, walking, gym, cycling, sleep, hydration
  - Friends: added by name (auto-generated synthetic data on the fly)
  - Trust verification: flagged entries are excluded from ranking
"""

import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"
PROFILES_DIR = DATA_DIR / "profiles"
BASELINE_DIR = DATA_DIR / "baseline"
CHALLENGES_DIR = DATA_DIR / "challenges"
FRIENDS_DIR = DATA_DIR / "friends"
FRIENDS_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------
# Activity definitions
# ---------------------------------------------------------------

ACTIVITIES = {
    "running": {
        "label": "Running",
        "icon": "directions_run",
        "unit": "km",
        "metric_source": "derived_run_km",
        "accent": "coral",
        "min_daily": 0.5,
        "max_daily": 25.0,
    },
    "walking": {
        "label": "Walking",
        "icon": "directions_walk",
        "unit": "steps",
        "metric_source": "steps",
        "accent": "mint",
        "min_daily": 500,
        "max_daily": 25000,
    },
    "gym": {
        "label": "Gym / Fitness",
        "icon": "fitness_center",
        "unit": "min",
        "metric_source": "activity_minutes",
        "accent": "amber",
        "min_daily": 10,
        "max_daily": 180,
    },
    "cycling": {
        "label": "Cycling",
        "icon": "directions_bike",
        "unit": "km",
        "metric_source": "derived_cycle_km",
        "accent": "slate",
        "min_daily": 1.0,
        "max_daily": 60.0,
    },
    "sleep": {
        "label": "Sleep",
        "icon": "bedtime",
        "unit": "h",
        "metric_source": "sleep_hours",
        "accent": "coral",
        "min_daily": 4.0,
        "max_daily": 11.0,
    },
    "hydration": {
        "label": "Hydration",
        "icon": "water_drop",
        "unit": "cups",
        "metric_source": "derived_water_cups",
        "accent": "mint",
        "min_daily": 0,
        "max_daily": 15,
    },
}


def get_activity(activity_key: str) -> dict:
    return ACTIVITIES.get(activity_key, ACTIVITIES["walking"])


# ---------------------------------------------------------------
# Synthetic friends
# ---------------------------------------------------------------


def ensure_friend_data(friend_id: str, friend_name: str) -> None:
    """
    If a friend has no CSV, generate a small 14-day synthetic one
    so they show up in the leaderboard with realistic numbers.
    """
    csv_path = RAW_DIR / f"{friend_id}.csv"
    if csv_path.exists():
        return

    # deterministic seed from the friend's id so numbers are stable
    seed = sum(ord(c) for c in friend_id)
    rng = np.random.default_rng(seed)

    days = 14
    hours = pd.date_range("2026-09-01 00:00:00", periods=days * 24, freq="h")
    n = len(hours)
    hour_of_day = hours.hour.to_numpy()

    # friend profile: moderate activity level
    hr_base = 72 + 4 * np.sin((hour_of_day - 6) * np.pi / 12)
    heart_rate = np.clip(rng.normal(hr_base, 6), 55, 120).astype(int)

    sleep_per_night = rng.normal(7.0, 0.6, days).clip(5.0, 9.0)
    sleep_hours = np.repeat(sleep_per_night, 24).round(2)

    steps = rng.poisson(150, n)
    steps[hour_of_day < 6] = rng.poisson(15, (hour_of_day < 6).sum())

    activity_minutes = rng.poisson(32, n)
    stress_level = np.clip(rng.normal(4.2, 1.4, n), 1, 10).astype(int)

    df = pd.DataFrame({
        "timestamp": hours,
        "user_id": friend_id,
        "heart_rate": heart_rate,
        "sleep_hours": sleep_hours,
        "steps": steps,
        "activity_minutes": activity_minutes,
        "stress_level": stress_level,
        "source": np.array(["wearable"] * n),
    })

    # simple hash chain
    import hashlib
    hashes = []
    prev = "GENESIS"
    for _, row in df.iterrows():
        payload = (
            f"{prev}|{row['timestamp']}|{row['user_id']}|"
            f"{row['heart_rate']}|{row['sleep_hours']}|{row['steps']}|"
            f"{row['activity_minutes']}|{row['stress_level']}|{row['source']}"
        )
        prev = hashlib.sha256(payload.encode()).hexdigest()
        hashes.append(prev)
    df["record_hash"] = hashes

    df.to_csv(csv_path, index=False)

    # also write a minimal profile
    profile_path = PROFILES_DIR / f"{friend_id}.json"
    if not profile_path.exists():
        profile_path.write_text(
            json.dumps({
                "user_id": friend_id,
                "name": friend_name,
                "relation": "Friend",
                "age": 30,
                "avatar_icon": "person",
                "accent": "slate",
                "conditions": [],
            }, indent=2),
            encoding="utf-8",
        )


# ---------------------------------------------------------------
# Profile / baseline loaders
# ---------------------------------------------------------------


def _load_profile(user_id: str) -> dict:
    p = PROFILES_DIR / f"{user_id}.json"
    if not p.exists():
        return {"user_id": user_id, "name": user_id, "avatar_icon": "person"}
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {"user_id": user_id, "name": user_id, "avatar_icon": "person"}


def _load_baseline(user_id: str) -> dict:
    p = BASELINE_DIR / f"{user_id}.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}


# ---------------------------------------------------------------
# Challenge creation
# ---------------------------------------------------------------


def get_or_create_challenge(
    creator_id: str,
    name: str,
    activity: str,
    duration_days: int,
    participants: list[str],
) -> dict:
    if activity not in ACTIVITIES:
        activity = "walking"

    today = datetime.utcnow().date()
    start = today
    end = today + timedelta(days=duration_days - 1)

    return {
        "id": f"ch_{uuid.uuid4().hex[:8]}",
        "name": name,
        "activity": activity,
        "duration_days": duration_days,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "participants": participants,
        "created_by": creator_id,
        "status": "active",
    }


def list_all_challenges_for_user(user_id: str) -> list[dict]:
    p = CHALLENGES_DIR / f"{user_id}.json"
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return []


# ---------------------------------------------------------------
# Metric aggregation (per activity)
# ---------------------------------------------------------------


def _apply_metric(df: pd.DataFrame, metric_source: str) -> pd.Series:
    """Map the metric source name to an actual numeric series."""
    if metric_source == "steps":
        return df["steps"]
    if metric_source == "activity_minutes":
        return df["activity_minutes"]
    if metric_source == "sleep_hours":
        return df["sleep_hours"]
    if metric_source == "derived_run_km":
        # only hours with more than 500 steps count as "running"
        # ~1300 steps per km rough estimate
        mask = df["steps"] > 500
        return (df.loc[mask, "steps"] / 1300).reindex(df.index).fillna(0)
    if metric_source == "derived_cycle_km":
        # derived from activity minutes: rough estimate, 15 km/h
        return (df["activity_minutes"] / 60 * 15).round(2)
    if metric_source == "derived_water_cups":
        # not tracked by watch — return 0 for now (self-logged via tracking)
        return pd.Series(0, index=df.index)
    return df["steps"]


def _metric_for_user(
    user_id: str, activity: str, start: str, end: str
) -> dict:
    path = RAW_DIR / f"{user_id}.csv"
    if not path.exists():
        return {
            "verified_total": 0.0,
            "raw_total": 0.0,
            "flagged": [],
            "flagged_count": 0,
        }

    try:
        df = pd.read_csv(path)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        mask = (df["timestamp"] >= start) & (
            df["timestamp"] <= end + " 23:59:59"
        )
        window = df[mask].copy()
        if window.empty:
            return {
                "verified_total": 0.0,
                "raw_total": 0.0,
                "flagged": [],
                "flagged_count": 0,
            }

        activity_def = get_activity(activity)
        metric_values = _apply_metric(window, activity_def["metric_source"])
        window["_metric"] = metric_values

        # trust verification — physiological limits + per-user sigma
        baseline = _load_baseline(user_id)
        stats = baseline.get("metrics", {}).get("steps", {})
        mean_steps = stats.get("mean")
        std_steps = stats.get("std")

        keep = []
        flagged = []
        for idx, row in window.iterrows():
            value = float(row["_metric"])
            steps = float(row["steps"])

            # hard limits per activity
            if value < activity_def["min_daily"] and steps > 0 and activity != "hydration":
                # only flag if clearly extreme (small values are fine)
                pass
            if value > activity_def["max_daily"]:
                flagged.append({
                    "timestamp": str(row["timestamp"]),
                    "metric": activity_def["metric_source"],
                    "value": round(value, 2),
                    "reason": f"above daily max for {activity_def['label']}",
                })
                keep.append(False)
                continue

            # sigma check on steps (baseline reference)
            if mean_steps and std_steps and std_steps > 0:
                z = abs((steps - mean_steps) / std_steps)
                if z > 5:
                    flagged.append({
                        "timestamp": str(row["timestamp"]),
                        "metric": "steps",
                        "value": steps,
                        "reason": f"{z:.1f}σ from baseline",
                    })
                    keep.append(False)
                    continue

            keep.append(True)

        verified = window[pd.Series(keep, index=window.index)]

        return {
            "verified_total": round(float(verified["_metric"].sum()), 2),
            "raw_total": round(float(window["_metric"].sum()), 2),
            "flagged": flagged[:3],
            "flagged_count": len(flagged),
        }
    except (KeyError, ValueError):
        return {
            "verified_total": 0.0,
            "raw_total": 0.0,
            "flagged": [],
            "flagged_count": 0,
        }


def aggregate_challenge(challenge: dict) -> dict:
    activity = challenge.get("activity", "walking")
    activity_def = get_activity(activity)
    start = challenge["start_date"]
    end = challenge["end_date"]

    rows = []
    total_flagged = 0

    for pid in challenge["participants"]:
        profile = _load_profile(pid)
        result = _metric_for_user(pid, activity, start, end)
        total_flagged += result["flagged_count"]

        rows.append({
            "user_id": pid,
            "name": profile.get("name", pid),
            "avatar_icon": profile.get("avatar_icon", "person"),
            "verified_total": result["verified_total"],
            "raw_total": result["raw_total"],
            "flagged_count": result["flagged_count"],
            "flagged_examples": result["flagged"],
            "is_fully_verified": result["flagged_count"] == 0,
        })

    rows.sort(key=lambda r: r["verified_total"], reverse=True)
    for i, r in enumerate(rows):
        r["rank"] = i + 1

    winner = rows[0] if rows else None
    lead_margin = (
        rows[0]["verified_total"] - rows[1]["verified_total"]
        if len(rows) > 1
        else 0
    )

    return {
        "challenge": challenge,
        "activity": activity_def,
        "leaderboard": rows,
        "winner": winner,
        "lead_margin": round(lead_margin, 2),
        "total_flagged": total_flagged,
        "trust_verified": total_flagged == 0,
    }


def list_activities() -> list[dict]:
    return [
        {"key": k, **v}
        for k, v in ACTIVITIES.items()
    ]
def aggregate_progress(challenge: dict) -> dict:
    """
    Return per-day series for each participant.

    Shape:
      {
        "challenge": {...},
        "activity": {...},
        "dates": ["2026-09-28", "2026-09-29", ...],
        "series": [
          {
            "user_id": "user_004",
            "name": "Dad",
            "avatar_icon": "man",
            "daily": [1200, 3400, 2800, ...],
            "cumulative": [1200, 4600, 7400, ...],
            "flagged_count": 0,
            "color_key": "mint"
          },
          ...
        ]
      }
    """
    activity = challenge.get("activity", "walking")
    activity_def = get_activity(activity)
    start = challenge["start_date"]
    end = challenge["end_date"]

    # build the date axis
    start_dt = datetime.fromisoformat(start)
    end_dt = datetime.fromisoformat(end)
    dates: list[str] = []
    d = start_dt
    while d <= end_dt:
        dates.append(d.date().isoformat())
        d += timedelta(days=1)

    # resolve participant accent colors (rotate through the palette)
    color_cycle = ["coral", "mint", "amber", "slate"]
    series = []

    for idx, pid in enumerate(challenge["participants"]):
        profile = _load_profile(pid)
        per_day: list[float] = []
        flagged_total = 0

        path = RAW_DIR / f"{pid}.csv"
        if not path.exists():
            per_day = [0.0] * len(dates)
        else:
            try:
                df = pd.read_csv(path)
                df["timestamp"] = pd.to_datetime(df["timestamp"])
                metric_values = _apply_metric(df, activity_def["metric_source"])
                df["_metric"] = metric_values

                baseline = _load_baseline(pid)
                stats = baseline.get("metrics", {}).get("steps", {})
                mean_steps = stats.get("mean")
                std_steps = stats.get("std")

                for day in dates:
                    day_rows = df[df["timestamp"].dt.date.astype(str) == day]
                    if day_rows.empty:
                        per_day.append(0.0)
                        continue

                    # exclude flagged entries for this day
                    keep_mask = []
                    for _, row in day_rows.iterrows():
                        value = float(row["_metric"])
                        steps = float(row["steps"])
                        if value > activity_def["max_daily"]:
                            keep_mask.append(False)
                            flagged_total += 1
                            continue
                        if mean_steps and std_steps and std_steps > 0:
                            z = abs((steps - mean_steps) / std_steps)
                            if z > 5:
                                keep_mask.append(False)
                                flagged_total += 1
                                continue
                        keep_mask.append(True)

                    kept = day_rows[pd.Series(keep_mask, index=day_rows.index)]
                    per_day.append(round(float(kept["_metric"].sum()), 2))
            except (KeyError, ValueError):
                per_day = [0.0] * len(dates)

        # compute cumulative
        cumulative: list[float] = []
        running = 0.0
        for v in per_day:
            running += v
            cumulative.append(round(running, 2))

        series.append({
            "user_id": pid,
            "name": profile.get("name", pid),
            "avatar_icon": profile.get("avatar_icon", "person"),
            "daily": per_day,
            "cumulative": cumulative,
            "flagged_count": flagged_total,
            "color_key": color_cycle[idx % len(color_cycle)],
        })

    return {
        "challenge": challenge,
        "activity": activity_def,
        "dates": dates,
        "series": series,
    }