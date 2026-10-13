import { useEffect, useState } from "react";
import { api } from "../api";
import type { TrackingEntry } from "../types";

interface Props {
  userId: string;
}

const TARGET_SYSTOLIC = 120;
const TARGET_DIASTOLIC = 80;
const HIGH_SYSTOLIC = 140;
const HIGH_DIASTOLIC = 90;

export function BPTracker({ userId }: Props) {
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.getTracking(userId, "bp", 30);
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
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    const p = pulse ? parseInt(pulse, 10) : undefined;
    if (!sys || !dia || sys < 60 || sys > 260 || dia < 30 || dia > 160) return;
    setBusy(true);
    try {
      await api.logTracking(userId, "bp", {
        systolic: sys,
        diastolic: dia,
        pulse: p ?? null,
        note: note.trim() || null,
      });
      setSystolic("");
      setDiastolic("");
      setPulse("");
      setNote("");
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const recent = entries.slice(-7);

  const classify = (sys: number, dia: number) => {
    if (sys >= HIGH_SYSTOLIC || dia >= HIGH_DIASTOLIC) return "high";
    if (sys < 90 || dia < 60) return "low";
    return "target";
  };

  const inTarget = recent.filter(
    (e) => classify(Number(e.systolic), Number(e.diastolic)) === "target",
  ).length;
  const highs = recent.filter(
    (e) => classify(Number(e.systolic), Number(e.diastolic)) === "high",
  ).length;
  const lows = recent.filter(
    (e) => classify(Number(e.systolic), Number(e.diastolic)) === "low",
  ).length;

  const last = recent[recent.length - 1];
  const avgSys =
    recent.length > 0
      ? Math.round(
          recent.reduce((s, e) => s + Number(e.systolic ?? 0), 0) /
            recent.length,
        )
      : 0;
  const avgDia =
    recent.length > 0
      ? Math.round(
          recent.reduce((s, e) => s + Number(e.diastolic ?? 0), 0) /
            recent.length,
        )
      : 0;

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-5 border-l-4 border-primary/40">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary-fixed/50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[22px]">
            ecg_heart
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Blood pressure tracking
          </h3>
          <span className="text-label-sm text-outline">
            Home cuff readings · last 7
          </span>
        </div>
        {recent.length > 0 && (
          <div className="px-3 py-1.5 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed-variant text-label-sm font-bold">
            {inTarget}/{recent.length} in target
          </div>
        )}
      </div>

      {/* current snapshot */}
      {last && (
        <div className="bg-surface-container-low/50 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
              Latest reading
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-3xl font-bold text-on-surface tabular-nums">
                {String(last.systolic)}/{String(last.diastolic)}
              </span>
              <span className="text-label-sm text-on-surface-variant">
                mmHg
              </span>
            </div>
            <span className="text-[11px] text-outline">
              {new Date(String(last.timestamp)).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
             {last.pulse ? ` · pulse ${String(last.pulse)}` : ""}
            </span>
          </div>

          <div className="flex flex-col gap-1 text-[11px]">
            <span className="text-on-surface-variant">
              <b className="text-secondary">{inTarget}</b> in target ·{" "}
              <b className="text-tertiary">{highs}</b> high ·{" "}
              <b className="text-error">{lows}</b> low
            </span>
            <span className="text-outline">
              avg <b className="text-on-surface">{avgSys}/{avgDia}</b> mmHg
            </span>
          </div>
        </div>
      )}

      {/* chart */}
      {recent.length > 0 ? (
        <div className="bg-surface-container-low/50 rounded-2xl p-4 flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
            Last 7 readings
          </span>
          <BPTrend entries={recent} />
          <div className="flex items-center gap-4 text-[10px] text-outline">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
              Target
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary inline-block" />
              High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-error inline-block" />
              Low
            </span>
          </div>
        </div>
      ) : (
        <div className="text-body-sm text-on-surface-variant italic px-1 py-4 text-center bg-surface-container-low/40 rounded-2xl">
          No blood pressure readings yet — log the first one below.
        </div>
      )}

      {/* log form */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          Log a blood pressure reading
        </span>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="number"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            placeholder="Systolic"
            className="w-24 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary rounded-xl px-3 py-2 text-body-sm outline-none transition-all"
          />
          <span className="text-outline">/</span>
          <input
            type="number"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            placeholder="Diastolic"
            className="w-24 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary rounded-xl px-3 py-2 text-body-sm outline-none transition-all"
          />
          <input
            type="number"
            value={pulse}
            onChange={(e) => setPulse(e.target.value)}
            placeholder="Pulse (opt)"
            className="w-28 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary rounded-xl px-3 py-2 text-body-sm outline-none transition-all"
          />
          <button
            onClick={log}
            disabled={busy || !systolic || !diastolic}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-label-sm font-semibold hover:bg-primary transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Log
          </button>
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (e.g. salty meal, after walk, morning)"
          className="w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary rounded-xl px-3 py-2 text-body-sm outline-none transition-all"
        />
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
        Typical adult target: below 120/80 mmHg. Readings above 140/90 may be
        worth mentioning to a doctor. These are general references — your
        doctor's targets may differ.
      </p>
    </div>
  );
}

function BPTrend({ entries }: { entries: TrackingEntry[] }) {
  const width = 320;
  const height = 90;
  const padding = 10;
  const minSys = 80;
  const maxSys = 180;
  const range = maxSys - minSys;

  const points = entries.map((e, i) => {
    const sys = Number(e.systolic ?? 0);
    const dia = Number(e.diastolic ?? 0);
    const x =
      padding + (i / Math.max(entries.length - 1, 1)) * (width - padding * 2);
    const sysY =
      height - padding - ((sys - minSys) / range) * (height - padding * 2);
    const diaY =
      height - padding - ((dia - minSys) / range) * (height - padding * 2);
    return { x, sysY, diaY, sys, dia };
  });

  const sysPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.sysY}`)
    .join(" ");
  const diaPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.diaY}`)
    .join(" ");

  const targetSysY =
    height - padding - ((TARGET_SYSTOLIC - minSys) / range) * (height - padding * 2);
  const targetDiaY =
    height - padding - ((TARGET_DIASTOLIC - minSys) / range) * (height - padding * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
      <line
        x1={padding}
        x2={width - padding}
        y1={targetSysY}
        y2={targetSysY}
        stroke="#4ECDC4"
        strokeWidth="1"
        strokeDasharray="3 3"
        strokeOpacity="0.6"
      />
      <line
        x1={padding}
        x2={width - padding}
        y1={targetDiaY}
        y2={targetDiaY}
        stroke="#4ECDC4"
        strokeWidth="1"
        strokeDasharray="3 3"
        strokeOpacity="0.6"
      />

      <path
        d={sysPath}
        fill="none"
        stroke="#AE2F34"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d={diaPath}
        fill="none"
        stroke="#845400"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {points.map((p, i) => {
        const tone = (v: number, target: number) =>
          v >= target + 20 ? "#D9822B" : v < target - 20 ? "#AE2F34" : "#006A65";
        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.sysY}
              r="3.5"
              fill={tone(p.sys, TARGET_SYSTOLIC)}
              stroke="white"
              strokeWidth="1"
            />
            <circle
              cx={p.x}
              cy={p.diaY}
              r="3"
              fill={tone(p.dia, TARGET_DIASTOLIC)}
              stroke="white"
              strokeWidth="1"
            />
          </g>
        );
      })}

      <text x={padding + 4} y={targetSysY - 4} fontSize="8" fill="#8C706F">
        target systolic 120
      </text>
      <text x={padding + 4} y={targetDiaY + 10} fontSize="8" fill="#8C706F">
        target diastolic 80
      </text>
    </svg>
  );
}