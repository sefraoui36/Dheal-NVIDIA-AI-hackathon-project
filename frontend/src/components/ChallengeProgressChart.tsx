import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import type {
  ActivityDefinition,
  ChallengeProgress,
} from "../types";

interface Props {
  challengeId: string;
  userId: string;
}

const COLOR_HEX: Record<string, string> = {
  coral: "#AE2F34",
  mint: "#006A65",
  amber: "#D9822B",
  slate: "#8C706F",
};

function formatValue(v: number, activity: ActivityDefinition): string {
  if (activity.unit === "km") return `${v.toFixed(1)} km`;
  if (activity.unit === "h") return `${v.toFixed(1)} h`;
  if (activity.unit === "min") return `${Math.round(v)} min`;
  if (activity.unit === "cups") return `${Math.round(v)} cups`;
  return `${Math.round(v).toLocaleString()}`;
}

export function ChallengeProgressChart({ challengeId, userId }: Props) {
  const [data, setData] = useState<ChallengeProgress | null>(null);
  const [mode, setMode] = useState<"cumulative" | "daily">("cumulative");

  useEffect(() => {
    api
      .challengeProgress(challengeId, userId)
      .then(setData)
      .catch((e) => console.error(e));
  }, [challengeId, userId]);

  if (!data) {
    return (
      <div className="bg-surface-container-low/50 rounded-3xl p-6 flex items-center gap-3">
        <span className="material-symbols-outlined animate-spin text-secondary">
          progress_activity
        </span>
        <span className="text-on-surface-variant text-body-sm italic">
          Loading progress…
        </span>
      </div>
    );
  }

  // build recharts-shaped data: one object per day
  const chartData = data.dates.map((date, i) => {
    const row: Record<string, number | string> = {
      date: date.slice(5), // MM-DD
      fullDate: date,
    };
    data.series.forEach((s) => {
      row[s.user_id] =
        mode === "cumulative" ? s.cumulative[i] : s.daily[i];
    });
    return row;
  });

  return (
    <div className="bg-surface-container-low/50 rounded-3xl p-5 flex flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary-fixed/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary text-[18px]">
              show_chart
            </span>
          </div>
          <div>
            <div className="font-title-sm text-title-sm text-on-surface font-semibold">
              Progress over time
            </div>
            <span className="text-[11px] text-outline">
              {mode === "cumulative"
                ? "Cumulative total since day 1"
                : "What each person did per day"}
            </span>
          </div>
        </div>

        {/* toggle */}
        <div className="flex items-center gap-1 bg-surface-container-lowest/60 p-1 rounded-full">
          <button
            onClick={() => setMode("cumulative")}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              mode === "cumulative"
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Cumulative
          </button>
          <button
            onClick={() => setMode("daily")}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              mode === "daily"
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Daily
          </button>
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-2">
        {data.series.map((s) => (
          <span
            key={s.user_id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-container-lowest/70"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLOR_HEX[s.color_key] }}
            />
            {s.name}
            {s.flagged_count > 0 && (
              <span className="text-tertiary text-[10px]">
                ⚠ {s.flagged_count}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* chart */}
      <div className="w-full h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="#E0BFBD"
              strokeOpacity={0.25}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#8C706F" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#8C706F" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (v >= 10000) return `${Math.round(v / 1000)}k`;
                return String(Math.round(v));
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E0BFBD",
                fontSize: 12,
              }}
                           formatter={(value, key) => {
                const num = typeof value === "number" ? value : 0;
                const s = data.series.find((x) => x.user_id === String(key));
                return [
                  formatValue(num, data.activity),
                  s?.name ?? String(key),
                ] as [string, string];
              }}
              labelFormatter={(_l, payload) => {
                const p = payload?.[0]?.payload as
                  | { fullDate?: string }
                  | undefined;
                return `Date: ${p?.fullDate ?? ""}`;
              }}
            />
            {data.series.map((s) => (
              <Line
                key={s.user_id}
                type="monotone"
                dataKey={s.user_id}
                stroke={COLOR_HEX[s.color_key]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLOR_HEX[s.color_key] }}
                activeDot={{ r: 6 }}
                isAnimationActive
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}