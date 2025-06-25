

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_usage_limit"("p_user_id" "uuid", "p_organization_id" "uuid") RETURNS TABLE("can_record" boolean, "minutes_used" integer, "minutes_limit" integer, "minutes_remaining" integer, "percentage_used" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_minutes_used integer;
    v_minutes_limit integer;
    v_plan_limit integer;
    v_member_limit integer;
    current_month varchar(7);
BEGIN
    -- Get current month
    current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Get usage from cache (default to 0 if not found)
    SELECT COALESCE(total_minutes_used, 0) INTO v_minutes_used
    FROM monthly_usage_cache
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND month_year = current_month;
    
    -- If no usage record exists, set to 0
    IF v_minutes_used IS NULL THEN
        v_minutes_used := 0;
    END IF;
    
    -- Get limits from organization and member settings
    SELECT 
        COALESCE(o.monthly_audio_hours_limit, 10) * 60,  -- Default to 10 hours if NULL
        COALESCE(om.monthly_audio_hours_limit, 0) * 60
    INTO v_plan_limit, v_member_limit
    FROM organizations o
    LEFT JOIN organization_members om ON om.user_id = p_user_id AND om.organization_id = o.id
    WHERE o.id = p_organization_id;
    
    -- If no organization found, use default
    IF v_plan_limit IS NULL THEN
        v_plan_limit := 600;  -- 10 hours default
    END IF;
    
    -- Use the most restrictive limit (but ignore 0 values)
    IF v_member_limit > 0 THEN
        v_minutes_limit := LEAST(v_plan_limit, v_member_limit);
    ELSE
        v_minutes_limit := v_plan_limit;
    END IF;
    
    RETURN QUERY SELECT 
        v_minutes_used < v_minutes_limit AS can_record,
        v_minutes_used AS minutes_used,
        v_minutes_limit AS minutes_limit,
        GREATEST(0, v_minutes_limit - v_minutes_used) AS minutes_remaining,
        CASE 
            WHEN v_minutes_limit > 0 THEN 
                ROUND((v_minutes_used::numeric / v_minutes_limit) * 100, 2)
            ELSE 
                0
        END AS percentage_used;
END;
$$;


ALTER FUNCTION "public"."check_usage_limit"("p_user_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_transcript_sequence"("session_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(sequence_number), 0) + 1 
    INTO next_seq 
    FROM transcripts 
    WHERE session_id = session_uuid;
    
    RETURN next_seq;
END;
$$;


ALTER FUNCTION "public"."get_next_transcript_sequence"("session_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_usage_details"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date" DEFAULT "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone), "p_end_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("date" "date", "minutes_used" integer, "seconds_used" integer, "session_count" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(minute_timestamp) as date,
        COUNT(DISTINCT minute_timestamp)::integer as minutes_used,
        SUM(seconds_recorded)::integer as seconds_used,
        COUNT(DISTINCT session_id)::integer as session_count
    FROM usage_tracking
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND DATE(minute_timestamp) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(minute_timestamp)
    ORDER BY date;
END;
$$;


ALTER FUNCTION "public"."get_usage_details"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_org_member"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_org_id
      AND status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_active_org_member"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_transcript_sequence_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.sequence_number IS NULL THEN
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO NEW.sequence_number
    FROM transcripts
    WHERE session_id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_transcript_sequence_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_member_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_month varchar(7);
BEGIN
    -- Get current month in YYYY-MM format
    current_month := TO_CHAR(NEW.minute_timestamp, 'YYYY-MM');
    
    -- Update organization_members current month usage
    UPDATE organization_members
    SET 
        current_month_minutes_used = CASE 
            WHEN current_month_start IS NULL OR TO_CHAR(current_month_start, 'YYYY-MM') != current_month 
            THEN 1  -- Reset if new month
            ELSE current_month_minutes_used + 1
        END,
        current_month_start = CASE 
            WHEN current_month_start IS NULL OR TO_CHAR(current_month_start, 'YYYY-MM') != current_month 
            THEN DATE_TRUNC('month', NEW.minute_timestamp)::date
            ELSE current_month_start
        END,
        total_audio_hours_used = total_audio_hours_used + (1.0 / 60.0), -- Add 1 minute as fraction of hour
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id 
    AND organization_id = NEW.organization_id;
    
    -- Update or insert monthly usage cache
    INSERT INTO monthly_usage_cache (
        organization_id, 
        user_id, 
        month_year, 
        total_minutes_used,
        total_seconds_used,
        last_updated
    ) VALUES (
        NEW.organization_id,
        NEW.user_id,
        current_month,
        1,
        NEW.seconds_recorded,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (organization_id, user_id, month_year) 
    DO UPDATE SET 
        total_minutes_used = monthly_usage_cache.total_minutes_used + 1,
        total_seconds_used = monthly_usage_cache.total_seconds_used + NEW.seconds_recorded,
        last_updated = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_member_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."beta_waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "company" "text" NOT NULL,
    "use_case" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "beta_waitlist_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'invited'::"text"]))),
    CONSTRAINT "beta_waitlist_use_case_check" CHECK (("use_case" = ANY (ARRAY['sales'::"text", 'consulting'::"text", 'hiring'::"text", 'support'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."beta_waitlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "original_filename" character varying(255) NOT NULL,
    "file_type" character varying(50) NOT NULL,
    "file_size_bytes" integer NOT NULL,
    "file_url" character varying(512),
    "extracted_text" "text",
    "processing_status" character varying(20) DEFAULT 'pending'::character varying,
    "processing_error" "text",
    "embedding_status" character varying(20) DEFAULT 'pending'::character varying,
    "pinecone_vector_id" character varying(255),
    "ocr_confidence_score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guidance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "guidance_type" character varying(20) NOT NULL,
    "priority" integer DEFAULT 1,
    "triggered_by_transcript_id" "uuid",
    "context_snippet" "text",
    "triggered_at_seconds" numeric(10,3),
    "was_displayed" boolean DEFAULT false,
    "was_clicked" boolean DEFAULT false,
    "was_dismissed" boolean DEFAULT false,
    "user_feedback" character varying(20),
    "model_used" character varying(50),
    "prompt_template_id" "uuid",
    "processing_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."guidance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_usage_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month_year" character varying(7) NOT NULL,
    "total_minutes_used" integer DEFAULT 0,
    "total_seconds_used" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "total_minutes_check" CHECK (("total_minutes_used" >= 0)),
    CONSTRAINT "total_seconds_check" CHECK (("total_seconds_used" >= 0))
);


ALTER TABLE "public"."monthly_usage_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invited_by_user_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying NOT NULL,
    "personal_message" "text",
    "invitation_token" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "accepted_by_user_id" "uuid",
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying NOT NULL,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "monthly_audio_hours_limit" integer,
    "max_sessions_per_month" integer,
    "total_sessions_count" integer DEFAULT 0,
    "total_audio_hours_used" numeric(6,2) DEFAULT 0,
    "last_session_at" timestamp with time zone,
    "joined_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "current_month_minutes_used" integer DEFAULT 0,
    "current_month_start" "date"
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "display_name" character varying(255),
    "slug" character varying(100) NOT NULL,
    "description" "text",
    "website_url" character varying(512),
    "contact_email" character varying(255),
    "phone" character varying(50),
    "address_line_1" character varying(255),
    "address_line_2" character varying(255),
    "city" character varying(100),
    "state_province" character varying(100),
    "postal_code" character varying(20),
    "country_code" character varying(2),
    "default_timezone" character varying(50) DEFAULT 'UTC'::character varying,
    "default_language" character varying(10) DEFAULT 'en'::character varying,
    "branding_logo_url" character varying(512),
    "branding_primary_color" character varying(7),
    "tax_id" character varying(100),
    "billing_email" character varying(255),
    "monthly_audio_hours_limit" integer,
    "max_members" integer DEFAULT 10,
    "max_sessions_per_month" integer,
    "is_active" boolean DEFAULT true,
    "is_verified" boolean DEFAULT false,
    "verification_requested_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(50) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "description" "text",
    "plan_type" character varying(20) DEFAULT 'individual'::character varying NOT NULL,
    "price_monthly" numeric(8,2),
    "price_yearly" numeric(8,2),
    "stripe_price_id_monthly" character varying(255),
    "stripe_price_id_yearly" character varying(255),
    "monthly_audio_hours_limit" integer,
    "max_documents_per_session" integer DEFAULT 10,
    "max_file_size_mb" integer DEFAULT 25,
    "max_sessions_per_month" integer,
    "max_organization_members" integer,
    "has_real_time_guidance" boolean DEFAULT true,
    "has_advanced_summaries" boolean DEFAULT false,
    "has_export_options" boolean DEFAULT false,
    "has_email_summaries" boolean DEFAULT false,
    "has_api_access" boolean DEFAULT false,
    "has_custom_templates" boolean DEFAULT false,
    "has_priority_support" boolean DEFAULT false,
    "has_analytics_dashboard" boolean DEFAULT false,
    "has_team_collaboration" boolean DEFAULT false,
    "ai_model_access" "jsonb" DEFAULT '["gpt-4o-mini"]'::"jsonb",
    "max_guidance_requests_per_session" integer DEFAULT 50,
    "summary_generation_priority" integer DEFAULT 3,
    "is_active" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prep_checklist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "prep_checklist_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'done'::"text"])))
);


ALTER TABLE "public"."prep_checklist" OWNER TO "postgres";


COMMENT ON TABLE "public"."prep_checklist" IS 'Checklist items for conversation preparation and task management';



COMMENT ON COLUMN "public"."prep_checklist"."id" IS 'Unique identifier for the checklist item';



COMMENT ON COLUMN "public"."prep_checklist"."session_id" IS 'Foreign key to sessions table';



COMMENT ON COLUMN "public"."prep_checklist"."text" IS 'The checklist item text/description';



COMMENT ON COLUMN "public"."prep_checklist"."status" IS 'Item status: open or done';



COMMENT ON COLUMN "public"."prep_checklist"."created_at" IS 'Timestamp when item was created';



COMMENT ON COLUMN "public"."prep_checklist"."updated_at" IS 'Timestamp when item was last updated';



COMMENT ON COLUMN "public"."prep_checklist"."created_by" IS 'Foreign key to users table - who created the item';



CREATE TABLE IF NOT EXISTS "public"."session_context" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "text_context" "text",
    "context_metadata" "jsonb",
    "processing_status" character varying(20) DEFAULT 'completed'::character varying,
    "processing_error" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."session_context" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_timeline_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_timestamp" timestamp with time zone NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "type" character varying(50) NOT NULL,
    "importance" character varying(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."session_timeline_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "title" character varying(255),
    "conversation_type" character varying(50),
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "selected_template_id" "uuid",
    "audio_file_url" character varying(512),
    "recording_duration_seconds" integer DEFAULT 0,
    "recording_started_at" timestamp with time zone,
    "recording_ended_at" timestamp with time zone,
    "total_words_spoken" integer DEFAULT 0,
    "user_talk_time_seconds" integer DEFAULT 0,
    "silence_periods_count" integer DEFAULT 0,
    "audio_deleted_at" timestamp with time zone,
    "data_retention_days" integer DEFAULT 30,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    "realtime_summary_cache" "jsonb"
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "plan_id" "uuid" NOT NULL,
    "stripe_customer_id" character varying(255),
    "stripe_subscription_id" character varying(255),
    "stripe_price_id" character varying(255),
    "plan_type" character varying(20) NOT NULL,
    "status" character varying(20) NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "monthly_audio_hours_limit" integer,
    "monthly_audio_hours_used" numeric(6,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "canceled_at" timestamp with time zone
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "title" character varying(255),
    "tldr" "text",
    "key_decisions" "jsonb",
    "action_items" "jsonb",
    "follow_up_questions" "jsonb",
    "conversation_highlights" "jsonb",
    "full_transcript" "text",
    "structured_notes" "text",
    "generation_status" character varying(20) DEFAULT 'pending'::character varying,
    "generation_error" "text",
    "model_used" character varying(50),
    "generation_time_seconds" numeric(6,2),
    "export_count" integer DEFAULT 0,
    "last_exported_at" timestamp with time zone,
    "is_marked_done" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level" character varying(10) NOT NULL,
    "logger_name" character varying(100),
    "message" "text" NOT NULL,
    "user_id" "uuid",
    "session_id" "uuid",
    "module" character varying(100),
    "function_name" character varying(100),
    "line_number" integer,
    "exception_traceback" "text",
    "request_id" character varying(100),
    "ip_address" "inet",
    "endpoint" character varying(255),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "organization_id" "uuid",
    "name" character varying(255) NOT NULL,
    "description" "text",
    "conversation_type" character varying(50),
    "is_system_template" boolean DEFAULT false,
    "is_organization_template" boolean DEFAULT false,
    "is_public" boolean DEFAULT false,
    "guidance_prompts" "jsonb",
    "context_instructions" "text",
    "summary_template" "text",
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transcripts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "speaker" character varying(50) DEFAULT 'user'::character varying,
    "confidence_score" numeric(3,2),
    "start_time_seconds" numeric(10,3) NOT NULL,
    "end_time_seconds" numeric(10,3),
    "duration_seconds" numeric(8,3),
    "stt_provider" character varying(50),
    "is_final" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "client_id" character varying(255),
    "sequence_number" integer DEFAULT 1 NOT NULL,
    "client_timestamp" timestamp with time zone,
    "audio_timestamp_ms" integer,
    "session_start_timestamp" timestamp with time zone
);


ALTER TABLE "public"."transcripts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."transcripts"."sequence_number" IS 'Ordered sequence number for transcript lines within a session, used instead of timestamp-based uniqueness';



COMMENT ON COLUMN "public"."transcripts"."client_timestamp" IS 'Client-side timestamp when transcript was generated';



COMMENT ON COLUMN "public"."transcripts"."audio_timestamp_ms" IS 'Precise audio timestamp in milliseconds from start of recording';



COMMENT ON COLUMN "public"."transcripts"."session_start_timestamp" IS 'Session start time for calculating relative timestamps';



CREATE TABLE IF NOT EXISTS "public"."usage_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "session_id" "uuid",
    "usage_type" character varying(50) NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "unit" character varying(20) NOT NULL,
    "billing_period_start" timestamp with time zone,
    "billing_period_end" timestamp with time zone,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."usage_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "minute_timestamp" timestamp with time zone NOT NULL,
    "seconds_recorded" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seconds_recorded_check" CHECK ((("seconds_recorded" >= 0) AND ("seconds_recorded" <= 60)))
);


ALTER TABLE "public"."usage_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_app_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_token" character varying(255),
    "ip_address" "inet",
    "user_agent" "text",
    "country_code" character varying(2),
    "city" character varying(100),
    "started_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "page_views" integer DEFAULT 0,
    "device_type" character varying(20),
    "browser" character varying(50),
    "os" character varying(50)
);


ALTER TABLE "public"."user_app_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "email_verified" boolean DEFAULT false,
    "full_name" character varying(255),
    "timezone" character varying(50) DEFAULT 'UTC'::character varying,
    "password_hash" character varying(255),
    "google_id" character varying(255),
    "last_login_at" timestamp with time zone,
    "has_completed_onboarding" boolean DEFAULT false,
    "has_completed_organization_setup" boolean DEFAULT false,
    "default_microphone_id" character varying(255),
    "default_speaker_id" character varying(255),
    "is_active" boolean DEFAULT true,
    "is_email_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    "current_organization_id" "uuid",
    "personal_context" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."personal_context" IS 'User-defined personal context that will be used across all conversations for personalized AI guidance';



CREATE OR REPLACE VIEW "public"."user_stats" AS
 SELECT "u"."id",
    "u"."email",
    "u"."full_name",
    "om"."organization_id",
    "om"."role",
    "om"."total_sessions_count",
    "om"."total_audio_hours_used",
    "om"."current_month_minutes_used",
    (COALESCE("om"."monthly_audio_hours_limit", "o"."monthly_audio_hours_limit", 0) * 60) AS "monthly_minutes_limit",
    ((("om"."current_month_minutes_used")::numeric / (NULLIF((COALESCE("om"."monthly_audio_hours_limit", "o"."monthly_audio_hours_limit", 0) * 60), 0))::numeric) * (100)::numeric) AS "usage_percentage",
    "om"."last_session_at",
    "u"."created_at",
    "u"."updated_at"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."organization_members" "om" ON ((("u"."id" = "om"."user_id") AND ("u"."current_organization_id" = "om"."organization_id"))))
     LEFT JOIN "public"."organizations" "o" ON (("om"."organization_id" = "o"."id")))
  WHERE ("u"."deleted_at" IS NULL);


ALTER TABLE "public"."user_stats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."beta_waitlist"
    ADD CONSTRAINT "beta_waitlist_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."beta_waitlist"
    ADD CONSTRAINT "beta_waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guidance"
    ADD CONSTRAINT "guidance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_usage_cache"
    ADD CONSTRAINT "monthly_usage_cache_organization_id_user_id_month_year_key" UNIQUE ("organization_id", "user_id", "month_year");



ALTER TABLE ONLY "public"."monthly_usage_cache"
    ADD CONSTRAINT "monthly_usage_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invitation_token_key" UNIQUE ("invitation_token");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_email_status_key" UNIQUE ("organization_id", "email", "status") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prep_checklist"
    ADD CONSTRAINT "prep_checklist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_context"
    ADD CONSTRAINT "session_context_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_timeline_events"
    ADD CONSTRAINT "session_timeline_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."summaries"
    ADD CONSTRAINT "summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transcripts"
    ADD CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_context"
    ADD CONSTRAINT "unique_session_context" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_session_id_minute_timestamp_key" UNIQUE ("session_id", "minute_timestamp");



ALTER TABLE ONLY "public"."user_app_sessions"
    ADD CONSTRAINT "user_app_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_app_sessions"
    ADD CONSTRAINT "user_app_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_google_id_key" UNIQUE ("google_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_beta_waitlist_created_at" ON "public"."beta_waitlist" USING "btree" ("created_at");



CREATE INDEX "idx_beta_waitlist_email" ON "public"."beta_waitlist" USING "btree" ("email");



CREATE INDEX "idx_beta_waitlist_status" ON "public"."beta_waitlist" USING "btree" ("status");



CREATE INDEX "idx_documents_file_type" ON "public"."documents" USING "btree" ("file_type");



CREATE INDEX "idx_documents_organization_id" ON "public"."documents" USING "btree" ("organization_id");



CREATE INDEX "idx_documents_processing_status" ON "public"."documents" USING "btree" ("processing_status");



CREATE INDEX "idx_documents_session_id" ON "public"."documents" USING "btree" ("session_id");



CREATE INDEX "idx_documents_user_id" ON "public"."documents" USING "btree" ("user_id");



CREATE INDEX "idx_guidance_session_id" ON "public"."guidance" USING "btree" ("session_id");



CREATE INDEX "idx_guidance_triggered_at" ON "public"."guidance" USING "btree" ("triggered_at_seconds");



CREATE INDEX "idx_guidance_type" ON "public"."guidance" USING "btree" ("guidance_type");



CREATE INDEX "idx_guidance_was_displayed" ON "public"."guidance" USING "btree" ("was_displayed");



CREATE INDEX "idx_monthly_usage_cache_lookup" ON "public"."monthly_usage_cache" USING "btree" ("organization_id", "user_id", "month_year");



CREATE INDEX "idx_organization_invitations_email" ON "public"."organization_invitations" USING "btree" ("email");



CREATE INDEX "idx_organization_invitations_expires_at" ON "public"."organization_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_organization_invitations_org_id" ON "public"."organization_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_invitations_status" ON "public"."organization_invitations" USING "btree" ("status");



CREATE INDEX "idx_organization_invitations_token" ON "public"."organization_invitations" USING "btree" ("invitation_token");



CREATE INDEX "idx_organization_members_org_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_members_role" ON "public"."organization_members" USING "btree" ("role");



CREATE INDEX "idx_organization_members_status" ON "public"."organization_members" USING "btree" ("status");



CREATE INDEX "idx_organization_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_created_at" ON "public"."organizations" USING "btree" ("created_at");



CREATE INDEX "idx_organizations_is_active" ON "public"."organizations" USING "btree" ("is_active");



CREATE INDEX "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");



CREATE INDEX "idx_plans_is_active" ON "public"."plans" USING "btree" ("is_active");



CREATE INDEX "idx_plans_name" ON "public"."plans" USING "btree" ("name");



CREATE INDEX "idx_plans_sort_order" ON "public"."plans" USING "btree" ("sort_order");



CREATE INDEX "idx_plans_type" ON "public"."plans" USING "btree" ("plan_type");



CREATE INDEX "idx_prep_checklist_created_at" ON "public"."prep_checklist" USING "btree" ("created_at");



CREATE INDEX "idx_prep_checklist_created_by" ON "public"."prep_checklist" USING "btree" ("created_by");



CREATE INDEX "idx_prep_checklist_session_id" ON "public"."prep_checklist" USING "btree" ("session_id");



CREATE INDEX "idx_prep_checklist_status" ON "public"."prep_checklist" USING "btree" ("status");



CREATE INDEX "idx_session_context_organization_id" ON "public"."session_context" USING "btree" ("organization_id");



CREATE INDEX "idx_session_context_processing_status" ON "public"."session_context" USING "btree" ("processing_status");



CREATE INDEX "idx_session_context_session_id" ON "public"."session_context" USING "btree" ("session_id");



CREATE INDEX "idx_session_context_user_id" ON "public"."session_context" USING "btree" ("user_id");



CREATE INDEX "idx_session_timeline_events_event_timestamp" ON "public"."session_timeline_events" USING "btree" ("event_timestamp" DESC);



CREATE INDEX "idx_session_timeline_events_importance" ON "public"."session_timeline_events" USING "btree" ("importance");



CREATE INDEX "idx_session_timeline_events_session_id" ON "public"."session_timeline_events" USING "btree" ("session_id");



CREATE INDEX "idx_session_timeline_events_type" ON "public"."session_timeline_events" USING "btree" ("type");



CREATE INDEX "idx_sessions_conversation_type" ON "public"."sessions" USING "btree" ("conversation_type");



CREATE INDEX "idx_sessions_created_at" ON "public"."sessions" USING "btree" ("created_at");



CREATE INDEX "idx_sessions_organization_id" ON "public"."sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_sessions_status" ON "public"."sessions" USING "btree" ("status");



CREATE INDEX "idx_sessions_user_id" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_current_period" ON "public"."subscriptions" USING "btree" ("current_period_start", "current_period_end");



CREATE INDEX "idx_subscriptions_organization_id" ON "public"."subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_subscriptions_plan_id" ON "public"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe_customer" ON "public"."subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_summaries_marked_done" ON "public"."summaries" USING "btree" ("is_marked_done");



CREATE INDEX "idx_summaries_organization_id" ON "public"."summaries" USING "btree" ("organization_id");



CREATE INDEX "idx_summaries_session_id" ON "public"."summaries" USING "btree" ("session_id");



CREATE INDEX "idx_summaries_status" ON "public"."summaries" USING "btree" ("generation_status");



CREATE INDEX "idx_summaries_user_id" ON "public"."summaries" USING "btree" ("user_id");



CREATE INDEX "idx_system_logs_created_at" ON "public"."system_logs" USING "btree" ("created_at");



CREATE INDEX "idx_system_logs_level" ON "public"."system_logs" USING "btree" ("level");



CREATE INDEX "idx_system_logs_session_id" ON "public"."system_logs" USING "btree" ("session_id");



CREATE INDEX "idx_system_logs_user_id" ON "public"."system_logs" USING "btree" ("user_id");



CREATE INDEX "idx_templates_conversation_type" ON "public"."templates" USING "btree" ("conversation_type");



CREATE INDEX "idx_templates_is_organization" ON "public"."templates" USING "btree" ("is_organization_template");



CREATE INDEX "idx_templates_is_public" ON "public"."templates" USING "btree" ("is_public");



CREATE INDEX "idx_templates_is_system" ON "public"."templates" USING "btree" ("is_system_template");



CREATE INDEX "idx_templates_organization_id" ON "public"."templates" USING "btree" ("organization_id");



CREATE INDEX "idx_templates_user_id" ON "public"."templates" USING "btree" ("user_id");



CREATE INDEX "idx_transcripts_audio_timestamp" ON "public"."transcripts" USING "btree" ("session_id", "audio_timestamp_ms");



CREATE INDEX "idx_transcripts_client_id" ON "public"."transcripts" USING "btree" ("client_id");



CREATE INDEX "idx_transcripts_client_timestamp" ON "public"."transcripts" USING "btree" ("client_timestamp");



CREATE INDEX "idx_transcripts_created_at" ON "public"."transcripts" USING "btree" ("created_at");



CREATE INDEX "idx_transcripts_is_final" ON "public"."transcripts" USING "btree" ("is_final");



CREATE INDEX "idx_transcripts_sequence" ON "public"."transcripts" USING "btree" ("session_id", "sequence_number");



CREATE INDEX "idx_transcripts_session_id" ON "public"."transcripts" USING "btree" ("session_id");



CREATE INDEX "idx_transcripts_session_sequence" ON "public"."transcripts" USING "btree" ("session_id", "sequence_number");



CREATE INDEX "idx_transcripts_start_time" ON "public"."transcripts" USING "btree" ("start_time_seconds");



CREATE INDEX "idx_usage_records_billing_period" ON "public"."usage_records" USING "btree" ("billing_period_start", "billing_period_end");



CREATE INDEX "idx_usage_records_organization_id" ON "public"."usage_records" USING "btree" ("organization_id");



CREATE INDEX "idx_usage_records_session_id" ON "public"."usage_records" USING "btree" ("session_id");



CREATE INDEX "idx_usage_records_subscription_id" ON "public"."usage_records" USING "btree" ("subscription_id");



CREATE INDEX "idx_usage_records_usage_type" ON "public"."usage_records" USING "btree" ("usage_type");



CREATE INDEX "idx_usage_records_user_id" ON "public"."usage_records" USING "btree" ("user_id");



CREATE INDEX "idx_usage_tracking_org_month" ON "public"."usage_tracking" USING "btree" ("organization_id", "minute_timestamp");



CREATE INDEX "idx_usage_tracking_session" ON "public"."usage_tracking" USING "btree" ("session_id");



CREATE INDEX "idx_usage_tracking_user_month" ON "public"."usage_tracking" USING "btree" ("user_id", "minute_timestamp");



CREATE INDEX "idx_user_app_sessions_started_at" ON "public"."user_app_sessions" USING "btree" ("started_at");



CREATE INDEX "idx_user_app_sessions_user_id" ON "public"."user_app_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_users_created_at" ON "public"."users" USING "btree" ("created_at");



CREATE INDEX "idx_users_current_organization" ON "public"."users" USING "btree" ("current_organization_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_google_id" ON "public"."users" USING "btree" ("google_id");



CREATE UNIQUE INDEX "unique_session_sequence" ON "public"."transcripts" USING "btree" ("session_id", "sequence_number");



CREATE OR REPLACE TRIGGER "transcript_sequence_trigger" BEFORE INSERT ON "public"."transcripts" FOR EACH ROW EXECUTE FUNCTION "public"."set_transcript_sequence_number"();



CREATE OR REPLACE TRIGGER "update_beta_waitlist_updated_at" BEFORE UPDATE ON "public"."beta_waitlist" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_guidance_updated_at" BEFORE UPDATE ON "public"."guidance" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_invitations_updated_at" BEFORE UPDATE ON "public"."organization_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_members_updated_at" BEFORE UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_plans_updated_at" BEFORE UPDATE ON "public"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_prep_checklist_updated_at" BEFORE UPDATE ON "public"."prep_checklist" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_session_context_updated_at" BEFORE UPDATE ON "public"."session_context" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_summaries_updated_at" BEFORE UPDATE ON "public"."summaries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_templates_updated_at" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transcripts_updated_at" BEFORE UPDATE ON "public"."transcripts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_usage_stats_trigger" AFTER INSERT ON "public"."usage_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_member_usage"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prep_checklist"
    ADD CONSTRAINT "fk_prep_checklist_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prep_checklist"
    ADD CONSTRAINT "fk_prep_checklist_session_id" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guidance"
    ADD CONSTRAINT "guidance_prompt_template_id_fkey" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."templates"("id");



ALTER TABLE ONLY "public"."guidance"
    ADD CONSTRAINT "guidance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guidance"
    ADD CONSTRAINT "guidance_triggered_by_transcript_id_fkey" FOREIGN KEY ("triggered_by_transcript_id") REFERENCES "public"."transcripts"("id");



ALTER TABLE ONLY "public"."monthly_usage_cache"
    ADD CONSTRAINT "monthly_usage_cache_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_usage_cache"
    ADD CONSTRAINT "monthly_usage_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_context"
    ADD CONSTRAINT "session_context_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_context"
    ADD CONSTRAINT "session_context_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_context"
    ADD CONSTRAINT "session_context_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_timeline_events"
    ADD CONSTRAINT "session_timeline_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_selected_template_id_fkey" FOREIGN KEY ("selected_template_id") REFERENCES "public"."templates"("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."summaries"
    ADD CONSTRAINT "summaries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."summaries"
    ADD CONSTRAINT "summaries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."summaries"
    ADD CONSTRAINT "summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transcripts"
    ADD CONSTRAINT "transcripts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_app_sessions"
    ADD CONSTRAINT "user_app_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_current_organization_id_fkey" FOREIGN KEY ("current_organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



CREATE POLICY "Allow authenticated users to read waitlist" ON "public"."beta_waitlist" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to update waitlist" ON "public"."beta_waitlist" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow public to insert waitlist entries" ON "public"."beta_waitlist" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert own usage tracking" ON "public"."usage_tracking" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own usage tracking" ON "public"."usage_tracking" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own monthly usage" ON "public"."monthly_usage_cache" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own usage tracking" ON "public"."usage_tracking" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "documents_policy" ON "public"."documents" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "guidance_policy" ON "public"."guidance" USING (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))))));



CREATE POLICY "organization_invitations_policy" ON "public"."organization_invitations" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "organization_members_policy" ON "public"."organization_members" USING (("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE (("organization_members_1"."user_id" = "auth"."uid"()) AND (("organization_members_1"."status")::"text" = 'active'::"text")))));



CREATE POLICY "organizations_policy" ON "public"."organizations" USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "session_context_policy" ON "public"."session_context" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "session_timeline_events_policy" ON "public"."session_timeline_events" USING (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))))));



CREATE POLICY "sessions_policy" ON "public"."sessions" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "subscriptions_policy" ON "public"."subscriptions" USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "summaries_policy" ON "public"."summaries" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "templates_policy" ON "public"."templates" USING ((("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))) OR ("user_id" = "auth"."uid"()) OR ("is_public" = true)));



CREATE POLICY "transcripts_policy" ON "public"."transcripts" USING (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))))));



CREATE POLICY "usage_records_policy" ON "public"."usage_records" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND (("organization_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "user_app_sessions_policy" ON "public"."user_app_sessions" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_policy" ON "public"."users" USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_usage_limit"("p_user_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_usage_limit"("p_user_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_usage_limit"("p_user_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_transcript_sequence"("session_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_transcript_sequence"("session_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_transcript_sequence"("session_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_usage_details"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_usage_details"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_usage_details"("p_user_id" "uuid", "p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_org_member"("p_user_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_org_member"("p_user_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_org_member"("p_user_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_transcript_sequence_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_transcript_sequence_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_transcript_sequence_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_member_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_member_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_member_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."beta_waitlist" TO "anon";
GRANT ALL ON TABLE "public"."beta_waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."beta_waitlist" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."guidance" TO "anon";
GRANT ALL ON TABLE "public"."guidance" TO "authenticated";
GRANT ALL ON TABLE "public"."guidance" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_usage_cache" TO "anon";
GRANT ALL ON TABLE "public"."monthly_usage_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_usage_cache" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."prep_checklist" TO "anon";
GRANT ALL ON TABLE "public"."prep_checklist" TO "authenticated";
GRANT ALL ON TABLE "public"."prep_checklist" TO "service_role";



GRANT ALL ON TABLE "public"."session_context" TO "anon";
GRANT ALL ON TABLE "public"."session_context" TO "authenticated";
GRANT ALL ON TABLE "public"."session_context" TO "service_role";



GRANT ALL ON TABLE "public"."session_timeline_events" TO "anon";
GRANT ALL ON TABLE "public"."session_timeline_events" TO "authenticated";
GRANT ALL ON TABLE "public"."session_timeline_events" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."summaries" TO "anon";
GRANT ALL ON TABLE "public"."summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."summaries" TO "service_role";



GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."transcripts" TO "anon";
GRANT ALL ON TABLE "public"."transcripts" TO "authenticated";
GRANT ALL ON TABLE "public"."transcripts" TO "service_role";



GRANT ALL ON TABLE "public"."usage_records" TO "anon";
GRANT ALL ON TABLE "public"."usage_records" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_records" TO "service_role";



GRANT ALL ON TABLE "public"."usage_tracking" TO "anon";
GRANT ALL ON TABLE "public"."usage_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."user_app_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_app_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_app_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."user_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stats" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
