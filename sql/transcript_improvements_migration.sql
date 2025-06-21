-- Transcript System Improvements Migration
-- Date: 2025-01-28
-- Purpose: Add unique constraint and improve transcript efficiency

-- Step 1: Remove any existing duplicate transcripts
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY session_id, sequence_number 
      ORDER BY created_at DESC
    ) as rn
  FROM transcripts
  WHERE sequence_number IS NOT NULL
)
DELETE FROM transcripts
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Try to add constraint, ignore if exists
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE transcripts 
    ADD CONSTRAINT unique_session_sequence 
    UNIQUE (session_id, sequence_number);
    RAISE NOTICE 'Created unique constraint unique_session_sequence';
  EXCEPTION 
    WHEN duplicate_table THEN 
      RAISE NOTICE 'Constraint unique_session_sequence already exists, skipping';
    WHEN duplicate_object THEN 
      RAISE NOTICE 'Constraint unique_session_sequence already exists, skipping';
  END;
END $$;

-- Step 3: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_transcripts_session_sequence 
ON transcripts(session_id, sequence_number);

-- Step 4: Add index for efficient batching
CREATE INDEX IF NOT EXISTS idx_transcripts_created_at 
ON transcripts(created_at);

-- Step 5: Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS transcript_sequence_trigger ON transcripts;

-- Add trigger to auto-update sequence numbers if not provided
CREATE OR REPLACE FUNCTION set_transcript_sequence_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequence_number IS NULL THEN
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO NEW.sequence_number
    FROM transcripts
    WHERE session_id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transcript_sequence_trigger
BEFORE INSERT ON transcripts
FOR EACH ROW
EXECUTE FUNCTION set_transcript_sequence_number();

-- Step 6: Update existing transcripts to have proper sequence numbers
WITH numbered_transcripts AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY session_id 
      ORDER BY start_time_seconds, created_at
    ) as new_sequence
  FROM transcripts
  WHERE sequence_number IS NULL
)
UPDATE transcripts t
SET sequence_number = nt.new_sequence
FROM numbered_transcripts nt
WHERE t.id = nt.id;

-- Step 7: Check for any remaining issues
DO $$
DECLARE
  duplicate_count INTEGER;
  null_sequence_count INTEGER;
BEGIN
  -- Check for duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT session_id, sequence_number, COUNT(*) as cnt
    FROM transcripts
    WHERE sequence_number IS NOT NULL
    GROUP BY session_id, sequence_number
    HAVING COUNT(*) > 1
  ) dups;
  
  -- Check for null sequence numbers
  SELECT COUNT(*) INTO null_sequence_count
  FROM transcripts
  WHERE sequence_number IS NULL;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Warning: % duplicate sequence numbers found after migration', duplicate_count;
  END IF;
  
  IF null_sequence_count > 0 THEN
    RAISE NOTICE 'Warning: % transcripts still have NULL sequence numbers', null_sequence_count;
  END IF;
  
  IF duplicate_count = 0 AND null_sequence_count = 0 THEN
    RAISE NOTICE 'Migration completed successfully. All transcripts have unique sequence numbers.';
  END IF;
END $$;