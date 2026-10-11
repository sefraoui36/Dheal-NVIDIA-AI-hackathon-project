/**
 * Curated media library keyed by TAG.
 *
 * Nemotron returns a `movement_tag` and a `food_tag` for each plan.
 * We look up the media by tag, so the image/video always matches the
 * suggestion.
 */

export interface MediaItem {
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
}

export interface MealImage {
  url: string;
  alt: string;
  tag: string;
}

// ---------------- Workout videos ----------------

export const WORKOUT_BY_TAG: Record<string, MediaItem> = {
  walk: {
    title: "15-Minute Active Walking at Home",
    url: "https://www.youtube.com/watch?v=4FUnXaq_VWk",
    thumbnail: "https://i3.ytimg.com/vi/4FUnXaq_VWk/hqdefault.jpg",
    duration: "15 min",
  },
  brisk_walk: {
    title: "30-Minute Low-Impact Cardio Walk",
    url: "https://www.youtube.com/watch?v=mUYtnCmXvW4",
    thumbnail: "https://i3.ytimg.com/vi/mUYtnCmXvW4/hqdefault.jpg",
    duration: "30 min",
  },
  jog: {
    title: "20-Minute Easy Jog (with walk breaks)",
    url: "https://www.youtube.com/watch?v=UItWltVZZmE",
    thumbnail: "https://i3.ytimg.com/vi/UItWltVZZmE/hqdefault.jpg",
    duration: "20 min",
  },
  stretch: {
    title: "10-Minute Gentle Stretch for Seniors",
    url: "https://www.youtube.com/watch?v=2D6cE7pF6eU",
    thumbnail: "https://i3.ytimg.com/vi/2D6cE7pF6eU/hqdefault.jpg",
    duration: "10 min",
  },
  yoga: {
    title: "15-Minute Gentle Yoga",
    url: "https://www.youtube.com/watch?v=v7AYKMP6rOE",
    thumbnail: "https://i3.ytimg.com/vi/v7AYKMP6rOE/hqdefault.jpg",
    duration: "15 min",
  },
  breath: {
    title: "5-Minute Breathing Exercise",
    url: "https://www.youtube.com/watch?v=inpok4MKVLM",
    thumbnail: "https://i3.ytimg.com/vi/inpok4MKVLM/hqdefault.jpg",
    duration: "5 min",
  },
  strength: {
    title: "20-Minute Bodyweight Strength",
    url: "https://www.youtube.com/watch?v=UItWltVZZmE",
    thumbnail: "https://i3.ytimg.com/vi/UItWltVZZmE/hqdefault.jpg",
    duration: "20 min",
  },
  cycling: {
    title: "20-Minute Stationary Bike Session",
    url: "https://www.youtube.com/watch?v=mUYtnCmXvW4",
    thumbnail: "https://i3.ytimg.com/vi/mUYtnCmXvW4/hqdefault.jpg",
    duration: "20 min",
  },
  gym: {
    title: "Full-Body Gym Routine",
    url: "https://www.youtube.com/watch?v=UItWltVZZmE",
    thumbnail: "https://i3.ytimg.com/vi/UItWltVZZmE/hqdefault.jpg",
    duration: "30 min",
  },
  swim: {
    title: "Beginner Swim Session",
    url: "https://www.youtube.com/watch?v=4FUnXaq_VWk",
    thumbnail: "https://i3.ytimg.com/vi/4FUnXaq_VWk/hqdefault.jpg",
    duration: "20 min",
  },
  dance: {
    title: "15-Minute Gentle Dance",
    url: "https://www.youtube.com/watch?v=4FUnXaq_VWk",
    thumbnail: "https://i3.ytimg.com/vi/4FUnXaq_VWk/hqdefault.jpg",
    duration: "15 min",
  },
  general_move: {
    title: "15-Minute Movement at Home",
    url: "https://www.youtube.com/watch?v=4FUnXaq_VWk",
    thumbnail: "https://i3.ytimg.com/vi/4FUnXaq_VWk/hqdefault.jpg",
    duration: "15 min",
  },
};

// ---------------- Meal images ----------------

export const MEAL_BY_TAG: Record<string, MealImage> = {
  yogurt_berries: {
    url: "https://images.pexels.com/photos/1435706/pexels-photo-1435706.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Yogurt bowl with berries",
    tag: "protein-rich",
  },
  oatmeal_banana: {
    url: "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Oatmeal with banana and nuts",
    tag: "energy-dense",
  },
  salad_greens: {
    url: "https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Fresh vegetable salad",
    tag: "balanced",
  },
  salmon_greens: {
    url: "https://images.pexels.com/photos/842571/pexels-photo-842571.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Grilled salmon with greens",
    tag: "heart-healthy",
  },
  soup_light: {
    url: "https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Warm soup with bread",
    tag: "light",
  },
  eggs_toast: {
    url: "https://images.pexels.com/photos/824635/pexels-photo-824635.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Eggs on whole-grain toast",
    tag: "protein-rich",
  },
  smoothie: {
    url: "https://images.pexels.com/photos/616833/pexels-photo-616833.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Fruit smoothie",
    tag: "easy-to-digest",
  },
  fruit_nuts: {
    url: "https://images.pexels.com/photos/1093038/pexels-photo-1093038.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Fresh fruit and nuts",
    tag: "whole-food",
  },
  chicken_veg: {
    url: "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Grilled chicken with vegetables",
    tag: "lean protein",
  },
  tea_nuts: {
    url: "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Herbal tea with nuts",
    tag: "calming",
  },
  rice_bowl: {
    url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Grain bowl with vegetables",
    tag: "sustaining",
  },
  pasta: {
    url: "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Whole-grain pasta",
    tag: "carb-rich",
  },
  nuts: {
    url: "https://images.pexels.com/photos/1295572/pexels-photo-1295572.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Bowl of mixed nuts",
    tag: "healthy fats",
  },
  general_food: {
    url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Balanced meal",
    tag: "balanced",
  },
};

// ---------------- Lookups ----------------

export function getWorkoutForTag(tag: string): MediaItem {
  return WORKOUT_BY_TAG[tag] ?? WORKOUT_BY_TAG.general_move;
}

export function getMealForTag(tag: string): MealImage {
  return MEAL_BY_TAG[tag] ?? MEAL_BY_TAG.general_food;
}