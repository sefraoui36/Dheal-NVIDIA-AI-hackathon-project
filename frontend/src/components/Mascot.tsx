import type { TimelineRow } from "../types";

export type MascotMood = "calm" | "alert" | "concerned" | "happy";

interface Props {
  mood: MascotMood;
  size?: number;
  className?: string;
}

const moodClass: Record<MascotMood, string> = {
  calm: "mascot-calm",
  alert: "mascot-alert",
  concerned: "mascot-concerned",
  happy: "mascot-happy",
};

export function Mascot({ mood, size = 48, className = "" }: Props) {
  return (
    <img
      src="/assets/dheal-mascot.png"
      alt={`DHeal Guardian mascot (${mood})`}
      className={`rounded-2xl object-cover ${moodClass[mood]} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function deriveMood(
  timeline: TimelineRow[],
  confidence: "HIGH" | "MODERATE" | "LIMITED",
  attacked: boolean
): MascotMood {
  const hasSuspicious = timeline.some((r) => r.verdict === "SUSPICIOUS");
  const hasFlagged = timeline.some((r) => r.verdict === "FLAGGED");

  if (hasFlagged) return "concerned";
  if (confidence === "LIMITED") return "concerned";
  if (hasSuspicious || attacked) return "alert";
  return "happy";
}