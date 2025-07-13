-- Complete Minute Tracking Setup
-- Run this entire script to set up minute tracking from scratch

-- PART 1: Create tables if they don't exist
-- ==========================================

-- 1. Create usage_tracking table
CREATE TABLE IF NOT EXISTS "public"."usage_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "minute_timestamp" timestamp with time zone NOT NULL,
    "seconds_recorded" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("session_id", "minute_timestamp"),
    CONSTRAINT "seconds_recorded_check" CHECK (seconds_recorded >= 0 AND seconds_recorded <= 60)
);

-- 2. Create monthly_usage_cache table
CREATE TABLE IF NOT EXISTS "public"."monthly_usage_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month_year" character varying(7) NOT NULL,
    "total_minutes_used" integer DEFAULT 0,
    "total_seconds_used" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("organization_id", "user_id", "month_year"),
    CONSTRAINT "total_minutes_check" CHECK (total_minutes_used >= 0),
    CONSTRAINT "total_seconds_check" CHECK (total_seconds_used >= 0)
);

-- 3. Add columns to organization_members if they don't exist
ALTER TABLE "public"."organization_members" 
ADD COLUMN IF NOT EXISTS "current_month_minutes_used" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "current_month_start" date;

-- PART 2: Create or replace the check_usage_limit function
-- ========================================================

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

-- PART 3: Fix existing data
-- =========================

-- 1. Set default limits for organizations without them
UPDATE organizations 
SET monthly_audio_hours_limit = 10  -- 10 hours = 600 minutes
WHERE monthly_audio_hours_limit IS NULL 
   OR monthly_audio_hours_limit = 0;

-- 2. Create organization_members records if missing
INSERT INTO organization_members (organization_id, user_id, role, current_month_minutes_used, current_month_start)
SELECT 
    u.current_organization_id,
    u.id,
    'admin',
    0,
    DATE_TRUNC('month', CURRENT_DATE)::date
FROM users u
WHERE u.current_organization_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.user_id = u.id 
    AND om.organization_id = u.current_organization_id
)
ON CONFLICT DO NOTHING;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION check_usage_limit(uuid, uuid) TO authenticated;

-- PART 4: Check your specific user
-- =================================

-- Replace 'your-email@example.com' with your actual email
DO $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
    v_email text := 'your-email@example.com';  -- CHANGE THIS!
BEGIN
    -- Get user info
    SELECT id, current_organization_id 
    INTO v_user_id, v_org_id
    FROM users 
    WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found: %', v_email;
        RETURN;
    END IF;
    
    IF v_org_id IS NULL THEN
        RAISE NOTICE 'User % has no organization set!', v_email;
        RETURN;
    END IF;
    
    -- Check if organization exists
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
        RAISE NOTICE 'Organization % does not exist!', v_org_id;
        RETURN;
    END IF;
    
    -- Ensure organization has a limit
    UPDATE organizations 
    SET monthly_audio_hours_limit = COALESCE(monthly_audio_hours_limit, 10)
    WHERE id = v_org_id;
    
    -- Ensure user is in organization_members
    INSERT INTO organization_members (
        organization_id, 
        user_id, 
        role,
        current_month_minutes_used,
        current_month_start
    ) VALUES (
        v_org_id,
        v_user_id,
        'member',
        0,
        DATE_TRUNC('month', CURRENT_DATE)::date
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET current_month_minutes_used = COALESCE(organization_members.current_month_minutes_used, 0),
        current_month_start = COALESCE(organization_members.current_month_start, DATE_TRUNC('month', CURRENT_DATE)::date);
    
    -- Clear any bad cache data
    DELETE FROM monthly_usage_cache 
    WHERE user_id = v_user_id 
    AND organization_id = v_org_id
    AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    RAISE NOTICE 'Fixed user % in org %', v_email, v_org_id;
END $$;

-- PART 5: Verify everything is working
-- ====================================

-- Check the final state (replace email)
SELECT 
    u.email,
    u.current_organization_id,
    o.name as org_name,
    o.monthly_audio_hours_limit as org_hours_limit,
    om.monthly_audio_hours_limit as member_hours_limit,
    om.current_month_minutes_used,
    COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 10) * 60 as effective_minutes_limit
FROM users u
LEFT JOIN organizations o ON u.current_organization_id = o.id
LEFT JOIN organization_members om ON u.id = om.user_id AND o.id = om.organization_id
WHERE u.email = 'your-email@example.com';  -- CHANGE THIS!

-- Test the function (use the IDs from above)
-- SELECT * FROM check_usage_limit('user-id'::uuid, 'org-id'::uuid);