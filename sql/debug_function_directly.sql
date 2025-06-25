-- Debug the function directly
-- Run these one at a time to see exactly what's happening

-- Query 1: Test function for bgolchha+1@gmail.com
SELECT * FROM check_usage_limit(
    '47fa2a65-5444-40f4-8c3f-136e51e1c192'::uuid,
    'b3dcce5e-620b-494c-af9c-1de4cfd72ab7'::uuid
);

-- Query 2: Check what organization limits are set
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

-- Query 3: Check organization members data
SELECT 
    u.email,
    om.monthly_audio_hours_limit as member_hours_limit,
    om.current_month_minutes_used,
    om.current_month_start,
    om.total_audio_hours_used
FROM organization_members om
JOIN users u ON u.id = om.user_id
WHERE u.email IN ('bgolchha+1@gmail.com', 'bgolchha+3@gmail.com');

-- Query 4: Check if tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('monthly_usage_cache', 'usage_tracking', 'organizations', 'organization_members')
ORDER BY table_name;

-- Query 5: Test the function with debug info
DO $$
DECLARE
    v_user_id uuid := '47fa2a65-5444-40f4-8c3f-136e51e1c192';
    v_org_id uuid := 'b3dcce5e-620b-494c-af9c-1de4cfd72ab7';
    v_result record;
BEGIN
    -- Call the function
    SELECT * INTO v_result FROM check_usage_limit(v_user_id, v_org_id);
    
    -- Print results
    RAISE NOTICE 'Function returned:';
    RAISE NOTICE '  can_record: %', v_result.can_record;
    RAISE NOTICE '  minutes_used: %', v_result.minutes_used;
    RAISE NOTICE '  minutes_limit: %', v_result.minutes_limit;
    RAISE NOTICE '  minutes_remaining: %', v_result.minutes_remaining;
    RAISE NOTICE '  percentage_used: %', v_result.percentage_used;
END $$;