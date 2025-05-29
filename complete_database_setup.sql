-- Complete LiveConvo Database Setup Script
-- Run this to create all tables in the correct dependency order

-- NOTE: Vector embedding columns are commented out because they require the pgvector extension.
-- To enable vector embeddings in the future, run: CREATE EXTENSION IF NOT EXISTS vector;
-- Then uncomment the text_embedding VECTOR(1536) columns.

-- ===========================
-- STEP 1: Core Foundation Tables (No Dependencies)
-- ===========================

-- Organizations table (foundation)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization Identity
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    slug VARCHAR(100) UNIQUE NOT NULL,
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
    branding_primary_color VARCHAR(7),
    
    -- Billing Information
    tax_id VARCHAR(100),
    billing_email VARCHAR(255),
    
    -- Organization Limits
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

-- Plans table (no dependencies)
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan Identity
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    plan_type VARCHAR(20) NOT NULL DEFAULT 'individual',
    
    -- Pricing
    price_monthly DECIMAL(8,2),
    price_yearly DECIMAL(8,2),
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    
    -- Usage Limits
    monthly_audio_hours_limit INTEGER,
    max_documents_per_session INTEGER DEFAULT 10,
    max_file_size_mb INTEGER DEFAULT 25,
    max_sessions_per_month INTEGER,
    max_organization_members INTEGER,
    
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
    ai_model_access JSONB DEFAULT '["gpt-4o-mini"]'::jsonb,
    max_guidance_requests_per_session INTEGER DEFAULT 50,
    summary_generation_priority INTEGER DEFAULT 3,
    
    -- Plan Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- STEP 2: Users Table (References Organizations)
-- ===========================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Profile Information
    full_name VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Authentication
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Organization Context
    current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
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

-- ===========================
-- STEP 3: Organization Membership Tables
-- ===========================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Member Role & Permissions
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Member Status
    status VARCHAR(20) DEFAULT 'active',
    
    -- Member Limits
    monthly_audio_hours_limit INTEGER,
    max_sessions_per_month INTEGER,
    
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

CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Invitation Details
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    personal_message TEXT,
    
    -- Invitation Token
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Invitation Status
    status VARCHAR(20) DEFAULT 'pending',
    accepted_by_user_id UUID REFERENCES users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- STEP 4: Subscriptions and Templates
-- ===========================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    
    -- Subscription Details
    plan_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    
    -- Billing Cycle
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Usage Limits
    monthly_audio_hours_limit INTEGER,
    monthly_audio_hours_used DECIMAL(6,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    canceled_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Template Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conversation_type VARCHAR(50),
    is_system_template BOOLEAN DEFAULT FALSE,
    is_organization_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Template Content
    guidance_prompts JSONB,
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

-- ===========================
-- STEP 5: Sessions Table (Core Conversation Data)
-- ===========================

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Session Metadata
    title VARCHAR(255),
    conversation_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'draft',
    
    -- Session Configuration
    selected_template_id UUID REFERENCES templates(id),
    
    -- Audio & Recording
    audio_file_url VARCHAR(512),
    recording_duration_seconds INTEGER DEFAULT 0,
    recording_started_at TIMESTAMP WITH TIME ZONE,
    recording_ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Session Statistics
    total_words_spoken INTEGER DEFAULT 0,
    user_talk_time_seconds INTEGER DEFAULT 0,
    silence_periods_count INTEGER DEFAULT 0,
    
    -- Real-time Cache
    realtime_summary_cache JSONB,
    
    -- Privacy & Retention
    audio_deleted_at TIMESTAMP WITH TIME ZONE,
    data_retention_days INTEGER DEFAULT 30,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ===========================
-- STEP 6: Session-Related Tables (Depend on Sessions)
-- ===========================

-- Session Context Table - THIS IS WHAT WE NEED!
CREATE TABLE IF NOT EXISTS session_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Context Content
    text_context TEXT,
    context_metadata JSONB,
    
    -- Context Processing
    processing_status VARCHAR(20) DEFAULT 'completed',
    processing_error TEXT,
    
    -- Vector embeddings for AI integration (future use)
    -- text_embedding VECTOR(1536), -- Commented out - requires pgvector extension
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_session_context UNIQUE(session_id)
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_url VARCHAR(512),
    
    -- Content Processing
    extracted_text TEXT,
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_error TEXT,
    
    -- Vector Embeddings
    embedding_status VARCHAR(20) DEFAULT 'pending',
    pinecone_vector_id VARCHAR(255),
    
    -- OCR Results
    ocr_confidence_score DECIMAL(3,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Transcript Content
    content TEXT NOT NULL,
    speaker VARCHAR(50) DEFAULT 'user',
    confidence_score DECIMAL(3,2),
    
    -- Timing Information
    start_time_seconds DECIMAL(10,3) NOT NULL,
    end_time_seconds DECIMAL(10,3),
    duration_seconds DECIMAL(8,3),
    
    -- Processing Metadata
    stt_provider VARCHAR(50),
    is_final BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guidance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Guidance Content
    content TEXT NOT NULL,
    guidance_type VARCHAR(20) NOT NULL,
    priority INTEGER DEFAULT 1,
    
    -- Context & Timing
    triggered_by_transcript_id UUID REFERENCES transcripts(id),
    context_snippet TEXT,
    triggered_at_seconds DECIMAL(10,3),
    
    -- User Interaction
    was_displayed BOOLEAN DEFAULT FALSE,
    was_clicked BOOLEAN DEFAULT FALSE,
    was_dismissed BOOLEAN DEFAULT FALSE,
    user_feedback VARCHAR(20),
    
    -- AI Model Information
    model_used VARCHAR(50),
    prompt_template_id UUID REFERENCES templates(id),
    processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Summary Content
    title VARCHAR(255),
    tldr TEXT,
    key_decisions JSONB,
    action_items JSONB,
    follow_up_questions JSONB,
    conversation_highlights JSONB,
    
    -- Full Content
    full_transcript TEXT,
    structured_notes TEXT,
    
    -- Generation Metadata
    generation_status VARCHAR(20) DEFAULT 'pending',
    generation_error TEXT,
    model_used VARCHAR(50),
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

-- ===========================
-- STEP 7: Analytics and Support Tables
-- ===========================

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Usage Information
    usage_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    
    -- Billing Period
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_app_sessions (
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
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Log Metadata
    level VARCHAR(10) NOT NULL,
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

CREATE TABLE IF NOT EXISTS session_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    importance VARCHAR(20) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- STEP 8: Add All Indexes
-- ===========================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_current_organization ON users(current_organization_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);

-- Organization invitations indexes
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_status ON organization_invitations(status);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_expires_at ON organization_invitations(expires_at);

-- Plans indexes
CREATE INDEX IF NOT EXISTS idx_plans_name ON plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_type ON plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON plans(sort_order);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period ON subscriptions(current_period_start, current_period_end);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_conversation_type ON templates(conversation_type);
CREATE INDEX IF NOT EXISTS idx_templates_is_system ON templates(is_system_template);
CREATE INDEX IF NOT EXISTS idx_templates_is_organization ON templates(is_organization_template);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_conversation_type ON sessions(conversation_type);

-- Session context indexes
CREATE INDEX IF NOT EXISTS idx_session_context_session_id ON session_context(session_id);
CREATE INDEX IF NOT EXISTS idx_session_context_user_id ON session_context(user_id);
CREATE INDEX IF NOT EXISTS idx_session_context_organization_id ON session_context(organization_id);
CREATE INDEX IF NOT EXISTS idx_session_context_processing_status ON session_context(processing_status);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_session_id ON documents(session_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);

-- Transcripts indexes
CREATE INDEX IF NOT EXISTS idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_start_time ON transcripts(start_time_seconds);
CREATE INDEX IF NOT EXISTS idx_transcripts_is_final ON transcripts(is_final);

-- Guidance indexes
CREATE INDEX IF NOT EXISTS idx_guidance_session_id ON guidance(session_id);
CREATE INDEX IF NOT EXISTS idx_guidance_type ON guidance(guidance_type);
CREATE INDEX IF NOT EXISTS idx_guidance_triggered_at ON guidance(triggered_at_seconds);
CREATE INDEX IF NOT EXISTS idx_guidance_was_displayed ON guidance(was_displayed);

-- Summaries indexes
CREATE INDEX IF NOT EXISTS idx_summaries_session_id ON summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_organization_id ON summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_summaries_status ON summaries(generation_status);
CREATE INDEX IF NOT EXISTS idx_summaries_marked_done ON summaries(is_marked_done);

-- Usage records indexes
CREATE INDEX IF NOT EXISTS idx_usage_records_organization_id ON usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_subscription_id ON usage_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_session_id ON usage_records(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_billing_period ON usage_records(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_usage_records_usage_type ON usage_records(usage_type);

-- User app sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_app_sessions_user_id ON user_app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_app_sessions_started_at ON user_app_sessions(started_at);

-- System logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_session_id ON system_logs(session_id);

-- Timeline events indexes
CREATE INDEX IF NOT EXISTS idx_session_timeline_events_session_id ON session_timeline_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_timeline_events_event_timestamp ON session_timeline_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_timeline_events_type ON session_timeline_events(type);
CREATE INDEX IF NOT EXISTS idx_session_timeline_events_importance ON session_timeline_events(importance);

-- ===========================
-- STEP 9: Add Update Triggers (if function exists)
-- ===========================

DO $$
BEGIN
    -- Check if update function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        -- Add triggers for tables with updated_at columns
        
        -- Organizations
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_organizations_updated_at') THEN
            CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Users
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_users_updated_at') THEN
            CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Organization members
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_organization_members_updated_at') THEN
            CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Organization invitations
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_organization_invitations_updated_at') THEN
            CREATE TRIGGER update_organization_invitations_updated_at BEFORE UPDATE ON organization_invitations
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Plans
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_plans_updated_at') THEN
            CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Subscriptions
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_subscriptions_updated_at') THEN
            CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Templates
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_templates_updated_at') THEN
            CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Sessions
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_sessions_updated_at') THEN
            CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Session context
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_session_context_updated_at') THEN
            CREATE TRIGGER update_session_context_updated_at BEFORE UPDATE ON session_context
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Documents
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_documents_updated_at') THEN
            CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Transcripts
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_transcripts_updated_at') THEN
            CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Guidance
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_guidance_updated_at') THEN
            CREATE TRIGGER update_guidance_updated_at BEFORE UPDATE ON guidance
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
        -- Summaries
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_summaries_updated_at') THEN
            CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        
    END IF;
END $$;

-- ===========================
-- STEP 10: Enable RLS and Add Policies
-- ===========================

-- Enable RLS for all user-facing tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_timeline_events ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies (organization-based access)
DO $$
BEGIN
    -- Organizations policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'organizations_policy') THEN
        CREATE POLICY organizations_policy ON organizations
            FOR ALL USING (
                id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;

    -- Users policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_policy') THEN
        CREATE POLICY users_policy ON users
            FOR ALL USING (id = auth.uid());
    END IF;

    -- Organization members policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_members' AND policyname = 'organization_members_policy') THEN
        CREATE POLICY organization_members_policy ON organization_members
            FOR ALL USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;

    -- Organization invitations policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_invitations' AND policyname = 'organization_invitations_policy') THEN
        CREATE POLICY organization_invitations_policy ON organization_invitations
            FOR ALL USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;

    -- Subscriptions policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'subscriptions_policy') THEN
        CREATE POLICY subscriptions_policy ON subscriptions
            FOR ALL USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
                OR user_id = auth.uid()
            );
    END IF;

    -- Templates policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'templates_policy') THEN
        CREATE POLICY templates_policy ON templates
            FOR ALL USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
                OR user_id = auth.uid()
                OR is_public = true
            );
    END IF;

    -- Sessions policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'sessions_policy') THEN
        CREATE POLICY sessions_policy ON sessions
            FOR ALL USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;

    -- Session context policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_context' AND policyname = 'session_context_policy') THEN
        CREATE POLICY session_context_policy ON session_context
            FOR ALL USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;

    -- Documents policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_policy') THEN
        CREATE POLICY documents_policy ON documents
            FOR ALL USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;

    -- Transcripts policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transcripts' AND policyname = 'transcripts_policy') THEN
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
    END IF;

    -- Guidance policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'guidance' AND policyname = 'guidance_policy') THEN
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
    END IF;

    -- Summaries policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'summaries' AND policyname = 'summaries_policy') THEN
        CREATE POLICY summaries_policy ON summaries
            FOR ALL USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;

    -- Usage records policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_records' AND policyname = 'usage_records_policy') THEN
        CREATE POLICY usage_records_policy ON usage_records
            FOR ALL USING (
                organization_id IN (
                    SELECT organization_id 
                    FROM organization_members 
                    WHERE user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;

    -- User app sessions policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_app_sessions' AND policyname = 'user_app_sessions_policy') THEN
        CREATE POLICY user_app_sessions_policy ON user_app_sessions
            FOR ALL USING (user_id = auth.uid());
    END IF;

    -- Session timeline events policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_timeline_events' AND policyname = 'session_timeline_events_policy') THEN
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
    END IF;

END $$; 