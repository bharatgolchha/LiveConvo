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
    
    -- Onboarding & Preferences
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Conversation Chains
Manages multi-session conversations and their overall context.

```sql
CREATE TABLE conversation_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Chain Metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    conversation_type VARCHAR(50), -- 'sales_call', 'interview', 'meeting', 'consultation'
    
    -- Chain Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'archived'
    total_sessions INTEGER DEFAULT 0,
    
    -- Overall Context
    shared_context TEXT, -- persistent context across sessions
    participant_names JSONB, -- array of participant names
    key_topics JSONB, -- array of key conversation topics
    
    -- Chain Statistics
    total_duration_seconds INTEGER DEFAULT 0,
    total_words_spoken INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_session_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_conversation_chains_user_id ON conversation_chains(user_id);
CREATE INDEX idx_conversation_chains_status ON conversation_chains(status);
CREATE INDEX idx_conversation_chains_type ON conversation_chains(conversation_type);
CREATE INDEX idx_conversation_chains_last_session ON conversation_chains(last_session_at);
```

### Sessions
Manages conversation sessions and their metadata.

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session Metadata
    title VARCHAR(255),
    conversation_type VARCHAR(50), -- 'sales_call', 'interview', 'meeting', 'consultation'
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'
    
    -- Conversation Chain Management
    conversation_chain_id UUID REFERENCES conversation_chains(id),
    parent_session_id UUID REFERENCES sessions(id), -- for direct session continuations
    session_sequence_number INTEGER DEFAULT 1, -- order within conversation chain
    
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

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_conversation_type ON sessions(conversation_type);
CREATE INDEX idx_sessions_conversation_chain ON sessions(conversation_chain_id);
CREATE INDEX idx_sessions_parent_session ON sessions(parent_session_id);
```

### Documents
Stores uploaded context files and their processed content.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
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
    stt_provider VARCHAR(50), -- 'openai_realtime', 'whisper', 'assembly_ai'
    is_final BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX idx_transcripts_start_time ON transcripts(start_time_seconds);
CREATE INDEX idx_transcripts_is_final ON transcripts(is_final);
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
Stores post-session summaries and action items with support for conversation chains.

```sql
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    conversation_chain_id UUID REFERENCES conversation_chains(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Summary Type & Scope
    summary_type VARCHAR(20) DEFAULT 'session', -- 'session', 'chain', 'cumulative'
    includes_previous_sessions BOOLEAN DEFAULT FALSE,
    session_range_start INTEGER, -- first session sequence number included
    session_range_end INTEGER, -- last session sequence number included
    
    -- Summary Content
    title VARCHAR(255),
    tldr TEXT,
    key_decisions JSONB, -- array of decision strings with session attribution
    action_items JSONB, -- array of action item objects with priorities and sessions
    follow_up_questions JSONB, -- array of follow-up questions
    conversation_highlights JSONB, -- key moments across sessions
    
    -- Evolution Tracking
    progress_since_last_session TEXT, -- what changed/progressed
    new_topics_introduced JSONB, -- topics not covered in previous sessions
    recurring_themes JSONB, -- themes that appear across multiple sessions
    
    -- Full Content
    full_transcript TEXT,
    structured_notes TEXT,
    session_comparison TEXT, -- differences/evolution from previous sessions
    
    -- Context Integration
    previous_session_references JSONB, -- references to relevant previous content
    carry_forward_items JSONB, -- action items and decisions from previous sessions
    context_continuity_score DECIMAL(3,2), -- how well context was maintained (0-1)
    
    -- Generation Metadata
    generation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
    generation_error TEXT,
    model_used VARCHAR(50), -- 'gpt-4o', 'gpt-4o-mini'
    generation_time_seconds DECIMAL(6,2),
    context_tokens_used INTEGER, -- tokens used from previous sessions
    
    -- Export & Sharing
    export_count INTEGER DEFAULT 0,
    last_exported_at TIMESTAMP WITH TIME ZONE,
    is_marked_done BOOLEAN DEFAULT FALSE,
    
    -- Auto-generation Settings
    auto_generate_chain_summary BOOLEAN DEFAULT TRUE,
    include_session_count_in_summary INTEGER DEFAULT 3, -- how many previous sessions to include
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_summaries_session_id ON summaries(session_id);
CREATE INDEX idx_summaries_chain_id ON summaries(conversation_chain_id);
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_summaries_type ON summaries(summary_type);
CREATE INDEX idx_summaries_status ON summaries(generation_status);
CREATE INDEX idx_summaries_marked_done ON summaries(is_marked_done);
CREATE INDEX idx_summaries_auto_generate ON summaries(auto_generate_chain_summary);
```

### Templates
Manages conversation templates and AI guidance cue sets.

```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- null for system templates
    
    -- Template Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conversation_type VARCHAR(50), -- 'sales_call', 'interview', 'meeting', 'consultation'
    is_system_template BOOLEAN DEFAULT FALSE,
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
CREATE INDEX idx_templates_conversation_type ON templates(conversation_type);
CREATE INDEX idx_templates_is_system ON templates(is_system_template);
CREATE INDEX idx_templates_is_public ON templates(is_public);
```

---

## Billing & Subscription Tables

### Subscriptions
Manages user subscription plans and billing.

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    
    -- Subscription Details
    plan_name VARCHAR(50) NOT NULL, -- 'free', 'pro', 'team'
    plan_type VARCHAR(20) NOT NULL, -- 'monthly', 'yearly'
    status VARCHAR(20) NOT NULL, -- 'active', 'past_due', 'canceled', 'unpaid'
    
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

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period ON subscriptions(current_period_end);
```

### Usage Tracking
Tracks detailed usage for billing and analytics.

```sql
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Usage Details
    usage_type VARCHAR(50) NOT NULL, -- 'audio_processing', 'ai_guidance', 'summary_generation'
    quantity DECIMAL(10,3) NOT NULL, -- hours for audio, count for AI calls
    unit VARCHAR(20) NOT NULL, -- 'hours', 'calls', 'tokens'
    
    -- Billing Period
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    
    -- Cost Calculation
    unit_price_cents INTEGER,
    total_cost_cents INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
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
- **Users** → **Conversation Chains** (1:many)
- **Users** → **Sessions** (1:many)
- **Users** → **Subscriptions** (1:many, but typically 1:1 for latest)
- **Conversation Chains** → **Sessions** (1:many)
- **Sessions** → **Sessions** (1:many, via parent_session_id for direct continuations)
- **Sessions** → **Documents** (1:many)
- **Sessions** → **Transcripts** (1:many)
- **Sessions** → **Guidance** (1:many)
- **Sessions** → **Summaries** (1:many, session-level summaries)
- **Conversation Chains** → **Summaries** (1:many, chain-level summaries)
- **Users** → **Templates** (1:many)
- **Templates** → **Sessions** (1:many, via selected_template_id)

### Foreign Key Constraints
All foreign keys include appropriate CASCADE/SET NULL policies:
- User deletion cascades to all user-owned data
- Session deletion cascades to related transcripts, guidance, documents
- Soft deletes used for user-facing data (users, sessions, summaries, templates)

---

## Summary Generation System

### Overview
LiveConvo's summary system supports both individual session summaries and comprehensive conversation chain summaries that maintain context across multiple related sessions.

### Summary Types

#### 1. Session Summary (`summary_type = 'session'`)
- Generated after each individual session ends
- Contains standard summary elements (TL;DR, action items, key decisions)
- Links to a single `session_id`
- Generated within 30 seconds of session completion

#### 2. Chain Summary (`summary_type = 'chain'`)
- Generated periodically for ongoing conversation chains
- Aggregates insights across multiple sessions in the chain
- Tracks conversation evolution and progress over time
- Links to `conversation_chain_id` with `session_range_start` and `session_range_end`

#### 3. Cumulative Summary (`summary_type = 'cumulative'`)
- Comprehensive summary including context from previous sessions
- Generated when a new session starts that references previous sessions
- Includes `carry_forward_items` and `previous_session_references`
- Helps maintain conversation continuity

### Auto-Generation Logic

```sql
-- Trigger conditions for automatic summary generation:

-- 1. Session Summary: Always generated when session status = 'completed'
-- 2. Chain Summary: Generated when total_sessions % 3 = 0 (every 3 sessions)
-- 3. Cumulative Summary: Generated when includes_previous_sessions = TRUE

-- Example: User sets up new session with "Continue previous conversation"
-- System automatically:
-- 1. Creates/updates conversation_chain if needed
-- 2. Links session to chain with incremented sequence_number
-- 3. Generates cumulative summary including last N sessions (configurable)
-- 4. Provides AI guidance with full chain context
```

### Context Integration Features

#### Conversation Continuity
- **Previous Session References**: Automatically link to relevant moments from earlier sessions
- **Carry Forward Items**: Action items and decisions from previous sessions are tracked
- **Context Continuity Score**: AI-calculated score (0-1) measuring how well context was maintained

#### Evolution Tracking
- **Progress Since Last Session**: What was accomplished or changed
- **New Topics Introduced**: Topics not covered in previous sessions
- **Recurring Themes**: Patterns that emerge across multiple sessions

#### Smart Context Window
- Uses `include_session_count_in_summary` (default: 3) to limit context window
- Prioritizes recent sessions but includes key decisions from entire chain
- Optimizes token usage while maintaining conversation coherence

### Implementation Workflow

```
1. Session Ends → Session Summary Generated
2. If part of chain → Update chain statistics
3. If chain milestone → Generate chain summary  
4. If user starts new session → Check for chain continuation
5. If continuation → Generate cumulative summary with context
6. Provide AI guidance with full chain awareness
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