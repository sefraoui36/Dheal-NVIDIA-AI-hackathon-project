"""
Mood ↔ Health correlation engine.

This is what makes DHeal's mood support unique: the chat doesn't just
reply to a feeling — it CROSS-REFERENCES the user's real health data
(sleep, HR, stress, steps) with their mood history and reports patterns.

No diagnosis. No medical advice. Just observations grounded in the
user's own numbers.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from statistics import mean

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
MOOD_DIR = DATA_DIR / "mood"
RAW_DIR = DATA_DIR / "raw"
BASELINE_DIR = DATA_DIR / "baseline"
PROFILES_DIR = DATA_DIR / "profiles"


def _load_mood_entries(user_id: str) -> list[dict]:
    p = MOOD_DIR / f"{user_id}.json"
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return []


def _load_baseline(user_id: str) -> dict:
    p = BASELINE_DIR / f"{user_id}.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}


def _load_profile(user_id: str) -> dict:
    p = PROFILES_DIR / f"{user_id}.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}


def _load_recent_watch(user_id: str, days: int = 7) -> dict:
    """
    Return mean values for the last `days` days of watch data,
    plus the previous window for comparison.
    """
    import pandas as pd

    path = RAW_DIR / f"{user_id}.csv"
    if not path.exists():
        return {}

    try:
        df = pd.read_csv(path)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp")

        cutoff = df["timestamp"].max() - timedelta(days=days)
        recent = df[df["timestamp"] >= cutoff]
        older = df[
            (df["timestamp"] >= cutoff - timedelta(days=days))
            & (df["timestamp"] < cutoff)
        ]

        def mean_of(frame, col):
            if frame.empty or col not in frame.columns:
                return None
            return round(float(frame[col].mean()), 2)

        out = {}
        for col in ["heart_rate", "sleep_hours", "steps", "stress_level", "activity_minutes"]:
            out[col] = {
                "recent": mean_of(recent, col),
                "previous": mean_of(older, col),
            }
        return out
    except (KeyError, ValueError):
        return {}


def compute_correlations(user_id: str) -> dict:
    """
    Compute mood ↔ health patterns for this user.

    Returns a structured dict the prompt can turn into plain language:
    {
      "mood_avg_7d": 3.1,
      "mood_trend": "declining",   # or "improving" / "stable"
      "sleep_avg_7d": 6.2,
      "sleep_trend": "down",       # or "up" / "stable"
      "hr_avg_7d": 78.4,
      "hr_trend": "up",
      "stress_avg_7d": 5.6,
      "stress_trend": "up",
      "notable_patterns": ["mood and sleep both trending down over 7 days"],
      "conditions": ["type_2_diabetes"],
    }
    """
    result: dict = {}

    # ---- Mood 7d + trend ------------------------------------------------
    mood_entries = _load_mood_entries(user_id)
    if mood_entries:
        last_7 = mood_entries[-14:]  # up to 2 entries/day, 7 days back
        scores = [e.get("score", 3) for e in last_7]
        half = max(1, len(scores) // 2)
        first_half = mean(scores[:half])
        second_half = mean(scores[-half:])
        delta = second_half - first_half

        result["mood_avg_7d"] = round(mean(scores), 2)
        if delta <= -0.3:
            result["mood_trend"] = "declining"
        elif delta >= 0.3:
            result["mood_trend"] = "improving"
        else:
            result["mood_trend"] = "stable"
    else:
        result["mood_avg_7d"] = None
        result["mood_trend"] = "unknown"

    # ---- Watch data -----------------------------------------------------
    watch = _load_recent_watch(user_id, days=7)
    if watch:
        for metric in ["heart_rate", "sleep_hours", "stress_level", "steps"]:
            data = watch.get(metric, {})
            recent = data.get("recent")
            previous = data.get("previous")
            result[f"{metric}_avg_7d"] = recent

            if recent is not None and previous is not None:
                change = recent - previous
                # different thresholds per metric
                threshold = {
                    "heart_rate": 4,
                    "sleep_hours": 0.5,
                    "stress_level": 0.8,
                    "steps": 500,
                }.get(metric, 5)

                if change > threshold:
                    result[f"{metric}_trend"] = "up"
                elif change < -threshold:
                    result[f"{metric}_trend"] = "down"
                else:
                    result[f"{metric}_trend"] = "stable"
            else:
                result[f"{metric}_trend"] = "unknown"

    # ---- Notable patterns ----------------------------------------------
    patterns = []

    sleep_trend = result.get("sleep_hours_trend")
    mood_trend = result.get("mood_trend")
    stress_trend = result.get("stress_level_trend")

    if sleep_trend == "down" and mood_trend == "declining":
        patterns.append(
            "mood and sleep have both been trending down together over the past week"
        )

    if stress_trend == "up" and mood_trend == "declining":
        patterns.append(
            "mood has dropped while stress has risen — these often move together"
        )

    if result.get("sleep_hours_avg_7d") is not None and result["sleep_hours_avg_7d"] < 6.5:
        patterns.append(
            f"sleep has averaged {result['sleep_hours_avg_7d']}h — below the usual 7-8h"
        )

    if result.get("stress_level_avg_7d") is not None and result["stress_level_avg_7d"] > 6:
        patterns.append(
            f"stress has averaged {result['stress_level_avg_7d']}/10 — elevated"
        )

    result["notable_patterns"] = patterns

    # ---- Conditions (context, not diagnosis) ----------------------------
    profile = _load_profile(user_id)
    result["conditions"] = profile.get("conditions", [])

    return result


def format_correlations_for_prompt(corr: dict, lang: str = "en") -> str:
    """
    Turn the correlation dict into a compact block the LLM can read.
    Keeps it short — the LLM doesn't need the full JSON.
    """
    if lang == "fr":
        lines = []
        if corr.get("mood_avg_7d") is not None:
            lines.append(
                f"Mood 7 jours : moyenne {corr['mood_avg_7d']}/5 "
                f"(tendance : {corr.get('mood_trend', 'inconnue')})"
            )
        if corr.get("sleep_hours_avg_7d") is not None:
            lines.append(
                f"Sommeil 7 jours : {corr['sleep_hours_avg_7d']}h "
                f"(tendance : {corr.get('sleep_hours_trend', 'inconnue')})"
            )
        if corr.get("heart_rate_avg_7d") is not None:
            lines.append(
                f"FC moyenne 7 jours : {corr['heart_rate_avg_7d']} bpm "
                f"(tendance : {corr.get('heart_rate_trend', 'inconnue')})"
            )
        if corr.get("stress_level_avg_7d") is not None:
            lines.append(
                f"Stress 7 jours : {corr['stress_level_avg_7d']}/10 "
                f"(tendance : {corr.get('stress_level_trend', 'inconnue')})"
            )
        if corr.get("notable_patterns"):
            lines.append("Patterns détectés :")
            for p in corr["notable_patterns"]:
                lines.append(f"  - {p}")
        if corr.get("conditions"):
            lines.append(
                "Conditions connues : " + ", ".join(corr["conditions"])
            )
        return "\n".join(lines) if lines else "Aucune donnée santé disponible."

    # English
    lines = []
    if corr.get("mood_avg_7d") is not None:
        lines.append(
            f"Mood 7-day average: {corr['mood_avg_7d']}/5 "
            f"(trend: {corr.get('mood_trend', 'unknown')})"
        )
    if corr.get("sleep_hours_avg_7d") is not None:
        lines.append(
            f"Sleep 7-day average: {corr['sleep_hours_avg_7d']}h "
            f"(trend: {corr.get('sleep_hours_trend', 'unknown')})"
        )
    if corr.get("heart_rate_avg_7d") is not None:
        lines.append(
            f"Heart rate 7-day average: {corr['heart_rate_avg_7d']} bpm "
            f"(trend: {corr.get('heart_rate_trend', 'unknown')})"
        )
    if corr.get("stress_level_avg_7d") is not None:
        lines.append(
            f"Stress 7-day average: {corr['stress_level_avg_7d']}/10 "
            f"(trend: {corr.get('stress_level_trend', 'unknown')})"
        )
    if corr.get("notable_patterns"):
        lines.append("Detected patterns:")
        for p in corr["notable_patterns"]:
            lines.append(f"  - {p}")
    if corr.get("conditions"):
        lines.append("Known conditions: " + ", ".join(corr["conditions"]))
    return "\n".join(lines) if lines else "No health data available."
