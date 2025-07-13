-- Add Recall bot status tracking fields
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS recall_bot_status TEXT CHECK (recall_bot_status IN ('created', 'joining', 'in_call', 'completed', 'failed', 'timeout')),
ADD COLUMN IF NOT EXISTS recall_bot_error TEXT;

-- Create index for bot status queries
CREATE INDEX IF NOT EXISTS idx_sessions_recall_bot_status ON sessions(recall_bot_status) WHERE recall_bot_status IS NOT NULL;