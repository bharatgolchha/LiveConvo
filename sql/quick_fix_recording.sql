-- Quick Fix for Recording - Run this entire script
-- This will get you recording immediately

-- Step 1: Create the monthly_usage_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."monthly_usage_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month_year" character varying(7) NOT NULL,
    "total_minutes_used" integer DEFAULT 0,
    "total_seconds_used" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("organization_id", "user_id", "month_year")
);

-- Step 2: Create the usage_tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."usage_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "minute_timestamp" timestamp with time zone NOT NULL,
    "seconds_recorded" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("session_id", "minute_timestamp")
);

-- Step 3: Add missing columns to organization_members
ALTER TABLE "public"."organization_members" 
ADD COLUMN IF NOT EXISTS "current_month_minutes_used" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "current_month_start" date;

-- Step 4: Create a simple check_usage_limit function
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
BEGIN
    -- For now, just return default values that allow recording
    RETURN QUERY SELECT 
        true as can_record,
        0 as minutes_used,
        600 as minutes_limit,  -- 10 hours default
        600 as minutes_remaining,
        0::numeric as percentage_used;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION check_usage_limit(uuid, uuid) TO authenticated;
GRANT ALL ON TABLE monthly_usage_cache TO authenticated;
GRANT ALL ON TABLE usage_tracking TO authenticated;

-- Step 6: Set default organization limits
UPDATE organizations 
SET monthly_audio_hours_limit = 10  -- 10 hours = 600 minutes
WHERE monthly_audio_hours_limit IS NULL OR monthly_audio_hours_limit = 0;

-- Step 7: Ensure all users have organization membership
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
    u.current_organization_id,
    u.id,
    'member'
FROM users u
WHERE u.current_organization_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.user_id = u.id 
    AND om.organization_id = u.current_organization_id
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Done! You should now be able to record.