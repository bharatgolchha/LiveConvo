-- Migration: 006_migrate_user_referrals_table.sql
-- Purpose: Align the user_referrals table schema between Dev and Prod
-- This is a complex migration that needs to handle existing data carefully

-- IMPORTANT: This migration assumes the Prod schema is the current state
-- We need to add missing columns from Dev and align column names

-- Step 1: Add missing columns from Dev that don't exist in Prod
ALTER TABLE public.user_referrals 
ADD COLUMN IF NOT EXISTS referee_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Step 2: Create temporary columns for the renamed fields
-- We'll migrate data from old columns to new ones, then drop the old ones
ALTER TABLE public.user_referrals 
ADD COLUMN IF NOT EXISTS referrer_id UUID,
ADD COLUMN IF NOT EXISTS referee_id UUID,
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER;

-- Step 3: Copy data from existing columns to new column names
-- This assumes the Production column names are the current state
UPDATE public.user_referrals 
SET 
    referrer_id = referrer_user_id,
    referee_id = referee_user_id,
    discount_percentage = referee_discount_percent
WHERE referrer_id IS NULL OR referee_id IS NULL OR discount_percentage IS NULL;

-- Step 4: Add NOT NULL constraints to match Dev schema
-- First, handle any NULL values in referee_id (Prod allows NULL, Dev doesn't)
UPDATE public.user_referrals 
SET referee_id = referrer_id 
WHERE referee_id IS NULL AND referrer_id IS NOT NULL;

-- Now add the constraints
ALTER TABLE public.user_referrals 
ALTER COLUMN referrer_id SET NOT NULL,
ALTER COLUMN referee_id SET NOT NULL;

-- Step 5: Drop the old columns (BE VERY CAREFUL - ensure data is migrated first!)
-- Commenting out for safety - uncomment only after verifying data migration
-- ALTER TABLE public.user_referrals 
-- DROP COLUMN IF EXISTS referrer_user_id,
-- DROP COLUMN IF EXISTS referee_user_id,
-- DROP COLUMN IF EXISTS referee_discount_percent;

-- Step 6: Remove columns that exist in Prod but not in Dev
-- Commenting out for safety - these might be needed features
-- ALTER TABLE public.user_referrals 
-- DROP COLUMN IF EXISTS referral_code,
-- DROP COLUMN IF EXISTS referee_discount_applied,
-- DROP COLUMN IF EXISTS rewarded_at,
-- DROP COLUMN IF EXISTS first_payment_id,
-- DROP COLUMN IF EXISTS stripe_coupon_id,
-- DROP COLUMN IF EXISTS stripe_checkout_session_id;

-- Step 7: Align data types
-- Convert device_id from TEXT to VARCHAR(255) to match Dev
ALTER TABLE public.user_referrals 
ALTER COLUMN device_id TYPE VARCHAR(255) USING device_id::VARCHAR(255);

-- Step 8: Update indexes to use new column names
DROP INDEX IF EXISTS idx_user_referrals_referrer_user_id;
DROP INDEX IF EXISTS idx_user_referrals_referee_user_id;

CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer_id ON public.user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referee_id ON public.user_referrals(referee_id);

-- Step 9: Update foreign key constraints to use new column names
-- First drop old constraints
ALTER TABLE public.user_referrals 
DROP CONSTRAINT IF EXISTS user_referrals_referrer_user_id_fkey,
DROP CONSTRAINT IF EXISTS user_referrals_referee_user_id_fkey;

-- Then add new constraints
ALTER TABLE public.user_referrals 
ADD CONSTRAINT user_referrals_referrer_id_fkey 
    FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE CASCADE,
ADD CONSTRAINT user_referrals_referee_id_fkey 
    FOREIGN KEY (referee_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON COLUMN public.user_referrals.referrer_id IS 'User ID of the person who made the referral';
COMMENT ON COLUMN public.user_referrals.referee_id IS 'User ID of the person who was referred';
COMMENT ON COLUMN public.user_referrals.referee_email IS 'Email address of the referee';
COMMENT ON COLUMN public.user_referrals.metadata IS 'Additional metadata for the referral';

-- Note: This migration preserves both Dev and Prod features
-- The extra columns from Prod are kept for backward compatibility
-- Consider a follow-up migration to standardize the approach after testing