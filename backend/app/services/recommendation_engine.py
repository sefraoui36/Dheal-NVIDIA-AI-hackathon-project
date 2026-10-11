"""
Rule-based recommendation engine.

A curated library of suggestions keyed by goal and time. Each request
picks a suggestion that rotates deterministically by day, so the user
sees variety without any LLM call.
"""

import hashlib
from datetime import datetime


# ------------------------------------------------------------------
# Curated suggestion libraries
# ------------------------------------------------------------------

MOVEMENT: dict[str, list[str]] = {
    "lose_weight": [
        "20-minute brisk walk after breakfast",
        "25-minute low-intensity cycling",
        "30-minute steady walk with a small incline",
        "15-minute bodyweight circuit: squats, push-ups, planks",
        "20-minute easy jog, walk breaks allowed",
    ],
    "gain_weight": [
        "30-minute strength session: squats, rows, presses",
        "20-minute resistance-band full-body workout",
        "25-minute walk followed by a protein-rich snack",
        "15-minute bodyweight circuit focusing on large muscles",
        "30-minute gym session targeting back and legs",
    ],
    "improve_fitness": [
        "30-minute brisk walk with light stretching afterward",
        "20-minute jog at a comfortable pace",
        "25-minute cycling at a steady rhythm",
        "15-minute bodyweight workout: squats, push-ups, planks",
        "30-minute mixed walk-jog, alternating every 3 minutes",
    ],
    "improve_sleep": [
        "15-minute gentle walk after dinner",
        "10-minute evening stretching routine",
        "20-minute slow walk outside before sunset",
        "10-minute light yoga focusing on breathing",
        "15-minute walk at a relaxed pace in the late afternoon",
    ],
    "reduce_stress": [
        "20-minute slow walk in a quiet place",
        "10-minute mindful stretching with slow breathing",
        "15-minute gentle yoga focused on the shoulders and neck",
        "25-minute walk without your phone",
        "10-minute breathing exercise: 4 in, 6 out",
    ],
}

FOOD: dict[str, list[str]] = {
    "lose_weight": [
        "Greek yogurt with berries and a handful of almonds",
        "Grilled chicken salad with olive oil and lemon",
        "Vegetable soup with lentils and a slice of whole bread",
        "Oatmeal with apple slices and cinnamon",
        "Baked salmon with steamed broccoli",
    ],
    "gain_weight": [
        "Oatmeal with peanut butter, banana, and honey",
        "Rice bowl with chicken, avocado, and olive oil",
        "Whole-wheat toast with eggs, cheese, and avocado",
        "Smoothie with yogurt, oats, dates, and nuts",
        "Pasta with tuna, olive oil, and parmesan",
    ],
    "improve_fitness": [
        "Greek yogurt with oats, banana, and almonds",
        "Whole-grain toast with eggs and avocado",
        "Rice with grilled chicken and roasted vegetables",
        "Smoothie with milk, berries, and peanut butter",
        "Quinoa bowl with chickpeas and olive oil",
    ],
    "improve_sleep": [
        "Warm milk with a small piece of whole toast",
        "Light dinner: soup with whole-grain bread",
        "Banana with a spoon of almond butter",
        "Chamomile tea with a few almonds",
        "Yogurt with a few walnuts (2 hours before bed)",
    ],
    "reduce_stress": [
        "Warm herbal tea with a small bowl of nuts",
        "Oatmeal with banana and cinnamon",
        "Fresh fruit bowl with yogurt",
        "Whole-grain toast with avocado and a soft-boiled egg",
        "Vegetable soup with a slice of whole bread",
    ],
}

WELLNESS: dict[str, list[str]] = {
    "lose_weight": [
        "Drink a glass of water before your next meal",
        "Take the stairs instead of the elevator today",
        "Eat one meal today without any screen",
        "Park 10 minutes away and walk the rest",
        "Sleep 7–8 hours to support your metabolism",
    ],
    "gain_weight": [
        "Add a small snack between lunch and dinner",
        "Keep a water bottle with you and sip often",
        "Eat breakfast within an hour of waking",
        "Add one spoon of olive oil to a meal today",
        "Sleep 7–8 hours to support muscle recovery",
    ],
    "improve_fitness": [
        "Drink water before your next meal",
        "Take a 2-minute walk every hour",
        "Stretch for 3 minutes before bed",
        "Take the stairs once today",
        "Get 7–8 hours of sleep",
    ],
    "improve_sleep": [
        "Dim the lights 1 hour before bed",
        "No screens for 30 minutes before sleep",
        "Keep the bedroom cool and dark",
        "Go to bed at the same time as yesterday",
        "No caffeine after 2pm today",
    ],
    "reduce_stress": [
        "Take five slow breaths before your next meal",
        "Step outside for 2 minutes of fresh air",
        "Write one thing you're grateful for",
        "Turn off notifications for 30 minutes",
        "Sip a warm drink without distractions",
    ],
}

WHY: dict[str, str] = {
    "lose_weight": "Gentle activity and steady meals support your goal.",
    "gain_weight": "Strength work and regular meals help build and maintain.",
    "improve_fitness": "Gentle cardio and balanced meals support your endurance.",
    "improve_sleep": "Small evening routines make sleep come easier.",
    "reduce_stress": "Gentle movement and quiet moments settle the body.",
}


# ------------------------------------------------------------------
# Rotation logic — same day + same goal = same suggestion
# ------------------------------------------------------------------

def _pick(options: list[str], user_id: str, goal: str) -> str:
    """Deterministic pick based on user_id + goal + today's date."""
    seed_str = f"{user_id}:{goal}:{datetime.utcnow().date().isoformat()}"
    h = hashlib.sha256(seed_str.encode()).hexdigest()
    idx = int(h[:8], 16) % len(options)
    return options[idx]


# Simple keyword → tag mapping for the rule-based engine
_MOVEMENT_TAGS = {
    "walk": "walk",
    "brisk": "brisk_walk",
    "jog": "jog",
    "run": "jog",
    "cycl": "cycling",
    "stretch": "stretch",
    "yoga": "yoga",
    "breath": "breath",
    "strength": "strength",
    "gym": "gym",
    "swim": "swim",
    "dance": "dance",
}

_FOOD_TAGS = {
    "yogurt": "yogurt_berries",
    "oat": "oatmeal_banana",
    "salad": "salad_greens",
    "greens": "salad_greens",
    "salmon": "salmon_greens",
    "soup": "soup_light",
    "egg": "eggs_toast",
    "toast": "eggs_toast",
    "smoothie": "smoothie",
    "apple": "fruit_nuts",
    "banana": "oatmeal_banana",
    "nut": "nuts",
    "almond": "nuts",
    "chicken": "chicken_veg",
    "rice": "rice_bowl",
    "quinoa": "rice_bowl",
    "pasta": "pasta",
    "tea": "tea_nuts",
    "lentil": "soup_light",
}


def _guess_tag(text: str, table: dict, default: str) -> str:
    lower = text.lower()
    for kw, tag in table.items():
        if kw in lower:
            return tag
    return default


def build_recommendations_rule_based(
    user_id: str,
    goal: str,
) -> dict:
    """Return a rule-based recommendation for the given user + goal."""
    movement_pool = MOVEMENT.get(goal, MOVEMENT["improve_fitness"])
    food_pool = FOOD.get(goal, FOOD["improve_fitness"])
    wellness_pool = WELLNESS.get(goal, WELLNESS["improve_fitness"])

    movement = _pick(movement_pool, user_id, goal)
    food = _pick(food_pool, user_id, goal)
    wellness = _pick(wellness_pool, user_id, goal)

    return {
        "movement": movement,
        "food": food,
        "wellness": wellness,
        "why": WHY.get(goal, "These fit your goal for today."),
        "movement_tag": _guess_tag(movement, _MOVEMENT_TAGS, "general_move"),
        "food_tag": _guess_tag(food, _FOOD_TAGS, "general_food"),
    }