-- Migration: Add minute-by-minute usage tracking for accurate billing
-- Date: 2025-01-06

-- 1. Create usage_tracking table for minute-by-minute tracking
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
    CONSTRAINT "usage_tracking_organization_id_fkey" FOREIGN KEY ("organization_id") 
        REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") 
        REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "usage_tracking_session_id_fkey" FOREIGN KEY ("session_id") 
        REFERENCES "public"."sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "seconds_recorded_check" CHECK (seconds_recorded >= 0 AND seconds_recorded <= 60)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org_month 
    ON usage_tracking(organization_id, minute_timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month 
    ON usage_tracking(user_id, minute_timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_session 
    ON usage_tracking(session_id);

-- 2. Create monthly usage cache for fast limit checking
CREATE TABLE IF NOT EXISTS "public"."monthly_usage_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month_year" character varying(7) NOT NULL, -- Format: YYYY-MM
    "total_minutes_used" integer DEFAULT 0,
    "total_seconds_used" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("organization_id", "user_id", "month_year"),
    CONSTRAINT "monthly_usage_cache_organization_id_fkey" FOREIGN KEY ("organization_id") 
        REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "monthly_usage_cache_user_id_fkey" FOREIGN KEY ("user_id") 
        REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "total_minutes_check" CHECK (total_minutes_used >= 0),
    CONSTRAINT "total_seconds_check" CHECK (total_seconds_used >= 0)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_monthly_usage_cache_lookup 
    ON monthly_usage_cache(organization_id, user_id, month_year);

-- 3. Update organization_members table for current month tracking
ALTER TABLE "public"."organization_members" 
ADD COLUMN IF NOT EXISTS "current_month_minutes_used" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "current_month_start" date;

-- 4. Create function to update member usage automatically
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

-- Create trigger to auto-update stats
CREATE TRIGGER update_usage_stats_trigger
    AFTER INSERT ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_member_usage();

-- 5. Create function to check usage limits
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
    
    -- Get usage from cache
    SELECT COALESCE(total_minutes_used, 0) INTO v_minutes_used
    FROM monthly_usage_cache
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND month_year = current_month;
    
    -- Get limits from organization and member settings
    SELECT 
        COALESCE(o.monthly_audio_hours_limit, 0) * 60,
        COALESCE(om.monthly_audio_hours_limit, 0) * 60
    INTO v_plan_limit, v_member_limit
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = p_user_id 
    AND om.organization_id = p_organization_id;
    
    -- Use the most restrictive limit
    v_minutes_limit := LEAST(
        CASE WHEN v_plan_limit > 0 THEN v_plan_limit ELSE 999999 END,
        CASE WHEN v_member_limit > 0 THEN v_member_limit ELSE 999999 END
    );
    
    -- If no limits set, use a default (e.g., 1000 hours = 60000 minutes)
    IF v_minutes_limit = 999999 THEN
        v_minutes_limit := 60000;
    END IF;
    
    RETURN QUERY SELECT 
        v_minutes_used < v_minutes_limit AS can_record,
        v_minutes_used AS minutes_used,
        v_minutes_limit AS minutes_limit,
        GREATEST(0, v_minutes_limit - v_minutes_used) AS minutes_remaining,
        ROUND((v_minutes_used::numeric / NULLIF(v_minutes_limit, 0)) * 100, 2) AS percentage_used;
END;
$$ LANGUAGE plpgsql;

-- 6. Create view for user statistics including minute usage
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    om.organization_id,
    om.role,
    om.total_sessions_count,
    om.total_audio_hours_used,
    om.current_month_minutes_used,
    COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 0) * 60 as monthly_minutes_limit,
    om.current_month_minutes_used::numeric / NULLIF(COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 0) * 60, 0) * 100 as usage_percentage,
    om.last_session_at,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id AND u.current_organization_id = om.organization_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.deleted_at IS NULL;

-- 7. Add RLS policies for new tables
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage_cache ENABLE ROW LEVEL SECURITY;

-- Policy for usage_tracking: users can only see their own usage
CREATE POLICY "Users can view own usage tracking" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage tracking" ON usage_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for monthly_usage_cache: users can only see their own cache
CREATE POLICY "Users can view own monthly usage" ON monthly_usage_cache
    FOR SELECT USING (auth.uid() = user_id);

-- 8. Create function to get detailed usage for a specific period
CREATE OR REPLACE FUNCTION get_usage_details(
    p_user_id uuid,
    p_organization_id uuid,
    p_start_date date DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    p_end_date date DEFAULT CURRENT_DATE
) RETURNS TABLE (
    date date,
    minutes_used integer,
    seconds_used integer,
    session_count integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(minute_timestamp) as date,
        COUNT(DISTINCT minute_timestamp)::integer as minutes_used,
        SUM(seconds_recorded)::integer as seconds_used,
        COUNT(DISTINCT session_id)::integer as session_count
    FROM usage_tracking
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND DATE(minute_timestamp) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(minute_timestamp)
    ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- 9. Migrate existing session data to populate initial usage tracking
-- This is a one-time migration to backfill historical data
INSERT INTO usage_tracking (
    organization_id,
    user_id,
    session_id,
    minute_timestamp,
    seconds_recorded
)
SELECT 
    organization_id,
    user_id,
    session_id,
    minute_timestamp,
    seconds_recorded
FROM (
    SELECT 
        s.organization_id,
        s.user_id,
        s.id as session_id,
        s.recording_started_at + (gs.minute_num * INTERVAL '1 minute') as minute_timestamp,
        CASE 
            WHEN gs.minute_num = (s.recording_duration_seconds / 60)::integer 
            THEN s.recording_duration_seconds % 60
            ELSE 60
        END as seconds_recorded,
        s.recording_duration_seconds
    FROM sessions s
    CROSS JOIN LATERAL generate_series(0, 
        CASE 
            WHEN s.recording_duration_seconds > 0 
            THEN (s.recording_duration_seconds / 60)::integer - 1
            ELSE 0 
        END
    ) as gs(minute_num)
    WHERE s.recording_started_at IS NOT NULL
    AND s.recording_duration_seconds > 0
    AND s.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM usage_tracking ut 
        WHERE ut.session_id = s.id
    )
) as session_minutes
ON CONFLICT (session_id, minute_timestamp) DO NOTHING;

-- Update monthly cache with historical data
INSERT INTO monthly_usage_cache (
    organization_id,
    user_id,
    month_year,
    total_minutes_used,
    total_seconds_used
)
SELECT 
    organization_id,
    user_id,
    TO_CHAR(minute_timestamp, 'YYYY-MM') as month_year,
    COUNT(*)::integer as total_minutes_used,
    SUM(seconds_recorded)::integer as total_seconds_used
FROM usage_tracking
GROUP BY organization_id, user_id, TO_CHAR(minute_timestamp, 'YYYY-MM')
ON CONFLICT (organization_id, user_id, month_year) 
DO UPDATE SET 
    total_minutes_used = EXCLUDED.total_minutes_used,
    total_seconds_used = EXCLUDED.total_seconds_used,
    last_updated = CURRENT_TIMESTAMP;

-- Update organization_members with current month data
UPDATE organization_members om
SET 
    current_month_minutes_used = COALESCE((
        SELECT total_minutes_used
        FROM monthly_usage_cache muc
        WHERE muc.user_id = om.user_id 
        AND muc.organization_id = om.organization_id
        AND muc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    ), 0),
    current_month_start = DATE_TRUNC('month', CURRENT_DATE)::date
WHERE EXISTS (
    SELECT 1 FROM sessions s 
    WHERE s.user_id = om.user_id 
    AND s.organization_id = om.organization_id
);