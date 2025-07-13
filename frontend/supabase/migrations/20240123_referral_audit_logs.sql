-- Create referral audit log table for tracking all referral events

-- Create event type enum
CREATE TYPE referral_event_type AS ENUM (
  'link_clicked',
  'code_validated',
  'code_invalid',
  'signup_attempted',
  'signup_completed',
  'self_referral_blocked',
  'payment_completed',
  'credit_scheduled',
  'credit_granted',
  'credit_failed',
  'refund_processed',
  'fraud_detected',
  'error'
);

-- Create referral audit logs table
CREATE TABLE IF NOT EXISTS referral_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type referral_event_type NOT NULL,
  user_id UUID REFERENCES users(id),
  referrer_id UUID REFERENCES users(id),
  referee_id UUID REFERENCES users(id),
  referral_id UUID REFERENCES user_referrals(id),
  referral_code VARCHAR(10),
  ip_address INET,
  user_agent TEXT,
  device_id VARCHAR(255),
  event_data JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_event_type ON referral_audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON referral_audit_logs(user_id);
CREATE INDEX idx_audit_logs_referrer_id ON referral_audit_logs(referrer_id);
CREATE INDEX idx_audit_logs_created_at ON referral_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_referral_code ON referral_audit_logs(referral_code);

-- Enable RLS
ALTER TABLE referral_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for referral audit logs
CREATE POLICY "Users can view their own referral logs" 
  ON referral_audit_logs FOR SELECT 
  USING (user_id = auth.uid() OR referrer_id = auth.uid() OR referee_id = auth.uid());

CREATE POLICY "Service role can manage all logs" 
  ON referral_audit_logs FOR ALL 
  TO service_role
  USING (true);

-- Create logging function
CREATE OR REPLACE FUNCTION log_referral_event(
  p_event_type referral_event_type,
  p_user_id UUID DEFAULT NULL,
  p_referrer_id UUID DEFAULT NULL,
  p_referee_id UUID DEFAULT NULL,
  p_referral_id UUID DEFAULT NULL,
  p_referral_code VARCHAR DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_id VARCHAR DEFAULT NULL,
  p_event_data JSONB DEFAULT '{}',
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO referral_audit_logs (
    event_type,
    user_id,
    referrer_id,
    referee_id,
    referral_id,
    referral_code,
    ip_address,
    user_agent,
    device_id,
    event_data,
    error_message
  ) VALUES (
    p_event_type,
    p_user_id,
    p_referrer_id,
    p_referee_id,
    p_referral_id,
    p_referral_code,
    p_ip_address,
    p_user_agent,
    p_device_id,
    p_event_data,
    p_error_message
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Update process_referral_code to include logging
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
    v_referral_id UUID;
BEGIN
    -- Normalize and validate referral code
    v_clean_code := UPPER(TRIM(p_referral_code));
    
    -- Log validation attempt
    PERFORM log_referral_event(
      'code_validated',
      p_user_id,
      NULL,
      NULL,
      NULL,
      v_clean_code,
      p_ip_address,
      NULL,
      p_device_id
    );
    
    IF NOT is_valid_referral_code(v_clean_code) THEN
        PERFORM log_referral_event(
          'code_invalid',
          p_user_id,
          NULL,
          NULL,
          NULL,
          v_clean_code,
          p_ip_address,
          NULL,
          p_device_id,
          jsonb_build_object('reason', 'invalid_format')
        );
        RETURN FALSE;
    END IF;
    
    -- Find referrer by code
    SELECT id INTO v_referrer_id 
    FROM users 
    WHERE referral_code = v_clean_code 
    AND id != p_user_id;
    
    IF v_referrer_id IS NULL THEN
        PERFORM log_referral_event(
          'code_invalid',
          p_user_id,
          NULL,
          NULL,
          NULL,
          v_clean_code,
          p_ip_address,
          NULL,
          p_device_id,
          jsonb_build_object('reason', 'code_not_found')
        );
        RETURN FALSE;
    END IF;
    
    -- Check for self-referral
    IF v_referrer_id = p_user_id THEN
        PERFORM log_referral_event(
          'self_referral_blocked',
          p_user_id,
          v_referrer_id,
          p_user_id,
          NULL,
          v_clean_code,
          p_ip_address,
          NULL,
          p_device_id
        );
        RETURN FALSE;
    END IF;
    
    -- Check if user already has a referral
    SELECT id INTO v_existing_referral
    FROM user_referrals
    WHERE referee_id = p_user_id;
    
    IF v_existing_referral IS NOT NULL THEN
        PERFORM log_referral_event(
          'signup_attempted',
          p_user_id,
          v_referrer_id,
          p_user_id,
          v_existing_referral,
          v_clean_code,
          p_ip_address,
          NULL,
          p_device_id,
          jsonb_build_object('reason', 'already_referred')
        );
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
    WHERE u.id = p_user_id
    RETURNING id INTO v_referral_id;
    
    -- Update user's referred_by
    UPDATE users 
    SET referred_by_user_id = v_referrer_id
    WHERE id = p_user_id;
    
    -- Log successful signup
    PERFORM log_referral_event(
      'signup_completed',
      p_user_id,
      v_referrer_id,
      p_user_id,
      v_referral_id,
      v_clean_code,
      p_ip_address,
      NULL,
      p_device_id
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        PERFORM log_referral_event(
          'error',
          p_user_id,
          v_referrer_id,
          p_user_id,
          NULL,
          v_clean_code,
          p_ip_address,
          NULL,
          p_device_id,
          jsonb_build_object('error', SQLERRM),
          SQLERRM
        );
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;