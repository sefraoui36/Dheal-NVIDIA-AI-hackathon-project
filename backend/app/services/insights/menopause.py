"""
Menopause-specific insight rules.

Combines self-logged hot flash / night sweat / mood entries with watch
data (sleep, heart rate, stress) to surface patterns a family would miss.

Never medical advice. General well-being prompts only.
"""

from datetime import datetime
from statistics import mean


def _parse_ts(s: str) -> datetime | None:
    try:
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def analyze_menopause(
    watch: list[dict],
    logged: list[dict],
) -> list[str]:
    insights: list[str] = []

    flashes = [
        e for e in logged
        if e.get("type") == "hot_flash"
    ]

    if not flashes:
        return insights

    flashes.sort(key=lambda e: e.get("timestamp", ""))
    recent = flashes[-14:]

    # --- Rule 1: weekly pattern (first half vs second half) -----------
    counts = [
        float(f.get("flash_count", 0))
        for f in recent
        if f.get("flash_count") is not None
    ]

    if len(counts) >= 4:
        mid = len(counts) // 2
        first_half = mean(counts[:mid])
        second_half = mean(counts[mid:])
        delta = second_half - first_half

        if delta <= -1.0:
            insights.append(
                f"Hot flashes have eased from {first_half:.1f} to "
                f"{second_half:.1f} per day — trending down."
            )
        elif delta >= 1.5:
            insights.append(
                f"Hot flashes increased from {first_half:.1f} to "
                f"{second_half:.1f} per day — worth mentioning to your doctor."
            )

    # --- Rule 2: hot flash peak day -----------------------------------
    if counts:
        peak = max(counts)
        if peak >= 5:
            insights.append(
                f"One day had {peak:.0f} hot flashes — the highest so far."
            )

    # --- Rule 3: sleep correlation ------------------------------------
    # find the highest-flash day and check the night before
    if watch:
        peak_day = None
        peak_count = 0
        for f in recent:
            try:
                c = float(f.get("flash_count", 0))
            except (TypeError, ValueError):
                continue
            ts = _parse_ts(f.get("timestamp", ""))
            if ts and c > peak_count:
                peak_count = c
                peak_day = ts.date().isoformat()

        if peak_day and peak_count >= 3:
            # mean sleep on that day
            sleeps = [
                r["metrics"]["sleep_hours"]
                for r in watch
                if r.get("timestamp", "").startswith(peak_day)
            ]
            if sleeps:
                avg_sleep = mean(sleeps)
                if avg_sleep < 6.0:
                    insights.append(
                        f"The {peak_count:.0f}-flash day followed a night of "
                        f"only {avg_sleep:.1f}h sleep — sleep and symptoms "
                        f"often track together."
                    )

    # --- Rule 4: night sweats -----------------------------------------
    night_sweats = [
        float(f.get("night_sweats", 0))
        for f in recent
        if f.get("night_sweats") is not None
    ]
    if night_sweats and sum(night_sweats) >= 5:
        insights.append(
            f"{int(sum(night_sweats))} night sweats logged over "
            f"{len(night_sweats)} days — a cool room often helps."
        )

    # --- Rule 5: quiet reassurance ------------------------------------
    if not insights and counts and mean(counts) <= 3:
        insights.append(
            f"Symptoms are mild this week ({mean(counts):.1f} flashes/day "
            f"on average)."
        )

    return insights[:3]