interface Props {
  message: string;
  onRetry: () => void;
}

export function ErrorScreen({ message, onRetry }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface">
      <div className="relative flex flex-col items-center gap-6 max-w-md px-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-error-container/50 blur-2xl" />
          <img
            src="/assets/dheal-mascot.png"
            alt="DHeal Guardian"
            className="relative w-32 h-32 mascot-shake drop-shadow-xl"
          />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-bold text-on-surface">
            Guardian couldn't reach the vault
          </h2>
          <p className="font-body text-body-md text-on-surface-variant break-words">
            {message}
          </p>
          <p className="font-body text-body-sm text-outline">
            Check that the FastAPI server is running at{" "}
            <code className="font-mono">127.0.0.1:8000</code>.
          </p>
        </div>

        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-primary-container hover:bg-primary text-on-primary font-label px-5 py-3 rounded-full shadow-lg shadow-primary-container/40 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Retry connection
        </button>
      </div>
    </div>
  );
}