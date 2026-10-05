"""
Condition reference table.

Each condition maps to:
  - key_metrics: which metrics matter most for this person
  - suggestions: general-wellness prompts (never medical advice)
  - icon: Material Symbols icon name
  - label: display label
  - disclaimer: honest scope note shown alongside suggestions

IMPORTANT: all suggestions are general well-being prompts. Never medical
advice, never treatment, never diagnosis.
"""

CONDITIONS = {
    "type_2_diabetes": {
        "label": "Type 2 Diabetes",
        "icon": "water_drop",
        "accent": "coral",
        "key_metrics": ["steps", "activity_minutes", "sleep_hours"],
        "suggestions": [
            {
                "trigger": "low_steps",
                "text": "Steps are below the usual range today. A short 10-minute walk after meals is often recommended for steady energy.",
            },
            {
                "trigger": "low_sleep",
                "text": "Sleep was shorter than usual. Consistent sleep helps keep energy levels stable through the day.",
            },
            {
                "trigger": "always",
                "text": "Staying hydrated throughout the day supports steady energy.",
            },
        ],
        "disclaimer": "General well-being prompts only. Diabetes management belongs with your doctor.",
    },
    "hypertension": {
        "label": "Hypertension",
        "icon": "ecg_heart",
        "accent": "coral",
        "key_metrics": ["heart_rate", "stress_level", "sleep_hours"],
        "suggestions": [
            {
                "trigger": "high_stress",
                "text": "Stress was elevated today. A slow breathing pause — 5 minutes of calm — often helps the body settle.",
            },
            {
                "trigger": "high_hr",
                "text": "Heart rate ran a little high. A gentle walk or light stretching can help it return to baseline.",
            },
            {
                "trigger": "always",
                "text": "Regular light activity and steady sleep are the two things that help most day-to-day.",
            },
        ],
        "disclaimer": "General well-being prompts only. Blood pressure management belongs with your doctor.",
    },
    "arthritis": {
        "label": "Arthritis",
        "icon": "accessibility_new",
        "accent": "mint",
        "key_metrics": ["steps", "activity_minutes"],
        "suggestions": [
            {
                "trigger": "low_activity",
                "text": "Activity has been low. Gentle, regular movement often helps more than complete rest.",
            },
            {
                "trigger": "always",
                "text": "Warmth and light stretching before activity usually make movement easier.",
            },
        ],
        "disclaimer": "General well-being prompts only. Arthritis care belongs with your doctor.",
    },
    "post_surgery_recovery": {
        "label": "Post-Surgery Recovery",
        "icon": "healing",
        "accent": "mint",
        "key_metrics": ["sleep_hours", "steps", "heart_rate"],
        "suggestions": [
            {
                "trigger": "high_activity",
                "text": "Activity was higher than usual. Recovery is the priority — gentle days are expected.",
            },
            {
                "trigger": "low_sleep",
                "text": "Sleep was shorter than usual. Rest is when the body does most of its healing.",
            },
            {
                "trigger": "always",
                "text": "Following the recovery plan from the surgical team is the most important part.",
            },
        ],
        "disclaimer": "General well-being prompts only. Follow your surgical team's guidance first.",
    },
    "menopause": {
        "label": "Menopause",
        "icon": "spa",
        "accent": "amber",
        "key_metrics": ["sleep_hours", "heart_rate", "stress_level"],
        "suggestions": [
            {
                "trigger": "low_sleep",
                "text": "Sleep was shorter than usual — this is common during this stage. A cool room and a steady bedtime routine can help.",
            },
            {
                "trigger": "high_hr",
                "text": "Heart rate was a little higher today. Slow breathing or a short walk often helps.",
            },
            {
                "trigger": "always",
                "text": "Tracking patterns over weeks is more useful than any single day.",
            },
        ],
        "disclaimer": "General well-being prompts only. Menopause care belongs with your doctor.",
    },
    "pregnancy_second_trimester": {
        "label": "Pregnancy · Second Trimester",
        "icon": "pregnant_woman",
        "accent": "pink",
        "key_metrics": ["heart_rate", "sleep_hours", "steps"],
        "suggestions": [
            {
                "trigger": "high_hr",
                "text": "Resting heart rate has drifted up slightly — this is normal in the second trimester as blood volume increases.",
            },
            {
                "trigger": "low_sleep",
                "text": "Sleep was shorter than usual. A steady bedtime and a cool room help the most.",
            },
            {
                "trigger": "low_steps",
                "text": "Steps are a bit lower than usual. A short walk after meals often helps energy.",
            },
            {
                "trigger": "always",
                "text": "Pregnancy care belongs with your OB or midwife. We only report what we've verified.",
            },
        ],
        "disclaimer": "Never medical advice. Pregnancy care belongs with your OB or midwife.",
        "cannot_measure": "The baby's health, movement, or heart rate cannot be read from a watch. Log these yourself below — we'll keep them with your data.",
    },
    "pregnancy_third_trimester": {
        "label": "Pregnancy · Third Trimester",
        "icon": "pregnant_woman",
        "accent": "pink",
        "key_metrics": ["sleep_hours", "heart_rate", "steps"],
        "suggestions": [
            {
                "trigger": "low_sleep",
                "text": "Sleep is often shorter in the third trimester. Naps and a cool room help.",
            },
            {
                "trigger": "high_hr",
                "text": "Heart rate running higher is expected now. Rest when you can.",
            },
            {
                "trigger": "always",
                "text": "Kick counts and appointments matter more than any watch metric this late.",
            },
        ],
        "disclaimer": "Never medical advice. Pregnancy care belongs with your OB or midwife.",
        "cannot_measure": "The baby's health, movement, or heart rate cannot be read from a watch. Log these yourself below — we'll keep them with your data.",
    },
    "general_wellness": {
        "label": "General Wellness",
        "icon": "favorite",
        "accent": "slate",
        "key_metrics": ["heart_rate", "steps", "sleep_hours"],
        "suggestions": [
            {
                "trigger": "always",
                "text": "Everything looks steady. Keep the usual routine.",
            },
        ],
        "disclaimer": "General well-being prompts only.",
    },
}


def get_condition(condition_key: str) -> dict:
    return CONDITIONS.get(condition_key, CONDITIONS["general_wellness"])


def all_conditions() -> dict:
    return CONDITIONS