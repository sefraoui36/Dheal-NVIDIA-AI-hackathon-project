import type { AIAnalysis } from "../types";
import { InfoTip } from "./InfoTip";
import { Mascot } from "./Mascot";

interface Props {
  analysis: AIAnalysis;
}

export function AIInvestigation({ analysis }: Props) {
  const confidenceTone =
    analysis.confidence === "HIGH"
      ? { bg: "bg-secondary-fixed/40", text: "text-on-secondary" }
      : analysis.confidence === "MODERATE"
      ? { bg: "bg-tertiary-fixed/50", text: "text-on-tertiary-container" }
      : { bg: "bg-error-container", text: "text-on-error-container" };

  const mood =
    analysis.confidence === "HIGH"
      ? "happy"
      : analysis.confidence === "MODERATE"
      ? "alert"
      : "concerned";

  // Defensive: some model runs return an error object instead of structured JSON
  const evidence = analysis.evidence_used ?? [];
  const whatChanged = analysis.what_changed ?? [];
  const unreliable = analysis.unreliable_evidence ?? [];
  const nextSteps = analysis.next_steps ?? [];
  const headline = analysis.headline ?? "No analysis available.";
  const confidence = analysis.confidence ?? "LIMITED";
  const confidenceReason = analysis.confidence_reason ?? "";
  const disclaimer = analysis.disclaimer ?? "";

  return (
    <div
  id="ai-investigation"
  className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-md flex flex-col gap-5"
>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Mascot mood={mood} size={36} />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                Nemotron Reasoning Engine
              </h3>
              <InfoTip title="What is Nemotron?" side="bottom">
                An NVIDIA open language model running on Nebius. It reasons over
                the verified evidence DHeal sends it — and refuses to draw
                conclusions from records that were flagged as untrustworthy.
              </InfoTip>
            </div>
            <span className="text-label-sm text-outline">
              Autonomous Biomarker Trust Arbiter
            </span>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-sm font-bold shadow-sm ${confidenceTone.bg} ${confidenceTone.text}`}
        >
          <span className="material-symbols-outlined text-[16px]">
            shield_with_heart
          </span>
          <span>CONFIDENCE: {confidence}</span>
          <InfoTip title="Confidence levels" side="bottom">
            <p>
              <b>HIGH</b> — all evidence is trusted, no ambiguity.
            </p>
            <p className="mt-1">
              <b>MODERATE</b> — trusted data, but some signals are borderline.
            </p>
            <p className="mt-1">
              <b>LIMITED</b> — the key finding depends on flagged or
              unreliable evidence, so no firm conclusion is possible.
            </p>
          </InfoTip>
        </div>
      </div>

      <div className="bg-surface-container-low/50 p-4 rounded-2xl flex flex-col gap-3">
        <h4 className="font-title-sm text-title-sm text-primary font-semibold">
          {headline}
        </h4>
        {whatChanged.length > 0 && (
          <div className="flex flex-col gap-1.5 pl-1">
            {whatChanged.map((bullet, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-tertiary mt-0.5">
                  adjust
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {bullet}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {evidence.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-label-sm text-outline font-semibold tracking-wide">
              EVIDENCE TRUST BREAKDOWN
            </span>
            <InfoTip title="Evidence trust levels" side="top">
              Every piece of evidence DHeal sends to the AI is tagged. The AI
              is only allowed to draw conclusions from <b>TRUSTED</b> items —{" "}
              <b>SUSPICIOUS</b> and <b>FLAGGED</b> items are shown but
              excluded from the reasoning.
            </InfoTip>
          </div>
          <div className="flex flex-wrap gap-2">
            {evidence.map((e, i) => {
              const tone =
                e.trust === "TRUSTED"
                  ? "bg-secondary-fixed/30 text-on-secondary-fixed-variant"
                  : e.trust === "SUSPICIOUS"
                  ? "bg-tertiary-fixed/40 text-on-tertiary-container"
                  : "bg-error-container text-on-error-container";
              const icon =
                e.trust === "TRUSTED"
                  ? "verified"
                  : e.trust === "SUSPICIOUS"
                  ? "warning"
                  : "block";
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-medium ${tone}`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {icon}
                  </span>
                  {String(e.timestamp ?? "").slice(11, 16)} {e.metric} = {e.value}{" "}
                  ({e.trust})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {unreliable.length > 0 && (
        <div className="bg-error-container/30 p-3.5 rounded-2xl flex items-start gap-3">
          <span className="material-symbols-outlined text-error text-[22px] shrink-0">
            policy
          </span>
          <div className="font-body-sm text-body-sm text-on-error-container">
            <strong className="font-semibold">
              Excluded from AI conclusions:
            </strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {unreliable.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {nextSteps.length > 0 && (
        <div className="bg-secondary-fixed/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">
              lightbulb
            </span>
            <span className="text-label-sm font-semibold text-on-secondary-fixed-variant tracking-wide">
              SUGGESTED NEXT STEPS
            </span>
            <InfoTip title="Why these steps?" side="top">
              Non-diagnostic actions the AI suggests based on the verified
              evidence. Never medical advice — always a data-hygiene or general
              wellness action.
            </InfoTip>
          </div>
          <ul className="list-disc list-inside text-body-sm text-on-surface-variant space-y-1">
            {nextSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
          <p className="text-[11px] text-outline mt-2 italic">
            Non-diagnostic actions only. Consult a clinician for medical advice.
          </p>
        </div>
      )}

      <div className="pt-2 flex flex-col gap-1 text-outline text-label-sm">
        {confidenceReason && (
          <span>Confidence rationale: {confidenceReason}</span>
        )}
        {disclaimer && <span className="italic">{disclaimer}</span>}
      </div>
    </div>
  );
}