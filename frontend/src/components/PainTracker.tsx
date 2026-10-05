import { useEffect, useState } from "react";
import { api } from "../api";
import type { TrackingEntry } from "../types";

interface Props {
  userId: string;
}

const JOINTS = [
  "knee_left",
  "knee_right",
  "hip",
  "wrist",
  "hand",
  "shoulder",
  "back",
  "other",
] as const;

type Joint = (typeof JOINTS)[number];

const JOINT_LABEL: Record<Joint, string> = {
  knee_left: "Left knee",
  knee_right: "Right knee",
  hip: "Hip",
  wrist: "Wrist",
  hand: "Hand",
  shoulder: "Shoulder",
  back: "Back",
  other: "Other",
};

const STIFFNESS = ["none", "mild", "moderate", "severe"] as const;
type Stiffness = (typeof STIFFNESS)[number];

const STIFFNESS_LABEL: Record<Stiffness, string> = {
  none: "None",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

export function PainTracker({ userId }: Props) {
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [pain, setPain] = useState(3);
  const [joint, setJoint] = useState<Joint>("knee_left");
  const [stiffness, setStiffness] = useState<Stiffness>("mild");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.getTracking(userId, "pain", 14);
      setEntries(res.entries);
      setInsights(res.insights ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const log = async () => {
    setBusy(true);
    try {
      await api.logTracking(userId, "pain", {
        score: pain,
        joint,
        stiffness,
      });
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const recent = entries.slice(-14);
  const last = recent[recent.length - 1];
  const avg =
    recent.length > 0
      ? (
          recent.reduce((s, e) => s + Number(e.score ?? 0), 0) / recent.length
        ).toFixed(1)
      : "—";

  const jointCount: Record<string, number> = {};
  recent.forEach((e) => {
    const j = String(e.joint ?? "other");
    jointCount[j] = (jointCount[j] ?? 0) + 1;
  });
  const topJoint = Object.entries(jointCount).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-5 border-l-4 border-secondary/40">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-secondary-fixed/50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-secondary text-[22px]">
            accessibility_new
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Pain &amp; stiffness
          </h3>
          <span className="text-label-sm text-outline">
            Daily self-report · last 14 days
          </span>
        </div>
        {recent.length > 0 && (
          <div className="px-3 py-1.5 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed-variant text-label-sm font-bold">
            avg {avg}/10
          </div>
        )}
      </div>

      {/* trend */}
      {recent.length > 0 ? (
        <div className="bg-surface-container-low/50 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
              Pain trend
            </span>
            {topJoint && (
              <span className="text-[11px] text-on-surface-variant">
                most often:{" "}
                <b className="text-on-surface">
                  {JOINT_LABEL[topJoint[0] as Joint] ?? topJoint[0]}
                </b>
              </span>
            )}
          </div>
          <PainTrend entries={recent} />
        </div>
      ) : (
        <div className="text-body-sm text-on-surface-variant italic px-1 py-4 text-center bg-surface-container-low/40 rounded-2xl">
          No entries yet — log the first reading below.
        </div>
      )}

      {/* last reading snapshot */}
      {last && (
        <div className="bg-surface-container-low/50 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
              Latest
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-3xl font-bold text-on-surface tabular-nums">
                {last.score}
              </span>
              <span className="text-label-sm text-on-surface-variant">
                / 10
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end text-[11px] text-on-surface-variant">
            <span className="font-mono">{String(last.joint ?? "")}</span>
            <span className="text-outline">
              stiffness: {String(last.stiffness ?? "—")}
            </span>
          </div>
        </div>
      )}

      {/* log form */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          Log today's pain
        </span>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-on-surface-variant">Pain level</span>
            <span className="font-mono font-bold text-on-surface">
              {pain}/10
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={pain}
            onChange={(e) => setPain(parseInt(e.target.value, 10))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[9px] text-outline">
            <span>0 · none</span>
            <span>5 · moderate</span>
            <span>10 · severe</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-on-surface-variant">
            Which joint?
          </span>
          <div className="flex flex-wrap gap-1.5">
            {JOINTS.map((j) => (
              <button
                key={j}
                onClick={() => setJoint(j)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  joint === j
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {JOINT_LABEL[j]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-on-surface-variant">
            Morning stiffness
          </span>
          <div className="flex gap-1.5">
            {STIFFNESS.map((s) => (
              <button
                key={s}
                onClick={() => setStiffness(s)}
                className={`flex-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  stiffness === s
                    ? "bg-tertiary text-on-tertiary"
                    : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {STIFFNESS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={log}
          disabled={busy}
          className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-on-secondary text-label-sm font-semibold hover:bg-on-secondary transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          Save today's entry
        </button>
      </div>

      {/* insights */}
      {insights.length > 0 && (
        <div className="bg-tertiary-fixed/20 rounded-2xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">
              lightbulb
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-tertiary-container">
              Insights
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {insights.map((line, i) => (
              <li
                key={i}
                className="font-body-sm text-body-sm text-on-surface flex items-start gap-2"
              >
                <span className="material-symbols-outlined text-[14px] text-tertiary mt-0.5">
                  arrow_right
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-outline italic leading-relaxed">
        Tracking patterns over weeks is more useful than any single day. Share
        with your doctor if pain is changing or worsening.
      </p>
    </div>
  );
}

function PainTrend({ entries }: { entries: TrackingEntry[] }) {
  const width = 320;
  const height = 80;
  const padding = 12;
  const maxY = 10;

  const points = entries.map((e, i) => {
    const v = Number(e.score ?? 0);
    const x =
      padding + (i / Math.max(entries.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (v / maxY) * (height - padding * 2);
    return { x, y, v };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${
    height - padding
  } L ${points[0].x} ${height - padding} Z`;

  const tone = (v: number) => {
    if (v >= 7) return "#AE2F34";
    if (v >= 4) return "#D9822B";
    return "#006A65";
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
      {[0, 5, 10].map((g) => {
        const y = height - padding - (g / maxY) * (height - padding * 2);
        return (
          <line
            key={g}
            x1={padding}
            x2={width - padding}
            y1={y}
            y2={y}
            stroke="#E0BFBD"
            strokeWidth="0.5"
            strokeDasharray="3 3"
          />
        );
      })}

      <path d={areaD} fill="#006A65" fillOpacity="0.12" />

      <path
        d={pathD}
        fill="none"
        stroke="#006A65"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3.5"
          fill={tone(p.v)}
          stroke="white"
          strokeWidth="1.2"
        />
      ))}
    </svg>
  );
}