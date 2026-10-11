import { useEffect, useState } from "react";
import { api } from "../api";
import type { ActivityDefinition, Profile } from "../types";
import { Mascot } from "./Mascot";

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

type Step = 1 | 2 | 3 | 4;

const DURATIONS = [3, 7, 14, 30];

export function ChallengeCreatorModal({
  open,
  userId,
  onClose,
  onCreated,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [activities, setActivities] = useState<ActivityDefinition[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activity, setActivity] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([userId]);
  const [friendName, setFriendName] = useState("");
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const [duration, setDuration] = useState(7);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api.listActivities().then((r) => setActivities(r.activities));
    api.listProfiles().then((r) => setProfiles(r.profiles));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setActivity(null);
      setSelectedIds([userId]);
      setFriends([]);
      setFriendName("");
      setDuration(7);
      setName("");
      setError(null);
    }
  }, [open, userId]);

  if (!open) return null;

  const toggleProfile = (pid: string) => {
    setSelectedIds((ids) =>
      ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid],
    );
  };

   const addFriend = () => {
    const trimmed = friendName.trim();
    if (!trimmed) return;

    const slug = trimmed
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    const id = `friend_${slug}`;

    // avoid duplicates: if this friend id already exists in the list, do nothing
    setFriends((f) => {
      if (f.some((x) => x.id === id)) return f;
      return [...f, { id, name: trimmed }];
    });

    setFriendName("");
  };

  const removeFriend = (id: string) => {
    setFriends((f) => f.filter((x) => x.id !== id));
  };

  const totalParticipants = selectedIds.length + friends.length;

  const canSubmit =
    activity !== null && totalParticipants >= 2 && name.trim().length > 0;

  const submit = async () => {
    if (!activity || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await api.createChallenge({
        creator_id: userId,
        name: name.trim(),
        activity,
        duration_days: duration,
        participant_ids: selectedIds,
        friends,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create challenge");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-on-surface/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-3xl shadow-2xl"
      >
        {/* header */}
        <div className="sticky top-0 z-10 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-outline-variant/30 px-7 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mascot mood="happy" size={44} />
            <div>
              <div className="font-display text-xl font-bold text-on-surface leading-tight">
                Start a challenge
              </div>
              <span className="text-label-sm text-outline">
                Step {step} of 4
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* progress bar */}
        <div className="h-1 bg-surface-container-high">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">
          {/* step 1 — activity */}
          {step === 1 && (
            <>
              <SectionHeader
                title="What are you competing in?"
                subtitle="Pick the activity — everyone competes on the same one."
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {activities.map((a) => {
                  const active = activity === a.key;
                  return (
                    <button
                      key={a.key}
                      onClick={() => setActivity(a.key)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                        active
                          ? "bg-primary-fixed/50 ring-2 ring-primary/40 shadow-sm"
                          : "bg-surface-container-low/60 hover:bg-surface-container-high/70"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[32px] ${
                          active ? "text-primary" : "text-on-surface-variant"
                        }`}
                      >
                        {a.icon}
                      </span>
                      <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                        {a.label}
                      </span>
                      <span className="text-[10px] text-outline uppercase tracking-wider">
                        {a.unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* step 2 — participants */}
          {step === 2 && (
            <>
              <SectionHeader
                title="Who's joining?"
                subtitle="Pick family members, then add friends by name."
              />

              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
                  Family · {selectedIds.length} selected
                </span>
                <div className="flex flex-wrap gap-2">
                  {profiles.map((p) => {
                    const active = selectedIds.includes(p.user_id);
                    return (
                      <button
                        key={p.user_id}
                        onClick={() => toggleProfile(p.user_id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all ${
                          active
                            ? "bg-secondary-fixed/50 ring-2 ring-secondary/40"
                            : "bg-surface-container-low/60 hover:bg-surface-container-high/70"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                          {p.avatar_icon}
                        </span>
                        <span className="font-label-sm font-semibold text-on-surface">
                          {p.name}
                        </span>
                        {active && (
                          <span className="material-symbols-outlined text-[16px] text-secondary">
                            check_circle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
                  Friends · {friends.length} added
                </span>
                <div className="flex gap-2">
                  <input
                    value={friendName}
                    onChange={(e) => setFriendName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFriend()}
                    placeholder="Friend's name (e.g. Ahmed)"
                    className="flex-1 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary rounded-2xl px-4 py-2.5 text-body-sm outline-none transition-all"
                  />
                  <button
                    onClick={addFriend}
                    disabled={!friendName.trim()}
                    className="px-4 py-2.5 rounded-2xl bg-primary-container text-on-primary font-label-sm font-semibold hover:bg-primary transition-all disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {friends.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {friends.map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary-fixed/50 text-on-tertiary-container text-label-sm font-semibold"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          person
                        </span>
                        {f.name}
                        <button
                          onClick={() => removeFriend(f.id)}
                          className="ml-1 hover:text-error transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            close
                          </span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-outline italic">
                  Friends don't need an account — Guardian will set them up
                  with a placeholder profile and demo data.
                </p>
              </div>

              {totalParticipants < 2 && (
                <div className="bg-tertiary-fixed/30 rounded-2xl p-3 text-[12px] text-on-tertiary-container">
                  You need at least 2 participants. Pick at least one family
                  member or add a friend.
                </div>
              )}
            </>
          )}

          {/* step 3 — duration */}
          {step === 3 && (
            <>
              <SectionHeader
                title="How long does it run?"
                subtitle="Short sprints or month-long streaks — your call."
              />
              <div className="grid grid-cols-4 gap-3">
                {DURATIONS.map((d) => {
                  const active = duration === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex flex-col items-center gap-1 p-4 rounded-2xl transition-all ${
                        active
                          ? "bg-primary-fixed/50 ring-2 ring-primary/40 shadow-sm"
                          : "bg-surface-container-low/60 hover:bg-surface-container-high/70"
                      }`}
                    >
                      <span className="font-display text-3xl font-bold text-on-surface tabular-nums">
                        {d}
                      </span>
                      <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
                        days
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* step 4 — name + confirm */}
          {step === 4 && (
            <>
              <SectionHeader
                title="Name your challenge"
                subtitle="Give it a fun, motivating title."
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekend Run Club"
                className="w-full bg-surface-container-lowest border-[1.5px] border-outline-variant/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl px-4 py-3 text-body-md outline-none transition-all"
                autoFocus
              />

              <div className="bg-surface-container-low/60 rounded-2xl p-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
                  Summary
                </span>
                <div className="flex flex-col gap-1.5 text-body-sm">
                  <SummaryRow
                    icon="sports_score"
                    label="Activity"
                    value={
                      activities.find((a) => a.key === activity)?.label ?? "—"
                    }
                  />
                  <SummaryRow
                    icon="group"
                    label="Participants"
                    value={`${totalParticipants} players`}
                  />
                  <SummaryRow
                    icon="schedule"
                    label="Duration"
                    value={`${duration} days`}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-error-container/40 text-on-error-container rounded-2xl p-3 text-[12px]">
                  {error}
                </div>
              )}
            </>
          )}

          {/* footer nav */}
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30">
            <button
              onClick={() => (step > 1 ? setStep((step - 1) as Step) : onClose())}
              className="px-4 py-2.5 rounded-2xl text-on-surface-variant hover:bg-surface-container-high font-label-lg transition-all"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep((step + 1) as Step)}
                disabled={
                  (step === 1 && !activity) ||
                  (step === 2 && totalParticipants < 2)
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-container hover:bg-primary text-on-primary font-label-lg font-semibold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canSubmit || busy}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-container hover:bg-primary text-on-primary font-label-lg font-semibold shadow-md transition-all disabled:opacity-40 disabled:cursor-wait"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {busy ? "hourglass_top" : "rocket_launch"}
                </span>
                {busy ? "Starting…" : "Start challenge"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
        {title}
      </h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {subtitle}
      </p>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </span>
      <span className="font-semibold text-on-surface">{value}</span>
    </div>
  );
}