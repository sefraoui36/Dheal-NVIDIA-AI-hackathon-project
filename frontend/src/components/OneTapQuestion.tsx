interface Props {
  open: boolean;
  onClose: () => void;
}

export function OneTapQuestion({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-on-surface/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-surface-container-lowest rounded-3xl shadow-2xl p-7 flex flex-col gap-5"
      >
        {/* close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-tertiary-fixed/50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-tertiary text-[24px]">
              forum
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-tertiary">
              Coming soon
            </span>
            <h3 className="font-title-lg text-title-lg text-on-surface font-semibold leading-tight">
              One-tap clarification
            </h3>
          </div>
        </div>

        {/* body */}
        <p className="font-body-md text-body-md text-on-surface leading-relaxed">
          In production, this would send a{" "}
          <strong className="font-semibold">single tap question</strong> to the
          wearer's phone — for example:
        </p>

        <div className="bg-surface-container-low/70 rounded-2xl p-4 flex flex-col gap-2">
          <span className="text-label-sm text-outline font-semibold tracking-wide">
            PUSH NOTIFICATION · 3:00 PM
          </span>
          <p className="font-body-md text-body-md text-on-surface">
            Guardian saw an unusual heart rate at 3:00 PM. Were you exercising?
          </p>
          <div className="flex gap-2 mt-1">
            <span className="px-3 py-1 rounded-full bg-secondary-fixed/40 text-on-secondary-fixed-variant text-label-sm font-semibold">
              Yes
            </span>
            <span className="px-3 py-1 rounded-full bg-tertiary-fixed/40 text-on-tertiary-container text-label-sm font-semibold">
              No, I wasn't
            </span>
            <span className="px-3 py-1 rounded-full bg-surface-container-high text-outline text-label-sm font-semibold">
              Not sure
            </span>
          </div>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Their answer resolves the ambiguity in seconds:
        </p>

        <ul className="flex flex-col gap-2 text-body-sm">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">
              check_circle
            </span>
            <span className="text-on-surface-variant">
              <strong className="text-on-surface font-semibold">"Yes"</strong> —
              the spike is logged as a real event, not tampering. Trust restored.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-error mt-0.5">
              warning
            </span>
            <span className="text-on-surface-variant">
              <strong className="text-on-surface font-semibold">"No"</strong> —
              the flag escalates. Guardian keeps the record as unreliable.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-outline mt-0.5">
              help
            </span>
            <span className="text-on-surface-variant">
              <strong className="text-on-surface font-semibold">"Not sure"</strong>{" "}
              — Guardian suggests a re-measure. The flag stays open.
            </span>
          </li>
        </ul>

        <div className="bg-secondary-fixed/20 rounded-2xl p-4 text-body-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-secondary align-middle mr-1">
            lightbulb
          </span>
          This is the missing link between "the data looks weird" and "here's
          what actually happened." It turns an ambiguous flag into a clear
          answer — without needing a doctor.
        </div>

        <div className="text-[11px] text-outline italic text-center">
          This feature is on the roadmap. The current demo lets you see the
          concept but does not send real notifications.
        </div>
      </div>
    </div>
  );
}