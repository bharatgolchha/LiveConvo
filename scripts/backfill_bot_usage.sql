-- Backfill Bot Usage for Completed Sessions
-- This script calculates bot minutes for sessions that have valid recording times but 0 bot_recording_minutes

-- First, let's see what we need to fix
SELECT 
    id,
    title,
    recording_started_at,
    recording_ended_at,
    recording_duration_seconds,
    bot_recording_minutes,
    recall_bot_status,
    CASE 
        WHEN recording_started_at IS NOT NULL AND recording_ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (recording_ended_at - recording_started_at))::INTEGER
        ELSE 0
    END as calculated_duration_seconds,
    CASE 
        WHEN recording_started_at IS NOT NULL AND recording_ended_at IS NOT NULL 
        THEN CEIL(EXTRACT(EPOCH FROM (recording_ended_at - recording_started_at)) / 60.0)::INTEGER
        ELSE 0
    END as calculated_bot_minutes,
    CASE 
        WHEN recording_started_at IS NOT NULL AND recording_ended_at IS NOT NULL 
        THEN (CEIL(EXTRACT(EPOCH FROM (recording_ended_at - recording_started_at)) / 60.0) * 0.10)::DECIMAL(10,2)
        ELSE 0.00
    END as calculated_billable_amount
FROM sessions 
WHERE recall_bot_id IS NOT NULL 
    AND bot_recording_minutes = 0
    AND recording_started_at IS NOT NULL 
    AND recording_ended_at IS NOT NULL
    AND status IN ('completed', 'active')
ORDER BY created_at DESC;

-- Update sessions with calculated bot usage
UPDATE sessions 
SET 
    bot_recording_minutes = CEIL(EXTRACT(EPOCH FROM (recording_ended_at - recording_started_at)) / 60.0)::INTEGER,
    bot_billable_amount = (CEIL(EXTRACT(EPOCH FROM (recording_ended_at - recording_started_at)) / 60.0) * 0.10)::DECIMAL(10,2),
    recording_duration_seconds = CASE 
        WHEN recording_duration_seconds = 0 OR recording_duration_seconds IS NULL
        THEN EXTRACT(EPOCH FROM (recording_ended_at - recording_started_at))::INTEGER
        ELSE recording_duration_seconds
    END,
    recall_bot_status = 'completed',
    updated_at = NOW()
WHERE recall_bot_id IS NOT NULL 
    AND bot_recording_minutes = 0
    AND recording_started_at IS NOT NULL 
    AND recording_ended_at IS NOT NULL
    AND status IN ('completed', 'active');

-- Update bot_usage_tracking table with calculated values
UPDATE bot_usage_tracking 
SET 
    recording_ended_at = s.recording_ended_at,
    total_recording_seconds = EXTRACT(EPOCH FROM (s.recording_ended_at - s.recording_started_at))::INTEGER,
    billable_minutes = CEIL(EXTRACT(EPOCH FROM (s.recording_ended_at - s.recording_started_at)) / 60.0)::INTEGER,
    status = 'completed',
    updated_at = NOW()
FROM sessions s
WHERE bot_usage_tracking.session_id = s.id
    AND bot_usage_tracking.recording_ended_at IS NULL
    AND s.recording_started_at IS NOT NULL 
    AND s.recording_ended_at IS NOT NULL
    AND s.recall_bot_id IS NOT NULL;

-- Create usage_tracking entries for the backfilled sessions
-- This creates minute-by-minute tracking entries for proper usage accounting
WITH session_minutes AS (
    SELECT 
        s.id as session_id,
        s.user_id,
        s.organization_id,
        s.recording_started_at,
        CEIL(EXTRACT(EPOCH FROM (s.recording_ended_at - s.recording_started_at)) / 60.0)::INTEGER as total_minutes,
        generate_series(
            date_trunc('minute', s.recording_started_at),
            s.recording_ended_at,
            interval '1 minute'
        ) as minute_timestamp
    FROM sessions s
    WHERE s.recall_bot_id IS NOT NULL 
        AND s.recording_started_at IS NOT NULL 
        AND s.recording_ended_at IS NOT NULL
        AND s.bot_recording_minutes > 0
        AND NOT EXISTS (
            SELECT 1 FROM usage_tracking ut 
            WHERE ut.session_id = s.id 
            AND ut.source = 'browser_recording'
        )
)
INSERT INTO usage_tracking (
    organization_id,
    user_id,
    session_id,
    minute_timestamp,
    seconds_recorded,
    source,
    metadata
)
SELECT 
    sm.organization_id,
    sm.user_id,
    sm.session_id,
    sm.minute_timestamp,
    CASE 
        WHEN sm.minute_timestamp = date_trunc('minute', sm.recording_started_at) 
        THEN LEAST(60, EXTRACT(EPOCH FROM (sm.recording_started_at + interval '1 minute' - date_trunc('minute', sm.recording_started_at)))::INTEGER)
        ELSE 60
    END as seconds_recorded,
    'bot_recording' as source,
    jsonb_build_object(
        'backfilled', true,
        'backfill_date', NOW()
    ) as metadata
FROM session_minutes sm;

-- Verify the results
SELECT 
    'Fixed Sessions' as category,
    COUNT(*) as count,
    SUM(bot_recording_minutes) as total_bot_minutes,
    SUM(bot_billable_amount) as total_billable_amount
FROM sessions 
WHERE recall_bot_id IS NOT NULL 
    AND bot_recording_minutes > 0; 