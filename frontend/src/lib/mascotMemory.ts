import type {
  AIAnalyzeResponse,
  MoodResponse,
  TimelineResponse,
} from "../types";

interface Input {
  mood: MoodResponse | null;
  timeline: TimelineResponse | null;
  ai: AIAnalyzeResponse | null;
}

export function getMascotLine({ mood, timeline, ai }: Input): string {
  const now = new Date();
  const hour = now.getHours();

  const timeGreeting =
    hour < 6
      ? "Late night"
      : hour < 12
      ? "Morning"
      : hour < 17
      ? "Afternoon"
      : hour < 22
      ? "Evening"
      : "Late night";

  // 1. If there's an attack / suspicious reading → most important
  if (timeline && timeline.summary.suspicious + timeline.summary.flagged > 0) {
    const flagged = timeline.summary.suspicious + timeline.summary.flagged;
    return `I caught ${flagged} reading${flagged === 1 ? "" : "s"} I couldn't verify today — it's excluded from the analysis.`;
  }

  // 2. If Nemotron is limited, mention it
  if (ai && ai.analysis.confidence === "LIMITED") {
    return "Some readings today couldn't be verified, so I'm holding back from firm conclusions.";
  }

  // 3. If a mood was logged today → reference it
  if (mood && mood.today) {
    const todayLabel =
      mood.today >= 4 ? "Good" : mood.today >= 3 ? "Okay" : "Low";
    return `${timeGreeting}. You logged "${todayLabel}" today — I'm keeping an eye on things.`;
  }

  // 4. If mood was logged yesterday but not today
  if (mood && mood.entries.length > 0) {
    const last = mood.entries[mood.entries.length - 1];
    const lastDate = new Date(last.timestamp).toDateString();
    const today = new Date().toDateString();
    if (lastDate !== today) {
      const lastLabel =
        last.score >= 4 ? "Good" : last.score >= 3 ? "Okay" : "Low";
      return `${timeGreeting}. You logged "${lastLabel}" last time — how's today going?`;
    }
  }

  // 5. Count calm days if we have a streak
  const streakDays = countCalmStreak(timeline);
  if (streakDays >= 3) {
    return `${streakDays} calm days in a row. Feeling good about your week.`;
  }

  // 6. Otherwise — neutral greeting
  if (hour < 12) return `${timeGreeting}. How are you starting the day?`;
  if (hour < 22) return `${timeGreeting}. Everything looks steady.`;
  return `${timeGreeting}. Everything looks steady.`;
}

function countCalmStreak(timeline: TimelineResponse | null): number {
  if (!timeline) return 0;
  const days = new Set<string>();
  timeline.timeline.forEach((r) => {
    if (r.verdict === "TRUSTED") days.add(r.timestamp.slice(0, 10));
  });
  // simplified: number of unique days with only trusted readings
  return days.size;
}