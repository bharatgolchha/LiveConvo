-- Quick SQL to enable auto-join for your user
-- Run this in Supabase SQL Editor

-- First, find your user ID
SELECT id, email FROM users WHERE email = 'your-email@example.com';

-- Then, enable auto-join (replace the user_id with your actual ID)
INSERT INTO calendar_preferences (
  user_id,
  auto_record_enabled,
  auto_join_enabled,
  join_buffer_minutes,
  notify_before_join,
  notification_minutes,
  excluded_keywords,
  included_domains
) VALUES (
  'YOUR-USER-ID-HERE',  -- Replace with your user ID
  true,                 -- auto_record_enabled
  true,                 -- auto_join_enabled
  2,                    -- join_buffer_minutes
  true,                 -- notify_before_join
  5,                    -- notification_minutes
  ARRAY[]::text[],      -- excluded_keywords (empty array)
  ARRAY[]::text[]       -- included_domains (empty array)
)
ON CONFLICT (user_id) 
DO UPDATE SET
  auto_record_enabled = true,
  auto_join_enabled = true,
  join_buffer_minutes = 2;

-- Verify it worked
SELECT * FROM calendar_preferences WHERE user_id = 'YOUR-USER-ID-HERE';