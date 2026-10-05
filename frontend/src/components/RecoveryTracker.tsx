import { useEffect, useState } from "react";
import { api } from "../api";
import type { TrackingEntry } from "../types";

interface Props {
  userId: string;
}

const WOUND_STATES = [
  { key: "clean", label: "Clean & dry", icon: "check_circle", tone: "secondary" },
  { key: "redness", label: "Redness around", icon: "warning", tone: "tertiary" },
  { key: "swelling", label: "Swelling", icon: "warning", tone: "tertiary" },
  { key: "discharge", label: "Discharge", icon: "error", tone: "error" },
  { key: "fever", label: "Fever", icon: "error", tone: "error" },
] as const;

type WoundState = (typeof WOUND_STATES)[number]["key"];

const MILESTONES = [
  { key: "walk_room", label: "Walked across the room" },
  { key: "walk_outside", label: "Walked outside" },
  { key: "stairs", label: "Climbed stairs" },
  { key: "shower", label: "Showered independently" },
  { key: "drive", label: "Short drive" },
] as const;

export function RecoveryTracker({ userId }: Props) {
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [pain, setPain] = useState(3);
  const [wound, setWound] = useState<WoundState>("clean");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.getTracking(userId, "wound", 30);
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

  const toggleMilestone = (key: string) =>
    setMilestones((m) =>
      m.includes(key) ? m.filter((x) => x !== key) : [...m, key],
    );

  const log = async () => {
    setBusy(true);
    try {
      await api.logTracking(userId, "wound", {
        pain,
        wound_state: wound,
        milestones,
      });
      setMilestones([]);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const recent = entries.slice(-14);
  const last = recent[recent.length - 1];
  const avgPain =
    recent.length > 0
      ? (
          recent.reduce((s, e) => s + Number(e.pain ?? 0), 0) / recent.length
        ).toFixed(1)
      : "—";

  const daysSinceStart =
    recent.length > 0
      ? Math.max(
          1,
          Math.round(
            (Date.now() -
              new Date(String(recent[0].timestamp)).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  const woundConcern =
    last &&
    typeof last.wound_state === "string" &&
    ["discharge", "fever", "swelling", "redness"].includes(last.wound_state);

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-5 border-l-4 border-secondary/40">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-secondary-fixed/50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-secondary text-[22px]">
            healing
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Recovery check-in
          </h3>
          <span className="text-label-sm text-outline">
            {recent.length > 0
              ? `Day ${daysSinceStart} of tracking · avg pain ${avgPain}/10`
              : "Track wound, pain, and mobility"}
          </span>
        </div>
        {last && (
          <div
            className={`px-3 py-1.5 rounded-full text-label-sm font-bold ${
              woundConcern
                ? "bg-error-container text-on-error-container"
                : "bg-secondary-fixed/40 text-on-secondary-fixed-variant"
            }`}
          >
            {woundConcern ? "Check wound" : "Steady"}
          </div>
        )}
      </div>

      {/* fixed safety message */}
      <div className="bg-error-container/30 rounded-2xl p-4 border-l-4 border-error/60">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
            health_and_safety
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-title-sm text-title-sm text-on-error-container font-semibold">
              Contact the surgical team if you see
            </span>
            <span className="font-body-sm text-body-sm text-on-error-container/90">
              Fever above 38°C · discharge or pus · spreading redness ·
              wound opening · pain getting worse instead of better
            </span>
            <span className="text-[10px] text-on-error-container/70 italic mt-1">
              This card never changes based on the app. Trust your body.
            </span>
          </div>
        </div>
      </div>

      {/* pain trend */}
      {recent.length > 0 && (
        <div className="bg-surface-container-low/50 rounded-2xl p-4 flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
            Pain trend · last 14 days
          </span>
          <PainTrend entries={recent} />
        </div>
      )}

      {/* wound state pill summary */}
      {last && (
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${
              woundConcern
                ? "bg-error-container text-on-error-container"
                : "bg-secondary-fixed/40 text-on-secondary-fixed-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {woundConcern ? "warning" : "check_circle"}
            </span>
            Wound: {String(last.wound_state ?? "—")}
          </span>
          {Array.isArray(last.milestones) &&
            (last.milestones as string[]).length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-primary-fixed/50 text-on-primary-fixed-variant">
                <span className="material-symbols-outlined text-[14px]">
                  verified
                </span>
                {(last.milestones as string[]).length} milestones logged
              </span>
            )}
        </div>
      )}

      {/* log form */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          Today's check-in
        </span>

        {/* pain */}
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
            {[0, 5, 10].map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
        </div>

        {/* wound state */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-on-surface-variant">
            Wound appearance
          </span>
          <div className="flex flex-wrap gap-1.5">
            {WOUND_STATES.map((w) => {
              const active = wound === w.key;
              const tone = {
                secondary: "bg-secondary text-on-secondary",
                tertiary: "bg-tertiary text-on-tertiary",
                error: "bg-error text-on-error",
              }[w.tone];
              return (
                <button
                  key={w.key}
                  onClick={() => setWound(w.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    active
                      ? tone
                      : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {w.icon}
                  </span>
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* milestones */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-on-surface-variant">
            Milestones achieved today (tap all that apply)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {MILESTONES.map((m) => {
              const active = milestones.includes(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => toggleMilestone(m.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    active
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {active ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={log}
          disabled={busy}
          className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-on-secondary text-label-sm font-semibold hover:bg-on-secondary transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          Save today's check-in
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
        Recovery is not linear. Gentle days are expected. Your surgical team's
        plan takes priority over anything in this app.
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
    const v = Number(e.pain ?? 0);
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