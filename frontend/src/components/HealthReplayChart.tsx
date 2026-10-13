import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimelineRow } from "../types";
import { InfoTip } from "./InfoTip";
import { ProveItPopover } from "./ProveItPopover";

interface Props {
  timeline: TimelineRow[];
  integrityValid?: boolean;
}

export function HealthReplayChart({ timeline, integrityValid = true }: Props) {
  const [trustLens, setTrustLens] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = timeline.map((row, i) => ({
    index: i,
    time: row.timestamp.slice(11, 16),
    hr: row.metrics.heart_rate,
    trustedHr: row.verdict === "TRUSTED" ? row.metrics.heart_rate : null,
    verdict: row.verdict,
    reasons: row.reasons,
  }));

  const suspicious = timeline
    .map((r, i) => ({ i, row: r }))
    .filter((x) => x.row.verdict !== "TRUSTED");

  const selectedRow =
    selectedIndex !== null ? timeline[selectedIndex] : null;
  const prevRow =
    selectedIndex !== null && selectedIndex > 0
      ? timeline[selectedIndex - 1]
      : null;
  const nextRow =
    selectedIndex !== null && selectedIndex < timeline.length - 1
      ? timeline[selectedIndex + 1]
      : null;

  const handleChartMouseMove = (state: {
    activeTooltipIndex?: number | string | null;
  }) => {
    const idx =
      typeof state.activeTooltipIndex === "number"
        ? state.activeTooltipIndex
        : typeof state.activeTooltipIndex === "string"
        ? parseInt(state.activeTooltipIndex, 10)
        : null;
    if (idx !== null && !isNaN(idx)) {
      setHoveredIndex(idx);
    }
  };

  const handleChartClick = () => {
    if (hoveredIndex !== null) {
      setSelectedIndex(hoveredIndex);
    }
  };

  return (
    <div className="w-full bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-md flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">
              vital_signs
            </span>
            <h2 className="font-title-lg text-title-lg text-on-surface font-semibold tracking-tight">
              Health Replay Timeline
            </h2>
            <InfoTip title="Trust Lens + Prove it" side="bottom">
              <p>
                <b>Trust Lens</b> dims unverified readings so you can see what
                the AI actually uses.
              </p>
              <p className="mt-1">
                <b>Click anywhere on the chart</b> to open an evidence receipt
                for the nearest reading.
              </p>
            </InfoTip>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            72-Hour Wearable Heart Rate Stream (BPM) &amp; Cryptographic
            Verification
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <LegendDot
              color="bg-secondary"
              label={`Trusted (${count(timeline, "TRUSTED")})`}
            />
            <LegendDot
              color="bg-tertiary-container"
              label={`Suspicious (${count(timeline, "SUSPICIOUS")})`}
            />
            <LegendDot
              color="bg-error"
              label={`Flagged (${count(timeline, "FLAGGED")})`}
              pulse
            />
          </div>

          <div className="flex items-center gap-2 bg-surface-container-low/60 p-1 rounded-full">
            <span className="text-[11px] font-semibold text-on-surface-variant pl-2">
              Trust Lens
            </span>
            <button
              onClick={() => setTrustLens((v) => !v)}
              aria-label="Toggle Trust Lens"
              className={`relative w-11 h-6 rounded-full transition-all ${
                trustLens ? "bg-secondary" : "bg-outline-variant/50"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transition-all ${
                  trustLens ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full h-64 md:h-80 bg-surface-container-low/40 rounded-2xl p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 16, right: 24, left: 0, bottom: 0 }}
            onMouseMove={handleChartMouseMove}
            onClick={handleChartClick}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="#E0BFBD"
              strokeOpacity={0.2}
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#8c706f" }}
              interval={Math.max(1, Math.floor(data.length / 8))}
              axisLine={{ stroke: "#e0bfbd" }}
              tickLine={false}
            />
            <YAxis
              domain={[40, 220]}
              tick={{ fontSize: 11, fill: "#8c706f" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e0bfbd",
                fontSize: 12,
              }}
              formatter={(value) =>
                [
                  `${typeof value === "number" ? value : 0} BPM`,
                  "Heart rate",
                ] as [string, string]
              }
            />
            <Legend wrapperStyle={{ display: "none" }} />

            {trustLens && (
              <Line
                type="monotone"
                dataKey="trustedHr"
                stroke="#006a65"
                strokeWidth={2}
                strokeDasharray="4 4"
                strokeOpacity={0.35}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}

            <Line
              type="monotone"
              dataKey="hr"
              stroke="#006a65"
              strokeWidth={2.5}
              strokeOpacity={trustLens ? 0.2 : 1}
              dot={false}
              activeDot={{ r: 6 }}
            />

            {/* invisible halos — larger click targets */}
            {data.map((d) => (
              <ReferenceDot
                key={`hit-${d.index}`}
                x={d.time}
                y={d.hr}
                r={10}
                fill="transparent"
                stroke="transparent"
                style={{ cursor: "pointer" }}
              />
            ))}

            {/* visible mint dots */}
            {data.map((d) => (
              <ReferenceDot
                key={`dot-${d.index}`}
                x={d.time}
                y={d.hr}
                r={3}
                fill="#006a65"
                fillOpacity={trustLens ? 0.2 : 1}
                stroke="#006a65"
                strokeOpacity={trustLens ? 0.2 : 1}
              />
            ))}

            {/* highlight suspicious / flagged */}
            {suspicious.map(({ i, row }) => {
              const isFlagged = row.verdict === "FLAGGED";
              const color = isFlagged ? "#ba1a1a" : "#d28d22";
              return (
                <ReferenceDot
                  key={`susp-${i}`}
                  x={row.timestamp.slice(11, 16)}
                  y={row.metrics.heart_rate}
                  r={trustLens ? 8 : 7}
                  fill={trustLens ? "transparent" : color}
                  stroke={color}
                  strokeWidth={trustLens ? 2.5 : 2}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {trustLens ? (
        <div className="flex items-center gap-2 text-[12px] text-on-surface-variant bg-secondary-fixed/15 rounded-2xl px-4 py-2.5">
          <span className="material-symbols-outlined text-[16px] text-secondary">
            visibility
          </span>
          <span>
            Trust Lens is on — only <strong>verified readings</strong> are
            shown at full brightness. Click anywhere on the chart for the
            evidence receipt.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[12px] text-on-surface-variant bg-surface-container-low/50 rounded-2xl px-4 py-2.5">
          <span className="material-symbols-outlined text-[16px] text-outline">
            touch_app
          </span>
          <span>
            Click anywhere on the chart to open an evidence receipt for the
            nearest reading.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Records" value={timeline.length} tone="neutral" />
        <StatCard
          label="Trusted Data Points"
          value={count(timeline, "TRUSTED")}
          tone="mint"
        />
        <StatCard
          label="Suspicious"
          value={count(timeline, "SUSPICIOUS")}
          tone="amber"
        />
        <StatCard
          label="Flagged Attacks"
          value={count(timeline, "FLAGGED")}
          tone="red"
          pulse={count(timeline, "FLAGGED") > 0}
        />
      </div>

      <ProveItPopover
        row={selectedRow}
        prevRow={prevRow}
        nextRow={nextRow}
        integrityValid={integrityValid}
        onClose={() => setSelectedIndex(null)}
      />
    </div>
  );
}

function count(timeline: TimelineRow[], verdict: string) {
  return timeline.filter((r) => r.verdict === verdict).length;
}

function LegendDot({
  color,
  label,
  pulse,
}: {
  color: string;
  label: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/60 text-label-sm font-medium">
      <span
        className={`w-2 h-2 rounded-full ${color} inline-block ${
          pulse ? "animate-pulse" : ""
        }`}
      />
      <span>{label}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  pulse,
}: {
  label: string;
  value: number;
  tone: "neutral" | "mint" | "amber" | "red";
  pulse?: boolean;
}) {
  const tones: Record<string, { bg: string; text: string }> = {
    neutral: { bg: "bg-surface-container-low/70", text: "text-on-surface" },
    mint: { bg: "bg-secondary-fixed/20", text: "text-secondary" },
    amber: { bg: "bg-tertiary-fixed/30", text: "text-tertiary" },
    red: { bg: "bg-error-container/50", text: "text-error" },
  };
  const t = tones[tone];

  return (
    <div className={`${t.bg} rounded-2xl p-4 flex flex-col justify-between`}>
      <div className="flex items-center justify-between">
        <span className="text-label-sm font-medium text-on-surface-variant">
          {label}
        </span>
        {pulse && (
          <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className={`font-headline-sm text-headline-sm font-bold tabular-nums ${t.text}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}