-- Add collaboration features to reports
-- This migration adds comments, mentions, collaborative action items, and activity tracking

-- Comments table for report discussions
CREATE TABLE IF NOT EXISTS report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  parent_comment_id UUID REFERENCES report_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  
  -- Context for inline comments
  selected_text TEXT,
  section_id VARCHAR(100), -- which tab/section (overview, insights, actions, etc.)
  element_path VARCHAR(255), -- DOM path for positioning
  
  -- Metadata
  is_resolved BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reactions stored as {emoji: count} e.g. {"👍": 3, "🎯": 1}
  reactions JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_report_comments_session_id ON report_comments(session_id);
CREATE INDEX idx_report_comments_user_id ON report_comments(user_id);
CREATE INDEX idx_report_comments_parent_id ON report_comments(parent_comment_id);
CREATE INDEX idx_report_comments_created_at ON report_comments(created_at DESC);

-- Mentions table for notifications
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES report_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comment_mentions_user_id ON comment_mentions(mentioned_user_id);
CREATE INDEX idx_comment_mentions_is_read ON comment_mentions(is_read);

-- Collaborative action items
CREATE TABLE IF NOT EXISTS collaborative_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  
  -- Source tracking
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('ai_generated', 'comment', 'manual')),
  source_id UUID, -- reference to original comment or AI suggestion
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_collaborative_action_items_session_id ON collaborative_action_items(session_id);
CREATE INDEX idx_collaborative_action_items_assigned_to ON collaborative_action_items(assigned_to);
CREATE INDEX idx_collaborative_action_items_status ON collaborative_action_items(status);
CREATE INDEX idx_collaborative_action_items_due_date ON collaborative_action_items(due_date);

-- Activity tracking
CREATE TABLE IF NOT EXISTS report_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
    'viewed', 'commented', 'resolved_comment', 'mentioned_user',
    'task_created', 'task_assigned', 'task_completed', 'task_updated',
    'report_shared', 'bookmark_added', 'reaction_added'
  )),
  -- Additional context for the activity
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_report_activity_session_id ON report_activity(session_id);
CREATE INDEX idx_report_activity_user_id ON report_activity(user_id);
CREATE INDEX idx_report_activity_type ON report_activity(activity_type);
CREATE INDEX idx_report_activity_created_at ON report_activity(created_at DESC);

-- Report collaborators (extends shared_reports functionality)
CREATE TABLE IF NOT EXISTS report_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_report_id UUID REFERENCES shared_reports(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id), -- null if user not registered yet
  role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('viewer', 'commenter', 'editor')),
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  last_viewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_report_collaborators_session_id ON report_collaborators(session_id);
CREATE INDEX idx_report_collaborators_user_email ON report_collaborators(user_email);
CREATE UNIQUE INDEX idx_report_collaborators_unique ON report_collaborators(session_id, user_email);

-- Bookmarks and highlights
CREATE TABLE IF NOT EXISTS report_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  section_id VARCHAR(100),
  content_snippet TEXT,
  color VARCHAR(20) DEFAULT 'yellow' CHECK (color IN ('yellow', 'green', 'blue', 'pink', 'purple')),
  position_data JSONB, -- Store positioning information
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id, section_id, title)
);

CREATE INDEX idx_report_bookmarks_session_user ON report_bookmarks(session_id, user_id);

-- Enable Row Level Security
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_comments
-- Users can view comments on sessions they have access to
CREATE POLICY "Users can view comments on accessible sessions" ON report_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = report_comments.session_id 
      AND (
        sessions.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM report_collaborators rc
          WHERE rc.session_id = sessions.id 
          AND rc.user_id = auth.uid()
          AND rc.role IN ('viewer', 'commenter', 'editor')
        ) OR
        EXISTS (
          SELECT 1 FROM shared_reports sr
          WHERE sr.session_id = sessions.id
          AND (sr.expires_at IS NULL OR sr.expires_at > NOW())
        )
      )
    )
  );

-- Users can create comments on sessions they can comment on
CREATE POLICY "Users can create comments with proper permissions" ON report_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = report_comments.session_id 
      AND (
        sessions.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM report_collaborators rc
          WHERE rc.session_id = sessions.id 
          AND rc.user_id = auth.uid()
          AND rc.role IN ('commenter', 'editor')
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON report_comments
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON report_comments
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for comment_mentions
-- Users can see mentions of themselves
CREATE POLICY "Users can view their mentions" ON comment_mentions
  FOR SELECT USING (mentioned_user_id = auth.uid());

-- Users can update their own mention read status
CREATE POLICY "Users can mark mentions as read" ON comment_mentions
  FOR UPDATE USING (mentioned_user_id = auth.uid());

-- RLS Policies for collaborative_action_items
-- Similar access pattern as comments
CREATE POLICY "Users can view action items on accessible sessions" ON collaborative_action_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = collaborative_action_items.session_id 
      AND (
        sessions.user_id = auth.uid() OR
        collaborative_action_items.assigned_to = auth.uid() OR
        EXISTS (
          SELECT 1 FROM report_collaborators rc
          WHERE rc.session_id = sessions.id 
          AND rc.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create action items with permissions" ON collaborative_action_items
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = collaborative_action_items.session_id 
      AND (
        sessions.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM report_collaborators rc
          WHERE rc.session_id = sessions.id 
          AND rc.user_id = auth.uid()
          AND rc.role IN ('commenter', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can update action items they created or are assigned to" ON collaborative_action_items
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = collaborative_action_items.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for report_activity
-- Users can view activity on accessible sessions
CREATE POLICY "Users can view activity on accessible sessions" ON report_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = report_activity.session_id 
      AND (
        sessions.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM report_collaborators rc
          WHERE rc.session_id = sessions.id 
          AND rc.user_id = auth.uid()
        )
      )
    )
  );

-- Activity is inserted via backend only
CREATE POLICY "Activity inserted by authenticated users" ON report_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for report_collaborators
-- Session owners can manage collaborators
CREATE POLICY "Session owners can manage collaborators" ON report_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = report_collaborators.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Collaborators can view their own records
CREATE POLICY "Collaborators can view their records" ON report_collaborators
  FOR SELECT USING (
    user_id = auth.uid() OR 
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- RLS Policies for report_bookmarks
-- Users can manage their own bookmarks
CREATE POLICY "Users can manage their bookmarks" ON report_bookmarks
  FOR ALL USING (user_id = auth.uid());

-- Helper functions
-- Function to check if user can access a session
CREATE OR REPLACE FUNCTION can_access_session(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sessions 
    WHERE id = p_session_id 
    AND (
      user_id = p_user_id OR
      EXISTS (
        SELECT 1 FROM report_collaborators rc
        WHERE rc.session_id = p_session_id 
        AND rc.user_id = p_user_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread mention count
CREATE OR REPLACE FUNCTION get_unread_mentions_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM comment_mentions
    WHERE mentioned_user_id = p_user_id
    AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update activity on comment creation
CREATE OR REPLACE FUNCTION log_comment_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO report_activity (session_id, user_id, activity_type, details)
  VALUES (
    NEW.session_id,
    NEW.user_id,
    'commented',
    jsonb_build_object(
      'comment_id', NEW.id,
      'parent_comment_id', NEW.parent_comment_id,
      'section_id', NEW.section_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_comment_activity
  AFTER INSERT ON report_comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_activity();

-- Trigger to update activity on task changes
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO report_activity (session_id, user_id, activity_type, details)
    VALUES (
      NEW.session_id,
      NEW.created_by,
      'task_created',
      jsonb_build_object(
        'task_id', NEW.id,
        'title', NEW.title,
        'assigned_to', NEW.assigned_to
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log task completion
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      INSERT INTO report_activity (session_id, user_id, activity_type, details)
      VALUES (
        NEW.session_id,
        auth.uid(),
        'task_completed',
        jsonb_build_object(
          'task_id', NEW.id,
          'title', NEW.title
        )
      );
    -- Log task assignment changes
    ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO report_activity (session_id, user_id, activity_type, details)
      VALUES (
        NEW.session_id,
        auth.uid(),
        'task_assigned',
        jsonb_build_object(
          'task_id', NEW.id,
          'title', NEW.title,
          'assigned_to', NEW.assigned_to,
          'previous_assignee', OLD.assigned_to
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_task_activity
  AFTER INSERT OR UPDATE ON collaborative_action_items
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for comments
CREATE TRIGGER update_report_comments_updated_at
  BEFORE UPDATE ON report_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for action items
CREATE TRIGGER update_collaborative_action_items_updated_at
  BEFORE UPDATE ON collaborative_action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();