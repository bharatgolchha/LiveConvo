-- Remove duplicate transcript entries, keeping only the first occurrence
WITH duplicate_transcripts AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY session_id, content, speaker, start_time_seconds
           ORDER BY created_at ASC
         ) as row_num
  FROM transcripts
)
DELETE FROM transcripts
WHERE id IN (
  SELECT id FROM duplicate_transcripts WHERE row_num > 1
);

-- Show remaining transcript counts per session
SELECT session_id, COUNT(*) as transcript_count
FROM transcripts
GROUP BY session_id
ORDER BY transcript_count DESC;
