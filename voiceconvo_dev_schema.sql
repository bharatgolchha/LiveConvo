-- VoiceConvo Dev Database Schema Dump
-- Generated from Supabase project: ucvfgfbjcrxbzppwjpuu
-- Date: 2025-01-03

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Create tables
CREATE TABLE IF NOT EXISTS active_user_subscriptions (
    id uuid,
    organization_id uuid,
    user_id uuid,
    plan_id uuid,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    stripe_price_id character varying(255),
    plan_type character varying(20),
    status character varying(20),
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    monthly_audio_hours_used numeric(6,2),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    canceled_at timestamp with time zone,
    plan_name character varying(50),
    plan_display_name character varying(100),
    price_monthly numeric(8,2),
    price_yearly numeric(8,2),
    plan_audio_hours_limit integer,
    max_sessions_per_month integer,
    has_real_time_guidance boolean,
    has_advanced_summaries boolean,
    has_export_options boolean
);

CREATE TABLE IF NOT EXISTS beta_waitlist (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    company text NOT NULL,
    use_case text NOT NULL,
    status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    referral_source text,
    interest_level text,
    approved_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS bot_recordings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    bot_id uuid NOT NULL,
    recording_id uuid NOT NULL,
    recording_url text,
    recording_status character varying(50),
    recording_expires_at timestamp with time zone,
    duration_seconds integer,
    bot_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_usage_tracking (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bot_id text NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    recording_started_at timestamp with time zone,
    recording_ended_at timestamp with time zone,
    total_recording_seconds integer DEFAULT 0,
    billable_minutes integer DEFAULT 0,
    status text DEFAULT 'recording'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_auto_join_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    calendar_event_id uuid NOT NULL,
    session_id uuid,
    bot_id text,
    action text NOT NULL,
    status text NOT NULL,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_connections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    organization_id uuid,
    provider text NOT NULL,
    recall_calendar_id text NOT NULL,
    oauth_refresh_token text NOT NULL,
    email text NOT NULL,
    display_name text,
    is_active boolean DEFAULT true,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    calendar_connection_id uuid,
    external_event_id text NOT NULL,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    meeting_url text,
    attendees jsonb DEFAULT '[]'::jsonb,
    location text,
    organizer_email text,
    is_organizer boolean DEFAULT false,
    bot_scheduled boolean DEFAULT false,
    bot_id text,
    session_id uuid,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    auto_session_created boolean DEFAULT false,
    auto_session_id uuid,
    auto_bot_status text
);

CREATE TABLE IF NOT EXISTS calendar_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    auto_join_enabled boolean DEFAULT false,
    join_buffer_minutes integer DEFAULT 2,
    auto_record_enabled boolean DEFAULT false,
    notify_before_join boolean DEFAULT true,
    notification_minutes integer DEFAULT 5,
    excluded_keywords text[] DEFAULT '{}'::text[],
    included_domains text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendar_webhooks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    calendar_connection_id uuid,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collaborative_action_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    created_by uuid NOT NULL,
    assigned_to uuid,
    source_type character varying(50) NOT NULL,
    source_id uuid,
    title text NOT NULL,
    description text,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(50) DEFAULT 'pending'::character varying,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    completed_by uuid
);

CREATE TABLE IF NOT EXISTS comment_mentions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    comment_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_links (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    linked_session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    original_filename character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_size_bytes integer NOT NULL,
    file_url character varying(512),
    extracted_text text,
    processing_status character varying(20) DEFAULT 'pending'::character varying,
    processing_error text,
    embedding_status character varying(20) DEFAULT 'pending'::character varying,
    pinecone_vector_id character varying(255),
    ocr_confidence_score numeric(3,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS guidance (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    content text NOT NULL,
    guidance_type character varying(20) NOT NULL,
    priority integer DEFAULT 1,
    triggered_by_transcript_id uuid,
    context_snippet text,
    triggered_at_seconds numeric(10,3),
    was_displayed boolean DEFAULT false,
    was_clicked boolean DEFAULT false,
    was_dismissed boolean DEFAULT false,
    user_feedback character varying(20),
    model_used character varying(50),
    prompt_template_id uuid,
    processing_time_ms integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_metadata (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    platform character varying(50) NOT NULL,
    meeting_id character varying(255),
    host_id character varying(255),
    participant_count integer DEFAULT 0,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    meeting_agenda text,
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    calendar_event_id uuid,
    session_id uuid,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_url text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_usage_cache (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    month_year character varying(7) NOT NULL,
    total_minutes_used integer DEFAULT 0,
    total_seconds_used integer DEFAULT 0,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    invited_by_user_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(20) NOT NULL DEFAULT 'member'::character varying,
    personal_message text,
    invitation_token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    accepted_by_user_id uuid,
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) NOT NULL DEFAULT 'member'::character varying,
    permissions jsonb DEFAULT '[]'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    monthly_audio_hours_limit integer,
    max_sessions_per_month integer,
    total_sessions_count integer DEFAULT 0,
    total_audio_hours_used numeric(6,2) DEFAULT 0,
    last_session_at timestamp with time zone,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    current_month_minutes_used integer DEFAULT 0,
    current_month_start date
);

CREATE TABLE IF NOT EXISTS organizations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    display_name character varying(255),
    slug character varying(100) NOT NULL,
    description text,
    website_url character varying(512),
    contact_email character varying(255),
    phone character varying(50),
    address_line_1 character varying(255),
    address_line_2 character varying(255),
    city character varying(100),
    state_province character varying(100),
    postal_code character varying(20),
    country_code character varying(2),
    default_timezone character varying(50) DEFAULT 'UTC'::character varying,
    default_language character varying(10) DEFAULT 'en'::character varying,
    branding_logo_url character varying(512),
    branding_primary_color character varying(7),
    tax_id character varying(100),
    billing_email character varying(255),
    monthly_audio_hours_limit integer,
    max_members integer DEFAULT 10,
    max_sessions_per_month integer,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    verification_requested_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS plans (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    plan_type character varying(20) NOT NULL DEFAULT 'individual'::character varying,
    price_monthly numeric(8,2),
    price_yearly numeric(8,2),
    stripe_price_id_monthly character varying(255),
    stripe_price_id_yearly character varying(255),
    monthly_audio_hours_limit integer,
    max_documents_per_session integer DEFAULT 10,
    max_file_size_mb integer DEFAULT 25,
    max_sessions_per_month integer,
    max_organization_members integer,
    has_real_time_guidance boolean DEFAULT true,
    has_advanced_summaries boolean DEFAULT false,
    has_export_options boolean DEFAULT false,
    has_email_summaries boolean DEFAULT false,
    has_api_access boolean DEFAULT false,
    has_custom_templates boolean DEFAULT false,
    has_priority_support boolean DEFAULT false,
    has_analytics_dashboard boolean DEFAULT false,
    has_team_collaboration boolean DEFAULT false,
    ai_model_access jsonb DEFAULT '["gpt-4o-mini"]'::jsonb,
    max_guidance_requests_per_session integer DEFAULT 50,
    summary_generation_priority integer DEFAULT 3,
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    monthly_audio_minutes_limit integer,
    monthly_bot_minutes_limit integer
);

CREATE TABLE IF NOT EXISTS prep_checklist (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    text text NOT NULL,
    status text NOT NULL DEFAULT 'open'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS recall_ai_webhooks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid,
    bot_id uuid NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_activity (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid,
    activity_type character varying(50) NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    guest_id text,
    guest_name text
);

CREATE TABLE IF NOT EXISTS report_bookmarks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    section_id character varying(100),
    content_snippet text,
    color character varying(20) DEFAULT 'yellow'::character varying,
    position_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_collaborators (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    shared_report_id uuid,
    session_id uuid NOT NULL,
    user_email character varying(255) NOT NULL,
    user_id uuid,
    role character varying(50) DEFAULT 'viewer'::character varying,
    invited_by uuid NOT NULL,
    invited_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    last_viewed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS report_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid,
    parent_comment_id uuid,
    content text NOT NULL,
    selected_text text,
    section_id character varying(100),
    element_path character varying(255),
    is_resolved boolean DEFAULT false,
    is_edited boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reactions jsonb DEFAULT '{}'::jsonb,
    guest_id text,
    guest_name text,
    is_guest boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS session_context (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    text_context text,
    context_metadata jsonb,
    processing_status character varying(20) DEFAULT 'completed'::character varying,
    processing_error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_timeline_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    event_timestamp timestamp with time zone NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    importance character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    title character varying(255),
    conversation_type character varying(50),
    status character varying(20) DEFAULT 'draft'::character varying,
    selected_template_id uuid,
    audio_file_url character varying(512),
    recording_duration_seconds integer DEFAULT 0,
    recording_started_at timestamp with time zone,
    recording_ended_at timestamp with time zone,
    total_words_spoken integer DEFAULT 0,
    user_talk_time_seconds integer DEFAULT 0,
    silence_periods_count integer DEFAULT 0,
    audio_deleted_at timestamp with time zone,
    data_retention_days integer DEFAULT 30,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    realtime_summary_cache jsonb,
    finalized_at timestamp with time zone,
    participant_me character varying(255),
    participant_them character varying(255),
    meeting_url text,
    meeting_platform text,
    recall_bot_id uuid,
    recall_recording_id uuid,
    transcription_provider text DEFAULT 'deepgram'::text,
    recall_bot_status text,
    recall_bot_error text,
    bot_recording_minutes integer DEFAULT 0,
    bot_billable_amount numeric(10,2) DEFAULT 0.00,
    realtime_summary_last_processed_index integer DEFAULT '-1'::integer,
    recall_sdk_upload_id text,
    recording_type text DEFAULT 'local'::text,
    recall_recording_url text,
    recall_recording_status character varying(50),
    recall_recording_expires_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS shared_reports (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    share_token character varying(255) NOT NULL,
    shared_tabs text[] NOT NULL DEFAULT '{}'::text[],
    message text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    accessed_count integer DEFAULT 0,
    last_accessed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS smart_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    category character varying(100) NOT NULL,
    content text NOT NULL,
    importance character varying(20) DEFAULT 'medium'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_manual boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    organization_id uuid,
    subscription_id uuid,
    event_type text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid,
    user_id uuid,
    plan_id uuid NOT NULL,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    stripe_price_id character varying(255),
    plan_type character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    monthly_audio_hours_limit integer,
    monthly_audio_hours_used numeric(6,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    canceled_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS summaries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    title character varying(255),
    tldr text,
    key_decisions jsonb,
    action_items jsonb,
    follow_up_questions jsonb,
    conversation_highlights jsonb,
    full_transcript text,
    structured_notes text,
    generation_status character varying(20) DEFAULT 'pending'::character varying,
    generation_error text,
    model_used character varying(50),
    generation_time_seconds numeric(6,2),
    export_count integer DEFAULT 0,
    last_exported_at timestamp with time zone,
    is_marked_done boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    memory_json jsonb
);

CREATE TABLE IF NOT EXISTS system_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    level character varying(10) NOT NULL,
    logger_name character varying(100),
    message text NOT NULL,
    user_id uuid,
    session_id uuid,
    module character varying(100),
    function_name character varying(100),
    line_number integer,
    exception_traceback text,
    request_id character varying(100),
    ip_address inet,
    endpoint character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    organization_id uuid,
    name character varying(255) NOT NULL,
    description text,
    conversation_type character varying(50),
    is_system_template boolean DEFAULT false,
    is_organization_template boolean DEFAULT false,
    is_public boolean DEFAULT false,
    guidance_prompts jsonb,
    context_instructions text,
    summary_template text,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS transcripts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    content text NOT NULL,
    speaker character varying(50) DEFAULT 'user'::character varying,
    confidence_score numeric(3,2),
    start_time_seconds numeric(10,3) NOT NULL,
    stt_provider character varying(50),
    is_final boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    client_id character varying(255),
    sequence_number integer NOT NULL DEFAULT 1,
    is_owner boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS usage_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    subscription_id uuid,
    session_id uuid,
    usage_type character varying(50) NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit character varying(20) NOT NULL,
    billing_period_start timestamp with time zone,
    billing_period_end timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_tracking (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid NOT NULL,
    minute_timestamp timestamp with time zone NOT NULL,
    seconds_recorded integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    source text DEFAULT 'browser_recording'::text,
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS user_app_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    session_token character varying(255),
    ip_address inet,
    user_agent text,
    country_code character varying(2),
    city character varying(100),
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ended_at timestamp with time zone,
    duration_seconds integer,
    page_views integer DEFAULT 0,
    device_type character varying(20),
    browser character varying(50),
    os character varying(50)
);

CREATE TABLE IF NOT EXISTS user_stats (
    id uuid,
    email character varying(255),
    full_name character varying(255),
    organization_id uuid,
    role character varying(20),
    total_sessions_count integer,
    total_audio_hours_used numeric(6,2),
    current_month_minutes_used integer,
    monthly_minutes_limit integer,
    usage_percentage numeric,
    last_session_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email character varying(255) NOT NULL,
    email_verified boolean DEFAULT false,
    full_name character varying(255),
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    password_hash character varying(255),
    google_id character varying(255),
    last_login_at timestamp with time zone,
    has_completed_onboarding boolean DEFAULT false,
    has_completed_organization_setup boolean DEFAULT false,
    default_microphone_id character varying(255),
    default_speaker_id character varying(255),
    is_active boolean DEFAULT true,
    is_email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    current_organization_id uuid,
    personal_context text,
    is_admin boolean NOT NULL DEFAULT false,
    stripe_customer_id character varying(255),
    use_case character varying(50),
    acquisition_source character varying(50),
    onboarding_completed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS webhook_dead_letter_queue (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    original_webhook_id uuid,
    webhook_type character varying(100) NOT NULL,
    event_type character varying(100) NOT NULL,
    url text NOT NULL,
    payload jsonb NOT NULL,
    retry_count integer NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_retry_queue (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    webhook_type character varying(100) NOT NULL,
    event_type character varying(100) NOT NULL,
    url text NOT NULL,
    payload jsonb NOT NULL,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    last_error text,
    next_retry_at timestamp with time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add primary keys
ALTER TABLE beta_waitlist ADD CONSTRAINT beta_waitlist_pkey PRIMARY KEY (id);
ALTER TABLE bot_recordings ADD CONSTRAINT bot_recordings_pkey PRIMARY KEY (id);
ALTER TABLE bot_usage_tracking ADD CONSTRAINT bot_usage_tracking_pkey PRIMARY KEY (id);
ALTER TABLE calendar_auto_join_logs ADD CONSTRAINT calendar_auto_join_logs_pkey PRIMARY KEY (id);
ALTER TABLE calendar_connections ADD CONSTRAINT calendar_connections_pkey PRIMARY KEY (id);
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);
ALTER TABLE calendar_preferences ADD CONSTRAINT calendar_preferences_pkey PRIMARY KEY (id);
ALTER TABLE calendar_webhooks ADD CONSTRAINT calendar_webhooks_pkey PRIMARY KEY (id);
ALTER TABLE collaborative_action_items ADD CONSTRAINT collaborative_action_items_pkey PRIMARY KEY (id);
ALTER TABLE comment_mentions ADD CONSTRAINT comment_mentions_pkey PRIMARY KEY (id);
ALTER TABLE conversation_links ADD CONSTRAINT conversation_links_pkey PRIMARY KEY (id);
ALTER TABLE documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
ALTER TABLE guidance ADD CONSTRAINT guidance_pkey PRIMARY KEY (id);
ALTER TABLE meeting_metadata ADD CONSTRAINT meeting_metadata_pkey PRIMARY KEY (id);
ALTER TABLE meeting_notifications ADD CONSTRAINT meeting_notifications_pkey PRIMARY KEY (id);
ALTER TABLE monthly_usage_cache ADD CONSTRAINT monthly_usage_cache_pkey PRIMARY KEY (id);
ALTER TABLE organization_invitations ADD CONSTRAINT organization_invitations_pkey PRIMARY KEY (id);
ALTER TABLE organization_members ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);
ALTER TABLE organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);
ALTER TABLE plans ADD CONSTRAINT plans_pkey PRIMARY KEY (id);
ALTER TABLE prep_checklist ADD CONSTRAINT prep_checklist_pkey PRIMARY KEY (id);
ALTER TABLE recall_ai_webhooks ADD CONSTRAINT recall_ai_webhooks_pkey PRIMARY KEY (id);
ALTER TABLE report_activity ADD CONSTRAINT report_activity_pkey PRIMARY KEY (id);
ALTER TABLE report_bookmarks ADD CONSTRAINT report_bookmarks_pkey PRIMARY KEY (id);
ALTER TABLE report_collaborators ADD CONSTRAINT report_collaborators_pkey PRIMARY KEY (id);
ALTER TABLE report_comments ADD CONSTRAINT report_comments_pkey PRIMARY KEY (id);
ALTER TABLE session_context ADD CONSTRAINT session_context_pkey PRIMARY KEY (id);
ALTER TABLE session_timeline_events ADD CONSTRAINT session_timeline_events_pkey PRIMARY KEY (id);
ALTER TABLE sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
ALTER TABLE shared_reports ADD CONSTRAINT shared_reports_pkey PRIMARY KEY (id);
ALTER TABLE smart_notes ADD CONSTRAINT smart_notes_pkey PRIMARY KEY (id);
ALTER TABLE subscription_events ADD CONSTRAINT subscription_events_pkey PRIMARY KEY (id);
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE summaries ADD CONSTRAINT summaries_pkey PRIMARY KEY (id);
ALTER TABLE system_logs ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);
ALTER TABLE system_settings ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);
ALTER TABLE templates ADD CONSTRAINT templates_pkey PRIMARY KEY (id);
ALTER TABLE transcripts ADD CONSTRAINT transcripts_pkey PRIMARY KEY (id);
ALTER TABLE usage_records ADD CONSTRAINT usage_records_pkey PRIMARY KEY (id);
ALTER TABLE usage_tracking ADD CONSTRAINT usage_tracking_pkey PRIMARY KEY (id);
ALTER TABLE user_app_sessions ADD CONSTRAINT user_app_sessions_pkey PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE webhook_dead_letter_queue ADD CONSTRAINT webhook_dead_letter_queue_pkey PRIMARY KEY (id);
ALTER TABLE webhook_retry_queue ADD CONSTRAINT webhook_retry_queue_pkey PRIMARY KEY (id);

-- Add unique constraints
ALTER TABLE beta_waitlist ADD CONSTRAINT beta_waitlist_email_key UNIQUE (email);
ALTER TABLE bot_recordings ADD CONSTRAINT bot_recordings_session_id_bot_id_recording_id_key UNIQUE (session_id, bot_id, recording_id);
ALTER TABLE bot_usage_tracking ADD CONSTRAINT bot_usage_tracking_bot_id_key UNIQUE (bot_id);
ALTER TABLE calendar_connections ADD CONSTRAINT calendar_connections_recall_calendar_id_key UNIQUE (recall_calendar_id);
ALTER TABLE calendar_connections ADD CONSTRAINT calendar_connections_user_id_provider_email_key UNIQUE (user_id, provider, email);
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_calendar_connection_id_external_event_id_key UNIQUE (calendar_connection_id, external_event_id);
ALTER TABLE calendar_preferences ADD CONSTRAINT calendar_preferences_user_id_key UNIQUE (user_id);
ALTER TABLE conversation_links ADD CONSTRAINT conversation_links_unique UNIQUE (session_id, linked_session_id);
ALTER TABLE monthly_usage_cache ADD CONSTRAINT monthly_usage_cache_organization_id_user_id_month_year_key UNIQUE (organization_id, user_id, month_year);
ALTER TABLE monthly_usage_cache ADD CONSTRAINT monthly_usage_cache_unique UNIQUE (organization_id, user_id, month_year);
ALTER TABLE organization_invitations ADD CONSTRAINT organization_invitations_invitation_token_key UNIQUE (invitation_token);
ALTER TABLE organization_invitations ADD CONSTRAINT organization_invitations_organization_id_email_status_key UNIQUE (organization_id, email, status);
ALTER TABLE organization_members ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);
ALTER TABLE organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
ALTER TABLE plans ADD CONSTRAINT plans_name_key UNIQUE (name);
ALTER TABLE report_bookmarks ADD CONSTRAINT report_bookmarks_session_id_user_id_section_id_title_key UNIQUE (session_id, user_id, section_id, title);
ALTER TABLE session_context ADD CONSTRAINT unique_session_context UNIQUE (session_id);
ALTER TABLE shared_reports ADD CONSTRAINT shared_reports_share_token_key UNIQUE (share_token);
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
ALTER TABLE transcripts ADD CONSTRAINT transcripts_session_sequence_unique UNIQUE (session_id, sequence_number);
ALTER TABLE usage_tracking ADD CONSTRAINT usage_tracking_session_id_minute_timestamp_key UNIQUE (session_id, minute_timestamp);
ALTER TABLE user_app_sessions ADD CONSTRAINT user_app_sessions_session_token_key UNIQUE (session_token);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT users_google_id_key UNIQUE (google_id);

-- Add foreign key constraints
ALTER TABLE bot_recordings ADD CONSTRAINT bot_recordings_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE bot_usage_tracking ADD CONSTRAINT bot_usage_tracking_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE bot_usage_tracking ADD CONSTRAINT bot_usage_tracking_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE bot_usage_tracking ADD CONSTRAINT bot_usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE calendar_auto_join_logs ADD CONSTRAINT calendar_auto_join_logs_calendar_event_id_fkey FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id) ON DELETE CASCADE;
ALTER TABLE calendar_auto_join_logs ADD CONSTRAINT calendar_auto_join_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE calendar_auto_join_logs ADD CONSTRAINT calendar_auto_join_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE calendar_connections ADD CONSTRAINT calendar_connections_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE calendar_connections ADD CONSTRAINT calendar_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_auto_session_id_fkey FOREIGN KEY (auto_session_id) REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_calendar_connection_id_fkey FOREIGN KEY (calendar_connection_id) REFERENCES calendar_connections(id) ON DELETE CASCADE;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id);
ALTER TABLE calendar_preferences ADD CONSTRAINT calendar_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE calendar_webhooks ADD CONSTRAINT calendar_webhooks_calendar_connection_id_fkey FOREIGN KEY (calendar_connection_id) REFERENCES calendar_connections(id) ON DELETE CASCADE;
ALTER TABLE collaborative_action_items ADD CONSTRAINT collaborative_action_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE collaborative_action_items ADD CONSTRAINT collaborative_action_items_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES users(id);
ALTER TABLE collaborative_action_items ADD CONSTRAINT collaborative_action_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE collaborative_action_items ADD CONSTRAINT collaborative_action_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE comment_mentions ADD CONSTRAINT comment_mentions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES report_comments(id) ON DELETE CASCADE;
ALTER TABLE comment_mentions ADD CONSTRAINT comment_mentions_mentioned_user_id_fkey FOREIGN KEY (mentioned_user_id) REFERENCES users(id);
ALTER TABLE conversation_links ADD CONSTRAINT conversation_links_linked_session_id_fkey FOREIGN KEY (linked_session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE conversation_links ADD CONSTRAINT conversation_links_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE documents ADD CONSTRAINT documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE documents ADD CONSTRAINT documents_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE documents ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE guidance ADD CONSTRAINT guidance_prompt_template_id_fkey FOREIGN KEY (prompt_template_id) REFERENCES templates(id);
ALTER TABLE guidance ADD CONSTRAINT guidance_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE guidance ADD CONSTRAINT guidance_triggered_by_transcript_id_fkey FOREIGN KEY (triggered_by_transcript_id) REFERENCES transcripts(id);
ALTER TABLE meeting_metadata ADD CONSTRAINT meeting_metadata_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE meeting_notifications ADD CONSTRAINT meeting_notifications_calendar_event_id_fkey FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id) ON DELETE SET NULL;
ALTER TABLE meeting_notifications ADD CONSTRAINT meeting_notifications_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE meeting_notifications ADD CONSTRAINT meeting_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE monthly_usage_cache ADD CONSTRAINT monthly_usage_cache_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE monthly_usage_cache ADD CONSTRAINT monthly_usage_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE organization_invitations ADD CONSTRAINT organization_invitations_accepted_by_user_id_fkey FOREIGN KEY (accepted_by_user_id) REFERENCES users(id);
ALTER TABLE organization_invitations ADD CONSTRAINT organization_invitations_invited_by_user_id_fkey FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE organization_invitations ADD CONSTRAINT organization_invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE prep_checklist ADD CONSTRAINT fk_prep_checklist_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE prep_checklist ADD CONSTRAINT fk_prep_checklist_session_id FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE recall_ai_webhooks ADD CONSTRAINT recall_ai_webhooks_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE report_activity ADD CONSTRAINT report_activity_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE report_activity ADD CONSTRAINT report_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE report_bookmarks ADD CONSTRAINT report_bookmarks_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE report_bookmarks ADD CONSTRAINT report_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE report_collaborators ADD CONSTRAINT report_collaborators_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES users(id);
ALTER TABLE report_collaborators ADD CONSTRAINT report_collaborators_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE report_collaborators ADD CONSTRAINT report_collaborators_shared_report_id_fkey FOREIGN KEY (shared_report_id) REFERENCES shared_reports(id) ON DELETE CASCADE;
ALTER TABLE report_collaborators ADD CONSTRAINT report_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE report_comments ADD CONSTRAINT report_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES report_comments(id) ON DELETE CASCADE;
ALTER TABLE report_comments ADD CONSTRAINT report_comments_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE report_comments ADD CONSTRAINT report_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE session_context ADD CONSTRAINT session_context_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE session_context ADD CONSTRAINT session_context_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE session_context ADD CONSTRAINT session_context_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE session_timeline_events ADD CONSTRAINT session_timeline_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD CONSTRAINT sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD CONSTRAINT sessions_selected_template_id_fkey FOREIGN KEY (selected_template_id) REFERENCES templates(id);
ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE shared_reports ADD CONSTRAINT shared_reports_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE shared_reports ADD CONSTRAINT shared_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE smart_notes ADD CONSTRAINT smart_notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE smart_notes ADD CONSTRAINT smart_notes_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE subscription_events ADD CONSTRAINT subscription_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE subscription_events ADD CONSTRAINT subscription_events_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE;
ALTER TABLE subscription_events ADD CONSTRAINT subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES plans(id);
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE summaries ADD CONSTRAINT summaries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE summaries ADD CONSTRAINT summaries_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE summaries ADD CONSTRAINT summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE system_logs ADD CONSTRAINT system_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE system_logs ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE templates ADD CONSTRAINT templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE templates ADD CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE transcripts ADD CONSTRAINT transcripts_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE usage_records ADD CONSTRAINT usage_records_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE usage_records ADD CONSTRAINT usage_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE usage_records ADD CONSTRAINT usage_records_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE usage_records ADD CONSTRAINT usage_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE usage_tracking ADD CONSTRAINT usage_tracking_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE usage_tracking ADD CONSTRAINT usage_tracking_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE usage_tracking ADD CONSTRAINT usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_app_sessions ADD CONSTRAINT user_app_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE users ADD CONSTRAINT users_current_organization_id_fkey FOREIGN KEY (current_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE webhook_dead_letter_queue ADD CONSTRAINT webhook_dead_letter_queue_original_webhook_id_fkey FOREIGN KEY (original_webhook_id) REFERENCES webhook_retry_queue(id);

-- Create indexes (cleaned up to avoid duplicates)
CREATE INDEX idx_beta_waitlist_created_at ON beta_waitlist (created_at);
CREATE INDEX idx_beta_waitlist_email ON beta_waitlist (email);
CREATE INDEX idx_beta_waitlist_status ON beta_waitlist (status);
CREATE INDEX idx_bot_recordings_bot_id ON bot_recordings (bot_id);
CREATE INDEX idx_bot_recordings_session_id ON bot_recordings (session_id);
CREATE INDEX idx_bot_recordings_status ON bot_recordings (recording_status);
CREATE INDEX idx_bot_usage_tracking_created_at ON bot_usage_tracking (created_at);
CREATE INDEX idx_bot_usage_tracking_org_id ON bot_usage_tracking (organization_id);
CREATE INDEX idx_bot_usage_tracking_session_id ON bot_usage_tracking (session_id);
CREATE INDEX idx_bot_usage_tracking_status ON bot_usage_tracking (status);
CREATE INDEX idx_bot_usage_tracking_user_id ON bot_usage_tracking (user_id);
CREATE INDEX idx_auto_join_logs_event ON calendar_auto_join_logs (calendar_event_id);
CREATE INDEX idx_auto_join_logs_user_time ON calendar_auto_join_logs (user_id, created_at DESC);
CREATE INDEX idx_calendar_connections_organization_id ON calendar_connections (organization_id);
CREATE INDEX idx_calendar_connections_user_id ON calendar_connections (user_id);
CREATE INDEX idx_calendar_events_auto_join ON calendar_events (calendar_connection_id, start_time, auto_session_created) WHERE (meeting_url IS NOT NULL);
CREATE INDEX idx_calendar_events_connection_id ON calendar_events (calendar_connection_id);
CREATE INDEX idx_calendar_events_session_id ON calendar_events (session_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events (start_time);
CREATE INDEX idx_calendar_webhooks_connection_id ON calendar_webhooks (calendar_connection_id);
CREATE INDEX idx_calendar_webhooks_created_at ON calendar_webhooks (created_at);
CREATE INDEX idx_collaborative_action_items_assigned_to ON collaborative_action_items (assigned_to);
CREATE INDEX idx_collaborative_action_items_due_date ON collaborative_action_items (due_date);
CREATE INDEX idx_collaborative_action_items_session_id ON collaborative_action_items (session_id);
CREATE INDEX idx_collaborative_action_items_status ON collaborative_action_items (status);
CREATE INDEX idx_comment_mentions_is_read ON comment_mentions (is_read);
CREATE INDEX idx_comment_mentions_user_id ON comment_mentions (mentioned_user_id);
CREATE INDEX conversation_links_linked_idx ON conversation_links (linked_session_id);
CREATE INDEX conversation_links_session_idx ON conversation_links (session_id);
CREATE INDEX idx_documents_file_type ON documents (file_type);
CREATE INDEX idx_documents_organization_id ON documents (organization_id);
CREATE INDEX idx_documents_processing_status ON documents (processing_status);
CREATE INDEX idx_documents_session_id ON documents (session_id);
CREATE INDEX idx_documents_user_id ON documents (user_id);
CREATE INDEX idx_guidance_session_id ON guidance (session_id);
CREATE INDEX idx_guidance_triggered_at ON guidance (triggered_at_seconds);
CREATE INDEX idx_guidance_type ON guidance (guidance_type);
CREATE INDEX idx_guidance_was_displayed ON guidance (was_displayed);
CREATE INDEX idx_meeting_metadata_platform ON meeting_metadata (platform);
CREATE INDEX idx_meeting_metadata_scheduled_at ON meeting_metadata (scheduled_at);
CREATE INDEX idx_meeting_metadata_session_id ON meeting_metadata (session_id);
CREATE INDEX idx_meeting_notifications_user_unread ON meeting_notifications (user_id, read, created_at DESC);
CREATE INDEX idx_monthly_usage_cache_lookup ON monthly_usage_cache (organization_id, user_id, month_year);
CREATE INDEX idx_organization_invitations_email ON organization_invitations (email);
CREATE INDEX idx_organization_invitations_expires_at ON organization_invitations (expires_at);
CREATE INDEX idx_organization_invitations_org_id ON organization_invitations (organization_id);
CREATE INDEX idx_organization_invitations_status ON organization_invitations (status);
CREATE INDEX idx_organization_invitations_token ON organization_invitations (invitation_token);
CREATE INDEX idx_organization_members_org_id ON organization_members (organization_id);
CREATE INDEX idx_organization_members_role ON organization_members (role);
CREATE INDEX idx_organization_members_status ON organization_members (status);
CREATE INDEX idx_organization_members_user_id ON organization_members (user_id);
CREATE INDEX idx_organizations_created_at ON organizations (created_at);
CREATE INDEX idx_organizations_is_active ON organizations (is_active);
CREATE INDEX idx_organizations_slug ON organizations (slug);
CREATE INDEX idx_plans_bot_minutes ON plans (monthly_bot_minutes_limit) WHERE (monthly_bot_minutes_limit IS NOT NULL);
CREATE INDEX idx_plans_is_active ON plans (is_active);
CREATE INDEX idx_plans_name ON plans (name);
CREATE INDEX idx_plans_sort_order ON plans (sort_order);
CREATE INDEX idx_plans_type ON plans (plan_type);
CREATE INDEX idx_prep_checklist_created_at ON prep_checklist (created_at);
CREATE INDEX idx_prep_checklist_created_by ON prep_checklist (created_by);
CREATE INDEX idx_prep_checklist_session_id ON prep_checklist (session_id);
CREATE INDEX idx_prep_checklist_status ON prep_checklist (status);
CREATE INDEX idx_recall_ai_webhooks_processed ON recall_ai_webhooks (processed);
CREATE INDEX idx_recall_ai_webhooks_session_id ON recall_ai_webhooks (session_id);
CREATE INDEX idx_report_activity_created_at ON report_activity (created_at DESC);
CREATE INDEX idx_report_activity_session_id ON report_activity (session_id);
CREATE INDEX idx_report_activity_type ON report_activity (activity_type);
CREATE INDEX idx_report_activity_user_id ON report_activity (user_id);
CREATE INDEX idx_report_bookmarks_session_user ON report_bookmarks (session_id, user_id);
CREATE INDEX idx_report_collaborators_session_id ON report_collaborators (session_id);
CREATE UNIQUE INDEX idx_report_collaborators_unique ON report_collaborators (session_id, user_email);
CREATE INDEX idx_report_collaborators_user_email ON report_collaborators (user_email);
CREATE INDEX idx_report_comments_created_at ON report_comments (created_at DESC);
CREATE INDEX idx_report_comments_guest_id ON report_comments (guest_id) WHERE (guest_id IS NOT NULL);
CREATE INDEX idx_report_comments_parent_id ON report_comments (parent_comment_id);
CREATE INDEX idx_report_comments_session_id ON report_comments (session_id);
CREATE INDEX idx_report_comments_user_id ON report_comments (user_id);
CREATE INDEX idx_session_context_organization_id ON session_context (organization_id);
CREATE INDEX idx_session_context_processing_status ON session_context (processing_status);
CREATE INDEX idx_session_context_session_id ON session_context (session_id);
CREATE INDEX idx_session_context_user_id ON session_context (user_id);
CREATE INDEX idx_session_timeline_events_event_timestamp ON session_timeline_events (event_timestamp DESC);
CREATE INDEX idx_session_timeline_events_importance ON session_timeline_events (importance);
CREATE INDEX idx_session_timeline_events_session_id ON session_timeline_events (session_id);
CREATE INDEX idx_session_timeline_events_type ON session_timeline_events (type);
CREATE INDEX idx_sessions_conversation_type ON sessions (conversation_type);
CREATE INDEX idx_sessions_created_at ON sessions (created_at);
CREATE INDEX idx_sessions_organization_id ON sessions (organization_id);
CREATE INDEX idx_sessions_recall_bot_id ON sessions (recall_bot_id);
CREATE INDEX idx_sessions_recall_recording_id ON sessions (recall_recording_id);
CREATE INDEX idx_sessions_recall_sdk_upload_id ON sessions (recall_sdk_upload_id);
CREATE INDEX idx_sessions_status ON sessions (status);
CREATE INDEX idx_sessions_summary_processed_index ON sessions (realtime_summary_last_processed_index);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_shared_reports_expires_at ON shared_reports (expires_at);
CREATE INDEX idx_shared_reports_session_id ON shared_reports (session_id);
CREATE INDEX idx_shared_reports_token ON shared_reports (share_token);
CREATE INDEX idx_shared_reports_user_id ON shared_reports (user_id);
CREATE INDEX idx_smart_notes_category ON smart_notes (category);
CREATE INDEX idx_smart_notes_created_at ON smart_notes (created_at DESC);
CREATE INDEX idx_smart_notes_importance ON smart_notes (importance);
CREATE INDEX idx_smart_notes_session_id ON smart_notes (session_id);
CREATE INDEX idx_subscription_events_created_at ON subscription_events (created_at);
CREATE INDEX idx_subscription_events_subscription_id ON subscription_events (subscription_id);
CREATE INDEX idx_subscription_events_user_id ON subscription_events (user_id);
CREATE INDEX idx_subscriptions_current_period ON subscriptions (current_period_start, current_period_end);
CREATE INDEX idx_subscriptions_organization_id ON subscriptions (organization_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions (plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions (stripe_customer_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_user_status ON subscriptions (user_id, status);
CREATE INDEX idx_summaries_marked_done ON summaries (is_marked_done);
CREATE INDEX idx_summaries_organization_id ON summaries (organization_id);
CREATE INDEX idx_summaries_session_id ON summaries (session_id);
CREATE INDEX idx_summaries_status ON summaries (generation_status);
CREATE INDEX idx_summaries_user_id ON summaries (user_id);
CREATE INDEX idx_system_logs_created_at ON system_logs (created_at);
CREATE INDEX idx_system_logs_level ON system_logs (level);
CREATE INDEX idx_system_logs_session_id ON system_logs (session_id);
CREATE INDEX idx_system_logs_user_id ON system_logs (user_id);
CREATE INDEX idx_templates_conversation_type ON templates (conversation_type);
CREATE INDEX idx_templates_is_organization ON templates (is_organization_template);
CREATE INDEX idx_templates_is_public ON templates (is_public);
CREATE INDEX idx_templates_is_system ON templates (is_system_template);
CREATE INDEX idx_templates_organization_id ON templates (organization_id);
CREATE INDEX idx_templates_user_id ON templates (user_id);
CREATE INDEX idx_transcripts_client_id ON transcripts (client_id);
CREATE INDEX idx_transcripts_created_at ON transcripts (created_at);
CREATE INDEX idx_transcripts_is_final ON transcripts (is_final);
CREATE INDEX idx_transcripts_is_owner ON transcripts (is_owner) WHERE (is_owner = true);
CREATE INDEX idx_transcripts_sequence ON transcripts (session_id, sequence_number);
CREATE INDEX idx_transcripts_session_id ON transcripts (session_id);
CREATE INDEX idx_transcripts_start_time ON transcripts (start_time_seconds);
CREATE INDEX idx_usage_records_billing_period ON usage_records (billing_period_start, billing_period_end);
CREATE INDEX idx_usage_records_organization_id ON usage_records (organization_id);
CREATE INDEX idx_usage_records_session_id ON usage_records (session_id);
CREATE INDEX idx_usage_records_subscription_id ON usage_records (subscription_id);
CREATE INDEX idx_usage_records_usage_type ON usage_records (usage_type);
CREATE INDEX idx_usage_records_user_id ON usage_records (user_id);
CREATE INDEX idx_usage_tracking_org_month ON usage_tracking (organization_id, minute_timestamp);
CREATE INDEX idx_usage_tracking_session ON usage_tracking (session_id);
CREATE INDEX idx_usage_tracking_source ON usage_tracking (source);
CREATE INDEX idx_usage_tracking_user_month ON usage_tracking (user_id, minute_timestamp);
CREATE INDEX idx_user_app_sessions_started_at ON user_app_sessions (started_at);
CREATE INDEX idx_user_app_sessions_user_id ON user_app_sessions (user_id);
CREATE INDEX idx_users_acquisition_source ON users (acquisition_source);
CREATE INDEX idx_users_created_at ON users (created_at);
CREATE INDEX idx_users_current_organization ON users (current_organization_id);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_google_id ON users (google_id);
CREATE INDEX idx_users_is_admin ON users (is_admin) WHERE (is_admin = true);
CREATE INDEX idx_users_use_case ON users (use_case);
CREATE INDEX idx_webhook_retry_queue_next_retry ON webhook_retry_queue (next_retry_at) WHERE ((status)::text = 'pending'::text);
CREATE INDEX idx_webhook_retry_queue_status ON webhook_retry_queue (status);

-- End of schema dump