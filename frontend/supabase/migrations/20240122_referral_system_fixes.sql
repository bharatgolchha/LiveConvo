-- Fix referral system edge cases and add constraints

-- 1. Add CHECK constraint to prevent negative credit amounts
ALTER TABLE user_credits
ADD CONSTRAINT positive_amount CHECK (amount > 0);

-- 2. Add index on referred_by_user_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_user_id);

-- 3. Add validation to referral codes (alphanumeric only, 6-10 chars)
ALTER TABLE users
ADD CONSTRAINT valid_referral_code CHECK (
  referral_code ~ '^[A-Z0-9]{6,10}$'
);

-- 4. Create a function to validate referral code format
CREATE OR REPLACE FUNCTION is_valid_referral_code(code TEXT) RETURNS BOOLEAN AS $$
BEGIN
  RETURN code ~ '^[A-Z0-9]{6,10}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Update the process_referral_code function to include better validation
CREATE OR REPLACE FUNCTION process_referral_code(
    p_user_id UUID,
    p_referral_code TEXT,
    p_device_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id UUID;
    v_existing_referral UUID;
    v_clean_code TEXT;
BEGIN
    -- Normalize and validate referral code
    v_clean_code := UPPER(TRIM(p_referral_code));
    
    IF NOT is_valid_referral_code(v_clean_code) THEN
        RETURN FALSE;
    END IF;
    
    -- Find referrer by code
    SELECT id INTO v_referrer_id 
    FROM users 
    WHERE referral_code = v_clean_code 
    AND id != p_user_id;
    
    IF v_referrer_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user already has a referral
    SELECT id INTO v_existing_referral
    FROM user_referrals
    WHERE referee_id = p_user_id;
    
    IF v_existing_referral IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Create referral record
    INSERT INTO user_referrals (
        referrer_id,
        referee_id,
        referee_email,
        device_id,
        ip_address
    )
    SELECT 
        v_referrer_id,
        p_user_id,
        u.email,
        p_device_id,
        p_ip_address
    FROM users u
    WHERE u.id = p_user_id;
    
    -- Update user's referred_by
    UPDATE users 
    SET referred_by_user_id = v_referrer_id
    WHERE id = p_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return false
        RAISE NOTICE 'Error in process_referral_code: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 6. Add a unique constraint to prevent duplicate referral processing
ALTER TABLE user_referrals
ADD CONSTRAINT uq_referee_referrer UNIQUE (referee_id, referrer_id);

-- 7. Create an index for faster referral lookups by status and created date
CREATE INDEX IF NOT EXISTS idx_referrals_status_date 
ON user_referrals(status, created_at DESC);

-- 8. Add a function to handle referral completion with idempotency
CREATE OR REPLACE FUNCTION complete_referral(
    p_referee_id UUID,
    p_payment_intent_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_referral_id UUID;
    v_referrer_id UUID;
    v_reward_amount DECIMAL;
BEGIN
    -- Find the referral
    SELECT id, referrer_id, reward_amount 
    INTO v_referral_id, v_referrer_id, v_reward_amount
    FROM user_referrals
    WHERE referee_id = p_referee_id
    AND status = 'pending'
    FOR UPDATE;
    
    IF v_referral_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update referral status
    UPDATE user_referrals
    SET 
        status = 'completed',
        completed_at = NOW(),
        stripe_payment_intent_id = p_payment_intent_id
    WHERE id = v_referral_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in complete_referral: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 9. Add RLS policy for service role to manage referrals
CREATE POLICY "Service role can manage all referrals" 
    ON user_referrals FOR ALL 
    TO service_role
    USING (true);

-- 10. Add RLS policy for service role to manage credits
CREATE POLICY "Service role can manage all credits" 
    ON user_credits FOR ALL 
    TO service_role
    USING (true);