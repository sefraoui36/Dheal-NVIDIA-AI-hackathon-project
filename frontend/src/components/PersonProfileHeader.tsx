import type { Profile, TrustScore } from "../types";
import { Mascot } from "./Mascot";

interface Props {
  profile: Profile;
  trustScore: TrustScore;
  summary: {
    suspicious: number;
    flagged: number;
    trusted: number;
    total_records: number;
  };
}

const ACCENT_CLASSES: Record<string, { bg: string; text: string; ring: string; chip: string }> = {
  coral: {
    bg: "bg-primary-fixed/40",
    text: "text-on-primary-fixed-variant",
    ring: "ring-primary/25",
    chip: "bg-primary-fixed/50 text-on-primary-fixed-variant",
  },
  mint: {
    bg: "bg-secondary-fixed/40",
    text: "text-on-secondary-fixed-variant",
    ring: "ring-secondary/25",
    chip: "bg-secondary-fixed/50 text-on-secondary-fixed-variant",
  },
  amber: {
    bg: "bg-tertiary-fixed/40",
    text: "text-on-tertiary-container",
    ring: "ring-tertiary/25",
    chip: "bg-tertiary-fixed/50 text-on-tertiary-container",
  },
  slate: {
    bg: "bg-surface-container-high",
    text: "text-on-surface",
    ring: "ring-outline/25",
    chip: "bg-surface-container-high text-on-surface-variant",
  },
  pink: {
    bg: "bg-error-container/40",
    text: "text-on-error-container",
    ring: "ring-error/20",
    chip: "bg-error-container/60 text-on-error-container",
  },
};

export function PersonProfileHeader({ profile, trustScore, summary }: Props) {
  const accent = ACCENT_CLASSES[profile.accent] ?? ACCENT_CLASSES.slate;

  const flagged = summary.suspicious + summary.flagged;
  const trustPct = Math.round((summary.trusted / summary.total_records) * 100);

  const mood =
    flagged > 0 ? "concerned" : trustScore.score >= 90 ? "happy" : "calm";

  const statusText =
    flagged > 0
      ? `${flagged} reading${flagged === 1 ? "" : "s"} couldn't be verified`
      : "All readings verified";

  return (
    <div
      className={`${accent.bg} rounded-3xl p-6 shadow-md ring-1 ${accent.ring} flex items-center gap-5`}
    >
      {/* avatar */}
      <div className="w-20 h-20 rounded-2xl bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
        <span className={`material-symbols-outlined text-[40px] ${accent.text}`}>
          {profile.avatar_icon}
        </span>
      </div>

      {/* info */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="font-display text-2xl font-bold text-on-surface leading-tight">
            {profile.name}
          </h2>
          <span className="text-label-sm text-on-surface-variant">
            {profile.relation} · {profile.age} years
          </span>
        </div>

        {/* condition chips */}
        <div className="flex flex-wrap gap-1.5">
          {profile.condition_details?.map((c) => (
            <span
              key={c.label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${accent.chip}`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {c.icon}
              </span>
              {c.label}
            </span>
          ))}

          {/* pregnancy-specific chip */}
          {profile.pregnancy && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container-lowest text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">
                calendar_today
              </span>
              Week {profile.pregnancy.week} · Due {profile.pregnancy.due_date}
            </span>
          )}
        </div>

        {/* status */}
        <div className="flex items-center gap-2 text-[12px] mt-1">
          <span
            className={`w-2 h-2 rounded-full ${
              flagged > 0 ? "bg-tertiary animate-pulse" : "bg-secondary"
            }`}
          />
          <span className="text-on-surface-variant">
            <b className="text-on-surface">{statusText}</b> · {trustPct}% of
            today's data verified
          </span>
        </div>
      </div>

      {/* mood mascot */}
      <Mascot mood={mood} size={44} className="shrink-0 hidden md:block" />
    </div>
  );
}