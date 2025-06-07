/**
 * Admin-specific types and interfaces
 */

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in?: string;
  total_sessions?: number;
  total_audio_seconds?: number;
  subscription_tier?: string;
  subscription_status?: string;
  is_admin?: boolean;
  onboarding_completed?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  subscription_tier?: string;
  subscription_status?: string;
  total_users?: number;
  total_sessions?: number;
  total_audio_minutes?: number;
}

export interface SystemHealth {
  database: boolean;
  auth: boolean;
  api: boolean;
  deepgram: boolean;
  openrouter: boolean;
}

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalMinutes: number;
  averageSessionLength: number;
  userGrowth: Array<{
    date: string;
    count: number;
  }>;
  sessionGrowth: Array<{
    date: string;
    count: number;
  }>;
  topUsers: Array<{
    email: string;
    sessions: number;
    minutes: number;
  }>;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalAudioMinutes: number;
  userGrowth: number;
  sessionGrowth: number;
  recentUsers: AdminUser[];
  recentSessions: Array<{
    id: string;
    user_email: string;
    created_at: string;
    duration_seconds: number;
    transcript_word_count: number;
  }>;
}

export interface SystemLog {
  timestamp: string;
  level: string;
  message: string;
  details?: Record<string, unknown>;
}