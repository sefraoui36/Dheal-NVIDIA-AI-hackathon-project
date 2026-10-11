import { useEffect, useState } from "react";
import { api } from "../api";
import type {
  ActivityDefinition,
  Challenge,
  ChallengePersonRead,
  Leaderboard,
  LeaderboardRow,
} from "../types";
import { Mascot } from "./Mascot";
import { InfoTip } from "./InfoTip";

interface Props {
  challenge: Challenge;
  currentUserId: string;
}

const ACCENT_GRADIENT: Record<string, string> = {
  coral: "from-primary-fixed/40 to-error-container/30",
  mint: "from-secondary-fixed/50 to-secondary-fixed/20",
  amber: "from-tertiary-fixed/50 to-tertiary-fixed/20",
  slate: "from-surface-container-high to-surface-container-low",
};

function formatMetric(value: number, activity: ActivityDefinition): string {
  if (activity.unit === "km") return `${value.toFixed(1)} km`;
  if (activity.unit === "h") return `${value.toFixed(1)} h`;
  if (activity.unit === "min") return `${Math.round(value)} min`;
  if (activity.unit === "cups") return `${Math.round(value)} cups`;
  return `${Math.round(value).toLocaleString()} steps`;
}

export function ChallengeCard({ challenge, currentUserId }: Props) {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [coachText, setCoachText] = useState<string | null>(null);
  const [perPerson, setPerPerson] = useState<ChallengePersonRead[]>([]);
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  const [cheerMsg, setCheerMsg] = useState<string | null>(null);
  const [busyCheer, setBusyCheer] = useState(false);

  const load = async () => {
    try {
      const res = await api.challengeLeaderboard(challenge.id, currentUserId);
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id, currentUserId]);

  const loadCommentary = async () => {
    setLoadingCommentary(true);
    try {
      const res = await api.challengeCommentary(challenge.id, currentUserId);
      setCoachText(res.text);
      setPerPerson(res.per_person ?? []);
    } catch (e) {
      console.error(e);
      setCoachText(null);
      setPerPerson([]);
    } finally {
      setLoadingCommentary(false);
    }
  };

  // auto-load once the leaderboard is ready
  useEffect(() => {
    if (!data) return;
    if (data.winner && data.winner.verified_total > 0) {
      loadCommentary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.challenge.id]);

  const askCheer = async (targetUserId: string) => {
    setBusyCheer(true);
    try {
      const res = await api.challengeCheer(
        challenge.id,
        currentUserId,
        targetUserId,
      );
      setCheerMsg(res.text);
    } catch (e) {
      console.error(e);
    } finally {
      setBusyCheer(false);
    }
  };

  if (!data) {
    return (
      <div className="bg-surface-container-lowest/90 rounded-3xl p-6 shadow-md flex items-center gap-3">
        <span className="material-symbols-outlined animate-spin text-secondary">
          progress_activity
        </span>
        <span className="text-on-surface-variant text-body-sm italic">
          Loading challenge…
        </span>
      </div>
    );
  }

  const {
    leaderboard,
    winner,
    lead_margin,
    trust_verified,
    total_flagged,
    activity,
  } = data;

  const gradientClass =
    ACCENT_GRADIENT[activity.accent] ?? ACCENT_GRADIENT.slate;

  const top3 = leaderboard.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(
    Boolean,
  ) as LeaderboardRow[];

  return (
    <div className="relative bg-surface-container-lowest/95 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-md flex flex-col gap-6 overflow-hidden">
      <div
        className={`absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br ${gradientClass} blur-3xl pointer-events-none`}
      />

      {/* header */}
      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-3xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br ${gradientClass}`}
          >
            <span className="material-symbols-outlined text-on-surface text-[28px]">
              {activity.icon}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-2xl font-bold text-on-surface leading-tight">
                {challenge.name}
              </h3>
              {trust_verified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary-fixed/50 text-on-secondary-fixed-variant">
                  <span className="material-symbols-outlined text-[12px]">
                    verified
                  </span>
                  Trust-verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tertiary-fixed/50 text-on-tertiary-container">
                  <span className="material-symbols-outlined text-[12px]">
                    warning
                  </span>
                  {total_flagged} flagged
                </span>
              )}
            </div>
            <span className="text-label-sm text-outline">
              {activity.label} · {challenge.duration_days} days ·{" "}
              {leaderboard.length} players
            </span>
          </div>
        </div>

        <InfoTip title="How ranking works" side="bottom">
          <p>
            Ranking uses <b>trust-verified totals only</b>. Any reading that
            falls outside the user's usual range is set aside — so nobody can
            win by faking data.
          </p>
        </InfoTip>
      </div>

      {/* winner banner */}
      {winner && winner.verified_total > 0 && (
        <div className="relative bg-gradient-to-r from-tertiary-fixed/40 to-primary-fixed/30 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-tertiary text-[34px]">
              emoji_events
            </span>
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold tracking-widest uppercase text-on-tertiary-container">
              Currently leading
            </div>
            <div className="font-display text-2xl font-bold text-on-surface">
              {winner.name}
            </div>
            <div className="text-[12px] text-on-surface-variant">
              {formatMetric(winner.verified_total, activity)}
              {lead_margin > 0 && (
                <>
                  {" · ahead by "}
                  <b className="text-on-surface">
                    {formatMetric(lead_margin, activity)}
                  </b>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* podium */}
      {podiumOrder.length > 0 && (
        <div className="relative flex items-end justify-center gap-3 md:gap-6 py-4">
          {podiumOrder.map((row) => {
            const rank = row.rank;
            const isFirst = rank === 1;
            const medalEmoji =
              rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
            const medalColor =
              rank === 1
                ? "from-tertiary-fixed to-tertiary-fixed/60"
                : rank === 2
                ? "from-secondary-fixed to-secondary-fixed/60"
                : "from-primary-fixed to-primary-fixed/60";
            return (
              <div
                key={row.user_id}
                className={`flex flex-col items-center gap-2 ${
                  isFirst ? "scale-110" : ""
                }`}
              >
                <div className="relative">
                  <div
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br ${medalColor}`}
                  >
                    <span className="material-symbols-outlined text-[36px] md:text-[42px] text-on-surface">
                      {row.avatar_icon}
                    </span>
                  </div>
                  <span className="absolute -top-2 -right-2 text-xl md:text-2xl">
                    {medalEmoji}
                  </span>
                </div>
                <span className="font-title-sm text-title-sm font-semibold text-on-surface">
                  {row.name}
                </span>
                <span className="text-[11px] text-on-surface-variant tabular-nums">
                  {formatMetric(row.verified_total, activity)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* full leaderboard */}
      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
            Full leaderboard
          </span>
          <span className="text-[10px] font-semibold text-on-surface-variant">
            verified only
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {leaderboard.map((row) => (
            <LeaderboardRowItem
              key={row.user_id}
              row={row}
              activity={activity}
              isMe={row.user_id === currentUserId}
              onCheer={() => askCheer(row.user_id)}
              cheerBusy={busyCheer}
            />
          ))}
        </ul>
      </div>

      {/* Coach's read — always visible, auto-loaded */}
      <div className="relative bg-surface-container-low/50 rounded-3xl p-5 flex items-start gap-4">
        <div className="shrink-0">
          <Mascot mood={loadingCommentary ? "calm" : "happy"} size={52} />
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="font-title-sm text-title-sm text-on-surface font-semibold">
              Guardian's read on the race
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
              live
            </span>
          </div>

          {loadingCommentary && !coachText && (
            <div className="flex items-center gap-2 text-on-surface-variant italic font-body-sm">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary dot-thinking inline-block" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary dot-thinking inline-block" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary dot-thinking inline-block" />
              </span>
              Reading the day-by-day progression…
            </div>
          )}

          {coachText && (
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              {coachText}
            </p>
          )}

          {!coachText && !loadingCommentary && (
            <p className="font-body-sm text-body-sm text-on-surface-variant italic">
              The challenge is just starting — no verified readings yet.
            </p>
          )}
        </div>
      </div>

      {/* per-person suggestions */}
      {perPerson.length > 0 && (
        <div className="relative bg-secondary-fixed/20 rounded-3xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">
              lightbulb
            </span>
            <span className="font-title-sm text-title-sm text-on-surface font-semibold">
              What each person could try next
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {perPerson.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-3 bg-surface-container-lowest/60 rounded-2xl p-3"
              >
                <div className="w-8 h-8 rounded-xl bg-secondary-fixed/40 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-secondary text-[16px]">
                    person
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                    {p.name}
                  </span>
                  <span className="text-[11px] text-on-surface-variant italic">
                    {p.pattern}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface mt-0.5">
                    {p.suggestion}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-[10px] text-outline italic">
            General wellness suggestions only — never medical advice.
          </p>
        </div>
      )}

      {/* cheer message */}
      {cheerMsg && (
        <div className="relative bg-secondary-fixed/25 rounded-2xl p-3.5 flex items-start gap-2">
          <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
            favorite
          </span>
          <p className="font-body-sm text-body-sm text-on-surface">{cheerMsg}</p>
        </div>
      )}
    </div>
  );
}

function LeaderboardRowItem({
  row,
  activity,
  isMe,
  onCheer,
  cheerBusy,
}: {
  row: LeaderboardRow;
  activity: ActivityDefinition;
  isMe: boolean;
  onCheer: () => void;
  cheerBusy: boolean;
}) {
  const medal =
    row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null;

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
        isMe
          ? "bg-primary-fixed/40 ring-1 ring-primary/30"
          : "bg-surface-container-low/60 hover:bg-surface-container-high/60"
      }`}
    >
      <span className="w-6 text-center font-mono text-[13px] font-bold text-on-surface-variant tabular-nums">
        {medal ?? `#${row.rank}`}
      </span>
      <div className="w-9 h-9 rounded-xl bg-surface-container-lowest flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          {row.avatar_icon}
        </span>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-label-lg text-label-lg text-on-surface font-semibold">
            {row.name}
          </span>
          {isMe && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-primary text-on-primary px-1.5 py-0.5 rounded-full">
              you
            </span>
          )}
        </div>
        {!row.is_fully_verified && (
          <span className="text-[10px] text-tertiary font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">
              warning
            </span>
            {row.flagged_count} reading{row.flagged_count === 1 ? "" : "s"} set
            aside
          </span>
        )}
      </div>
      <span className="font-mono text-[13px] font-bold text-on-surface tabular-nums">
        {formatMetric(row.verified_total, activity)}
      </span>
      {!isMe && (
        <button
          onClick={onCheer}
          disabled={cheerBusy}
          className="w-8 h-8 rounded-full bg-secondary-fixed/40 hover:bg-secondary-fixed/70 text-secondary flex items-center justify-center transition-all disabled:opacity-50"
          title="Send a friendly cheer"
        >
          <span className="material-symbols-outlined text-[16px]">
            waving_hand
          </span>
        </button>
      )}
    </li>
  );
}