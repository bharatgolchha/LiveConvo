-- Fix RLS policies for shared meeting access to transcripts and summaries
-- This migration updates the RLS policies to allow users with shared access to view transcripts and summaries

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view transcripts for their sessions" ON transcripts;
DROP POLICY IF EXISTS "Users can view summaries for their sessions" ON summaries;

-- Create new policy for transcripts that includes shared access
CREATE POLICY "Users can view transcripts for accessible sessions" ON transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = transcripts.session_id 
      AND (
        sessions.user_id = auth.uid() OR
        sessions.visibility = 'shared' OR
        EXISTS (
          SELECT 1 FROM shared_meetings 
          WHERE shared_meetings.session_id = sessions.id 
          AND shared_meetings.shared_with = auth.uid()
          AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
        ) OR
        EXISTS (
          SELECT 1 FROM organization_shared_meetings osm
          JOIN organization_members om ON om.organization_id = osm.organization_id
          WHERE osm.session_id = sessions.id 
          AND om.user_id = auth.uid()
          AND om.status = 'active'
        )
      )
    )
  );

-- Create new policy for summaries that includes shared access
CREATE POLICY "Users can view summaries for accessible sessions" ON summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = summaries.session_id 
      AND (
        sessions.user_id = auth.uid() OR
        sessions.visibility = 'shared' OR
        EXISTS (
          SELECT 1 FROM shared_meetings 
          WHERE shared_meetings.session_id = sessions.id 
          AND shared_meetings.shared_with = auth.uid()
          AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
        ) OR
        EXISTS (
          SELECT 1 FROM organization_shared_meetings osm
          JOIN organization_members om ON om.organization_id = osm.organization_id
          WHERE osm.session_id = sessions.id 
          AND om.user_id = auth.uid()
          AND om.status = 'active'
        )
      )
    )
  );

-- Also update guidance table RLS if it exists
DROP POLICY IF EXISTS "Users can view guidance for their sessions" ON guidance;

CREATE POLICY "Users can view guidance for accessible sessions" ON guidance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = guidance.session_id 
      AND (
        sessions.user_id = auth.uid() OR
        sessions.visibility = 'shared' OR
        EXISTS (
          SELECT 1 FROM shared_meetings 
          WHERE shared_meetings.session_id = sessions.id 
          AND shared_meetings.shared_with = auth.uid()
          AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
        ) OR
        EXISTS (
          SELECT 1 FROM organization_shared_meetings osm
          JOIN organization_members om ON om.organization_id = osm.organization_id
          WHERE osm.session_id = sessions.id 
          AND om.user_id = auth.uid()
          AND om.status = 'active'
        )
      )
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can view transcripts for accessible sessions" ON transcripts IS 'Allows users to view transcripts for sessions they own or have been shared with them';
COMMENT ON POLICY "Users can view summaries for accessible sessions" ON summaries IS 'Allows users to view summaries for sessions they own or have been shared with them';
COMMENT ON POLICY "Users can view guidance for accessible sessions" ON guidance IS 'Allows users to view guidance for sessions they own or have been shared with them';