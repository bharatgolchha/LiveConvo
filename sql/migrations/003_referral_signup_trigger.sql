-- Trigger to handle referral tracking on user signup

-- Function to process referral on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_code VARCHAR(10);
    v_referrer_id UUID;
    v_device_id TEXT;
    v_ip_address INET;
BEGIN
    -- Generate referral code for new user if not already set
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_referral_code(NEW.id);
    END IF;
    
    -- Check if user was referred (from auth.users metadata)
    IF auth.uid() IS NOT NULL THEN
        -- Get referral code from user metadata
        SELECT 
            (current_setting('request.jwt.claims', true)::json->>'raw_user_meta_data')::json->>'referral_code'
        INTO v_referral_code;
        
        -- Get device info from metadata if available
        SELECT 
            (current_setting('request.jwt.claims', true)::json->>'raw_user_meta_data')::json->>'device_id'
        INTO v_device_id;
        
        -- Get IP address from current connection
        v_ip_address := inet_client_addr();
        
        IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
            -- Look up referrer
            SELECT id INTO v_referrer_id
            FROM public.users
            WHERE referral_code = UPPER(v_referral_code)
            AND id != NEW.id; -- Prevent self-referral
            
            IF v_referrer_id IS NOT NULL THEN
                -- Update new user with referrer
                NEW.referred_by_user_id := v_referrer_id;
                
                -- Create referral record
                INSERT INTO public.user_referrals (
                    referrer_user_id,
                    referee_user_id,
                    referral_code,
                    status,
                    device_id,
                    ip_address
                ) VALUES (
                    v_referrer_id,
                    NEW.id,
                    UPPER(v_referral_code),
                    'pending',
                    v_device_id,
                    v_ip_address
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_user_created_referral ON public.users;
CREATE TRIGGER on_user_created_referral
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_referral();

-- Alternative function to handle referral via API call after signup
CREATE OR REPLACE FUNCTION public.process_referral_code(
    p_user_id UUID,
    p_referral_code VARCHAR(10),
    p_device_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer_id UUID;
    v_existing_referral UUID;
BEGIN
    -- Check if user already has a referral
    SELECT id INTO v_existing_referral
    FROM public.user_referrals
    WHERE referee_user_id = p_user_id
    AND status != 'expired'
    LIMIT 1;
    
    IF v_existing_referral IS NOT NULL THEN
        RETURN FALSE; -- User already has a referral
    END IF;
    
    -- Look up referrer
    SELECT id INTO v_referrer_id
    FROM public.users
    WHERE referral_code = UPPER(p_referral_code)
    AND id != p_user_id; -- Prevent self-referral
    
    IF v_referrer_id IS NULL THEN
        RETURN FALSE; -- Invalid referral code
    END IF;
    
    -- Check rate limits
    IF NOT public.check_referral_limits(v_referrer_id, p_ip_address, p_device_id) THEN
        -- Log potential fraud attempt
        INSERT INTO public.referral_fraud_checks (
            user_id,
            device_id,
            ip_address,
            check_type,
            flagged
        ) VALUES (
            p_user_id,
            p_device_id,
            p_ip_address,
            'rate_limit',
            TRUE
        );
        RETURN FALSE;
    END IF;
    
    -- Create referral record
    INSERT INTO public.user_referrals (
        referrer_user_id,
        referee_user_id,
        referral_code,
        status,
        device_id,
        ip_address
    ) VALUES (
        v_referrer_id,
        p_user_id,
        UPPER(p_referral_code),
        'pending',
        p_device_id,
        p_ip_address
    );
    
    -- Update user with referrer
    UPDATE public.users
    SET referred_by_user_id = v_referrer_id
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_referral_code TO authenticated;