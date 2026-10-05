import { useState } from "react";
import { InfoTip } from "./InfoTip";

interface Ratings {
  nemotronQuality: number;
  tokenFactoryLatency: number;
  setupExperience: number;
}

const QUESTIONS = [
  {
    key: "nemotronQuality" as const,
    label: "Nemotron reasoning quality",
    hint: "Did the AI produce useful, grounded answers?",
  },
  {
    key: "tokenFactoryLatency" as const,
    label: "Token Factory latency",
    hint: "How responsive were the model calls?",
  },
  {
    key: "setupExperience" as const,
    label: "Setup experience",
    hint: "How easy was it to get an API key and start building?",
  },
];

export function FeedbackForm() {
  const [ratings, setRatings] = useState<Ratings>({
    nemotronQuality: 0,
    tokenFactoryLatency: 0,
    setupExperience: 0,
  });
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const setRating = (key: keyof Ratings, value: number) => {
    setRatings((r) => ({ ...r, [key]: value }));
  };

  const submit = () => {
    // Store locally so the demo doesn't need a backend endpoint.
    // Structured payload ready to paste into the Devpost form.
    const payload = {
      ratings,
      note: note.trim() || null,
      timestamp: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(
        localStorage.getItem("dheal_feedback") || "[]",
      );
      existing.push(payload);
      localStorage.setItem("dheal_feedback", JSON.stringify(existing));
    } catch {
      // ignore
    }
    setSubmitted(true);
  };

  const canSubmit = Object.values(ratings).every((v) => v > 0);

  if (submitted) {
    return (
      <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary-fixed/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary text-[22px]">
              check_circle
            </span>
          </div>
          <div>
            <h3 className="font-title-md text-title-md text-on-surface font-semibold">
              Thanks for the feedback
            </h3>
            <span className="text-label-sm text-outline">
              Your answers help improve DHeal
            </span>
          </div>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Your ratings are stored locally for the demo. In production this
          would be sent to the Nebius &amp; NVIDIA team as structured product
          feedback.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="self-start text-label-sm text-outline hover:text-secondary transition-colors underline"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-5">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-tertiary-fixed/40 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-tertiary text-[22px]">
            rate_review
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-title-md text-title-md text-on-surface font-semibold">
              Rate this experience
            </h3>
            <InfoTip title="Why feedback?" side="bottom">
              The Nebius &times; NVIDIA hackathon requires feedback on Token
              Factory, AI Cloud, and the NVIDIA models used. Your answers help
              the team improve the platform for future builders.
            </InfoTip>
          </div>
          <span className="text-label-sm text-outline">
            Nebius Token Factory + Nemotron
          </span>
        </div>
      </div>

      {/* rating rows */}
      <div className="flex flex-col gap-4">
        {QUESTIONS.map((q) => (
          <div key={q.key} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-label-lg text-label-lg text-on-surface font-medium">
                {q.label}
              </span>
              <span className="text-[11px] text-outline italic">
                {ratings[q.key] > 0 ? `${ratings[q.key]} / 5` : "Not rated"}
              </span>
            </div>
            <span className="text-[11px] text-outline -mt-1">{q.hint}</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((v) => {
                const active = ratings[q.key] >= v;
                return (
                  <button
                    key={v}
                    onClick={() => setRating(q.key, v)}
                    aria-label={`Rate ${v} out of 5`}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] ${
                        active ? "text-tertiary" : "text-outline/40"
                      }`}
                      style={{
                        fontVariationSettings: active
                          ? "'FILL' 1, 'wght' 500"
                          : "'FILL' 0, 'wght' 400",
                      }}
                    >
                      star
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* optional note */}
      <div className="flex flex-col gap-2">
        <span className="font-label-lg text-label-lg text-on-surface font-medium">
          Anything else?{" "}
          <span className="text-outline text-label-sm font-normal">
            (optional)
          </span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="What worked, what could be better…"
          className="w-full bg-surface-container-lowest border-[1.5px] border-outline-variant/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl px-4 py-3 text-body-sm outline-none transition-all resize-none"
        />
      </div>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 bg-primary-container hover:bg-primary text-on-primary font-label-lg py-3 rounded-2xl shadow-md shadow-primary-container/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[18px]">send</span>
        <span>Submit feedback</span>
      </button>

      <p className="text-[11px] text-outline italic">
        Stored locally in your browser. Nothing is sent to a server — this
        demo does not collect user data.
      </p>
    </div>
  );
}