-- Add meeting sharing capabilities
-- This migration creates tables and policies for sharing meetings between users

-- Add visibility column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private' 
  CHECK (visibility IN ('private', 'organization', 'shared'));

-- Create index for visibility queries
CREATE INDEX IF NOT EXISTS idx_sessions_visibility ON sessions(visibility);

-- Create shared_meetings table for individual meeting shares
CREATE TABLE IF NOT EXISTS shared_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id),
  shared_with UUID NOT NULL REFERENCES users(id),
  share_type VARCHAR(20) DEFAULT 'view' CHECK (share_type IN ('view', 'context', 'full')),
  permissions JSONB DEFAULT '{"view": true, "use_as_context": true}'::jsonb,
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id, shared_with)
);

-- Create indexes for performance
CREATE INDEX idx_shared_meetings_session_id ON shared_meetings(session_id);
CREATE INDEX idx_shared_meetings_shared_with ON shared_meetings(shared_with);
CREATE INDEX idx_shared_meetings_shared_by ON shared_meetings(shared_by);
CREATE INDEX idx_shared_meetings_expires_at ON shared_meetings(expires_at) WHERE expires_at IS NOT NULL;

-- Create organization_shared_meetings table for org-wide shares
CREATE TABLE IF NOT EXISTS organization_shared_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  shared_by UUID NOT NULL REFERENCES users(id),
  share_scope VARCHAR(20) DEFAULT 'organization' CHECK (share_scope IN ('organization', 'team', 'role')),
  team_ids UUID[] DEFAULT '{}',
  role_names TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, organization_id)
);

-- Create indexes
CREATE INDEX idx_org_shared_meetings_session_id ON organization_shared_meetings(session_id);
CREATE INDEX idx_org_shared_meetings_organization_id ON organization_shared_meetings(organization_id);
CREATE INDEX idx_org_shared_meetings_shared_by ON organization_shared_meetings(shared_by);

-- Create sharing_activity table for audit trail
CREATE TABLE IF NOT EXISTS sharing_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL CHECK (action IN ('shared', 'unshared', 'accessed', 'permissions_changed')),
  target_user_id UUID REFERENCES users(id),
  target_organization_id UUID REFERENCES organizations(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_sharing_activity_session_id ON sharing_activity(session_id);
CREATE INDEX idx_sharing_activity_user_id ON sharing_activity(user_id);
CREATE INDEX idx_sharing_activity_created_at ON sharing_activity(created_at DESC);

-- Enable Row Level Security
ALTER TABLE shared_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_shared_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_meetings

-- Users can view meetings shared with them
CREATE POLICY "Users can view meetings shared with them" ON shared_meetings
  FOR SELECT USING (
    auth.uid() = shared_with OR 
    auth.uid() = shared_by
  );

-- Users can share their own meetings
CREATE POLICY "Users can share their own meetings" ON shared_meetings
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by AND
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = shared_meetings.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Users can update shares they created
CREATE POLICY "Users can update their shares" ON shared_meetings
  FOR UPDATE USING (auth.uid() = shared_by);

-- Users can delete shares they created
CREATE POLICY "Users can delete their shares" ON shared_meetings
  FOR DELETE USING (auth.uid() = shared_by);

-- RLS Policies for organization_shared_meetings

-- Users can view org shares for their organization
CREATE POLICY "Users can view org shares in their organization" ON organization_shared_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = organization_shared_meetings.organization_id 
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- Users can create org shares for sessions they own
CREATE POLICY "Users can create org shares for their sessions" ON organization_shared_meetings
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by AND
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = organization_shared_meetings.session_id 
      AND sessions.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = organization_shared_meetings.organization_id 
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- Users can update org shares they created
CREATE POLICY "Users can update their org shares" ON organization_shared_meetings
  FOR UPDATE USING (auth.uid() = shared_by);

-- Users can delete org shares they created
CREATE POLICY "Users can delete their org shares" ON organization_shared_meetings
  FOR DELETE USING (auth.uid() = shared_by);

-- RLS Policies for sharing_activity

-- Users can view activity for sessions they own or have access to
CREATE POLICY "Users can view sharing activity for accessible sessions" ON sharing_activity
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = sharing_activity.session_id 
      AND sessions.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM shared_meetings 
      WHERE shared_meetings.session_id = sharing_activity.session_id 
      AND shared_meetings.shared_with = auth.uid()
    )
  );

-- Activity is inserted via authenticated users
CREATE POLICY "Users can log their sharing activities" ON sharing_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update sessions RLS to include shared access
-- First drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can view their sessions and shared sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;

-- Create new policy that includes sharing
CREATE POLICY "Users can view their sessions and shared sessions" ON sessions
  FOR SELECT USING (
    user_id = auth.uid() OR
    visibility = 'shared' OR
    (visibility = 'organization' AND EXISTS (
      SELECT 1 FROM organization_members om1
      WHERE om1.user_id = auth.uid() 
      AND om1.status = 'active'
      AND EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.user_id = sessions.user_id
        AND om2.organization_id = om1.organization_id
        AND om2.status = 'active'
      )
    )) OR
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
  );

-- Helper function to check if user can access a session
CREATE OR REPLACE FUNCTION can_access_session_with_sharing(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sessions 
    WHERE id = p_session_id 
    AND (
      user_id = p_user_id OR
      visibility = 'shared' OR
      (visibility = 'organization' AND EXISTS (
        SELECT 1 FROM organization_members om1
        WHERE om1.user_id = p_user_id 
        AND om1.status = 'active'
        AND EXISTS (
          SELECT 1 FROM organization_members om2
          WHERE om2.user_id = sessions.user_id
          AND om2.organization_id = om1.organization_id
          AND om2.status = 'active'
        )
      )) OR
      EXISTS (
        SELECT 1 FROM shared_meetings 
        WHERE shared_meetings.session_id = p_session_id 
        AND shared_meetings.shared_with = p_user_id
        AND (shared_meetings.expires_at IS NULL OR shared_meetings.expires_at > NOW())
      ) OR
      EXISTS (
        SELECT 1 FROM organization_shared_meetings osm
        JOIN organization_members om ON om.organization_id = osm.organization_id
        WHERE osm.session_id = p_session_id 
        AND om.user_id = p_user_id
        AND om.status = 'active'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_meeting_shares()
RETURNS void AS $$
BEGIN
  DELETE FROM shared_meetings
  WHERE expires_at IS NOT NULL
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to log sharing activity
CREATE OR REPLACE FUNCTION log_sharing_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sharing_activity (session_id, user_id, action, target_user_id, details)
    VALUES (
      NEW.session_id,
      NEW.shared_by,
      'shared',
      NEW.shared_with,
      jsonb_build_object(
        'share_type', NEW.share_type,
        'permissions', NEW.permissions,
        'expires_at', NEW.expires_at
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO sharing_activity (session_id, user_id, action, target_user_id, details)
    VALUES (
      OLD.session_id,
      auth.uid(),
      'unshared',
      OLD.shared_with,
      jsonb_build_object('share_type', OLD.share_type)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_sharing_activity
  AFTER INSERT OR DELETE ON shared_meetings
  FOR EACH ROW
  EXECUTE FUNCTION log_sharing_activity();