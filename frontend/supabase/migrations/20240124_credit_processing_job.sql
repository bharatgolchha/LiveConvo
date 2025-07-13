-- Create a function to process scheduled credits
CREATE OR REPLACE FUNCTION process_scheduled_credits()
RETURNS void AS $$
BEGIN
  -- Update any scheduled credits that should now be available
  -- This function should be called periodically (e.g., every hour)
  
  -- Log credits that are becoming available
  INSERT INTO referral_audit_logs (
    event_type,
    user_id,
    referrer_id,
    event_data,
    created_at
  )
  SELECT 
    'credit_granted'::referral_event_type,
    uc.user_id,
    uc.user_id, -- referrer is the user receiving the credit
    jsonb_build_object(
      'credit_id', uc.id,
      'amount', uc.amount,
      'scheduled_date', uc.metadata->>'scheduled_date'
    ),
    NOW()
  FROM user_credits uc
  WHERE uc.type = 'referral_reward'
    AND uc.created_at <= NOW()
    AND uc.created_at > NOW() - INTERVAL '1 hour'
    AND (uc.metadata->>'scheduled_date') IS NOT NULL;
    
  -- Note: Credits are already available based on created_at
  -- The API checks created_at <= NOW() when calculating balance
END;
$$ LANGUAGE plpgsql;

-- Create an index to improve credit queries
CREATE INDEX IF NOT EXISTS idx_user_credits_created_at 
ON user_credits(created_at) 
WHERE type = 'referral_reward';

-- Create an index for efficient balance calculations
CREATE INDEX IF NOT EXISTS idx_user_credits_user_type_created 
ON user_credits(user_id, type, created_at);

-- Add a comment explaining the credit scheduling approach
COMMENT ON COLUMN user_credits.created_at IS 
'For scheduled credits (e.g., referral rewards), this is set to the future date when the credit becomes available. The balance calculation filters for created_at <= NOW()';