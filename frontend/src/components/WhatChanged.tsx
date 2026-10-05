import { useEffect, useState } from "react";
import { api } from "../api";
import type { Baseline, PopulationStat, TimelineRow } from "../types";
import { InfoTip } from "./InfoTip";

interface Props {
  baseline: Baseline;
  timeline: TimelineRow[];
}

type Mode = "mine" | "population";

export function WhatChanged({ baseline, timeline }: Props) {
  const [mode, setMode] = useState<Mode>("mine");
  const [population, setPopulation] = useState<Record<string, PopulationStat> | null>(
    null,
  );

  useEffect(() => {
    api
      .populationBaseline()
      .then(setPopulation)
      .catch(() => {});
  }, []);

  const peak = timeline.reduce(
    (max, r) => (r.metrics.heart_rate > max.metrics.heart_rate ? r : max),
    timeline[0],
  );

  const avgHeart = avg(timeline.map((r) => r.metrics.heart_rate));
  const avgStress = avg(timeline.map((r) => r.metrics.stress_level));
  const avgSleep = avg(timeline.map((r) => r.metrics.sleep_hours));

  // ---- steps aggregated to a DAILY average, so it can be compared with
  //      the population reference (7,500 steps/day) ----
  const totalSteps = timeline.reduce((s, r) => s + r.metrics.steps, 0);
  const daysInWindow = Math.max(timeline.length / 24, 1);
  const stepsPerDay = totalSteps / daysInWindow;

  const totalActivity = timeline.reduce(
    (s, r) => s + r.metrics.activity_minutes,
    0,
  );
  const activityPerDay = totalActivity / daysInWindow;

  const hrDelta =
    peak && baseline.metrics.heart_rate
      ? peak.metrics.heart_rate - baseline.metrics.heart_rate.mean
      : 0;

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 md:p-7 shadow-md flex flex-col justify-between gap-5">
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[22px]">
              compare_arrows
            </span>
            <h3 className="font-title-md text-title-md text-on-surface font-semibold">
              What Changed?
            </h3>
            <InfoTip title="My baseline vs population" side="bottom">
              <p>
                <b>My baseline</b> — your personal 14-day average. Best for
                detecting what changed for <i>you</i>.
              </p>
              <p className="mt-1">
                <b>Population</b> — published reference ranges for a healthy
                adult. Best for judging whether your normal is typical.
              </p>
              <p className="mt-1 text-[11px] text-outline">
                In Population mode, steps and activity are aggregated to a
                daily average so they can be compared honestly.
              </p>
            </InfoTip>
          </div>

          <div className="flex items-center gap-1 bg-surface-container-low/60 p-1 rounded-full">
            <button
              onClick={() => setMode("mine")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                mode === "mine"
                  ? "bg-surface-container-lowest shadow-sm text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              My baseline
            </button>
            <button
              onClick={() => setMode("population")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                mode === "population"
                  ? "bg-surface-container-lowest shadow-sm text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Population
            </button>
          </div>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          {mode === "mine"
            ? "Your personal baseline vs the current episode window."
            : "Published adult reference ranges vs your estimated daily averages."}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <div className="grid grid-cols-12 text-outline text-label-sm px-3 py-1">
            <span className="col-span-5">BIOMARKER</span>
            <span className="col-span-3 text-right">
              {mode === "mine" ? "MY BASELINE" : "POPULATION"}
            </span>
            <span className="col-span-4 text-right">
              {mode === "mine" ? "EPISODE" : "MY DAILY AVG"}
            </span>
          </div>

          {/* Heart rate — hourly vs population is fine, both are instantaneous */}
          <Row
            icon="favorite"
            label="Heart Rate"
            base={
              mode === "mine"
                ? `${baseline.metrics.heart_rate.mean.toFixed(0)} BPM`
                : `${population?.heart_rate.mean.toFixed(0) ?? "—"} BPM`
            }
            value={`${peak.metrics.heart_rate} BPM`}
            delta={
              mode === "mine"
                ? hrDelta
                : peak.metrics.heart_rate -
                  (population?.heart_rate.mean ?? 0)
            }
            unit="BPM"
            threshold={mode === "mine" ? 15 : 25}
            hint={mode === "population" ? "episode peak" : undefined}
          />

          {/* Sleep — per-night, both comparable */}
          <Row
            icon="bedtime"
            label="Sleep"
            base={
              mode === "mine"
                ? `${baseline.metrics.sleep_hours.mean.toFixed(1)} h`
                : `${population?.sleep_hours.mean.toFixed(1) ?? "—"} h`
            }
            value={`${avgSleep.toFixed(1)} h`}
            delta={
              mode === "mine"
                ? avgSleep - baseline.metrics.sleep_hours.mean
                : avgSleep - (population?.sleep_hours.mean ?? 0)
            }
            unit="h"
            threshold={mode === "mine" ? 1 : 1.5}
            hint={mode === "population" ? "avg per night" : undefined}
          />

          {/* Steps — now compares DAILY TOTAL to DAILY reference */}
          <Row
            icon="directions_walk"
            label="Steps / day"
            base={
              mode === "mine"
                ? `${baseline.metrics.steps.mean.toFixed(0)}/hr`
                : `${population?.steps.mean.toFixed(0) ?? "—"}/day`
            }
            value={
              mode === "mine"
                ? `${avg(timeline.map((r) => r.metrics.steps)).toFixed(0)}/hr`
                : `${stepsPerDay.toFixed(0)}/day`
            }
            delta={
              mode === "mine"
                ? avg(timeline.map((r) => r.metrics.steps)) -
                  baseline.metrics.steps.mean
                : stepsPerDay - (population?.steps.mean ?? 0)
            }
            unit=""
            threshold={mode === "mine" ? 150 : 3000}
            hint={mode === "population" ? "estimated from window" : undefined}
          />

          {/* Activity — also aggregated to daily */}
          <Row
            icon="fitness_center"
            label="Activity"
            base={
              mode === "mine"
                ? `${baseline.metrics.activity_minutes.mean.toFixed(0)} min/hr`
                : `${population?.activity_minutes.mean.toFixed(0) ?? "—"} min/day`
            }
            value={
              mode === "mine"
                ? `${avg(timeline.map((r) => r.metrics.activity_minutes)).toFixed(0)} min/hr`
                : `${activityPerDay.toFixed(0)} min/day`
            }
            delta={
              mode === "mine"
                ? avg(timeline.map((r) => r.metrics.activity_minutes)) -
                  baseline.metrics.activity_minutes.mean
                : activityPerDay -
                  (population?.activity_minutes.mean ?? 0)
            }
            unit=""
            threshold={mode === "mine" ? 8 : 20}
            hint={mode === "population" ? "estimated from window" : undefined}
          />

          {/* Stress — same scale, both comparable */}
          <Row
            icon="neurology"
            label="Stress"
            base={
              mode === "mine"
                ? `${baseline.metrics.stress_level.mean.toFixed(1)}`
                : `${population?.stress_level.mean.toFixed(1) ?? "—"}`
            }
            value={`${avgStress.toFixed(1)}`}
            delta={
              avgStress -
              (mode === "mine"
                ? baseline.metrics.stress_level.mean
                : population?.stress_level.mean ?? 0)
            }
            unit=""
            threshold={mode === "mine" ? 1.5 : 2}
          />
        </div>

        {mode === "population" && population && (
          <div className="mt-3 text-[10px] text-outline italic leading-relaxed">
            Sources: {population.heart_rate.source} ·{" "}
            {population.sleep_hours.source} · {population.activity_minutes.source}.
            Steps and activity are aggregated to a daily average for honest
            comparison. Reference ranges are for a healthy adult and are for
            context only — not diagnosis.
          </div>
        )}
      </div>

      <div
        className={`p-3.5 rounded-2xl flex items-start gap-2.5 ${
          Math.abs(hrDelta) > 30
            ? "bg-tertiary-fixed/30"
            : "bg-secondary-fixed/20"
        }`}
      >
        <span
          className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
            Math.abs(hrDelta) > 30 ? "text-tertiary" : "text-secondary"
          }`}
        >
          {Math.abs(hrDelta) > 30 ? "insights" : "check_circle"}
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {mode === "mine" ? (
            Math.abs(hrDelta) > 30 ? (
              <>
                <strong className="font-semibold">
                  Physiological discordance:
                </strong>{" "}
                peak HR is {hrDelta.toFixed(0)} BPM above your personal
                baseline with no matching activity or stress ramp.
              </>
            ) : (
              <>
                <strong className="font-semibold">Normal synchrony:</strong>{" "}
                all vitals align with your personal baseline.
              </>
            )
          ) : (
            <>
              <strong className="font-semibold">Population context:</strong>{" "}
              your daily averages are within published reference ranges for a
              healthy adult. Personal baselines are more precise for
              individual tracking.
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function Row({
  icon,
  label,
  base,
  value,
  delta,
  unit,
  threshold,
  hint,
}: {
  icon: string;
  label: string;
  base: string;
  value: string;
  delta: number;
  unit: string;
  threshold: number;
  hint?: string;
}) {
  const significant = Math.abs(delta) > threshold;
  const increasing = delta > 0;

  return (
    <div className="grid grid-cols-12 items-center bg-surface-container-low/50 hover:bg-surface-container-high/40 p-3 rounded-2xl transition-colors">
      <div className="col-span-5 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary">
          {icon}
        </span>
        <span className="font-label-lg text-label-lg text-on-surface font-medium">
          {label}
        </span>
      </div>
      <span className="col-span-3 text-right font-body-md text-body-md text-on-surface-variant">
        {base}
      </span>
      <div className="col-span-4 flex items-center justify-end gap-1.5">
        <span
          className={`font-title-sm text-title-sm font-bold ${
            significant ? "text-error" : "text-on-surface"
          }`}
        >
          {value}
        </span>
        {significant && (
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-semibold">
            {increasing ? "↑" : "↓"} {Math.abs(delta).toFixed(0)}
            {unit}
          </span>
        )}
        {hint && (
          <span className="text-[9px] text-outline italic">{hint}</span>
        )}
      </div>
    </div>
  );
}