-- Run this script to set up the referral system
-- Connect to your Supabase database and execute these migrations in order

-- 1. First run the main referral system migration
\i sql/migrations/001_referral_system.sql

-- 2. Generate referral codes for existing users
\i sql/migrations/002_generate_existing_user_referral_codes.sql

-- 3. Set up the signup trigger
\i sql/migrations/003_referral_signup_trigger.sql

-- Verify the setup
SELECT 'Checking if functions exist...' as status;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('generate_referral_code', 'process_referral_code', 'check_referral_limits');

SELECT 'Checking if tables exist...' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_referrals', 'user_credits', 'referral_fraud_checks');

SELECT 'Checking if triggers exist...' as status;
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name = 'on_user_created_generate_referral';

SELECT 'Setup complete!' as status;