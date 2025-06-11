-- Latest Supabase Schema Dump
-- Generated: 2024-12-19
-- Project: VoiceConvo Dev (ucvfgfbjcrxbzppwjpuu)
-- Database completely cleared and fresh

-- ========================================
-- EXTENSIONS
-- ========================================
-- Standard Supabase extensions are enabled
-- uuid-ossp, pgcrypto, pgjwt, etc.

-- ========================================
-- PUBLIC SCHEMA TABLES
-- ========================================

-- Users table
CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email character varying(255) NOT NULL UNIQUE,
    email_verified boolean DEFAULT false,
    full_name character varying(255),
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    password_hash character varying(255),
    google_id character varying(255) UNIQUE,
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
    current_organization_id uuid REFERENCES public.organizations(id),
    personal_context text,
    is_admin boolean NOT NULL DEFAULT false,
    stripe_customer_id character varying(255)
);

-- Organizations table
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    display_name character varying(255),
    slug character varying(100) NOT NULL UNIQUE,
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

-- Organization Members table
CREATE TABLE public.organization_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    user_id uuid NOT NULL REFERENCES public.users(id),
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
    current_month_start date,
    UNIQUE(organization_id, user_id)
);

-- Organization Invitations table
CREATE TABLE public.organization_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    invited_by_user_id uuid NOT NULL REFERENCES public.users(id),
    email character varying(255) NOT NULL,
    role character varying(20) NOT NULL DEFAULT 'member'::character varying,
    personal_message text,
    invitation_token character varying(255) NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    accepted_by_user_id uuid REFERENCES public.users(id),
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, email, status)
);

-- Plans table
CREATE TABLE public.plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying(50) NOT NULL UNIQUE,
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
    monthly_audio_minutes_limit integer
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id),
    user_id uuid REFERENCES public.users(id),
    plan_id uuid NOT NULL REFERENCES public.plans(id),
    stripe_customer_id character varying(255) UNIQUE,
    stripe_subscription_id character varying(255) UNIQUE,
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

-- Templates table
CREATE TABLE public.templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    organization_id uuid REFERENCES public.organizations(id),
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

-- Sessions table
CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    title character varying(255),
    conversation_type character varying(50),
    status character varying(20) DEFAULT 'draft'::character varying,
    selected_template_id uuid REFERENCES public.templates(id),
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
    finalized_at timestamp with time zone
);

-- Session Context table
CREATE TABLE public.session_context (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) UNIQUE,
    user_id uuid NOT NULL REFERENCES public.users(id),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    text_context text,
    context_metadata jsonb,
    processing_status character varying(20) DEFAULT 'completed'::character varying,
    processing_error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Transcripts table
CREATE TABLE public.transcripts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id),
    content text NOT NULL,
    speaker character varying(50) DEFAULT 'user'::character varying,
    confidence_score numeric(3,2),
    start_time_seconds numeric(10,3) NOT NULL,
    stt_provider character varying(50),
    is_final boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    client_id character varying(255),
    sequence_number integer NOT NULL DEFAULT 1
);

-- Documents table
CREATE TABLE public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id),
    user_id uuid NOT NULL REFERENCES public.users(id),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
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

-- Guidance table
CREATE TABLE public.guidance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id),
    content text NOT NULL,
    guidance_type character varying(20) NOT NULL,
    priority integer DEFAULT 1,
    triggered_by_transcript_id uuid REFERENCES public.transcripts(id),
    context_snippet text,
    triggered_at_seconds numeric(10,3),
    was_displayed boolean DEFAULT false,
    was_clicked boolean DEFAULT false,
    was_dismissed boolean DEFAULT false,
    user_feedback character varying(20),
    model_used character varying(50),
    prompt_template_id uuid REFERENCES public.templates(id),
    processing_time_ms integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Summaries table
CREATE TABLE public.summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id),
    user_id uuid NOT NULL REFERENCES public.users(id),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
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
    deleted_at timestamp with time zone
);

-- Usage Tracking table
CREATE TABLE public.usage_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    user_id uuid NOT NULL REFERENCES public.users(id),
    session_id uuid NOT NULL REFERENCES public.sessions(id),
    minute_timestamp timestamp with time zone NOT NULL,
    seconds_recorded integer NOT NULL DEFAULT 0 CHECK (seconds_recorded >= 0),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, minute_timestamp)
);

-- Monthly Usage Cache table
CREATE TABLE public.monthly_usage_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    user_id uuid NOT NULL REFERENCES public.users(id),
    month_year character varying(7) NOT NULL,
    total_minutes_used integer DEFAULT 0 CHECK (total_minutes_used >= 0),
    total_seconds_used integer DEFAULT 0 CHECK (total_seconds_used >= 0),
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id, month_year)
);

-- Usage Records table
CREATE TABLE public.usage_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    user_id uuid NOT NULL REFERENCES public.users(id),
    subscription_id uuid REFERENCES public.subscriptions(id),
    session_id uuid REFERENCES public.sessions(id),
    usage_type character varying(50) NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit character varying(20) NOT NULL,
    billing_period_start timestamp with time zone,
    billing_period_end timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Prep Checklist table
CREATE TABLE public.prep_checklist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id),
    text text NOT NULL,
    status text NOT NULL DEFAULT 'open'::text CHECK (status IN ('open', 'closed')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid NOT NULL REFERENCES public.users(id)
);

-- Session Timeline Events table
CREATE TABLE public.session_timeline_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id),
    event_timestamp timestamp with time zone NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    importance character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- System Logs table
CREATE TABLE public.system_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level character varying(10) NOT NULL,
    logger_name character varying(100),
    message text NOT NULL,
    user_id uuid REFERENCES public.users(id),
    session_id uuid REFERENCES public.sessions(id),
    module character varying(100),
    function_name character varying(100),
    line_number integer,
    exception_traceback text,
    request_id character varying(100),
    ip_address inet,
    endpoint character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- User App Sessions table
CREATE TABLE public.user_app_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    session_token character varying(255) UNIQUE,
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

-- Subscription Events table
CREATE TABLE public.subscription_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id),
    organization_id uuid REFERENCES public.organizations(id),
    subscription_id uuid REFERENCES public.subscriptions(id),
    event_type text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Beta Waitlist table
CREATE TABLE public.beta_waitlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    company text NOT NULL,
    use_case text NOT NULL CHECK (use_case IN ('sales', 'customer_support', 'meetings', 'interviews', 'coaching', 'other')),
    status text DEFAULT 'pending'::text CHECK (status IN ('pending', 'approved', 'rejected')),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    referral_source text,
    interest_level text,
    approved_at timestamp with time zone
);

-- ========================================
-- INDEXES (Key indexes only)
-- ========================================
-- Primary keys and unique constraints are automatically indexed
-- Foreign key indexes are recommended and likely exist

-- ========================================
-- RLS POLICIES
-- ========================================
-- Note: Row Level Security policies would be defined here
-- They control access to data based on user context

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================
-- Custom functions and triggers for business logic
-- Updated timestamp triggers, usage calculation functions, etc.

-- ========================================
-- DATA STATUS
-- ========================================
-- All tables are completely empty (0 rows)
-- Database was cleared on 2024-12-19
-- Ready for fresh data insertion 