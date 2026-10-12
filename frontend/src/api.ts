import axios from "axios";
import type {
  ActivitiesResponse,
  AIAnalyzeResponse,
  AskResponse,
  AttackResult,
  Baseline,
  Challenge,
  ChallengeCheer,
  ChallengeCommentary,
  ChallengeProgress,
  ChallengesResponse,
  CreateChallengePayload,
  DailyRecommendation,
  FamilyAdvice,
  GoalsResponse,
  Integrity,
  Leaderboard,
  MoodResponse,
  PopulationStat,
  Profile,
  ProfilesResponse,
  Telemetry,
  TimelineResponse,
  TrackingResponse,
  TrustHistoryResponse,
  MoodChatResponse,
  MoodHealthCheck,
  MoodSuggestionsResponse,
} from "./types";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

export const api = {
  integrity: (userId: string) =>
    client.get<Integrity>(`/data/integrity/${userId}`).then((r) => r.data),

  baseline: (userId: string) =>
    client.get<Baseline>(`/baseline/${userId}`).then((r) => r.data),

  timeline: (userId: string, hours = 24) =>
    client
      .get<TimelineResponse>(`/timeline/${userId}`, { params: { hours } })
      .then((r) => r.data),

  analyze: (userId: string, hours = 24) =>
    client
      .post<AIAnalyzeResponse>("/ai/analyze", { user_id: userId, hours })
      .then((r) => r.data),

  simulateAttack: (userId: string, injectedHr = 198, hourOffset = 24) =>
    client
      .post<AttackResult>("/simulate-attack", {
        user_id: userId,
        attack_hour_offset: hourOffset,
        injected_hr: injectedHr,
      })
      .then((r) => r.data),

  restore: (userId: string) =>
    client
      .post<{ status: string; user_id: string }>(
        `/simulate-attack/restore?user_id=${userId}`
      )
      .then((r) => r.data),

  ask: (userId: string, question: string, hours = 24) =>
    client
      .post<AskResponse>("/ai/ask", { user_id: userId, hours, question })
      .then((r) => r.data),

  reportPdf: async (userId: string, hours = 24): Promise<Blob> => {
    const res = await client.post(
      "/health/report/pdf",
      { user_id: userId, hours },
      { responseType: "blob" },
    );
    return res.data;
  },

  logMood: (userId: string, score: number, note?: string) =>
    client
      .post<{ status: string; timestamp: string }>("/mood", {
        user_id: userId,
        score,
        note,
      })
      .then((r) => r.data),

  getMood: (userId: string, days = 7) =>
    client
      .get<MoodResponse>(`/mood/${userId}`, { params: { days } })
      .then((r) => r.data),

  telemetryLast: () =>
    client.get<Telemetry>("/telemetry/last").then((r) => r.data),

  trustHistory: (userId: string, days = 7) =>
    client
      .get<TrustHistoryResponse>(`/telemetry/trust-history/${userId}`, {
        params: { days },
      })
      .then((r) => r.data),

  populationBaseline: () =>
    client
      .post<{ population_baseline: Record<string, PopulationStat> }>(
        "/health/replay",
        { user_id: "user_001", hours: 24 },
      )
      .then((r) => r.data.population_baseline),

  listProfiles: () =>
    client.get<ProfilesResponse>("/profiles").then((r) => r.data),

  getProfile: (userId: string) =>
    client.get<Profile>(`/profiles/${userId}`).then((r) => r.data),

  listConditions: () =>
    client
      .get<{ conditions: Record<string, unknown> }>("/profiles/conditions")
      .then((r) => r.data),

  logTracking: (
    userId: string,
    type: string,
    data: Record<string, unknown>,
  ) =>
    client
      .post<{ status: string; timestamp: string }>("/tracking", {
        user_id: userId,
        type,
        data,
      })
      .then((r) => r.data),

  getTracking: (userId: string, type?: string, days = 7) =>
    client
      .get<TrackingResponse>(`/tracking/${userId}`, {
        params: { type, days },
      })
      .then((r) => r.data),

  familyAdvice: (userId: string, force = false) =>
    client
      .post<FamilyAdvice>("/family/advice", { user_id: userId, force })
      .then((r) => r.data),

  // ---------------- Challenges ----------------

  listActivities: () =>
    client
      .get<ActivitiesResponse>("/challenges/activities")
      .then((r) => r.data),

  listChallenges: (userId: string) =>
    client
      .get<ChallengesResponse>(`/challenges/${userId}`)
      .then((r) => r.data),

  createChallenge: (payload: CreateChallengePayload) =>
    client
      .post<{ status: string; challenge: Challenge }>("/challenges", payload)
      .then((r) => r.data),

  challengeLeaderboard: (challengeId: string, userId: string) =>
    client
      .get<Leaderboard>(`/challenges/${challengeId}/leaderboard`, {
        params: { user_id: userId },
      })
      .then((r) => r.data),

  challengeCommentary: (challengeId: string, userId: string) =>
    client
      .post<ChallengeCommentary>(`/challenges/${challengeId}/commentary`, {
        user_id: userId,
      })
      .then((r) => r.data),

  challengeCheer: (
    challengeId: string,
    userId: string,
    targetUserId: string,
  ) =>
    client
      .post<ChallengeCheer>(`/challenges/${challengeId}/cheer`, {
        user_id: userId,
        target_user_id: targetUserId,
      })
      .then((r) => r.data),

      challengeProgress: (challengeId: string, userId: string) =>
    client
      .get<ChallengeProgress>(`/challenges/${challengeId}/progress`, {
        params: { user_id: userId },
      })
      .then((r) => r.data),
    listGoals: () =>
    client.get<GoalsResponse>("/recommendations/goals").then((r) => r.data),

  generateRecommendations: (
    userId: string,
    goal: string,
    availableMinutes = 30,
    force = false,
  ) =>
    client
      .post<DailyRecommendation>("/recommendations/generate", {
        user_id: userId,
        goal,
        available_minutes: availableMinutes,
        force,
      })
      .then((r) => r.data),
     moodSupportChat: (
    userId: string,
    message: string,
    forceHealthAnalysis = false,
  ) =>
    client
      .post<MoodChatResponse>("/mood-support/chat", {
        user_id: userId,
        message,
        force_health_analysis: forceHealthAnalysis,
      })
      .then((r) => r.data),

  moodHealthCheck: (userId: string) =>
    client
      .get<MoodHealthCheck>(`/mood-support/health-check/${userId}`)
      .then((r) => r.data),

  moodSuggestions: () =>
    client
      .get<MoodSuggestionsResponse>("/mood-support/suggestions")
      .then((r) => r.data),
};