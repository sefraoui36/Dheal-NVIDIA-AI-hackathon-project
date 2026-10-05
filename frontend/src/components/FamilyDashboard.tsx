import { useEffect, useState } from "react";
import { api } from "../api";
import type {
  AIAnalyzeResponse,
  Baseline,
  Integrity,
  Profile,
  TimelineResponse,
} from "../types";
import { ActionLadder } from "./ActionLadder";
import { BPTracker } from "./BPTracker";
import { ConditionInsights } from "./ConditionInsights";
import { ConditionalSuggestions } from "./ConditionalSuggestions";
import { DiabetesTracker } from "./DiabetesTracker";
import { MenopauseTracker } from "./MenopauseTracker";
import { PainTracker } from "./PainTracker";
import { PersonProfileHeader } from "./PersonProfileHeader";
import { PregnancyTracker } from "./PregnancyTracker";
import { RecoveryTracker } from "./RecoveryTracker";
import { FamilyAdviceCard } from "./FamilyAdviceCard";
interface Props {
  userId: string;
  integrity: Integrity;
  baseline: Baseline;
  timeline: TimelineResponse;
  ai: AIAnalyzeResponse;
}

const ACCENT_RING: Record<string, string> = {
  coral: "ring-primary/30",
  mint: "ring-secondary/30",
  amber: "ring-tertiary/30",
  slate: "ring-outline/30",
  pink: "ring-error/30",
};

export function FamilyDashboard({
  userId,
  baseline,
  timeline,
  ai,
}: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string>(userId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listProfiles()
      .then((res) => {
        setProfiles(res.profiles);
        setLoading(false);
      })
      .catch((e) => {
        console.error("profiles load failed", e);
        setLoading(false);
      });
  }, []);

  const selected: Profile | null =
    profiles.find((p) => p.user_id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="w-full max-w-[1100px] mx-auto px-6 md:px-12 py-8">
        <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 text-center text-on-surface-variant italic">
          Loading family profiles…
        </div>
      </div>
    );
  }

  if (profiles.length === 0 || !selected) {
    return (
      <div className="w-full max-w-[1100px] mx-auto px-6 md:px-12 py-8">
        <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-6 text-center text-on-surface-variant italic">
          No family profiles found.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto px-6 md:px-12 py-8 flex flex-col gap-6">
      {/* person selector */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline pl-1">
          Who are you caring for?
        </span>
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => {
            const active = p.user_id === selectedId;
            return (
              <button
                key={p.user_id}
                onClick={() => setSelectedId(p.user_id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  active
                    ? `bg-surface-container-lowest shadow-md ring-2 ${
                        ACCENT_RING[p.accent] ?? ACCENT_RING.slate
                      }`
                    : "bg-surface-container-low/50 hover:bg-surface-container-high/60"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    active
                      ? "bg-surface-container-high"
                      : "bg-surface-container-lowest/70"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] ${
                      active ? "text-primary" : "text-on-surface-variant"
                    }`}
                  >
                    {p.avatar_icon}
                  </span>
                </div>
                <div className="flex flex-col items-start">
                  <span
                    className={`font-title-sm text-title-sm font-semibold ${
                      active ? "text-on-surface" : "text-on-surface-variant"
                    }`}
                  >
                    {p.name}
                  </span>
                  <span className="text-[10px] text-outline uppercase tracking-wider">
                    {p.relation}
                  </span>
                </div>
                {active && (
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    check_circle
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* header for selected person */}
      <PersonProfileHeader
      profile={selected}
      trustScore={ai.trust_score}
      summary={timeline.summary}
    />

<FamilyAdviceCard userId={selected.user_id} personName={selected.name} />



      {/* action ladder in the person's context */}
      <ActionLadder
        trustScore={ai.trust_score}
        timeline={timeline.timeline}
        summary={timeline.summary}
        careForName={selected.name}
      />

      {/* condition-aware insights */}
      {selected.condition_details && selected.condition_details.length > 0 && (
        <ConditionInsights
          conditionDetails={selected.condition_details}
          timeline={timeline.timeline}
        />
      )}

      {/* condition-specific trackers — one block per condition */}
      {selected.conditions.includes("type_2_diabetes") && (
        <DiabetesTracker userId={selected.user_id} />
      )}
      {selected.conditions.includes("hypertension") && (
        <BPTracker userId={selected.user_id} />
      )}
      {selected.conditions.includes("arthritis") && (
        <PainTracker userId={selected.user_id} />
      )}
      {selected.conditions.includes("post_surgery_recovery") && (
        <RecoveryTracker userId={selected.user_id} />
      )}
      {selected.conditions.includes("menopause") && (
        <MenopauseTracker userId={selected.user_id} />
      )}

      {/* pregnancy-specific tracker */}
      {selected.pregnancy && <PregnancyTracker profile={selected} />}

      {/* suggestions filtered by today's data */}
      {selected.condition_details && selected.condition_details.length > 0 && (
        <ConditionalSuggestions
          conditionDetails={selected.condition_details}
          timeline={timeline.timeline}
          personName={selected.name}
        />
      )}
    </div>
  );
}