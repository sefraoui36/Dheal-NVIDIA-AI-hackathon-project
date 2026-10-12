import { useEffect, useState } from "react";
import { api } from "./api";
import { AboutModal } from "./components/AboutModal";
import { AIInvestigation } from "./components/AIInvestigation";
import { AskGuardian } from "./components/AskGuardian";
import { ErrorScreen } from "./components/ErrorScreen";
import { EvidenceChain } from "./components/EvidenceChain";
import { FamilyDashboard } from "./components/FamilyDashboard";
import { FeedbackForm } from "./components/FeedbackForm";
import { Header } from "./components/Header";
import { HealthReplayChart } from "./components/HealthReplayChart";
import { LoadingScreen } from "./components/LoadingScreen";
import { deriveMood } from "./components/Mascot";
import { MoodCheckIn } from "./components/MoodCheckIn";
import { SafetyCard } from "./components/SafetyCard";
import { SecurityGuardian } from "./components/SecurityGuardian";
import { ShareWithDoctor } from "./components/ShareWithDoctor";
import { SimulateAttack } from "./components/SimulateAttack";
import { useBootstrap } from "./lib/useBootstrap";
import { DailyPulse } from "./components/DailyPulse";
import { ReplayStory } from "./components/ReplayStory";
import { ChallengesPage } from "./components/ChallengesPage";
import { RecommendationsPage } from "./components/RecommendationsPage";
import { MoodSupportPage } from "./components/MoodSupportPage";
import { MascotGreeting } from "./components/MascotGreeting";

const USER_ID = "user_001";

type View = "analyst" | "family" | "challenges" | "recommendations" | "mood";

export default function App() {
  const { steps, data, error, loading, run, refresh } = useBootstrap(USER_ID);
  const [busy, setBusy] = useState(false);
  const [attacked, setAttacked] = useState(false);
  const [lastAttackTime, setLastAttackTime] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [view, setView] = useState<View>("analyst");
  const [trustRefreshSignal, setTrustRefreshSignal] = useState(0);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTrust = async () => {
    await refresh();
    setTrustRefreshSignal((n) => n + 1);
  };

  const handleSimulate = async () => {
    setBusy(true);
    try {
      const res = await api.simulateAttack(USER_ID);
      setLastAttackTime(res.attack_timestamp);
      setAttacked(true);
      await refresh();
      setTrustRefreshSignal((n) => n + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      await api.restore(USER_ID);
      setAttacked(false);
      setLastAttackTime(null);
      await refresh();
      setTrustRefreshSignal((n) => n + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <LoadingScreen steps={steps} />;
  if (error && !data) return <ErrorScreen message={error} onRetry={run} />;
  if (!data) return <LoadingScreen steps={steps} />;

  const { integrity, baseline, timeline, ai } = data;
  const mood = deriveMood(timeline.timeline, ai.analysis.confidence, attacked);

  return (
    <div className="min-h-screen bg-surface">
      <Header
        userId={USER_ID}
        attacked={attacked}
        busy={busy}
        view={view}
        onSimulate={handleSimulate}
        onRestore={handleRestore}
        onOpenAbout={() => setAboutOpen(true)}
        onChangeView={setView}
      />

      <main className="w-full pt-24 pb-16">
        {view === "mood" ? (
          <MoodSupportPage userId={USER_ID} />
        ) : view === "recommendations" ? (
          <RecommendationsPage userId={USER_ID} />
        ) : view === "challenges" ? (
          <ChallengesPage userId={USER_ID} />
        ) : view === "family" ? (
          <FamilyDashboard
            userId={USER_ID}
            integrity={integrity}
            baseline={baseline}
            timeline={timeline}
            ai={ai}
          />
        ) : (
          /* ───── ANALYST VIEW — cleaned up + MoodCheckIn + ShareWithDoctor + FeedbackForm ───── */
          <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col gap-6">
            {/* 1. DailyPulse — the human entry point */}
            <DailyPulse userId={USER_ID} timeline={timeline} ai={ai} />

            {/* 2. Mascot greeting — one soft line */}
            <MascotGreeting userId={USER_ID} timeline={timeline} ai={ai} />

            {/* 3. Story + chart — the demo's wow moment */}
            <ReplayStory userId={USER_ID} timeline={timeline.timeline} />

            <HealthReplayChart
              timeline={timeline.timeline}
              integrityValid={integrity.valid}
            />

            {/* 4. AI Investigation — the trust layer */}
            <AIInvestigation analysis={ai.analysis} />

            {/* 5. Two-column: Security + Mood (left) · Ask + Evidence (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 flex flex-col gap-6">
                <SecurityGuardian
                  integrity={integrity}
                  timeline={timeline.timeline}
                />
                <MoodCheckIn userId={USER_ID} />
              </div>
              <div className="lg:col-span-5 flex flex-col gap-6">
                <AskGuardian userId={USER_ID} />
                <EvidenceChain timeline={timeline.timeline} />
              </div>
            </div>

            {/* 6. Two-column: Simulate Attack (left) · Share with doctor (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <SimulateAttack
                  attacked={attacked}
                  busy={busy}
                  onSimulate={handleSimulate}
                  onRestore={handleRestore}
                  lastAttackTime={lastAttackTime}
                />
              </div>
              <div className="lg:col-span-5 flex flex-col gap-6">
                <ShareWithDoctor userId={USER_ID} />
              </div>
            </div>

            {/* 7. Feedback — "Rate this experience" */}
            <FeedbackForm />

            {/* 8. Safety footer */}
            <SafetyCard />
          </div>
        )}
      </main>

      <footer className="w-full bg-surface-container-lowest/90 backdrop-blur-md border-t border-outline-variant/20 py-3">
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-2 text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="font-semibold text-on-surface">DHeal</span>
            <span>—</span>
            <span>Trust the data before trusting the AI</span>
            <span className="text-outline">·</span>
            <span className="font-mono text-tertiary font-semibold">
              SHA-256 Chain Secured
            </span>
          </div>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary" />
            Live Ledger Connected
          </span>
        </div>
      </footer>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}