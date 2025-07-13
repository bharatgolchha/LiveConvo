-- Migration: 007_create_referral_functions.sql
-- Purpose: Create missing referral-related functions from Dev in Prod
-- These functions provide comprehensive referral system functionality

-- Function 1: complete_referral
-- Updates referral status when payment is completed
CREATE OR REPLACE FUNCTION public.complete_referral(p_referee_id UUID, p_payment_intent_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_referral_id UUID;
BEGIN
    -- Find the pending referral for this referee
    SELECT id INTO v_referral_id
    FROM public.user_referrals
    WHERE referee_id = p_referee_id
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_referral_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update the referral status
    UPDATE public.user_referrals
    SET 
        status = 'completed',
        completed_at = now(),
        stripe_payment_intent_id = p_payment_intent_id
    WHERE id = v_referral_id;
    
    -- Log the event if audit logs table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_audit_logs') THEN
        INSERT INTO public.referral_audit_logs (
            event_type,
            referee_id,
            referral_id,
            event_data
        ) VALUES (
            'payment_completed',
            p_referee_id,
            v_referral_id,
            jsonb_build_object('payment_intent_id', p_payment_intent_id)
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: generate_referral_code
-- Generates a unique 6-character referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 6-character alphanumeric code
        v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
        
        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM public.users WHERE referral_code = v_code
        ) INTO v_exists;
        
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function 3: generate_user_referral_code
-- Trigger function to generate referral code for new users
CREATE OR REPLACE FUNCTION public.generate_user_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code = generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS generate_user_referral_code_trigger ON public.users;
CREATE TRIGGER generate_user_referral_code_trigger
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION generate_user_referral_code();

-- Function 4: log_referral_event
-- Comprehensive event logging for referral system
CREATE OR REPLACE FUNCTION public.log_referral_event(
    p_event_type referral_event_type,
    p_user_id UUID DEFAULT NULL,
    p_referrer_id UUID DEFAULT NULL,
    p_referee_id UUID DEFAULT NULL,
    p_referral_id UUID DEFAULT NULL,
    p_referral_code VARCHAR(10) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_id VARCHAR(255) DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}',
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Only insert if the audit logs table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_audit_logs') THEN
        INSERT INTO public.referral_audit_logs (
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
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: Enhanced process_referral_code
-- Process referral codes with comprehensive validation and fraud checks
CREATE OR REPLACE FUNCTION public.process_referral_code(
    p_referral_code VARCHAR(10),
    p_referee_email VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_id VARCHAR(255) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_referrer_id UUID;
    v_referral_id UUID;
    v_is_self_referral BOOLEAN;
    v_result JSONB;
BEGIN
    -- Validate referral code
    IF p_referral_code IS NULL OR LENGTH(TRIM(p_referral_code)) = 0 THEN
        -- Log invalid code event
        PERFORM log_referral_event(
            'code_invalid'::referral_event_type,
            NULL,
            NULL,
            NULL,
            NULL,
            p_referral_code,
            p_ip_address,
            p_user_agent,
            p_device_id,
            jsonb_build_object('reason', 'empty_code'),
            'Referral code is empty'
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid referral code'
        );
    END IF;
    
    -- Find the referrer
    SELECT id INTO v_referrer_id
    FROM public.users
    WHERE UPPER(referral_code) = UPPER(TRIM(p_referral_code));
    
    IF v_referrer_id IS NULL THEN
        -- Log invalid code event
        PERFORM log_referral_event(
            'code_invalid'::referral_event_type,
            NULL,
            NULL,
            NULL,
            NULL,
            p_referral_code,
            p_ip_address,
            p_user_agent,
            p_device_id,
            jsonb_build_object('reason', 'code_not_found'),
            'Referral code not found'
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid referral code'
        );
    END IF;
    
    -- Check for self-referral
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE id = v_referrer_id 
        AND LOWER(email) = LOWER(p_referee_email)
    ) INTO v_is_self_referral;
    
    IF v_is_self_referral THEN
        -- Log self-referral attempt
        PERFORM log_referral_event(
            'self_referral_blocked'::referral_event_type,
            v_referrer_id,
            v_referrer_id,
            NULL,
            NULL,
            p_referral_code,
            p_ip_address,
            p_user_agent,
            p_device_id,
            jsonb_build_object('referee_email', p_referee_email),
            'Self-referral attempted'
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Self-referrals are not allowed'
        );
    END IF;
    
    -- Create the referral record
    INSERT INTO public.user_referrals (
        referrer_id,
        referee_id,
        referee_email,
        status,
        ip_address,
        device_id,
        metadata
    ) VALUES (
        v_referrer_id,
        NULL, -- Will be updated when referee signs up
        p_referee_email,
        'pending',
        p_ip_address,
        p_device_id,
        jsonb_build_object(
            'user_agent', p_user_agent,
            'created_via', 'process_referral_code_function'
        )
    ) RETURNING id INTO v_referral_id;
    
    -- Log successful validation
    PERFORM log_referral_event(
        'code_validated'::referral_event_type,
        NULL,
        v_referrer_id,
        NULL,
        v_referral_id,
        p_referral_code,
        p_ip_address,
        p_user_agent,
        p_device_id,
        jsonb_build_object('referee_email', p_referee_email)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'referral_id', v_referral_id,
        'referrer_id', v_referrer_id,
        'discount_percentage', 10, -- Default discount
        'reward_amount', 5.00 -- Default reward
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION public.complete_referral IS 'Marks a referral as completed when the referee makes their first payment';
COMMENT ON FUNCTION public.generate_referral_code IS 'Generates a unique 6-character alphanumeric referral code';
COMMENT ON FUNCTION public.generate_user_referral_code IS 'Trigger function to automatically generate referral codes for new users';
COMMENT ON FUNCTION public.log_referral_event IS 'Logs referral system events to the audit table for tracking and analysis';
COMMENT ON FUNCTION public.process_referral_code IS 'Validates and processes a referral code, creating a pending referral record';