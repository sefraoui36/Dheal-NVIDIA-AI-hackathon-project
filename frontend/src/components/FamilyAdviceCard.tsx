import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { FamilyAdvice } from "../types";
import { Mascot } from "./Mascot";

interface Props {
  userId: string;
  personName: string;
}

export function FamilyAdviceCard({ userId, personName }: Props) {
  const [advice, setAdvice] = useState<FamilyAdvice | null>(null);
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const startedFor = useRef<string | null>(null);

  const load = async (force: boolean) => {
    setLoading(true);
    setTyped("");
    try {
      const res = await api.familyAdvice(userId, force);
      setAdvice(res);
    } catch (e) {
      console.error("advice load failed", e);
      setAdvice(null);
    } finally {
      setLoading(false);
    }
  };

  // load when user changes
  useEffect(() => {
    startedFor.current = null;
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // typing animation whenever the advice text is set
  useEffect(() => {
    if (!advice?.text) return;
    if (startedFor.current === advice.text) return;
    startedFor.current = advice.text;

    setTyped("");
    setTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(advice.text.slice(0, i));
      if (i >= advice.text.length) {
        clearInterval(interval);
        setTyping(false);
      }
    }, 28);
    return () => clearInterval(interval);
  }, [advice]);

  const refresh = async () => {
    setBusy(true);
    await load(true);
    setBusy(false);
  };

  return (
    <div className="relative bg-gradient-to-br from-surface-container-lowest/95 to-surface-container-low/60 backdrop-blur-xl rounded-3xl p-6 shadow-md flex items-start gap-5 overflow-hidden">
      {/* soft aura */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-primary-fixed/30 to-secondary-fixed/20 blur-3xl pointer-events-none" />

      {/* mascot with float animation */}
      <div className="relative shrink-0">
        <div className="mascot-float">
          <Mascot mood={typing ? "calm" : "happy"} size={72} />
        </div>
        {typing && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-fixed/70 flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-[12px] text-primary">
              chat_bubble
            </span>
          </div>
        )}
      </div>

      {/* speech bubble */}
      <div className="relative flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
            DHeal says
          </span>
          <button
            onClick={refresh}
            disabled={busy || loading}
            aria-label="Refresh advice"
            className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-secondary hover:bg-surface-container-high transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                busy ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
          </button>
        </div>

        <div className="bg-surface-container-lowest/90 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-outline-variant/30">
          {loading && !advice && (
            <div className="flex items-center gap-2 text-on-surface-variant italic font-body-sm">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary dot-thinking inline-block" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary dot-thinking inline-block" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary dot-thinking inline-block" />
              </span>
              Asking Nemotron for today's advice…
            </div>
          )}

          {advice && (
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              {typed}
              {typing && (
                <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 align-middle animate-pulse" />
              )}
            </p>
          )}

          {!loading && !advice && (
            <p className="font-body-sm text-body-sm text-on-surface-variant italic">
              Couldn't load today's advice.
            </p>
          )}
        </div>

        {advice && !typing && (
          <span className="text-[10px] text-outline italic">
            For {personName} · generated {new Date(advice.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}