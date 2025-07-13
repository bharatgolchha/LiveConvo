-- Add expiry_warning_sent column to user_credits table
ALTER TABLE user_credits
ADD COLUMN IF NOT EXISTS expiry_warning_sent BOOLEAN DEFAULT FALSE;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_credits_expiry_warning 
ON user_credits (expires_at, expiry_warning_sent) 
WHERE expires_at IS NOT NULL AND type = 'referral_reward';