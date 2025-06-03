-- Check for sessions with incomplete summaries
SELECT 
    s.id AS session_id,
    s.title,
    s.status,
    s.created_at,
    s.realtime_summary_cache IS NOT NULL AS has_cache,
    sm.id AS summary_id,
    sm.tldr,
    sm.key_decisions,
    sm.action_items,
    sm.generation_status
FROM sessions s
LEFT JOIN summaries sm ON sm.session_id = s.id
WHERE s.deleted_at IS NULL
  AND s.status = 'completed'
ORDER BY s.created_at DESC
LIMIT 20;

-- Check specific fields in summaries table for completeness
SELECT 
    id,
    session_id,
    title,
    tldr IS NOT NULL AND tldr != '' AS has_tldr,
    CASE 
        WHEN key_decisions IS NULL THEN 'NULL'
        WHEN jsonb_array_length(key_decisions) = 0 THEN 'EMPTY'
        ELSE 'HAS_DATA'
    END AS key_decisions_status,
    CASE 
        WHEN action_items IS NULL THEN 'NULL'
        WHEN jsonb_array_length(action_items) = 0 THEN 'EMPTY'
        ELSE 'HAS_DATA'
    END AS action_items_status,
    CASE 
        WHEN follow_up_questions IS NULL THEN 'NULL'
        WHEN jsonb_array_length(follow_up_questions) = 0 THEN 'EMPTY'
        ELSE 'HAS_DATA'
    END AS follow_up_questions_status,
    CASE 
        WHEN conversation_highlights IS NULL THEN 'NULL'
        WHEN jsonb_array_length(conversation_highlights) = 0 THEN 'EMPTY'
        ELSE 'HAS_DATA'
    END AS conversation_highlights_status,
    generation_status,
    created_at
FROM summaries
ORDER BY created_at DESC
LIMIT 20;

-- Example query to populate missing summary fields from realtime_summary_cache
-- This would need to be run for each session individually after inspection
/*
UPDATE summaries
SET 
    tldr = COALESCE(tldr, (sessions.realtime_summary_cache->>'tldr')::text),
    key_decisions = COALESCE(
        CASE 
            WHEN key_decisions IS NULL OR jsonb_array_length(key_decisions) = 0 
            THEN (sessions.realtime_summary_cache->'decisions')::jsonb
            ELSE key_decisions
        END,
        '[]'::jsonb
    ),
    action_items = COALESCE(
        CASE 
            WHEN action_items IS NULL OR jsonb_array_length(action_items) = 0 
            THEN (sessions.realtime_summary_cache->'actionItems')::jsonb
            ELSE action_items
        END,
        '[]'::jsonb
    ),
    conversation_highlights = COALESCE(
        CASE 
            WHEN conversation_highlights IS NULL OR jsonb_array_length(conversation_highlights) = 0 
            THEN (sessions.realtime_summary_cache->'keyPoints')::jsonb
            ELSE conversation_highlights
        END,
        '[]'::jsonb
    ),
    follow_up_questions = COALESCE(
        CASE 
            WHEN follow_up_questions IS NULL OR jsonb_array_length(follow_up_questions) = 0 
            THEN (sessions.realtime_summary_cache->'nextSteps')::jsonb
            ELSE follow_up_questions
        END,
        '[]'::jsonb
    ),
    updated_at = NOW()
FROM sessions
WHERE summaries.session_id = sessions.id
  AND sessions.realtime_summary_cache IS NOT NULL
  AND (
    summaries.tldr IS NULL OR 
    summaries.tldr = '' OR
    jsonb_array_length(COALESCE(summaries.key_decisions, '[]'::jsonb)) = 0
  );
*/