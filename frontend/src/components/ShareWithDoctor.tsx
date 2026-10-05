import { useState } from "react";
import { api } from "../api";

interface Props {
  userId: string;
}

export function ShareWithDoctor({ userId }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const blob = await api.reportPdf(userId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dheal_report_${userId}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not generate report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-fixed/60 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[20px]">
            clinical_notes
          </span>
        </div>
        <div>
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Share with Doctor
          </h3>
          <span className="text-label-sm text-outline">
            Clinician-ready PDF report
          </span>
        </div>
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Exports a printable summary with the trust score, verified timeline,
        flagged records, and the AI's reasoning. Built for a 30-second read
        by a clinician.
      </p>

      <button
        onClick={download}
        disabled={busy}
        className={`w-full flex items-center justify-center gap-2 font-label-lg py-3 rounded-2xl shadow-md transition-all disabled:opacity-60 disabled:cursor-wait ${
          done
            ? "bg-secondary text-on-secondary shadow-secondary/30"
            : "bg-primary-container hover:bg-primary text-on-primary shadow-primary-container/30"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">
          {busy ? "hourglass_top" : done ? "check_circle" : "download"}
        </span>
        <span>
          {busy
            ? "Generating report…"
            : done
            ? "Report downloaded"
            : "Download PDF Report"}
        </span>
      </button>

      {error && (
        <div className="bg-error-container/40 text-on-error-container rounded-xl p-2.5 text-[12px]">
          {error}
        </div>
      )}

      <div className="text-[11px] text-outline italic">
        The report is generated locally from this browser session. DHeal does
        not store or transmit your data to any third party.
      </div>
    </div>
  );
}