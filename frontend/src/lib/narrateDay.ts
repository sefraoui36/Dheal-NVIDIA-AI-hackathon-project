import type { TimelineRow } from "../types";

interface Segment {
  time: string;
  label: string;
  verdict: "TRUSTED" | "SUSPICIOUS" | "FLAGGED";
  hr: number;
}

interface DayNarrative {
  greeting: string;
  paragraphs: string[];
  segments: Segment[];
  trustedCount: number;
  suspiciousCount: number;
  flaggedCount: number;
  peakHr: number;
  peakTime: string;
  sleepHours: number;
  totalSteps: number;
}

export function narrateDay(rows: TimelineRow[]): DayNarrative {
  if (rows.length === 0) {
    return {
      greeting: "No data for this day.",
      paragraphs: [],
      segments: [],
      trustedCount: 0,
      suspiciousCount: 0,
      flaggedCount: 0,
      peakHr: 0,
      peakTime: "—",
      sleepHours: 0,
      totalSteps: 0,
    };
  }

  const trusted = rows.filter((r) => r.verdict === "TRUSTED");
  const suspicious = rows.filter((r) => r.verdict === "SUSPICIOUS");
  const flagged = rows.filter((r) => r.verdict === "FLAGGED");

  const peak = rows.reduce(
    (max, r) => (r.metrics.heart_rate > max.metrics.heart_rate ? r : max),
    rows[0],
  );

  const totalSteps = rows.reduce((s, r) => s + r.metrics.steps, 0);
  const sleepHours = rows[0]?.metrics.sleep_hours ?? 0;

  const wakeRow =
    rows.find((r) => r.timestamp.slice(11, 13) >= "06") ?? rows[0];
  const wakeHour = wakeRow.timestamp.slice(11, 16);

  const segments: Segment[] = rows.map((r) => ({
    time: r.timestamp.slice(11, 16),
    label: labelFor(r),
    verdict: r.verdict,
    hr: r.metrics.heart_rate,
  }));

  const paragraphs: string[] = [];

  // 1. waking
  paragraphs.push(
    `You woke around ${wakeHour} with a heart rate of ${wakeRow.metrics.heart_rate}.`,
  );

  // 2. activity
  if (totalSteps > 2000) {
    paragraphs.push(
      `You were active through the day — about ${totalSteps.toLocaleString()} steps in total.`,
    );
  } else if (totalSteps > 500) {
    paragraphs.push(
      `A fairly calm day — about ${totalSteps.toLocaleString()} steps.`,
    );
  } else {
    paragraphs.push(`A quiet, mostly-resting day.`);
  }

  // 3. peak
  if (peak.metrics.heart_rate > 100) {
    paragraphs.push(
      `Your heart rate peaked at ${peak.metrics.heart_rate} at ${peak.timestamp.slice(
        11,
        16,
      )}.`,
    );
  } else {
    paragraphs.push(
      `Your heart rate stayed in a normal range — peak was ${peak.metrics.heart_rate} bpm.`,
    );
  }

  // 4. trust verdict
  if (flagged.length === 0 && suspicious.length === 0) {
    paragraphs.push(
      `I trust every reading — all ${rows.length} of them passed every check.`,
    );
  } else {
    const parts: string[] = [];
    if (suspicious.length > 0)
      parts.push(
        `${suspicious.length} reading${
          suspicious.length === 1 ? "" : "s"
        } looked unusual`,
      );
    if (flagged.length > 0)
      parts.push(
        `${flagged.length} reading${flagged.length === 1 ? "" : "s"} was impossible`,
      );
    paragraphs.push(
      `${parts.join(" and ")}. I've set them aside — they're not used in any conclusions.`,
    );
  }

  // 5. sleep
  if (sleepHours >= 7) {
    paragraphs.push(`You slept about ${sleepHours.toFixed(1)} hours.`);
  } else if (sleepHours > 0) {
    paragraphs.push(`You slept about ${sleepHours.toFixed(1)} hours — a bit short.`);
  }

  return {
    greeting: `Here's how ${new Date(rows[0].timestamp).toLocaleDateString(
      "en-US",
      { weekday: "long", month: "long", day: "numeric" },
    )} went.`,
    paragraphs,
    segments,
    trustedCount: trusted.length,
    suspiciousCount: suspicious.length,
    flaggedCount: flagged.length,
    peakHr: peak.metrics.heart_rate,
    peakTime: peak.timestamp.slice(11, 16),
    sleepHours,
    totalSteps,
  };
}

function labelFor(r: TimelineRow): string {
  const m = r.metrics;
  if (r.verdict === "SUSPICIOUS") return "Unusual";
  if (r.verdict === "FLAGGED") return "Impossible";
  if (m.steps > 300) return "Active";
  if (m.heart_rate > 90) return "Elevated HR";
  if (m.stress_level >= 6) return "High stress";
  if (m.heart_rate < 65) return "Resting";
  return "Normal";
}