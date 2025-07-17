-- Allow users to link shared meetings as context for follow-up meetings
-- This migration updates RLS policies on conversation_links table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create links for their sessions" ON conversation_links;
DROP POLICY IF EXISTS "Users can view links for accessible sessions" ON conversation_links;
DROP POLICY IF EXISTS "Users can delete their own links" ON conversation_links;

-- Create new policy: Users can create links for sessions they own
CREATE POLICY "Users can create links for their sessions" ON conversation_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = conversation_links.session_id 
      AND sessions.user_id = auth.uid()
    )
    AND
    -- Can link to sessions they have access to (own or shared)
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = conversation_links.linked_session_id 
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

-- Create new policy: Users can view links for sessions they have access to
CREATE POLICY "Users can view links for accessible sessions" ON conversation_links
  FOR SELECT USING (
    -- Can view if they have access to the main session
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = conversation_links.session_id 
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

-- Create new policy: Users can delete links for sessions they own
CREATE POLICY "Users can delete their own links" ON conversation_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = conversation_links.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can create links for their sessions" ON conversation_links 
  IS 'Allows users to create conversation links for sessions they own, linking to any session they have access to (including shared meetings)';

COMMENT ON POLICY "Users can view links for accessible sessions" ON conversation_links 
  IS 'Allows users to view conversation links for any session they have access to (owned or shared)';

COMMENT ON POLICY "Users can delete their own links" ON conversation_links 
  IS 'Allows users to delete conversation links only for sessions they own';