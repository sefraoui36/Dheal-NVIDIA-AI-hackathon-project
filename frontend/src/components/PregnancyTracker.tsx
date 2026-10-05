import { useEffect, useState } from "react";
import { api } from "../api";
import type { Profile, TrackingEntry } from "../types";

interface Props {
  profile: Profile;
}

const TRIMESTER_LABELS: Record<number, string> = {
  1: "First trimester · 1–12 weeks",
  2: "Second trimester · 13–27 weeks",
  3: "Third trimester · 28–40 weeks",
};

const KICK_GOAL = 10;
const TOTAL_WEEKS = 40;

export function PregnancyTracker({ profile }: Props) {
  const pregnancy = profile.pregnancy;

  const [kicks, setKicks] = useState(0);
  const [weight, setWeight] = useState("");
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.getTracking(profile.user_id, undefined, 30);
      setEntries(res.entries);
      setInsights(res.insights ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.user_id]);

  if (!pregnancy) return null;

  const logKick = async () => {
    if (kicks >= KICK_GOAL) return;
    setKicks((k) => k + 1);
    try {
      await api.logTracking(profile.user_id, "kick", { count: kicks + 1 });
    } catch (e) {
      console.error(e);
    }
  };

  const logWeight = async () => {
    const w = parseFloat(weight);
    if (!w || w < 30 || w > 200) return;
    setBusy(true);
    try {
      await api.logTracking(profile.user_id, "weight", { kg: w });
      setWeight("");
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const weekProgress = Math.min(100, (pregnancy.week / TOTAL_WEEKS) * 100);
  const weeksLeft = Math.max(0, TOTAL_WEEKS - pregnancy.week);

  const weightEntries = entries.filter((e) => e.type === "weight");
  const weightValues = weightEntries.map((e) => Number(e.kg ?? 0));
  const lastWeight = weightValues[weightValues.length - 1];
  const firstWeight = weightValues[0];
  const weightGain =
    lastWeight && firstWeight ? (lastWeight - firstWeight).toFixed(1) : null;

  const kickEntries = entries.filter((e) => e.type === "kick");
  const totalKicks = kickEntries.reduce((s, e) => s + Number(e.count ?? 0), 0);

  return (
    <div className="bg-surface-container-lowest/95 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-md flex flex-col gap-6 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-error-container/60 to-primary-fixed/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-secondary-fixed/30 to-transparent blur-3xl pointer-events-none" />

      {/* header */}
      <div className="relative flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-error-container/50 flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-error text-[30px]">
              pregnant_woman
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-error">
              {TRIMESTER_LABELS[pregnancy.trimester] ?? "Pregnancy"}
            </span>
            <h2 className="font-display text-2xl font-bold text-on-surface leading-tight">
              Week {pregnancy.week} · {weeksLeft} to go
            </h2>
            <span className="text-label-sm text-outline">
              Due {pregnancy.due_date}
            </span>
          </div>
        </div>

        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#FFDAD6"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#pregnancyGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(weekProgress / 100) * 264} 264`}
            />
            <defs>
              <linearGradient id="pregnancyGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FF6B6B" />
                <stop offset="100%" stopColor="#4ECDC4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold text-on-surface tabular-nums">
              {pregnancy.week}
            </span>
            <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">
              weeks
            </span>
          </div>
        </div>
      </div>

      {/* trimester message */}
      <div className="relative bg-gradient-to-r from-error-container/40 to-primary-fixed/30 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-error text-[22px] shrink-0 mt-0.5">
          favorite
        </span>
        <p className="font-body-sm text-body-sm text-on-error-container leading-relaxed">
          {pregnancy.trimester === 1 &&
            "First trimester — fatigue and nausea are common. Rest when you need to."}
          {pregnancy.trimester === 2 &&
            "Second trimester — often the most comfortable. Energy usually returns."}
          {pregnancy.trimester === 3 &&
            "Third trimester — sleep gets harder. Kick counts matter most now."}
        </p>
      </div>

      {/* stats */}
      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3">
        <PregnancyStat
          icon="pregnant_woman"
          label="Trimester"
          value={`${pregnancy.trimester} of 3`}
          tone="pink"
        />
        <PregnancyStat
          icon="monitor_weight"
          label="Last weight"
          value={lastWeight ? `${lastWeight.toFixed(1)} kg` : "—"}
          sub={weightGain ? `+${weightGain} kg this window` : undefined}
          tone="coral"
        />
        <PregnancyStat
          icon="baby_changing_station"
          label="Kicks logged"
          value={String(totalKicks)}
          tone="mint"
        />
        <PregnancyStat
          icon="event"
          label="Weeks left"
          value={String(weeksLeft)}
          tone="amber"
        />
      </div>

      {/* kick + weight */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-error-container/30 to-primary-fixed/20 rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[20px]">
                child_friendly
              </span>
              <span className="font-title-sm text-title-sm text-on-surface font-semibold">
                Kick counter today
              </span>
            </div>
            <span className="text-[11px] text-outline">goal {KICK_GOAL}</span>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#AE2F34"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${(kicks / KICK_GOAL) * 264} 264`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-5xl font-bold text-on-surface tabular-nums">
                  {kicks}
                </span>
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                  of {KICK_GOAL}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <button
              onClick={logKick}
              disabled={kicks >= KICK_GOAL}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-error text-on-error font-label-lg font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Log a kick
            </button>
            <button
              onClick={() => setKicks(0)}
              className="px-4 py-3 rounded-2xl bg-surface-container-lowest/70 text-on-surface-variant font-label-lg font-semibold hover:bg-surface-container-lowest transition-all"
            >
              Reset
            </button>
          </div>

          {kicks >= KICK_GOAL && (
            <div className="text-center text-[11px] font-semibold text-error">
              ✓ Goal reached for today
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-surface-container-low/60 rounded-3xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                monitor_weight
              </span>
              <span className="font-title-sm text-title-sm text-on-surface font-semibold">
                Weight
              </span>
            </div>

            {weightValues.length > 1 && <WeightTrend values={weightValues} />}

            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="kg"
                className="flex-1 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary rounded-2xl px-3 py-2.5 text-body-sm outline-none transition-all"
              />
              <button
                onClick={logWeight}
                disabled={busy || !weight}
                className="px-4 py-2.5 rounded-2xl bg-primary-container text-on-primary font-label-sm font-semibold hover:bg-primary transition-all disabled:opacity-50"
              >
                Log
              </button>
            </div>
          </div>

          <div className="bg-surface-container-low/60 rounded-3xl p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                event_upcoming
              </span>
              <span className="font-title-sm text-title-sm text-on-surface font-semibold">
                Next appointment
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              OB check-up · Next Tuesday, 10:00
            </span>
            <span className="text-[11px] text-outline italic">
              Add to your calendar — DHeal doesn't send reminders yet.
            </span>
          </div>
        </div>
      </div>

      {/* insights */}
      {insights.length > 0 && (
        <div className="relative bg-tertiary-fixed/20 rounded-2xl p-4 flex flex-col gap-2">
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

      {/* honesty box */}
      <div className="relative bg-secondary-fixed/20 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
          info
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-label-lg text-label-lg text-on-secondary-fixed-variant font-semibold">
            What a watch can and can't measure
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            {profile.condition_details?.[0]?.cannot_measure ??
              "The baby's health cannot be read from a watch. Log kicks and appointments yourself — DHeal keeps them with your data."}
          </p>
        </div>
      </div>

      <p className="relative text-[11px] text-outline italic leading-relaxed">
        Never medical advice. Pregnancy care belongs with your OB or midwife.
      </p>
    </div>
  );
}

function PregnancyStat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  tone: "pink" | "coral" | "mint" | "amber";
}) {
  const tones = {
    pink: "bg-error-container/40 text-on-error-container",
    coral: "bg-primary-fixed/50 text-on-primary-fixed-variant",
    mint: "bg-secondary-fixed/40 text-on-secondary-fixed-variant",
    amber: "bg-tertiary-fixed/40 text-on-tertiary-container",
  };
  return (
    <div className={`${tones[tone]} rounded-2xl p-3.5 flex flex-col gap-1`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase opacity-80">
        <span className="material-symbols-outlined text-[12px]">{icon}</span>
        {label}
      </div>
      <span className="font-title-md text-title-md font-bold tabular-nums">
        {value}
      </span>
      {sub && <span className="text-[10px] opacity-80">{sub}</span>}
    </div>
  );
}

function WeightTrend({ values }: { values: number[] }) {
  const width = 240;
  const height = 50;
  const padding = 6;

  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x =
      padding + (i / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${
    padding + (width - padding * 2)
  } ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12">
      <defs>
        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#weightGrad)" />
      <path
        d={pathD}
        fill="none"
        stroke="#AE2F34"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {values.map((v, i) => {
        const x =
          padding + (i / Math.max(values.length - 1, 1)) * (width - padding * 2);
        const y = height - padding - ((v - min) / range) * (height - padding * 2);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill="#AE2F34"
            stroke="white"
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
}