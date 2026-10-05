interface Props {
  attacked: boolean;
  busy: boolean;
  onSimulate: () => void;
  onRestore: () => void;
  lastAttackTime: string | null;
}

export function SimulateAttack({
  attacked,
  busy,
  onSimulate,
  onRestore,
  lastAttackTime,
}: Props) {
  return (
    <div className="bg-surface-container-high/50 backdrop-blur-md rounded-3xl p-6 shadow-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">
            science
          </span>
          <h4 className="font-title-sm text-title-sm text-on-surface font-semibold">
            Attack &amp; Resilience Sandbox
          </h4>
        </div>
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            attacked ? "bg-primary animate-ping" : "bg-secondary"
          }`}
        />
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Inject a synthetic adversarial telemetry packet to evaluate autonomous
        quarantine and AI prompt safety.
      </p>

      <button
        onClick={attacked ? onRestore : onSimulate}
        disabled={busy}
        className={`w-full flex items-center justify-center gap-2 font-label-lg py-3 rounded-2xl shadow-md transition-all disabled:opacity-60 disabled:cursor-wait ${
          attacked
            ? "bg-secondary hover:bg-on-secondary text-on-secondary shadow-secondary/30"
            : "bg-primary-container hover:bg-primary text-on-primary shadow-primary-container/30"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">
          {busy ? "hourglass_top" : attacked ? "health_and_safety" : "crisis_alert"}
        </span>
        <span>
          {busy
            ? "Running…"
            : attacked
            ? "Restore Clean Data"
            : "Simulate Synthetic Data Attack"}
        </span>
      </button>

      <div className="bg-surface-container-lowest/80 p-3 rounded-2xl flex items-center gap-2 text-on-surface text-label-sm">
        <span className="material-symbols-outlined text-[18px] text-tertiary">
          security
        </span>
        <span className="truncate">
          {lastAttackTime
              ? `Last attack at ${lastAttackTime} — quarantined automatically`
              : "Sandbox idle: awaiting test vector injection"}
        </span>
      </div>
    </div>
  );
}