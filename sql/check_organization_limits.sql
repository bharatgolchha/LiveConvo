-- Check where the 3-hour limit comes from
SELECT 
    o.id,
    o.name,
    o.monthly_audio_hours_limit as org_hours_limit,
    o.monthly_audio_hours_limit * 60 as org_minutes_limit,
    om.monthly_audio_hours_limit as member_hours_limit,
    om.monthly_audio_hours_limit * 60 as member_minutes_limit,
    CASE 
        WHEN om.monthly_audio_hours_limit > 0 
        THEN LEAST(o.monthly_audio_hours_limit, om.monthly_audio_hours_limit)
        ELSE o.monthly_audio_hours_limit
    END as effective_hours_limit,
    CASE 
        WHEN om.monthly_audio_hours_limit > 0 
        THEN LEAST(o.monthly_audio_hours_limit * 60, om.monthly_audio_hours_limit * 60)
        ELSE o.monthly_audio_hours_limit * 60
    END as effective_minutes_limit
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.user_id = '47fa2a65-5444-40f4-8c3f-136e51e1c192';  -- Your user ID

-- To change the limit, update the organization:
-- UPDATE organizations 
-- SET monthly_audio_hours_limit = 10  -- Change to 10 hours
-- WHERE id = 'YOUR_ORG_ID';