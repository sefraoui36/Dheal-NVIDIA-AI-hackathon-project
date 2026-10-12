"""
Turn a replay object into a structured prompt for Nemotron.

Design principle: the AI is TOLD which evidence is trustworthy and which
is not. It is not allowed to treat SUSPICIOUS or FLAGGED records as
reliable evidence.
"""


SYSTEM_PROMPT = """You are a health-data investigation assistant.
You analyze a user's health timeline to explain what changed around an episode.

CRITICAL RULES:
1. You do NOT diagnose diseases. You explain patterns, evidence, and uncertainty.
2. You are given trusted and untrusted evidence separately.
3. TRUSTED records may be used as reliable evidence.
4. SUSPICIOUS records are physically possible but statistically extreme — you must
   treat them as UNRELIABLE and clearly state they should not be used as the basis
   for any conclusion.
5. FLAGGED records are physiologically impossible — never use them.
6. If the key evidence is SUSPICIOUS or FLAGGED, your confidence must be LIMITED.
7. Always return valid JSON matching the requested schema. No prose outside JSON.
8. Do NOT write any reasoning, thinking, or explanation outside the JSON.
   Your entire response must be a single JSON object starting with "{" and
   ending with "}". Any text before or after the JSON is an error.
9. Do NOT include "Here's my thinking", "Let me analyze", or any preamble.
   Output JSON and nothing else.
"""


# Physically valid minimums — used to clamp baseline display bounds
PHYS_MIN = {
    "heart_rate": 20,
    "sleep_hours": 0,
    "steps": 0,
    "activity_minutes": 0,
    "stress_level": 1,
}


def _format_baseline(baseline: dict) -> str:
    lines = []
    for metric, s in baseline.items():
        lo = max(s["lower_bound"], PHYS_MIN.get(metric, s["lower_bound"]))
        hi = s["upper_bound"]
        lines.append(
            f"  {metric}: mean={s['mean']}, std={s['std']}, "
            f"normal_range=[{lo}, {hi}]"
        )
    return "\n".join(lines)


def _format_timeline(timeline: list[dict], recent_hours: int = 24):
    """
    Full detail for the last `recent_hours`.
    Summary line for anything older, unless it's SUSPICIOUS/FLAGGED
    (those are always shown in full so the AI sees the flagged evidence).
    """
    trusted_lines, untrusted_lines = [], []

    if not timeline:
        return "  (none)", "  (none)"

    cutoff = timeline[-min(recent_hours, len(timeline))]["timestamp"]

    for r in timeline:
        ts = r["timestamp"]
        m = r["metrics"]
        row = (
            f"  {ts} | HR={m['heart_rate']} sleep={m['sleep_hours']} "
            f"steps={m['steps']} activity={m['activity_minutes']} stress={m['stress_level']}"
        )

        is_recent = ts >= cutoff

        if r["verdict"] == "TRUSTED":
            if is_recent:
                trusted_lines.append(row)
            # older trusted rows are summarised below, not listed individually
        else:
            reasons = "; ".join(r["reasons"]) or "anomalous"
            untrusted_lines.append(f"{row}\n     -> {r['verdict']}: {reasons}")

    # summarise older trusted rows in a single line
    older_trusted = [
        r for r in timeline
        if r["verdict"] == "TRUSTED" and r["timestamp"] < cutoff
    ]
    if older_trusted:
        hrs = [r["metrics"]["heart_rate"] for r in older_trusted]
        trusted_lines.insert(
            0,
            f"  [Summary of {len(older_trusted)} earlier trusted rows: "
            f"HR min={min(hrs)} max={max(hrs)} avg={sum(hrs) / len(hrs):.1f}]",
        )

    return (
        "\n".join(trusted_lines) or "  (none)",
        "\n".join(untrusted_lines) or "  (none)",
    )


def _format_integrity(integrity: dict) -> str:
    if integrity["valid"]:
        return f"  SHA-256 hash chain valid across {integrity['total']} records."
    return (
        f"  SHA-256 hash chain BROKEN at index {integrity['broken_at_index']} "
        f"({integrity['broken_at_timestamp']}). Data before that index is suspect."
    )


def _format_gaps(gaps: list[dict]) -> str:
    if not gaps:
        return "  None."
    return "\n".join(
        f"  gap of {g['gap_minutes']} min between {g['after']} and {g['before']}"
        for g in gaps
    )


def _format_anomalies(anomalies: list[dict]) -> str:
    if not anomalies:
        return "  None."
    return "\n".join(
        f"  {a['timestamp']} | {a['metric']}={a['value']} "
        f"(z={a['z']}, severity={a['severity']})"
        for a in anomalies
    )


def build_prompt(replay: dict) -> list[dict]:
    """Return OpenAI-style messages: [{role, content}, ...]"""

    trusted, untrusted = _format_timeline(replay["timeline"])

    user_prompt = f"""INVESTIGATION REQUEST — user {replay['user_id']}
Window: {replay['window']['start']} to {replay['window']['end']} ({replay['window']['hours']}h)

=== 1. PERSONAL BASELINE (learned from this user's history) ===
{_format_baseline(replay['baseline'])}

=== 2. DATA INTEGRITY ===
{_format_integrity(replay['integrity'])}

=== 3. TRUSTED TIMELINE (use as reliable evidence) ===
{trusted}

=== 4. UNTRUSTED TIMELINE (do NOT use as reliable evidence) ===
{untrusted}

=== 5. TOP ANOMALIES ===
{_format_anomalies(replay['what_changed']['top_anomalies'])}

=== 6. MISSING DATA ===
{_format_gaps(replay['summary']['missing_gaps'])}

=== 7. SUMMARY COUNTS ===
Total records: {replay['summary']['total_records']}
Trusted: {replay['summary']['trusted']}
Suspicious: {replay['summary']['suspicious']}
Flagged: {replay['summary']['flagged']}

=== YOUR TASK ===
Investigate what changed around any anomalous health episode in this window.

Return STRICT JSON with exactly these keys:
{{
  "headline": "one-sentence plain-language summary",
  "what_changed": ["bullet 1", "bullet 2", ...],
  "evidence_used": [
    {{"timestamp": "...", "metric": "...", "value": ..., "trust": "TRUSTED|SUSPICIOUS|FLAGGED"}}
  ],
  "unreliable_evidence": ["bullet describing each SUSPICIOUS/FLAGGED item and why it must not be trusted"],
  "confidence": "HIGH | MODERATE | LIMITED",
  "confidence_reason": "why that confidence level",
  "next_steps": [
    "practical non-medical action 1",
    "practical non-medical action 2",
    "practical non-medical action 3"
  ],
  "disclaimer": "not a diagnosis..."
}}

Rules for output:
- If any SUSPICIOUS or FLAGGED record is central to the anomaly, confidence MUST be LIMITED.
- Never claim a disease. Describe patterns only.
- Every bullet must be grounded in the evidence above.
- "next_steps" MUST contain 2-3 short, practical, non-diagnostic actions.
  Focus on data hygiene (re-check device, verify sensor placement, re-measure)
  or general wellness (hydration, rest). NEVER give medical advice.
"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def build_ask_prompt(replay: dict, question: str) -> list[dict]:
    """Build a prompt for a user Q&A about their health data."""

    trusted, untrusted = _format_timeline(replay["timeline"])

    user_prompt = f"""USER QUESTION:
{question}

=== 1. PERSONAL BASELINE ===
{_format_baseline(replay['baseline'])}

=== 2. DATA INTEGRITY ===
{_format_integrity(replay['integrity'])}

=== 3. TRUSTED TIMELINE (use as reliable evidence) ===
{trusted}

=== 4. UNTRUSTED TIMELINE (do NOT use as reliable evidence) ===
{untrusted}

=== 5. TOP ANOMALIES ===
{_format_anomalies(replay['what_changed']['top_anomalies'])}

=== 6. MISSING DATA ===
{_format_gaps(replay['summary']['missing_gaps'])}

=== YOUR TASK ===
Answer the user's question using ONLY the trusted evidence above.

Return STRICT JSON. The FIRST key MUST be exactly "answer".
Do not rename keys. Do not add extra top-level keys.

Schema (exact order, exact names):
{{
  "answer": "<2-4 sentence plain-language answer>",
  "evidence_used": [{{"timestamp": "...", "metric": "...", "value": 0, "trust": "TRUSTED"}}],
  "caveats": ["..."],
  "confidence": "HIGH",
  "next_steps": ["..."],
  "disclaimer": "..."
}}

Rules:
- The FIRST key is ALWAYS "answer" - never ".", never "", never anything else.
- "confidence" must be one of: "HIGH", "MODERATE", "LIMITED".
- If the answer depends on SUSPICIOUS or FLAGGED data, set confidence to "LIMITED".
- Never diagnose a disease.
- Keep "answer" short (2-4 sentences).
- "next_steps" must contain 2-3 practical, non-medical suggestions.
"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


if __name__ == "__main__":
    import json
    from pathlib import Path

    replay_path = (
        Path(__file__).resolve().parent.parent.parent
        / "data" / "processed" / "replay_user_001.json"
    )
    replay = json.loads(replay_path.read_text())
    msgs = build_prompt(replay)
    for m in msgs:
        print(f"--- {m['role'].upper()} ---")
        print(m["content"][:2500])
        print("...\n")
def build_prep_prompt(replay: dict) -> list[dict]:
    """Build a prompt for doctor-visit preparation."""

    trusted, untrusted = _format_timeline(replay["timeline"])

    user_prompt = f"""DOCTOR VISIT PREPARATION — user {replay['user_id']}
Window: {replay['window']['start']} to {replay['window']['end']}

=== 1. PERSONAL BASELINE ===
{_format_baseline(replay['baseline'])}

=== 2. DATA INTEGRITY ===
{_format_integrity(replay['integrity'])}

=== 3. TRUSTED TIMELINE (use as reliable evidence) ===
{trusted}

=== 4. UNTRUSTED TIMELINE (do NOT use as reliable evidence) ===
{untrusted}

=== 5. TOP ANOMALIES ===
{_format_anomalies(replay['what_changed']['top_anomalies'])}

=== 6. SUMMARY COUNTS ===
Total records: {replay['summary']['total_records']}
Trusted: {replay['summary']['trusted']}
Suspicious: {replay['summary']['suspicious']}
Flagged: {replay['summary']['flagged']}

=== YOUR TASK ===
Prepare a one-page brief the patient can hand to a clinician.

Return STRICT JSON with exactly these keys:
{{
  "summary": "1-2 sentence plain-language overview of the last 72 hours",
  "changes_since_baseline": [
    "metric changed + amount + direction (e.g. 'Sleep down 25 min/night')"
  ],
  "verified_days": 3,
  "unverified_days": 1,
  "questions_for_doctor": [
    "3 specific, non-diagnostic questions the patient can ask"
  ],
  "concerns": [
    "bullet for each flagged reading, in plain language"
  ],
  "reassurance": "1 sentence on what looks healthy"
}}

Rules:
- NEVER diagnose or suggest a condition.
- Questions must be open-ended, not leading.
- Use plain language — the patient reads this aloud to the doctor.
- If data is mostly verified, say so explicitly in `reassurance`.
"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
def build_family_advice_prompt(profile: dict, timeline_summary: dict, timeline_rows: list) -> list[dict]:
    """
    Build a prompt for a single short daily advice line for a specific
    family member, grounded in their conditions and today's data.
    """

    conditions = ", ".join(
        [c.get("label", c) if isinstance(c, dict) else c
         for c in profile.get("condition_details", [])]
    ) or "general wellness"

    key_metrics = []
    for c in profile.get("condition_details", []):
        for m in c.get("key_metrics", []):
            if m not in key_metrics:
                key_metrics.append(m)

    # Build a compact snapshot of today
    recent = timeline_rows[-12:] if timeline_rows else []
    snapshot_lines = []
    for r in recent[::3]:  # every 3rd row — keeps prompt small
        m = r["metrics"]
        snapshot_lines.append(
            f"  {r['timestamp'][11:16]} | HR={m['heart_rate']} "
            f"sleep={m['sleep_hours']} steps={m['steps']} "
            f"stress={m['stress_level']} verdict={r['verdict']}"
        )
    snapshot = "\n".join(snapshot_lines) or "  (no recent data)"

    user_prompt = f"""FAMILY MEMBER: {profile.get('name', 'User')}
Relation: {profile.get('relation', '—')}
Age: {profile.get('age', '—')}
Conditions: {conditions}
Key metrics for this person: {", ".join(key_metrics) or "heart rate, sleep, steps"}

=== TODAY'S DATA (last 12 hours) ===
{snapshot}

=== SUMMARY ===
Total records: {timeline_summary.get('total_records', 0)}
Trusted: {timeline_summary.get('trusted', 0)}
Suspicious: {timeline_summary.get('suspicious', 0)}
Flagged: {timeline_summary.get('flagged', 0)}

=== YOUR TASK ===
Write ONE short sentence of daily advice for this person, addressed to a
family member who reads it aloud to them.

Rules:
- Maximum 18 words.
- Warm and human, not clinical.
- Grounded in today's data + the person's conditions.
- If a reading was flagged/suspicious, do not base advice on it.
- NEVER diagnose. NEVER mention medication. NEVER say "you should see a doctor".
- If today's data is normal, say something calm and steady.
- Use the person's name at most once.
- Do not add quotes around the sentence.

Return STRICT JSON with exactly one key:
{{
  "text": "the advice sentence here"
}}
"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
def build_recommendations_prompt(
    profile: dict,
    goal: str,
    available_minutes: int,
    conditions: list[str],
) -> list[dict]:
    """Build a prompt for the daily health recommendations page."""

    condition_names = ", ".join(conditions) if conditions else "none"

    user_prompt = f"""USER PROFILE
Name: {profile.get('name', 'User')}
Age: {profile.get('age', '—')}
Conditions: {condition_names}

USER GOAL
{goal}

AVAILABLE TIME TODAY
{available_minutes} minutes

=== YOUR TASK ===
Produce a friendly, practical daily plan in three short parts.
Each part is ONE sentence (max 15 words), warm and specific.

1) Movement — one activity that fits the goal, the available time, and
   is safe for the user's age. Never mention running if age > 70 unless
   the goal explicitly asks for it.

2) Food — one concrete meal or snack idea (specific ingredients) that
   fits the goal. No calorie counts, no diets, no restrictions.

3) Wellness action — one tiny habit the user can do today.

ALSO pick ONE tag from each list so we can show a matching image:

MOVEMENT TAGS (pick exactly one):
  walk          → gentle or brisk walking
  brisk_walk    → faster walking / cardio walk
  jog           → light jogging
  stretch       → stretching, flexibility
  yoga          → yoga, gentle yoga
  breath        → breathing exercises, meditation
  strength      → squats, push-ups, weights, resistance
  cycling       → bike, bicycle
  gym           → gym equipment, machines
  swim          → swimming
  dance         → dancing
  general_move  → only if nothing else fits

FOOD TAGS (pick exactly one):
  yogurt_berries  → yogurt, berries, Greek yogurt
  oatmeal_banana  → oatmeal, oats, porridge, banana
  salad_greens    → salad, greens, vegetables, lettuce
  salmon_greens   → salmon, fish, greens
  soup_light      → soup, broth, stew
  eggs_toast      → eggs, omelet, toast
  smoothie        → smoothie, shake
  fruit_nuts      → apple, fruit, nuts, almonds, walnuts
  chicken_veg     → chicken, poultry, vegetables
  tea_nuts        → tea, herbal, chamomile
  rice_bowl       → rice, quinoa, grain, bowl
  pasta           → pasta, noodles, spaghetti
  nuts            → mixed nuts, peanut, almonds alone
  general_food    → only if nothing else fits

=== TAG RULES (CRITICAL) ===
- The tag MUST match the sentence exactly. If the sentence mentions "yoga",
  the movement_tag is "yoga". If it mentions "salad", the food_tag is "salad_greens".
- Do NOT default to "walk" if the sentence is about yoga, stretching,
  breathing, or anything else.
- Do NOT default to "yogurt_berries" if the sentence is about oatmeal,
  salad, salmon, soup, or anything else.
- Match the specific activity or food word in your sentence.

=== CONTENT RULES ===
- NEVER medical advice, NEVER a diagnosis, NEVER medication.
- If the user has diabetes, pregnancy, or post-surgery conditions,
  the movement MUST be gentle (walking, stretching, light yoga).
- For the goal "reduce_stress", prefer: yoga, breath, or stretch —
  NOT walk (walk is for fitness).
- For the goal "improve_sleep", prefer: stretch, breath, or yoga —
  NOT walk.
- For the goal "gain_weight", prefer: strength, gym, or cycling —
  NOT walk.
- Keep language friendly and encouraging.
- 1 sentence per part.

Return STRICT JSON:
{{
  "movement": "...",
  "food": "...",
  "wellness": "...",
  "why": "one sentence (max 20 words) explaining why these fit the goal",
  "movement_tag": "...",
  "food_tag": "..."
}}"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

def build_mood_prompt(
    profile: dict,
    user_message: str,
    recent_mood: list,
    crisis: bool,
    health_context: str = "",
    force_health_analysis: bool = False,
) -> list[dict]:
    """
    Build a prompt for the mood-support chat.

    The AI is a warm companion that USES the user's real health data
    to make its reply specific to DHeal. It never diagnoses.

    - `health_context`: plain-text block of correlations
      (mood trend + sleep + HR + stress) prepared by the backend.
    - `force_health_analysis`: when True, the AI MUST mention at least
      one health pattern in its reply (used by the "Does this affect
      my health?" button).
    """

    name = profile.get("name", "there")
    mood_history = ", ".join(
        f"{m.get('date', '?')}={m.get('avg_score', '?')}"
        for m in (recent_mood or [])[-5:]
    ) or "no recent entries"

    crisis_rule = ""
    if crisis:
        crisis_rule = (
            "\n10. The user's message may indicate crisis or self-harm. "
            "You MUST begin your reply by gently urging them to reach out "
            "to a trusted person or local emergency services right now. "
            "Then, keep the rest of the reply short and caring. "
            "Do NOT attempt to counsel through a crisis yourself."
        )

    health_rule = ""
    if force_health_analysis:
        health_rule = (
            "\n11. The user explicitly asked whether their feeling affects "
            "their health. You MUST reference at least one specific number "
            "or pattern from the HEALTH CONTEXT below (e.g. sleep hours, "
            "stress level, heart-rate trend). Do NOT make it up if data is "
            "missing — instead say clearly that there isn't enough data yet."
        )
    elif health_context and "No health data" not in health_context:
        health_rule = (
            "\n11. The user's message often asks a SPECIFIC question "
            "(e.g. 'does my stress affect my heart?'). Identify what the "
            "user is really asking, and answer THAT question using a "
            "specific number from the HEALTH CONTEXT. If the context "
            "doesn't have data on that exact point, say so honestly "
            "(\"I don't have enough data on that yet\") instead of "
            "quoting an unrelated number."
        )

    user_prompt = f"""USER: {name}
Recent mood trend: {mood_history}

=== HEALTH CONTEXT (this is what makes your reply unique to DHeal) ===
{health_context or "No health data available."}

USER MESSAGE:
"{user_message}"

=== YOUR TASK ===
Reply as a warm wellness companion that KNOWS this person's real data.
You are NOT a therapist, NOT a doctor.

Rules:
1. REPLY IN THE SAME LANGUAGE AS THE USER'S MESSAGE.
   If the user writes in French, reply in French.
   If the user writes in English, reply in English.
   If the user writes in Arabic, reply in Arabic.
2. Acknowledge the feeling in one short sentence — warm, not clinical.
3. NEVER diagnose. NEVER mention a disease name. NEVER recommend medication.
4. Offer ONE small, practical action the user can do right now.
5. Keep the whole reply under 80 words.
6. Never say "as an AI" or "I'm just a model".
7. Do NOT claim to be a therapist or mental-health professional.
8. When you cite health data, phrase it as an observation of THEIR numbers,
   never as a medical conclusion. Use "I see that…" not "this means…".
9. NEVER say "you should see a doctor" unless the user explicitly asks.{crisis_rule}{health_rule}

Return STRICT JSON:
{{
  "reply": "your warm, specific reply here"
}}"""

    return [
        {
            "role": "system",
            "content": (
                "You are DHeal Guardian — a wellness companion that has "
                "access to the user's real health data. You use it to make "
                "your replies specific and useful. You are NOT a therapist, "
                "doctor, or crisis counselor. "
                "You ALWAYS reply in the same language as the user's message. "
                "Always return valid JSON. No prose outside JSON."
            ),
        },
        {"role": "user", "content": user_prompt},
    ]