// Types matching the FastAPI backend responses.

export type Verdict = "TRUSTED" | "SUSPICIOUS" | "FLAGGED";

export interface Metrics {
  heart_rate: number;
  sleep_hours: number;
  steps: number;
  activity_minutes: number;
  stress_level: number;
}

export interface Anomaly {
  metric: string;
  value: number;
  z: number;
  mean: number;
  std: number;
  severity: "medium" | "high";
}

export interface TimelineRow {
  timestamp: string;
  metrics: Metrics;
  verdict: Verdict;
  reasons: string[];
  anomalies: Anomaly[];
  violations: unknown[];
}

export interface BaselineStat {
  mean: number;
  std: number;
  min: number;
  max: number;
  lower_bound: number;
  upper_bound: number;
}

export interface PopulationStat {
  mean: number;
  std: number;
  lower_bound: number;
  upper_bound: number;
  label: string;
  source: string;
}

export interface Baseline {
  user_id: string;
  n_records: number;
  metrics: Record<string, BaselineStat>;
}

export interface Integrity {
  valid: boolean;
  total: number;
  broken_at_index: number | null;
  broken_at_timestamp: string | null;
}

export interface TimelineResponse {
  user_id: string;
  window: { start: string; end: string; hours: number };
  timeline: TimelineRow[];
  summary: {
    total_records: number;
    trusted: number;
    suspicious: number;
    flagged: number;
    missing_gaps: { after: string; before: string; gap_minutes: number }[];
  };
}

export interface AIEvidence {
  timestamp: string;
  metric: string;
  value: number;
  trust: Verdict;
}

export interface AIAnalysis {
  headline: string;
  what_changed: string[];
  evidence_used: AIEvidence[];
  unreliable_evidence: string[];
  confidence: "HIGH" | "MODERATE" | "LIMITED";
  confidence_reason: string;
  next_steps: string[];
  disclaimer: string;
}

export interface TrustScore {
  score: number;
  tier: "EXCELLENT" | "GOOD" | "DEGRADED" | "UNTRUSTWORTHY";
  breakdown: {
    integrity: number;
    trusted_ratio: number;
    ai_confidence: number;
  };
}

export interface AIAnalyzeResponse {
  replay_summary: {
    total_records: number;
    trusted: number;
    suspicious: number;
    flagged: number;
    missing_gaps: unknown[];
  };
  analysis: AIAnalysis;
  trust_score: TrustScore;
}

export interface AskResponse {
  question: string;
  answer: {
    answer: string;
    evidence_used: AIEvidence[];
    caveats: string[];
    confidence: "HIGH" | "MODERATE" | "LIMITED";
    next_steps: string[];
    disclaimer: string;
  };
}

export interface AttackResult {
  status: string;
  user_id: string;
  attack_timestamp: string;
  original_hr: number;
  injected_hr: number;
  attacked_file: string;
}

export interface MoodDaily {
  date: string;
  avg_score: number;
  count: number;
}

export interface MoodEntry {
  timestamp: string;
  score: number;
  note?: string | null;
}

export interface MoodResponse {
  user_id: string;
  days: number;
  today: number | null;
  daily: MoodDaily[];
  entries: MoodEntry[];
}

export interface Telemetry {
  kind: "analyze" | "ask" | null;
  model: string;
  latency_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  timestamp: number | null;
  provider: string;
  configured_model: string;
}

export interface TrustHistoryEntry {
  date: string;
  score: number | null;
  tier: "EXCELLENT" | "GOOD" | "DEGRADED" | "UNTRUSTWORTHY" | null;
}

export interface TrustHistoryResponse {
  user_id: string;
  days: number;
  history: TrustHistoryEntry[];
}
export interface ConditionSuggestion {
  trigger: string;
  text: string;
}

export interface ConditionDetail {
  label: string;
  icon: string;
  accent: string;
  key_metrics: string[];
  suggestions: ConditionSuggestion[];
  disclaimer: string;
  cannot_measure?: string;
}

export interface PregnancyInfo {
  week: number;
  trimester: number;
  due_date: string;
}

export interface Profile {
  user_id: string;
  name: string;
  relation: string;
  age: number;
  avatar_icon: string;
  accent: "coral" | "mint" | "amber" | "slate" | "pink";
  conditions: string[];
  notes?: string;
  pregnancy?: PregnancyInfo;
  condition_details?: ConditionDetail[];
}

export interface ProfilesResponse {
  profiles: Profile[];
}

export interface TrackingEntry {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface TrackingResponse {
  user_id: string;
  type_filter: string | null;
  days: number;
  entries: TrackingEntry[];
  insights: string[];
}
export interface FamilyAdvice {
  user_id: string;
  name: string;
  date: string;
  text: string;
  generated_at: string;
}
export interface ActivityDefinition {
  key: string;
  label: string;
  icon: string;
  unit: string;
  accent: "coral" | "mint" | "amber" | "slate";
  metric_source: string;
  min_daily: number;
  max_daily: number;
}

export interface Challenge {
  id: string;
  name: string;
  activity: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  participants: string[];
  created_by: string;
  status: string;
}

export interface LeaderboardRow {
  user_id: string;
  name: string;
  avatar_icon: string;
  verified_total: number;
  raw_total: number;
  flagged_count: number;
  flagged_examples: unknown[];
  is_fully_verified: boolean;
  rank: number;
}

export interface Leaderboard {
  challenge: Challenge;
  activity: ActivityDefinition;
  leaderboard: LeaderboardRow[];
  winner: LeaderboardRow | null;
  lead_margin: number;
  total_flagged: number;
  trust_verified: boolean;
}

export interface ChallengesResponse {
  user_id: string;
  challenges: Challenge[];
}

export interface ActivitiesResponse {
  activities: ActivityDefinition[];
}

export interface ChallengePersonRead {
  name: string;
  pattern: string;
  suggestion: string;
}

export interface ChallengeCommentary {
  challenge_id: string;
  text: string;
  per_person: ChallengePersonRead[];
}

export interface ChallengeCheer {
  challenge_id: string;
  target_user_id: string;
  text: string;
}

export interface CreateChallengePayload {
  creator_id: string;
  name: string;
  activity: string;
  duration_days: number;
  participant_ids: string[];
  friends: { id: string; name: string }[];
}
export interface ProgressSeriesItem {
  user_id: string;
  name: string;
  avatar_icon: string;
  daily: number[];
  cumulative: number[];
  flagged_count: number;
  color_key: "coral" | "mint" | "amber" | "slate";
}

export interface ChallengeProgress {
  challenge: Challenge;
  activity: ActivityDefinition;
  dates: string[];
  series: ProgressSeriesItem[];
}
export interface GoalDefinition {
  key: string;
  label: string;
  icon: string;
}

export interface GoalsResponse {
  goals: GoalDefinition[];
}

export interface DailyRecommendation {
  user_id: string;
  goal: string;
  available_minutes: number;
  date: string;
  movement: string;
  food: string;
  wellness: string;
  why: string;
  movement_tag: string;
  food_tag: string;
  conditions: string[];
  source: "nemotron_nano" | "nemotron_lightning" | "rule_based" | string;
  generated_at: string;
}