-- Verify minute tracking is working
SELECT 
    ut.id,
    ut.session_id,
    ut.minute_timestamp,
    ut.seconds_recorded,
    ut.created_at,
    s.status as session_status,
    s.recording_duration_seconds as total_session_seconds
FROM usage_tracking ut
JOIN sessions s ON s.id = ut.session_id
WHERE ut.session_id = '00a5ebd0-df3e-4767-bea8-5b4707cc65ab'
ORDER BY ut.minute_timestamp DESC
LIMIT 10;

-- Check monthly usage cache
SELECT 
    month_year,
    total_minutes_used,
    total_seconds_used,
    last_updated
FROM monthly_usage_cache
WHERE user_id = '47fa2a65-5444-40f4-8c3f-136e51e1c192'
AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');