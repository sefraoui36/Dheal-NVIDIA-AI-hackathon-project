import type { Baseline, TimelineRow } from "../types";

interface Props {
  baseline: Baseline;
  timeline: TimelineRow[];
}

interface Drift {
  label: string;
  direction: "up" | "down";
  amount: string;
  metric: string;
}

export function SlowDriftAlert({ timeline }: Props) {
  const drifts = detectDrift(timeline);

  if (drifts.length === 0) return null;

  return (
    <div className="bg-tertiary-fixed/20 rounded-3xl p-6 md:p-7 shadow-md border-l-4 border-tertiary">
      <div className="flex items-center gap-3 mb-3">
        <span className="material-symbols-outlined text-tertiary text-[22px]">
          trending_down
        </span>
        <h3 className="font-title-md text-title-md text-on-surface font-semibold">
          A gentle pattern worth noticing
        </h3>
      </div>

      <ul className="flex flex-col gap-2">
        {drifts.map((d, i) => (
          <li
            key={i}
            className="flex items-start gap-2 font-body-md text-body-md text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px] text-tertiary mt-0.5">
              {d.direction === "up" ? "north_east" : "south_east"}
            </span>
            <span>
              {d.label} has been {d.direction === "up" ? "higher" : "lower"} than
              usual for about a week — about {d.amount} per {d.metric}. Nothing
              urgent, but a friendly question wouldn't hurt.
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function detectDrift(timeline: TimelineRow[]): Drift[] {
  if (timeline.length < 12) return [];

  const mid = Math.floor(timeline.length / 2);
  const older = timeline.slice(0, mid);
  const newer = timeline.slice(mid);

  const avg = (arr: TimelineRow[], key: keyof TimelineRow["metrics"]) =>
    arr.reduce((s, r) => s + (r.metrics[key] as number), 0) / arr.length;

  const drifts: Drift[] = [];

  // sleep — per night, comparable
  const olderSleep = avg(older, "sleep_hours");
  const newerSleep = avg(newer, "sleep_hours");
  const sleepDelta = newerSleep - olderSleep;
  if (Math.abs(sleepDelta) >= 0.5) {
    drifts.push({
      label: "Sleep",
      direction: sleepDelta > 0 ? "up" : "down",
      amount: `${Math.abs(sleepDelta * 60).toFixed(0)} minutes`,
      metric: "night",
    });
  }

  // steps — hourly average × 24 for a daily estimate
  const olderSteps = avg(older, "steps");
  const newerSteps = avg(newer, "steps");
  const stepsDelta = newerSteps - olderSteps;
  if (Math.abs(stepsDelta) >= 60) {
    const perDay = Math.abs(stepsDelta * 24);
    drifts.push({
      label: "Daily activity",
      direction: stepsDelta > 0 ? "up" : "down",
      amount: `${perDay.toFixed(0)} steps`,
      metric: "day",
    });
  }

  // stress — 1-10 scale
  const olderStress = avg(older, "stress_level");
  const newerStress = avg(newer, "stress_level");
  const stressDelta = newerStress - olderStress;
  if (Math.abs(stressDelta) >= 1) {
    drifts.push({
      label: "Stress",
      direction: stressDelta > 0 ? "up" : "down",
      amount: `${Math.abs(stressDelta).toFixed(1)} points`,
      metric: "day",
    });
  }

  return drifts.slice(0, 2);
}