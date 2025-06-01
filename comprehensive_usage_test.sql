-- Comprehensive Usage Test
-- Run each query separately to see all results

-- 1. Test the usage limit function for bgolchha+1@gmail.com
SELECT 
    'Function Test - bgolchha+1' as test_type,
    can_record,
    minutes_used,
    minutes_limit,
    minutes_remaining,
    percentage_used
FROM check_usage_limit(
    '47fa2a65-5444-40f4-8c3f-136e51e1c192'::uuid,
    'b3dcce5e-620b-494c-af9c-1de4cfd72ab7'::uuid
);

-- 2. Test the usage limit function for bgolchha+3@gmail.com
SELECT 
    'Function Test - bgolchha+3' as test_type,
    can_record,
    minutes_used,
    minutes_limit,
    minutes_remaining,
    percentage_used
FROM check_usage_limit(
    '754a6166-1dbf-48b0-a858-01df9e74a839'::uuid,
    '5cc9b6bb-4fd0-431a-9d49-040a00225a2d'::uuid
);

-- 3. Check organization limits
SELECT 
    id,
    name,
    monthly_audio_hours_limit,
    monthly_audio_hours_limit * 60 as minutes_limit
FROM organizations
WHERE id IN (
    'b3dcce5e-620b-494c-af9c-1de4cfd72ab7',
    '5cc9b6bb-4fd0-431a-9d49-040a00225a2d'
);

-- 4. Check organization members
SELECT 
    u.email,
    om.monthly_audio_hours_limit as member_hours_limit,
    om.current_month_minutes_used,
    om.current_month_start,
    om.total_audio_hours_used
FROM organization_members om
JOIN users u ON u.id = om.user_id
WHERE u.email IN ('bgolchha+1@gmail.com', 'bgolchha+3@gmail.com');

-- 5. Verify the tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'monthly_usage_cache' THEN 
            (SELECT COUNT(*) FROM monthly_usage_cache WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
        WHEN table_name = 'usage_tracking' THEN 
            (SELECT COUNT(*) FROM usage_tracking)
        ELSE 0
    END as row_count
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('monthly_usage_cache', 'usage_tracking');

-- 6. Test direct query that the API uses
SELECT 
    u.email,
    u.current_organization_id,
    CASE 
        WHEN u.current_organization_id IS NULL THEN 'No org'
        WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE id = u.current_organization_id) THEN 'Org missing'
        ELSE 'Has org'
    END as org_status
FROM users u
WHERE u.email IN ('bgolchha+1@gmail.com', 'bgolchha+3@gmail.com');