// API Types for API routes

// Admin Analytics Types
export interface UserMetric {
  id: string;
  email: string;
  organizationId: string | null;
  sessions: number;
  audioMinutes: number;
}

export interface TopUser extends UserMetric {
  organization: string;
}

// Admin Dashboard Types
export interface Subscription {
  plan_type: string;
  status: string;
  plans?: {
    name: string;
    display_name: string;
  };
}

export interface WaitlistEntry {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'invited';
}

export interface WaitlistStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  invited: number;
}

// Session Types
export interface SessionData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  recording_duration_seconds?: number;
  total_audio_seconds?: number;
  total_words_spoken?: number;
  recording_started_at?: string;
  recording_ended_at?: string;
  title?: string;
  conversation_type?: string;
  status?: string;
  users?: {
    email: string;
    current_organization_id?: string;
  };
}

export interface SessionContext {
  session_id: string;
  context_metadata?: {
    selectedPreviousConversations?: string[];
    [key: string]: unknown;
  };
}

export interface LinkedConversation {
  id: string;
  title: string;
}

export interface LinkedConversationsData {
  count: number;
  conversations: LinkedConversation[];
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  current_plan?: string;
  display_name?: string;
  slug?: string;
  monthly_audio_hours_limit?: number;
  max_members?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationMember {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

export interface OrganizationMembership {
  organization_id: string;
  role: string;
  users: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface OrganizationSubscription {
  organization_id: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  monthly_audio_hours_limit: number;
  plans?: {
    name: string;
    display_name: string;
    price_monthly: number;
    price_yearly: number;
  };
}

export interface OrganizationUsage {
  organization_id: string;
  total_minutes_used: number;
}

export interface OrganizationWithDetails extends Organization {
  members: OrganizationMember[];
  subscription: {
    plan_type: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    monthly_audio_hours_limit: number;
    plan_details?: {
      name: string;
      display_name: string;
      price_monthly: number;
      price_yearly: number;
    };
  } | null;
  usage: {
    current_month_minutes: number;
    total_sessions: number;
  };
}

// User Types
export interface UserData {
  id: string;
  email: string;
  is_admin?: boolean;
  created_at: string;
  current_organization_id?: string;
  last_login_at?: string;
  full_name?: string;
  is_active?: boolean;
}

export interface UserStats {
  total_sessions: number;
  total_audio_minutes: number;
  last_session_at?: string | null;
}

export interface UserSession {
  id: string;
  title?: string;
  created_at: string;
  recording_duration_seconds?: number;
  status?: string;
}

export interface UserDetailedSession {
  id: string;
  title?: string;
  created_at: string;
  duration_minutes: number;
  status: string;
}

export interface UserDetails extends UserData {
  organization?: {
    id: string;
    name: string;
    current_plan: string;
  } | null;
  stats: UserStats;
  sessions: UserDetailedSession[];
}

// Summary Types
export interface SummarySection {
  title: string;
  content: string;
}

export interface SummaryData {
  title?: string;
  overview?: string;
  keyPoints?: string[];
  actionItems?: string[];
  nextSteps?: string[];
  participants?: string[];
  decisions?: string[];
  challenges?: string[];
  opportunities?: string[];
  sections?: SummarySection[];
}

export interface RealtimeSummary {
  tldr: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  nextSteps: string[];
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  progressStatus: 'just_started' | 'building_momentum' | 'making_progress' | 'wrapping_up';
  suggestedChecklistItems: SuggestedChecklistItem[];
}

export interface SummaryResponse {
  summary: RealtimeSummary;
  generatedAt: string;
  sessionId?: string;
}

export interface SummaryInsight {
  observation: string;
  evidence?: string;
  recommendation?: string;
}

export interface SummaryActionItem {
  task: string;
  owner: string;
  timeline: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SummaryDecision {
  decision: string;
  rationale: string;
  impact: string;
}

export interface ConversationDynamics {
  rapport_level: 'excellent' | 'good' | 'neutral' | 'poor';
  engagement_quality: 'high' | 'medium' | 'low';
  dominant_speaker: 'ME' | 'THEM' | 'balanced';
  pace: 'fast' | 'moderate' | 'slow';
  tone: 'formal' | 'casual' | 'mixed';
}

export interface EffectivenessMetrics {
  objective_achievement: number;
  communication_clarity: number;
  participant_satisfaction: number;
  overall_success: number;
}

export interface EnhancedSummary {
  tldr: string;
  key_points: string[];
  decisions_made?: SummaryDecision[];
  action_items: SummaryActionItem[] | string[];
  insights?: SummaryInsight[];
  missed_opportunities?: string[];
  successful_moments?: string[];
  follow_up_questions?: string[];
  conversation_dynamics?: ConversationDynamics;
  effectiveness_metrics?: EffectivenessMetrics;
  coaching_recommendations?: string[];
  outcomes?: string[];
  next_steps?: string[];
}

export interface PerformanceAnalysis {
  strengths: string[];
  areas_for_improvement: string[];
  communication_effectiveness: number;
  goal_achievement: number;
  listening_quality: number;
  question_effectiveness: number;
}

export interface ConversationPatterns {
  opening_effectiveness: string;
  flow_management: string;
  closing_quality: string;
  energy_levels: string;
}

export interface KeyTechnique {
  technique: string;
  example: string;
  effectiveness: string;
}

export interface Recommendation {
  area: string;
  suggestion: string;
  practice_tip: string;
}

export interface FollowUpStrategy {
  immediate_actions: string[];
  short_term: string[];
  long_term: string[];
}

export interface FinalizationData {
  performance_analysis: PerformanceAnalysis;
  conversation_patterns: ConversationPatterns;
  key_techniques_used: KeyTechnique[];
  recommendations: Recommendation[];
  follow_up_strategy: FollowUpStrategy;
  success_indicators: string[];
  risk_factors: string[];
}

// Checklist Types
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  user_id: string;
  session_id?: string;
  created_at: string;
  updated_at: string;
  status?: string;
}

export interface ChecklistGenerationItem {
  text: string;
  priority: 'high' | 'medium' | 'low';
  type: 'preparation' | 'followup' | 'research' | 'decision' | 'action';
}

export interface SuggestedChecklistItem extends ChecklistGenerationItem {
  relevance: number;
}

export interface PreviousSession {
  title: string;
  conversation_type: string;
  context?: {
    text?: string;
  };
}

// Transcript Types
export interface TranscriptData {
  id: string;
  session_id: string;
  text: string;
  timestamp: string;
  sequence_number: number;
  speaker?: string;
  type?: 'final' | 'interim';
}

// Usage Types
export interface UsageData {
  minutes_used: number;
  minutes_limit: number;
  organization_id: string;
  plan_name: string;
}

export interface UsageLimitData {
  minutes_limit: number;
  minutes_remaining: number;
  percentage_used: number;
}

export interface DailyUsage {
  date: string;
  minutes_used: number;
  sessions_count: number;
}

export interface CurrentMonthUsage {
  minutes_used: number;
  seconds_used: number;
  minutes_limit: number;
  minutes_remaining: number;
  percentage_used: number;
  days_remaining: number;
  days_in_month: number;
  average_daily_usage: number;
  projected_monthly_usage: number;
  is_over_limit: boolean;
  is_approaching_limit: boolean;
  recommendation?: string;
  daily_breakdown?: DailyUsage[];
}

// Error Response Type
export interface ErrorResponse {
  error: string;
  details?: string;
}

// Success Response Types
export interface SuccessResponse<T = unknown> {
  data?: T;
  message?: string;
  success?: boolean;
}