import type { ConditionDetail, TimelineRow } from "../types";
import { MiniMetricChart } from "./MiniMetricChart";

interface Props {
  conditionDetails: ConditionDetail[];
  timeline: TimelineRow[];
}

const METRIC_META: Record<
  string,
  { label: string; unit: string; color: string }
> = {
  heart_rate: { label: "Heart Rate", unit: "bpm", color: "#AE2F34" },
  sleep_hours: { label: "Sleep", unit: "h", color: "#845400" },
  steps: { label: "Steps", unit: "", color: "#006A65" },
  activity_minutes: { label: "Activity", unit: "min", color: "#006A65" },
  stress_level: { label: "Stress", unit: "/10", color: "#D9822B" },
};

export function ConditionInsights({ conditionDetails, timeline }: Props) {
  // gather unique metrics across all conditions, preserving order
  const metrics: string[] = [];
  conditionDetails.forEach((c) => {
    c.key_metrics.forEach((m) => {
      if (!metrics.includes(m)) metrics.push(m);
    });
  });

  if (metrics.length === 0 || timeline.length === 0) return null;

  const last24 = timeline.slice(-24);

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-secondary-fixed/40 flex items-center justify-center">
          <span className="material-symbols-outlined text-secondary text-[18px]">
            monitoring
          </span>
        </div>
        <div>
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Key metrics today
          </h3>
          <span className="text-label-sm text-outline">
            Chosen for this person's conditions
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {metrics.slice(0, 3).map((metricKey) => {
          const meta = METRIC_META[metricKey];
          if (!meta) return null;

          const values = last24.map(
            (r) => r.metrics[metricKey as keyof typeof r.metrics] as number,
          );
          const latest = values[values.length - 1] ?? 0;
          const mean =
            values.reduce((a, b) => a + b, 0) / (values.length || 1);
          const diff = latest - mean;

          const sub =
            Math.abs(diff) < 0.5
              ? "steady"
              : `${diff > 0 ? "↑" : "↓"} ${Math.abs(diff).toFixed(1)} ${
                  meta.unit
                } vs usual`;

          return (
            <MiniMetricChart
              key={metricKey}
              label={meta.label}
              value={`${latest.toFixed(
                metricKey === "sleep_hours" ? 1 : 0,
              )} ${meta.unit}`}
              sub={sub}
              values={values}
              color={meta.color}
            />
          );
        })}
      </div>
    </div>
  );
}