-- Fix conflicting RLS policies on usage_tracking table

-- First, check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'usage_tracking'
ORDER BY policyname;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Service role can manage all usage tracking" ON usage_tracking;
DROP POLICY IF EXISTS "Users can insert own usage tracking" ON usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage tracking" ON usage_tracking;
DROP POLICY IF EXISTS "Users can view own usage tracking" ON usage_tracking;
DROP POLICY IF EXISTS "Users can view their own usage tracking" ON usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_insert" ON usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_select" ON usage_tracking;

-- Create clean, non-conflicting policies
-- 1. Users can view their own usage tracking
CREATE POLICY "Users can view own usage tracking" ON usage_tracking
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- 2. Users can insert their own usage tracking
CREATE POLICY "Users can insert own usage tracking" ON usage_tracking
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own usage tracking (if needed)
CREATE POLICY "Users can update own usage tracking" ON usage_tracking
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Verify the new policies
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