# LiveConvo Database Schema Documentation

This document provides a comprehensive overview of the LiveConvo database schema, organized by functional areas.

## Core User & Organization Management

### users
**Purpose**: Central user table storing user profiles and authentication data
- **Primary Key**: `id` (UUID)
- **Key Columns**:
  - `email` (UNIQUE) - User's email address
  - `full_name` - User's display name
  - `google_id` (UNIQUE) - OAuth Google integration
  - `current_organization_id` - FK to organizations
  - `personal_context` - User-defined context for AI personalization
  - `is_admin` - Admin privileges flag
  - `stripe_customer_id` - Billing integration
  - `use_case` - User's primary use case
  - `referral_code` (UNIQUE) - User's referral code
  - `referred_by_user_id` - FK to referring user
- **Relationships**: References organizations, has many sessions, organization_members, etc.

### organizations
**Purpose**: Multi-tenant organization management
- **Primary Key**: `id` (UUID)
- **Key Columns**:
  - `name`, `display_name`, `slug` (UNIQUE)
  - `description`, `website_url`, `contact_email`
  - `max_members`, `monthly_audio_hours_limit`
  - `branding_logo_url`, `branding_primary_color`
- **Features**: RLS enabled for multi-tenancy

### organization_members
**Purpose**: User-organization membership with roles and limits
- **Primary Key**: `id` (UUID)
- **Key Columns**:
  - `organization_id`, `user_id` (FK composite)
  - `role` - Member role (member, admin, etc.)
  - `permissions` (JSONB) - Granular permissions
  - `monthly_audio_hours_limit`, `current_month_minutes_used`
- **Features**: RLS enabled, usage tracking

### organization_invitations
**Purpose**: Invitation system for organization membership
- **Key Columns**:
  - `invitation_token` (UNIQUE) - Secure invitation link
  - `email`, `role`, `expires_at`
  - `status` - pending, accepted, declined

## Session & Meeting Management

### sessions
**Purpose**: Core conversation/meeting sessions
- **Primary Key**: `id` (UUID)
- **Key Columns**:
  - `user_id`, `organization_id` (FK)
  - `title`, `conversation_type`, `status`
  - `meeting_url`, `meeting_platform` (zoom, google_meet, teams, local)
  - `recording_duration_seconds`, `participant_me`, `participant_them`
  - `recall_bot_id`, `recall_recording_id` - Recall.ai integration
  - `bot_recording_minutes`, `bot_billable_amount`
  - `ai_instructions` - Custom AI behavior instructions
  - `participants` (JSONB) - Calendar participant data
  - `visibility` - private, organization, shared
  - `title_embedding` (halfvec) - Vector embeddings for search
- **Features**: RLS enabled, vector search, real-time updates

### transcripts
**Purpose**: Real-time transcription data
- **Primary Key**: `id` (UUID)
- **Key Columns**:
  - `session_id` (FK)
  - `content` - Transcribed text
  - `speaker`, `confidence_score`
  - `start_time_seconds`, `end_time_seconds`, `duration_seconds`
  - `sequence_number` - Ordering within session
  - `is_owner` - Whether speaker is meeting organizer
- **Features**: Real-time streaming, speaker identification

### meeting_metadata
**Purpose**: Enhanced meeting context and metadata
- **Key Columns**:
  - `session_id` (FK)
  - `platform`, `meeting_id`, `host_id`
  - `participant_count`, `meeting_agenda`
  - `metadata` (JSONB) - Flexible additional data

## AI & Content Generation

### summaries
**Purpose**: AI-generated meeting summaries and insights
- **Primary Key**: `id` (UUID)
- **Key Columns**:
  - `session_id`, `user_id`, `organization_id` (FK)
  - `title`, `tldr`, `structured_notes`
  - `key_decisions`, `action_items`, `follow_up_questions` (JSONB)
  - `conversation_highlights` (JSONB)
  - `generation_status`, `model_used`
  - `content_embedding` (halfvec) - Vector search
- **Features**: RLS enabled, vector embeddings

### guidance
**Purpose**: Real-time AI guidance during conversations
- **Key Columns**:
  - `session_id`, `triggered_by_transcript_id` (FK)
  - `content`, `guidance_type`, `priority`
  - `was_displayed`, `was_clicked`, `was_dismissed`
  - `user_feedback`, `model_used`

### smart_notes
**Purpose**: AI-generated and manual notes with categorization
- **Key Columns**:
  - `session_id`, `user_id`, `organization_id` (FK)
  - `category` - key_point, action_item, decision, question, insight
  - `content`, `importance` (high, medium, low)
  - `is_manual` - User-created vs AI-generated

### custom_reports
**Purpose**: User-generated custom AI reports
- **Key Columns**:
  - `session_id`, `user_id` (FK)
  - `prompt` - User's custom prompt
  - `template` - Report template type
  - `generated_content` - AI-generated markdown content

## Templates & Configuration

### templates
**Purpose**: Conversation templates and AI prompts
- **Key Columns**:
  - `user_id`, `organization_id` (FK)
  - `name`, `description`, `conversation_type`
  - `is_system_template`, `is_organization_template`, `is_public`
  - `guidance_prompts` (JSONB), `context_instructions`
  - `usage_count`, `last_used_at`

### plans
**Purpose**: Subscription plan definitions
- **Key Columns**:
  - `name` (UNIQUE), `display_name`, `plan_type`
  - `price_monthly`, `price_yearly`
  - `stripe_price_id_monthly`, `stripe_price_id_yearly`
  - `monthly_audio_hours_limit`, `monthly_bot_minutes_limit`
  - Feature flags: `has_real_time_guidance`, `has_advanced_summaries`, etc.
  - `ai_model_access` (JSONB) - Available AI models

## Billing & Subscriptions

### subscriptions
**Purpose**: User/organization subscription management
- **Key Columns**:
  - `organization_id`, `user_id`, `plan_id` (FK)
  - `stripe_customer_id`, `stripe_subscription_id` (UNIQUE)
  - `status`, `current_period_start`, `current_period_end`
  - `monthly_audio_hours_used`

### subscription_events
**Purpose**: Subscription lifecycle event tracking
- **Key Columns**:
  - `user_id`, `organization_id`, `subscription_id` (FK)
  - `event_type`, `metadata` (JSONB)

### user_credits
**Purpose**: User credit system for referrals and redemptions
- **Key Columns**:
  - `user_id` (FK), `amount`, `type` (referral_reward, redemption)
  - `stripe_customer_balance_txn_id`
  - `expires_at`, `expiry_warning_sent`

## Usage Tracking & Analytics

### usage_tracking
**Purpose**: Minute-by-minute recording usage tracking
- **Key Columns**:
  - `organization_id`, `user_id`, `session_id` (FK)
  - `minute_timestamp`, `seconds_recorded` (0-60)
  - `source` - browser_recording, etc.

### monthly_usage_cache
**Purpose**: Cached monthly usage summaries
- **Key Columns**:
  - `organization_id`, `user_id` (FK)
  - `month_year`, `total_minutes_used`, `total_seconds_used`

### bot_usage_tracking
**Purpose**: Recall.ai bot usage and billing tracking
- **Key Columns**:
  - `bot_id` (UNIQUE), `session_id`, `user_id`, `organization_id` (FK)
  - `recording_started_at`, `recording_ended_at`
  - `total_recording_seconds`, `billable_minutes`
  - `status` (recording, completed, failed)

### usage_records
**Purpose**: Historical usage records for billing
- **Key Columns**:
  - `organization_id`, `user_id`, `session_id`, `subscription_id` (FK)
  - `usage_type`, `quantity`, `unit`
  - `billing_period_start`, `billing_period_end`

## Calendar Integration

### calendar_connections
**Purpose**: OAuth calendar integrations (Google, Outlook)
- **Key Columns**:
  - `user_id`, `organization_id` (FK)
  - `provider` (google_calendar, microsoft_outlook)
  - `recall_calendar_id` (UNIQUE), `oauth_refresh_token`
  - `email`, `display_name`, `is_active`

### calendar_events
**Purpose**: Synced calendar events with auto-join capabilities
- **Key Columns**:
  - `calendar_connection_id`, `session_id`, `auto_session_id` (FK)
  - `external_event_id`, `title`, `description`
  - `start_time`, `end_time`, `meeting_url`
  - `attendees` (JSONB), `organizer_email`, `is_organizer`
  - `bot_scheduled`, `bot_id`, `auto_bot_status`
  - `auto_join_enabled` - Per-event override

### calendar_preferences
**Purpose**: User auto-join and notification preferences
- **Key Columns**:
  - `user_id` (FK, UNIQUE)
  - `auto_join_enabled`, `join_buffer_minutes`
  - `auto_record_enabled`, `notify_before_join`
  - `excluded_keywords`, `included_domains` (Arrays)

### calendar_auto_join_logs
**Purpose**: Auto-join action logging and debugging
- **Key Columns**:
  - `user_id`, `calendar_event_id`, `session_id` (FK)
  - `bot_id`, `action`, `status`
  - `error_message`, `metadata` (JSONB)

### calendar_webhooks
**Purpose**: Calendar webhook event processing
- **Key Columns**:
  - `calendar_connection_id` (FK)
  - `event_type`, `payload` (JSONB)
  - `processed_at`, `error`

### meeting_notifications
**Purpose**: Meeting-related notifications
- **Key Columns**:
  - `user_id`, `calendar_event_id`, `session_id` (FK)
  - `notification_type` (meeting_starting, bot_deployed, etc.)
  - `title`, `message`, `action_url`

## Collaboration & Sharing

### shared_reports
**Purpose**: Public/private report sharing
- **Key Columns**:
  - `session_id`, `user_id` (FK)
  - `share_token` (UNIQUE) - Public access token
  - `shared_tabs` (Array) - Which sections to share
  - `expires_at`, `accessed_count`
  - `share_with_participants`, `excluded_participants`
  - `email_send_status` (JSONB)

### shared_meetings
**Purpose**: Direct user-to-user meeting sharing
- **Key Columns**:
  - `session_id`, `shared_by`, `shared_with` (FK)
  - `share_type` (view, context, full)
  - `permissions` (JSONB), `expires_at`

### organization_shared_meetings
**Purpose**: Organization-wide meeting sharing
- **Key Columns**:
  - `session_id`, `organization_id`, `shared_by` (FK)
  - `share_scope` (organization, team, role)
  - `team_ids`, `role_names` (Arrays)

### sharing_activity
**Purpose**: Audit log for sharing actions
- **Key Columns**:
  - `session_id`, `user_id` (FK)
  - `action` (shared, unshared, accessed, permissions_changed)
  - `target_user_id`, `target_organization_id`
  - `details` (JSONB)

### report_comments
**Purpose**: Collaborative commenting on reports
- **Key Columns**:
  - `session_id`, `user_id`, `parent_comment_id` (FK)
  - `content`, `selected_text`, `section_id`
  - `is_resolved`, `reactions` (JSONB)
  - `guest_id`, `guest_name` - Guest user support

### report_collaborators
**Purpose**: Report collaboration invitations
- **Key Columns**:
  - `shared_report_id`, `session_id`, `user_id` (FK)
  - `user_email`, `role` (viewer, commenter, editor)
  - `invited_by`, `accepted_at`

### collaborative_action_items
**Purpose**: Enhanced task management with assignments
- **Key Columns**:
  - `session_id`, `created_by`, `assigned_to`, `completed_by` (FK)
  - `source_type` (ai_generated, comment, manual)
  - `title`, `description`, `priority`, `status`
  - `due_date`, `completed_at`

### report_bookmarks
**Purpose**: User bookmarks within reports
- **Key Columns**:
  - `session_id`, `user_id` (FK)
  - `title`, `section_id`, `content_snippet`
  - `color`, `position_data` (JSONB)

### comment_mentions
**Purpose**: User mentions in comments
- **Key Columns**:
  - `comment_id`, `mentioned_user_id` (FK)
  - `is_read`, `read_at`

### report_activity
**Purpose**: Real-time activity feed for reports
- **Key Columns**:
  - `session_id`, `user_id` (FK)
  - `activity_type` (viewed, commented, task_created, etc.)
  - `details` (JSONB)

## Referral System

### user_referrals
**Purpose**: User referral tracking and rewards
- **Key Columns**:
  - `referrer_id`, `referee_id` (FK)
  - `referee_email`, `status` (pending, completed, rewarded, expired)
  - `reward_amount`, `discount_percentage`
  - `stripe_customer_id`, `stripe_payment_intent_id`
  - `ip_address`, `device_id` - Fraud prevention

### referral_audit_logs
**Purpose**: Comprehensive referral event tracking
- **Key Columns**:
  - `event_type` (ENUM: link_clicked, signup_completed, etc.)
  - `user_id`, `referrer_id`, `referee_id`, `referral_id` (FK)
  - `referral_code`, `ip_address`, `device_id`
  - `event_data` (JSONB), `error_message`

### referral_fraud_checks
**Purpose**: Fraud detection for referral system
- **Key Columns**:
  - `user_id` (FK), `device_id`, `ip_address`
  - `card_fingerprint`, `check_type`, `flagged`

## Content Management

### documents
**Purpose**: Document upload and processing
- **Key Columns**:
  - `session_id`, `user_id`, `organization_id` (FK)
  - `original_filename`, `file_type`, `file_size_bytes`
  - `extracted_text`, `processing_status`
  - `pinecone_vector_id` - Vector database integration

### session_context
**Purpose**: Additional context and metadata per session
- **Key Columns**:
  - `session_id` (FK, UNIQUE), `user_id`, `organization_id` (FK)
  - `text_context`, `context_metadata` (JSONB)
  - `processing_status`

### conversation_links
**Purpose**: Linking related conversations/sessions
- **Key Columns**:
  - `session_id`, `linked_session_id` (FK)

### prep_checklist
**Purpose**: Pre-meeting preparation checklists
- **Key Columns**:
  - `session_id`, `created_by` (FK)
  - `text`, `status` (open, done)

## Integration & External Services

### integration_settings
**Purpose**: External service integration configurations
- **Key Columns**:
  - `user_id`, `organization_id` (FK)
  - `provider` (slack, hubspot, salesforce)
  - `config` (JSONB) - Encrypted configuration
  - `is_active`

### integration_exports
**Purpose**: Export tracking to external systems
- **Key Columns**:
  - `user_id`, `session_id` (FK)
  - `provider`, `status` (success, failed, pending)
  - `export_id`, `url`, `error`

### recall_ai_webhooks
**Purpose**: Recall.ai webhook event processing
- **Key Columns**:
  - `session_id` (FK), `bot_id`, `event_type`
  - `event_data` (JSONB), `processed`

### bot_recordings
**Purpose**: Bot recording metadata and URLs
- **Key Columns**:
  - `session_id`, `bot_id`, `recording_id` (FK)
  - `recording_url`, `recording_status`
  - `recording_expires_at`, `duration_seconds`

## System Administration

### system_logs
**Purpose**: Application logging and debugging
- **Key Columns**:
  - `level`, `logger_name`, `message`
  - `user_id`, `session_id` (FK)
  - `module`, `function_name`, `line_number`
  - `exception_traceback`, `request_id`

### system_settings
**Purpose**: Global system configuration
- **Key Columns**:
  - `key` (PRIMARY KEY), `value` (JSONB)

### beta_waitlist
**Purpose**: Beta user waitlist management
- **Key Columns**:
  - `name`, `email` (UNIQUE), `company`
  - `use_case`, `status` (pending, approved, rejected, invited)
  - `referral_source`, `interest_level`

### user_app_sessions
**Purpose**: User session tracking for analytics
- **Key Columns**:
  - `user_id` (FK), `session_token` (UNIQUE)
  - `ip_address`, `user_agent`, `device_type`
  - `started_at`, `last_activity_at`, `duration_seconds`

### session_timeline_events
**Purpose**: Session event timeline tracking
- **Key Columns**:
  - `session_id` (FK), `event_timestamp`
  - `title`, `description`, `type`, `importance`

## Webhook & Queue Management

### webhook_retry_queue
**Purpose**: Webhook retry mechanism with exponential backoff
- **Key Columns**:
  - `webhook_type`, `event_type`, `url`
  - `payload` (JSONB), `retry_count`, `max_retries`
  - `next_retry_at`, `status`

### webhook_dead_letter_queue
**Purpose**: Failed webhooks after max retries
- **Key Columns**:
  - `original_webhook_id` (FK), `webhook_type`, `event_type`
  - `retry_count`, `errors` (JSONB)

### webhook_logs
**Purpose**: Webhook processing logs
- **Key Columns**:
  - `event_type`, `event_id`, `status`
  - `payload` (JSONB), `error_message`

### embedding_queue
**Purpose**: Vector embedding generation queue
- **Key Columns**:
  - `table_name`, `record_id`, `content`
  - `embedding_column`, `user_id`
  - `status` (pending, processing, completed, failed)

## Email & Notifications

### email_notifications
**Purpose**: Email notification queue and tracking
- **Key Columns**:
  - `session_id`, `user_id` (FK)
  - `email_type`, `recipient_email`
  - `status`, `error_message`, `sent_at`

### user_preferences
**Purpose**: User notification and email preferences
- **Key Columns**:
  - `user_id` (FK, UNIQUE)
  - `email_notifications_enabled`, `email_post_call_summary`
  - `email_weekly_digest`, `email_important_insights`

## Key Features & Capabilities

### Multi-Tenancy
- RLS (Row Level Security) enabled on most user-facing tables
- Organization-based data isolation
- Flexible permission system

### Real-Time Features
- Vector embeddings for semantic search (halfvec columns)
- Real-time subscriptions for live updates
- WebSocket support for live transcription

### AI & ML Integration
- OpenRouter API for AI functionality
- Vector search capabilities
- Embeddings for semantic matching
- Custom AI instructions per session

### Calendar Integration
- Google Calendar and Microsoft Outlook support
- Auto-join meeting capabilities
- Webhook-based event synchronization

### Billing & Usage Tracking
- Stripe integration for payments
- Minute-level usage tracking
- Credit system for referrals
- Comprehensive billing event tracking

### Collaboration Features
- Real-time commenting and mentions
- Meeting sharing with granular permissions
- Activity feeds and notifications
- Guest user support

### External Integrations
- Recall.ai for meeting bots and recordings
- Slack, HubSpot, Salesforce export capabilities
- Webhook system for third-party integrations

This schema supports a comprehensive conversation intelligence platform with multi-tenant architecture, real-time collaboration, AI-powered insights, and extensive integration capabilities. 