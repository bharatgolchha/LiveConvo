-- Migration: Auto-Join Meetings Feature
-- Description: Adds support for automatic meeting session creation and bot deployment
-- Date: 2025-06-29

-- Add fields to calendar_events table for auto-join functionality
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS auto_session_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_bot_status TEXT CHECK (auto_bot_status IN ('pending', 'deployed', 'joining', 'in_call', 'failed', 'ended'));

-- Create index for efficient querying of upcoming meetings
CREATE INDEX IF NOT EXISTS idx_calendar_events_auto_join 
ON calendar_events(calendar_connection_id, start_time, auto_session_created) 
WHERE meeting_url IS NOT NULL;

-- Create table to log auto-join activities
CREATE TABLE IF NOT EXISTS calendar_auto_join_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    bot_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('session_created', 'bot_deployed', 'bot_joined', 'bot_failed', 'session_ended')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient log queries
CREATE INDEX IF NOT EXISTS idx_auto_join_logs_user_time 
ON calendar_auto_join_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_join_logs_event 
ON calendar_auto_join_logs(calendar_event_id);

-- Create table for meeting notifications
CREATE TABLE IF NOT EXISTS meeting_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('meeting_starting', 'bot_deployed', 'bot_in_call', 'bot_failed')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_meeting_notifications_user_unread 
ON meeting_notifications(user_id, read, created_at DESC);

-- Enable RLS on new tables
ALTER TABLE calendar_auto_join_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_auto_join_logs
CREATE POLICY "Users can view their own auto-join logs"
ON calendar_auto_join_logs FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for meeting_notifications
CREATE POLICY "Users can view their own notifications"
ON meeting_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON meeting_notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to check if a meeting should auto-join
CREATE OR REPLACE FUNCTION should_auto_join_meeting(
    p_event_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_preferences JSONB;
    v_event RECORD;
    v_excluded_keywords TEXT[];
    v_actual_user_id UUID;
BEGIN
    -- Get the actual user_id from the calendar event through calendar_connection
    SELECT cc.user_id INTO v_actual_user_id
    FROM calendar_events ce
    JOIN calendar_connections cc ON ce.calendar_connection_id = cc.id
    WHERE ce.id = p_event_id;
    
    -- Get user preferences
    SELECT calendar_preferences INTO v_user_preferences
    FROM users
    WHERE id = COALESCE(p_user_id, v_actual_user_id);
    
    -- Check if auto-join is enabled
    IF NOT COALESCE((v_user_preferences->>'auto_record_enabled')::BOOLEAN, FALSE) THEN
        RETURN FALSE;
    END IF;
    
    -- Get event details
    SELECT * INTO v_event
    FROM calendar_events
    WHERE id = p_event_id;
    
    -- Check if already processed
    IF v_event.auto_session_created THEN
        RETURN FALSE;
    END IF;
    
    -- Check if meeting URL exists
    IF v_event.meeting_url IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check excluded keywords
    v_excluded_keywords := ARRAY(
        SELECT jsonb_array_elements_text(
            COALESCE(v_user_preferences->'excluded_keywords', '[]'::jsonb)
        )
    );
    
    IF v_excluded_keywords IS NOT NULL AND array_length(v_excluded_keywords, 1) > 0 THEN
        -- Check if title contains any excluded keywords
        IF EXISTS (
            SELECT 1 
            FROM unnest(v_excluded_keywords) AS keyword
            WHERE LOWER(v_event.title) LIKE '%' || LOWER(keyword) || '%'
        ) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log auto-join activities
CREATE OR REPLACE FUNCTION log_auto_join_activity(
    p_user_id UUID,
    p_event_id UUID,
    p_session_id UUID,
    p_bot_id TEXT,
    p_action TEXT,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO calendar_auto_join_logs (
        user_id,
        calendar_event_id,
        session_id,
        bot_id,
        action,
        status,
        error_message,
        metadata
    ) VALUES (
        p_user_id,
        p_event_id,
        p_session_id,
        p_bot_id,
        p_action,
        p_status,
        p_error_message,
        p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create meeting notification
CREATE OR REPLACE FUNCTION create_meeting_notification(
    p_user_id UUID,
    p_event_id UUID,
    p_session_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_action_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO meeting_notifications (
        user_id,
        calendar_event_id,
        session_id,
        notification_type,
        title,
        message,
        action_url
    ) VALUES (
        p_user_id,
        p_event_id,
        p_session_id,
        p_type,
        p_title,
        p_message,
        p_action_url
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION should_auto_join_meeting TO authenticated;
GRANT EXECUTE ON FUNCTION log_auto_join_activity TO service_role;
GRANT EXECUTE ON FUNCTION create_meeting_notification TO service_role;