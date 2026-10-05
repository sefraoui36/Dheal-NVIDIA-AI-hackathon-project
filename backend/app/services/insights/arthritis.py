"""
Arthritis-specific insight rules.

Combines self-logged pain/stiffness entries with watch activity data
(steps, activity_minutes) to surface patterns a family would miss.

Never medical advice. General well-being prompts only.
"""

from datetime import datetime
from statistics import mean

JOINT_LABELS = {
    "knee_left": "Left knee",
    "knee_right": "Right knee",
    "hip": "Hip",
    "wrist": "Wrist",
    "hand": "Hand",
    "shoulder": "Shoulder",
    "back": "Back",
    "other": "Other",
}


def _parse_ts(s: str) -> datetime | None:
    try:
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def analyze_arthritis(
    watch: list[dict],
    logged: list[dict],
) -> list[str]:
    insights: list[str] = []

    pains = [
        e for e in logged
        if e.get("type") == "pain" and e.get("score") is not None
    ]

    if not pains:
        return insights

    pains.sort(key=lambda e: e.get("timestamp", ""))
    recent = pains[-14:]

    scores = [float(p["score"]) for p in recent]

    # --- Rule 1: pain trend (first half vs second half) ---------------
    if len(scores) >= 4:
        mid = len(scores) // 2
        first_half = mean(scores[:mid])
        second_half = mean(scores[mid:])
        delta = second_half - first_half

        if delta <= -1.0:
            insights.append(
                f"Pain trended down from {first_half:.0f} to {second_half:.0f} "
                f"over the last week — steady improvement."
            )
        elif delta >= 1.0:
            insights.append(
                f"Pain trended up from {first_half:.0f} to {second_half:.0f} "
                f"over the last week — worth mentioning to the doctor."
            )

    # --- Rule 2: most affected joint ----------------------------------
    joint_count: dict[str, int] = {}
    for p in recent:
        j = p.get("joint")
        if j:
            joint_count[j] = joint_count.get(j, 0) + 1
    if joint_count:
        top_joint, count = max(joint_count.items(), key=lambda x: x[1])
        total = sum(joint_count.values())
        if count / total >= 0.5:
            label = JOINT_LABELS.get(top_joint, top_joint)
            insights.append(
                f"{label} mentioned in {count} of {total} entries — the "
                f"most affected joint."
            )

    # --- Rule 3: pain vs activity on the same day ---------------------
    if watch:
        # build map: date -> mean steps
        by_day_steps: dict[str, list[int]] = {}
        for r in watch:
            day = r.get("timestamp", "")[:10]
            if day:
                by_day_steps.setdefault(day, []).append(r["metrics"]["steps"])
        day_avg_steps = {
            d: mean(v) for d, v in by_day_steps.items()
        }

        # correlate pain with same-day steps
        pairs: list[tuple[float, float]] = []
        for p in recent:
            ts = _parse_ts(p.get("timestamp", ""))
            if not ts:
                continue
            day = ts.date().isoformat()
            if day in day_avg_steps:
                pairs.append((float(p["score"]), day_avg_steps[day]))

        if len(pairs) >= 4:
            # split into high-activity vs low-activity days
            steps_sorted = sorted(p[1] for p in pairs)
            median_steps = steps_sorted[len(steps_sorted) // 2]
            high_act_pain = [p[0] for p in pairs if p[1] >= median_steps]
            low_act_pain = [p[0] for p in pairs if p[1] < median_steps]

            if high_act_pain and low_act_pain:
                diff = mean(low_act_pain) - mean(high_act_pain)
                if diff >= 1.0:
                    insights.append(
                        f"Pain was higher on low-activity days "
                        f"({mean(low_act_pain):.1f}/10) than on active ones "
                        f"({mean(high_act_pain):.1f}/10) — gentle movement "
                        f"may help."
                    )

    # --- Rule 4: stiffness pattern ------------------------------------
    stiffness_map = {"none": 0, "mild": 1, "moderate": 2, "severe": 3}
    stiff_scores = [
        stiffness_map.get(str(p.get("stiffness", "")).lower(), None)
        for p in recent
    ]
    stiff_scores = [s for s in stiff_scores if s is not None]
    if len(stiff_scores) >= 4:
        mid = len(stiff_scores) // 2
        first = mean(stiff_scores[:mid])
        second = mean(stiff_scores[mid:])
        if second - first <= -0.5:
            insights.append(
                "Morning stiffness has been easing over the last week."
            )

    # --- Rule 5: quiet reassurance ------------------------------------
    if not insights and scores and mean(scores) <= 3:
        insights.append(
            f"Pain has been low ({mean(scores):.1f}/10 average) — a steady week."
        )

    return insights[:3]