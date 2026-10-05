import { useEffect, useState } from "react";
import { api } from "../api";
import type { TrackingEntry } from "../types";

interface Props {
  userId: string;
}

const GLUCOSE_RANGES = {
  fasting: { low: 80, high: 130 },
  before_meal: { low: 80, high: 130 },
  after_meal: { low: 80, high: 180 },
};

export function DiabetesTracker({ userId }: Props) {
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [glucose, setGlucose] = useState("");
  const [label, setLabel] = useState<"fasting" | "before_meal" | "after_meal">(
    "fasting",
  );
  const [water, setWater] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.getTracking(userId, undefined, 7);
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

  const logGlucose = async () => {
    const value = parseInt(glucose, 10);
    if (!value || value < 20 || value > 600) return;
    setBusy(true);
    try {
      await api.logTracking(userId, "glucose", { value, label });
      setGlucose("");
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const addWater = async () => {
    if (water >= 12) return;
    setWater((w) => w + 1);
    try {
      await api.logTracking(userId, "water", { cups: water + 1 });
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  const glucoseEntries = entries.filter((e) => e.type === "glucose");
  const recent7 = glucoseEntries.slice(-7);

  const avgGlucose =
    recent7.length > 0
      ? Math.round(
          recent7.reduce((s, e) => s + Number(e.value ?? 0), 0) /
            recent7.length,
        )
      : 0;

  const inRange = recent7.filter((e) => {
    const range = GLUCOSE_RANGES[e.label as keyof typeof GLUCOSE_RANGES];
    if (!range) return true;
    const v = Number(e.value ?? 0);
    return v >= range.low && v <= range.high;
  }).length;

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-5 border-l-4 border-primary/40">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary-fixed/50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[22px]">
            water_drop
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Diabetes tracking
          </h3>
          <span className="text-label-sm text-outline">
            Glucose · water · meals
          </span>
        </div>
        {recent7.length > 0 && (
          <div className="px-3 py-1.5 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed-variant text-label-sm font-bold">
            {inRange}/{recent7.length} in range
          </div>
        )}
      </div>

      {/* glucose chart */}
      {recent7.length > 0 ? (
        <div className="bg-surface-container-low/50 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
              Last 7 readings
            </span>
            <span className="text-[11px] text-on-surface-variant">
              avg <b className="text-on-surface">{avgGlucose}</b> mg/dL
            </span>
          </div>
          <GlucoseChart entries={recent7} />
          <div className="flex items-center gap-4 text-[10px] text-outline">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
              In range
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary inline-block" />
              Above
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-error inline-block" />
              Below
            </span>
          </div>
        </div>
      ) : (
        <div className="text-body-sm text-on-surface-variant italic px-1 py-4 text-center bg-surface-container-low/40 rounded-2xl">
          No glucose readings yet — log the first one below.
        </div>
      )}

      {/* log glucose */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          Log a glucose reading
        </span>
        <div className="flex gap-2 flex-wrap">
          <input
            type="number"
            value={glucose}
            onChange={(e) => setGlucose(e.target.value)}
            placeholder="mg/dL"
            className="w-24 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary rounded-xl px-3 py-2 text-body-sm outline-none transition-all"
          />
          <select
            value={label}
            onChange={(e) =>
              setLabel(
                e.target.value as "fasting" | "before_meal" | "after_meal",
              )
            }
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2 text-body-sm outline-none"
          >
            <option value="fasting">Fasting</option>
            <option value="before_meal">Before meal</option>
            <option value="after_meal">After meal</option>
          </select>
          <button
            onClick={logGlucose}
            disabled={busy || !glucose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-label-sm font-semibold hover:bg-primary transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Log
          </button>
        </div>
      </div>

      {/* water */}
      <div className="flex items-center justify-between bg-secondary-fixed/20 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[20px]">
            local_drink
          </span>
          <span className="font-label-lg text-label-lg text-on-surface font-medium">
            Water today
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-on-surface tabular-nums">
            {water} / 8 cups
          </span>
          <button
            onClick={addWater}
            className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:bg-on-secondary transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
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
        Typical target ranges: fasting 80–130, after meal up to 180 mg/dL.
        These are general references — your doctor's targets may differ.
      </p>
    </div>
  );
}

function GlucoseChart({ entries }: { entries: TrackingEntry[] }) {
  const values = entries.map((e) => Number(e.value ?? 0));
  if (values.length === 0) return null;

  const width = 300;
  const height = 60;
  const padding = 8;
  const min = 40;
  const max = 220;
  const range = max - min;

  const points = values.map((v, i) => {
    const x =
      padding +
      (i / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y, v };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const bandTopY =
    height - padding - ((180 - min) / range) * (height - padding * 2);
  const bandBottomY =
    height - padding - ((80 - min) / range) * (height - padding * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      <rect
        x={padding}
        y={bandTopY}
        width={width - padding * 2}
        height={bandBottomY - bandTopY}
        fill="#4ECDC4"
        fillOpacity="0.12"
      />
      <path
        d={pathD}
        fill="none"
        stroke="#006A65"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {points.map((p, i) => {
        const inBand = p.v >= 80 && p.v <= 180;
        const color = !inBand
          ? p.v > 180
            ? "#D9822B"
            : "#AE2F34"
          : "#006A65";
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill={color}
            stroke="white"
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
}