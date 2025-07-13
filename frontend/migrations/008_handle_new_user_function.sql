-- Migration: 008_handle_new_user_function.sql
-- Purpose: Create or update the handle_new_user function to ensure consistency
-- This function handles new user setup including preferences and referral codes

-- Drop existing function if it exists to ensure clean state
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_pending_referral RECORD;
BEGIN
    -- Set default values for new users
    IF NEW.total_sessions IS NULL THEN
        NEW.total_sessions = 0;
    END IF;
    
    IF NEW.total_audio_seconds IS NULL THEN
        NEW.total_audio_seconds = 0;
    END IF;
    
    IF NEW.credits_balance IS NULL THEN
        NEW.credits_balance = 0;
    END IF;
    
    -- Generate referral code if not provided
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code = generate_referral_code();
    END IF;
    
    -- Check for pending referrals for this email
    SELECT * INTO v_pending_referral
    FROM public.user_referrals
    WHERE LOWER(referee_email) = LOWER(NEW.email)
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If a pending referral exists, update it with the new user ID
    IF v_pending_referral.id IS NOT NULL THEN
        UPDATE public.user_referrals
        SET 
            referee_id = NEW.id,
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                      jsonb_build_object('signup_completed_at', now())
        WHERE id = v_pending_referral.id;
        
        -- Log the signup completion
        PERFORM log_referral_event(
            'signup_completed'::referral_event_type,
            NEW.id,
            v_pending_referral.referrer_id,
            NEW.id,
            v_pending_referral.id,
            NULL,
            NULL,
            NULL,
            NULL,
            jsonb_build_object(
                'email', NEW.email,
                'referral_id', v_pending_referral.id
            )
        );
        
        -- Update the new user's referred_by field
        NEW.referred_by = v_pending_referral.referrer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for the handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;
CREATE TRIGGER on_auth_user_created
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user IS 'Handles new user setup including default values, referral code generation, and processing pending referrals';