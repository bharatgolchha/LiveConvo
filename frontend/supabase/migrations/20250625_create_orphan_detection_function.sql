-- Create webhook_logs table for tracking webhook events
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  bot_id UUID,
  session_id UUID REFERENCES sessions(id),
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_webhook_logs_bot_id ON webhook_logs(bot_id);
CREATE INDEX idx_webhook_logs_session_id ON webhook_logs(session_id);
CREATE INDEX idx_webhook_logs_processed ON webhook_logs(processed);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);

-- Function to detect and fix orphaned bot recordings
CREATE OR REPLACE FUNCTION auto_complete_orphaned_recordings()
RETURNS TABLE (
  bot_id UUID,
  session_id UUID,
  status TEXT,
  minutes_stuck INTEGER,
  action_taken TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH orphaned_bots AS (
    -- Find bots stuck in recording status for more than 5 minutes
    SELECT 
      b.bot_id,
      b.session_id,
      b.status,
      b.recording_started_at,
      b.updated_at,
      EXTRACT(EPOCH FROM (NOW() - b.updated_at)) / 60 AS minutes_stuck,
      t.last_transcript_time
    FROM bot_usage_tracking b
    LEFT JOIN LATERAL (
      -- Get the last transcript time for this session
      SELECT MAX(created_at) as last_transcript_time
      FROM transcripts
      WHERE session_id = b.session_id
    ) t ON true
    WHERE b.status = 'recording'
      AND b.updated_at < NOW() - INTERVAL '5 minutes'
  ),
  updated_bots AS (
    -- Update orphaned bots
    UPDATE bot_usage_tracking b
    SET 
      status = 'completed',
      recording_ended_at = COALESCE(
        -- Use last transcript time if available
        (SELECT o.last_transcript_time FROM orphaned_bots o WHERE o.bot_id = b.bot_id),
        -- Otherwise use updated_at + 1 minute
        b.updated_at + INTERVAL '1 minute'
      ),
      total_recording_seconds = CASE 
        WHEN b.recording_started_at IS NOT NULL THEN
          EXTRACT(EPOCH FROM (
            COALESCE(
              (SELECT o.last_transcript_time FROM orphaned_bots o WHERE o.bot_id = b.bot_id),
              b.updated_at + INTERVAL '1 minute'
            ) - b.recording_started_at
          ))::INTEGER
        ELSE 0
      END,
      billable_minutes = CASE 
        WHEN b.recording_started_at IS NOT NULL THEN
          CEIL(
            EXTRACT(EPOCH FROM (
              COALESCE(
                (SELECT o.last_transcript_time FROM orphaned_bots o WHERE o.bot_id = b.bot_id),
                b.updated_at + INTERVAL '1 minute'
              ) - b.recording_started_at
            )) / 60
          )::INTEGER
        ELSE 0
      END,
      updated_at = NOW()
    FROM orphaned_bots o
    WHERE b.bot_id = o.bot_id
      -- Only update if no activity for 10+ minutes
      AND (o.last_transcript_time IS NULL OR o.last_transcript_time < NOW() - INTERVAL '10 minutes')
    RETURNING b.bot_id, b.session_id, b.status, b.billable_minutes
  )
  -- Return results
  SELECT 
    o.bot_id,
    o.session_id,
    o.status,
    o.minutes_stuck::INTEGER,
    CASE 
      WHEN u.bot_id IS NOT NULL THEN 'completed'
      ELSE 'skipped - recent activity'
    END as action_taken
  FROM orphaned_bots o
  LEFT JOIN updated_bots u ON o.bot_id = u.bot_id;
  
  -- Also update associated sessions
  UPDATE sessions s
  SET 
    status = 'completed',
    recall_bot_status = 'completed',
    recording_ended_at = b.recording_ended_at,
    recording_duration_seconds = b.total_recording_seconds,
    bot_recording_minutes = b.billable_minutes,
    bot_billable_amount = (b.billable_minutes * 0.10),
    updated_at = NOW()
  FROM bot_usage_tracking b
  WHERE s.id = b.session_id
    AND b.bot_id IN (SELECT bot_id FROM updated_bots)
    AND s.status != 'completed';
    
END;
$$;

-- Function to get bot status summary
CREATE OR REPLACE FUNCTION get_bot_status_summary()
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  oldest_updated_at TIMESTAMPTZ,
  newest_updated_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT 
    status,
    COUNT(*) as count,
    MIN(updated_at) as oldest_updated_at,
    MAX(updated_at) as newest_updated_at
  FROM bot_usage_tracking
  GROUP BY status
  ORDER BY count DESC;
$$;

-- Function to check webhook health
CREATE OR REPLACE FUNCTION check_webhook_health(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
  event_type TEXT,
  total_count BIGINT,
  processed_count BIGINT,
  failed_count BIGINT,
  avg_processing_time_ms NUMERIC,
  success_rate NUMERIC
)
LANGUAGE sql
AS $$
  SELECT 
    event_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE processed = true) as processed_count,
    COUNT(*) FILTER (WHERE error_message IS NOT NULL) as failed_count,
    AVG(processing_time_ms) as avg_processing_time_ms,
    ROUND(
      COUNT(*) FILTER (WHERE processed = true)::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100, 
      2
    ) as success_rate
  FROM webhook_logs
  WHERE created_at > NOW() - INTERVAL '1 hour' * hours_back
  GROUP BY event_type
  ORDER BY total_count DESC;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auto_complete_orphaned_recordings() TO service_role;
GRANT EXECUTE ON FUNCTION get_bot_status_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION check_webhook_health(INTEGER) TO authenticated;