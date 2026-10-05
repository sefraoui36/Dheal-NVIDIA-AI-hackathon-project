import { InfoTip } from "./InfoTip";

const REFUSALS = [
  {
    icon: "block",
    text: "Suggest a disease or medical condition",
  },
  {
    icon: "block",
    text: "Recommend a medication, dose, or treatment",
  },
  {
    icon: "block",
    text: "Replace a clinician's judgment",
  },
  {
    icon: "block",
    text: "Draw conclusions from flagged or suspicious data",
  },
];

export function SafetyCard() {
  return (
    <div className="relative overflow-hidden bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-5">
      {/* soft coral aura */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-primary-fixed/40 to-transparent blur-3xl pointer-events-none" />

      {/* header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-fixed/60 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[22px]">
              gpp_good
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                Safety by Design
              </h3>
              <InfoTip title="Why this matters" side="bottom">
                The #1 failure mode of health AI is confidently stating
                something false. DHeal prevents this by constraining the AI at
                the prompt level and refusing to let it reason from unreliable
                evidence.
              </InfoTip>
            </div>
            <span className="text-label-sm text-outline">
              What DHeal will never do
            </span>
          </div>
        </div>
      </div>

      {/* refusals list */}
      <ul className="relative flex flex-col gap-2">
        {REFUSALS.map((r, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-error-container/60 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-error text-[14px]">
                {r.icon}
              </span>
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {r.text}
            </span>
          </li>
        ))}
      </ul>

      {/* what it does */}
      <div className="relative bg-secondary-fixed/20 rounded-2xl p-4 border-l-4 border-secondary">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="material-symbols-outlined text-secondary text-[16px]">
            check_circle
          </span>
          <span className="font-label-lg text-label-lg text-on-secondary-fixed-variant font-semibold">
            What DHeal does instead
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          It explains what changed in your data, which evidence it trusts,
          which evidence it refuses to use, and how confident it is — so
          you and your clinician can decide what to do next.
        </p>
      </div>

      {/* footline */}
      <p className="relative text-[11px] text-outline italic">
        DHeal is not a medical device. It does not diagnose, treat, or
        prescribe. Always consult a qualified clinician for medical decisions.
      </p>
    </div>
  );
}