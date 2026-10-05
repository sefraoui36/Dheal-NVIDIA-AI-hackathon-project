import { useState } from "react";
import type { Profile } from "../types";

interface Props {
  profile: Profile;
}

export function BabyTracker({ profile }: Props) {
  const [kickCount, setKickCount] = useState(0);
  const [appointments, setAppointments] = useState<string[]>([
    "OB check-up · Next Tuesday 10:00",
  ]);
  const [newNote, setNewNote] = useState("");

  if (!profile.pregnancy) return null;

  const weeksLeft = Math.round(
    (new Date(profile.pregnancy.due_date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24 * 7),
  );

  const addNote = () => {
    if (!newNote.trim()) return;
    setAppointments((a) => [...a, newNote.trim()]);
    setNewNote("");
  };

  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 shadow-md flex flex-col gap-4 border-l-4 border-error/40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-error-container/50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-error text-[22px]">
            child_friendly
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">
            Baby tracker · Week {profile.pregnancy.week}
          </h3>
          <span className="text-label-sm text-outline">
            {weeksLeft > 0
              ? `About ${weeksLeft} weeks to go`
              : "Due date is close"}
          </span>
        </div>
      </div>

      {/* baby tracker cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* kick counter */}
        <div className="bg-surface-container-low/60 rounded-2xl p-4 flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
            Kick count today
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-on-surface tabular-nums">
              {kickCount}
            </span>
            <span className="text-label-sm text-on-surface-variant">
              / 10 kicks
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setKickCount((k) => k + 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-container text-on-primary text-label-sm font-semibold hover:bg-primary transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Log 1 kick
            </button>
            <button
              onClick={() => setKickCount(0)}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container-highest transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* appointments */}
        <div className="bg-surface-container-low/60 rounded-2xl p-4 flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
            Upcoming
          </span>
          <ul className="flex flex-col gap-1">
            {appointments.map((a, i) => (
              <li
                key={i}
                className="text-body-sm text-on-surface flex items-start gap-2"
              >
                <span className="material-symbols-outlined text-[14px] text-outline mt-0.5">
                  event
                </span>
                {a}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-1">
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()}
              placeholder="Add a note…"
              className="flex-1 bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-1.5 text-body-sm outline-none focus:border-primary transition-all"
            />
            <button
              onClick={addNote}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container-highest"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-outline italic leading-relaxed">
        {profile.condition_details?.[0]?.cannot_measure ??
          "The baby's health cannot be read from a watch."}
      </p>
    </div>
  );
}