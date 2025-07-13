-- Create referral status enum
CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'rewarded', 'expired');

-- Add referral fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id);

-- Create index on referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Create user_referrals table
CREATE TABLE IF NOT EXISTS user_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referee_id UUID NOT NULL REFERENCES users(id),
    referee_email VARCHAR(255) NOT NULL,
    status referral_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    reward_amount DECIMAL(10,2) DEFAULT 5.00,
    discount_percentage INTEGER DEFAULT 10,
    ip_address INET,
    device_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    CONSTRAINT uq_ref_completed UNIQUE (referee_id, status) 
        WHERE status IN ('completed', 'rewarded')
);

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('referral_reward', 'redemption')),
    description TEXT,
    reference_id UUID,
    stripe_customer_balance_txn_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referee ON user_referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_status ON user_referrals(status);
CREATE INDEX IF NOT EXISTS idx_user_credits_user ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_expiry ON user_credits(expires_at) WHERE expires_at IS NOT NULL;

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
BEGIN
    WHILE attempt < max_attempts LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM users WHERE referral_code = result) THEN
            RETURN result;
        END IF;
        
        attempt := attempt + 1;
    END LOOP;
    
    -- If we couldn't generate a unique code, append timestamp
    RETURN result || to_char(now(), 'SSSS');
END;
$$ LANGUAGE plpgsql;

-- Create function to process referral codes
CREATE OR REPLACE FUNCTION process_referral_code(
    p_user_id UUID,
    p_referral_code TEXT,
    p_device_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id UUID;
    v_existing_referral UUID;
BEGIN
    -- Normalize referral code to uppercase
    p_referral_code := UPPER(p_referral_code);
    
    -- Find referrer by code
    SELECT id INTO v_referrer_id 
    FROM users 
    WHERE referral_code = p_referral_code 
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
END;
$$ LANGUAGE plpgsql;

-- Create trigger to generate referral code on user creation
CREATE OR REPLACE FUNCTION generate_user_referral_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_user_has_referral_code
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_user_referral_code();

-- RLS Policies
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Policies for user_referrals
CREATE POLICY "Users can view their own referrals as referrer" 
    ON user_referrals FOR SELECT 
    USING (referrer_id = auth.uid());

CREATE POLICY "Users can view their own referrals as referee" 
    ON user_referrals FOR SELECT 
    USING (referee_id = auth.uid());

-- Policies for user_credits
CREATE POLICY "Users can view their own credits" 
    ON user_credits FOR SELECT 
    USING (user_id = auth.uid());