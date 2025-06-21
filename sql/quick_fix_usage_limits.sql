-- Quick Fix for Usage Limits Issue
-- This script will set up proper limits and reset usage

-- 1. First, make sure the organization has a limit set
-- Update ALL organizations to have a default limit if they don't have one
UPDATE organizations 
SET monthly_audio_hours_limit = 10  -- 10 hours = 600 minutes for free tier
WHERE monthly_audio_hours_limit IS NULL 
   OR monthly_audio_hours_limit = 0;

-- 2. Update the check_usage_limit function to handle NULL limits better
CREATE OR REPLACE FUNCTION check_usage_limit(
    p_user_id uuid,
    p_organization_id uuid
) RETURNS TABLE (
    can_record boolean,
    minutes_used integer,
    minutes_limit integer,
    minutes_remaining integer,
    percentage_used numeric
) AS $$
DECLARE
    v_minutes_used integer;
    v_minutes_limit integer;
    v_plan_limit integer;
    v_member_limit integer;
    current_month varchar(7);
BEGIN
    -- Get current month
    current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Get usage from cache (default to 0 if not found)
    SELECT COALESCE(total_minutes_used, 0) INTO v_minutes_used
    FROM monthly_usage_cache
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND month_year = current_month;
    
    -- If no usage record exists, assume 0 usage
    IF v_minutes_used IS NULL THEN
        v_minutes_used := 0;
    END IF;
    
    -- Get limits from organization and member settings
    SELECT 
        COALESCE(o.monthly_audio_hours_limit, 10) * 60,  -- Default to 10 hours if NULL
        COALESCE(om.monthly_audio_hours_limit, 0) * 60
    INTO v_plan_limit, v_member_limit
    FROM organizations o
    LEFT JOIN organization_members om ON om.user_id = p_user_id AND om.organization_id = o.id
    WHERE o.id = p_organization_id;
    
    -- If no organization found, use default
    IF v_plan_limit IS NULL THEN
        v_plan_limit := 600;  -- 10 hours default
    END IF;
    
    -- Use the most restrictive limit (but ignore 0 values)
    IF v_member_limit > 0 THEN
        v_minutes_limit := LEAST(v_plan_limit, v_member_limit);
    ELSE
        v_minutes_limit := v_plan_limit;
    END IF;
    
    RETURN QUERY SELECT 
        v_minutes_used < v_minutes_limit AS can_record,
        v_minutes_used AS minutes_used,
        v_minutes_limit AS minutes_limit,
        GREATEST(0, v_minutes_limit - v_minutes_used) AS minutes_remaining,
        CASE 
            WHEN v_minutes_limit > 0 THEN 
                ROUND((v_minutes_used::numeric / v_minutes_limit) * 100, 2)
            ELSE 
                0
        END AS percentage_used;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a helper function to reset user usage (for testing)
CREATE OR REPLACE FUNCTION reset_user_usage(p_user_email text) 
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
BEGIN
    -- Get user and org IDs
    SELECT u.id, u.current_organization_id 
    INTO v_user_id, v_org_id
    FROM users u 
    WHERE u.email = p_user_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_email;
    END IF;
    
    -- Delete current month usage from cache
    DELETE FROM monthly_usage_cache 
    WHERE user_id = v_user_id 
    AND organization_id = v_org_id
    AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Reset organization member stats
    UPDATE organization_members 
    SET current_month_minutes_used = 0,
        current_month_start = DATE_TRUNC('month', CURRENT_DATE)::date
    WHERE user_id = v_user_id 
    AND organization_id = v_org_id;
    
    -- Delete current month usage tracking records (optional - for complete reset)
    DELETE FROM usage_tracking 
    WHERE user_id = v_user_id 
    AND organization_id = v_org_id
    AND DATE_TRUNC('month', minute_timestamp) = DATE_TRUNC('month', CURRENT_DATE);
    
    RAISE NOTICE 'Usage reset for user %', p_user_email;
END;
$$ LANGUAGE plpgsql;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION check_usage_limit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_usage(text) TO authenticated;

-- 5. To reset your usage, run:
-- SELECT reset_user_usage('your-email@example.com');

-- 6. To check current limits for all users:
SELECT 
    u.email,
    o.name as org_name,
    o.monthly_audio_hours_limit as org_hours_limit,
    om.monthly_audio_hours_limit as member_hours_limit,
    COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 10) as effective_hours_limit,
    COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 10) * 60 as effective_minutes_limit,
    COALESCE(muc.total_minutes_used, 0) as minutes_used_this_month,
    om.current_month_minutes_used as member_stat_minutes
FROM users u
JOIN organizations o ON u.current_organization_id = o.id
LEFT JOIN organization_members om ON u.id = om.user_id AND o.id = om.organization_id
LEFT JOIN monthly_usage_cache muc ON u.id = muc.user_id 
    AND o.id = muc.organization_id 
    AND muc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
ORDER BY u.email;