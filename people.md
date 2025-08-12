### People System Plan

This document defines the People data model and experience to track all members from calendar invites and meetings, deduplicate them, and surface person-centric activity in a People view. It integrates with existing tables such as `calendar_events`, `sessions`, `transcripts`, `report_activity`, `email_notifications`, and sharing artifacts.

---

### Objectives

- Build an organization-scoped People graph that:
  - Consolidates identities across emails and external providers
  - Auto-ingests from calendar and meeting participation
  - Shows person-centric activity (meetings, comments, shares, emails, action items)
  - Enables searching, filtering, tagging, and simple CRM-like notes
  - Enforces strict tenant isolation via RLS

---

### Key Requirements

- Organization isolation: a person lives in exactly one `organization_id`
- Robust deduplication: merge by normalized email and provider identities
- Multi-email support: one person can have many emails; one primary email
- External identities: store provider and external IDs (e.g., Google/Outlook attendee IDs, platform participant IDs)
- Backfill and continuous ingestion from:
  - `calendar_events.attendees` JSONB (Google/Outlook) with `organizer_email`, `is_organizer`
  - `sessions.participants` JSONB and `meeting_metadata` if present
  - Existing sharing/email tables: `shared_reports`, `email_notifications`, `summary_email_queue`
- First-class activity view aggregating:
  - Meeting attendance (from `session_participants`)
  - Report activity and comments when attributable by email/name
  - Shares sent to this person (by email)
  - Emails sent (post-call summaries, notifications)
  - Action items involving this person (owner/assignee heuristics)

---

### Proposed Data Model (Public Schema)

Note: Designed to align with existing patterns (UUID PKs, `created_at`/`updated_at`, org scoping, JSONB metadata, lower-cased uniqueness where relevant).

1) `people`

```
id                 uuid PK default gen_random_uuid()
organization_id    uuid NOT NULL FK → organizations(id)
full_name          varchar NULL
first_name         varchar NULL
last_name          varchar NULL
primary_email      varchar NULL  -- convenience copy of primary email
normalized_email   varchar NULL  -- lower(primary_email)
company            varchar NULL
title              varchar NULL
phone              varchar NULL
avatar_url         text NULL
linkedin_url       text NULL
tags               text[] DEFAULT '{}'
notes              text NULL
source             jsonb NULL     -- provenance, e.g., first seen from calendar/session
search_vector      tsvector NULL  -- name/email/company/title for quick search
created_at         timestamptz DEFAULT now()
updated_at         timestamptz DEFAULT now()
deleted_at         timestamptz NULL
```

Constraints/Indexes:
- Unique partial index on `(organization_id, normalized_email)` WHERE `normalized_email IS NOT NULL`
- GIN index on `tags`
- GIN or GIST index on `search_vector`
- Trigger to auto-fill `normalized_email = lower(primary_email)` and keep updated

2) `person_emails`

```
id                 uuid PK default gen_random_uuid()
person_id          uuid NOT NULL FK → people(id)
email              varchar NOT NULL
normalized_email   varchar NOT NULL  -- lower(email)
is_primary         boolean DEFAULT false
created_at         timestamptz DEFAULT now()
```

Constraints/Indexes:
- Unique on `(person_id, normalized_email)`
- Unique on `(person_id)` WHERE `is_primary = true`
- Helper index on `(normalized_email)` for fast reverse-lookup

3) `person_identities`

```
id                 uuid PK default gen_random_uuid()
person_id          uuid NOT NULL FK → people(id)
provider           varchar NOT NULL  -- 'google_calendar', 'microsoft_outlook', 'zoom', 'google_meet', 'teams', etc.
external_id        text NOT NULL     -- provider attendee/participant ID
metadata           jsonb NULL        -- raw fragments (e.g., response status)
created_at         timestamptz DEFAULT now()
```

Constraints/Indexes:
- Unique on `(provider, external_id)`
- Index on `(person_id)`

4) `session_participants`

Relational join between `sessions` and `people` representing actual meeting participation.

```
id                 uuid PK default gen_random_uuid()
session_id         uuid NOT NULL FK → sessions(id)
person_id          uuid NOT NULL FK → people(id)
email_at_event     varchar NULL      -- snapshot from source
name_at_event      varchar NULL
is_organizer       boolean NULL
attendee_status    varchar NULL      -- accepted, declined, tentative, needs_action
role               varchar NULL      -- owner, guest, panelist, etc. (free-form)
source             varchar NULL      -- 'calendar_events', 'sessions.participants', 'recall_ai', etc.
metadata           jsonb NULL
created_at         timestamptz DEFAULT now()
```

Constraints/Indexes:
- Unique on `(session_id, person_id)`
- Index on `(person_id)` and `(session_id)`

5) Optional helpers (phase 2+):
- `person_notes` (free-form internal notes per org)
- `people_merge_log` (audit for merges/splits)

---

### RLS and Security

Enable RLS on all new tables. Policies:
- Select/Insert/Update/Delete allowed only when the row `organization_id` is within the caller’s accessible organizations (existing org membership model)
- Deny cross-organization access
- CRUD enforcement via JWT claims / Supabase auth context, mirroring `sessions`/`organizations` patterns

Implementation Notes:
- For join table `session_participants`, join back to `sessions.organization_id` via FK to validate org membership in policies
- Use `SECURITY DEFINER` functions only if absolutely necessary (prefer row-wise policies)

---

### Ingestion & Backfill Plan

Data sources available now (from Dev schema via Supabase):
- `calendar_events` (JSONB `attendees`, `organizer_email`, `is_organizer`, `session_id`, `auto_session_id`)
- `sessions` (JSONB `participants`, `participant_me`, `participant_them`, `meeting_platform`)
- `meeting_metadata` (platform, meeting_id, host_id, participant_count)
- Sharing/Email: `shared_reports`, `email_notifications`, `summary_email_queue`
- Activity: `report_activity`, `report_comments`

Backfill Steps (idempotent):
1) Seed People from Calendar
   - For each `calendar_events` row:
     - Extract each attendee: name, email, response status, organizer flag
     - Upsert `people` by `(organization_id, lower(email))`
     - Upsert `person_emails` and set primary if missing
     - Insert `session_participants` when `calendar_events.session_id` or `auto_session_id` is present

2) Seed People from Sessions
   - For each `sessions` row:
     - Parse `participants` JSONB (if present) for names/emails
     - Also consider `participant_me` and `participant_them` fields
     - Upsert `people`/`person_emails` and link via `session_participants`

3) External Identities (when available)
   - If attendee objects include provider IDs, populate `person_identities`

4) Shares and Emails Attribution
   - For each `shared_reports` entry: if shared-with emails exist in JSON, relate those to `people` (by email) and record as activity events in the view (see below)
   - For each `email_notifications`/`summary_email_queue`: attribute to `people` by recipient email

5) Dedup & Merge
   - If multiple `people` records share the same `(organization_id, normalized_email)`, merge into one canonical record:
     - Move `person_emails` and `session_participants` to the survivor
     - Record merge in `people_merge_log` (phase 2)

Operational Considerations:
- Run backfill in batches to avoid long transactions
- Use `ON CONFLICT DO UPDATE` upserts and consistent normalization to ensure idempotency
- Add progress logging to a small checkpoint table or log channel

---

### Person Activity View

Create a Postgres VIEW `person_activity` that consolidates events into a timeline for each person. Suggested unions:

- Meetings attended:
  - SELECT from `session_participants` join `sessions` for timestamps/title/platform

- Shares and Access:
  - SELECT from `shared_reports` when a matching recipient email exists (directly or via email arrays)
  - SELECT from `sharing_activity` where `target_user_id` maps to a known user who belongs to the same org and shares email with the person (fallback by email if available)

- Email Sends:
  - SELECT from `email_notifications` where `recipient_email` matches any `person_emails.normalized_email`
  - SELECT from `summary_email_queue` by recipient

- Report Interactions:
  - SELECT from `report_activity` where we can attribute by user or guest fields when they match the person’s email/name (best-effort)

Schema sketch for the view (logical):

```
person_id, occurred_at, activity_type, source_table, source_id, title, description, metadata
```

Indexes:
- Materialized view (optional) with index on `(person_id, occurred_at DESC)` for fast timelines

---

### Search & Indexing

- Maintain `search_vector` on `people` from `full_name`, `primary_email`, `company`, `title`
- Add GIN index on `search_vector`
- Optional: enqueue embeddings into existing `embedding_queue` for semantic people search (phase 2)

---

### UI/UX Plan

Routes and Components (Next.js app):
- `frontend/src/app/dashboard/people/page.tsx`: People list with search, filters (tags, has activity, company domain), sort (recent activity, name), and pagination
- `frontend/src/app/dashboard/people/[id]/page.tsx`: Person detail
  - Header: avatar/initials, name, primary email, company/title, tags, quick actions
  - Tabs: Activity, Meetings, Notes, Shares & Emails
  - Right rail: Related action items and quick links

Shared Components:
- `frontend/src/components/dashboard/people/PeopleTable.tsx`
- `frontend/src/components/dashboard/people/PersonHeader.tsx`
- `frontend/src/components/dashboard/people/PersonActivity.tsx`

Design Notes:
- Theme-aware (dark/light) visuals
- Respect existing design system components under `frontend/src/components/ui`
- Fast search powered by server queries on `search_vector`

---

### API & Server

- Add API routes to list/search people, get person detail, and update tags/notes (RLS will enforce org access):
  - GET `/api/people` → list with query params (`q`, `tag`, `company_domain`, `has_activity`)
  - GET `/api/people/[id]` → detail + recent activity
  - PATCH `/api/people/[id]` → update `tags`, `notes`, profile fields

Server-Side Implementation:
- Use existing Supabase client pattern (RLS-respecting) and `auth` token from user session
- Keep responses paginated and cacheable where appropriate

---

### Migrations (Phase 1)

1) Create tables:
- `people`, `person_emails`, `person_identities`, `session_participants`
- Add indexes and triggers for normalization and search vector
- Enable RLS and add policies mirroring `sessions`/`organizations`

2) Backfill:
- Script to iterate `calendar_events` and `sessions` to upsert people and `session_participants`
- Attribute emails/shares for initial activity view

3) Views:
- `person_activity` view (or materialized view + refresh job)

4) Follow-ups:
- Optional: `person_notes`, `people_merge_log`
- Optional: embeddings via existing `embedding_queue`

---

### Rollout & QA

- Dev only first; verify dedupe correctness and org scoping
- Validate People list accuracy vs known calendars/sessions
- Check RLS: cross-org leakage tests
- Performance: indexes present, timeline queries <100ms on realistic data
- Backfill metrics & retry safety

---

### Risks & Mitigations

- Email-less attendees: create person with placeholder and identity record; later merge when email known
- Duplicate attendee variants (name-only vs email): rely on merge by email/identity and admin merge tooling (phase 2)
- Incomplete attribution in `report_activity`: treat as best-effort; improve incrementally

---

### Success Criteria

- 95%+ of meetings show correct participants in People
- Person detail timeline aggregating meetings, shares, and emails reliably
- Search returns expected people by name/email/company
- No cross-organization data access under RLS


