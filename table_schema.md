# LiveConvo Database Schema (Development)

_This schema documentation was auto-generated on **2025-07-21** using the Supabase management API for project `ucvfgfbjcrxbzppwjpuu`._  
_All tables live in PostgreSQL.  System schemas (`auth`, `storage`, `extensions`, `realtime`, `supabase_migrations`, `vault`, etc.) are retained by the platform and are **not** fully documented here._

---

## Schemas Overview

| Schema | Purpose | # Tables |
| ------ | ------- | -------- |
| **public** | Application data owned by LiveConvo | 80+ |
| **auth** | Supabase Auth internal data | 18 |
| **storage** | Supabase Storage buckets & objects | 4 |
| **realtime** | Channel / Presence support | 7 |
| _others…_ | Migrations, Vault secrets, pg-catalog, etc. | n/a |

> The remainder of this document focuses on the **public** schema tables that power the LiveConvo product.

---

## Public Schema — Core Tables

Below is a curated list of the most important application tables with their primary columns.  Nullable columns are italicised, defaults are shown in brackets.

### `users`
| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | PK, generated `gen_random_uuid()` |
| `email` | varchar | **unique** |
| _`full_name`_ | varchar |  |
| _`timezone`_ | varchar _(default `UTC`)_ |
| _`current_organization_id`_ | uuid | FK ⇒ `organizations(id)` |
| _`is_admin`_ | boolean _(default `false`)_ |
| _`created_at`_ | timestamptz _(default `now()`)_ |
| _`updated_at`_ | timestamptz |

### `organizations`
| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | PK |
| `name` | varchar | canonical, unique |
| _`display_name`_ | varchar |
| `slug` | varchar | unique |
| _`monthly_audio_hours_limit`_ | int |
| _`max_members`_ | int _(default `10`)_ |
| _`created_at`_ | timestamptz _(default `now()`)_ |

### `organization_members`
| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | PK |
| `organization_id` | uuid | FK ⇒ `organizations(id)` |
| `user_id` | uuid | FK ⇒ `users(id)` |
| _`role`_ | varchar _(member / admin)_ |
| _`status`_ | varchar _(active / invited / removed)_ |
| _`joined_at`_ | timestamptz _(default `now()`)_ |

### `plans`
Pricing plans used for both individual and org subscriptions.

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | PK |
| `name` | varchar | e.g. `pro`, `starter`, `max` |
| `plan_type` | varchar | `individual` \| `organization` |
| _`price_monthly`_ | numeric |
| _`price_yearly`_ | numeric |
| _feature flags…_ | bool | `has_real_time_guidance`, `has_priority_support`, etc. |

### `subscriptions`
Represents an active Stripe subscription (legacy — new data is in `active_user_subscriptions`).

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | PK |
| `user_id` / `organization_id` | uuid | Who the subscription belongs to |
| `plan_id` | uuid | FK ⇒ `plans(id)` |
| `status` | varchar | `active`, `canceled`, `trialing`, etc. |
| _`current_period_start`_ | timestamptz |
| _`current_period_end`_ | timestamptz |

### `sessions`
Represents a recorded / live call (meeting).

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | PK |
| `user_id` | uuid | Owner (host) |
| `organization_id` | uuid | |
| _`title`_ | varchar |
| _`status`_ | varchar _(draft / processing / complete)_ |
| _`recording_started_at`_ | timestamptz |
| _`recording_duration_seconds`_ | int |
| _`finalized_at`_ | timestamptz |

### `transcripts`
Raw ASR text chunks linked to a `session`.

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | PK |
| `session_id` | uuid | FK ⇒ `sessions(id)` |
| `content` | text | transcript fragment |
| _`speaker`_ | varchar _(user/participant/bot)_ |
| _`start_time_seconds`_ | numeric |
| _`sequence_number`_ | int |

### `summaries`
AI-generated post-conversation summaries & reports.

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | PK |
| `session_id` | uuid |
| `tldr` | text |
| _`key_decisions`_ | jsonb |
| _`action_items`_ | jsonb |
| _`generation_status`_ | varchar _(pending / success / error)_ |
| _`model_used`_ | varchar |
| _`created_at`_ | timestamptz |

### `smart_notes`
User / AI generated notes classified by category.

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid |
| `session_id` | uuid |
| `category` | varchar | `action_item`, `follow_up`, etc. |
| `content` | text |
| _`is_manual`_ | bool |

### `documents`
Files uploaded to enrich a conversation (PDF, Docx, etc.).

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid |
| `session_id` | uuid |
| `original_filename` | varchar |
| `file_type` | varchar |
| `file_size_bytes` | int |
| _`extracted_text`_ | text |
| _`processing_status`_ | varchar _(pending / complete / error)_ |

---

## Supporting Tables (public schema)

These tables store auxiliary data such as calendar integrations, usage tracking, referrals, and more.  See the database for full definitions.

```
active_user_subscriptions, beta_waitlist, bot_recordings, bot_usage_tracking,
calendar_auto_join_logs, calendar_connections, calendar_events, calendar_preferences,
collaborative_action_items, comment_mentions, custom_reports, email_notifications,
embedding_queue, guidance, integration_exports, integration_settings, meeting_metadata,
meeting_notifications, monthly_usage_cache, organization_invitations,
organization_shared_meetings, prep_checklist, referral_audit_logs,
referral_fraud_checks, report_activity, report_bookmarks, report_collaborators,
report_comments, session_context, session_timeline_events, shared_meetings,
shared_reports, sharing_activity, subscription_events, usage_records,
usage_tracking, user_app_sessions, user_credit_balance, user_credits, user_preferences,
user_referrals, webhook_dead_letter_queue, webhook_logs, webhook_retry_queue, system_logs
```

---

## Auth & Storage Schemas (brief)

* **auth.*** — Supabase authentication users, MFA, sessions, refresh tokens (managed by Supabase).  
* **storage.*** — Buckets & object metadata for file uploads.  
* **realtime.*** — Message log & subscriptions backing Supabase Realtime.

---

### Regenerating This Document

Run:

```sql
-- Example psql snippet
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

Or, with Supabase CLI:

```bash
supabase db diff --schema public
```

---

> **Note:** Column defaults and constraints have been simplified for readability.  Refer to the database directly for authoritative definitions (constraints, indexes, triggers, RLS policies, etc.). 