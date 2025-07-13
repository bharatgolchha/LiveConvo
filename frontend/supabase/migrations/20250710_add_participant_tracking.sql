-- Migration: Add participant tracking to sessions and shared reports
-- Date: 2025-07-10
-- Description: Adds participant storage to sessions and sharing options to shared_reports

-- Add participants column to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]';

-- Add share settings columns to shared_reports table
ALTER TABLE shared_reports
ADD COLUMN IF NOT EXISTS share_with_participants BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS excluded_participants TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_send_status JSONB DEFAULT '{}';

-- Create function to sync participants from calendar events to sessions
CREATE OR REPLACE FUNCTION sync_session_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if session_id is set and attendees exist
  IF NEW.session_id IS NOT NULL AND NEW.attendees IS NOT NULL THEN
    UPDATE sessions 
    SET participants = NEW.attendees,
        updated_at = NOW()
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync participants when calendar event is linked to session
CREATE TRIGGER sync_participants_on_calendar_update
AFTER INSERT OR UPDATE OF attendees, session_id ON calendar_events
FOR EACH ROW 
WHEN (NEW.session_id IS NOT NULL)
EXECUTE FUNCTION sync_session_participants();

-- Function to get session participants (from session or calendar event)
CREATE OR REPLACE FUNCTION get_session_participants(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_participants JSONB;
BEGIN
  -- First try to get from sessions table
  SELECT participants INTO v_participants
  FROM sessions
  WHERE id = p_session_id;
  
  -- If empty, try to get from linked calendar event
  IF v_participants IS NULL OR v_participants = '[]'::jsonb THEN
    SELECT ce.attendees INTO v_participants
    FROM calendar_events ce
    WHERE ce.session_id = p_session_id
    LIMIT 1;
  END IF;
  
  -- Return empty array if still null
  RETURN COALESCE(v_participants, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_session_participants TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_participants ON sessions USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_shared_reports_share_with_participants ON shared_reports(share_with_participants) WHERE share_with_participants = true;

-- Add comments for documentation
COMMENT ON COLUMN sessions.participants IS 'Array of participant objects with email, name, and response status from calendar events';
COMMENT ON COLUMN shared_reports.share_with_participants IS 'Whether this shared report was sent to all meeting participants';
COMMENT ON COLUMN shared_reports.excluded_participants IS 'Array of email addresses excluded from participant sharing';
COMMENT ON COLUMN shared_reports.email_send_status IS 'JSON object tracking email send status for each recipient';