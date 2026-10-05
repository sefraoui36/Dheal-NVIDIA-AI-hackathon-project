import { useState } from "react";
import type { TimelineRow, TrustScore } from "../types";
import { InfoTip } from "./InfoTip";

interface Props {
  trustScore: TrustScore;
  timeline: TimelineRow[];
  summary: {
    trusted: number;
    suspicious: number;
    flagged: number;
    total_records: number;
  };
  careForName?: string;
}

type Step = 1 | 2 | 3 | 4;

const EMERGENCY_NUMBERS = {
  ambulance: "15",
  police: "19",
};

export function ActionLadder({
  trustScore,
  summary,
  timeline,
  careForName = "your loved one",
}: Props) {
  const flagged = summary.suspicious + summary.flagged;
  const trustPct = Math.round((summary.trusted / summary.total_records) * 100);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [resolved, setResolved] = useState<null | "fine" | "unsure" | "unwell">(
    null,
  );

  const situation =
    flagged === 0 ? "clear" : flagged <= 1 ? "check" : "careful";

  const tone = {
    clear: {
      bg: "bg-secondary-fixed/25",
      accent: "text-secondary",
      icon: "verified",
      label: "Everything verified",
      headline: "Nothing needs your attention right now.",
    },
    check: {
      bg: "bg-tertiary-fixed/30",
      accent: "text-tertiary",
      icon: "info",
      label: "Worth a quick check",
      headline: "One reading couldn't be verified today.",
    },
    careful: {
      bg: "bg-tertiary-fixed/40",
      accent: "text-tertiary",
      icon: "priority_high",
      label: "A few readings need checking",
      headline: "Follow the steps below.",
    },
  }[situation];

  const flaggedRow = timeline.find((r) => r.verdict !== "TRUSTED");
  const flaggedTime = flaggedRow?.timestamp.slice(11, 16) ?? "today";

  const steps: { n: Step; title: string; body: string; icon: string }[] = [
    {
      n: 1,
      title: "Check the device",
      icon: "watch",
      body: `Is it on their wrist, charged, and snug? Most unusual readings turn out to be a loose strap, a low battery, or a missed measurement.`,
    },
    {
      n: 2,
      title: "Call or message them",
      icon: "call",
      body: `A short, friendly question resolves most uncertainty — no alarms needed.`,
    },
    {
      n: 3,
      title: "Record what they tell you",
      icon: "edit_note",
      body: `Three options. Your answer closes the loop, and this page updates accordingly.`,
    },
    {
      n: 4,
      title: "Know when to seek care",
      icon: "local_hospital",
      body: `Some symptoms mean calling emergency services — regardless of what the app says.`,
    },
  ];

  const answers: {
    key: "fine" | "unsure" | "unwell";
    icon: string;
    label: string;
    sub: string;
    activeClass: string;
    idleClass: string;
  }[] = [
    {
      key: "fine",
      icon: "check_circle",
      label: "They're fine",
      sub: "Talked to them — all good",
      activeClass: "bg-secondary text-on-secondary shadow-md",
      idleClass:
        "bg-secondary-fixed/30 hover:bg-secondary-fixed/50 text-on-secondary-fixed-variant",
    },
    {
      key: "unsure",
      icon: "help",
      label: "Not sure yet",
      sub: "Couldn't reach them, or unclear",
      activeClass: "bg-tertiary text-on-tertiary shadow-md",
      idleClass:
        "bg-tertiary-fixed/40 hover:bg-tertiary-fixed/60 text-on-tertiary-container",
    },
    {
      key: "unwell",
      icon: "warning",
      label: "They're unwell",
      sub: "They reported symptoms",
      activeClass: "bg-error text-on-error shadow-md",
      idleClass:
        "bg-error-container hover:bg-error-container/80 text-on-error-container",
    },
  ];

  return (
    <div
      className={`${tone.bg} rounded-3xl p-6 md:p-8 shadow-md flex flex-col gap-6`}
    >
      {/* header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
          <span
            className={`material-symbols-outlined text-[28px] ${tone.accent}`}
          >
            {tone.icon}
          </span>
        </div>
        <div className="flex-1">
          <span
            className={`text-[11px] font-bold tracking-widest uppercase ${tone.accent}`}
          >
            Caring for {careForName} · {tone.label}
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-on-surface leading-tight">
            {tone.headline}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            <span className="font-mono font-bold text-on-surface">
              {trustPct}%
            </span>{" "}
            of today's data could be verified.
            {flagged > 0 && (
              <>
                {" "}
                {flagged} reading{flagged === 1 ? "" : "s"} couldn't be —{" "}
                Guardian set {flagged === 1 ? "it" : "them"} aside.
              </>
            )}
          </p>
        </div>
        <InfoTip title="About this card" side="bottom">
          <p>
            A flagged reading means the <b>data</b> couldn't be verified. It
            does <b>not</b> mean {careForName} is unwell.
          </p>
          <p className="mt-1">
            The steps below help you decide what, if anything, to do.
          </p>
        </InfoTip>
      </div>

      {/* emergency box — always visible */}
      <div className="bg-error-container/40 rounded-2xl p-4 border-l-4 border-error">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
            emergency
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-title-sm text-title-sm text-on-error-container font-semibold">
              If any of these are true, call emergency services now
            </span>
            <span className="font-body-sm text-body-sm text-on-error-container/90">
              Chest pain · trouble breathing · fainting · confusion · weakness
              on one side
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="px-2.5 py-1 rounded-full bg-error text-on-error font-bold text-[12px]">
                Ambulance {EMERGENCY_NUMBERS.ambulance}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-error text-on-error font-bold text-[12px]">
                Police {EMERGENCY_NUMBERS.police}
              </span>
            </div>
            <span className="text-[10px] text-on-error-container/70 italic mt-1">
              This card never depends on the app or the data.
            </span>
          </div>
        </div>
      </div>

      {/* steps */}
      <div className="flex flex-col gap-2">
        {steps.map((s) => {
          const isCurrent = currentStep === s.n;
          const isPast = currentStep > s.n;
          return (
            <div
              key={s.n}
              className={`rounded-2xl p-4 transition-all ${
                isCurrent
                  ? "bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/40"
                  : isPast
                  ? "bg-surface-container-lowest/50 opacity-70"
                  : "bg-surface-container-low/40 opacity-80"
              }`}
            >
              <button
                onClick={() => setCurrentStep(s.n)}
                className="w-full flex items-start gap-3 text-left"
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isPast
                      ? "bg-secondary-fixed/50 text-secondary"
                      : isCurrent
                      ? "bg-primary-container text-on-primary"
                      : "bg-surface-container-high text-outline"
                  }`}
                >
                  {isPast ? (
                    <span className="material-symbols-outlined text-[16px]">
                      check
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">
                      {s.icon}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-title-sm text-title-sm text-on-surface font-semibold block">
                    {s.title}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant block mt-0.5">
                    {s.body}
                  </span>
                </div>
              </button>

              {isCurrent && s.n === 2 && (
                <div className="mt-3 ml-11 bg-primary-fixed/30 rounded-2xl p-3 flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
                    Try asking
                  </span>
                  <span className="font-body-md text-body-md text-on-surface italic">
                    {flagged > 0
                      ? `"How are you feeling? Did you do anything tiring around ${flaggedTime}?"`
                      : `"How are you feeling today?"`}
                  </span>
                </div>
              )}

              {isCurrent && s.n === 3 && (
                <div className="mt-4 ml-11 flex flex-col gap-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
                    After you talk to them, tap what you learned
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {answers.map((a) => {
                      const active = resolved === a.key;
                      return (
                        <button
                          key={a.key}
                          onClick={() => {
                            setResolved(a.key);
                            setCurrentStep(4);
                          }}
                          className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all ${
                            active ? a.activeClass : a.idleClass
                          }`}
                        >
                          <span className="material-symbols-outlined text-[26px]">
                            {a.icon}
                          </span>
                          <span className="font-label-lg font-bold">
                            {a.label}
                          </span>
                          <span className="text-[10px] opacity-80 text-center leading-tight">
                            {a.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isCurrent && s.n === 4 && resolved && (
                <div className="mt-3 ml-11 rounded-2xl p-4 bg-surface-container-low/60">
                  {resolved === "fine" && (
                    <span className="font-body-sm text-body-sm text-on-surface-variant block">
                      <b className="text-secondary">Resolved:</b> likely a
                      sensor glitch or a normal event. Guardian will keep an
                      eye on future readings. No further action needed today.
                    </span>
                  )}
                  {resolved === "unsure" && (
                    <span className="font-body-sm text-body-sm text-on-surface-variant block">
                      <b className="text-tertiary">Still open:</b> Guardian
                      will flag if the pattern repeats. Consider trying again
                      in a few hours, or ask another family member to check in.
                    </span>
                  )}
                  {resolved === "unwell" && (
                    <span className="font-body-sm text-body-sm text-on-surface-variant block">
                      <b className="text-error">Escalate:</b> if they have any
                      of the emergency symptoms above, call now. Otherwise,
                      contact their doctor or a nurse line. Keep the device on
                      so Guardian can keep recording.
                    </span>
                  )}
                </div>
              )}

              {isCurrent && s.n === 4 && !resolved && (
                <div className="mt-3 ml-11 rounded-2xl p-4 bg-surface-container-low/60 font-body-sm text-body-sm text-on-surface-variant">
                  Go back to step 3 and record what you learned first.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-outline italic leading-relaxed">
        DHeal reports what it verified and does not diagnose. If something
        feels wrong, call a clinician or emergency services — don't wait for
        the app.
      </p>
    </div>
  );
}