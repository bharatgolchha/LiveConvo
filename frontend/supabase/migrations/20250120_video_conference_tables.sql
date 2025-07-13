-- Migration: Add video conference support tables and columns
-- Date: 2025-01-20
-- Description: Adds support for video conference meetings with Recall.ai integration

-- Create meeting_metadata table for additional meeting-specific data
CREATE TABLE IF NOT EXISTS public.meeting_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  platform VARCHAR(50) NOT NULL, -- zoom, google_meet, teams
  meeting_id VARCHAR(255), -- Platform-specific meeting ID
  host_id VARCHAR(255), -- Platform-specific host ID
  participant_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  meeting_agenda TEXT, -- Structured agenda for the meeting
  scheduled_at TIMESTAMP WITH TIME ZONE, -- When the meeting is scheduled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for meeting_metadata
CREATE INDEX IF NOT EXISTS idx_meeting_metadata_session_id ON meeting_metadata(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_metadata_platform ON meeting_metadata(platform);
CREATE INDEX IF NOT EXISTS idx_meeting_metadata_scheduled_at ON meeting_metadata(scheduled_at);

-- Create smart_notes table for AI-generated categorized notes
CREATE TABLE IF NOT EXISTS public.smart_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  category VARCHAR(100) NOT NULL, -- key_point, action_item, decision, question, insight
  content TEXT NOT NULL,
  importance VARCHAR(20) DEFAULT 'medium', -- high, medium, low
  metadata JSONB DEFAULT '{}', -- Additional metadata (related transcript IDs, etc)
  is_manual BOOLEAN DEFAULT FALSE, -- Whether manually created or AI-generated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for smart_notes
CREATE INDEX IF NOT EXISTS idx_smart_notes_session_id ON smart_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_smart_notes_category ON smart_notes(category);
CREATE INDEX IF NOT EXISTS idx_smart_notes_importance ON smart_notes(importance);
CREATE INDEX IF NOT EXISTS idx_smart_notes_created_at ON smart_notes(created_at DESC);

-- Add RLS policies for meeting_metadata
ALTER TABLE meeting_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting metadata for their sessions"
  ON meeting_metadata FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE user_id = auth.uid() 
      OR organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert meeting metadata for their sessions"
  ON meeting_metadata FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update meeting metadata for their sessions"
  ON meeting_metadata FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for smart_notes
ALTER TABLE smart_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view smart notes for their sessions"
  ON smart_notes FOR SELECT
  USING (
    user_id = auth.uid() 
    OR organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create smart notes for their sessions"
  ON smart_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND session_id IN (
      SELECT id FROM sessions 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own smart notes"
  ON smart_notes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own smart notes"
  ON smart_notes FOR DELETE
  USING (user_id = auth.uid());

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_meeting_metadata_updated_at BEFORE UPDATE ON meeting_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smart_notes_updated_at BEFORE UPDATE ON smart_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE meeting_metadata IS 'Stores additional metadata for video conference meetings';
COMMENT ON TABLE smart_notes IS 'Stores AI-generated and manual notes categorized by type';
COMMENT ON COLUMN smart_notes.category IS 'Type of note: key_point, action_item, decision, question, insight';
COMMENT ON COLUMN smart_notes.importance IS 'Priority level: high, medium, low';
COMMENT ON COLUMN smart_notes.is_manual IS 'Whether the note was manually created by user or AI-generated';