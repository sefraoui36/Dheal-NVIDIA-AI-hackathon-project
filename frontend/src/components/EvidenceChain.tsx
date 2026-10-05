import type { TimelineRow } from "../types";

interface Props {
  timeline: TimelineRow[];
}

export function EvidenceChain({ timeline }: Props) {
  // show only recent events with verdicts or a few trusted around the anomaly
  const interesting = timeline
    .filter((r) => r.verdict !== "TRUSTED" || r.timestamp.endsWith(":00:00"))
    .slice(-10)
    .reverse();

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[22px]">
            timeline
          </span>
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Evidence Chain
          </h3>
        </div>
        <span className="font-mono text-[11px] text-outline">
          {timeline.length > 0
            ? `HASH ${timeline[0].timestamp.replace(/[^0-9]/g, "").slice(0, 6)}`
            : "—"}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
        {interesting.map((row) => (
          <div
            key={row.timestamp}
            className={`flex items-center justify-between p-2.5 rounded-2xl transition-colors ${
              row.verdict === "TRUSTED"
                ? "bg-surface-container-low/60 hover:bg-surface-container-high/40"
                : row.verdict === "SUSPICIOUS"
                ? "bg-tertiary-fixed/30"
                : "bg-error-container/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[12px] text-outline">
                {row.timestamp.slice(11, 19)}
              </span>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg text-on-surface font-medium">
                  HR {row.metrics.heart_rate} BPM
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  steps {row.metrics.steps} · stress {row.metrics.stress_level}
                </span>
              </div>
            </div>
            <TrustBadge verdict={row.verdict} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustBadge({ verdict }: { verdict: TimelineRow["verdict"] }) {
  const styles = {
    TRUSTED: "bg-secondary-fixed/30 text-secondary",
    SUSPICIOUS: "bg-tertiary-fixed/50 text-on-tertiary-container",
    FLAGGED: "bg-error-container text-on-error-container animate-pulse",
  }[verdict];

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${styles}`}
    >
      {verdict}
    </span>
  );
}