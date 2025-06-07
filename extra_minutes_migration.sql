-- Extra Minutes Purchase Feature Migration
-- This migration adds support for users to purchase additional minutes beyond their plan limits

-- 1. Create extra minutes packages table (available packages for purchase)
CREATE TABLE IF NOT EXISTS public.extra_minutes_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    minutes INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    stripe_price_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_extra_minutes_packages_is_active ON extra_minutes_packages(is_active);
CREATE INDEX idx_extra_minutes_packages_sort_order ON extra_minutes_packages(sort_order);

-- 2. Create extra minutes purchases table (tracks user purchases)
CREATE TABLE IF NOT EXISTS public.extra_minutes_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    package_id UUID REFERENCES extra_minutes_packages(id),
    
    -- Purchase details
    minutes_purchased INTEGER NOT NULL,
    minutes_remaining INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    
    -- Timestamps
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL means no expiration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_extra_minutes_purchases_user_id ON extra_minutes_purchases(user_id);
CREATE INDEX idx_extra_minutes_purchases_org_id ON extra_minutes_purchases(organization_id);
CREATE INDEX idx_extra_minutes_purchases_status ON extra_minutes_purchases(status);
CREATE INDEX idx_extra_minutes_purchases_expires_at ON extra_minutes_purchases(expires_at);
CREATE INDEX idx_extra_minutes_purchases_stripe_payment_intent ON extra_minutes_purchases(stripe_payment_intent_id);

-- 3. Create extra minutes usage table (tracks consumption of extra minutes)
CREATE TABLE IF NOT EXISTS public.extra_minutes_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES extra_minutes_purchases(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Usage details
    minutes_used INTEGER NOT NULL CHECK (minutes_used > 0),
    
    -- Timestamps
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_extra_minutes_usage_user_id ON extra_minutes_usage(user_id);
CREATE INDEX idx_extra_minutes_usage_purchase_id ON extra_minutes_usage(purchase_id);
CREATE INDEX idx_extra_minutes_usage_session_id ON extra_minutes_usage(session_id);
CREATE INDEX idx_extra_minutes_usage_used_at ON extra_minutes_usage(used_at);

-- 4. Add extra minutes tracking columns to monthly_usage_cache
ALTER TABLE monthly_usage_cache 
ADD COLUMN IF NOT EXISTS extra_minutes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_minutes_balance INTEGER DEFAULT 0;

-- Add check constraints
ALTER TABLE monthly_usage_cache
ADD CONSTRAINT extra_minutes_used_check CHECK (extra_minutes_used >= 0),
ADD CONSTRAINT extra_minutes_balance_check CHECK (extra_minutes_balance >= 0);

-- 5. Create a view for user's extra minutes balance
CREATE OR REPLACE VIEW user_extra_minutes_balance AS
SELECT 
    u.id as user_id,
    u.current_organization_id as organization_id,
    COALESCE(SUM(emp.minutes_remaining), 0) as total_minutes_available,
    COALESCE(
        (SELECT SUM(minutes_used) 
         FROM extra_minutes_usage emu 
         WHERE emu.user_id = u.id 
         AND emu.organization_id = u.current_organization_id),
        0
    ) as total_minutes_used,
    COUNT(DISTINCT emp.id) as active_purchases,
    MIN(emp.expires_at) as next_expiration
FROM users u
LEFT JOIN extra_minutes_purchases emp ON 
    emp.user_id = u.id 
    AND emp.organization_id = u.current_organization_id
    AND emp.status = 'completed'
    AND emp.minutes_remaining > 0
    AND (emp.expires_at IS NULL OR emp.expires_at > CURRENT_TIMESTAMP)
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.current_organization_id;

-- 6. Create function to deduct extra minutes
CREATE OR REPLACE FUNCTION deduct_extra_minutes(
    p_user_id UUID,
    p_organization_id UUID,
    p_session_id UUID,
    p_minutes_to_deduct INTEGER
) RETURNS TABLE(
    success BOOLEAN,
    minutes_deducted INTEGER,
    remaining_balance INTEGER,
    purchase_ids UUID[]
) AS $$
DECLARE
    v_remaining_to_deduct INTEGER;
    v_purchase RECORD;
    v_minutes_to_take INTEGER;
    v_total_deducted INTEGER := 0;
    v_purchase_ids UUID[] := ARRAY[]::UUID[];
    v_remaining_balance INTEGER;
BEGIN
    v_remaining_to_deduct := p_minutes_to_deduct;
    
    -- Loop through available purchases in FIFO order
    FOR v_purchase IN 
        SELECT id, minutes_remaining 
        FROM extra_minutes_purchases
        WHERE user_id = p_user_id
        AND organization_id = p_organization_id
        AND status = 'completed'
        AND minutes_remaining > 0
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY purchased_at ASC
        FOR UPDATE
    LOOP
        IF v_remaining_to_deduct <= 0 THEN
            EXIT;
        END IF;
        
        -- Calculate how many minutes to take from this purchase
        v_minutes_to_take := LEAST(v_remaining_to_deduct, v_purchase.minutes_remaining);
        
        -- Update the purchase
        UPDATE extra_minutes_purchases
        SET minutes_remaining = minutes_remaining - v_minutes_to_take,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_purchase.id;
        
        -- Record the usage
        INSERT INTO extra_minutes_usage (
            user_id, organization_id, purchase_id, session_id, minutes_used
        ) VALUES (
            p_user_id, p_organization_id, v_purchase.id, p_session_id, v_minutes_to_take
        );
        
        -- Update tracking variables
        v_total_deducted := v_total_deducted + v_minutes_to_take;
        v_remaining_to_deduct := v_remaining_to_deduct - v_minutes_to_take;
        v_purchase_ids := array_append(v_purchase_ids, v_purchase.id);
    END LOOP;
    
    -- Get remaining balance
    SELECT COALESCE(SUM(minutes_remaining), 0) INTO v_remaining_balance
    FROM extra_minutes_purchases
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND status = 'completed'
    AND minutes_remaining > 0
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    -- Update monthly cache
    UPDATE monthly_usage_cache
    SET extra_minutes_used = extra_minutes_used + v_total_deducted,
        extra_minutes_balance = v_remaining_balance,
        last_updated = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    RETURN QUERY SELECT 
        v_total_deducted = p_minutes_to_deduct,
        v_total_deducted,
        v_remaining_balance,
        v_purchase_ids;
END;
$$ LANGUAGE plpgsql;

-- 7. Update check_usage_limit function to include extra minutes
CREATE OR REPLACE FUNCTION check_usage_limit(p_user_id UUID, p_organization_id UUID) 
RETURNS TABLE(
    can_record BOOLEAN,
    minutes_used INTEGER,
    minutes_limit INTEGER,
    minutes_remaining INTEGER,
    percentage_used NUMERIC,
    extra_minutes_available INTEGER,
    total_minutes_available INTEGER
) AS $$
DECLARE
    v_minutes_used INTEGER;
    v_minutes_limit INTEGER;
    v_plan_limit INTEGER;
    v_member_limit INTEGER;
    v_extra_minutes INTEGER;
    v_total_available INTEGER;
    current_month VARCHAR(7);
BEGIN
    -- Get current month
    current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Get usage from cache (default to 0 if not found)
    SELECT COALESCE(total_minutes_used, 0), COALESCE(extra_minutes_balance, 0) 
    INTO v_minutes_used, v_extra_minutes
    FROM monthly_usage_cache
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND month_year = current_month;
    
    -- If no usage record exists, set to 0
    IF v_minutes_used IS NULL THEN
        v_minutes_used := 0;
    END IF;
    
    -- If extra minutes not found, calculate from purchases
    IF v_extra_minutes IS NULL OR v_extra_minutes = 0 THEN
        SELECT COALESCE(SUM(minutes_remaining), 0) INTO v_extra_minutes
        FROM extra_minutes_purchases
        WHERE user_id = p_user_id
        AND organization_id = p_organization_id
        AND status = 'completed'
        AND minutes_remaining > 0
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    END IF;
    
    -- Get limits from organization and member settings
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
    
    -- Calculate total available minutes (plan + extra)
    v_total_available := v_minutes_limit + v_extra_minutes;
    
    RETURN QUERY SELECT 
        v_minutes_used < v_total_available AS can_record,
        v_minutes_used AS minutes_used,
        v_minutes_limit AS minutes_limit,
        GREATEST(0, v_minutes_limit - v_minutes_used) AS minutes_remaining,
        CASE 
            WHEN v_minutes_limit > 0 THEN 
                ROUND((v_minutes_used::numeric / v_minutes_limit) * 100, 2)
            ELSE 
                0
        END AS percentage_used,
        v_extra_minutes AS extra_minutes_available,
        v_total_available AS total_minutes_available;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to update purchase timestamps
CREATE OR REPLACE FUNCTION update_extra_minutes_purchase_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_extra_minutes_purchase_timestamp
BEFORE UPDATE ON extra_minutes_purchases
FOR EACH ROW
EXECUTE FUNCTION update_extra_minutes_purchase_timestamp();

-- 9. Insert default extra minutes packages
INSERT INTO extra_minutes_packages (name, display_name, minutes, price_cents, sort_order) VALUES
('extra_small', 'Small Pack', 60, 999, 1),        -- 60 minutes for $9.99
('extra_medium', 'Medium Pack', 150, 1999, 2),    -- 150 minutes for $19.99
('extra_large', 'Large Pack', 300, 3499, 3),      -- 300 minutes for $34.99
('extra_jumbo', 'Jumbo Pack', 600, 5999, 4);      -- 600 minutes for $59.99

-- 10. Set up RLS policies for extra minutes tables
ALTER TABLE extra_minutes_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_minutes_usage ENABLE ROW LEVEL SECURITY;

-- Purchases policies
CREATE POLICY "Users can view their own extra minutes purchases"
ON extra_minutes_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage extra minutes purchases"
ON extra_minutes_purchases FOR ALL
USING (auth.role() = 'service_role');

-- Usage policies
CREATE POLICY "Users can view their own extra minutes usage"
ON extra_minutes_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage extra minutes usage"
ON extra_minutes_usage FOR ALL
USING (auth.role() = 'service_role');