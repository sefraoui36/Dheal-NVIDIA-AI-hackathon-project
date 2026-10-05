import type { TrustScore } from "../types";
import { InfoTip } from "./InfoTip";

interface Props {
  trustScore: TrustScore;
  size?: "sm" | "md" | "lg";
}

const TIER_STYLES = {
  EXCELLENT: {
    bg: "bg-secondary-fixed/40",
    text: "text-on-secondary",
    ring: "ring-secondary/30",
    label: "Excellent",
    icon: "verified",
  },
  GOOD: {
    bg: "bg-secondary-fixed/25",
    text: "text-secondary",
    ring: "ring-secondary/20",
    label: "Good",
    icon: "check_circle",
  },
  DEGRADED: {
    bg: "bg-tertiary-fixed/50",
    text: "text-on-tertiary-container",
    ring: "ring-tertiary-container/30",
    label: "Degraded",
    icon: "warning",
  },
  UNTRUSTWORTHY: {
    bg: "bg-error-container",
    text: "text-on-error-container",
    ring: "ring-error/30",
    label: "Untrustworthy",
    icon: "gpp_bad",
  },
} as const;

export function TrustScoreBadge({ trustScore, size = "md" }: Props) {
  const style = TIER_STYLES[trustScore.tier];

  const sizes = {
    sm: { number: "text-2xl", label: "text-[10px]", pad: "px-3 py-1.5", icon: 14 },
    md: { number: "text-3xl", label: "text-[11px]", pad: "px-4 py-2", icon: 16 },
    lg: { number: "text-5xl", label: "text-label-sm", pad: "px-6 py-4", icon: 20 },
  }[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-3 rounded-2xl ring-1 ${style.bg} ${style.text} ${style.ring} ${sizes.pad} transition-all`}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: sizes.icon }}
        >
          {style.icon}
        </span>
        <div className="flex flex-col leading-tight">
          <div className="flex items-baseline gap-1">
            <span
              className={`font-display font-bold tabular-nums ${sizes.number}`}
            >
              {trustScore.score}
            </span>
            <span className="text-[11px] opacity-70">/100</span>
          </div>
          <span
            className={`font-semibold tracking-wide uppercase ${sizes.label}`}
          >
            {style.label}
          </span>
        </div>
      </div>

      <InfoTip title="Trust Score" side="bottom">
        <p className="mb-2">
          A <strong>0–100 score</strong> combining three things:
        </p>
        <ul className="list-disc list-inside space-y-0.5 mb-2">
          <li><b>40 pts</b> — hash-chain integrity</li>
          <li><b>40 pts</b> — share of trusted records</li>
          <li><b>20 pts</b> — Nemotron's own confidence</li>
        </ul>
        <p className="text-[11px] text-outline">
          <b>90+</b> Excellent · <b>70–89</b> Good · <b>40–69</b> Degraded ·{" "}
          <b>&lt;40</b> Untrustworthy
        </p>
      </InfoTip>
    </div>
  );
}