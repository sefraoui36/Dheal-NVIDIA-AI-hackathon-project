import { useEffect, useState } from "react";
import { api } from "../api";
import type {
  AIAnalyzeResponse,
  MoodResponse,
  TimelineResponse,
} from "../types";
import { Mascot, type MascotMood } from "./Mascot";

interface Props {
  userId: string;
  timeline: TimelineResponse;
  ai: AIAnalyzeResponse;
}

export function DailyPulse({ userId, timeline, ai }: Props) {
  const [mood, setMood] = useState<MoodResponse | null>(null);

  useEffect(() => {
    api.getMood(userId, 7).then(setMood).catch(() => {});
  }, [userId]);

  const flagged = timeline.summary.suspicious + timeline.summary.flagged;
  const trusted = timeline.summary.trusted;
  const total = timeline.summary.total_records;
  const confidence = ai.analysis.confidence;
  const score = ai.trust_score.score;
  const tier = ai.trust_score.tier;

  // mood
  let mascotMood: MascotMood = "calm";
  if (flagged > 0 || confidence === "LIMITED") mascotMood = "concerned";
  else if (mood?.today && mood.today >= 4) mascotMood = "happy";

  // time of day
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 6
      ? "Late night"
      : hour < 12
      ? "Good morning"
      : hour < 17
      ? "Good afternoon"
      : hour < 22
      ? "Good evening"
      : "Late night";

  // decide status + action
  let status = "";
  let action = "";
  let actionTargetId = "";

  if (flagged > 0) {
    status = `${flagged} reading${
      flagged === 1 ? "" : "s"
    } couldn't be verified and ${flagged === 1 ? "is" : "are"} excluded from the AI.`;
    action = "See what I caught";
    actionTargetId = "security-guardian";
  } else if (confidence === "LIMITED") {
    status =
      "Some readings today couldn't be verified, so I'm holding back from firm conclusions.";
    action = "Open the AI report";
    actionTargetId = "ai-investigation";
  } else if (mood?.today) {
    const label =
      mood.today >= 4 ? "Good" : mood.today >= 3 ? "Okay" : "Low";
    status = `You logged "${label}" today. Everything else looks steady.`;
    action = "See your 7-day mood";
    actionTargetId = "mood-checkin";
  } else {
    status = `All ${total} readings were verified. Nothing unusual.`;
    action = "Log how you feel";
    actionTargetId = "mood-checkin";
  }

  const handleAction = () => {
    const el = document.getElementById(actionTargetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="relative w-full bg-gradient-to-br from-surface-container-lowest to-surface-container-low/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row items-start md:items-center gap-6 overflow-hidden">
      {/* soft aura */}
      <div
        className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none ${
          mascotMood === "concerned"
            ? "bg-error-container/40"
            : mascotMood === "happy"
            ? "bg-secondary-fixed/40"
            : "bg-primary-fixed/30"
        }`}
      />

      {/* mascot */}
      <div className="relative shrink-0">
        <Mascot mood={mascotMood} size={88} />
      </div>

      {/* content */}
      <div className="flex flex-col gap-3 flex-1 relative">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold tracking-widest uppercase text-outline">
            {timeGreeting}
          </span>
          <p className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
            {status}
          </p>
        </div>

        {/* action button */}
        <button
          onClick={handleAction}
          className="self-start flex items-center gap-2 bg-primary-container hover:bg-primary text-on-primary font-label-lg px-4 py-2.5 rounded-2xl shadow-md shadow-primary-container/30 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_downward
          </span>
          <span>{action}</span>
        </button>

        {/* footer stats */}
        <div className="flex items-center gap-3 text-[11px] text-outline flex-wrap">
          <span className="flex items-center gap-1">
            <span className="font-mono font-bold text-on-surface">
              {score}/100
            </span>
            <span>{tier}</span>
          </span>
          <span className="text-outline/50">·</span>
          <span>
            {trusted}/{total} verified
          </span>
          {flagged > 0 && (
            <>
              <span className="text-outline/50">·</span>
              <span className="text-error font-semibold">
                {flagged} flagged
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}