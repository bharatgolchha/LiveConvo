-- Create custom_reports table for storing AI-generated custom reports
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    template VARCHAR(100) DEFAULT 'custom',
    generated_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_custom_reports_session_id ON custom_reports(session_id);
CREATE INDEX idx_custom_reports_user_id ON custom_reports(user_id);
CREATE INDEX idx_custom_reports_created_at ON custom_reports(created_at DESC);

-- Enable RLS
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own custom reports
CREATE POLICY "Users can view own custom reports" ON custom_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create custom reports for their own sessions
CREATE POLICY "Users can create custom reports" ON custom_reports
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = custom_reports.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

-- Users can update their own custom reports
CREATE POLICY "Users can update own custom reports" ON custom_reports
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own custom reports
CREATE POLICY "Users can delete own custom reports" ON custom_reports
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE custom_reports IS 'Stores AI-generated custom reports created by users for their sessions';

-- Add comments to columns
COMMENT ON COLUMN custom_reports.id IS 'Unique identifier for the custom report';
COMMENT ON COLUMN custom_reports.session_id IS 'Reference to the session this report is for';
COMMENT ON COLUMN custom_reports.user_id IS 'User who created this report';
COMMENT ON COLUMN custom_reports.prompt IS 'The prompt used to generate this report';
COMMENT ON COLUMN custom_reports.template IS 'Template type used (e.g., executive-brief, technical-documentation)';
COMMENT ON COLUMN custom_reports.generated_content IS 'The AI-generated report content in markdown format';
COMMENT ON COLUMN custom_reports.metadata IS 'Additional metadata about report generation options';
COMMENT ON COLUMN custom_reports.created_at IS 'When the report was created';
COMMENT ON COLUMN custom_reports.updated_at IS 'When the report was last updated';