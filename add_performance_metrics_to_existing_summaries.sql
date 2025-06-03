-- Check summaries that might be missing performance metrics
SELECT 
    s.id,
    s.session_id,
    s.title,
    s.created_at,
    -- Check if structured_notes contains performance data
    CASE 
        WHEN s.structured_notes IS NULL THEN 'NO_STRUCTURED_NOTES'
        WHEN s.structured_notes::text NOT LIKE '%performance_analysis%' THEN 'MISSING_PERFORMANCE'
        ELSE 'HAS_PERFORMANCE'
    END as performance_status,
    CASE 
        WHEN s.structured_notes IS NULL THEN 'NO_STRUCTURED_NOTES'
        WHEN s.structured_notes::text NOT LIKE '%effectiveness_metrics%' THEN 'MISSING_METRICS'
        ELSE 'HAS_METRICS'
    END as metrics_status
FROM summaries s
ORDER BY s.created_at DESC
LIMIT 20;

-- Example to add basic performance metrics to existing summaries
-- This would need to be customized based on actual data
/*
UPDATE summaries
SET structured_notes = 
    CASE 
        WHEN structured_notes IS NULL THEN 
            '{"performance_analysis":{"strengths":["Clear communication"],"areas_for_improvement":["More structured approach"],"communication_effectiveness":75,"goal_achievement":70},"effectiveness_metrics":{"objective_achievement":70,"communication_clarity":75,"participant_satisfaction":80,"overall_success":75}}'::jsonb
        WHEN structured_notes::text NOT LIKE '%performance_analysis%' THEN
            structured_notes || '{"performance_analysis":{"strengths":["Clear communication"],"areas_for_improvement":["More structured approach"],"communication_effectiveness":75,"goal_achievement":70},"effectiveness_metrics":{"objective_achievement":70,"communication_clarity":75,"participant_satisfaction":80,"overall_success":75}}'::jsonb
        ELSE structured_notes
    END,
    updated_at = NOW()
WHERE id IN (
    SELECT id 
    FROM summaries 
    WHERE structured_notes IS NULL 
       OR structured_notes::text NOT LIKE '%performance_analysis%'
    LIMIT 10
);
*/

-- To regenerate performance metrics for a specific session:
-- 1. Call the /api/sessions/[id]/complete endpoint again
-- 2. Or manually update via the finalize endpoint