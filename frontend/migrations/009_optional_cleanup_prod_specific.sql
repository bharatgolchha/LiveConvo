-- Migration: 009_optional_cleanup_prod_specific.sql
-- Purpose: Optional cleanup of Production-specific elements that don't exist in Dev
-- WARNING: This migration is OPTIONAL and should be carefully reviewed before running
-- It removes features that exist in Prod but not in Dev

-- IMPORTANT: Review each section carefully before uncommenting and running
-- Some of these features might be intentionally added to Prod and should be kept

-- Section 1: Remove referral_fraud_checks table (exists in Prod but not Dev)
-- This table might be important for fraud prevention in production
-- UNCOMMENT ONLY IF YOU'RE SURE YOU WANT TO REMOVE IT
/*
DROP TABLE IF EXISTS public.referral_fraud_checks CASCADE;
*/

-- Section 2: Remove Prod-specific columns from user_referrals
-- These columns might contain important production data
-- UNCOMMENT ONLY AFTER ENSURING DATA IS BACKED UP OR MIGRATED
/*
ALTER TABLE public.user_referrals 
DROP COLUMN IF EXISTS referral_code,
DROP COLUMN IF EXISTS referee_discount_applied,
DROP COLUMN IF EXISTS rewarded_at,
DROP COLUMN IF EXISTS first_payment_id,
DROP COLUMN IF EXISTS stripe_coupon_id,
DROP COLUMN IF EXISTS stripe_checkout_session_id;
*/

-- Section 3: Remove Prod-specific functions
-- These functions might be providing important functionality
-- UNCOMMENT ONLY IF YOU'RE SURE THEY'RE NOT NEEDED
/*
DROP FUNCTION IF EXISTS public.check_referral_limits(UUID, INET, TEXT);
*/

-- Section 4: Drop old column names after data migration is verified
-- ONLY run this after confirming data has been successfully migrated
-- from referrer_user_id -> referrer_id, referee_user_id -> referee_id, etc.
/*
ALTER TABLE public.user_referrals 
DROP COLUMN IF EXISTS referrer_user_id,
DROP COLUMN IF EXISTS referee_user_id,
DROP COLUMN IF EXISTS referee_discount_percent;
*/

-- Add a note about what was intentionally kept
COMMENT ON SCHEMA public IS 'Schema synchronized between Dev and Prod. Some Prod-specific features may have been retained for backward compatibility.';

-- Log the migration completion
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
        INSERT INTO public.system_logs (
            level,
            category,
            message,
            metadata
        ) VALUES (
            'info',
            'migration',
            'Optional cleanup migration reviewed',
            jsonb_build_object(
                'migration', '009_optional_cleanup_prod_specific.sql',
                'note', 'This migration contains optional cleanup steps that should be carefully reviewed',
                'timestamp', now()
            )
        );
    END IF;
END $$;