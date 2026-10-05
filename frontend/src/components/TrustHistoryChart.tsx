import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import type { TrustHistoryResponse } from "../types";
import { InfoTip } from "./InfoTip";

interface Props {
  userId: string;
  /** Bump this number from the parent to force a reload. */
  refreshSignal?: number;
  /** Called when the user clicks the refresh button — parent should
   *  re-run /ai/analyze, then bump refreshSignal. */
  onRefresh?: () => Promise<void> | void;
}

const TIER_COLORS: Record<string, string> = {
  EXCELLENT: "#4ECDC4",
  GOOD: "#5DD9D0",
  DEGRADED: "#FFB347",
  UNTRUSTWORTHY: "#FF6B6B",
};

export function TrustHistoryChart({
  userId,
  refreshSignal = 0,
  onRefresh,
}: Props) {
  const [data, setData] = useState<TrustHistoryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    try {
      const res = await api.trustHistory(userId, 7);
      setData(res);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("trust history load failed", e);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshSignal]);

  const handleRefresh = async () => {
    if (!onRefresh) {
      // fallback: just reload the history
      setBusy(true);
      await load();
      setTimeout(() => setBusy(false), 400);
      return;
    }
    setBusy(true);
    try {
      await onRefresh(); // parent runs /ai/analyze (updates score + history)
      await load();      // then we re-fetch
    } catch (e) {
      console.error("refresh failed", e);
    } finally {
      setTimeout(() => setBusy(false), 400);
    }
  };

  const chart =
    data?.history.map((h) => ({
      date: h.date.slice(5),
      fullDate: h.date,
      score: h.score,
      tier: h.tier,
    })) ?? [];

  const filled = chart.filter((d) => d.score !== null);
  const latest = filled.length > 0 ? filled[filled.length - 1] : null;

  const strokeColor = latest
    ? TIER_COLORS[latest.tier ?? ""] ?? "#8C706F"
    : "#8C706F";

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary-fixed/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary text-[22px]">
              timeline
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                Trust Score History
              </h3>
              <InfoTip title="Why track this over time?" side="bottom">
                A single Trust Score is a snapshot. The trend shows whether
                your data stream has been reliable — or whether anomalies are
                becoming more frequent. Spikes down mean attacks or sensor
                issues; recovery means the problem was resolved.
              </InfoTip>
            </div>
            <span className="text-label-sm text-outline">
              Last 7 days
              {lastUpdated && (
                <>
                  {" · "}
                  <span className="font-mono">
                    {lastUpdated.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {latest && (
            <div
              className="px-3 py-1.5 rounded-full font-label-sm font-bold shadow-sm"
              style={{
                backgroundColor: `${strokeColor}22`,
                color: strokeColor,
              }}
            >
              Today: {latest.score}
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={busy}
            aria-label="Refresh trust history"
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-secondary hover:bg-surface-container-high transition-all disabled:opacity-50 disabled:cursor-wait"
            title="Re-analyze and refresh"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                busy ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* chart */}
      <div className="h-32 w-full bg-surface-container-low/40 rounded-2xl p-2">
        {chart.length === 0 || filled.length === 0 ? (
          <div className="h-full flex items-center justify-center text-body-sm text-on-surface-variant italic">
            No trust history yet — run an analysis to start tracking.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chart}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="trustGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#8C706F" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tick={{ fontSize: 9, fill: "#8C706F" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #E0BFBD",
                  fontSize: 11,
                }}
                formatter={(v: number, _name, payload) => {
                  const tier = payload?.payload?.tier;
                  return [
                    `${v} / 100${tier ? ` (${tier})` : ""}`,
                    "Trust score",
                  ];
                }}
                labelFormatter={(_l, payload) =>
                  `Date: ${payload?.[0]?.payload?.fullDate ?? ""}`
                }
              />
              <ReferenceLine
                y={70}
                stroke="#8C706F"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={strokeColor}
                strokeWidth={2.5}
                fill="url(#trustGradient)"
                connectNulls
                dot={{ r: 3, fill: strokeColor }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[11px] text-outline italic leading-relaxed">
        Each refresh re-runs Nemotron on the current data and records today's
        trust score. Green = excellent (&ge;90), amber = degraded (40–69),
        red = untrustworthy (&lt;40).
      </p>
    </div>
  );
}