"""
Diabetes-specific insight rules.

Combines self-logged glucose readings with watch data (steps, activity,
sleep) to surface cross-signal patterns the family would otherwise miss.

Returns a list of plain-language insight strings. Never medical advice.
"""

from datetime import datetime
from statistics import mean


# General reference bands — not medical targets
FASTING_TARGET = (80, 130)
AFTER_MEAL_TARGET = (80, 180)


def _parse_ts(s: str) -> datetime | None:
    try:
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def _avg(values: list[float]) -> float:
    return mean(values) if values else 0.0


def analyze_diabetes(
    watch: list[dict],
    logged: list[dict],
) -> list[str]:
    """
    watch: list of {timestamp, metrics: {steps, activity_minutes, ...}}
    logged: list of {type, timestamp, value, label, ...}
    """
    insights: list[str] = []

    glucose = [
        e for e in logged
        if e.get("type") == "glucose" and e.get("value") is not None
    ]

    if not glucose:
        return insights

    # sort oldest → newest
    glucose.sort(key=lambda e: e.get("timestamp", ""))
    recent = glucose[-10:]

    # --- Rule 1: fasting stability -----------------------------------
    fasting = [g for g in recent if g.get("label") == "fasting"]
    if len(fasting) >= 3:
        values = [float(g["value"]) for g in fasting]
        spread = max(values) - min(values)
        if spread <= 15:
            insights.append(
                f"Fasting readings have been steady for {len(fasting)} days "
                f"(spread only {spread:.0f} mg/dL)."
            )
        else:
            insights.append(
                f"Fasting readings varied by {spread:.0f} mg/dL across "
                f"{len(fasting)} days — worth mentioning to the doctor."
            )

    # --- Rule 2: after-meal highs on low-activity days ----------------
    after_meal_highs: list[tuple[datetime, float]] = []
    for g in recent:
        if g.get("label") != "after_meal":
            continue
        try:
            v = float(g["value"])
        except (TypeError, ValueError):
            continue
        if v > AFTER_MEAL_TARGET[1]:
            ts = _parse_ts(g.get("timestamp", ""))
            if ts:
                after_meal_highs.append((ts, v))

    for ts, v in after_meal_highs:
        # find watch rows within the same day, sum steps
        day_str = ts.date().isoformat()
        day_steps = sum(
            r["metrics"]["steps"]
            for r in watch
            if r.get("timestamp", "").startswith(day_str)
        )
        if day_steps < 3000:
            insights.append(
                f"One after-meal high ({v:.0f} mg/dL) followed a low-activity "
                f"day ({day_steps:,} steps) — a short walk may help."
            )
            break  # only show one example per run

    # --- Rule 3: overall pattern -------------------------------------
    if len(after_meal_highs) >= 2:
        insights.append(
            f"{len(after_meal_highs)} after-meal highs this week — "
            f"both above 180 mg/dL."
        )

    # --- Rule 4: quiet reassurance ------------------------------------
    if not insights and len(recent) >= 3:
        insights.append(
            "Glucose readings are within the usual range this week."
        )

    return insights[:3]