import { useEffect, useState } from "react";
import { api } from "../api";
import type { Challenge } from "../types";
import { ChallengeCard } from "./ChallengeCard";
import { ChallengeCreatorModal } from "./ChallengeCreatorModal";
import { Mascot } from "./Mascot";

interface Props {
  userId: string;
}

export function ChallengesPage({ userId }: Props) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorOpen, setCreatorOpen] = useState(false);

  const load = async () => {
    try {
      const res = await api.listChallenges(userId);
      setChallenges(res.challenges ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="w-full max-w-[1100px] mx-auto px-6 md:px-12 py-8 flex flex-col gap-6">
      {/* hero */}
      <div className="relative bg-gradient-to-br from-primary-fixed/40 via-surface-container-lowest to-secondary-fixed/30 rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row items-start md:items-center gap-6 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-tertiary-fixed/50 to-primary-fixed/30 blur-3xl pointer-events-none" />

        <div className="mascot-float shrink-0">
          <Mascot mood="happy" size={96} />
        </div>

        <div className="relative flex-1">
          <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
            Family &amp; friends
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface leading-tight mt-1">
            Friendly challenges
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-lg">
            Run together, walk together, sleep better together. Guardian keeps
            score using <strong>verified data only</strong> — so nobody wins by
            cheating.
          </p>
        </div>

        <button
          onClick={() => setCreatorOpen(true)}
          className="relative flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary-container hover:bg-primary text-on-primary font-label-lg font-semibold shadow-md shadow-primary-container/40 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Start a challenge
        </button>
      </div>

      {/* challenges list */}
      {loading ? (
        <div className="bg-surface-container-lowest/90 rounded-3xl p-8 text-center text-on-surface-variant italic">
          Loading challenges…
        </div>
      ) : challenges.length === 0 ? (
        <div className="bg-surface-container-lowest/90 rounded-3xl p-8 flex flex-col items-center gap-3 text-center">
          <span className="material-symbols-outlined text-[40px] text-outline">
            emoji_events
          </span>
          <p className="font-body-md text-body-md text-on-surface">
            No challenges yet.
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
            Start one with a family member or a friend — running, walking, gym,
            cycling, sleep, or hydration.
          </p>
          <button
            onClick={() => setCreatorOpen(true)}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-container hover:bg-primary text-on-primary font-label-lg font-semibold shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Start your first challenge
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} currentUserId={userId} />
          ))}
        </div>
      )}

      <ChallengeCreatorModal
        open={creatorOpen}
        userId={userId}
        onClose={() => setCreatorOpen(false)}
        onCreated={load}
      />
    </div>
  );
}