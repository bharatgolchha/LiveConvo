-- Disable RLS on all tables temporarily for debugging
-- WARNING: This removes all security policies - only use in development!

-- Disable RLS on all main tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE guidance DISABLE ROW LEVEL SECURITY;
ALTER TABLE summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_app_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean up
DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;
DROP POLICY IF EXISTS organizations_policy ON organizations;
DROP POLICY IF EXISTS organization_members_policy ON organization_members;
DROP POLICY IF EXISTS organization_invitations_policy ON organization_invitations;
DROP POLICY IF EXISTS sessions_policy ON sessions;
DROP POLICY IF EXISTS documents_policy ON documents;
DROP POLICY IF EXISTS transcripts_policy ON transcripts;
DROP POLICY IF EXISTS guidance_policy ON guidance;
DROP POLICY IF EXISTS summaries_policy ON summaries;
DROP POLICY IF EXISTS templates_policy ON templates;
DROP POLICY IF EXISTS plans_policy ON plans;
DROP POLICY IF EXISTS subscriptions_policy ON subscriptions;
DROP POLICY IF EXISTS usage_records_policy ON usage_records;
DROP POLICY IF EXISTS user_app_sessions_policy ON user_app_sessions;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'All RLS policies have been disabled!';
    RAISE NOTICE 'WARNING: This is for development only - re-enable RLS before production!';
    RAISE NOTICE 'Tables are now accessible without security restrictions.';
END $$; 