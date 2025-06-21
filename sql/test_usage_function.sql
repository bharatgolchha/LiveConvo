-- Test the usage limit function for your users
-- This will show what the API should be returning

-- Test for bgolchha+1@gmail.com
SELECT 
    'bgolchha+1@gmail.com' as email,
    *
FROM check_usage_limit(
    '47fa2a65-5444-40f4-8c3f-136e51e1c192'::uuid,  -- user_id
    'b3dcce5e-620b-494c-af9c-1de4cfd72ab7'::uuid   -- organization_id
);

-- Test for bgolchha+3@gmail.com
SELECT 
    'bgolchha+3@gmail.com' as email,
    *
FROM check_usage_limit(
    '754a6166-1dbf-48b0-a858-01df9e74a839'::uuid,  -- user_id
    '5cc9b6bb-4fd0-431a-9d49-040a00225a2d'::uuid   -- organization_id
);

-- Also check the actual data in the tables
SELECT 
    'Organization Limits' as check_type,
    o.id,
    o.name,
    o.monthly_audio_hours_limit,
    o.monthly_audio_hours_limit * 60 as monthly_minutes_limit
FROM organizations o
WHERE o.id IN (
    'b3dcce5e-620b-494c-af9c-1de4cfd72ab7'::uuid,
    '5cc9b6bb-4fd0-431a-9d49-040a00225a2d'::uuid
);

-- Check organization members data
SELECT 
    'Organization Members' as check_type,
    u.email,
    om.organization_id,
    om.monthly_audio_hours_limit as member_hours_limit,
    om.current_month_minutes_used,
    om.current_month_start
FROM organization_members om
JOIN users u ON u.id = om.user_id
WHERE om.user_id IN (
    '47fa2a65-5444-40f4-8c3f-136e51e1c192'::uuid,
    '754a6166-1dbf-48b0-a858-01df9e74a839'::uuid
);

-- Check monthly usage cache
SELECT 
    'Monthly Usage Cache' as check_type,
    u.email,
    muc.month_year,
    muc.total_minutes_used,
    muc.total_seconds_used,
    muc.last_updated
FROM monthly_usage_cache muc
JOIN users u ON u.id = muc.user_id
WHERE muc.user_id IN (
    '47fa2a65-5444-40f4-8c3f-136e51e1c192'::uuid,
    '754a6166-1dbf-48b0-a858-01df9e74a839'::uuid
)
AND muc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');