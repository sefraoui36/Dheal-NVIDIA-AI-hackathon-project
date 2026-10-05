import { Mascot, type MascotMood } from "./Mascot";
import { TrustScoreBadge } from "./TrustScoreBadge";
import type { TrustScore } from "../types";

interface Props {
  attacked: boolean;
  mood: MascotMood;
  trustScore: TrustScore;
  summary: {
    trusted: number;
    suspicious: number;
    flagged: number;
    total_records: number;
  };
}

export function StatusBanner({ attacked, mood, trustScore, summary }: Props) {
  const isConcerned = mood === "concerned";
  const isAlert = mood === "alert";

  return (
    <div className="w-full bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl p-5 md:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Mascot
            mood={mood}
            size={56}
            className="p-1 bg-surface-container-low shadow-sm"
          />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            {(isAlert || isConcerned) && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConcerned ? "bg-error" : "bg-primary-container"
                }`}
              />
            )}
            <span
              className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                isConcerned
                  ? "bg-error"
                  : isAlert
                  ? "bg-primary"
                  : "bg-secondary"
              }`}
            />
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
              Clinical Bio-Trust Guard
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-semibold transition-all ${
                isConcerned
                  ? "bg-error-container text-on-error-container"
                  : isAlert
                  ? "bg-tertiary-fixed/40 text-on-tertiary-container"
                  : "bg-secondary-fixed/40 text-on-secondary-fixed-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {isConcerned ? "gpp_maybe" : isAlert ? "warning" : "verified"}
              </span>
              <span>
                {isConcerned
                  ? "Guardian confidence dropped: unreliable evidence detected"
                  : isAlert
                  ? `${summary.suspicious + summary.flagged} Suspicious Record${
                      summary.suspicious + summary.flagged === 1 ? "" : "s"
                    } Detected`
                  : `All ${summary.total_records} Data Frames Verified`}
              </span>
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {isConcerned
              ? "Nemotron refuses to reason from the flagged evidence. Investigate before acting."
              : isAlert
              ? "Guardian caught a suspicious packet and quarantined it before AI ingest."
              : "Guardian is actively protecting the biometric telemetry stream."}
          </p>
        </div>
      </div>

      <TrustScoreBadge trustScore={trustScore} size="md" />
    </div>
  );
}