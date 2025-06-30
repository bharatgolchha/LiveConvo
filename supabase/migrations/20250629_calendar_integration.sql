-- Calendar Integration Schema Migration
-- This migration adds support for Google Calendar and Microsoft Outlook integration

-- Calendar provider connections
CREATE TABLE IF NOT EXISTS calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'microsoft_outlook')),
    recall_calendar_id TEXT UNIQUE NOT NULL,
    oauth_refresh_token TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider, email)
);

-- Calendar events synchronized from providers
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
    external_event_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_url TEXT,
    attendees JSONB DEFAULT '[]',
    location TEXT,
    organizer_email TEXT,
    is_organizer BOOLEAN DEFAULT false,
    bot_scheduled BOOLEAN DEFAULT false,
    bot_id TEXT,
    session_id UUID REFERENCES sessions(id),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(calendar_connection_id, external_event_id)
);

-- Calendar webhook events for audit trail
CREATE TABLE IF NOT EXISTS calendar_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User calendar preferences
CREATE TABLE IF NOT EXISTS calendar_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    auto_join_enabled BOOLEAN DEFAULT false,
    join_buffer_minutes INTEGER DEFAULT 2,
    auto_record_enabled BOOLEAN DEFAULT false,
    notify_before_join BOOLEAN DEFAULT true,
    notification_minutes INTEGER DEFAULT 5,
    excluded_keywords TEXT[] DEFAULT '{}',
    included_domains TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX idx_calendar_connections_organization_id ON calendar_connections(organization_id);
CREATE INDEX idx_calendar_events_connection_id ON calendar_events(calendar_connection_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_session_id ON calendar_events(session_id);
CREATE INDEX idx_calendar_webhooks_connection_id ON calendar_webhooks(calendar_connection_id);
CREATE INDEX idx_calendar_webhooks_created_at ON calendar_webhooks(created_at);

-- Enable RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_connections
CREATE POLICY "Users can view their own calendar connections"
    ON calendar_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar connections"
    ON calendar_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar connections"
    ON calendar_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar connections"
    ON calendar_connections FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for calendar_events
CREATE POLICY "Users can view events from their calendar connections"
    ON calendar_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calendar_connections
            WHERE calendar_connections.id = calendar_events.calendar_connection_id
            AND calendar_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage calendar events"
    ON calendar_events FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for calendar_webhooks
CREATE POLICY "Service role can manage webhooks"
    ON calendar_webhooks FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for calendar_preferences
CREATE POLICY "Users can view their own preferences"
    ON calendar_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
    ON calendar_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON calendar_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
    ON calendar_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_calendar_connections_updated_at
    BEFORE UPDATE ON calendar_connections
    FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();

CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();

CREATE TRIGGER update_calendar_preferences_updated_at
    BEFORE UPDATE ON calendar_preferences
    FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();

-- Function to get upcoming meetings for a user
CREATE OR REPLACE FUNCTION get_upcoming_meetings(
    p_user_id UUID,
    p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    meeting_url TEXT,
    attendees JSONB,
    is_organizer BOOLEAN,
    bot_scheduled BOOLEAN,
    calendar_email TEXT,
    calendar_provider TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.start_time,
        ce.end_time,
        ce.meeting_url,
        ce.attendees,
        ce.is_organizer,
        ce.bot_scheduled,
        cc.email,
        cc.provider
    FROM calendar_events ce
    INNER JOIN calendar_connections cc ON ce.calendar_connection_id = cc.id
    WHERE cc.user_id = p_user_id
        AND cc.is_active = true
        AND ce.start_time >= CURRENT_TIMESTAMP
        AND ce.start_time <= CURRENT_TIMESTAMP + (p_days_ahead || ' days')::INTERVAL
    ORDER BY ce.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_upcoming_meetings TO authenticated;