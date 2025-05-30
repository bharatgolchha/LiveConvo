-- Supabase Migration: Checklist Feature
-- Created: 2025-01-30
-- Description: Adds prep_checklist table for task management within conversations

-- Create prep_checklist table
CREATE TABLE IF NOT EXISTS prep_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- Add foreign key constraint to sessions table
ALTER TABLE prep_checklist 
ADD CONSTRAINT fk_prep_checklist_session_id 
FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- Add foreign key constraint to users table (for created_by)
ALTER TABLE prep_checklist 
ADD CONSTRAINT fk_prep_checklist_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prep_checklist_session_id ON prep_checklist(session_id);
CREATE INDEX IF NOT EXISTS idx_prep_checklist_created_by ON prep_checklist(created_by);
CREATE INDEX IF NOT EXISTS idx_prep_checklist_status ON prep_checklist(status);
CREATE INDEX IF NOT EXISTS idx_prep_checklist_created_at ON prep_checklist(created_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for automatic updated_at timestamp
CREATE TRIGGER update_prep_checklist_updated_at 
    BEFORE UPDATE ON prep_checklist 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE prep_checklist IS 'Checklist items for conversation preparation and task management';
COMMENT ON COLUMN prep_checklist.id IS 'Unique identifier for the checklist item';
COMMENT ON COLUMN prep_checklist.session_id IS 'Foreign key to sessions table';
COMMENT ON COLUMN prep_checklist.text IS 'The checklist item text/description';
COMMENT ON COLUMN prep_checklist.status IS 'Item status: open or done';
COMMENT ON COLUMN prep_checklist.created_at IS 'Timestamp when item was created';
COMMENT ON COLUMN prep_checklist.updated_at IS 'Timestamp when item was last updated';
COMMENT ON COLUMN prep_checklist.created_by IS 'Foreign key to users table - who created the item'; 