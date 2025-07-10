# Setting Up the Referral System

The referral system requires database migrations to be run. Here's how to set it up:

## Quick Setup (Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run these migrations in order:

### 1. Main Referral System (001_referral_system.sql)
Copy and paste the contents of `sql/migrations/001_referral_system.sql` into the SQL editor and run it.

### 2. Generate Codes for Existing Users (002_generate_existing_user_referral_codes.sql)
Copy and paste the contents of `sql/migrations/002_generate_existing_user_referral_codes.sql` into the SQL editor and run it.

### 3. Setup Signup Trigger (003_referral_signup_trigger.sql)
Copy and paste the contents of `sql/migrations/003_referral_signup_trigger.sql` into the SQL editor and run it.

## Verify Setup

After running the migrations, verify everything is set up correctly:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_referrals', 'user_credits', 'referral_fraud_checks');

-- Check if referral_code column was added to users
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'referral_code';

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('generate_referral_code', 'process_referral_code');
```

## Testing the System

1. The referral widget should now load without errors
2. Each user should automatically get a referral code
3. New signups with referral codes will create pending referrals
4. Referrals will be marked as completed when the referee makes their first payment

## Troubleshooting

If you're still seeing errors:

1. Check the browser console for specific error messages
2. Check the Supabase logs for database errors
3. Ensure all three migrations ran successfully
4. Try refreshing the page after migrations are complete