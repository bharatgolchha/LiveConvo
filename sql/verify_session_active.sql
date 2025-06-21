-- Verify session is active
SELECT 
    id,
    status,
    recording_started_at,
    user_id,
    organization_id
FROM sessions
WHERE id = '00a5ebd0-df3e-4767-bea8-5b4707cc65ab';