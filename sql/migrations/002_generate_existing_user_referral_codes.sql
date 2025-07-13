-- Migration to generate referral codes for existing users

-- Function to update all users with referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_codes_for_existing_users()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_user RECORD;
    v_code VARCHAR(10);
    v_count INTEGER := 0;
BEGIN
    -- Loop through all users without referral codes
    FOR v_user IN 
        SELECT id, email, full_name 
        FROM public.users 
        WHERE referral_code IS NULL
    LOOP
        -- Generate referral code
        v_code := public.generate_referral_code(v_user.id);
        
        -- Update user with referral code
        UPDATE public.users 
        SET referral_code = v_code
        WHERE id = v_user.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Execute the function to generate codes for existing users
SELECT public.generate_referral_codes_for_existing_users() as users_updated;

-- Drop the function after use
DROP FUNCTION public.generate_referral_codes_for_existing_users();