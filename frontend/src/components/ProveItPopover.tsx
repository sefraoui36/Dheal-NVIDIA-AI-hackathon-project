import { useEffect, useRef } from "react";
import type { TimelineRow } from "../types";

interface Props {
  row: TimelineRow | null;
  prevRow: TimelineRow | null;
  nextRow: TimelineRow | null;
  integrityValid: boolean;
  onClose: () => void;
}

export function ProveItPopover({
  row,
  prevRow,
  nextRow,
  integrityValid,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!row) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [row, onClose]);

  if (!row) return null;

  const m = row.metrics;
  const anomaly = row.anomalies[0];

  const verdictStyle = {
    TRUSTED: {
      bg: "bg-secondary-fixed/40",
      text: "text-on-secondary-fixed-variant",
      icon: "verified",
      label: "TRUSTED",
    },
    SUSPICIOUS: {
      bg: "bg-tertiary-fixed/50",
      text: "text-on-tertiary-container",
      icon: "warning",
      label: "SUSPICIOUS",
    },
    FLAGGED: {
      bg: "bg-error-container",
      text: "text-on-error-container",
      icon: "block",
      label: "FLAGGED",
    },
  }[row.verdict];

  return (
    <div
      ref={ref}
      className="fixed z-[9999] bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-2xl w-[340px] p-4 flex flex-col gap-3"
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
            EVIDENCE RECEIPT
          </span>
          <span className="font-mono text-[13px] text-on-surface font-semibold">
            {row.timestamp}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      {/* the reading */}
      <div className="bg-surface-container-low/60 rounded-2xl p-3 flex flex-col gap-1">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          THIS READING
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold text-on-surface tabular-nums">
            {m.heart_rate}
          </span>
          <span className="text-label-sm text-on-surface-variant">BPM</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant mt-1">
          <span>sleep {m.sleep_hours}h</span>
          <span>·</span>
          <span>steps {m.steps}</span>
          <span>·</span>
          <span>stress {m.stress_level}</span>
        </div>
      </div>

      {/* neighbors */}
      <div className="flex items-center gap-2">
        <NeighborChip label="Prev" row={prevRow} />
        <span className="material-symbols-outlined text-[16px] text-outline">
          arrow_forward
        </span>
        <div className="flex-1 bg-primary-fixed/40 rounded-xl px-3 py-2 flex flex-col items-center">
          <span className="text-[10px] font-bold text-on-primary-fixed-variant">
            THIS
          </span>
          <span className="font-mono text-[12px] text-on-surface font-semibold">
            {m.heart_rate}
          </span>
        </div>
        <span className="material-symbols-outlined text-[16px] text-outline">
          arrow_forward
        </span>
        <NeighborChip label="Next" row={nextRow} />
      </div>

      {/* verification checks */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          CHECKS RUN
        </span>

        <Check
          ok={integrityValid}
          label="SHA-256 hash chain"
          detail={integrityValid ? "Intact across all records" : "Broken — tampering detected"}
        />

        <Check
          ok={!anomaly}
          label="Personal baseline"
          detail={
            anomaly
              ? `${anomaly.z.toFixed(1)}σ from your mean (${anomaly.mean.toFixed(1)} ± ${anomaly.std.toFixed(2)})`
              : "Within your normal range"
          }
        />

        <Check
          ok={row.violations.length === 0}
          label="Physiological limits"
          detail={
            row.violations.length === 0
              ? "Value is physically possible"
              : `${row.violations.length} violation(s) detected`
          }
        />
      </div>

      {/* verdict */}
      <div className={`${verdictStyle.bg} rounded-2xl p-3 flex items-center gap-3`}>
        <span className={`material-symbols-outlined text-[22px] ${verdictStyle.text}`}>
          {verdictStyle.icon}
        </span>
        <div className="flex flex-col">
          <span className={`text-[11px] font-bold tracking-widest uppercase ${verdictStyle.text}`}>
            {verdictStyle.label}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {row.verdict === "TRUSTED"
              ? "Used as evidence by the AI."
              : row.verdict === "SUSPICIOUS"
              ? "Excluded from AI conclusions."
              : "Never used — impossible value."}
          </span>
        </div>
      </div>

      {row.reasons.length > 0 && (
        <div className="text-[11px] text-outline italic leading-relaxed">
          {row.reasons.join(" · ")}
        </div>
      )}
    </div>
  );
}

function NeighborChip({
  label,
  row,
}: {
  label: string;
  row: TimelineRow | null;
}) {
  if (!row) {
    return (
      <div className="bg-surface-container-low/40 rounded-xl px-3 py-2 text-center min-w-[60px]">
        <span className="text-[10px] font-bold text-outline block">{label}</span>
        <span className="font-mono text-[11px] text-outline">—</span>
      </div>
    );
  }
  return (
    <div className="bg-surface-container-low/40 rounded-xl px-3 py-2 text-center min-w-[60px]">
      <span className="text-[10px] font-bold text-outline block">{label}</span>
      <span className="font-mono text-[12px] text-on-surface-variant">
        {row.metrics.heart_rate}
      </span>
    </div>
  );
}

function Check({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
          ok ? "text-secondary" : "text-error"
        }`}
      >
        {ok ? "check_circle" : "cancel"}
      </span>
      <div className="flex flex-col">
        <span className="font-label-lg text-label-lg text-on-surface font-medium leading-tight">
          {label}
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {detail}
        </span>
      </div>
    </div>
  );
}