-- Referral System Migration
-- This migration adds tables and columns for the referral rewards system

-- Create referral status enum type
CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'rewarded', 'expired');

-- Add referral fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES public.users(id);

-- Create index on referral code for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- Create user_referrals table for tracking referrals
CREATE TABLE IF NOT EXISTS public.user_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID REFERENCES public.users(id) NOT NULL,
    referee_user_id UUID REFERENCES public.users(id),
    referral_code VARCHAR(10) NOT NULL,
    status referral_status DEFAULT 'pending',
    reward_amount DECIMAL(10,2) DEFAULT 5.00,
    referee_discount_percent INTEGER DEFAULT 10,
    referee_discount_applied BOOLEAN DEFAULT FALSE,
    device_id TEXT, -- FingerprintJS device ID
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    rewarded_at TIMESTAMP WITH TIME ZONE,
    first_payment_id TEXT, -- Stripe payment ID
    stripe_coupon_id TEXT, -- Stripe coupon ID for referee discount
    stripe_checkout_session_id TEXT -- Track the checkout session
);

-- Create unique partial index: only one completed referral per user
CREATE UNIQUE INDEX uq_ref_completed 
ON public.user_referrals(referee_user_id) 
WHERE status = 'completed';

-- Create index for referrer lookups
CREATE INDEX idx_referrals_referrer ON public.user_referrals(referrer_user_id);
CREATE INDEX idx_referrals_status ON public.user_referrals(status);
CREATE INDEX idx_referrals_created_at ON public.user_referrals(created_at);

-- Create user_credits table for tracking credit balance
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('referral_reward', 'promotional', 'manual_adjustment', 'redemption')),
    description TEXT,
    reference_id UUID, -- Links to user_referrals.id for referral rewards
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stripe_customer_balance_txn_id TEXT -- Stripe Customer Balance transaction ID
);

-- Create indexes for credit lookups
CREATE INDEX idx_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_credits_type ON public.user_credits(type);
CREATE INDEX idx_credits_created_at ON public.user_credits(created_at);

-- Create partial index for expiry lookups
CREATE INDEX idx_credit_expiry 
ON public.user_credits(expires_at) 
WHERE expires_at IS NOT NULL;

-- Create view for user credit balance
CREATE OR REPLACE VIEW public.user_credit_balance AS
SELECT 
    user_id,
    SUM(CASE 
        WHEN type = 'redemption' THEN -amount 
        ELSE amount 
    END) as balance,
    COUNT(CASE WHEN type = 'referral_reward' THEN 1 END) as total_referrals,
    SUM(CASE 
        WHEN type = 'referral_reward' THEN amount 
        ELSE 0 
    END) as total_earned,
    SUM(CASE 
        WHEN type = 'redemption' THEN amount 
        ELSE 0 
    END) as total_redeemed
FROM public.user_credits
WHERE expires_at IS NULL OR expires_at > NOW()
GROUP BY user_id;

-- Create table for tracking fraud prevention
CREATE TABLE IF NOT EXISTS public.referral_fraud_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    device_id TEXT,
    ip_address INET,
    card_fingerprint TEXT,
    check_type VARCHAR(50), -- 'device_limit', 'ip_limit', 'card_limit'
    flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fraud checks
CREATE INDEX idx_fraud_device_id ON public.referral_fraud_checks(device_id);
CREATE INDEX idx_fraud_ip_address ON public.referral_fraud_checks(ip_address);
CREATE INDEX idx_fraud_card_fingerprint ON public.referral_fraud_checks(card_fingerprint);

-- RLS Policies for user_referrals
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (both as referrer and referee)
CREATE POLICY "Users can view own referrals" ON public.user_referrals
    FOR SELECT USING (
        auth.uid() = referrer_user_id OR 
        auth.uid() = referee_user_id
    );

-- Users can create referrals when they sign up
CREATE POLICY "Users can create referrals" ON public.user_referrals
    FOR INSERT WITH CHECK (
        auth.uid() = referee_user_id
    );

-- RLS Policies for user_credits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for user_credit_balance view
-- Views inherit RLS from base tables

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS VARCHAR(10)
LANGUAGE plpgsql
AS $$
DECLARE
    v_code VARCHAR(10);
    v_attempts INTEGER := 0;
    v_max_attempts INTEGER := 10;
    v_user_name TEXT;
    v_initials TEXT;
BEGIN
    -- Get user initials
    SELECT UPPER(SUBSTRING(full_name FROM 1 FOR 2))
    INTO v_initials
    FROM public.users
    WHERE id = p_user_id;
    
    -- If no name, use first 2 chars of email
    IF v_initials IS NULL THEN
        SELECT UPPER(SUBSTRING(email FROM 1 FOR 2))
        INTO v_initials
        FROM public.users
        WHERE id = p_user_id;
    END IF;
    
    -- Generate code with retries
    WHILE v_attempts < v_max_attempts LOOP
        -- Format: INITIALS + 4-6 random alphanumeric chars
        v_code := v_initials || UPPER(
            SUBSTRING(
                MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT),
                1,
                4 + FLOOR(RANDOM() * 3)::INT
            )
        );
        
        -- Check if code already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.users WHERE referral_code = v_code
        ) THEN
            RETURN v_code;
        END IF;
        
        v_attempts := v_attempts + 1;
    END LOOP;
    
    -- If all attempts failed, generate a completely random code
    v_code := 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_user_id::TEXT), 1, 7));
    RETURN v_code;
END;
$$;

-- Function to check referral limits (rate limiting)
CREATE OR REPLACE FUNCTION public.check_referral_limits(
    p_referrer_id UUID,
    p_ip_address INET,
    p_device_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_daily_limit INTEGER := 5;
    v_ip_count INTEGER;
    v_device_count INTEGER;
BEGIN
    -- Check IP-based limit
    SELECT COUNT(*)
    INTO v_ip_count
    FROM public.user_referrals
    WHERE referrer_user_id = p_referrer_id
        AND ip_address = p_ip_address
        AND created_at > NOW() - INTERVAL '24 hours';
    
    IF v_ip_count >= v_daily_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Check device-based limit
    IF p_device_id IS NOT NULL THEN
        SELECT COUNT(*)
        INTO v_device_count
        FROM public.user_referrals
        WHERE referrer_user_id = p_referrer_id
            AND device_id = p_device_id
            AND created_at > NOW() - INTERVAL '24 hours';
        
        IF v_device_count >= v_daily_limit THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.user_credit_balance TO authenticated;
GRANT ALL ON public.user_referrals TO authenticated;
GRANT ALL ON public.user_credits TO authenticated;
GRANT SELECT ON public.referral_fraud_checks TO authenticated;