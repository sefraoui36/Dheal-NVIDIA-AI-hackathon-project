import type { AIAnalysis, TimelineRow } from "../types";

interface Props {
  analysis: AIAnalysis;
  timeline: TimelineRow[];
}

export function FamilySummary({ analysis, timeline }: Props) {
  const trustedHours = timeline.filter((r) => r.verdict === "TRUSTED").length;
  const totalHours = timeline.length;

  const confidencePhrase =
    analysis.confidence === "HIGH"
      ? "Guardian is confident about today's reading."
      : analysis.confidence === "MODERATE"
      ? "Guardian saw mostly normal readings with one thing worth checking."
      : "Some readings today couldn't be verified, so Guardian is holding back from firm conclusions.";

  const headline = analysis.headline.replace(/\.$/, "");
  const coverage =
    trustedHours === totalHours
      ? `All ${totalHours} hourly readings looked normal.`
      : `${trustedHours} of ${totalHours} hourly readings looked normal.`;

  const text = `${headline}. ${coverage} ${confidencePhrase}`;

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 md:p-7 shadow-md flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <img
          src="/assets/dheal-mascot.png"
          alt="Guardian"
          className="w-11 h-11 rounded-2xl object-cover"
        />
        <div>
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Today's summary
          </h3>
          <span className="text-label-sm text-outline">
            Written in plain language
          </span>
        </div>
      </div>

      <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
        {text}
      </p>

      <div className="bg-surface-container-low/60 rounded-2xl p-3 text-body-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px] text-secondary align-middle mr-1">
          info
        </span>
        Guardian does not diagnose. It only reports what it could verify.
      </div>
    </div>
  );
}