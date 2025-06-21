-- Immediate Fix for Usage Limits
-- Run this to get recording working immediately

-- 1. Find your user and organization
SELECT 
    u.id as user_id,
    u.email,
    u.current_organization_id,
    o.name as org_name,
    o.monthly_audio_hours_limit
FROM users u
LEFT JOIN organizations o ON u.current_organization_id = o.id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- REPLACE with your email

-- 2. Set a default limit for ALL organizations (if not set)
UPDATE organizations 
SET monthly_audio_hours_limit = 10  -- 10 hours = 600 minutes
WHERE monthly_audio_hours_limit IS NULL 
   OR monthly_audio_hours_limit = 0;

-- 3. Make sure organization_members has the columns we need
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS current_month_minutes_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_month_start date;

-- 4. Initialize organization_members data
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
    u.current_organization_id,
    u.id,
    'admin'
FROM users u
WHERE u.current_organization_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.user_id = u.id 
    AND om.organization_id = u.current_organization_id
);

-- 5. Reset usage for current month
UPDATE organization_members 
SET 
    current_month_minutes_used = 0,
    current_month_start = DATE_TRUNC('month', CURRENT_DATE)::date,
    monthly_audio_hours_limit = NULL  -- Use organization default
WHERE user_id IN (SELECT id FROM users WHERE email = 'YOUR_EMAIL_HERE');

-- 6. Clear monthly cache
DELETE FROM monthly_usage_cache 
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
AND user_id IN (SELECT id FROM users WHERE email = 'YOUR_EMAIL_HERE');

-- 7. Verify the fix
SELECT 
    u.email,
    o.monthly_audio_hours_limit * 60 as org_minutes_limit,
    om.current_month_minutes_used,
    muc.total_minutes_used as cached_minutes
FROM users u
JOIN organizations o ON u.current_organization_id = o.id
LEFT JOIN organization_members om ON u.id = om.user_id AND o.id = om.organization_id
LEFT JOIN monthly_usage_cache muc ON u.id = muc.user_id 
    AND o.id = muc.organization_id 
    AND muc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
WHERE u.email = 'YOUR_EMAIL_HERE';  -- REPLACE with your email

-- 8. Test the function directly
-- Replace the IDs from step 1
SELECT * FROM check_usage_limit(
    'YOUR_USER_ID'::uuid,  -- From step 1
    'YOUR_ORG_ID'::uuid    -- From step 1
);