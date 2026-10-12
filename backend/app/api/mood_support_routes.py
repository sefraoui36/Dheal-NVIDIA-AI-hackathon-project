"""
Mood support chat endpoint.

The user sends a message about how they feel, Guardian replies with a
warm, short, non-medical response that USES the user's real health data.

This is what makes DHeal's mood support unique: the reply can reference
the user's own sleep, stress, HR trends — not just generic advice.

Fallback: if Nemotron returns nothing, a curated bilingual library answers.
Crisis detection: if the message mentions self-harm, an escalation
line is added automatically.
"""

import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai.nemotron_client import generate_mood_response
from app.services.mood_health_correlation import (
    compute_correlations,
    format_correlations_for_prompt,
)

router = APIRouter(prefix="/mood-support", tags=["mood-support"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROFILES_DIR = DATA_DIR / "profiles"
MOOD_DIR = DATA_DIR / "mood"

# ---- Crisis keywords — escalate on any of these (both languages) ----
CRISIS_KEYWORDS = [
    # English
    "kill myself", "end my life", "hurt myself", "self harm",
    "self-harm", "suicide", "suicidal", "want to die",
    "no reason to live", "end it all", "don't want to live",
    "do not want to live", "want to end it",
    # French — extended
    "me tuer", "me suicider", "suicidaire",
    "me faire du mal",
    "je veux mourir", "veux mourir",
    "je veux plus vivre", "je veux plus",
    "ne veux plus vivre", "veux plus vivre",
    "plus envie de vivre", "envie de mourir",
    "je veux en finir", "en finir avec la vie",
    "je vais me tuer", "je vais me suicider",
    "je veux disparaitre", "veux disparaitre",
    "je ne sers a rien", "je sers a rien",
    "je ne veux pas continuer",
    "la vie ne vaut pas",
]

# ---- Curated fallback replies — bilingual ----
FALLBACK_REPLIES = {
    "tired": {
        "en": "That sounds like a heavy day. Try drinking some water, taking five slow breaths, and doing only the smallest task on your list.",
        "fr": "Cela ressemble à une journée difficile. Essayez de boire un peu d'eau, de prendre cinq respirations lentes, et de ne faire que la plus petite tâche de votre liste.",
    },
    "sad": {
        "en": "It's okay to feel low. Try stepping outside for two minutes of fresh air, or writing down one small thing that went okay today.",
        "fr": "C'est normal de se sentir triste. Essayez de sortir deux minutes prendre l'air, ou d'écrire une petite chose qui s'est bien passée aujourd'hui.",
    },
    "anxious": {
        "en": "That sounds difficult. Try a slow breathing exercise — four seconds in, six seconds out — for one minute.",
        "fr": "Cela semble difficile. Essayez un exercice de respiration lente — quatre secondes d'inspiration, six secondes d'expiration — pendant une minute.",
    },
    "stressed": {
        "en": "Stress can feel overwhelming. Pick one thing you can put down for the next hour, and let yourself rest.",
        "fr": "Le stress peut être accablant. Choisissez une chose que vous pouvez mettre de côté pour l'heure qui vient, et reposez-vous.",
    },
    "happy": {
        "en": "That's lovely to hear — hold onto that feeling. Maybe write down what made today good, so you can come back to it.",
        "fr": "C'est merveilleux à entendre — gardez précieusement ce sentiment. Peut-être notez ce qui a rendu cette journée belle, pour y revenir plus tard.",
    },
    "angry": {
        "en": "That's a real feeling. Try taking a short walk, or pausing for five slow breaths before you decide anything.",
        "fr": "C'est une émotion légitime. Essayez une petite marche, ou prenez cinq respirations lentes avant de décider quoi que ce soit.",
    },
    "lonely": {
        "en": "That's a hard place to be. Consider sending a quick message to someone you trust — even a small hello.",
        "fr": "C'est une situation difficile. Envoyez peut-être un petit message à quelqu'un de confiance — même un simple bonjour.",
    },
    "sick": {
        "en": "Take it easy today. Hydrate, rest, and let your body lead the pace.",
        "fr": "Reposez-vous aujourd'hui. Hydratez-vous, reposez-vous, et laissez votre corps donner le rythme.",
    },
    "default": {
        "en": "Thanks for sharing that with me. Try one small kind thing for yourself today — even a two-minute pause counts.",
        "fr": "Merci d'avoir partagé cela avec moi. Faites une petite chose bienveillante pour vous aujourd'hui — même une pause de deux minutes compte.",
    },
}

FALLBACK_KEYWORDS = {
    "tired": ["tired", "exhausted", "fatigue", "fatigué", "fatiguée", "épuisé", "épuisée", "epuise", "epuisee"],
        "sad": [
        "sad", "down", "low", "unhappy",
        "triste", "tristesse",
        "déprimé", "déprimée", "deprime", "deprimee",
        "malheureux", "malheureuse",
        "déprime", "deprime",
        "peine",  # ← ajoute
        "chagrin", "chagriné",  # ← ajoute
    ],
    "anxious": ["anxious", "nervous", "worried", "anxieux", "anxieuse", "inquiet", "inquiète", "inquiete"],
    "stressed": ["stress", "overwhelmed", "stressé", "stressée", "stresse", "stressee", "débordé", "deborde"],
    "happy": ["happy", "good", "great", "joyful", "joyeux", "joyeuse", "content", "contente", "heureux", "heureuse", "bonne journée"],
        "angry": [
        "angry", "mad", "frustrated",
        "fâché", "fâchée", "fache", "fachee",
        "colère", "colere",  # ← ajoute juste ces deux
        "frustré", "frustree", "frustrée",
        "énerver", "enerve", "énervé", "enervee", "énervée",
    ],
    "lonely": ["lonely", "alone", "isolated", "seul", "seule", "isolé", "isolée", "isole", "isolee"],
    "sick": ["sick", "ill", "unwell", "malade", "souffrant", "souffrante"],
}


class MoodChatRequest(BaseModel):
    user_id: str
    message: str
    # if True, the reply MUST cite at least one health number
    force_health_analysis: bool = False


class MoodChatResponse(BaseModel):
    reply: str
    crisis: bool
    source: str
    health_context_used: bool
    timestamp: str


class HealthCheckResponse(BaseModel):
    summary: str
    patterns: list[str]
    mood_avg_7d: float | None
    sleep_avg_7d: float | None
    stress_avg_7d: float | None
    conditions: list[str]
    timestamp: str


def _load_profile(user_id: str) -> dict:
    p = PROFILES_DIR / f"{user_id}.json"
    if not p.exists():
        return {"user_id": user_id, "name": "friend"}
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {"user_id": user_id, "name": "friend"}


def _load_recent_mood(user_id: str) -> list[dict]:
    p = MOOD_DIR / f"{user_id}.json"
    if not p.exists():
        return []
    try:
        entries = json.loads(p.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return []

    by_day: dict[str, list[int]] = {}
    for e in entries[-30:]:
        day = e.get("timestamp", "")[:10]
        by_day.setdefault(day, []).append(e.get("score", 3))
    return [
        {"date": day, "avg_score": round(sum(s) / len(s), 2)}
        for day, s in sorted(by_day.items())[-5:]
    ]


def _detect_crisis(text: str) -> bool:
    """
    Detect crisis language in both English and French.
    Uses a mix of exact keyword matching and pattern matching for
    variations the user might type.
    """
    lower = text.lower()

    # exact keyword match
    if any(kw in lower for kw in CRISIS_KEYWORDS):
        return True

    # pattern match — combinations that indicate crisis even if the
    # exact phrase isn't in the list
    crisis_patterns = [
        ("veux", "mourir"),
        ("veux", "tuer"),
        ("veux", "suicider"),
        ("veux", "plus", "vivre"),
        ("veux", "pas", "vivre"),
        ("envie", "mourir"),
        ("envie", "finir"),
        ("plus", "envie", "vivre"),
        ("fini", "avec", "la vie"),
        ("want", "to", "die"),
        ("want", "to", "kill"),
        ("no", "reason", "live"),
    ]
    words = lower.replace(",", " ").replace(".", " ").split()
    for pattern in crisis_patterns:
        # check if all pattern words appear in sequence (not necessarily contiguous)
        idx = 0
        for word in words:
            if idx < len(pattern) and pattern[idx] in word:
                idx += 1
        if idx == len(pattern):
            return True

    return False


def _detect_language(text: str) -> str:
    lower = text.lower()
    french_markers = [
        "je ", "j'", " tu ", "vous ", "nous ", " et ", " mais ", " pour ",
        " avec ", "pas ", "bien", "très", "tres", "suis", "sens",
        "aujourd", "merci", "oui", "non",
    ]
    if any(m in lower for m in french_markers):
        return "fr"
    for ch in "àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ":
        if ch in text:
            return "fr"
    return "en"


def _pick_fallback(message: str) -> str:
    lower = message.lower()
    lang = _detect_language(message)
    for category, keywords in FALLBACK_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return FALLBACK_REPLIES[category][lang]
    return FALLBACK_REPLIES["default"][lang]


@router.post("/chat")
def chat(req: MoodChatRequest) -> MoodChatResponse:
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    profile = _load_profile(req.user_id)
    recent_mood = _load_recent_mood(req.user_id)
    crisis = _detect_crisis(req.message)
    lang = _detect_language(req.message)

    # ---- Compute mood ↔ health correlations ----
    corr = compute_correlations(req.user_id)
    health_context = format_correlations_for_prompt(corr, lang=lang)
    has_health = bool(corr.get("notable_patterns")) or (
        corr.get("sleep_hours_avg_7d") is not None
    )

    # ---- Try Nemotron first ----
    # ---- Try Nemotron first (with one retry on failure) ----
    reply: str | None = None
    source = "nemotron_lightning"

    for attempt in range(2):  # up to 2 attempts
        try:
            candidate = generate_mood_response(
                profile=profile,
                user_message=req.message,
                recent_mood=recent_mood,
                crisis=crisis,
                health_context=health_context,
                force_health_analysis=req.force_health_analysis,
            )
            if isinstance(candidate, dict) and candidate.get("reply"):
                reply = candidate["reply"].strip()
                break  # success
        except Exception as e:
            print(f"[mood-support] Nemotron attempt {attempt + 1} failed: {e}")

        # small delay before retry
        if attempt == 0 and not reply:
            import time
            time.sleep(0.5)

    # ---- Fallback if empty ----
    if not reply:
        source = "rule_based"
        reply = _pick_fallback(req.message)
        # Enrich the fallback with a health line when available
        if has_health and lang == "fr":
            patterns = corr.get("notable_patterns", [])
            if patterns:
                reply += f" Je remarque aussi que {patterns[0]}."
        elif has_health:
            patterns = corr.get("notable_patterns", [])
            if patterns:
                reply += f" I also notice that {patterns[0]}."

    # ---- Crisis safety net ----
    if crisis:
        prefix = (
            "Please reach out to a trusted person or local emergency "
            "services right now — you are not alone. "
            if lang == "en"
            else "Veuillez contacter une personne de confiance ou les "
            "services d'urgence locaux immédiatement — vous n'êtes pas seul(e). "
        )
        reply = prefix + reply

    return MoodChatResponse(
        reply=reply,
        crisis=crisis,
        source=source,
        health_context_used=has_health,
        timestamp=datetime.utcnow().isoformat(timespec="seconds"),
    )


@router.get("/suggestions")
def suggestions():
    """Starter prompts for the chat UI (bilingual)."""
    return {
        "suggestions": [
            "Je me sens fatigué(e) aujourd'hui",
            "Je suis un peu anxieux(se)",
            "J'ai passé une bonne journée",
            "Je me sens stressé(e)",
            "Est-ce que ça affecte ma santé ?",
        ]
    }


@router.get("/health-check/{user_id}")
def health_check(user_id: str) -> HealthCheckResponse:
    """
    Called by the "Does this affect my health?" button.
    Returns the mood ↔ health correlations computed from real data,
    and a short bilingual summary.
    """
    corr = compute_correlations(user_id)
    patterns = corr.get("notable_patterns", [])
    profile = _load_profile(user_id)
    name = profile.get("name", "there")

    if not patterns:
        summary = (
            f"{name}, tes données des 7 derniers jours ne montrent pas de "
            f"pattern net entre ton mood et ta santé. C'est une bonne "
            f"nouvelle — ça veut dire que ta fatigue ou ta tristesse ne "
            f"semblent pas liées à tes chiffres."
        )
    else:
        summary = (
            f"{name}, j'ai regardé tes données des 7 derniers jours. "
            f"Voici ce que je remarque :"
        )

    return HealthCheckResponse(
        summary=summary,
        patterns=patterns,
        mood_avg_7d=corr.get("mood_avg_7d"),
        sleep_avg_7d=corr.get("sleep_hours_avg_7d"),
        stress_avg_7d=corr.get("stress_level_avg_7d"),
        conditions=corr.get("conditions", []),
        timestamp=datetime.utcnow().isoformat(timespec="seconds"),
    )