-- Fix Trigger Error and Enable Recording
-- This script handles existing triggers and ensures recording works

-- Step 1: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_usage_stats_trigger ON usage_tracking;

-- Step 2: Drop the function if it exists
DROP FUNCTION IF EXISTS update_member_usage();

-- Step 3: Recreate the function properly
CREATE OR REPLACE FUNCTION update_member_usage() RETURNS TRIGGER AS $$
DECLARE
    current_month varchar(7);
BEGIN
    -- Get current month in YYYY-MM format
    current_month := TO_CHAR(NEW.minute_timestamp, 'YYYY-MM');
    
    -- Update organization_members current month usage
    UPDATE organization_members
    SET 
        current_month_minutes_used = CASE 
            WHEN current_month_start IS NULL OR TO_CHAR(current_month_start, 'YYYY-MM') != current_month 
            THEN 1  -- Reset if new month
            ELSE current_month_minutes_used + 1
        END,
        current_month_start = CASE 
            WHEN current_month_start IS NULL OR TO_CHAR(current_month_start, 'YYYY-MM') != current_month 
            THEN DATE_TRUNC('month', NEW.minute_timestamp)::date
            ELSE current_month_start
        END,
        total_audio_hours_used = total_audio_hours_used + (1.0 / 60.0), -- Add 1 minute as fraction of hour
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id 
    AND organization_id = NEW.organization_id;
    
    -- Update or insert monthly usage cache
    INSERT INTO monthly_usage_cache (
        organization_id, 
        user_id, 
        month_year, 
        total_minutes_used,
        total_seconds_used,
        last_updated
    ) VALUES (
        NEW.organization_id,
        NEW.user_id,
        current_month,
        1,
        NEW.seconds_recorded,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (organization_id, user_id, month_year) 
    DO UPDATE SET 
        total_minutes_used = monthly_usage_cache.total_minutes_used + 1,
        total_seconds_used = monthly_usage_cache.total_seconds_used + NEW.seconds_recorded,
        last_updated = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger
CREATE TRIGGER update_usage_stats_trigger
    AFTER INSERT ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_member_usage();

-- Step 5: Fix the check_usage_limit function to handle NULL values better
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
    
    -- If no usage record exists, set to 0
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

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION check_usage_limit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_member_usage() TO authenticated;

-- Step 7: Ensure your user has proper organization setup
-- Find users without proper organization setup
SELECT 
    u.id,
    u.email,
    u.current_organization_id,
    CASE 
        WHEN u.current_organization_id IS NULL THEN 'No organization set'
        WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE id = u.current_organization_id) THEN 'Organization does not exist'
        WHEN NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = u.id AND organization_id = u.current_organization_id) THEN 'Not a member of organization'
        ELSE 'OK'
    END as status
FROM users u
WHERE u.deleted_at IS NULL;

-- Step 8: Fix any users without organization membership
INSERT INTO organization_members (organization_id, user_id, role, current_month_minutes_used, current_month_start)
SELECT 
    u.current_organization_id,
    u.id,
    'member',
    0,
    DATE_TRUNC('month', CURRENT_DATE)::date
FROM users u
WHERE u.current_organization_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.user_id = u.id 
    AND om.organization_id = u.current_organization_id
)
ON CONFLICT (organization_id, user_id) DO UPDATE
SET 
    current_month_minutes_used = COALESCE(organization_members.current_month_minutes_used, 0),
    current_month_start = COALESCE(organization_members.current_month_start, DATE_TRUNC('month', CURRENT_DATE)::date);

-- Step 9: Set default organization limits
UPDATE organizations 
SET monthly_audio_hours_limit = 10  -- 10 hours = 600 minutes
WHERE monthly_audio_hours_limit IS NULL OR monthly_audio_hours_limit = 0;

-- Step 10: Clear any bad cache data for current month
DELETE FROM monthly_usage_cache 
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
AND (total_minutes_used < 0 OR total_seconds_used < 0);

-- Step 11: Initialize cache for users who don't have it
INSERT INTO monthly_usage_cache (
    organization_id,
    user_id,
    month_year,
    total_minutes_used,
    total_seconds_used
)
SELECT 
    om.organization_id,
    om.user_id,
    TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    0,
    0
FROM organization_members om
WHERE NOT EXISTS (
    SELECT 1 FROM monthly_usage_cache muc
    WHERE muc.user_id = om.user_id
    AND muc.organization_id = om.organization_id
    AND muc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
)
ON CONFLICT DO NOTHING;

-- Done! Check the results above to see if any users have issues