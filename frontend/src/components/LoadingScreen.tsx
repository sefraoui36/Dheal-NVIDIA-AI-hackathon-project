import type { Step } from "../lib/useBootstrap";

interface Props {
  steps: Step[];
}

export function LoadingScreen({ steps }: Props) {
  const completed = steps.filter((s) => s.status === "done").length;
  const progress = (completed / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface">
      {/* soft gradient aura */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-container/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-10 max-w-md px-6">
        {/* mascot + glow */}
        <div className="relative">
          <div className="absolute inset-0 mascot-glow rounded-full bg-gradient-to-tr from-primary-container/60 to-secondary-container/60 blur-2xl" />
          <img
            src="/assets/dheal-mascot.png"
            alt="DHeal Guardian"
            className="relative w-44 h-44 mascot-float drop-shadow-2xl"
          />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-3xl font-bold text-on-surface">
            DHeal Bio-Trust
          </h1>
          <p className="font-body text-body-md text-on-surface-variant">
            Verifying biometric trust chain…
          </p>
        </div>

        {/* progress bar */}
        <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full rounded-full loading-bar transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* step list */}
        <ul className="w-full flex flex-col gap-2">
          {steps.map((step) => (
            <li
              key={step.id}
              className="step-item flex items-center gap-3 text-sm"
            >
              <StepIcon status={step.status} />
              <span
                className={
                  step.status === "done"
                    ? "text-on-surface"
                    : step.status === "running"
                    ? "text-on-surface font-medium"
                    : step.status === "error"
                    ? "text-error"
                    : "text-on-surface-variant"
                }
              >
                {step.label}
                {step.status === "running" && (
                  <span className="inline-flex ml-2 gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-primary dot-thinking inline-block" />
                    <span className="w-1 h-1 rounded-full bg-primary dot-thinking inline-block" />
                    <span className="w-1 h-1 rounded-full bg-primary dot-thinking inline-block" />
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: Step["status"] }) {
  if (status === "done") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-secondary-fixed text-secondary">
        <span className="material-symbols-outlined text-[16px]">check</span>
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-error-container text-error">
        <span className="material-symbols-outlined text-[16px]">close</span>
      </span>
    );
  }
  return (
    <span className="w-5 h-5 rounded-full border-2 border-outline-variant" />
  );
}