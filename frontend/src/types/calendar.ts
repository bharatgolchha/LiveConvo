export type CalendarProvider = 'google_calendar' | 'microsoft_outlook';

export interface CalendarConnection {
  id: string;
  user_id: string;
  organization_id: string;
  provider: CalendarProvider;
  recall_calendar_id: string;
  oauth_refresh_token: string;
  email: string;
  display_name?: string;
  is_active: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  calendar_connection_id: string;
  external_event_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  meeting_url?: string;
  attendees: CalendarAttendee[];
  location?: string;
  organizer_email?: string;
  is_organizer: boolean;
  bot_scheduled: boolean;
  bot_id?: string;
  session_id?: string;
  raw_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  response_status?: 'accepted' | 'declined' | 'tentative' | 'needs_action';
  is_organizer?: boolean;
}

export interface CalendarPreferences {
  id: string;
  user_id: string;
  auto_join_enabled: boolean;
  join_buffer_minutes: number;
  auto_record_enabled: boolean;
  auto_email_summary_enabled: boolean;
  notify_before_join: boolean;
  notification_minutes: number;
  excluded_keywords: string[];
  included_domains: string[];
  created_at: string;
  updated_at: string;
}

export interface CalendarWebhook {
  id: string;
  calendar_connection_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed_at?: string;
  error?: string;
  created_at: string;
}

export interface GoogleOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface RecallCalendarCreateRequest {
  oauth_client_id: string;
  oauth_client_secret: string;
  oauth_refresh_token: string;
  platform: 'google_calendar' | 'microsoft_teams';
}

export interface RecallCalendarResponse {
  id: string;
  created_at: string;
  updated_at: string;
  platform: string;
  email: string;
  status: 'active' | 'inactive';
}

export interface UpcomingMeeting {
  event_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  meeting_url?: string;
  attendees: CalendarAttendee[];
  is_organizer: boolean;
  bot_scheduled: boolean;
  calendar_email: string;
  calendar_provider: CalendarProvider;
  // Derived platform for icon rendering: 'google_calendar' | 'microsoft_outlook' | 'zoom'
  platform?: string;
  auto_join_enabled?: boolean;
  auto_session_created?: boolean;
  auto_session_id?: string;
  auto_bot_status?: 'pending' | 'deployed' | 'joining' | 'in_call' | 'failed' | 'ended';
}

export interface CalendarSyncStatus {
  is_syncing: boolean;
  last_sync?: string;
  error?: string;
}

export interface CalendarOAuthState {
  user_id: string;
  redirect_url: string;
  provider: CalendarProvider;
  timestamp: number;
}