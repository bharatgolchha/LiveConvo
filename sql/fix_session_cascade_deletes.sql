-- Migration to fix session deletion by adding CASCADE rules to foreign key constraints
-- This aligns the production database with the schema definition

-- Drop and recreate foreign key constraints with ON DELETE CASCADE

-- 1. transcripts table
ALTER TABLE transcripts DROP CONSTRAINT IF EXISTS transcripts_session_id_fkey;
ALTER TABLE transcripts 
    ADD CONSTRAINT transcripts_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 2. guidance table
ALTER TABLE guidance DROP CONSTRAINT IF EXISTS guidance_session_id_fkey;
ALTER TABLE guidance 
    ADD CONSTRAINT guidance_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 3. summaries table
ALTER TABLE summaries DROP CONSTRAINT IF EXISTS summaries_session_id_fkey;
ALTER TABLE summaries 
    ADD CONSTRAINT summaries_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 4. documents table
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_session_id_fkey;
ALTER TABLE documents 
    ADD CONSTRAINT documents_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 5. prep_checklist table
ALTER TABLE prep_checklist DROP CONSTRAINT IF EXISTS fk_prep_checklist_session_id;
ALTER TABLE prep_checklist 
    ADD CONSTRAINT fk_prep_checklist_session_id 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 6. session_context table
ALTER TABLE session_context DROP CONSTRAINT IF EXISTS session_context_session_id_fkey;
ALTER TABLE session_context 
    ADD CONSTRAINT session_context_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 7. session_timeline_events table
ALTER TABLE session_timeline_events DROP CONSTRAINT IF EXISTS session_timeline_events_session_id_fkey;
ALTER TABLE session_timeline_events 
    ADD CONSTRAINT session_timeline_events_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 8. usage_tracking table
ALTER TABLE usage_tracking DROP CONSTRAINT IF EXISTS usage_tracking_session_id_fkey;
ALTER TABLE usage_tracking 
    ADD CONSTRAINT usage_tracking_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 9. bot_usage_tracking table
ALTER TABLE bot_usage_tracking DROP CONSTRAINT IF EXISTS bot_usage_tracking_session_id_fkey;
ALTER TABLE bot_usage_tracking 
    ADD CONSTRAINT bot_usage_tracking_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 10. conversation_links table (both foreign keys)
ALTER TABLE conversation_links DROP CONSTRAINT IF EXISTS conversation_links_session_id_fkey;
ALTER TABLE conversation_links 
    ADD CONSTRAINT conversation_links_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

ALTER TABLE conversation_links DROP CONSTRAINT IF EXISTS conversation_links_linked_session_id_fkey;
ALTER TABLE conversation_links 
    ADD CONSTRAINT conversation_links_linked_session_id_fkey 
    FOREIGN KEY (linked_session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 11. meeting_metadata table
ALTER TABLE meeting_metadata DROP CONSTRAINT IF EXISTS meeting_metadata_session_id_fkey;
ALTER TABLE meeting_metadata 
    ADD CONSTRAINT meeting_metadata_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 12. recall_ai_webhooks table
ALTER TABLE recall_ai_webhooks DROP CONSTRAINT IF EXISTS recall_ai_webhooks_session_id_fkey;
ALTER TABLE recall_ai_webhooks 
    ADD CONSTRAINT recall_ai_webhooks_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- 13. smart_notes table
ALTER TABLE smart_notes DROP CONSTRAINT IF EXISTS smart_notes_session_id_fkey;
ALTER TABLE smart_notes 
    ADD CONSTRAINT smart_notes_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- Note: The following tables should have ON DELETE SET NULL instead of CASCADE:
-- - system_logs (we want to keep logs even if session is deleted)
-- - usage_records (we want to keep usage records for billing)

-- 14. system_logs table
ALTER TABLE system_logs DROP CONSTRAINT IF EXISTS system_logs_session_id_fkey;
ALTER TABLE system_logs 
    ADD CONSTRAINT system_logs_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;

-- 15. usage_records table
ALTER TABLE usage_records DROP CONSTRAINT IF EXISTS usage_records_session_id_fkey;
ALTER TABLE usage_records 
    ADD CONSTRAINT usage_records_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;