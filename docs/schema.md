# LiveConvo Database Schema

## Overview

This document defines the complete database schema for LiveConvo, supporting user authentication, session management, context processing, real-time transcription, AI guidance, and billing functionality.

## Schema Conventions

- **Primary Keys**: `id` (UUID v4)
- **Foreign Keys**: `{table_name}_id` 
- **Timestamps**: `created_at`, `updated_at` (always included)
- **Soft Delete**: `deleted_at` (nullable timestamp)
- **Naming**: `snake_case` for all tables and columns
- **Boolean Flags**: `is_active`, `has_*`, `can_*`

---

## Core Tables

### Organizations
Manages company/team information and settings.

```sql
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

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);
CREATE INDEX idx_organizations_created_at ON organizations(created_at);
```

### Organization Members
Manages user membership in organizations with role-based access.

```sql
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

CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);
CREATE INDEX idx_organization_members_status ON organization_members(status);
```

### Organization Invitations
Manages pending invitations to join organizations.

```sql
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

CREATE INDEX idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX idx_organization_invitations_token ON organization_invitations(invitation_token);
CREATE INDEX idx_organization_invitations_status ON organization_invitations(status);
CREATE INDEX idx_organization_invitations_expires_at ON organization_invitations(expires_at);
```

### Users
Manages user accounts, authentication, and profile information.

```sql
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
    
    -- Organization Context
    current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    personal_context TEXT, -- User-defined personal context for AI guidance
    
    -- Onboarding & Preferences
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    has_completed_organization_setup BOOLEAN DEFAULT FALSE,
    default_microphone_id VARCHAR(255),
    default_speaker_id VARCHAR(255),
    
    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE, -- Admin privileges flag
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(255) UNIQUE, -- Stripe customer ID for billing
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_current_organization ON users(current_organization_id);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Sessions
Manages individual conversation sessions and their metadata. Each session is completely independent.

```sql
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
    
    -- Real-time Cache
    realtime_summary_cache JSONB, -- Stores the latest ConversationSummary object from real-time processing
    
    -- Privacy & Retention
    audio_deleted_at TIMESTAMP WITH TIME ZONE,
    data_retention_days INTEGER DEFAULT 30,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_organization_id ON sessions(organization_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_conversation_type ON sessions(conversation_type);
```

### Session Context
Stores text context data and metadata for individual sessions.

```sql
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

CREATE INDEX idx_session_context_session_id ON session_context(session_id);
CREATE INDEX idx_session_context_user_id ON session_context(user_id);
CREATE INDEX idx_session_context_organization_id ON session_context(organization_id);
CREATE INDEX idx_session_context_processing_status ON session_context(processing_status);
```

### Documents
Stores uploaded context files and their processed content.

```sql
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

CREATE INDEX idx_documents_session_id ON documents(session_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_organization_id ON documents(organization_id);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_processing_status ON documents(processing_status);
```

### Transcripts
Stores real-time transcript data with timestamps.

```sql
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
    client_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX idx_transcripts_start_time ON transcripts(start_time_seconds);
CREATE INDEX idx_transcripts_is_final ON transcripts(is_final);
CREATE UNIQUE INDEX unique_session_start_time ON transcripts(session_id, start_time_seconds);
CREATE INDEX idx_transcripts_client_id ON transcripts(client_id);
```

### Guidance
Stores AI-generated guidance chips and their context.

```sql
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

CREATE INDEX idx_guidance_session_id ON guidance(session_id);
CREATE INDEX idx_guidance_type ON guidance(guidance_type);
CREATE INDEX idx_guidance_triggered_at ON guidance(triggered_at_seconds);
CREATE INDEX idx_guidance_was_displayed ON guidance(was_displayed);
```

### Summaries
Stores post-session summaries and action items for individual sessions.

```sql
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

CREATE INDEX idx_summaries_session_id ON summaries(session_id);
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_summaries_organization_id ON summaries(organization_id);
CREATE INDEX idx_summaries_status ON summaries(generation_status);
CREATE INDEX idx_summaries_marked_done ON summaries(is_marked_done);
```

### Templates
Manages conversation templates and AI guidance cue sets.

```sql
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

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_organization_id ON templates(organization_id);
CREATE INDEX idx_templates_conversation_type ON templates(conversation_type);
CREATE INDEX idx_templates_is_system ON templates(is_system_template);
CREATE INDEX idx_templates_is_organization ON templates(is_organization_template);
CREATE INDEX idx_templates_is_public ON templates(is_public);
```

---

## Billing & Subscription Tables

### Plans
Defines available subscription plans and their features.

```sql
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

CREATE INDEX idx_plans_name ON plans(name);
CREATE INDEX idx_plans_type ON plans(plan_type);
CREATE INDEX idx_plans_is_active ON plans(is_active);
CREATE INDEX idx_plans_sort_order ON plans(sort_order);
```

### Subscriptions
Manages user subscription plans and billing.

```sql
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

CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period ON subscriptions(current_period_start, current_period_end);
```

### Usage Tracking
Tracks detailed usage for billing and analytics.

```sql
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

CREATE INDEX idx_usage_records_organization_id ON usage_records(organization_id);
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id);
CREATE INDEX idx_usage_records_session_id ON usage_records(session_id);
CREATE INDEX idx_usage_records_billing_period ON usage_records(billing_period_start, billing_period_end);
CREATE INDEX idx_usage_records_usage_type ON usage_records(usage_type);
```

---

## Analytics & Monitoring Tables

### User Sessions (App Analytics)
Tracks user application sessions for analytics.

```sql
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

CREATE INDEX idx_user_app_sessions_user_id ON user_app_sessions(user_id);
CREATE INDEX idx_user_app_sessions_started_at ON user_app_sessions(started_at);
```

### System Logs
Stores application logs for debugging and monitoring.

```sql
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

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_session_id ON system_logs(session_id);
```

---

## Relationships Summary

### Primary Relationships
- **Organizations** → **Organization Members** (1:many)
- **Organizations** → **Organization Invitations** (1:many) 
- **Organizations** → **Sessions** (1:many)
- **Organizations** → **Subscriptions** (1:1, for organization plans)
- **Users** → **Organization Members** (1:many, user can be in multiple orgs)
- **Users** → **Sessions** (1:many)
- **Users** → **Subscriptions** (1:many, for individual plans)
- **Plans** → **Subscriptions** (1:many)
- **Sessions** → **Documents** (1:many)
- **Sessions** → **Transcripts** (1:many)
- **Sessions** → **Guidance** (1:many)
- **Sessions** → **Summaries** (1:1, each session has one summary)
- **Users** → **Templates** (1:many, personal templates)
- **Organizations** → **Templates** (1:many, organization templates)
- **Templates** → **Sessions** (1:many, via selected_template_id)

### Foreign Key Constraints
All foreign keys include appropriate CASCADE/SET NULL policies:
- Organization deletion cascades to all organization-owned data (sessions, members, subscriptions)
- User deletion cascades to user-specific data but preserves organization data
- Session deletion cascades to related transcripts, guidance, documents, and summaries
- Organization member removal updates user's current_organization_id if applicable
- Soft deletes used for user-facing data (users, organizations, sessions, summaries, templates)

---

## Organization & Team Management System

### Overview
LiveConvo supports both individual users and organizations. Organizations allow teams to collaborate, share billing, and manage user access with role-based permissions.

### Organization Structure

#### Organization Types
- **Individual Users**: Can create sessions without an organization (individual subscription)
- **Organizations**: Teams with shared billing, templates, and member management

#### Member Roles
- **Owner**: Full organization access, billing management, can delete organization
- **Admin**: Can manage members, templates, and organization settings (not billing)
- **Member**: Can create sessions and use organization templates

#### Subscription Models
- **Individual Subscriptions**: User-based billing for personal use
- **Organization Subscriptions**: Organization-based billing shared across all members

### Organization Workflow
```
1. User signs up → Creates individual account
2. User creates organization → Becomes organization owner
3. Owner invites team members → Sends email invitations
4. Members accept invitations → Join organization with assigned role
5. Organization subscribes to plan → Shared limits across all members
6. Members create sessions → Usage tracked at organization level
```

### Data Isolation
- Users can only access data from their current organization
- Organization switching updates user's current_organization_id
- Row Level Security (RLS) enforces organization boundaries
- Sessions, documents, and summaries are organization-scoped

### Usage Tracking
- **Individual Limits**: Can be set per member within organization limits
- **Organization Limits**: Shared across all organization members
- **Billing**: Organization-level subscription covers all members
- **Analytics**: Usage reports available at both individual and organization level

---

## Summary Generation System

### Overview
LiveConvo's summary system generates comprehensive summaries for individual conversation sessions, providing users with clear, actionable insights from their conversations.

### Session Summary Generation
- **Automatic Generation**: Summaries are generated within 30 seconds of session completion
- **Content Structure**: Each summary includes TL;DR, key decisions, action items, follow-up questions, and conversation highlights
- **One-to-One Relationship**: Each session has exactly one summary
- **Export Ready**: Summaries can be exported in multiple formats (PDF, Word, Text, JSON)

### Summary Components

#### Core Content
- **TL;DR**: Brief executive summary of the conversation
- **Key Decisions**: Important decisions made during the session
- **Action Items**: Tasks and commitments with priorities
- **Follow-up Questions**: Suggested questions for future conversations
- **Conversation Highlights**: Key moments and insights from the session

#### Metadata
- **Generation Status**: Tracks summary generation progress
- **AI Model Used**: Records which AI model generated the summary
- **Export Tracking**: Monitors summary sharing and export activity
- **Completion Status**: Allows users to mark summaries as complete

### Implementation Workflow
```
1. Session Ends (status = 'completed')
2. Summary Generation Triggered Automatically
3. AI processes full transcript and context
4. Summary saved to database
5. User notified of completion
6. Summary available for review and export
```

---

## Data Retention & Privacy

### Automatic Cleanup
1. **Audio files**: Deleted after summary generation (24-48 hours)
2. **Raw transcripts**: Retained for 30 days by default
3. **User data**: Soft deleted, hard deleted after 90 days
4. **System logs**: Retained for 30 days
5. **Usage records**: Retained for 7 years (billing compliance)

### GDPR Compliance
- All user data can be exported via API
- Hard deletion removes all user traces
- Processing logs maintain audit trail
- Consent tracking for data processing

---

**Schema Version**: 1.0  
**Last Updated**: 2025-01-27  
**Next Review**: Before Sprint 1 development begins 

### Session Timeline Events
Stores chronological timeline events for a session, generated during real-time analysis.

```sql
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

CREATE INDEX idx_session_timeline_events_session_id ON session_timeline_events(session_id);
CREATE INDEX idx_session_timeline_events_event_timestamp ON session_timeline_events(event_timestamp DESC);
CREATE INDEX idx_session_timeline_events_type ON session_timeline_events(type);
CREATE INDEX idx_session_timeline_events_importance ON session_timeline_events(importance);
``` 