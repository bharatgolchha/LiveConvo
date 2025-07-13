-- Test direct insert into usage_tracking table
-- This will help identify if there's a database-level issue

-- 1. First check if we can select from the table
SELECT COUNT(*) as existing_records FROM usage_tracking;

-- 2. Try a manual insert with your user data
INSERT INTO usage_tracking (
    organization_id,
    user_id,
    session_id,
    minute_timestamp,
    seconds_recorded
) VALUES (
    'b3dcce5e-620b-494c-af9c-1de4cfd72ab7'::uuid,  -- organization_id
    '47fa2a65-5444-40f4-8c3f-136e51e1c192'::uuid,  -- user_id (bgolchha+1)
    '00a5ebd0-df3e-4767-bea8-5b4707cc65ab'::uuid,  -- session_id
    '2025-01-06 10:00:00+00',                       -- minute_timestamp (adjust to current time)
    30                                              -- seconds_recorded
)
ON CONFLICT (session_id, minute_timestamp) DO NOTHING
RETURNING *;

-- 3. Check if the insert worked
SELECT * FROM usage_tracking 
WHERE session_id = '00a5ebd0-df3e-4767-bea8-5b4707cc65ab'
ORDER BY minute_timestamp DESC
LIMIT 5;

-- 4. Check constraints on the table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'usage_tracking'::regclass;

-- 5. Check if all required columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'usage_tracking'
ORDER BY ordinal_position;