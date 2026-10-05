import { useEffect, useState } from "react";
import { api } from "../api";
import type { TrackingEntry } from "../types";

interface Props {
  userId: string;
}

const FLASH_INTENSITY = ["mild", "moderate", "severe"] as const;
type Intensity = (typeof FLASH_INTENSITY)[number];

const MOODS = [
  { key: "calm", label: "Calm", icon: "sentiment_satisfied" },
  { key: "tired", label: "Tired", icon: "battery_2_bar" },
  { key: "irritable", label: "Irritable", icon: "sentiment_dissatisfied" },
  { key: "low", label: "Low", icon: "mood_bad" },
  { key: "good", label: "Good", icon: "sentiment_very_satisfied" },
] as const;
type Mood = (typeof MOODS)[number]["key"];

const SYMPTOMS = [
  "hot_flash",
  "night_sweat",
  "headache",
  "mood_swing",
  "fatigue",
  "brain_fog",
] as const;

const SYMPTOM_LABEL: Record<string, string> = {
  hot_flash: "Hot flash",
  night_sweat: "Night sweat",
  headache: "Headache",
  mood_swing: "Mood swing",
  fatigue: "Fatigue",
  brain_fog: "Brain fog",
};

export function MenopauseTracker({ userId }: Props) {
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [flashCount, setFlashCount] = useState(0);
  const [intensity, setIntensity] = useState<Intensity>("mild");
  const [nightSweats, setNightSweats] = useState(0);
  const [mood, setMood] = useState<Mood>("calm");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.getTracking(userId, "hot_flash", 14);
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

  const toggleSymptom = (key: string) =>
    setSymptoms((s) =>
      s.includes(key) ? s.filter((x) => x !== key) : [...s, key],
    );

  const log = async () => {
    setBusy(true);
    try {
      await api.logTracking(userId, "hot_flash", {
        flash_count: flashCount,
        intensity,
        night_sweats: nightSweats,
        mood,
        symptoms,
      });
      setFlashCount(0);
      setNightSweats(0);
      setSymptoms([]);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const recent = entries.slice(-14);
  const last = recent[recent.length - 1];

  const totalFlashes = recent.reduce(
    (s, e) => s + Number(e.flash_count ?? 0),
    0,
  );
  const avgFlashesPerDay =
    recent.length > 0 ? (totalFlashes / recent.length).toFixed(1) : "—";

  const moodTally = recent.reduce<Record<string, number>>((acc, e) => {
    const k = String(e.mood ?? "calm");
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodTally).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-5 border-l-4 border-tertiary/40">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-tertiary-fixed/50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-tertiary text-[22px]">
            spa
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Symptom journal
          </h3>
          <span className="text-label-sm text-outline">
            Hot flashes · night sweats · mood · last 14 days
          </span>
        </div>
        {recent.length > 0 && (
          <div className="px-3 py-1.5 rounded-full bg-tertiary-fixed/40 text-on-tertiary-container text-label-sm font-bold">
            avg {avgFlashesPerDay}/day
          </div>
        )}
      </div>

      {/* trend */}
      {recent.length > 0 ? (
        <div className="bg-surface-container-low/50 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
              Hot flashes per day
            </span>
            {topMood && (
              <span className="text-[11px] text-on-surface-variant">
                most common mood:{" "}
                <b className="text-on-surface">{topMood[0]}</b>
              </span>
            )}
          </div>
          <FlashTrend entries={recent} />
        </div>
      ) : (
        <div className="text-body-sm text-on-surface-variant italic px-1 py-4 text-center bg-surface-container-low/40 rounded-2xl">
          No entries yet — log today's experience below.
        </div>
      )}

      {/* last snapshot */}
      {last && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MiniStat
            label="Flashes"
            value={String(last.flash_count ?? 0)}
            icon="thermostat"
          />
          <MiniStat
            label="Night sweats"
            value={String(last.night_sweats ?? 0)}
            icon="bedtime"
          />
          <MiniStat
            label="Intensity"
            value={String(last.intensity ?? "—")}
            icon="signal_cellular_alt"
          />
          <MiniStat
            label="Mood"
            value={String(last.mood ?? "—")}
            icon="sentiment_satisfied"
          />
        </div>
      )}

      {/* log form */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          Log today
        </span>

        <div className="flex items-center justify-between bg-surface-container-low/60 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[20px]">
              thermostat
            </span>
            <span className="font-label-lg text-label-lg text-on-surface font-medium">
              Hot flashes today
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFlashCount((c) => Math.max(0, c - 1))}
              className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-surface-container-highest transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                remove
              </span>
            </button>
            <span className="font-display text-xl font-bold text-on-surface tabular-nums w-8 text-center">
              {flashCount}
            </span>
            <button
              onClick={() => setFlashCount((c) => c + 1)}
              className="w-7 h-7 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center hover:bg-on-tertiary transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                add
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-on-surface-variant">
            Average intensity
          </span>
          <div className="flex gap-1.5">
            {FLASH_INTENSITY.map((i) => (
              <button
                key={i}
                onClick={() => setIntensity(i)}
                className={`flex-1 px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-all ${
                  intensity === i
                    ? "bg-tertiary text-on-tertiary"
                    : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between bg-surface-container-low/60 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              bedtime
            </span>
            <span className="font-label-lg text-label-lg text-on-surface font-medium">
              Night sweats
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNightSweats((c) => Math.max(0, c - 1))}
              className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-surface-container-highest transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                remove
              </span>
            </button>
            <span className="font-display text-xl font-bold text-on-surface tabular-nums w-8 text-center">
              {nightSweats}
            </span>
            <button
              onClick={() => setNightSweats((c) => c + 1)}
              className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:bg-on-secondary transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                add
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-on-surface-variant">
            Overall mood
          </span>
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => {
              const active = mood === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMood(m.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    active
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {m.icon}
                  </span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-on-surface-variant">
            Other symptoms today (tap all that apply)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOMS.map((s) => {
              const active = symptoms.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    active
                      ? "bg-tertiary text-on-tertiary"
                      : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {active ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  {SYMPTOM_LABEL[s]}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={log}
          disabled={busy}
          className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tertiary text-on-tertiary text-label-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
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
        Tracking patterns over weeks helps you notice what helps. Bring this
        to a doctor if symptoms are affecting sleep or daily life.
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-surface-container-low/50 rounded-2xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-outline">
        <span className="material-symbols-outlined text-[12px]">{icon}</span>
        {label}
      </div>
      <span className="font-title-sm text-title-sm font-bold text-on-surface capitalize">
        {value}
      </span>
    </div>
  );
}

function FlashTrend({ entries }: { entries: TrackingEntry[] }) {
  const width = 320;
  const height = 80;
  const padding = 12;
  const maxVal = Math.max(
    ...entries.map((e) => Number(e.flash_count ?? 0)),
    6,
  );

  const barWidth = (width - padding * 2) / entries.length - 4;

  const tone = (v: number) => {
    if (v >= 5) return "#AE2F34";
    if (v >= 3) return "#D9822B";
    return "#4ECDC4";
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
      {[0, Math.ceil(maxVal / 2), maxVal].map((g) => {
        const y =
          height - padding - (g / maxVal) * (height - padding * 2);
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

      {entries.map((e, i) => {
        const v = Number(e.flash_count ?? 0);
        const h = (v / maxVal) * (height - padding * 2);
        const x = padding + i * ((width - padding * 2) / entries.length) + 2;
        const y = height - padding - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx="3"
            fill={tone(v)}
          />
        );
      })}
    </svg>
  );
}