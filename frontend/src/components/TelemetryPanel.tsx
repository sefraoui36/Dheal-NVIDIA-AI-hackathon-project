import { useEffect, useState } from "react";
import { api } from "../api";
import type { Telemetry } from "../types";
import { InfoTip } from "./InfoTip";

export function TelemetryPanel() {
  const [data, setData] = useState<Telemetry | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.telemetryLast();
      setData(res);
    } catch (e) {
      console.error("telemetry load failed", e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setBusy(true);
    await load();
    setTimeout(() => setBusy(false), 400);
  };

  const hasCall = data?.latency_ms !== null && data?.latency_ms !== undefined;

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-fixed/50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[20px]">
              bolt
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                Token Factory
              </h3>
              <InfoTip title="What is this?" side="bottom">
                Live telemetry from the last Nemotron call on Nebius Token
                Factory. Shows the exact model, response time, token usage,
                and per-call cost.
              </InfoTip>
            </div>
            <span className="text-label-sm text-outline">
              {data?.provider ?? "Nebius"}
            </span>
          </div>
        </div>
        <button
          onClick={refresh}
          aria-label="Refresh telemetry"
          className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-secondary hover:bg-surface-container-high transition-all"
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

      {/* model */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          MODEL
        </span>
        <div className="inline-flex items-center gap-2 bg-surface-container-low/60 rounded-xl px-3 py-2">
          <span className="material-symbols-outlined text-[16px] text-secondary">
            memory
          </span>
          <span className="font-mono text-[12px] text-on-surface truncate">
            {data?.model ?? "—"}
          </span>
        </div>
      </div>

      {/* metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Latency"
          value={hasCall ? `${data!.latency_ms} ms` : "—"}
          tone={latencyTone(data?.latency_ms ?? null)}
          icon="speed"
        />
        <Metric
          label="Total tokens"
          value={hasCall ? String(data!.total_tokens) : "—"}
          tone="neutral"
          icon="toll"
        />
        <Metric
          label="Cost (USD)"
          value={hasCall ? `$${data!.cost_usd?.toFixed(6)}` : "—"}
          tone="mint"
          icon="payments"
        />
        <Metric
          label="Kind"
          value={data?.kind ?? "—"}
          tone="neutral"
          icon="bolt"
        />
      </div>

      {/* token breakdown */}
      {hasCall && (
        <div className="bg-surface-container-low/50 rounded-2xl p-3 flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
            TOKEN BREAKDOWN
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full bg-secondary"
                style={{
                  width: `${
                    ((data!.prompt_tokens ?? 0) / (data!.total_tokens || 1)) *
                    100
                  }%`,
                }}
              />
            </div>
            <span className="text-[11px] text-on-surface-variant tabular-nums shrink-0">
              {data!.prompt_tokens} in · {data!.completion_tokens} out
            </span>
          </div>
        </div>
      )}

      <p className="text-[11px] text-outline italic leading-relaxed">
        Every DHeal analysis runs on NVIDIA Nemotron via Nebius Token Factory.
        Prices shown are estimates using published per-token rates.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "mint" | "amber" | "red" | "neutral";
  icon: string;
}) {
  const tones = {
    mint: "text-secondary",
    amber: "text-tertiary",
    red: "text-error",
    neutral: "text-on-surface",
  }[tone];

  return (
    <div className="bg-surface-container-low/50 rounded-2xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-outline">
        <span className="material-symbols-outlined text-[12px]">{icon}</span>
        {label}
      </div>
      <span className={`font-title-sm text-title-sm font-bold tabular-nums ${tones}`}>
        {value}
      </span>
    </div>
  );
}

function latencyTone(ms: number | null): "mint" | "amber" | "red" | "neutral" {
  if (ms === null) return "neutral";
  if (ms < 5000) return "mint";
  if (ms < 15000) return "amber";
  return "red";
}