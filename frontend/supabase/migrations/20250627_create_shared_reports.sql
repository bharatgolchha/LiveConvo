-- Create shared_reports table for sharing meeting reports with customizable access
CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  shared_tabs TEXT[] NOT NULL DEFAULT '{}',
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX idx_shared_reports_token ON shared_reports(share_token);
CREATE INDEX idx_shared_reports_user_id ON shared_reports(user_id);
CREATE INDEX idx_shared_reports_session_id ON shared_reports(session_id);
CREATE INDEX idx_shared_reports_expires_at ON shared_reports(expires_at);

-- Add RLS policies
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- Users can create shares for their own sessions
CREATE POLICY "Users can create shares for their sessions" ON shared_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = shared_reports.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Users can view their own shares
CREATE POLICY "Users can view their own shares" ON shared_reports
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own shares
CREATE POLICY "Users can update their own shares" ON shared_reports
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares" ON shared_reports
  FOR DELETE USING (user_id = auth.uid());

-- Public can view shared reports by token (no auth required)
-- This will be handled by a separate API endpoint that doesn't require auth

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS void AS $$
BEGIN
  DELETE FROM shared_reports
  WHERE expires_at IS NOT NULL
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired shares (requires pg_cron extension)
-- Run this separately if pg_cron is available:
-- SELECT cron.schedule('cleanup-expired-shares', '0 0 * * *', 'SELECT cleanup_expired_shares();');