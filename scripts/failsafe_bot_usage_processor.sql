-- FAILSAFE: Auto-complete orphaned bot recordings
-- This script detects sessions that should be completed but are stuck in "recording" status
-- Run this periodically (e.g., every 5 minutes) to catch missed webhook events

-- Detect sessions that need to be auto-completed
-- Criteria: Status is 'recording' but no new transcript data in last 5 minutes
WITH orphaned_sessions AS (
    SELECT DISTINCT
        but.bot_id,
        but.session_id,
        but.user_id,
        but.organization_id,
        but.recording_started_at,
        s.recording_ended_at,
        s.status as session_status,
        but.status as bot_status,
        -- Find latest transcript for this session
        COALESCE(
            (SELECT MAX(created_at) FROM transcripts WHERE session_id = but.session_id),
            but.recording_started_at
        ) as last_transcript_time,
        -- Calculate if this should be considered "orphaned"
        CASE 
            WHEN s.recording_ended_at IS NOT NULL AND but.recording_ended_at IS NULL THEN 'session_ended_but_bot_active'
            WHEN s.status = 'completed' AND but.status = 'recording' THEN 'session_completed_but_bot_recording'
            WHEN but.recording_started_at < NOW() - INTERVAL '5 minutes' 
                 AND COALESCE((SELECT MAX(created_at) FROM transcripts WHERE session_id = but.session_id), but.recording_started_at) < NOW() - INTERVAL '5 minutes'
                 AND but.status = 'recording' THEN 'no_activity_timeout'
            ELSE NULL
        END as orphan_reason
    FROM bot_usage_tracking but
    JOIN sessions s ON s.id = but.session_id
    WHERE but.status = 'recording'
        AND but.recording_started_at IS NOT NULL
)
SELECT 
    bot_id,
    session_id,
    recording_started_at,
    last_transcript_time,
    orphan_reason,
    -- Calculate what the end time should be
    CASE 
        WHEN orphan_reason = 'session_ended_but_bot_active' THEN 
            (SELECT recording_ended_at FROM sessions WHERE id = session_id)
        WHEN orphan_reason = 'session_completed_but_bot_recording' THEN 
            COALESCE(
                (SELECT recording_ended_at FROM sessions WHERE id = session_id),
                last_transcript_time + INTERVAL '30 seconds'
            )
        WHEN orphan_reason = 'no_activity_timeout' THEN 
            last_transcript_time + INTERVAL '30 seconds'
        ELSE NULL
    END as calculated_end_time
FROM orphaned_sessions 
WHERE orphan_reason IS NOT NULL
ORDER BY recording_started_at DESC;

-- Auto-complete orphaned bot recordings
WITH orphaned_sessions AS (
    SELECT DISTINCT
        but.bot_id,
        but.session_id,
        but.user_id,
        but.organization_id,
        but.recording_started_at,
        s.recording_ended_at,
        s.status as session_status,
        but.status as bot_status,
        -- Find latest transcript for this session
        COALESCE(
            (SELECT MAX(created_at) FROM transcripts WHERE session_id = but.session_id),
            but.recording_started_at
        ) as last_transcript_time,
        -- Calculate if this should be considered "orphaned"
        CASE 
            WHEN s.recording_ended_at IS NOT NULL AND but.recording_ended_at IS NULL THEN 'session_ended_but_bot_active'
            WHEN s.status = 'completed' AND but.status = 'recording' THEN 'session_completed_but_bot_recording'
            WHEN but.recording_started_at < NOW() - INTERVAL '5 minutes' 
                 AND COALESCE((SELECT MAX(created_at) FROM transcripts WHERE session_id = but.session_id), but.recording_started_at) < NOW() - INTERVAL '5 minutes'
                 AND but.status = 'recording' THEN 'no_activity_timeout'
            ELSE NULL
        END as orphan_reason
    FROM bot_usage_tracking but
    JOIN sessions s ON s.id = but.session_id
    WHERE but.status = 'recording'
        AND but.recording_started_at IS NOT NULL
),
orphan_calculations AS (
    SELECT 
        bot_id,
        session_id,
        user_id,
        organization_id,
        recording_started_at,
        orphan_reason,
        -- Calculate what the end time should be
        CASE 
            WHEN orphan_reason = 'session_ended_but_bot_active' THEN 
                (SELECT recording_ended_at FROM sessions WHERE id = session_id)
            WHEN orphan_reason = 'session_completed_but_bot_recording' THEN 
                COALESCE(
                    (SELECT recording_ended_at FROM sessions WHERE id = session_id),
                    last_transcript_time + INTERVAL '30 seconds'
                )
            WHEN orphan_reason = 'no_activity_timeout' THEN 
                last_transcript_time + INTERVAL '30 seconds'
            ELSE NULL
        END as calculated_end_time
    FROM orphaned_sessions 
    WHERE orphan_reason IS NOT NULL
),
calculated_usage AS (
    SELECT 
        *,
        EXTRACT(EPOCH FROM (calculated_end_time - recording_started_at))::INTEGER as duration_seconds,
        CEIL(EXTRACT(EPOCH FROM (calculated_end_time - recording_started_at)) / 60.0)::INTEGER as billable_minutes
    FROM orphan_calculations
    WHERE calculated_end_time IS NOT NULL
        AND calculated_end_time > recording_started_at
)
-- Update bot_usage_tracking for orphaned sessions
UPDATE bot_usage_tracking 
SET 
    recording_ended_at = cu.calculated_end_time,
    total_recording_seconds = cu.duration_seconds,
    billable_minutes = cu.billable_minutes,
    status = 'completed',
    updated_at = NOW()
FROM calculated_usage cu
WHERE bot_usage_tracking.bot_id = cu.bot_id
    AND bot_usage_tracking.status = 'recording';

-- Update sessions table for orphaned sessions
WITH orphaned_sessions AS (
    SELECT DISTINCT
        but.bot_id,
        but.session_id,
        but.user_id,
        but.organization_id,
        but.recording_started_at,
        s.recording_ended_at,
        s.status as session_status,
        but.status as bot_status,
        -- Find latest transcript for this session
        COALESCE(
            (SELECT MAX(created_at) FROM transcripts WHERE session_id = but.session_id),
            but.recording_started_at
        ) as last_transcript_time,
        -- Calculate if this should be considered "orphaned"
        CASE 
            WHEN s.recording_ended_at IS NOT NULL AND but.recording_ended_at IS NULL THEN 'session_ended_but_bot_active'
            WHEN s.status = 'completed' AND but.status = 'recording' THEN 'session_completed_but_bot_recording'
            WHEN but.recording_started_at < NOW() - INTERVAL '5 minutes' 
                 AND COALESCE((SELECT MAX(created_at) FROM transcripts WHERE session_id = but.session_id), but.recording_started_at) < NOW() - INTERVAL '5 minutes'
                 AND but.status = 'recording' THEN 'no_activity_timeout'
            ELSE NULL
        END as orphan_reason
    FROM bot_usage_tracking but
    JOIN sessions s ON s.id = but.session_id
    WHERE but.recording_ended_at IS NOT NULL  -- Only sessions we just fixed
        AND but.status = 'completed'
),
session_updates AS (
    SELECT 
        session_id,
        (SELECT billable_minutes FROM bot_usage_tracking WHERE session_id = os.session_id LIMIT 1) as bot_minutes,
        (SELECT total_recording_seconds FROM bot_usage_tracking WHERE session_id = os.session_id LIMIT 1) as duration_seconds,
        (SELECT recording_ended_at FROM bot_usage_tracking WHERE session_id = os.session_id LIMIT 1) as end_time
    FROM orphaned_sessions os
    WHERE orphan_reason IS NOT NULL
)
UPDATE sessions 
SET 
    bot_recording_minutes = su.bot_minutes,
    bot_billable_amount = (su.bot_minutes * 0.10)::DECIMAL(10,2),
    recording_duration_seconds = COALESCE(su.duration_seconds, recording_duration_seconds),
    recording_ended_at = COALESCE(su.end_time, recording_ended_at),
    recall_bot_status = 'completed',
    status = CASE WHEN status = 'active' THEN 'completed' ELSE status END,
    updated_at = NOW()
FROM session_updates su
WHERE sessions.id = su.session_id; 