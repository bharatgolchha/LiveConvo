-- Migration: Fix usage limits to respect user subscriptions
-- This fixes the issue where Pro users were seeing Free plan limits

-- Create an improved check_usage_limit_v2 function that respects subscription plans
CREATE OR REPLACE FUNCTION public.check_usage_limit_v2(p_user_id uuid, p_organization_id uuid)
RETURNS TABLE(can_record boolean, minutes_used integer, minutes_limit integer, minutes_remaining integer, percentage_used numeric, is_unlimited boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_minutes_used integer;
    v_minutes_limit integer;
    v_plan_limit integer;
    v_subscription_limit integer;
    v_member_limit integer;
    v_has_unlimited_plan boolean := false;
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
    
    -- First, check if user has an active subscription with a plan
    SELECT 
        CASE 
            WHEN p.monthly_audio_hours_limit IS NULL THEN NULL  -- NULL means unlimited
            ELSE p.monthly_audio_hours_limit * 60  -- Convert hours to minutes
        END,
        p.monthly_audio_hours_limit IS NULL  -- Check if plan is unlimited
    INTO v_subscription_limit, v_has_unlimited_plan
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- If user has an unlimited plan
    IF v_has_unlimited_plan THEN
        RETURN QUERY SELECT 
            true AS can_record,
            v_minutes_used AS minutes_used,
            999999 AS minutes_limit,  -- Use a large number to indicate unlimited
            999999 - v_minutes_used AS minutes_remaining,
            0::numeric AS percentage_used,
            true AS is_unlimited;
        RETURN;
    END IF;
    
    -- If subscription has a specific limit, use it
    IF v_subscription_limit IS NOT NULL THEN
        v_minutes_limit := v_subscription_limit;
    ELSE
        -- Fall back to organization limits
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
        END AS percentage_used,
        false AS is_unlimited;
END;
$$;

-- Update the original function to use the new logic for backward compatibility
CREATE OR REPLACE FUNCTION public.check_usage_limit(p_user_id uuid, p_organization_id uuid)
RETURNS TABLE(can_record boolean, minutes_used integer, minutes_limit integer, minutes_remaining integer, percentage_used numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_result record;
BEGIN
    -- Call the v2 function and return compatible results
    SELECT * INTO v_result FROM check_usage_limit_v2(p_user_id, p_organization_id);
    
    RETURN QUERY SELECT 
        v_result.can_record,
        v_result.minutes_used,
        v_result.minutes_limit,
        v_result.minutes_remaining,
        v_result.percentage_used;
END;
$$;

-- Test the function to ensure it works correctly
-- Example: SELECT * FROM check_usage_limit_v2('user-uuid'::uuid, 'org-uuid'::uuid);