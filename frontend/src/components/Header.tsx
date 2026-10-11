interface Props {
  userId: string;
  attacked: boolean;
  busy: boolean;
  view: "analyst" | "family" | "challenges" | "recommendations";
  onSimulate: () => void;
  onRestore: () => void;
  onOpenAbout: () => void;
  onChangeView: (
  view: "analyst" | "family" | "challenges" | "recommendations",
) => void;
}

export function Header({
  userId,
  attacked,
  busy,
  view,
  onSimulate,
  onRestore,
  onOpenAbout,
  onChangeView,
}: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_4px_16px_-2px_rgba(26,26,46,0.04)]">
      <div className="h-20 w-full max-w-[1440px] mx-auto px-6 md:px-12 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/dheal-logo.png"
              alt="DHeal Bio-Trust"
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* view toggle */}
          <div className="hidden md:flex items-center gap-1 bg-surface-container/60 p-1 rounded-full border border-outline-variant/20">
            <button
              onClick={() => onChangeView("analyst")}
              className={`px-4 py-1.5 rounded-full text-label-lg transition-all ${
                view === "analyst"
                  ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Analyst
            </button>
            <button
              onClick={() => onChangeView("family")}
              className={`px-4 py-1.5 rounded-full text-label-lg transition-all ${
                view === "family"
                  ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Family
            </button>
              <button
              onClick={() => onChangeView("recommendations")}
              className={`px-4 py-1.5 rounded-full text-label-lg transition-all flex items-center gap-1.5 ${
                view === "recommendations"
                  ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                today
              </span>
              Today
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-full border border-outline-variant/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
            </span>
            <span className="font-mono text-label-md text-on-surface font-medium">
              {userId}
            </span>
          </div>

          <button
            onClick={onOpenAbout}
            aria-label="About DHeal"
            className="hidden md:flex items-center gap-2 bg-surface-container-high/70 hover:bg-surface-container-high text-on-surface font-label-lg px-4 py-2.5 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>About</span>
          </button>

          <button
            onClick={attacked ? onRestore : onSimulate}
            disabled={busy}
            className={`flex items-center gap-2 font-label-lg px-5 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
              attacked
                ? "bg-secondary hover:bg-on-secondary text-on-secondary shadow-secondary/30"
                : "bg-primary-container hover:bg-primary text-on-primary shadow-primary-container/35"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {attacked ? "health_and_safety" : "shield"}
            </span>
            <span>
              {busy
                ? "Working…"
                : attacked
                ? "Restore Clean"
                : "Simulate Attack"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}