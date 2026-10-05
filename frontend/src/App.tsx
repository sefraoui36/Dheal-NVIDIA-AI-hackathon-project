import { useEffect, useState } from "react";
import { api } from "./api";
import { AboutModal } from "./components/AboutModal";
import { AIInvestigation } from "./components/AIInvestigation";
import { AskGuardian } from "./components/AskGuardian";
import { DataControls } from "./components/DataControls";
import { ErrorScreen } from "./components/ErrorScreen";
import { EvidenceChain } from "./components/EvidenceChain";
import { FamilyDashboard } from "./components/FamilyDashboard";
import { FeedbackForm } from "./components/FeedbackForm";
import { Header } from "./components/Header";
import { HealthReplayChart } from "./components/HealthReplayChart";
import { LoadingScreen } from "./components/LoadingScreen";
import { deriveMood } from "./components/Mascot";
import { MascotGreeting } from "./components/MascotGreeting";
import { MoodCheckIn } from "./components/MoodCheckIn";
import { SafetyCard } from "./components/SafetyCard";
import { SecurityGuardian } from "./components/SecurityGuardian";
import { ShareWithDoctor } from "./components/ShareWithDoctor";
import { SimulateAttack } from "./components/SimulateAttack";
import { StatusBanner } from "./components/StatusBanner";
import { TelemetryPanel } from "./components/TelemetryPanel";
import { TrustHistoryChart } from "./components/TrustHistoryChart";
import { WhatChanged } from "./components/WhatChanged";
import { useBootstrap } from "./lib/useBootstrap";
import { DailyPulse } from "./components/DailyPulse";
import { ReplayStory } from "./components/ReplayStory";

const USER_ID = "user_001";

type View = "analyst" | "family";

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
        {view === "family" ? (
          <FamilyDashboard
            userId={USER_ID}
            integrity={integrity}
            baseline={baseline}
            timeline={timeline}
            ai={ai}
          />
        ) : (
          <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col gap-6">
              <DailyPulse userId={USER_ID} timeline={timeline} ai={ai} />

              <StatusBanner
                attacked={attacked}
                mood={mood}
                trustScore={ai.trust_score}
                summary={timeline.summary}
              />

              <MascotGreeting userId={USER_ID} timeline={timeline} ai={ai} />

                <ReplayStory userId={USER_ID} timeline={timeline.timeline} />

                <HealthReplayChart
                  timeline={timeline.timeline}
                  integrityValid={integrity.valid}
                />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <WhatChanged baseline={baseline} timeline={timeline.timeline} />
              </div>
              <div className="lg:col-span-6">
                <SecurityGuardian
                  integrity={integrity}
                  timeline={timeline.timeline}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 flex flex-col gap-6">
                <AIInvestigation analysis={ai.analysis} />
                <MoodCheckIn userId={USER_ID} />
                <AskGuardian userId={USER_ID} />
                <TelemetryPanel />
              </div>
              <div className="lg:col-span-5 flex flex-col gap-6">
                <EvidenceChain timeline={timeline.timeline} />
                <TrustHistoryChart
                  userId={USER_ID}
                  refreshSignal={trustRefreshSignal}
                  onRefresh={refreshTrust}
                />
                <ShareWithDoctor userId={USER_ID} />
                <SimulateAttack
                  attacked={attacked}
                  busy={busy}
                  onSimulate={handleSimulate}
                  onRestore={handleRestore}
                  lastAttackTime={lastAttackTime}
                />
                <DataControls userId={USER_ID} />
                <SafetyCard />
                <FeedbackForm />
              </div>
            </div>
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