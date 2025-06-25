-- Debug Usage Limits Issue
-- Run these queries to diagnose why you can't start a call

-- 1. Check if the new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usage_tracking', 'monthly_usage_cache');

-- 2. Check your current user and organization
SELECT 
    u.id as user_id,
    u.email,
    u.current_organization_id,
    o.name as organization_name,
    o.monthly_audio_hours_limit as org_hours_limit,
    om.monthly_audio_hours_limit as member_hours_limit,
    om.current_month_minutes_used,
    om.total_audio_hours_used
FROM users u
LEFT JOIN organizations o ON u.current_organization_id = o.id
LEFT JOIN organization_members om ON u.id = om.user_id AND o.id = om.organization_id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- Replace with your email

-- 3. Check monthly usage cache
SELECT * FROM monthly_usage_cache 
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
LIMIT 10;

-- 4. Test the check_usage_limit function directly
-- Replace these IDs with your actual user_id and organization_id from query #2
SELECT * FROM check_usage_limit(
    'YOUR_USER_ID'::uuid,
    'YOUR_ORGANIZATION_ID'::uuid
);

-- 5. Quick fix - Set a generous limit for your organization
-- Replace with your organization_id from query #2
UPDATE organizations 
SET monthly_audio_hours_limit = 100  -- 100 hours = 6000 minutes
WHERE id = 'YOUR_ORGANIZATION_ID';

-- 6. Quick fix - Reset your usage for this month (for testing)
-- Replace with your user_id and organization_id
DELETE FROM monthly_usage_cache 
WHERE user_id = 'YOUR_USER_ID'
AND organization_id = 'YOUR_ORGANIZATION_ID'
AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

UPDATE organization_members 
SET current_month_minutes_used = 0,
    current_month_start = DATE_TRUNC('month', CURRENT_DATE)::date
WHERE user_id = 'YOUR_USER_ID'
AND organization_id = 'YOUR_ORGANIZATION_ID';

-- 7. If tables don't exist, check if migration ran properly
-- This will show any errors from the migration
SELECT * FROM pg_catalog.pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%usage%';

-- 8. Check if the function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'check_usage_limit';

-- 9. Manual test - what the API would return
WITH usage_check AS (
    SELECT 
        COALESCE(muc.total_minutes_used, 0) as minutes_used,
        COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 10) * 60 as minutes_limit
    FROM users u
    LEFT JOIN organizations o ON u.current_organization_id = o.id
    LEFT JOIN organization_members om ON u.id = om.user_id AND o.id = om.organization_id
    LEFT JOIN monthly_usage_cache muc ON u.id = muc.user_id 
        AND o.id = muc.organization_id 
        AND muc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    WHERE u.email = 'YOUR_EMAIL_HERE'  -- Replace with your email
)
SELECT 
    minutes_used,
    minutes_limit,
    minutes_used < minutes_limit as can_record,
    minutes_limit - minutes_used as minutes_remaining
FROM usage_check;