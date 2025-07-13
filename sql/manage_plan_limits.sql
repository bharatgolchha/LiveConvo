-- Helper SQL for Managing Plan Limits
-- All limits are stored in HOURS in the database but displayed as MINUTES in the UI

-- 1. View current plan limits
SELECT 
    id,
    name,
    display_name,
    monthly_audio_hours_limit,
    monthly_audio_hours_limit * 60 as monthly_minutes_limit,
    price_monthly,
    is_active
FROM plans
ORDER BY sort_order;

-- 2. Create or update plans with minute limits
-- Free Plan: 10 hours (600 minutes)
INSERT INTO plans (
    name, 
    display_name, 
    plan_type,
    monthly_audio_hours_limit,
    max_sessions_per_month,
    price_monthly,
    is_active,
    sort_order
) VALUES 
    ('free', 'Free Plan', 'individual', 10, 20, 0, true, 1)
ON CONFLICT (name) 
DO UPDATE SET 
    monthly_audio_hours_limit = 10,
    updated_at = CURRENT_TIMESTAMP;

-- Starter Plan: 25 hours (1,500 minutes)
INSERT INTO plans (
    name, 
    display_name, 
    plan_type,
    monthly_audio_hours_limit,
    max_sessions_per_month,
    price_monthly,
    has_advanced_summaries,
    is_active,
    sort_order
) VALUES 
    ('starter', 'Starter Plan', 'individual', 25, 50, 19.99, true, true, 2)
ON CONFLICT (name) 
DO UPDATE SET 
    monthly_audio_hours_limit = 25,
    updated_at = CURRENT_TIMESTAMP;

-- Pro Plan: 100 hours (6,000 minutes)
INSERT INTO plans (
    name, 
    display_name, 
    plan_type,
    monthly_audio_hours_limit,
    max_sessions_per_month,
    price_monthly,
    has_advanced_summaries,
    has_export_options,
    has_email_summaries,
    has_priority_support,
    is_active,
    sort_order
) VALUES 
    ('pro', 'Professional', 'individual', 100, 200, 49.99, true, true, true, true, true, 3)
ON CONFLICT (name) 
DO UPDATE SET 
    monthly_audio_hours_limit = 100,
    updated_at = CURRENT_TIMESTAMP;

-- Team Plan: 500 hours (30,000 minutes)
INSERT INTO plans (
    name, 
    display_name, 
    plan_type,
    monthly_audio_hours_limit,
    max_sessions_per_month,
    max_organization_members,
    price_monthly,
    has_advanced_summaries,
    has_export_options,
    has_email_summaries,
    has_api_access,
    has_custom_templates,
    has_priority_support,
    has_analytics_dashboard,
    has_team_collaboration,
    is_active,
    sort_order
) VALUES 
    ('team', 'Team Plan', 'organization', 500, 1000, 10, 199.99, true, true, true, true, true, true, true, true, true, 4)
ON CONFLICT (name) 
DO UPDATE SET 
    monthly_audio_hours_limit = 500,
    updated_at = CURRENT_TIMESTAMP;

-- Enterprise Plan: 2000 hours (120,000 minutes) 
INSERT INTO plans (
    name, 
    display_name, 
    plan_type,
    monthly_audio_hours_limit,
    max_sessions_per_month,
    max_organization_members,
    price_monthly,
    has_advanced_summaries,
    has_export_options,
    has_email_summaries,
    has_api_access,
    has_custom_templates,
    has_priority_support,
    has_analytics_dashboard,
    has_team_collaboration,
    is_active,
    sort_order
) VALUES 
    ('enterprise', 'Enterprise', 'organization', 2000, NULL, NULL, NULL, true, true, true, true, true, true, true, true, true, 5)
ON CONFLICT (name) 
DO UPDATE SET 
    monthly_audio_hours_limit = 2000,
    updated_at = CURRENT_TIMESTAMP;

-- 3. View organizations and their limits
SELECT 
    o.id,
    o.name,
    o.monthly_audio_hours_limit,
    o.monthly_audio_hours_limit * 60 as monthly_minutes_limit,
    COUNT(DISTINCT om.user_id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, o.monthly_audio_hours_limit;

-- 4. Set organization limits based on subscription
-- Example: Upgrade an organization to Pro plan limits
UPDATE organizations 
SET monthly_audio_hours_limit = (
    SELECT monthly_audio_hours_limit 
    FROM plans 
    WHERE name = 'pro'
)
WHERE id = 'your-organization-id';

-- 5. View member-specific overrides
SELECT 
    u.email,
    om.monthly_audio_hours_limit as member_limit_hours,
    om.monthly_audio_hours_limit * 60 as member_limit_minutes,
    o.monthly_audio_hours_limit as org_limit_hours,
    o.monthly_audio_hours_limit * 60 as org_limit_minutes,
    LEAST(
        COALESCE(om.monthly_audio_hours_limit, 999999),
        COALESCE(o.monthly_audio_hours_limit, 999999)
    ) * 60 as effective_minutes_limit
FROM organization_members om
JOIN users u ON om.user_id = u.id
JOIN organizations o ON om.organization_id = o.id
WHERE om.monthly_audio_hours_limit IS NOT NULL
   OR o.monthly_audio_hours_limit IS NOT NULL;

-- 6. Quick limit updates for testing
-- Set a test user to 5 minutes (0.083 hours) for testing limits
UPDATE organization_members 
SET monthly_audio_hours_limit = 0.083  -- 5 minutes
WHERE user_id = 'test-user-id';

-- Set a test organization to 1 hour (60 minutes)
UPDATE organizations 
SET monthly_audio_hours_limit = 1
WHERE id = 'test-org-id';

-- 7. Check current usage vs limits
SELECT 
    u.email,
    muc.total_minutes_used,
    COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 0) * 60 as minutes_limit,
    (COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 0) * 60) - muc.total_minutes_used as minutes_remaining,
    ROUND((muc.total_minutes_used::numeric / NULLIF(COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 0) * 60, 0)) * 100, 2) as usage_percentage
FROM users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
LEFT JOIN monthly_usage_cache muc ON u.id = muc.user_id 
    AND muc.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
WHERE u.current_organization_id = o.id
ORDER BY usage_percentage DESC;

-- 8. Reset usage for testing (BE CAREFUL - only for development)
-- Delete all usage tracking for a specific user
DELETE FROM usage_tracking 
WHERE user_id = 'test-user-id' 
  AND DATE_TRUNC('month', minute_timestamp) = DATE_TRUNC('month', CURRENT_DATE);

-- Reset monthly cache
DELETE FROM monthly_usage_cache 
WHERE user_id = 'test-user-id' 
  AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Reset organization member stats
UPDATE organization_members 
SET current_month_minutes_used = 0
WHERE user_id = 'test-user-id';