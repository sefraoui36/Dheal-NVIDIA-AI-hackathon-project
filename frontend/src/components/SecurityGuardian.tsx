import type { Integrity, TimelineRow } from "../types";
import { InfoTip } from "./InfoTip";

interface Props {
  integrity: Integrity;
  timeline: TimelineRow[];
}

export function SecurityGuardian({ integrity, timeline }: Props) {
  const suspicious = timeline.filter((r) => r.verdict === "SUSPICIOUS").length;
  const flagged = timeline.filter((r) => r.verdict === "FLAGGED").length;
  const worstReason =
    timeline.find((r) => r.reasons.length > 0)?.reasons[0] ??
    "No anomalies detected.";

  // ---- continuity: count gaps in the timestamp sequence ----
  const gapCount = countGaps(timeline);
  const continuityLabel = gapCount === 0 ? "No gaps detected" : `${gapCount} gap${gapCount === 1 ? "" : "s"}`;
  const continuityTone = gapCount === 0 ? "mint" : "amber";

  return (
   <div
  id="security-guardian"
  className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 md:p-7 shadow-md flex flex-col justify-between gap-5"
            >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">
              verified_user
            </span>
            <h3 className="font-title-md text-title-md text-on-surface font-semibold">
              Security Guardian
            </h3>
            <InfoTip title="Security Guardian" side="bottom">
              Three independent checks run on every measurement before the AI is
              allowed to see it. Any one failing is enough to flag a record.
            </InfoTip>
          </div>
          <span className="text-label-sm text-secondary bg-secondary-fixed/30 font-semibold px-2.5 py-1 rounded-full">
            Automated Sentinel
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Multi-vector integrity checks performed before AI ingest.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <GuardCard
            icon="link"
            title="Cryptographic Hash Chain"
            badge={integrity.valid ? "VALID" : "BROKEN"}
            tone={integrity.valid ? "mint" : "red"}
            description={
              integrity.valid
                ? `SHA-256 chain intact across ${integrity.total} records.`
                : `Chain broken at index ${integrity.broken_at_index}.`
            }
            tip={{
              title: "What is a hash chain?",
              body: "Every record gets a digital fingerprint that also includes the previous record's fingerprint. If anyone changes one value, every fingerprint after it breaks — that's how we detect tampering.",
            }}
          />

          <GuardCard
            icon={suspicious + flagged > 0 ? "warning" : "verified"}
            title="Biometric Anomaly Detector"
            badge={`${suspicious + flagged} ${
              suspicious + flagged === 1 ? "ANOMALY" : "ANOMALIES"
            }`}
            tone={suspicious + flagged > 0 ? "red" : "mint"}
            description={worstReason}
            tip={{
              title: "SUSPICIOUS vs FLAGGED",
              body: (
                <>
                  <p>
                    <b>SUSPICIOUS</b> — physically possible but statistically
                    extreme. Could be a real event or an error.
                  </p>
                  <p className="mt-1">
                    <b>FLAGGED</b> — physiologically impossible. Never used as
                    evidence.
                  </p>
                </>
              ),
            }}
          />

          <GuardCard
            icon="swap_calls"
            title="Time Series Continuity"
            badge={continuityLabel}
            tone={continuityTone as "mint" | "amber" | "red" | "neutral"}
            description={
              gapCount === 0
                ? "Every hourly interval present. No missing records."
                : `${gapCount} gap${gapCount === 1 ? "" : "s"} in the window — this may reduce confidence.`
            }
            tip={{
              title: "Why does cadence matter?",
              body: "Irregular gaps between readings can hide problems. Consistent intervals mean the data stream is intact.",
            }}
          />
        </div>
      </div>

      <div className="bg-surface-container-low/80 p-3 rounded-2xl flex items-center gap-3">
        <img
          src="/assets/dheal-mascot.png"
          alt="Guardian Mascot"
          className="w-9 h-9 rounded-xl object-cover shrink-0"
        />
        <div className="font-body-sm text-body-sm text-on-surface">
          {suspicious + flagged > 0
            ? "Guardian caught this synthesized packet before it reached clinical decision algorithms!"
            : "Telemetry stream is pristine! Clinical AI can safely evaluate all markers."}
        </div>
      </div>
    </div>
  );
}

function countGaps(timeline: TimelineRow[]): number {
  if (timeline.length < 2) return 0;
  let gaps = 0;
  for (let i = 1; i < timeline.length; i++) {
    const prev = new Date(timeline[i - 1].timestamp).getTime();
    const curr = new Date(timeline[i].timestamp).getTime();
    const deltaMin = (curr - prev) / 60000;
    if (deltaMin > 90) gaps++;  // more than 1.5h between rows counts as a gap
  }
  return gaps;
}

function GuardCard({
  icon,
  title,
  badge,
  tone,
  description,
  tip,
}: {
  icon: string;
  title: string;
  badge: string;
  tone: "mint" | "red" | "neutral" | "amber";
  description: string;
  tip?: { title?: string; body: React.ReactNode };
}) {
  const tones = {
    mint: {
      bg: "bg-surface-container-low/60",
      iconBg: "bg-secondary-fixed/40",
      iconColor: "text-secondary",
      badgeBg: "bg-secondary-fixed/40 text-secondary",
    },
    amber: {
      bg: "bg-tertiary-fixed/20",
      iconBg: "bg-tertiary-fixed/50",
      iconColor: "text-tertiary",
      badgeBg: "bg-tertiary-fixed/50 text-on-tertiary-container",
    },
    red: {
      bg: "bg-error-container/30",
      iconBg: "bg-error-container",
      iconColor: "text-error",
      badgeBg: "bg-error-container text-on-error-container",
    },
    neutral: {
      bg: "bg-surface-container-low/60",
      iconBg: "bg-surface-container-high",
      iconColor: "text-outline",
      badgeBg: "bg-surface-container-high text-outline",
    },
  }[tone];

  return (
    <div className={`${tones.bg} p-4 rounded-2xl flex items-start gap-3.5`}>
      <div
        className={`w-9 h-9 rounded-full ${tones.iconBg} flex items-center justify-center shrink-0`}
      >
        <span
          className={`material-symbols-outlined text-[20px] ${tones.iconColor}`}
        >
          {icon}
        </span>
      </div>
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-title-sm text-title-sm text-on-surface font-semibold">
            {title}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tones.badgeBg}`}
          >
            {badge}
          </span>
          {tip && (
            <InfoTip title={tip.title} side="top">
              {tip.body}
            </InfoTip>
          )}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}