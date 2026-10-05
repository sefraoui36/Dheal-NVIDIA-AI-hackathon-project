import type { TrustScore, TimelineRow } from "../types";

interface Props {
  trustScore: TrustScore;
  timeline: TimelineRow[];
  summary: {
    trusted: number;
    suspicious: number;
    flagged: number;
    total_records: number;
  };
  onAsk?: () => void;
}

type Level = "green" | "yellow" | "red";

export function ShouldICall({ trustScore, summary }: Props) {
  const flagged = summary.suspicious + summary.flagged;
  const trustPct = Math.round((summary.trusted / summary.total_records) * 100);

  let level: Level = "green";
  if (flagged > 0 || trustScore.score < 70) level = "yellow";
  if (flagged >= 2 || trustScore.score < 40) level = "red";

  const tones = {
    green: {
      bg: "bg-secondary-fixed/30",
      icon: "check_circle",
      iconColor: "text-secondary",
      label: "All good",
      headline: "No need to worry today.",
      body: "Everything looks normal. A friendly call is always welcome.",
      ring: "ring-secondary/30",
    },
    yellow: {
      bg: "bg-tertiary-fixed/40",
      icon: "info",
      iconColor: "text-tertiary",
      label: "Worth a check-in",
      headline: "A friendly call today would be nice.",
      body: "Something looked slightly unusual. Try: “How did you sleep?” — no alarms needed.",
      ring: "ring-tertiary-container/30",
    },
    red: {
      bg: "bg-error-container/40",
      icon: "call",
      iconColor: "text-error",
      label: "Call now",
      headline: "Something needs your attention.",
      body: "Guardian flagged a reading it can't verify. Reach out and ask how they're feeling.",
      ring: "ring-error/30",
    },
  }[level];

  return (
    <div
      className={`${tones.bg} rounded-3xl p-6 md:p-8 shadow-md ring-1 ${tones.ring} flex flex-col gap-5`}
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
          <span className={`material-symbols-outlined text-[32px] ${tones.iconColor}`}>
            {tones.icon}
          </span>
        </div>
        <div className="flex flex-col">
          <span className={`text-[11px] font-bold tracking-widest uppercase ${tones.iconColor}`}>
            {tones.label}
          </span>
          <span className="font-display text-2xl md:text-3xl font-bold text-on-surface leading-tight">
            {tones.headline}
          </span>
        </div>
      </div>

      <p className="font-body-md text-body-md text-on-surface-variant">
        {tones.body}
      </p>

      <div className="bg-surface-container-lowest/70 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-semibold text-on-surface">
            How much of the data could be verified?
          </span>
          <span className="font-mono font-bold text-on-surface">{trustPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className={`h-full ${
              trustPct >= 95 ? "bg-secondary" : trustPct >= 80 ? "bg-tertiary" : "bg-error"
            }`}
            style={{ width: `${trustPct}%` }}
          />
        </div>
        <div className="text-[11px] text-outline">
          {flagged === 0
            ? "Every reading was consistent with the usual pattern."
            : `${flagged} reading${flagged === 1 ? "" : "s"} could not be fully verified — Guardian excluded them from any conclusions.`}
        </div>
      </div>
    </div>
  );
}