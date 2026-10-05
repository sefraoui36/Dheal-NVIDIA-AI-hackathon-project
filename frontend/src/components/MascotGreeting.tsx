import { useEffect, useState } from "react";
import { api } from "../api";
import type {
  AIAnalyzeResponse,
  MoodResponse,
  TimelineResponse,
} from "../types";
import { getMascotLine } from "../lib/mascotMemory";
import { Mascot } from "./Mascot";

interface Props {
  userId: string;
  timeline: TimelineResponse;
  ai: AIAnalyzeResponse;
  compact?: boolean;
}

export function MascotGreeting({ userId, timeline, ai, compact }: Props) {
  const [mood, setMood] = useState<MoodResponse | null>(null);

  useEffect(() => {
    api
      .getMood(userId, 7)
      .then(setMood)
      .catch(() => {});
  }, [userId]);

  const line = getMascotLine({ mood, timeline, ai });

  const moodState =
    timeline.summary.suspicious + timeline.summary.flagged > 0
      ? "concerned"
      : ai.analysis.confidence === "LIMITED"
      ? "concerned"
      : mood?.today && mood.today >= 4
      ? "happy"
      : "calm";

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-surface-container-low/50 rounded-2xl px-4 py-2.5">
        <Mascot mood={moodState} size={28} />
        <span className="font-body-sm text-body-sm text-on-surface-variant italic">
          {line}
        </span>
      </div>
    );
  }

  return (
    <div className="relative bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-5 md:p-6 shadow-md flex items-center gap-4 overflow-hidden">
      {/* soft gradient aura */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-primary-fixed/30 to-secondary-fixed/20 blur-3xl pointer-events-none" />

      <Mascot mood={moodState} size={52} />

      <div className="flex flex-col gap-0.5 flex-1">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          Guardian says
        </span>
        <p className="font-body-md text-body-md text-on-surface leading-snug">
          {line}
        </p>
      </div>
    </div>
  );
}