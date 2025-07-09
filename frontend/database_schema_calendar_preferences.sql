-- Database Schema for Calendar, Events, Preferences, and Meeting-related Tables
-- Generated from liveprompt.ai database (development environment: ucvfgfbjcrxbzppwjpuu)

-- =====================================================
-- Calendar Connections Table
-- =====================================================
-- Stores OAuth connections to external calendar providers (Google, Outlook, etc.)
CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  provider TEXT NOT NULL, -- 'google', 'outlook', etc.
  recall_calendar_id TEXT NOT NULL UNIQUE, -- Unique ID from Recall.ai
  oauth_refresh_token TEXT NOT NULL, -- Encrypted OAuth refresh token
  email TEXT NOT NULL, -- Email associated with the calendar
  display_name TEXT, -- Display name for the calendar
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint to prevent duplicate calendar connections
  CONSTRAINT calendar_connections_user_id_provider_email_key 
    UNIQUE (user_id, provider, email)
);

-- Indexes for calendar_connections
CREATE INDEX idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX idx_calendar_connections_organization_id ON calendar_connections(organization_id);

-- =====================================================
-- Calendar Events Table
-- =====================================================
-- Stores synchronized calendar events from connected calendars
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_connection_id UUID REFERENCES calendar_connections(id),
  external_event_id TEXT NOT NULL, -- ID from the external calendar system
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  meeting_url TEXT, -- Zoom, Teams, Meet URL extracted from event
  attendees JSONB DEFAULT '[]'::jsonb, -- Array of attendee objects
  location TEXT,
  organizer_email TEXT,
  is_organizer BOOLEAN DEFAULT false,
  bot_scheduled BOOLEAN DEFAULT false, -- Whether a bot is scheduled for this event
  bot_id TEXT, -- Recall.ai bot ID if scheduled
  session_id UUID REFERENCES sessions(id), -- Linked session if created
  raw_data JSONB, -- Complete raw event data from provider
  auto_session_created BOOLEAN DEFAULT false, -- Whether auto-join created a session
  auto_session_id UUID REFERENCES sessions(id), -- Auto-created session ID
  auto_bot_status TEXT, -- Status of auto-joined bot
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint to prevent duplicate events
  CONSTRAINT calendar_events_calendar_connection_id_external_event_id_key 
    UNIQUE (calendar_connection_id, external_event_id)
);

-- Indexes for calendar_events
CREATE INDEX idx_calendar_events_connection_id ON calendar_events(calendar_connection_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_session_id ON calendar_events(session_id);
CREATE INDEX idx_calendar_events_auto_join ON calendar_events(calendar_connection_id, start_time, auto_session_created) 
  WHERE meeting_url IS NOT NULL;

-- =====================================================
-- Calendar Preferences Table
-- =====================================================
-- Stores user preferences for calendar integration and auto-join behavior
CREATE TABLE IF NOT EXISTS public.calendar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  auto_join_enabled BOOLEAN DEFAULT false, -- Enable automatic bot joining
  join_buffer_minutes INTEGER DEFAULT 2, -- Minutes before meeting to join
  auto_record_enabled BOOLEAN DEFAULT false, -- Auto-record joined meetings
  notify_before_join BOOLEAN DEFAULT true, -- Send notification before joining
  notification_minutes INTEGER DEFAULT 5, -- Minutes before to notify
  excluded_keywords TEXT[] DEFAULT '{}'::text[], -- Keywords to exclude from auto-join
  included_domains TEXT[] DEFAULT '{}'::text[], -- Email domains to include
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- User Preferences Table
-- =====================================================
-- General user preferences including email notification settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email_notifications_enabled BOOLEAN DEFAULT true,
  email_post_call_summary BOOLEAN DEFAULT true, -- Send summary after calls
  email_weekly_digest BOOLEAN DEFAULT false, -- Weekly summary emails
  email_important_insights BOOLEAN DEFAULT true, -- Important insights emails
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Index for user_preferences
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- =====================================================
-- Calendar Webhooks Table
-- =====================================================
-- Stores webhook events from calendar providers for processing
CREATE TABLE IF NOT EXISTS public.calendar_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_connection_id UUID REFERENCES calendar_connections(id),
  event_type TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  payload JSONB NOT NULL, -- Raw webhook payload
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for calendar_webhooks
CREATE INDEX idx_calendar_webhooks_connection_id ON calendar_webhooks(calendar_connection_id);
CREATE INDEX idx_calendar_webhooks_created_at ON calendar_webhooks(created_at);

-- =====================================================
-- Calendar Auto Join Logs Table
-- =====================================================
-- Logs all auto-join attempts and their outcomes
CREATE TABLE IF NOT EXISTS public.calendar_auto_join_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  calendar_event_id UUID NOT NULL REFERENCES calendar_events(id),
  session_id UUID REFERENCES sessions(id),
  bot_id TEXT,
  action TEXT NOT NULL, -- 'scheduled', 'joined', 'failed', 'cancelled'
  status TEXT NOT NULL, -- 'success', 'error', 'skipped'
  error_message TEXT,
  metadata JSONB, -- Additional context about the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for calendar_auto_join_logs
CREATE INDEX idx_auto_join_logs_user_time ON calendar_auto_join_logs(user_id, created_at DESC);
CREATE INDEX idx_auto_join_logs_event ON calendar_auto_join_logs(calendar_event_id);

-- =====================================================
-- Meeting Notifications Table
-- =====================================================
-- Stores notifications related to meetings and calendar events
CREATE TABLE IF NOT EXISTS public.meeting_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  calendar_event_id UUID REFERENCES calendar_events(id),
  session_id UUID REFERENCES sessions(id),
  notification_type TEXT NOT NULL, -- 'pre_meeting', 'bot_joined', 'summary_ready', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- URL for user to take action
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for meeting_notifications
CREATE INDEX idx_meeting_notifications_user_unread ON meeting_notifications(user_id, read, created_at DESC);

-- =====================================================
-- Meeting Metadata Table (from video conference migration)
-- =====================================================
-- Stores additional metadata for video conference meetings
CREATE TABLE IF NOT EXISTS public.meeting_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  platform VARCHAR(50) NOT NULL, -- zoom, google_meet, teams
  meeting_id VARCHAR(255), -- Platform-specific meeting ID
  host_id VARCHAR(255), -- Platform-specific host ID
  participant_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  meeting_agenda TEXT, -- Structured agenda for the meeting
  scheduled_at TIMESTAMP WITH TIME ZONE, -- When the meeting is scheduled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for meeting_metadata
CREATE INDEX idx_meeting_metadata_session_id ON meeting_metadata(session_id);
CREATE INDEX idx_meeting_metadata_platform ON meeting_metadata(platform);
CREATE INDEX idx_meeting_metadata_scheduled_at ON meeting_metadata(scheduled_at);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Calendar Connections RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar connections"
  ON calendar_connections FOR SELECT
  USING (user_id = auth.uid() OR organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own calendar connections"
  ON calendar_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar connections"
  ON calendar_connections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own calendar connections"
  ON calendar_connections FOR DELETE
  USING (user_id = auth.uid());

-- Calendar Events RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calendar events from their connections"
  ON calendar_events FOR SELECT
  USING (calendar_connection_id IN (
    SELECT id FROM calendar_connections WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert calendar events for their connections"
  ON calendar_events FOR INSERT
  WITH CHECK (calendar_connection_id IN (
    SELECT id FROM calendar_connections WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update calendar events from their connections"
  ON calendar_events FOR UPDATE
  USING (calendar_connection_id IN (
    SELECT id FROM calendar_connections WHERE user_id = auth.uid()
  ));

-- Calendar Preferences RLS
ALTER TABLE calendar_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar preferences"
  ON calendar_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own calendar preferences"
  ON calendar_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar preferences"
  ON calendar_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- User Preferences RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Calendar Webhooks RLS
ALTER TABLE calendar_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhooks for their calendar connections"
  ON calendar_webhooks FOR SELECT
  USING (calendar_connection_id IN (
    SELECT id FROM calendar_connections WHERE user_id = auth.uid()
  ));

-- Calendar Auto Join Logs RLS
ALTER TABLE calendar_auto_join_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own auto join logs"
  ON calendar_auto_join_logs FOR SELECT
  USING (user_id = auth.uid());

-- Meeting Notifications RLS
ALTER TABLE meeting_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON meeting_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON meeting_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Meeting Metadata RLS (from video conference migration)
ALTER TABLE meeting_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting metadata for their sessions"
  ON meeting_metadata FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE user_id = auth.uid() 
      OR organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert meeting metadata for their sessions"
  ON meeting_metadata FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update meeting metadata for their sessions"
  ON meeting_metadata FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Helper Functions and Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_calendar_connections_updated_at 
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at 
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_preferences_updated_at 
  BEFORE UPDATE ON calendar_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_metadata_updated_at 
  BEFORE UPDATE ON meeting_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE calendar_connections IS 'Stores OAuth connections to external calendar providers';
COMMENT ON TABLE calendar_events IS 'Stores synchronized calendar events from connected calendars';
COMMENT ON TABLE calendar_preferences IS 'User preferences for calendar integration and auto-join behavior';
COMMENT ON TABLE user_preferences IS 'General user preferences including email notification settings';
COMMENT ON TABLE calendar_webhooks IS 'Webhook events from calendar providers for processing';
COMMENT ON TABLE calendar_auto_join_logs IS 'Logs all auto-join attempts and their outcomes';
COMMENT ON TABLE meeting_notifications IS 'Notifications related to meetings and calendar events';
COMMENT ON TABLE meeting_metadata IS 'Additional metadata for video conference meetings';

COMMENT ON COLUMN calendar_events.attendees IS 'JSON array of attendee objects with email, name, response status';
COMMENT ON COLUMN calendar_events.auto_session_created IS 'Whether a session was automatically created via auto-join';
COMMENT ON COLUMN calendar_preferences.excluded_keywords IS 'Array of keywords in event titles that should be excluded from auto-join';
COMMENT ON COLUMN calendar_preferences.included_domains IS 'Array of email domains to include for auto-join (empty means all)';
COMMENT ON COLUMN meeting_notifications.notification_type IS 'Type: pre_meeting, bot_joined, summary_ready, error, etc.';

-- =====================================================
-- System Settings Table
-- =====================================================
-- Stores system-wide configuration settings as key-value pairs
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for system_settings updated_at
CREATE TRIGGER update_system_settings_updated_at 
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE system_settings IS 'System-wide configuration settings stored as key-value pairs';
COMMENT ON COLUMN system_settings.key IS 'Unique key identifying the setting';
COMMENT ON COLUMN system_settings.value IS 'JSON value containing the setting data';