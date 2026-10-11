"""
Rule-based challenge coach.

Reads the day-by-day series and produces:
  - A paragraph describing the shape of the race
  - One pattern + suggestion per participant

No LLM. Deterministic. Fast. Always works.
"""

from statistics import mean


# ---------------------------------------------------------------------
# Pattern detection
# ---------------------------------------------------------------------

def _first_half(s: list[float]) -> float:
    if not s:
        return 0
    half = max(1, len(s) // 2)
    return mean(s[:half])


def _second_half(s: list[float]) -> float:
    if not s:
        return 0
    half = max(1, len(s) // 2)
    return mean(s[-half:])


def _last_two(s: list[float]) -> float:
    return mean(s[-2:]) if len(s) >= 2 else (s[-1] if s else 0)


def _first_two(s: list[float]) -> float:
    return mean(s[:2]) if len(s) >= 2 else (s[0] if s else 0)


def detect_pattern(daily: list[float]) -> str:
    """Return a short phrase describing the shape of a participant's race."""
    if not daily or sum(daily) == 0:
        return "no verified activity yet"

    first_h = _first_half(daily)
    second_h = _second_half(daily)
    change = second_h - first_h

    nonzero = [v for v in daily if v > 0]
    if len(nonzero) >= 4 and max(nonzero) - min(nonzero) < max(1, mean(nonzero) * 0.15):
        return "remarkably consistent"

    # peaking at the end
    if _last_two(daily) > _first_two(daily) * 1.5 and second_h > first_h:
        return "peaking late"

    # slowing down
    if _last_two(daily) < _first_two(daily) * 0.6 and second_h < first_h:
        return "slowing down"

    # strong start
    if first_h > second_h * 1.3:
        return "strong start, easing off"

    # steady climber
    if change > max(1, mean(daily) * 0.15):
        return "steady climber"

    # steady decliner
    if change < -max(1, mean(daily) * 0.15):
        return "gradually slowing"

    return "steady pace"


def suggestion_for(pattern: str, is_leader: bool) -> str:
    """One short suggestion based on the pattern."""
    if is_leader:
        if pattern == "slowing down":
            return "one strong day this weekend would secure the lead"
        if pattern == "peaking late":
            return "keep the current rhythm going"
        return "keep the daily routine consistent"

    if pattern == "strong start, easing off":
        return "one longer effort could close the gap"
    if pattern == "steady climber":
        return "you're closing in — keep it up"
    if pattern == "peaking late":
        return "this is your moment — one more push"
    if pattern == "slowing down":
        return "a short, easy day would rebuild momentum"
    if pattern == "remarkably consistent":
        return "consistency is your strength — hold the line"
    return "one small extra effort could shift the standings"


# ---------------------------------------------------------------------
# Main coach
# ---------------------------------------------------------------------

def build_coach_report(progress: dict, activity: dict) -> dict:
    """
    Given the output of `aggregate_progress`, return:
      {
        "text": "3-4 sentence summary of the race",
        "per_person": [
          {"name": "...", "pattern": "...", "suggestion": "..."},
          ...
        ]
      }
    """
    unit = activity["unit"]
    series = progress.get("series", [])

    if not series:
        return {
            "text": "The challenge has just started — check back once everyone has moved.",
            "per_person": [],
        }

    # rank by final total
    ranked = sorted(series, key=lambda s: s["cumulative"][-1], reverse=True)
    leader = ranked[0]
    rest = ranked[1:]

    # leader's pattern
    leader_pattern = detect_pattern(leader["daily"])

    # build the paragraph
    lead_margin = leader["cumulative"][-1] - (
        rest[0]["cumulative"][-1] if rest else 0
    )

    parts = [
        f"{leader['name']} is leading with "
        f"{round(leader['cumulative'][-1])} {unit}"
        + (f", ahead by {round(lead_margin)}" if lead_margin > 0 else "")
        + f" — {leader_pattern}."
    ]

    # mention one other person — pick the most interesting pattern
    if rest:
        interesting = sorted(
            rest,
            key=lambda s: abs(_second_half(s["daily"]) - _first_half(s["daily"])),
            reverse=True,
        )[0]
        other_pattern = detect_pattern(interesting["daily"])
        if other_pattern != "steady pace":
            parts.append(
                f"{interesting['name']} stands out as {other_pattern}."
            )
        else:
            parts.append(
                f"{interesting['name']} is keeping a solid, steady pace behind."
            )

    # forward look
    if rest and lead_margin > 0:
        closest = rest[0]
        parts.append(
            f"With the race still open, {closest['name']} has the best shot "
            f"at closing the gap with one strong effort."
        )
    elif rest:
        parts.append(
            f"The race is tight — anyone could still take the top spot."
        )

    text = " ".join(parts)

    # per-person
    per_person = []
    for s in ranked[:6]:
        p = detect_pattern(s["daily"])
        sug = suggestion_for(p, is_leader=(s["user_id"] == leader["user_id"]))
        per_person.append({
            "name": s["name"],
            "pattern": p,
            "suggestion": sug,
        })

    return {"text": text, "per_person": per_person}