-- Update the trigger to ensure referral codes are generated for all new users
-- This ensures OAuth users also get referral codes

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_user_has_referral_code ON users;

-- Recreate the trigger to fire on INSERT OR UPDATE
CREATE TRIGGER ensure_user_has_referral_code
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    WHEN (NEW.referral_code IS NULL)
    EXECUTE FUNCTION generate_user_referral_code();

-- Also create a function to backfill any OAuth users who might have missed getting a code
-- This is safe to run multiple times
DO $$
BEGIN
    UPDATE users 
    SET referral_code = generate_referral_code()
    WHERE referral_code IS NULL;
END $$;