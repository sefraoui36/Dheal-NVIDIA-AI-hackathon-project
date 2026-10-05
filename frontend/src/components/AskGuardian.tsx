import { useState } from "react";
import { api } from "../api";
import type { AskResponse } from "../types";
import { Mascot } from "./Mascot";

interface Props {
  userId: string;
}

const SUGGESTED = [
  "Why did my heart rate spike?",
  "Was I sleeping well this week?",
  "Is anything unusual in my data?",
];

export function AskGuardian({ userId }: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    { q: string; a: AskResponse["answer"] | null; error?: string }[]
  >([]);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setQuestion("");

    setHistory((h) => [...h, { q, a: null }]);

    try {
      const res = await api.ask(userId, q);
      setHistory((h) =>
        h.map((item, i) =>
          i === h.length - 1 ? { ...item, a: res.answer } : item
        )
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Guardian could not answer.";
      setHistory((h) =>
        h.map((item, i) =>
          i === h.length - 1 ? { ...item, error: msg } : item
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 md:p-7 shadow-md flex flex-col gap-5 overflow-hidden">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-primary-container/20 to-secondary-container/20 blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-3">
        <Mascot mood={loading ? "calm" : "happy"} size={44} />
        <div>
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Ask Guardian
          </h3>
          <span className="text-label-sm text-outline">
            Answers only from verified data
          </span>
        </div>
      </div>

      {history.length > 0 && (
        <div className="relative flex flex-col gap-4 max-h-96 overflow-y-auto pr-1">
          {history.map((item, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-primary-container text-on-primary rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                  <p className="font-body-sm text-body-sm">{item.q}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mascot
                  mood={loading && i === history.length - 1 ? "calm" : "happy"}
                  size={32}
                  className="shrink-0 mt-1"
                />
                <div className="flex-1 max-w-[90%] bg-surface-container-low/70 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  {item.a === null && !item.error && (
                    <div className="flex items-center gap-2 text-on-surface-variant italic font-body-sm">
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary dot-thinking inline-block" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary dot-thinking inline-block" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary dot-thinking inline-block" />
                      </span>
                      Guardian is reasoning over verified evidence…
                    </div>
                  )}

                  {item.error && (
                    <p className="text-error font-body-sm">{item.error}</p>
                  )}

                  {item.a && <AnswerBlock answer={item.a} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 && !loading && (
        <div className="relative flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-label-sm px-3 py-2 rounded-full bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(question)}
          placeholder="Ask about your health data…"
          className="flex-1 bg-surface-container-lowest border-[1.5px] border-outline-variant/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl px-4 py-3 text-body-md outline-none transition-all"
          disabled={loading}
        />
        <button
          onClick={() => ask(question)}
          disabled={loading || !question.trim()}
          className="bg-primary-container hover:bg-primary text-on-primary font-label-lg px-5 py-3 rounded-2xl shadow-md shadow-primary-container/30 transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin">
              progress_activity
            </span>
          ) : (
            <span className="material-symbols-outlined">send</span>
          )}
        </button>
      </div>
    </div>
  );
}

function AnswerBlock({ answer }: { answer: AskResponse["answer"] }) {
  const confidenceTone =
    answer.confidence === "HIGH"
      ? "bg-secondary-fixed/40 text-on-secondary"
      : answer.confidence === "MODERATE"
      ? "bg-tertiary-fixed/50 text-on-tertiary-container"
      : "bg-error-container text-on-error-container";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${confidenceTone}`}
        >
          {answer.confidence}
        </span>
        <span className="text-[11px] text-outline">
          {answer.evidence_used.length} evidence items
        </span>
      </div>

      <p className="font-body-sm text-body-sm text-on-surface">
        {answer.answer}
      </p>

      {answer.evidence_used.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {answer.evidence_used.slice(0, 4).map((e, i) => {
            const tone =
              e.trust === "TRUSTED"
                ? "bg-secondary-fixed/30 text-on-secondary-fixed-variant"
                : e.trust === "SUSPICIOUS"
                ? "bg-tertiary-fixed/40 text-on-tertiary-container"
                : "bg-error-container text-on-error-container";
            return (
              <span
                key={i}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tone}`}
              >
                {e.timestamp.slice(11, 16)} · {e.metric} = {e.value}
              </span>
            );
          })}
        </div>
      )}

      {answer.caveats.length > 0 && (
        <div className="bg-tertiary-fixed/30 rounded-xl p-2.5 text-[12px] text-on-tertiary-container">
          <strong className="font-semibold">Caveats:</strong>{" "}
          {answer.caveats.join(" · ")}
        </div>
      )}

      {answer.next_steps.length > 0 && (
        <div className="bg-secondary-fixed/20 rounded-xl p-2.5">
          <div className="text-[10px] font-semibold text-on-secondary-fixed-variant mb-1 tracking-wide">
            NEXT STEPS
          </div>
          <ul className="list-disc list-inside text-[12px] text-on-surface-variant space-y-0.5">
            {answer.next_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-[11px] text-outline italic">
        {answer.disclaimer}
      </div>
    </div>
  );
}