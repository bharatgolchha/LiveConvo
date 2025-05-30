-- LiveConvo Database Schema for Supabase
-- Version: 1.0
-- Date: 2025-01-27

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table - manages user accounts, authentication, and profile information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Profile Information
    full_name VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Authentication
    password_hash VARCHAR(255), -- nullable for OAuth-only users
    google_id VARCHAR(255) UNIQUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Onboarding & Preferences
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    has_completed_organization_setup BOOLEAN DEFAULT FALSE,
    default_microphone_id VARCHAR(255),
    default_speaker_id VARCHAR(255),
    
    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Organizations table - manages company/team information and settings
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization Identity
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    description TEXT,
    
    -- Contact Information
    website_url VARCHAR(512),
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Address Information
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country_code VARCHAR(2),
    
    -- Organization Settings
    default_timezone VARCHAR(50) DEFAULT 'UTC',
    default_language VARCHAR(10) DEFAULT 'en',
    branding_logo_url VARCHAR(512),
    branding_primary_color VARCHAR(7), -- hex color code
    
    -- Billing Information
    tax_id VARCHAR(100), -- VAT/EIN/etc
    billing_email VARCHAR(255),
    
    -- Organization Limits (from subscription)
    monthly_audio_hours_limit INTEGER,
    max_members INTEGER DEFAULT 10,
    max_sessions_per_month INTEGER,
    
    -- Organization Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_requested_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Organizations indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- Organization Members table - manages user membership in organizations with role-based access
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Member Role & Permissions
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    permissions JSONB DEFAULT '[]'::jsonb, -- array of specific permissions
    
    -- Member Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'pending'
    
    -- Member Limits (individual within organization)
    monthly_audio_hours_limit INTEGER, -- null inherits from organization
    max_sessions_per_month INTEGER, -- null inherits from organization
    
    -- Member Statistics
    total_sessions_count INTEGER DEFAULT 0,
    total_audio_hours_used DECIMAL(6,2) DEFAULT 0,
    last_session_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique user per organization
    UNIQUE(organization_id, user_id)
);

-- Organization Members indexes
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);
CREATE INDEX idx_organization_members_status ON organization_members(status);

-- Organization Invitations table - manages pending invitations to join organizations
CREATE TABLE organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Invitation Details
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- role to assign when accepted
    personal_message TEXT,
    
    -- Invitation Token
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Invitation Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
    accepted_by_user_id UUID REFERENCES users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique pending invitation per email per organization
    UNIQUE(organization_id, email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Organization Invitations indexes
CREATE INDEX idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX idx_organization_invitations_token ON organization_invitations(invitation_token);
CREATE INDEX idx_organization_invitations_status ON organization_invitations(status);
CREATE INDEX idx_organization_invitations_expires_at ON organization_invitations(expires_at);

-- Now add the current_organization_id column to users table
ALTER TABLE users ADD COLUMN current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX idx_users_current_organization ON users(current_organization_id);

-- Templates table - manages conversation templates and AI guidance cue sets
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- null for system templates
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- null for system templates
    
    -- Template Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conversation_type VARCHAR(50), -- 'sales_call', 'interview', 'meeting', 'consultation'
    is_system_template BOOLEAN DEFAULT FALSE,
    is_organization_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Template Content
    guidance_prompts JSONB, -- array of guidance prompt objects
    context_instructions TEXT,
    summary_template TEXT,
    
    -- Usage Statistics
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Template Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Templates indexes
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_organization_id ON templates(organization_id);
CREATE INDEX idx_templates_conversation_type ON templates(conversation_type);
CREATE INDEX idx_templates_is_system ON templates(is_system_template);
CREATE INDEX idx_templates_is_organization ON templates(is_organization_template);
CREATE INDEX idx_templates_is_public ON templates(is_public);

-- Sessions table - manages conversation sessions and their metadata
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Session Metadata
    title VARCHAR(255),
    conversation_type VARCHAR(50), -- 'sales_call', 'interview', 'meeting', 'consultation'
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'
    
    
    -- Session Configuration
    selected_template_id UUID REFERENCES templates(id),
    
    -- Audio & Recording
    audio_file_url VARCHAR(512), -- S3/R2 URL (temporary storage)
    recording_duration_seconds INTEGER DEFAULT 0,
    recording_started_at TIMESTAMP WITH TIME ZONE,
    recording_ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Session Statistics
    total_words_spoken INTEGER DEFAULT 0,
    user_talk_time_seconds INTEGER DEFAULT 0,
    silence_periods_count INTEGER DEFAULT 0,
    
    -- Privacy & Retention
    audio_deleted_at TIMESTAMP WITH TIME ZONE,
    data_retention_days INTEGER DEFAULT 30,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_organization_id ON sessions(organization_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_conversation_type ON sessions(conversation_type);

-- Add realtime_summary_cache to sessions table
ALTER TABLE sessions ADD COLUMN realtime_summary_cache JSONB;

-- Session Timeline Events table - stores chronological timeline events for a session
CREATE TABLE session_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'milestone', 'decision', 'topic_shift', 'action_item', 'question', 'agreement'
    importance VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session Timeline Events indexes
CREATE INDEX idx_session_timeline_events_session_id ON session_timeline_events(session_id);
CREATE INDEX idx_session_timeline_events_event_timestamp ON session_timeline_events(event_timestamp DESC);
CREATE INDEX idx_session_timeline_events_type ON session_timeline_events(type);
CREATE INDEX idx_session_timeline_events_importance ON session_timeline_events(importance);

-- Prep Checklist table - stores task/checklist items for sessions
CREATE TABLE prep_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Checklist Item Content
    text TEXT NOT NULL,
    status VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'done')),
    
    -- User tracking
    created_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prep Checklist indexes
CREATE INDEX idx_prep_checklist_session_id ON prep_checklist(session_id);
CREATE INDEX idx_prep_checklist_status ON prep_checklist(status);
CREATE INDEX idx_prep_checklist_created_at ON prep_checklist(created_at);

-- Documents table - stores uploaded context files and their processed content
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'pdf', 'docx', 'txt', 'png', 'jpg'
    file_size_bytes INTEGER NOT NULL,
    file_url VARCHAR(512), -- S3/R2 URL
    
    -- Content Processing
    extracted_text TEXT,
    processing_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT,
    
    -- Vector Embeddings
    embedding_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    pinecone_vector_id VARCHAR(255),
    
    -- OCR Results (for images)
    ocr_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Documents indexes
CREATE INDEX idx_documents_session_id ON documents(session_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_organization_id ON documents(organization_id);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_processing_status ON documents(processing_status);

-- Session Context table - stores text context and metadata for sessions
CREATE TABLE session_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Context Content
    text_context TEXT, -- User-provided background text, notes, objectives
    context_metadata JSONB, -- Additional metadata like conversation type, objectives, etc.
    
    -- Context Processing
    processing_status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT,
    
    -- Vector Embeddings
    embedding_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    pinecone_vector_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique context per session
    UNIQUE(session_id)
);

-- Session Context indexes
CREATE INDEX idx_session_context_session_id ON session_context(session_id);
CREATE INDEX idx_session_context_user_id ON session_context(user_id);
CREATE INDEX idx_session_context_organization_id ON session_context(organization_id);
CREATE INDEX idx_session_context_processing_status ON session_context(processing_status);

-- Transcripts table - stores real-time transcript data with timestamps
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Transcript Content
    content TEXT NOT NULL,
    speaker VARCHAR(50) DEFAULT 'user', -- 'user', 'system', 'other'
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Timing Information
    start_time_seconds DECIMAL(10,3) NOT NULL, -- relative to session start
    end_time_seconds DECIMAL(10,3),
    duration_seconds DECIMAL(8,3),
    
    -- Processing Metadata
    stt_provider VARCHAR(50), -- 'deepgram', 'openai_realtime', 'whisper', 'assembly_ai'
    is_final BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transcripts indexes
CREATE INDEX idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX idx_transcripts_start_time ON transcripts(start_time_seconds);
CREATE INDEX idx_transcripts_is_final ON transcripts(is_final);

-- Guidance table - stores AI-generated guidance chips and their context
CREATE TABLE guidance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Guidance Content
    content TEXT NOT NULL,
    guidance_type VARCHAR(20) NOT NULL, -- 'ask', 'clarify', 'avoid', 'suggest', 'warn'
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    
    -- Context & Timing
    triggered_by_transcript_id UUID REFERENCES transcripts(id),
    context_snippet TEXT, -- relevant transcript excerpt
    triggered_at_seconds DECIMAL(10,3), -- relative to session start
    
    -- User Interaction
    was_displayed BOOLEAN DEFAULT FALSE,
    was_clicked BOOLEAN DEFAULT FALSE,
    was_dismissed BOOLEAN DEFAULT FALSE,
    user_feedback VARCHAR(20), -- 'helpful', 'irrelevant', 'too_late'
    
    -- AI Model Information
    model_used VARCHAR(50), -- 'gpt-4o-mini', 'gpt-4o'
    prompt_template_id UUID REFERENCES templates(id),
    processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Guidance indexes
CREATE INDEX idx_guidance_session_id ON guidance(session_id);
CREATE INDEX idx_guidance_type ON guidance(guidance_type);
CREATE INDEX idx_guidance_triggered_at ON guidance(triggered_at_seconds);
CREATE INDEX idx_guidance_was_displayed ON guidance(was_displayed);

-- Summaries table - stores post-session summaries and action items for individual sessions
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Summary Content
    title VARCHAR(255),
    tldr TEXT,
    key_decisions JSONB, -- array of decision strings
    action_items JSONB, -- array of action item objects with priorities
    follow_up_questions JSONB, -- array of follow-up questions
    conversation_highlights JSONB, -- key moments from the session
    
    -- Full Content
    full_transcript TEXT,
    structured_notes TEXT,
    
    -- Generation Metadata
    generation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
    generation_error TEXT,
    model_used VARCHAR(50), -- 'gpt-4o', 'gpt-4o-mini'
    generation_time_seconds DECIMAL(6,2),
    
    -- Export & Sharing
    export_count INTEGER DEFAULT 0,
    last_exported_at TIMESTAMP WITH TIME ZONE,
    is_marked_done BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Summaries indexes
CREATE INDEX idx_summaries_session_id ON summaries(session_id);
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_summaries_organization_id ON summaries(organization_id);
CREATE INDEX idx_summaries_status ON summaries(generation_status);
CREATE INDEX idx_summaries_marked_done ON summaries(is_marked_done);

-- =============================================================================
-- BILLING & SUBSCRIPTION TABLES
-- =============================================================================

-- Plans table - defines available subscription plans and their features
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan Identity
    name VARCHAR(50) UNIQUE NOT NULL, -- 'individual_free', 'individual_pro', 'org_starter', 'org_professional', 'org_enterprise'
    display_name VARCHAR(100) NOT NULL, -- 'Individual Free', 'Individual Pro', 'Organization Starter', etc.
    description TEXT,
    plan_type VARCHAR(20) NOT NULL DEFAULT 'individual', -- 'individual', 'organization'
    
    -- Pricing
    price_monthly DECIMAL(8,2), -- null for free plan
    price_yearly DECIMAL(8,2), -- null for free plan
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    
    -- Usage Limits
    monthly_audio_hours_limit INTEGER, -- null for unlimited
    max_documents_per_session INTEGER DEFAULT 10,
    max_file_size_mb INTEGER DEFAULT 25,
    max_sessions_per_month INTEGER, -- null for unlimited
    max_organization_members INTEGER, -- null for individual plans, number for org plans
    
    -- Feature Flags
    has_real_time_guidance BOOLEAN DEFAULT TRUE,
    has_advanced_summaries BOOLEAN DEFAULT FALSE,
    has_export_options BOOLEAN DEFAULT FALSE,
    has_email_summaries BOOLEAN DEFAULT FALSE,
    has_api_access BOOLEAN DEFAULT FALSE,
    has_custom_templates BOOLEAN DEFAULT FALSE,
    has_priority_support BOOLEAN DEFAULT FALSE,
    has_analytics_dashboard BOOLEAN DEFAULT FALSE,
    has_team_collaboration BOOLEAN DEFAULT FALSE,
    
    -- AI Features
    ai_model_access JSONB DEFAULT '["gpt-4o-mini"]'::jsonb, -- array of available models
    max_guidance_requests_per_session INTEGER DEFAULT 50,
    summary_generation_priority INTEGER DEFAULT 3, -- 1=high, 2=medium, 3=low
    
    -- Plan Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Plans indexes
CREATE INDEX idx_plans_name ON plans(name);
CREATE INDEX idx_plans_type ON plans(plan_type);
CREATE INDEX idx_plans_is_active ON plans(is_active);
CREATE INDEX idx_plans_sort_order ON plans(sort_order);

-- Subscriptions table - manages user subscription plans and billing
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- null for individual subscriptions
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- null for organization subscriptions
    plan_id UUID NOT NULL REFERENCES plans(id),
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    
    -- Subscription Details
    plan_type VARCHAR(20) NOT NULL, -- 'monthly', 'yearly', 'lifetime'
    status VARCHAR(20) NOT NULL, -- 'active', 'past_due', 'canceled', 'unpaid', 'trialing'
    
    -- Billing Cycle
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Usage Limits
    monthly_audio_hours_limit INTEGER, -- null for unlimited
    monthly_audio_hours_used DECIMAL(6,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    canceled_at TIMESTAMP WITH TIME ZONE
);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period ON subscriptions(current_period_start, current_period_end);

-- Usage Records table - tracks user usage for billing purposes
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Usage Information
    usage_type VARCHAR(50) NOT NULL, -- 'audio_processing', 'document_upload', 'api_call'
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- 'hours', 'minutes', 'mb', 'count'
    
    -- Billing Period
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Usage Records indexes
CREATE INDEX idx_usage_records_organization_id ON usage_records(organization_id);
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id);
CREATE INDEX idx_usage_records_session_id ON usage_records(session_id);
CREATE INDEX idx_usage_records_billing_period ON usage_records(billing_period_start, billing_period_end);
CREATE INDEX idx_usage_records_usage_type ON usage_records(usage_type);

-- =============================================================================
-- ANALYTICS & MONITORING TABLES
-- =============================================================================

-- User App Sessions table - tracks user application sessions for analytics
CREATE TABLE user_app_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session Information
    session_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    
    -- Geographic Data
    country_code VARCHAR(2),
    city VARCHAR(100),
    
    -- Session Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Page Views
    page_views INTEGER DEFAULT 0,
    
    -- Device Information
    device_type VARCHAR(20), -- 'desktop', 'tablet', 'mobile'
    browser VARCHAR(50),
    os VARCHAR(50)
);

-- User App Sessions indexes
CREATE INDEX idx_user_app_sessions_user_id ON user_app_sessions(user_id);
CREATE INDEX idx_user_app_sessions_started_at ON user_app_sessions(started_at);

-- System Logs table - stores application logs for debugging and monitoring
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Log Metadata
    level VARCHAR(10) NOT NULL, -- 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
    logger_name VARCHAR(100),
    message TEXT NOT NULL,
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Technical Details
    module VARCHAR(100),
    function_name VARCHAR(100),
    line_number INTEGER,
    exception_traceback TEXT,
    
    -- Request Context
    request_id VARCHAR(100),
    ip_address INET,
    endpoint VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Logs indexes
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_session_id ON system_logs(session_id);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_invitations_updated_at BEFORE UPDATE ON organization_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_context_updated_at BEFORE UPDATE ON session_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guidance_updated_at BEFORE UPDATE ON guidance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Check if a user is an active member of a given organization
CREATE OR REPLACE FUNCTION is_active_org_member(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_org_id
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION is_active_org_member(UUID, UUID) TO authenticated, anon, service_role;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on user-specific tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_checklist ENABLE ROW LEVEL SECURITY;

-- Plans table is public (read-only for all users)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Organization policies - users can only access organizations they're members of
CREATE POLICY organizations_policy ON organizations
    FOR ALL USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY organization_members_policy ON organization_members
    FOR ALL USING (
        user_id = auth.uid() AND status = 'active'
    );

CREATE POLICY organization_invitations_policy ON organization_invitations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
        ) OR 
        email = (SELECT email FROM users WHERE id = auth.uid())
    );

-- Users can only access their own data
-- Allow authenticated users to insert their own record and access their own data
CREATE POLICY users_policy ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_insert_policy ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY users_update_policy ON users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY users_delete_policy ON users
    FOR DELETE USING (auth.uid() = id);

CREATE POLICY sessions_policy ON sessions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY documents_policy ON documents
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY session_context_policy ON session_context
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY transcripts_policy ON transcripts
    FOR ALL USING (
        session_id IN (
            SELECT id FROM sessions 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

CREATE POLICY guidance_policy ON guidance
    FOR ALL USING (
        session_id IN (
            SELECT id FROM sessions 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

CREATE POLICY summaries_policy ON summaries
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Templates: users can access their own templates + organization templates + public templates
CREATE POLICY templates_policy ON templates
    FOR ALL USING (
        auth.uid() = user_id OR 
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        ) OR
        is_public = true OR 
        is_system_template = true
    );

CREATE POLICY subscriptions_policy ON subscriptions
    FOR ALL USING (
        auth.uid() = user_id OR
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY usage_records_policy ON usage_records
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY user_app_sessions_policy ON user_app_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Plans are readable by all authenticated users
CREATE POLICY plans_policy ON plans
    FOR SELECT USING (is_active = true);

-- Session timeline events can be accessed by organization members
CREATE POLICY session_timeline_events_policy ON session_timeline_events
    FOR ALL USING (
        session_id IN (
            SELECT id FROM sessions 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

-- Prep checklist items can be accessed by organization members
CREATE POLICY prep_checklist_policy ON prep_checklist
    FOR ALL USING (
        session_id IN (
            SELECT id FROM sessions 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

-- =============================================================================
-- INITIAL SYSTEM DATA
-- =============================================================================

-- Insert default plans
INSERT INTO plans (name, display_name, description, plan_type, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly, monthly_audio_hours_limit, max_documents_per_session, max_file_size_mb, max_sessions_per_month, max_organization_members, has_real_time_guidance, has_advanced_summaries, has_export_options, has_email_summaries, has_api_access, has_custom_templates, has_priority_support, has_analytics_dashboard, has_team_collaboration, ai_model_access, max_guidance_requests_per_session, summary_generation_priority, is_active, is_featured, sort_order)
VALUES 
-- Individual Plans
(
    'individual_free',
    'Individual Free',
    'Perfect for trying out LiveConvo with basic features',
    'individual',
    NULL, -- free
    NULL, -- free
    NULL,
    NULL,
    3, -- 3 hours per month
    5, -- max 5 documents per session
    10, -- max 10MB files
    10, -- max 10 sessions per month
    NULL, -- not applicable for individual plans
    true, -- has real-time guidance
    false, -- basic summaries only
    false, -- no export options
    false, -- no email summaries
    false, -- no API access
    false, -- no custom templates
    false, -- no priority support
    false, -- no analytics dashboard
    false, -- no team collaboration
    '["gpt-4o-mini"]'::jsonb,
    25, -- max 25 guidance requests per session
    3, -- low priority summaries
    true,
    false,
    1
),
(
    'individual_pro',
    'Individual Pro',
    'Unlimited conversations with advanced AI features for individuals',
    'individual',
    29.00,
    290.00, -- $290/year (2 months free)
    'price_individual_pro_monthly',
    'price_individual_pro_yearly',
    NULL, -- unlimited
    25, -- max 25 documents per session
    25, -- max 25MB files
    NULL, -- unlimited sessions
    NULL, -- not applicable for individual plans
    true, -- has real-time guidance
    true, -- has advanced summaries
    true, -- has export options
    true, -- has email summaries
    false, -- no API access
    true, -- has custom templates
    false, -- no priority support
    true, -- has analytics dashboard
    false, -- no team collaboration
    '["gpt-4o-mini", "gpt-4o"]'::jsonb,
    100, -- max 100 guidance requests per session
    2, -- medium priority summaries
    true,
    true, -- featured plan
    2
),
-- Organization Plans
(
    'org_starter',
    'Organization Starter',
    'Perfect for small teams getting started with LiveConvo',
    'organization',
    79.00,
    790.00, -- $790/year (2 months free)
    'price_org_starter_monthly',
    'price_org_starter_yearly',
    50, -- 50 hours per month shared across team
    15, -- max 15 documents per session
    25, -- max 25MB files
    NULL, -- unlimited sessions
    5, -- max 5 organization members
    true, -- has real-time guidance
    true, -- has advanced summaries
    true, -- has export options
    true, -- has email summaries
    false, -- no API access
    true, -- has custom templates
    false, -- no priority support
    true, -- has analytics dashboard
    true, -- has team collaboration
    '["gpt-4o-mini", "gpt-4o"]'::jsonb,
    100, -- max 100 guidance requests per session
    2, -- medium priority summaries
    true,
    false,
    3
),
(
    'org_professional',
    'Organization Professional',
    'Advanced features for growing teams and businesses',
    'organization',
    149.00,
    1490.00, -- $1490/year (2 months free)
    'price_org_professional_monthly',
    'price_org_professional_yearly',
    200, -- 200 hours per month shared across team
    50, -- max 50 documents per session
    100, -- max 100MB files
    NULL, -- unlimited sessions
    25, -- max 25 organization members
    true, -- has real-time guidance
    true, -- has advanced summaries
    true, -- has export options
    true, -- has email summaries
    true, -- has API access
    true, -- has custom templates
    true, -- has priority support
    true, -- has analytics dashboard
    true, -- has team collaboration
    '["gpt-4o-mini", "gpt-4o"]'::jsonb,
    200, -- max 200 guidance requests per session
    1, -- high priority summaries
    true,
    true, -- featured plan
    4
),
(
    'org_enterprise',
    'Organization Enterprise',
    'Custom solutions for large organizations with unlimited everything',
    'organization',
    499.00,
    4990.00, -- $4990/year (2 months free)
    'price_org_enterprise_monthly',
    'price_org_enterprise_yearly',
    NULL, -- unlimited hours
    NULL, -- unlimited documents per session
    500, -- max 500MB files
    NULL, -- unlimited sessions
    NULL, -- unlimited organization members
    true, -- has real-time guidance
    true, -- has advanced summaries
    true, -- has export options
    true, -- has email summaries
    true, -- has API access
    true, -- has custom templates
    true, -- has priority support
    true, -- has analytics dashboard
    true, -- has team collaboration
    '["gpt-4o-mini", "gpt-4o"]'::jsonb,
    500, -- max 500 guidance requests per session
    1, -- high priority summaries
    true,
    false,
    5
);

-- Insert default system templates
INSERT INTO templates (id, name, description, conversation_type, is_system_template, is_public, guidance_prompts, context_instructions, summary_template)
VALUES 
(
    gen_random_uuid(),
    'Sales Call - Discovery',
    'Template for initial sales discovery calls',
    'sales_call',
    true,
    true,
    '["Ask about their current challenges", "Identify decision makers", "Understand budget and timeline", "Clarify next steps"]'::jsonb,
    'Focus on understanding the prospect''s needs, pain points, and decision-making process. Be consultative and avoid being pushy.',
    'Sales Discovery Summary: {{title}} - {{date}}\n\nProspect: {{company_name}}\nKey Points:\n- Pain Points: {{pain_points}}\n- Budget: {{budget}}\n- Timeline: {{timeline}}\n- Decision Makers: {{decision_makers}}\n\nNext Steps:\n{{action_items}}'
),
(
    gen_random_uuid(),
    'Job Interview - Technical',
    'Template for technical job interviews',
    'interview',
    true,
    true,
    '["Ask about specific technologies used", "Inquire about team structure", "Understand company culture", "Discuss growth opportunities"]'::jsonb,
    'Focus on technical skills, cultural fit, and mutual alignment. Prepare thoughtful questions about the role and company.',
    'Interview Summary: {{position}} at {{company}} - {{date}}\n\nInterviewer: {{interviewer_name}}\nKey Discussion Points:\n- Technical Requirements: {{tech_requirements}}\n- Team Structure: {{team_info}}\n- Company Culture: {{culture_notes}}\n\nNext Steps:\n{{action_items}}'
),
(
    gen_random_uuid(),
    'Client Meeting - Project Review',
    'Template for client project review meetings',
    'meeting',
    true,
    true,
    '["Review project progress", "Address any blockers", "Discuss timeline adjustments", "Confirm next deliverables"]'::jsonb,
    'Keep the meeting focused on project status, deliverables, and any issues that need resolution. Document decisions clearly.',
    'Project Review: {{project_name}} - {{date}}\n\nAttendees: {{attendees}}\nProgress Update:\n{{progress_summary}}\n\nDecisions Made:\n{{decisions}}\n\nAction Items:\n{{action_items}}\n\nNext Meeting: {{next_meeting_date}}'
);

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'LiveConvo database schema setup completed successfully!';
    RAISE NOTICE 'Tables created: organizations, organization_members, organization_invitations, users, sessions, documents, transcripts, guidance, summaries, templates, plans, subscriptions, usage_records, user_app_sessions, system_logs';
    RAISE NOTICE 'Organization & Team Management System enabled with role-based access';
    RAISE NOTICE 'Row Level Security (RLS) enabled with organization-scoped policies';
    RAISE NOTICE 'Updated_at triggers configured for all tables';
    RAISE NOTICE 'Default plans inserted: Individual Free, Individual Pro, Organization Starter, Organization Professional, Organization Enterprise';
    RAISE NOTICE 'System templates inserted: Sales Discovery, Technical Interview, Project Review';
    RAISE NOTICE 'Ready for LiveConvo application deployment with full organization support!';
END $$; 