-- Migration: Fix duplicate participants in sessions table
-- Date: 2025-07-23
-- Description: Fixes the participant syncing functions to prevent duplicate participants
--              and cleans up existing duplicate data

-- First, clean up existing duplicate participants
UPDATE sessions
SET participants = (
  SELECT jsonb_agg(DISTINCT value)
  FROM jsonb_array_elements(participants) AS value
  WHERE value IS NOT NULL
)
WHERE participants IS NOT NULL 
  AND jsonb_array_length(participants) > 0;

-- Drop the existing triggers that depend on the function
DROP TRIGGER IF EXISTS trg_sync_session_participants ON transcripts;
DROP TRIGGER IF EXISTS sync_participants_on_calendar_update ON calendar_events;

-- Drop the old function with CASCADE to remove all dependencies
DROP FUNCTION IF EXISTS sync_session_participants() CASCADE;

-- Create function for syncing participants from calendar events
CREATE OR REPLACE FUNCTION sync_calendar_participants()
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

-- Create improved function for syncing speakers from transcripts (prevents duplicates)
CREATE OR REPLACE FUNCTION sync_transcript_speakers()
RETURNS TRIGGER AS $$
BEGIN
  -- Ignore blank or generic speakers
  IF NEW.speaker IS NULL OR TRIM(NEW.speaker) = '' THEN
    RETURN NEW;
  END IF;
  
  -- Ignore common generic speaker names
  IF LOWER(TRIM(NEW.speaker)) IN ('me', 'them', 'user', 'other', 'participant', 'participants', 'you') THEN
    RETURN NEW;
  END IF;

  -- Update participants array only if speaker doesn't already exist
  UPDATE sessions
  SET participants = CASE
    -- If participants is null or empty, create new array
    WHEN participants IS NULL OR participants = '[]'::jsonb THEN
      jsonb_build_array(NEW.speaker)
    -- If speaker already exists in array, don't add again
    WHEN participants @> to_jsonb(NEW.speaker) THEN
      participants
    -- Otherwise append the new speaker
    ELSE
      participants || jsonb_build_array(NEW.speaker)
  END,
  updated_at = NOW()
  WHERE id = NEW.session_id
    -- Only update if the speaker is not already in the array
    AND (participants IS NULL 
         OR participants = '[]'::jsonb 
         OR NOT (participants @> to_jsonb(NEW.speaker)));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for calendar events
CREATE TRIGGER sync_participants_on_calendar_update
AFTER INSERT OR UPDATE OF attendees, session_id ON calendar_events
FOR EACH ROW 
WHEN (NEW.session_id IS NOT NULL)
EXECUTE FUNCTION sync_calendar_participants();

-- Create trigger for transcripts
CREATE TRIGGER trg_sync_transcript_speakers
AFTER INSERT ON transcripts
FOR EACH ROW
EXECUTE FUNCTION sync_transcript_speakers();

-- Add comments for documentation
COMMENT ON FUNCTION sync_calendar_participants() IS 'Syncs attendees from calendar events to the participants array in sessions table';
COMMENT ON FUNCTION sync_transcript_speakers() IS 'Syncs unique speaker names from transcripts to the participants array in sessions table, preventing duplicates';

-- Create a function to clean up participants for a specific session
CREATE OR REPLACE FUNCTION clean_session_participants(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_cleaned_participants JSONB;
BEGIN
  -- Get distinct participants
  SELECT jsonb_agg(DISTINCT value)
  INTO v_cleaned_participants
  FROM sessions s, jsonb_array_elements(s.participants) AS value
  WHERE s.id = p_session_id
    AND value IS NOT NULL;
  
  -- Update the session
  UPDATE sessions
  SET participants = COALESCE(v_cleaned_participants, '[]'::jsonb),
      updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN v_cleaned_participants;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION clean_session_participants TO authenticated;

-- Add an index to improve performance of the containment check
CREATE INDEX IF NOT EXISTS idx_sessions_participants_gin ON sessions USING GIN (participants);

-- Clean up any sessions that have way too many duplicate participants (more than 50)
UPDATE sessions
SET participants = (
  SELECT jsonb_agg(DISTINCT participant)
  FROM (
    SELECT DISTINCT jsonb_array_elements_text(participants) as participant
    FROM sessions s2
    WHERE s2.id = sessions.id
  ) AS unique_participants
)
WHERE jsonb_array_length(participants) > 50;