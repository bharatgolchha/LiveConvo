-- Add missing trigger for transcript sequence numbers if not exists

-- Check and create the trigger function
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS transcript_sequence_trigger ON transcripts;

-- Create the trigger
CREATE TRIGGER transcript_sequence_trigger
BEFORE INSERT ON transcripts
FOR EACH ROW
EXECUTE FUNCTION set_transcript_sequence_number();