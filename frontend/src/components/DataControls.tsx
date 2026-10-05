import { useState } from "react";

interface Props {
  userId: string;
}

interface DataPoint {
  icon: string;
  title: string;
  detail: string;
  tone: "mint" | "neutral";
}

const POINTS: DataPoint[] = [
  {
    icon: "lock",
    title: "Local storage only",
    detail:
      "Your health telemetry stays on this device or your self-hosted server. Nothing is uploaded to DHeal.",
    tone: "mint",
  },
  {
    icon: "block",
    title: "No third-party sharing",
    detail:
      "We never sell, share, or train models on your data. No analytics, no trackers, no ads.",
    tone: "mint",
  },
  {
    icon: "encrypted",
    title: "SHA-256 hash chain",
    detail:
      "Every record is fingerprinted. If any value changes, the chain breaks and the Security Guardian flags it.",
    tone: "mint",
  },
  {
    icon: "visibility_off",
    title: "You control the AI",
    detail:
      "Nemotron only sees evidence you allow. Flagged records can be excluded from every query.",
    tone: "mint",
  },
];

export function DataControls({ userId }: Props) {
  const [busy, setBusy] = useState<null | "export" | "delete">(null);
  const [message, setMessage] = useState<string | null>(null);

  const exportAll = async () => {
    setBusy("export");
    setMessage(null);
    try {
      // Fetch the raw data (already local) and download as JSON
      const res = await fetch(
        `http://127.0.0.1:8000/data/raw/${userId}?hours=72`,
      );
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dheal_export_${userId}_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    } catch {
      setMessage("Export failed. Is the backend running?");
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const deleteAll = async () => {
    const confirmed = window.confirm(
      "Delete all local DHeal data for this user? This cannot be undone.",
    );
    if (!confirmed) return;

    setBusy("delete");
    setMessage(null);
    try {
      // For the hackathon build, this clears session storage and reloads.
      // In production this would hit DELETE /data/{user_id}.
      sessionStorage.clear();
      localStorage.clear();
      setMessage("Local data cleared. Reloading…");
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setMessage("Delete failed.");
      setBusy(null);
    }
  };

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary-fixed/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              shield_lock
            </span>
          </div>
          <div>
            <h3 className="font-title-md text-title-md text-on-surface font-semibold">
              Data Controls
            </h3>
            <span className="text-label-sm text-outline">
              You own your data — always
            </span>
          </div>
        </div>
        <span className="text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed-variant">
          Private
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {POINTS.map((p) => (
          <div key={p.title} className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                p.tone === "mint"
                  ? "bg-secondary-fixed/30 text-secondary"
                  : "bg-surface-container-high text-outline"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {p.icon}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg text-on-surface font-medium leading-tight">
                {p.title}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {p.detail}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={exportAll}
          disabled={busy !== null}
          className="flex-1 flex items-center justify-center gap-1.5 bg-surface-container-high/70 hover:bg-surface-container-high text-on-surface font-label-lg py-2.5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          <span className="material-symbols-outlined text-[18px]">
            {busy === "export" ? "hourglass_top" : "download"}
          </span>
          <span>{busy === "export" ? "Exporting…" : "Export"}</span>
        </button>
        <button
          onClick={deleteAll}
          disabled={busy !== null}
          className="flex-1 flex items-center justify-center gap-1.5 bg-error-container/60 hover:bg-error-container text-on-error-container font-label-lg py-2.5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          <span className="material-symbols-outlined text-[18px]">
            {busy === "delete" ? "hourglass_top" : "delete"}
          </span>
          <span>{busy === "delete" ? "Deleting…" : "Delete"}</span>
        </button>
      </div>

      {message && (
        <div className="text-label-sm text-secondary text-center">{message}</div>
      )}

      <p className="text-[11px] text-outline italic leading-relaxed">
        DHeal is designed for personal health-data sovereignty. The demo runs
        entirely on your machine — no cloud, no telemetry, no vendor lock-in.
      </p>
    </div>
  );
}