import { useEffect, useState } from "react";
import { api } from "../api";
import type { DailyRecommendation, GoalDefinition } from "../types";
import { Mascot } from "./Mascot";
import { getMealForTag, getWorkoutForTag } from "../lib/mediaLibrary";

interface Props {
  userId: string;
}

const TIME_OPTIONS = [10, 15, 30, 45, 60];

const GOAL_GRADIENTS: Record<string, string> = {
  lose_weight: "from-primary-fixed/40 via-surface-container-lowest to-tertiary-fixed/30",
  gain_weight: "from-secondary-fixed/40 via-surface-container-lowest to-primary-fixed/30",
  improve_fitness: "from-primary-fixed/40 via-surface-container-lowest to-secondary-fixed/30",
  improve_sleep: "from-secondary-fixed/50 via-surface-container-lowest to-surface-container-low/40",
  reduce_stress: "from-tertiary-fixed/40 via-surface-container-lowest to-secondary-fixed/30",
};

const CONDITION_LABELS: Record<string, string> = {
  type_2_diabetes: "Diabetes",
  hypertension: "Hypertension",
  arthritis: "Arthritis",
  post_surgery_recovery: "Post-surgery recovery",
  menopause: "Menopause",
  pregnancy_second_trimester: "Pregnancy",
  pregnancy_third_trimester: "Pregnancy",
};

const SENSITIVE_CONDITIONS = [
  "pregnancy_second_trimester",
  "pregnancy_third_trimester",
  "type_2_diabetes",
  "post_surgery_recovery",
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late evening";
}

export function RecommendationsPage({ userId }: Props) {
  const [goals, setGoals] = useState<GoalDefinition[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>("improve_fitness");
  const [minutes, setMinutes] = useState(30);
  const [data, setData] = useState<DailyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listGoals().then((r) => setGoals(r.goals));
  }, []);

  const load = async (force = false) => {
    setBusy(true);
    try {
      const res = await api.generateRecommendations(userId, selectedGoal, minutes, force);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setBusy(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedGoal, minutes]);

  const conditions = data?.conditions ?? [];
  const sensitive = conditions.some((c) => SENSITIVE_CONDITIONS.includes(c));
  const activeGoal = goals.find((g) => g.key === selectedGoal);
  const gradientClass = GOAL_GRADIENTS[selectedGoal] ?? GOAL_GRADIENTS.improve_fitness;

  // Match media to what Nemotron actually suggested
   // Match media by Nemotron's own tag — always exact
  const workout = data ? getWorkoutForTag(data.movement_tag) : null;
  const meal = data ? getMealForTag(data.food_tag) : null;

  return (
    <div className="w-full max-w-[1100px] mx-auto px-6 md:px-12 py-8 flex flex-col gap-6">
      {/* hero */}
      <div className={`relative bg-gradient-to-br ${gradientClass} rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row items-start md:items-center gap-6 overflow-hidden`}>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/30 blur-3xl pointer-events-none" />
        <div className="mascot-float shrink-0">
          <Mascot mood="happy" size={96} />
        </div>
        <div className="relative flex-1">
          <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
            {greeting()}
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface leading-tight mt-1">
            What to do today
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-lg">
            Three small suggestions, chosen for your goal
            {activeGoal ? ` (${activeGoal.label.toLowerCase()})` : ""}.
            Nothing overwhelming — just today.
          </p>
        </div>
      </div>

      {/* controls */}
      <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-5 md:p-6 shadow-md flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">Your goal</span>
          <div className="flex flex-wrap gap-2">
            {goals.map((g) => {
              const active = selectedGoal === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => setSelectedGoal(g.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all ${active ? "bg-primary-fixed/60 ring-2 ring-primary/30 shadow-sm" : "bg-surface-container-low/60 hover:bg-surface-container-high/70"}`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${active ? "text-primary" : "text-on-surface-variant"}`}>
                    {g.icon}
                  </span>
                  <span className="font-label-lg font-semibold text-on-surface">{g.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">Time available today</span>
            <div className="flex gap-2 flex-wrap">
              {TIME_OPTIONS.map((t) => {
                const active = minutes === t;
                return (
                  <button
                    key={t}
                    onClick={() => setMinutes(t)}
                    className={`px-4 py-2 rounded-2xl text-label-sm font-semibold transition-all ${active ? "bg-secondary-fixed/60 text-on-secondary-fixed-variant shadow-sm" : "bg-surface-container-low/60 text-on-surface-variant hover:bg-surface-container-high/70"}`}
                  >
                    {t} min
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => load(true)}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-container hover:bg-primary text-on-primary font-label-lg font-semibold shadow-md shadow-primary-container/40 transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            <span className={`material-symbols-outlined text-[18px] ${busy ? "animate-spin" : ""}`}>
              {busy ? "progress_activity" : "refresh"}
            </span>
            {busy ? "Refreshing…" : "Refresh plan"}
          </button>
        </div>
      </div>

      {/* sensitive-condition banner */}
      {sensitive && (
        <div className="bg-tertiary-fixed/30 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary text-[22px] shrink-0 mt-0.5">health_and_safety</span>
          <div className="flex flex-col gap-1">
            <span className="font-title-sm text-title-sm text-on-tertiary-container font-semibold">
              Gentle plan for your situation
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              You have{" "}
              <strong className="text-on-surface">
                {conditions.map((c) => CONDITION_LABELS[c] ?? c).join(" + ")}
              </strong>
              . Because of that, Guardian kept today's suggestions extra gentle. Always follow your doctor's advice first.
            </span>
          </div>
        </div>
      )}

      {/* cards */}
      {loading ? (
        <div className="bg-surface-container-lowest/90 rounded-3xl p-8 flex items-center justify-center gap-3">
          <Mascot mood="calm" size={40} />
          <span className="text-on-surface-variant italic font-body-sm">Guardian is preparing your plan…</span>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Movement card */}
            <div className="relative bg-primary-fixed/40 rounded-3xl p-5 shadow-sm ring-1 ring-primary/25 flex flex-col gap-3 transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-primary-fixed/70 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-primary">directions_run</span>
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-outline">Movement</span>
              <span className="font-body-lg text-body-lg text-on-surface leading-snug">{data.movement}</span>

              {workout && (
                <a
                  href={workout.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  <img
                    src={workout.thumbnail}
                    alt={workout.title}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                    <div className="flex flex-col text-white">
                      <span className="text-[11px] font-semibold">{workout.title}</span>
                      <span className="text-[10px] opacity-80">{workout.duration}</span>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-[20px] text-primary">play_arrow</span>
                  </div>
                </a>
              )}
            </div>

            {/* Food card */}
            <div className="relative bg-secondary-fixed/40 rounded-3xl p-5 shadow-sm ring-1 ring-secondary/25 flex flex-col gap-3 transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-secondary-fixed/70 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-secondary">restaurant</span>
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-outline">Food suggestion</span>
              <span className="font-body-lg text-body-lg text-on-surface leading-snug">{data.food}</span>

              {meal && (
                <div className="mt-2 rounded-2xl overflow-hidden shadow-sm">
                  <img src={meal.url} alt={meal.alt} className="w-full h-32 object-cover" />
                  <div className="bg-surface-container-lowest/90 px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                      {meal.tag}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Wellness card */}
            <div className="relative bg-tertiary-fixed/40 rounded-3xl p-5 shadow-sm ring-1 ring-tertiary-container/30 flex flex-col gap-3 transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed/70 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-tertiary">water_drop</span>
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-outline">Wellness action</span>
              <span className="font-body-lg text-body-lg text-on-surface leading-snug">{data.wellness}</span>

              <div className="mt-2 bg-surface-container-lowest/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 h-32">
                <Mascot mood="happy" size={44} />
                <span className="text-[11px] text-on-surface-variant text-center italic">
                  Small habit, big difference
                </span>
              </div>
            </div>
          </div>

          {/* why */}
          <div className="bg-surface-container-low/60 rounded-3xl p-5 flex items-start gap-4">
            <Mascot mood="happy" size={44} />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-outline">Why these?</span>
              <span className="font-body-md text-body-md text-on-surface leading-relaxed">{data.why}</span>
            </div>
          </div>

          {/* footer */}
          <div className="flex flex-col gap-2 items-center">
            <span className="text-[10px] text-outline">
              Plan source:{" "}
              {data.source === "nemotron_nano" || data.source === "nemotron_lightning"
                ? "NVIDIA Nemotron via Nebius"
                : "Guardian's curated library"}
              {" · "}
              {new Date(data.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <p className="text-[11px] text-outline italic text-center max-w-lg">
              General wellness suggestions only. Not medical advice. Consult a
              healthcare professional before changing your routine.
            </p>
          </div>
        </>
      ) : (
        <div className="bg-surface-container-lowest/90 rounded-3xl p-8 text-center text-on-surface-variant italic">
          Couldn't load a plan — try Refresh.
        </div>
      )}
    </div>
  );
}