-- Add personal_context column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_context TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.personal_context IS 'User-defined personal context that will be used across all conversations for personalized AI guidance';