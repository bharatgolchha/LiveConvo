-- Integration settings table
CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('slack', 'hubspot', 'salesforce')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider, organization_id)
);

-- Integration exports log table
CREATE TABLE IF NOT EXISTS integration_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('slack', 'hubspot', 'salesforce')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  export_id TEXT,
  url TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_integration_settings_user_id ON integration_settings(user_id);
CREATE INDEX idx_integration_settings_organization_id ON integration_settings(organization_id);
CREATE INDEX idx_integration_settings_provider ON integration_settings(provider);
CREATE INDEX idx_integration_exports_user_id ON integration_exports(user_id);
CREATE INDEX idx_integration_exports_session_id ON integration_exports(session_id);
CREATE INDEX idx_integration_exports_provider ON integration_exports(provider);
CREATE INDEX idx_integration_exports_created_at ON integration_exports(created_at DESC);

-- RLS Policies for integration_settings
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own integration settings
CREATE POLICY "Users can view their own integration settings"
  ON integration_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integration settings"
  ON integration_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integration settings"
  ON integration_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integration settings"
  ON integration_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for integration_exports
ALTER TABLE integration_exports ENABLE ROW LEVEL SECURITY;

-- Users can only see their own export history
CREATE POLICY "Users can view their own export history"
  ON integration_exports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export logs"
  ON integration_exports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE integration_settings IS 'Stores user integration configurations for external services';
COMMENT ON COLUMN integration_settings.provider IS 'The integration provider (slack, hubspot, salesforce)';
COMMENT ON COLUMN integration_settings.config IS 'Encrypted configuration data for the integration';
COMMENT ON COLUMN integration_settings.is_active IS 'Whether the integration is currently active';

COMMENT ON TABLE integration_exports IS 'Logs all report exports to external integrations';
COMMENT ON COLUMN integration_exports.status IS 'The status of the export (success, failed, pending)';
COMMENT ON COLUMN integration_exports.export_id IS 'External ID returned by the integration provider';
COMMENT ON COLUMN integration_exports.url IS 'URL to view the exported content in the external system';
COMMENT ON COLUMN integration_exports.error IS 'Error message if the export failed';
COMMENT ON COLUMN integration_exports.metadata IS 'Additional metadata about the export';