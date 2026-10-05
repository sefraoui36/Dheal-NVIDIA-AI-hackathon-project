import type { ConditionDetail, TimelineRow } from "../types";

interface Props {
  conditionDetails: ConditionDetail[];
  timeline: TimelineRow[];
  personName: string;
}

export function ConditionalSuggestions({
  conditionDetails,
  timeline,
  personName,
}: Props) {
  const last24 = timeline.slice(-24);
  if (last24.length === 0) return null;

  const avg = (key: keyof TimelineRow["metrics"]) =>
    last24.reduce((s, r) => s + (r.metrics[key] as number), 0) / last24.length;

  const baseline = {
    heart_rate: 74,
    sleep_hours: 7,
    steps: 300,
    activity_minutes: 30,
    stress_level: 4,
  };

  const active: { condition: ConditionDetail; text: string }[] = [];

  conditionDetails.forEach((c) => {
    c.suggestions.forEach((s) => {
      let fires = false;
      switch (s.trigger) {
        case "always":
          fires = true;
          break;
        case "low_sleep":
          fires = avg("sleep_hours") < baseline.sleep_hours - 0.5;
          break;
        case "high_hr":
          fires = avg("heart_rate") > baseline.heart_rate + 6;
          break;
        case "low_steps":
          fires = avg("steps") < baseline.steps - 40;
          break;
        case "low_activity":
          fires = avg("activity_minutes") < baseline.activity_minutes - 5;
          break;
        case "high_activity":
          fires = avg("activity_minutes") > baseline.activity_minutes + 8;
          break;
        case "high_stress":
          fires = avg("stress_level") > baseline.stress_level + 1;
          break;
        default:
          fires = false;
      }
      if (fires) active.push({ condition: c, text: s.text });
    });
  });

  if (active.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-tertiary-fixed/40 flex items-center justify-center">
          <span className="material-symbols-outlined text-tertiary text-[18px]">
            lightbulb
          </span>
        </div>
        <div>
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Suggestions for {personName}
          </h3>
          <span className="text-label-sm text-outline">
            General well-being prompts — never medical advice
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {active.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-surface-container-low/50 rounded-2xl p-3.5"
          >
            <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0 mt-0.5">
              arrow_right
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
                {item.condition.label}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface">
                {item.text}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 text-[11px] text-outline italic">
        {conditionDetails.map((c, i) => (
          <span key={i}>{c.disclaimer}</span>
        ))}
      </div>
    </div>
  );
}