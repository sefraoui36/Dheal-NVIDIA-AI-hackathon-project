import { useCallback, useState } from "react";
import { api } from "../api";
import type {
  AIAnalyzeResponse,
  Baseline,
  Integrity,
  TimelineResponse,
} from "../types";

export type StepStatus = "pending" | "running" | "done" | "error";

export interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

export interface BootstrapData {
  integrity: Integrity;
  baseline: Baseline;
  timeline: TimelineResponse;
  ai: AIAnalyzeResponse;
}

const INITIAL_STEPS: Step[] = [
  { id: "ledger", label: "Connecting to health ledger", status: "pending" },
  { id: "integrity", label: "Verifying SHA-256 hash chain", status: "pending" },
  { id: "baseline", label: "Loading personal baseline", status: "pending" },
  { id: "nemotron", label: "Requesting Nemotron analysis", status: "pending" },
];

export function useBootstrap(userId = "user_001") {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [data, setData] = useState<BootstrapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setStep = (id: string, status: StepStatus) =>
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSteps(INITIAL_STEPS);

    try {
      setStep("ledger", "running");
      const integrity = await api.integrity(userId);
      setStep("ledger", "done");

      setStep("integrity", "running");
      await new Promise((r) => setTimeout(r, 250));
      setStep("integrity", "done");

      setStep("baseline", "running");
      const [baseline, timeline] = await Promise.all([
        api.baseline(userId),
        api.timeline(userId, 24),
      ]);
      setStep("baseline", "done");

      setStep("nemotron", "running");
      const ai = await api.analyze(userId, 24);
      setStep("nemotron", "done");

      setData({ integrity, baseline, timeline, ai });
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Unknown error while loading data.";
      setError(msg);
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "running" ? { ...s, status: "error" } : s
        )
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!data) return run();
    try {
      const [integrity, baseline, timeline, ai] = await Promise.all([
        api.integrity(userId),
        api.baseline(userId),
        api.timeline(userId, 24),
        api.analyze(userId, 24),
      ]);
      setData({ integrity, baseline, timeline, ai });
    } catch (e) {
      console.error(e);
    }
  }, [data, userId, run]);

  return { steps, data, error, loading, run, refresh, setData };
}