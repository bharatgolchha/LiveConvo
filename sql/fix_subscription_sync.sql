-- Fix Subscription Sync Issues - UPDATE ORGANIZATION MEMBER LIMITS
-- This script fixes the issue where Pro plan users have incorrect minute limits

-- 1. First, let's check the current state for the affected user
SELECT 
    'BEFORE FIX:' as status,
    om.user_id,
    u.email,
    om.monthly_audio_hours_limit as org_member_limit,
    om.current_month_minutes_used,
    p.monthly_audio_hours_limit as plan_limit,
    p.display_name as plan_name,
    s.plan_type,
    s.status as subscription_status
FROM organization_members om
JOIN users u ON u.id = om.user_id
JOIN subscriptions s ON s.user_id = om.user_id AND s.organization_id = om.organization_id
JOIN plans p ON p.id = s.plan_id
WHERE u.email = 'bgolchha+4@gmail.com';

-- 2. Update the organization member's limits based on their active subscription
UPDATE organization_members om
SET 
    monthly_audio_hours_limit = p.monthly_audio_hours_limit,
    updated_at = NOW()
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
WHERE om.user_id = s.user_id 
    AND om.organization_id = s.organization_id
    AND s.status = 'active'
    AND om.user_id = 'e0feb2fa-b9cc-46bd-8a34-c6f8eb444af4';

-- 3. Also update the organization's limits
UPDATE organizations o
SET 
    monthly_audio_hours_limit = p.monthly_audio_hours_limit,
    updated_at = NOW()
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
WHERE o.id = s.organization_id
    AND s.status = 'active'
    AND o.id = 'b3a8b32d-9d76-4cf8-8bed-814be0752b84';

-- 4. Verify the update worked
SELECT 
    'AFTER FIX:' as status,
    om.user_id,
    u.email,
    om.monthly_audio_hours_limit as org_member_limit,
    om.current_month_minutes_used,
    p.monthly_audio_hours_limit as plan_limit,
    p.display_name as plan_name,
    s.plan_type,
    s.status as subscription_status
FROM organization_members om
JOIN users u ON u.id = om.user_id
JOIN subscriptions s ON s.user_id = om.user_id AND s.organization_id = om.organization_id
JOIN plans p ON p.id = s.plan_id
WHERE u.email = 'bgolchha+4@gmail.com';

-- 5. Create a function to sync subscription limits automatically
CREATE OR REPLACE FUNCTION sync_subscription_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- When a subscription is created or updated, sync the limits to organization_members
    IF NEW.status IN ('active', 'trialing') THEN
        -- Update organization member limits
        UPDATE organization_members om
        SET 
            monthly_audio_hours_limit = p.monthly_audio_hours_limit,
            updated_at = NOW()
        FROM plans p
        WHERE om.user_id = NEW.user_id 
            AND om.organization_id = NEW.organization_id
            AND p.id = NEW.plan_id;
            
        -- Update organization limits
        UPDATE organizations o
        SET 
            monthly_audio_hours_limit = p.monthly_audio_hours_limit,
            updated_at = NOW()
        FROM plans p
        WHERE o.id = NEW.organization_id
            AND p.id = NEW.plan_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically sync limits when subscriptions change
DROP TRIGGER IF EXISTS sync_subscription_limits_trigger ON subscriptions;
CREATE TRIGGER sync_subscription_limits_trigger
AFTER INSERT OR UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_limits();

-- 7. Fix all existing active subscriptions (not just the one user)
UPDATE organization_members om
SET 
    monthly_audio_hours_limit = p.monthly_audio_hours_limit,
    updated_at = NOW()
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
WHERE om.user_id = s.user_id 
    AND om.organization_id = s.organization_id
    AND s.status IN ('active', 'trialing')
    AND om.monthly_audio_hours_limit != p.monthly_audio_hours_limit;

-- 8. Create function to get the active subscription for a user
CREATE OR REPLACE FUNCTION get_user_active_subscription(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  plan_id UUID,
  plan_type TEXT,
  status TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.plan_id,
    s.plan_type,
    s.status,
    s.stripe_subscription_id,
    s.stripe_customer_id,
    s.current_period_start,
    s.current_period_end
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  ORDER BY 
    -- Prefer subscriptions with Stripe IDs
    CASE WHEN s.stripe_subscription_id IS NOT NULL THEN 0 ELSE 1 END,
    -- Then by plan type (individual_pro > others)
    CASE WHEN s.plan_type = 'individual_pro' THEN 0 ELSE 1 END,
    -- Finally by creation date (newest first)
    s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to cancel old subscriptions when new one is created
CREATE OR REPLACE FUNCTION cancel_old_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is a new active subscription with a Stripe ID
  IF NEW.status IN ('active', 'trialing') AND NEW.stripe_subscription_id IS NOT NULL THEN
    -- Cancel all other subscriptions for this user
    UPDATE subscriptions
    SET 
      status = 'canceled',
      canceled_at = NOW(),
      updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND status IN ('active', 'trialing');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS cancel_old_subscriptions_trigger ON subscriptions;
CREATE TRIGGER cancel_old_subscriptions_trigger
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION cancel_old_subscriptions();

-- 10. Add index for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
  ON subscriptions(user_id, status);

-- 11. Clean up duplicate active subscriptions for all users
WITH ranked_subs AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE WHEN stripe_subscription_id IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN plan_type = 'individual_pro' THEN 0 ELSE 1 END,
        created_at DESC
    ) as rn
  FROM subscriptions
  WHERE status IN ('active', 'trialing')
)
UPDATE subscriptions
SET 
  status = 'canceled',
  canceled_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM ranked_subs WHERE rn > 1
);

-- 12. Create view for easy access to active subscriptions
CREATE OR REPLACE VIEW active_user_subscriptions AS
SELECT DISTINCT ON (s.user_id)
  s.*,
  p.name as plan_name,
  p.display_name as plan_display_name,
  p.price_monthly,
  p.price_yearly,
  p.monthly_audio_hours_limit,
  p.max_sessions_per_month,
  p.has_real_time_guidance,
  p.has_advanced_summaries,
  p.has_export_options
FROM subscriptions s
LEFT JOIN plans p ON s.plan_id = p.id
WHERE s.status IN ('active', 'trialing')
ORDER BY 
  s.user_id,
  CASE WHEN s.stripe_subscription_id IS NOT NULL THEN 0 ELSE 1 END,
  CASE WHEN s.plan_type = 'individual_pro' THEN 0 ELSE 1 END,
  s.created_at DESC;

-- Grant permissions
GRANT SELECT ON active_user_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_subscription TO authenticated;

-- 13. Add RLS policies if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' 
    AND policyname = 'Users can view their own subscriptions'
  ) THEN
    CREATE POLICY "Users can view their own subscriptions" ON subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 14. Final verification - check all active Pro subscriptions have correct limits
SELECT 
  u.email,
  om.monthly_audio_hours_limit as org_member_limit,
  p.monthly_audio_hours_limit as plan_limit,
  p.display_name as plan_name,
  s.plan_type,
  s.status,
  CASE 
    WHEN om.monthly_audio_hours_limit = p.monthly_audio_hours_limit THEN 'OK'
    ELSE 'MISMATCH - NEEDS FIX'
  END as sync_status
FROM organization_members om
JOIN users u ON u.id = om.user_id
JOIN subscriptions s ON s.user_id = om.user_id AND s.organization_id = om.organization_id
JOIN plans p ON p.id = s.plan_id
WHERE s.status IN ('active', 'trialing')
ORDER BY sync_status DESC, u.email;