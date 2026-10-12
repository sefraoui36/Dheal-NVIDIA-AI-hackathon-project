import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { MoodChatMessage, MoodHealthCheck } from "../types";
import { Mascot } from "./Mascot";

interface Props {
  userId: string;
}

const ACTION_BUTTONS = [
  { icon: "directions_walk", label: "Faire une petite marche" },
  { icon: "air", label: "Exercice de respiration" },
  { icon: "edit_note", label: "Écrire une pensée" },
  { icon: "call", label: "Appeler un proche" },
  { icon: "bedtime", label: "Se reposer" },
  { icon: "check_circle", label: "Une petite tâche" },
];

export function MoodSupportPage({ userId }: Props) {
  const [messages, setMessages] = useState<MoodChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [healthCheck, setHealthCheck] = useState<MoodHealthCheck | null>(null);
  const [healthCheckBusy, setHealthCheckBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load suggestions on mount
  useEffect(() => {
    api.moodSuggestions().then((r) => setSuggestions(r.suggestions));
  }, []);

  // Auto-scroll to bottom whenever messages change OR when busy toggles
  useEffect(() => {
    if (!scrollRef.current) return;
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 120);
    return () => clearTimeout(id);
  }, [messages, busy]);

  // Mascot mood — reacts to context
  const mascotMood = useMemo(() => {
    if (crisis) return "concerned";
    if (busy) return "calm";
    if (messages.length === 0) return "happy";
    const last = messages[messages.length - 1];
    if (last.crisis) return "concerned";
    if (last.source === "health_check") return "alert";
    return "happy";
  }, [crisis, busy, messages]);

  const send = async (text: string, forceHealth = false) => {
    if (!text.trim() || busy) return;
    setInput("");
    setBusy(true);

    setMessages((m) => [...m, { role: "user", text: text.trim() }]);

    try {
      const res = await api.moodSupportChat(userId, text.trim(), forceHealth);
      setMessages((m) => [
        ...m,
        {
          role: "guardian",
          text: res.reply,
          source: res.source,
          crisis: res.crisis,
          health_context_used: res.health_context_used,
          timestamp: res.timestamp,
        },
      ]);
      if (res.crisis) setCrisis(true);
    } catch (e) {
      console.error(e);
      setMessages((m) => [
        ...m,
        {
          role: "guardian",
          text: "Je n'ai pas pu joindre Guardian pour le moment. Réessayez dans un instant.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const runHealthCheck = async () => {
    setHealthCheckBusy(true);
    try {
      const res = await api.moodHealthCheck(userId);
      setHealthCheck(res);
      setMessages((m) => [
        ...m,
        {
          role: "user",
          text: "Est-ce que mon état affecte ma santé selon mes données ?",
        },
      ]);
      const summary =
        res.patterns.length === 0
          ? res.summary
          : `${res.summary}\n\n` +
            res.patterns.map((p) => `• ${p}`).join("\n");
      setMessages((m) => [
        ...m,
        {
          role: "guardian",
          text: summary,
          source: "health_check",
          health_context_used: true,
          timestamp: res.timestamp,
        },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setHealthCheckBusy(false);
    }
  };

  return (
    <div className="w-full max-w-[900px] mx-auto px-6 md:px-12 py-8 flex flex-col gap-6">
      {/* ─── HERO ─────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-primary-fixed/40 via-surface-container-lowest to-secondary-fixed/30 rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row items-start md:items-center gap-6 overflow-hidden">
        {/* animated aura */}
        <div className="mood-aura absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-primary-fixed/60 via-white/20 to-secondary-fixed/40 blur-3xl pointer-events-none" />
        <div className="mood-aura absolute -bottom-32 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-tertiary-fixed/40 to-transparent blur-3xl pointer-events-none" style={{ animationDelay: "2s" }} />

        {/* mascot with float + breathe */}
        <div className="relative shrink-0">
          <div className="mascot-float">
            <div className="mascot-breathe">
              <Mascot mood={mascotMood} size={96} />
            </div>
          </div>
          {/* soft pulse ring around the mascot */}
          <div className="absolute inset-0 -m-3 rounded-full bg-primary-fixed/20 blur-xl pointer-events-none" />
        </div>

        <div className="relative flex-1">
          <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
            Compagnon de bien-être · unique à DHeal
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface leading-tight mt-1">
            Comment vous sentez-vous ?
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-lg">
            Guardian connaît vos données santé — sommeil, stress, activité. Il
            croise votre humeur avec vos vrais chiffres pour vous répondre
            précisément.
          </p>
        </div>
      </div>

      {/* ─── HEALTH CHECK RESULT ──────────────────────────── */}
      {healthCheck && (
        <div className="bg-secondary-fixed/30 rounded-3xl p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              monitoring
            </span>
            <span className="font-title-sm text-title-sm text-on-secondary-fixed-variant font-semibold">
              Ce que disent vos données
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {healthCheck.mood_avg_7d !== null && (
              <AnimatedStatCard
                label="Humeur 7j"
                value={healthCheck.mood_avg_7d}
                suffix="/5"
                decimals={2}
                tone="coral"
              />
            )}
            {healthCheck.sleep_avg_7d !== null && (
              <AnimatedStatCard
                label="Sommeil 7j"
                value={healthCheck.sleep_avg_7d}
                suffix="h"
                decimals={2}
                tone="mint"
              />
            )}
            {healthCheck.stress_avg_7d !== null && (
              <AnimatedStatCard
                label="Stress 7j"
                value={healthCheck.stress_avg_7d}
                suffix="/10"
                decimals={2}
                tone="amber"
              />
            )}
          </div>

          {healthCheck.patterns.length > 0 && (
            <ul className="flex flex-col gap-1 mt-1">
              {healthCheck.patterns.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-body-sm text-on-surface stat-fade"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">
                    arrow_right
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-outline italic mt-1">
            Pas un diagnostic. Juste une observation de vos propres chiffres.
          </p>
        </div>
      )}

      {/* ─── CRISIS BANNER ────────────────────────────────── */}
      {crisis && (
        <div className="crisis-pulse bg-error-container/40 rounded-2xl p-4 flex items-start gap-3 border border-error/30">
          <span className="material-symbols-outlined text-error text-[22px] shrink-0 mt-0.5 icon-shake">
            emergency
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-title-sm text-title-sm text-on-error-container font-semibold">
              Si vous êtes en danger, contactez quelqu'un maintenant
            </span>
            <span className="font-body-sm text-body-sm text-on-error-container/90">
              Appelez une personne de confiance ou les services d'urgence
              locaux (SAMU 15 · Police 19). Vous n'êtes pas seul(e).
            </span>
          </div>
        </div>
      )}

      {/* ─── HEALTH-CHECK BUTTON ──────────────────────────── */}
      <button
        onClick={runHealthCheck}
        disabled={healthCheckBusy}
        className="btn-lift btn-shimmer flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-secondary-fixed/50 hover:bg-secondary-fixed/70 text-on-secondary-fixed-variant font-label-lg font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-wait"
      >
        <span
          className={`material-symbols-outlined text-[20px] ${
            healthCheckBusy ? "animate-spin" : ""
          }`}
        >
          {healthCheckBusy ? "progress_activity" : "analytics"}
        </span>
        {healthCheckBusy
          ? "Analyse de vos données…"
          : "Est-ce que ça affecte ma santé ?"}
      </button>

      {/* ─── CHAT WINDOW ──────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-5 md:p-6 shadow-md flex flex-col gap-4 h-[500px] overflow-y-auto scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="mascot-float">
              <Mascot mood="happy" size={60} />
            </div>
            <span className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Commencez par toucher une suggestion ci-dessous, ou écrivez votre
              propre message.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}

          {busy && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-1 mascot-breathe">
                <Mascot mood="calm" size={36} />
              </div>
              <div className="bg-surface-container-low/70 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-on-surface-variant italic font-body-sm">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary thinking-dot" />
                    <span className="w-2 h-2 rounded-full bg-primary thinking-dot" />
                    <span className="w-2 h-2 rounded-full bg-primary thinking-dot" />
                  </span>
                  Guardian réfléchit…
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── SUGGESTIONS ──────────────────────────────────── */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map((s, i) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="suggestion-pill px-4 py-2 rounded-full bg-surface-container-low/70 text-on-surface-variant hover:text-on-surface text-label-sm font-medium disabled:opacity-50 stat-fade"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ─── INPUT BAR ────────────────────────────────────── */}
      <div className="bg-surface-container-lowest/90 rounded-3xl p-3 shadow-md flex items-end gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Écrivez comment vous vous sentez…"
          disabled={busy}
          className="flex-1 bg-transparent px-3 py-3 text-body-md outline-none"
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="btn-lift w-11 h-11 rounded-2xl bg-primary-container hover:bg-primary text-on-primary flex items-center justify-center shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px]">
            {busy ? "progress_activity" : "send"}
          </span>
        </button>
      </div>

      {/* ─── ACTION BUTTONS ──────────────────────────────── */}
      {messages.length > 0 && (
        <div className="bg-surface-container-low/50 rounded-3xl p-5 flex flex-col gap-3">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
            Essayez une petite action
          </span>
          <div className="flex flex-wrap gap-2">
            {ACTION_BUTTONS.map((a) => (
              <button
                key={a.label}
                onClick={() => send(`Je vais essayer : ${a.label}`)}
                disabled={busy}
                className="action-btn flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface-container-lowest/70 hover:bg-surface-container-high/70 text-on-surface text-label-sm font-medium transition-all disabled:opacity-50 btn-lift"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary action-icon">
                  {a.icon}
                </span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── DISCLAIMER ──────────────────────────────────── */}
      <p className="text-[11px] text-outline italic text-center max-w-lg mx-auto">
        Guardian est un compagnon de bien-être, pas un thérapeute ni un médecin.
        Il ne diagnostique ni ne traite rien. En cas de crise, contactez les
        services d'urgence locaux (SAMU 15 · Police 19).
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function AnimatedStatCard({
  label,
  value,
  suffix,
  decimals,
  tone,
}: {
  label: string;
  value: number;
  suffix: string;
  decimals: number;
  tone: "coral" | "mint" | "amber";
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const tones = {
    coral: "bg-primary-fixed/50 text-on-primary-fixed-variant",
    mint: "bg-secondary-fixed/60 text-on-secondary-fixed-variant",
    amber: "bg-tertiary-fixed/50 text-on-tertiary-container",
  };

  return (
    <div
      className={`${tones[tone]} rounded-2xl p-3 flex flex-col gap-1 stat-fade`}
    >
      <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">
        {label}
      </span>
      <span className="font-title-md text-title-md font-bold tabular-nums">
        {display.toFixed(decimals)}
        {suffix}
      </span>
    </div>
  );
}

function ChatBubble({ message }: { message: MoodChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end bubble-in-right">
        <div className="max-w-[80%] bg-primary-container text-on-primary rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
          <p className="font-body-md text-body-md whitespace-pre-line">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  const usedHealth = message.health_context_used;
  const isCrisis = message.crisis;

  return (
    <div className="flex items-start gap-3 bubble-in-left">
      <div className="shrink-0 mt-1">
        <Mascot mood={isCrisis ? "concerned" : "happy"} size={36} />
      </div>
      <div
        className={`flex-1 max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm ${
          isCrisis
            ? "bg-error-container/40 border border-error/30"
            : "bg-surface-container-low/70"
        }`}
      >
        <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-line">
          {message.text}
        </p>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {message.source && (
            <span className="text-[10px] text-outline">
              {message.source === "nemotron_nano" ||
              message.source === "nemotron_lightning"
                ? "Nemotron · Nebius"
                : message.source === "health_check"
                ? "Analyse santé"
                : "Réponse de la bibliothèque"}
            </span>
          )}
          {usedHealth && (
            <span className="badge-in inline-flex items-center gap-1 text-[10px] text-secondary font-semibold">
              <span className="material-symbols-outlined text-[11px]">
                verified
              </span>
              Données prises en compte
            </span>
          )}
        </div>
      </div>
    </div>
  );
}