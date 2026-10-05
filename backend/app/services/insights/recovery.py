"""
Post-surgery recovery insight rules.

Combines self-logged wound state, pain, and milestone entries with watch
data to surface recovery progress in plain language.

Never medical advice. General well-being prompts only.
"""

from datetime import datetime
from statistics import mean

EXPECTED_MILESTONES = {
    "walk_room",
    "walk_outside",
    "stairs",
    "shower",
    "drive",
}

MILESTONE_LABELS = {
    "walk_room": "walk across the room",
    "walk_outside": "walk outside",
    "stairs": "climb stairs",
    "shower": "shower independently",
    "drive": "short drive",
}

WOUND_CONCERN_STATES = {"redness", "swelling", "discharge", "fever"}


def _parse_ts(s: str) -> datetime | None:
    try:
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def analyze_recovery(
    watch: list[dict],
    logged: list[dict],
) -> list[str]:
    insights: list[str] = []

    wounds = [
        e for e in logged
        if e.get("type") == "wound"
    ]

    if not wounds:
        return insights

    wounds.sort(key=lambda e: e.get("timestamp", ""))
    recent = wounds[-14:]

    # --- Rule 1: day counter + milestone progress ---------------------
    first_ts = _parse_ts(recent[0].get("timestamp", ""))
    if first_ts:
        days_since = (datetime.utcnow() - first_ts).days + 1
        # union of all milestones logged across the window
        all_milestones: set[str] = set()
        for w in recent:
            milestones = w.get("milestones") or []
            if isinstance(milestones, list):
                all_milestones.update(str(m) for m in milestones)
        total = len(EXPECTED_MILESTONES)
        achieved = len(all_milestones & EXPECTED_MILESTONES)
        if days_since >= 3 and achieved > 0:
            insights.append(
                f"Day {days_since} of tracking — "
                f"{achieved} of {total} recovery milestones reached."
            )

    # --- Rule 2: pain trend -------------------------------------------
    pains = [
        float(w["pain"]) for w in recent
        if w.get("pain") is not None
    ]
    if len(pains) >= 4:
        mid = len(pains) // 2
        first_half = mean(pains[:mid])
        second_half = mean(pains[mid:])
        delta = second_half - first_half
        if delta <= -1.0:
            insights.append(
                f"Pain dropped from {first_half:.0f} to {second_half:.0f} "
                f"over {len(pains)} check-ins — steady recovery."
            )
        elif delta >= 1.0:
            insights.append(
                f"Pain rose from {first_half:.0f} to {second_half:.0f} over "
                f"{len(pains)} check-ins — worth mentioning to the surgical team."
            )

    # --- Rule 3: wound stability --------------------------------------
    clean_streak = 0
    max_streak = 0
    concerns = 0
    for w in recent:
        state = str(w.get("wound_state", "")).lower()
        if state == "clean":
            clean_streak += 1
            max_streak = max(max_streak, clean_streak)
        else:
            clean_streak = 0
            if state in WOUND_CONCERN_STATES:
                concerns += 1

    if max_streak >= 4 and concerns == 0:
        insights.append(
            f"Wound has been clean and dry for {max_streak} straight "
            f"check-ins — healing well."
        )
    elif concerns >= 1:
        # find the most recent concern
        for w in reversed(recent):
            state = str(w.get("wound_state", "")).lower()
            if state in WOUND_CONCERN_STATES:
                insights.append(
                    f"Most recent wound check noted '{state}' — follow the "
                    f"surgical team's guidance."
                )
                break

    # --- Rule 4: sleep during recovery --------------------------------
    if watch:
        recent_sleeps = [
            r["metrics"]["sleep_hours"] for r in watch[-72:]
            if r.get("metrics", {}).get("sleep_hours")
        ]
        if recent_sleeps:
            avg_sleep = mean(recent_sleeps)
            if avg_sleep >= 7.5:
                insights.append(
                    f"Sleep has averaged {avg_sleep:.1f}h — rest supports recovery."
                )
            elif avg_sleep < 6.0:
                insights.append(
                    f"Sleep averaged only {avg_sleep:.1f}h over the last few "
                    f"days — rest matters most right now."
                )

    # --- Rule 5: quiet reassurance ------------------------------------
    if not insights:
        insights.append(
            "Recovery check-ins are on track. Keep following the surgical "
            "team's plan."
        )

    return insights[:3]