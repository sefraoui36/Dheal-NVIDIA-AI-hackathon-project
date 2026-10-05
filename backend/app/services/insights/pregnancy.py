"""
Pregnancy-specific insight rules (2nd trimester focus).

Combines self-logged kicks, weight, and appointments with watch data
(resting HR, sleep, steps) to surface week-appropriate patterns.

Never medical advice. Always defers to OB / midwife guidance.
"""

from datetime import datetime
from statistics import mean


def _parse_ts(s: str) -> datetime | None:
    try:
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def analyze_pregnancy(
    watch: list[dict],
    logged: list[dict],
    profile: dict,
) -> list[str]:
    insights: list[str] = []

    pregnancy = profile.get("pregnancy") or {}
    week = pregnancy.get("week")
    trimester = pregnancy.get("trimester")

    # --- Rule 1: resting HR drift (2nd trimester) ---------------------
    if watch:
        # split into older vs newer halves of the watch window
        hrs = [
            r["metrics"]["heart_rate"] for r in watch
            if r.get("metrics", {}).get("heart_rate")
        ]
        if len(hrs) >= 24:
            mid = len(hrs) // 2
            older = mean(hrs[:mid])
            newer = mean(hrs[mid:])
            delta = newer - older
            # Rising resting HR is normal in pregnancy — 2-6 bpm drift is expected
            if 1.5 <= delta <= 8:
                insights.append(
                    f"Resting heart rate has drifted up {delta:.1f} bpm over "
                    f"the last week — a normal pattern in the "
                    f"{'second' if trimester == 2 else 'third'} trimester."
                )
            elif delta >= 8:
                insights.append(
                    f"Resting heart rate is up {delta:.1f} bpm — larger than "
                    f"the usual drift. Worth mentioning to your midwife or OB."
                )

    # --- Rule 2: weight trend -----------------------------------------
    weights = [
        e for e in logged
        if e.get("type") == "weight" and e.get("kg") is not None
    ]
    weights.sort(key=lambda e: e.get("timestamp", ""))
    recent_w = weights[-10:]

    if len(recent_w) >= 3:
        first = float(recent_w[0]["kg"])
        last = float(recent_w[-1]["kg"])
        gain = last - first
        if gain >= 0.5:
            insights.append(
                f"Weight has gained {gain:.1f} kg over the last "
                f"{len(recent_w)} check-ins — on track for the second trimester."
            )
        elif gain <= -0.5:
            insights.append(
                f"Weight has dropped {abs(gain):.1f} kg across "
                f"{len(recent_w)} check-ins — worth discussing at the next visit."
            )

    # --- Rule 3: kick count goal --------------------------------------
    kicks = [
        e for e in logged
        if e.get("type") == "kick"
    ]
    # sum across the most recent day
    if kicks:
        kicks.sort(key=lambda e: e.get("timestamp", ""))
        latest_date = kicks[-1]["timestamp"][:10]
        today_kicks = [
            k for k in kicks
            if k["timestamp"][:10] == latest_date
        ]
        total_today = sum(float(k.get("count", 1)) for k in today_kicks)
        if total_today >= 10:
            insights.append(
                f"10 kicks logged today — the daily goal is met."
            )
        elif total_today >= 5:
            insights.append(
                f"{int(total_today)} kicks logged today — a few more would "
                f"reach the daily goal."
            )

    # --- Rule 4: sleep pattern ----------------------------------------
    if watch:
        recent_sleeps = [
            r["metrics"]["sleep_hours"] for r in watch[-72:]
            if r.get("metrics", {}).get("sleep_hours")
        ]
        if recent_sleeps:
            avg_sleep = mean(recent_sleeps)
            if avg_sleep < 6.0:
                insights.append(
                    f"Sleep has averaged {avg_sleep:.1f}h — common in pregnancy. "
                    f"A cool room and a steady bedtime routine often help."
                )

    # --- Rule 5: quiet reassurance ------------------------------------
    if not insights and week:
        insights.append(
            f"Week {week} — everything tracked so far looks steady."
        )

    return insights[:3]