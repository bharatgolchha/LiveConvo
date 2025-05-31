-- Add unique constraint to prevent duplicate transcript entries
ALTER TABLE transcripts 
ADD CONSTRAINT unique_session_start_time 
UNIQUE (session_id, start_time_seconds);

-- Add client_id column for better duplicate tracking
ALTER TABLE transcripts 
ADD COLUMN client_id VARCHAR(255);

-- Create index for better performance
CREATE INDEX idx_transcripts_client_id ON transcripts(client_id);
