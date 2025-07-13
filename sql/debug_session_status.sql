-- Debug session status issue
-- Check the session that's trying to track usage

-- 1. Check session status
SELECT 
    id,
    user_id,
    organization_id,
    status,
    recording_started_at,
    recording_duration_seconds,
    created_at,
    updated_at
FROM sessions
WHERE id = '00a5ebd0-df3e-4767-bea8-5b4707cc65ab';

-- 2. Update session to active if it's not
UPDATE sessions
SET 
    status = 'active',
    recording_started_at = CASE 
        WHEN recording_started_at IS NULL THEN CURRENT_TIMESTAMP 
        ELSE recording_started_at 
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE id = '00a5ebd0-df3e-4767-bea8-5b4707cc65ab'
AND status != 'active';

-- 3. Check if update worked
SELECT 
    id,
    status,
    recording_started_at
FROM sessions
WHERE id = '00a5ebd0-df3e-4767-bea8-5b4707cc65ab';

-- 4. Check if there are any usage_tracking records
SELECT COUNT(*) as usage_count
FROM usage_tracking
WHERE session_id = '00a5ebd0-df3e-4767-bea8-5b4707cc65ab';

-- 5. Check RLS policies on usage_tracking
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'usage_tracking';