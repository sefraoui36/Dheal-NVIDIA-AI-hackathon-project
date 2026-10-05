import { useEffect, useMemo, useRef, useState } from "react";
import { narrateDay } from "../lib/narrateDay";
import type { TimelineRow } from "../types";
import { Mascot } from "./Mascot";
import { InfoTip } from "./InfoTip";

interface Props {
  timeline: TimelineRow[];
  userId: string;
}

export function ReplayStory({ timeline }: Props) {
  // group rows by day (YYYY-MM-DD)
  const days = useMemo(() => {
    const map = new Map<string, TimelineRow[]>();
    timeline.forEach((r) => {
      const day = r.timestamp.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [timeline]);

  const [dayIndex, setDayIndex] = useState(days.length - 1);
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [scrubProgress, setScrubProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentRows = days[dayIndex]?.[1] ?? [];
  const narrative = useMemo(() => narrateDay(currentRows), [currentRows]);

  // reset when day changes
  useEffect(() => {
    setParagraphIndex(0);
    setTypedText("");
    setIsTyping(false);
    setScrubProgress(0);
  }, [dayIndex]);

  // typewriter effect for the current paragraph
  useEffect(() => {
    const currentText = narrative.paragraphs[paragraphIndex] ?? "";
    if (!currentText) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setTypedText("");

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTypedText(currentText.slice(0, i));
      if (i >= currentText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 22);

    return () => clearInterval(interval);
  }, [narrative.paragraphs, paragraphIndex]);

  // advance to the next paragraph after the current finishes
  useEffect(() => {
    if (isTyping) return;
    if (paragraphIndex >= narrative.paragraphs.length - 1) return;
    const t = setTimeout(() => setParagraphIndex((i) => i + 1), 900);
    return () => clearTimeout(t);
  }, [isTyping, paragraphIndex, narrative.paragraphs.length]);

  // animate the timeline scrubber alongside the narration
  useEffect(() => {
    const total = narrative.paragraphs.length || 1;
    const target = ((paragraphIndex + 1) / total) * 100;
    const start = scrubProgress;
    const duration = 700;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setScrubProgress(start + (target - start) * eased);
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphIndex]);

  // reset button
  const restart = () => {
    setParagraphIndex(0);
    setTypedText("");
  };

  const mascotMood =
    narrative.flaggedCount > 0
      ? "concerned"
      : narrative.suspiciousCount > 0
      ? "alert"
      : "happy";

  return (
    <div
      ref={containerRef}
      className="relative bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-md flex flex-col gap-6 overflow-hidden"
    >
      {/* ambient aura that shifts by mood */}
      <div
        className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
          mascotMood === "concerned"
            ? "bg-error-container/40"
            : mascotMood === "alert"
            ? "bg-tertiary-fixed/30"
            : "bg-secondary-fixed/30"
        }`}
      />

      {/* header */}
      <div className="relative flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[24px]">
            auto_stories
          </span>
          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold tracking-tight">
            Replay a day
          </h2>
          <InfoTip title="What is this?" side="bottom">
            A plain-language narration of a full day. The mascot walks through
            what happened hour by hour and tells you which readings it trusts —
            and which it doesn't.
          </InfoTip>
        </div>

        <button
          onClick={restart}
          className="flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">
            replay
          </span>
          Replay
        </button>
      </div>

      {/* day selector */}
      <div className="relative flex items-center gap-2 overflow-x-auto pb-1">
        {days.map(([day, rows], i) => {
          const flagged = rows.filter((r) => r.verdict !== "TRUSTED").length;
          const active = i === dayIndex;
          return (
            <button
              key={day}
              onClick={() => setDayIndex(i)}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all ${
                active
                  ? "bg-primary-fixed/60 ring-2 ring-primary/30"
                  : "bg-surface-container-low/60 hover:bg-surface-container-high/60"
              }`}
            >
              <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
                {new Date(day).toLocaleDateString("en-US", {
                  weekday: "short",
                })}
              </span>
              <span
                className={`text-[11px] font-mono ${
                  active ? "text-on-primary-fixed-variant" : "text-outline"
                }`}
              >
                {day.slice(5)}
              </span>
              {flagged > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              )}
            </button>
          );
        })}
      </div>

      {/* story area */}
      <div className="relative flex flex-col md:flex-row items-start gap-6">
        {/* mascot with talking animation */}
        <div className="relative shrink-0 mx-auto md:mx-0">
          <Mascot mood={mascotMood} size={96} />
          {isTyping && (
            <>
              {/* speech bubble tail */}
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary-fixed/70 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-[12px] text-primary">
                  chat_bubble
                </span>
              </div>
              {/* typing dots */}
              <div className="absolute bottom-0 right-0 flex gap-0.5 bg-surface-container-lowest rounded-full px-2 py-1 shadow-sm">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" />
                <span
                  className="w-1 h-1 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: "120ms" }}
                />
                <span
                  className="w-1 h-1 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: "240ms" }}
                />
              </div>
            </>
          )}
        </div>

        {/* narration */}
        <div className="flex-1 flex flex-col gap-4 w-full">
          <p className="font-body-md text-body-md text-on-surface-variant italic">
            {narrative.greeting}
          </p>

          <div className="flex flex-col gap-3">
            {/* past paragraphs — fully visible */}
            {narrative.paragraphs
              .slice(0, paragraphIndex)
              .map((p, i) => (
                <p
                  key={i}
                  className="font-body-lg text-body-lg text-on-surface leading-relaxed animate-[fadeIn_0.4s_ease-out]"
                >
                  {p}
                </p>
              ))}

            {/* current paragraph — typed */}
            {paragraphIndex < narrative.paragraphs.length && (
              <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                {typedText}
                {isTyping && (
                  <span className="inline-block w-[2px] h-5 bg-primary ml-0.5 align-middle animate-pulse" />
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* timeline scrubber */}
      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-outline">
          <span>TIMELINE</span>
          <span>
            {narrative.trustedCount} trusted · {narrative.suspiciousCount}{" "}
            suspicious · {narrative.flaggedCount} flagged
          </span>
        </div>

        <div className="relative w-full h-3 rounded-full bg-surface-container-low overflow-hidden">
          {/* colored segments */}
          {narrative.segments.map((s, i) => {
            const width = 100 / narrative.segments.length;
            const color =
              s.verdict === "TRUSTED"
                ? "bg-secondary/60"
                : s.verdict === "SUSPICIOUS"
                ? "bg-tertiary/70"
                : "bg-error/80";
            return (
              <div
                key={i}
                className={`absolute top-0 h-full ${color}`}
                style={{
                  left: `${i * width}%`,
                  width: `${width}%`,
                }}
                title={`${s.time} · ${s.hr} bpm · ${s.label}`}
              />
            );
          })}

          {/* animated playhead */}
          <div
            className="absolute top-0 h-full w-0.5 bg-on-surface shadow-md transition-all duration-700 ease-out"
            style={{ left: `${scrubProgress}%` }}
          />
        </div>

        {/* time labels */}
        <div className="flex items-center justify-between text-[10px] text-outline font-mono">
          <span>{narrative.segments[0]?.time ?? "—"}</span>
          <span>{narrative.segments[narrative.segments.length - 1]?.time ?? "—"}</span>
        </div>
      </div>

      {/* quick stats */}
      <div className="relative grid grid-cols-3 gap-3">
        <Stat label="Peak HR" value={`${narrative.peakHr} bpm`} sub={narrative.peakTime} />
        <Stat label="Steps" value={narrative.totalSteps.toLocaleString()} />
        <Stat label="Sleep" value={`${narrative.sleepHours.toFixed(1)} h`} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface-container-low/50 rounded-2xl p-3 flex flex-col gap-0.5">
      <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
        {label}
      </span>
      <span className="font-title-sm text-title-sm font-bold text-on-surface tabular-nums">
        {value}
      </span>
      {sub && <span className="text-[10px] text-outline">{sub}</span>}
    </div>
  );
}