import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import type { MoodDaily, MoodResponse } from "../types";
import { Mascot, type MascotMood } from "./Mascot";

interface Props {
  userId: string;
}

const FACES = [
  {
    score: 1,
    img: "/assets/mood-awful.png",
    label: "Awful",
    color: "#AE2F34",
    mood: "concerned",
  },
  {
    score: 2,
    img: "/assets/mood-low.png",
    label: "Low",
    color: "#D9822B",
    mood: "concerned",
  },
  {
    score: 3,
    img: "/assets/mood-okay.png",
    label: "Okay",
    color: "#8C706F",
    mood: "calm",
  },
  {
    score: 4,
    img: "/assets/mood-good.png",
    label: "Good",
    color: "#006A65",
    mood: "happy",
  },
  {
    score: 5,
    img: "/assets/mood-great.png",
    label: "Great",
    color: "#4ECDC4",
    mood: "happy",
  },
] as const;

const SCORE_TO_COLOR: Record<number, string> = {
  1: "#AE2F34",
  2: "#D9822B",
  3: "#8C706F",
  4: "#006A65",
  5: "#4ECDC4",
};

function scoreToImg(score: number | null): string {
  if (score === null) return "/assets/dheal-mascot.png";
  return FACES[Math.round(score) - 1]?.img ?? "/assets/dheal-mascot.png";
}

function scoreToLabel(score: number | null): string {
  if (score === null) return "Not logged";
  return FACES[Math.round(score) - 1]?.label ?? "—";
}

function buildLast7Days(
  daily: MoodDaily[],
): { date: string; avg: number | null }[] {
  const map = new Map<string, number>();
  daily.forEach((d) => map.set(d.date, d.avg_score));

  const out: { date: string; avg: number | null }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, avg: map.get(iso) ?? null });
  }
  return out;
}

function computeStreak(days: { date: string; avg: number | null }[]): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].avg !== null) streak++;
    else break;
  }
  return streak;
}

export function MoodCheckIn({ userId }: Props) {
  const [data, setData] = useState<MoodResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [justLogged, setJustLogged] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await api.getMood(userId, 7);
      setData(res);
    } catch (e) {
      console.error("mood load failed", e);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const log = async (score: number, _mood: MascotMood) => {
    if (busy) return;
    setBusy(true);
    setJustLogged(score);
    try {
      await api.logMood(userId, score);
      await load();
      setTimeout(() => setJustLogged(null), 1800);
    } catch (e) {
      console.error("mood log failed", e);
    } finally {
      setBusy(false);
    }
  };

  const todayScore = data?.today ?? null;
  const currentMood: MascotMood =
    todayScore === null
      ? "calm"
      : FACES.find((f) => f.score === todayScore)?.mood ?? "calm";

  const chart: MoodDaily[] = data?.daily ?? [];
  const last7 = buildLast7Days(chart);
  const streak = computeStreak(last7);

  return (
    <div
      id="mood-checkin"
      className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-5"
    >
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mascot mood={currentMood} size={48} />
          <div>
            <h3 className="font-title-md text-title-md text-on-surface font-semibold">
              Mood Check-In
            </h3>
            <span className="text-label-sm text-outline">
              {todayScore
                ? `Logged today: ${
                    FACES.find((f) => f.score === todayScore)?.label
                  }`
                : "How do you feel right now?"}
            </span>
          </div>
        </div>

        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-fixed/60 text-on-primary-fixed-variant">
            <span className="material-symbols-outlined text-[16px]">
              local_fire_department
            </span>
            <span className="text-label-sm font-semibold">
              {streak}-day streak
            </span>
          </div>
        )}
      </div>

      {/* 5 big mascot faces */}
      <div className="grid grid-cols-5 gap-3">
        {FACES.map((f) => {
          const active = todayScore === f.score;
          const flash = justLogged === f.score;
          return (
            <button
              key={f.score}
              onClick={() => log(f.score, f.mood)}
              disabled={busy}
              className={`group flex flex-col items-center gap-2 rounded-3xl py-4 px-1 transition-all ${
                active
                  ? "bg-secondary-fixed/50 ring-2 ring-secondary/40"
                  : flash
                  ? "bg-primary-fixed/70"
                  : "bg-surface-container-low/60 hover:bg-surface-container-high/70"
              } disabled:opacity-60 disabled:cursor-wait`}
            >
              <img
                src={f.img}
                alt={f.label}
                className={`w-20 h-20 object-contain transition-transform ${
                  active ? "scale-110" : "group-hover:scale-110"
                }`}
              />
              <span
                className="text-[11px] font-semibold tracking-wide uppercase"
                style={{ color: active ? f.color : undefined }}
              >
                {f.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 7-day journal strip */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-label-sm text-outline font-semibold tracking-wide">
            MOOD JOURNAL · LAST 7 DAYS
          </span>
          {chart.length > 0 && (
            <span className="text-label-sm text-outline">
              {chart.length} day{chart.length === 1 ? "" : "s"} logged
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {last7.map(({ date, avg }) => {
            const isToday = date === new Date().toISOString().slice(0, 10);
            const hasLog = avg !== null;
            return (
              <div
                key={date}
                title={`${date} · ${scoreToLabel(avg)}`}
                className={`journal-cell flex flex-col items-center gap-1 rounded-2xl p-2 transition-all ${
                  isToday
                    ? "bg-secondary-fixed/30 ring-1 ring-secondary/30"
                    : hasLog
                    ? "bg-surface-container-low/50"
                    : "bg-surface-container-low/30"
                }`}
              >
                <span className="text-[9px] font-semibold tracking-wide text-outline uppercase">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </span>
                <img
                  src={scoreToImg(avg)}
                  alt={scoreToLabel(avg)}
                  className={`w-9 h-9 object-contain transition-all ${
                    hasLog ? "" : "opacity-25 grayscale"
                  }`}
                />
                <span
                  className={`text-[9px] font-bold tabular-nums ${
                    hasLog ? "text-on-surface" : "text-outline"
                  }`}
                >
                  {hasLog && avg !== null ? avg.toFixed(1) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* chart */}
      <div className="flex flex-col gap-2">
        <span className="text-label-sm text-outline font-semibold tracking-wide">
          AVERAGE MOOD PER DAY
        </span>

        {chart.length === 0 ? (
          <div className="text-body-sm text-on-surface-variant italic px-1 py-6 text-center bg-surface-container-low/40 rounded-2xl">
            No mood logs yet — tap a face above to start.
          </div>
        ) : (
          <div className="h-28 w-full bg-surface-container-low/40 rounded-2xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#8C706F" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[1, 3, 5]}
                  tick={{ fontSize: 9, fill: "#8C706F" }}
                  axisLine={false}
                  tickLine={false}
                  width={18}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #E0BFBD",
                    fontSize: 11,
                  }}
                  formatter={(v) =>
                    [`${typeof v === "number" ? v : 0} / 5`, "Mood"] as [
                      string,
                      string,
                    ]
                  }
                  labelFormatter={(l) => `Date: ${String(l)}`}
                />
                <Bar dataKey="avg_score" radius={[6, 6, 0, 0]}>
                  {chart.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        SCORE_TO_COLOR[Math.round(d.avg_score)] ?? "#8C706F"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* motivational footer */}
      <p className="text-[11px] text-outline italic">
        {streak >= 3
          ? `🔥 ${streak} days in a row — Guardian remembers how you've been feeling.`
          : "Log every day to build your streak. Guardian remembers how you feel, one day at a time."}
      </p>
    </div>
  );
}