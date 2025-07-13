-- Reset the auto-join status for the specific event
UPDATE calendar_events 
SET 
  auto_session_created = false,
  auto_session_id = NULL,
  auto_bot_status = NULL
WHERE id = '9e33e49b-b122-4998-85bc-01e65ee97ff0';

-- Check if it worked
SELECT id, title, auto_session_created, auto_session_id, auto_bot_status 
FROM calendar_events 
WHERE id = '9e33e49b-b122-4998-85bc-01e65ee97ff0';
EOF < /dev/null