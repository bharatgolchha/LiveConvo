# LiveConvo Database Schema

**Last Updated:** 2024-12-19  
**Database Status:** Completely cleared and fresh  
**Project:** VoiceConvo Dev (ucvfgfbjcrxbzppwjpuu)

## Overview
This document describes the complete database schema for LiveConvo, a real-time conversation AI coaching platform. The database supports user management, organizations, session management, real-time transcription, AI guidance, and comprehensive analytics.

## Core Tables

### 1. Users (`public.users`)
Central user management and authentication.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `email` | varchar(255) | - | Unique email address |
| `email_verified` | boolean | false | Email verification status |
| `full_name` | varchar(255) | - | User's full name |
| `timezone` | varchar(50) | 'UTC' | User's timezone |
| `password_hash` | varchar(255) | - | Hashed password |
| `google_id` | varchar(255) | - | Google OAuth ID |
| `last_login_at` | timestamptz | - | Last login timestamp |
| `has_completed_onboarding` | boolean | false | Onboarding completion status |
| `has_completed_organization_setup` | boolean | false | Organization setup completion |
| `default_microphone_id` | varchar(255) | - | Default microphone device |
| `default_speaker_id` | varchar(255) | - | Default speaker device |
| `is_active` | boolean | true | Account active status |
| `is_email_verified` | boolean | false | Email verification status |
| `current_organization_id` | uuid | - | FK to organizations |
| `personal_context` | text | - | User's personal context for AI |
| `is_admin` | boolean | false | Admin privileges flag |
| `stripe_customer_id` | varchar(255) | - | Stripe customer ID |
| `created_at` | timestamptz | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | timestamptz | CURRENT_TIMESTAMP | Last update timestamp |
| `deleted_at` | timestamptz | - | Soft deletion timestamp |

**Constraints:**
- Primary Key: `id`
- Unique: `email`, `google_id`
- Foreign Key: `current_organization_id` → `organizations(id)`

### 2. Organizations (`public.organizations`)
Multi-tenant organization management.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `name` | varchar(255) | - | Organization name |
| `display_name` | varchar(255) | - | Display name |
| `slug` | varchar(100) | - | Unique URL slug |
| `description` | text | - | Organization description |
| `website_url` | varchar(512) | - | Organization website |
| `contact_email` | varchar(255) | - | Contact email |
| `phone` | varchar(50) | - | Phone number |
| `address_line_1` | varchar(255) | - | Address line 1 |
| `address_line_2` | varchar(255) | - | Address line 2 |
| `city` | varchar(100) | - | City |
| `state_province` | varchar(100) | - | State/Province |
| `postal_code` | varchar(20) | - | Postal code |
| `country_code` | varchar(2) | - | Country code |
| `default_timezone` | varchar(50) | 'UTC' | Default timezone |
| `default_language` | varchar(10) | 'en' | Default language |
| `branding_logo_url` | varchar(512) | - | Logo URL |
| `branding_primary_color` | varchar(7) | - | Primary brand color |
| `tax_id` | varchar(100) | - | Tax ID |
| `billing_email` | varchar(255) | - | Billing email |
| `monthly_audio_hours_limit` | integer | - | Audio hours limit |
| `max_members` | integer | 10 | Maximum members |
| `max_sessions_per_month` | integer | - | Monthly session limit |
| `is_active` | boolean | true | Active status |
| `is_verified` | boolean | false | Verification status |
| `verification_requested_at` | timestamptz | - | Verification request time |
| `created_at` | timestamptz | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | timestamptz | CURRENT_TIMESTAMP | Last update timestamp |
| `deleted_at` | timestamptz | - | Soft deletion timestamp |

**Constraints:**
- Primary Key: `id`
- Unique: `slug`

### 3. Organization Members (`public.organization_members`)
User membership in organizations with role-based access.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `organization_id` | uuid | - | FK to organizations |
| `user_id` | uuid | - | FK to users |
| `role` | varchar(20) | 'member' | Member role |
| `permissions` | jsonb | '[]' | Permissions array |
| `status` | varchar(20) | 'active' | Membership status |
| `monthly_audio_hours_limit` | integer | - | Individual audio limit |
| `max_sessions_per_month` | integer | - | Individual session limit |
| `total_sessions_count` | integer | 0 | Total sessions count |
| `total_audio_hours_used` | numeric(6,2) | 0 | Total audio hours used |
| `last_session_at` | timestamptz | - | Last session timestamp |
| `joined_at` | timestamptz | CURRENT_TIMESTAMP | Join timestamp |
| `current_month_minutes_used` | integer | 0 | Current month usage |
| `current_month_start` | date | - | Current billing period start |
| `created_at` | timestamptz | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | timestamptz | CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- Primary Key: `id`
- Unique: `(organization_id, user_id)`
- Foreign Keys: `organization_id` → `organizations(id)`, `user_id` → `users(id)`

### 4. Sessions (`public.sessions`)
Core conversation session management.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | - | FK to users |
| `organization_id` | uuid | - | FK to organizations |
| `title` | varchar(255) | - | Session title |
| `conversation_type` | varchar(50) | - | Type of conversation |
| `status` | varchar(20) | 'draft' | Session status |
| `selected_template_id` | uuid | - | FK to templates |
| `audio_file_url` | varchar(512) | - | Audio file URL |
| `recording_duration_seconds` | integer | 0 | Recording duration |
| `recording_started_at` | timestamptz | - | Recording start time |
| `recording_ended_at` | timestamptz | - | Recording end time |
| `total_words_spoken` | integer | 0 | Total words count |
| `user_talk_time_seconds` | integer | 0 | User talk time |
| `silence_periods_count` | integer | 0 | Silence periods |
| `audio_deleted_at` | timestamptz | - | Audio deletion timestamp |
| `data_retention_days` | integer | 30 | Data retention period |
| `realtime_summary_cache` | jsonb | - | Cached real-time summary |
| `finalized_at` | timestamptz | - | Session finalization time |
| `created_at` | timestamptz | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | timestamptz | CURRENT_TIMESTAMP | Last update timestamp |
| `deleted_at` | timestamptz | - | Soft deletion timestamp |

**Constraints:**
- Primary Key: `id`
- Foreign Keys: `user_id` → `users(id)`, `organization_id` → `organizations(id)`, `selected_template_id` → `templates(id)`

### 5. Transcripts (`public.transcripts`)
Real-time speech-to-text transcription storage.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `session_id` | uuid | - | FK to sessions |
| `content` | text | - | Transcript content |
| `speaker` | varchar(50) | 'user' | Speaker identification |
| `confidence_score` | numeric(3,2) | - | STT confidence score |
| `start_time_seconds` | numeric(10,3) | - | Start time in session |
| `stt_provider` | varchar(50) | - | STT provider used |
| `is_final` | boolean | false | Final transcript flag |
| `client_id` | varchar(255) | - | Client identifier |
| `sequence_number` | integer | 1 | Sequence number |
| `created_at` | timestamptz | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | timestamptz | CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- Primary Key: `id`
- Foreign Key: `session_id` → `sessions(id)`

### 6. Guidance (`public.guidance`)
AI-generated real-time guidance and coaching.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `session_id` | uuid | - | FK to sessions |
| `content` | text | - | Guidance content |
| `guidance_type` | varchar(20) | - | Type of guidance |
| `priority` | integer | 1 | Priority level |
| `triggered_by_transcript_id` | uuid | - | FK to transcripts |
| `context_snippet` | text | - | Context that triggered guidance |
| `triggered_at_seconds` | numeric(10,3) | - | Trigger time in session |
| `was_displayed` | boolean | false | Display status |
| `was_clicked` | boolean | false | Click status |
| `was_dismissed` | boolean | false | Dismiss status |
| `user_feedback` | varchar(20) | - | User feedback |
| `model_used` | varchar(50) | - | AI model used |
| `prompt_template_id` | uuid | - | FK to templates |
| `processing_time_ms` | integer | - | Processing time |
| `created_at` | timestamptz | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | timestamptz | CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- Primary Key: `id`
- Foreign Keys: `session_id` → `sessions(id)`, `triggered_by_transcript_id` → `transcripts(id)`, `prompt_template_id` → `templates(id)`

### 7. Summaries (`public.summaries`)
AI-generated session summaries.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `session_id` | uuid | - | FK to sessions |
| `user_id` | uuid | - | FK to users |
| `organization_id` | uuid | - | FK to organizations |
| `title` | varchar(255) | - | Summary title |
| `tldr` | text | - | TL;DR summary |
| `key_decisions` | jsonb | - | Key decisions made |
| `action_items` | jsonb | - | Action items |
| `follow_up_questions` | jsonb | - | Follow-up questions |
| `conversation_highlights` | jsonb | - | Conversation highlights |
| `full_transcript` | text | - | Full transcript |
| `structured_notes` | text | - | Structured notes |
| `generation_status` | varchar(20) | 'pending' | Generation status |
| `generation_error` | text | - | Generation error |
| `model_used` | varchar(50) | - | AI model used |
| `generation_time_seconds` | numeric(6,2) | - | Generation time |
| `export_count` | integer | 0 | Export count |
| `last_exported_at` | timestamptz | - | Last export time |
| `is_marked_done` | boolean | false | Completion status |
| `created_at` | timestamptz | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | timestamptz | CURRENT_TIMESTAMP | Last update timestamp |
| `deleted_at` | timestamptz | - | Soft deletion timestamp |

**Constraints:**
- Primary Key: `id`
- Foreign Keys: `session_id` → `sessions(id)`, `user_id` → `users(id)`, `organization_id` → `organizations(id)`

## Supporting Tables

### Plans (`public.plans`)
Subscription plan definitions with features and limits.

### Subscriptions (`public.subscriptions`)
User/organization subscription management with Stripe integration.

### Templates (`public.templates`)
Reusable conversation templates and prompts.

### Documents (`public.documents`)
File uploads and document processing for sessions.

### Usage Tracking (`public.usage_tracking`)
Minute-by-minute usage tracking for billing.

### Monthly Usage Cache (`public.monthly_usage_cache`)
Aggregated monthly usage for performance.

### Organization Invitations (`public.organization_invitations`)
Invitation management for organization membership.

### Session Context (`public.session_context`)
Additional context and metadata for sessions.

### Prep Checklist (`public.prep_checklist`)
Session preparation checklists.

### Session Timeline Events (`public.session_timeline_events`)
Timeline events and milestones within sessions.

### System Logs (`public.system_logs`)
Application logging and debugging.

### User App Sessions (`public.user_app_sessions`)
User session tracking for analytics.

### Subscription Events (`public.subscription_events`)
Subscription change event logging.

### Beta Waitlist (`public.beta_waitlist`)
Beta program waitlist management.

## Key Relationships

1. **User ↔ Organization**: Many-to-many through `organization_members`
2. **Organization → Sessions**: One-to-many
3. **Session → Transcripts**: One-to-many (real-time)
4. **Session → Guidance**: One-to-many (real-time)
5. **Session → Summary**: One-to-one
6. **Session → Documents**: One-to-many
7. **Organization → Subscription**: One-to-one
8. **Subscription → Plan**: Many-to-one

## Data Flow

1. **Session Creation**: User creates session within organization
2. **Real-time Transcription**: Audio → Transcripts (continuous)
3. **AI Guidance**: Transcripts → Guidance (real-time)
4. **Session Finalization**: Session ends → Summary generation
5. **Usage Tracking**: Session activity → Usage records → Billing

## Database Status

- **Last Cleared**: 2024-12-19
- **Current State**: All tables empty (0 rows)
- **Ready For**: Fresh data insertion and testing 