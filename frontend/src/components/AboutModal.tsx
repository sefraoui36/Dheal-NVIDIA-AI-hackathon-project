interface Props {
  open: boolean;
  onClose: () => void;
}

const PIPELINE = [
  {
    icon: "biotech",
    title: "Ingest",
    body: "Wearable health records arrive — heart rate, sleep, steps, stress — one per hour.",
  },
  {
    icon: "fingerprint",
    title: "Verify",
    body: "Every record is fingerprinted with a SHA-256 hash chain. Any change breaks the chain.",
  },
  {
    icon: "query_stats",
    title: "Score",
    body: "Each value is compared against your personal baseline. Impossible or extreme readings are flagged.",
  },
  {
    icon: "neurology",
    title: "Reason",
    body: "Nemotron 3.5 Lightning, running on Nebius Token Factory, analyzes only the trusted evidence.",
  },
];

const STACK = [
  { label: "NVIDIA Nemotron 3.5 Lightning", tone: "mint" },
  { label: "Nebius Token Factory", tone: "coral" },
  { label: "FastAPI + Python", tone: "neutral" },
  { label: "React + TypeScript", tone: "neutral" },
  { label: "SHA-256 hash chain", tone: "amber" },
];

export function AboutModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-on-surface/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-3xl shadow-2xl"
      >
        {/* header */}
        <div className="sticky top-0 z-10 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-outline-variant/30 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/dheal-mascot.png"
              alt="DHeal"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <div className="font-display text-xl font-bold text-on-surface leading-tight">
                DHeal <span className="text-secondary">Bio-Trust</span>
              </div>
              <div className="text-label-sm text-outline">
                Trust the data before trusting the AI
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-8 py-6 flex flex-col gap-8">
          {/* section 1 — the problem */}
          <Section
            badge="THE PROBLEM"
            badgeTone="red"
            title="AI health apps confidently state things that may be false."
          >
            <p>
              Every health app assumes the data it receives is accurate. When
              it isn't — due to sensor error, transmission failure, or
              deliberate tampering — the AI still draws confident conclusions.
            </p>
            <p className="text-outline italic">
              Google Health users report the AI "hallucinating workouts that
              never happened." There is no way for the user to know which
              readings are real.
            </p>
          </Section>

          {/* section 2 — the insight */}
          <Section
            badge="THE INSIGHT"
            badgeTone="amber"
            title="Verify the data before letting the AI reason about it."
          >
            <p>
              DHeal inverts the usual pipeline. Instead of{" "}
              <span className="font-mono text-on-surface-variant">
                data → AI → conclusion
              </span>
              , we run{" "}
              <span className="font-mono text-on-surface">
                data → trust checks → AI → grounded conclusion
              </span>
              .
            </p>
            <p>
              The AI is{" "}
              <strong className="text-on-surface">
                explicitly told which records are trustworthy and which are
                not
              </strong>
              . It's not allowed to draw conclusions from flagged evidence.
            </p>
          </Section>

          {/* section 3 — pipeline */}
          <Section
            badge="THE PIPELINE"
            badgeTone="mint"
            title="Four checks, run on every single record."
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
              {PIPELINE.map((p, i) => (
                <div
                  key={p.title}
                  className="flex flex-col gap-2 p-4 rounded-2xl bg-surface-container-low/60 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-full bg-secondary-fixed/40 flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        {p.icon}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-outline">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="font-title-sm text-title-sm text-on-surface font-semibold">
                    {p.title}
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                    {p.body}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* section 4 — differentiator */}
          <Section
            badge="THE DIFFERENTIATOR"
            badgeTone="mint"
            title="Everyone else assumes the data is real. We refuse to."
          >
            <div className="bg-secondary-fixed/20 rounded-2xl p-5 border-l-4 border-secondary">
              <p className="font-body-md text-body-md text-on-surface">
                When DHeal's Guardian detects a suspicious reading, the AI is
                told:{" "}
                <em className="text-secondary font-semibold not-italic">
                  "This value is 23 standard deviations from the user's
                  baseline. It is not reliable evidence. Do not base any
                  conclusion on it."
                </em>
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-3">
                The AI then refuses to diagnose, drops its confidence to
                LIMITED, and hands back only the conclusions the trusted data
                can actually support.
              </p>
            </div>
          </Section>

          {/* section 5 — stack */}
          <Section
            badge="THE STACK"
            badgeTone="coral"
            title="Built on open infrastructure."
          >
            <div className="flex flex-wrap gap-2">
              {STACK.map((s) => {
                const tone = {
                  mint: "bg-secondary-fixed/40 text-on-secondary",
                  coral: "bg-primary-fixed/60 text-on-primary-fixed-variant",
                  amber: "bg-tertiary-fixed/50 text-on-tertiary-container",
                  neutral:
                    "bg-surface-container-high text-on-surface-variant",
                }[s.tone as "mint" | "coral" | "amber" | "neutral"];
                return (
                  <span
                    key={s.label}
                    className={`px-3 py-1.5 rounded-full text-label-sm font-semibold ${tone}`}
                  >
                    {s.label}
                  </span>
                );
              })}
            </div>
          </Section>

          {/* section 6 — closing pitch */}
          <div className="bg-gradient-to-br from-primary-fixed/40 to-secondary-fixed/30 rounded-3xl p-6 text-center">
            <div className="font-display text-lg font-bold text-on-surface mb-1">
              Every health app tells you what your data means.
            </div>
            <div className="font-display text-lg font-bold text-primary">
              DHeal tells you whether you can believe it.
            </div>
          </div>

          {/* disclaimer */}
          <div className="text-[11px] text-outline italic text-center pb-2">
            DHeal is not a medical device. It does not diagnose disease. All
            AI reasoning is constrained by the trust layer and clearly marked
            with confidence levels.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  badge,
  badgeTone,
  title,
  children,
}: {
  badge: string;
  badgeTone: "mint" | "red" | "amber" | "coral";
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    mint: "bg-secondary-fixed/40 text-on-secondary-fixed-variant",
    red: "bg-error-container text-on-error-container",
    amber: "bg-tertiary-fixed/50 text-on-tertiary-container",
    coral: "bg-primary-fixed/60 text-on-primary-fixed-variant",
  }[badgeTone];

  return (
    <div className="flex flex-col gap-3">
      <span
        className={`self-start inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${tones}`}
      >
        {badge}
      </span>
      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold -mt-1">
        {title}
      </h3>
      <div className="flex flex-col gap-2 font-body-md text-body-md text-on-surface-variant leading-relaxed">
        {children}
      </div>
    </div>
  );
}