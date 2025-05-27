-- Fix users table RLS policy to allow INSERT operations
-- This fixes the "new row violates row-level security policy" error during onboarding

-- Drop the existing policy
DROP POLICY IF EXISTS users_policy ON users;

-- Create separate policies for each operation
CREATE POLICY users_select_policy ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_insert_policy ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY users_update_policy ON users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY users_delete_policy ON users
    FOR DELETE USING (auth.uid() = id);

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Users table RLS policies updated successfully!';
    RAISE NOTICE 'Authenticated users can now create their own user records during onboarding.';
END $$; 