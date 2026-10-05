"""
Hypertension-specific insight rules.

Combines self-logged BP readings with watch data (sleep, stress, HR)
to surface patterns a family would otherwise miss.

Never medical advice. General well-being prompts only.
"""

from datetime import datetime

BP_TARGET = (120, 80)
BP_HIGH = (140, 90)


def _parse_ts(s: str) -> datetime | None:
    try:
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def _classify(sys: float, dia: float) -> str:
    if sys >= BP_HIGH[0] or dia >= BP_HIGH[1]:
        return "high"
    if sys < 90 or dia < 60:
        return "low"
    return "target"


def analyze_hypertension(
    watch: list[dict],
    logged: list[dict],
) -> list[str]:
    insights: list[str] = []

    bps = [
        e for e in logged
        if e.get("type") == "bp"
        and e.get("systolic") is not None
        and e.get("diastolic") is not None
    ]

    if not bps:
        return insights

    bps.sort(key=lambda e: e.get("timestamp", ""))
    recent = bps[-10:]

    # --- Count highs up front (used by several rules) -----------------
    high_count = 0
    for b in recent:
        try:
            sys = float(b["systolic"])
            dia = float(b["diastolic"])
        except (TypeError, ValueError, KeyError):
            continue
        if _classify(sys, dia) == "high":
            high_count += 1

    # --- Rule 1: morning vs evening pattern ---------------------------
    morning: list[float] = []
    evening: list[float] = []
    for b in recent:
        ts = _parse_ts(b.get("timestamp", ""))
        if not ts:
            continue
        try:
            sys = float(b["systolic"])
        except (TypeError, ValueError, KeyError):
            continue
        if 5 <= ts.hour < 12:
            morning.append(sys)
        elif 17 <= ts.hour < 23:
            evening.append(sys)

    if len(morning) >= 2 and len(evening) >= 2:
        diff = (sum(morning) / len(morning)) - (sum(evening) / len(evening))
        if abs(diff) >= 4:
            direction = "higher" if diff > 0 else "lower"
            insights.append(
                f"Morning readings average {abs(diff):.0f} mmHg {direction} "
                f"than evening — a normal daily rhythm."
            )

    # --- Rule 2: salty meal note, with context-aware phrasing ---------
    for b in recent:
        try:
            sys = float(b["systolic"])
            dia = float(b["diastolic"])
        except (TypeError, ValueError, KeyError):
            continue
        if _classify(sys, dia) != "high":
            continue
        note = (b.get("note") or "").lower()
        if "salt" in note:
            if high_count == 1:
                insights.append(
                    f"The {sys:.0f}/{dia:.0f} reading was the only one above "
                    f"target this week — it followed a salty meal."
                )
            elif high_count <= 3:
                insights.append(
                    f"The {sys:.0f}/{dia:.0f} spike followed a salty meal — "
                    f"one of {high_count} readings above target this week."
                )
            else:
                insights.append(
                    f"{high_count} readings above target this week. The most "
                    f"recent one ({sys:.0f}/{dia:.0f}) followed a salty meal."
                )
            break

    # --- Rule 3: sleep correlation with high-BP days ------------------
    high_days = set()
    for b in recent:
        try:
            sys = float(b["systolic"])
            dia = float(b["diastolic"])
        except (TypeError, ValueError, KeyError):
            continue
        if _classify(sys, dia) == "high":
            ts = _parse_ts(b.get("timestamp", ""))
            if ts:
                high_days.add(ts.date().isoformat())

    if high_days:
        short_sleep_days = 0
        for day in high_days:
            day_sleeps = [
                r["metrics"]["sleep_hours"]
                for r in watch
                if r.get("timestamp", "").startswith(day)
            ]
            if day_sleeps and sum(day_sleeps) / len(day_sleeps) < 6.5:
                short_sleep_days += 1
        if short_sleep_days >= 1:
            insights.append(
                f"{short_sleep_days} of your high-BP day"
                f"{'s' if short_sleep_days != 1 else ''} followed a night "
                f"under 6.5h sleep."
            )

    # --- Rule 4: quiet reassurance ------------------------------------
    in_target = 0
    for b in recent:
        try:
            sys = float(b["systolic"])
            dia = float(b["diastolic"])
        except (TypeError, ValueError, KeyError):
            continue
        if _classify(sys, dia) == "target":
            in_target += 1

    if not insights and in_target >= 3:
        insights.append(
            f"{in_target} of your last {len(recent)} readings are in the "
            f"target range — steady."
        )

    return insights[:3]