-- Fix RLS policies for usage_tracking table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own usage tracking" ON usage_tracking;
DROP POLICY IF EXISTS "Users can view own usage tracking" ON usage_tracking;

-- Create proper INSERT policy with WITH CHECK
CREATE POLICY "Users can insert own usage tracking" ON usage_tracking
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Keep SELECT policy as is
CREATE POLICY "Users can view own usage tracking" ON usage_tracking
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Also add UPDATE policy for completeness
CREATE POLICY "Users can update own usage tracking" ON usage_tracking
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Check the session status and update if needed
-- Replace with your actual session ID
UPDATE sessions
SET 
    status = 'active',
    recording_started_at = COALESCE(recording_started_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP
WHERE id = '00a5ebd0-df3e-4767-bea8-5b4707cc65ab'
AND status != 'active'
RETURNING id, status, recording_started_at;

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'usage_tracking'
ORDER BY policyname;