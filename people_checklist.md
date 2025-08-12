### People System: Phase-Based Checklist

This checklist operationalizes the plan in `people.md`. We will complete one phase at a time, validating at each gate before proceeding.

---

### Phase 0 — Planning (COMPLETE)
- [x] Create `people.md` with end-to-end plan (schema, RLS, backfill, views, API/UI)
- [x] Add task entry in `TASK.md` for People system

Gate: Document reviewed; sources and tables confirmed against Dev schema

---

### Phase 1 — Dev Schema (Tables, Indexes, RLS)
- [x] Write migration (Dev) to create:
  - [x] `people`
  - [x] `person_emails`
  - [x] `person_identities`
  - [x] `session_participants`
  - [x] Indexes + triggers (email normalization, search_vector on `people`)
- [x] Enable RLS and add policies (org-scoped access) on all new tables
- [x] Apply migration (Dev) via Supabase
- [ ] Validate:
  - [ ] RLS blocks cross-org access
  - [ ] Inserts/selects work within org
  - [ ] Indexes present; `EXPLAIN` shows usage on simple lookups

Gate: All DDL applied cleanly in Dev; basic CRUD under RLS verified

---

### Phase 2 — Dev Backfill (Calendar + Sessions)
- [x] Implement idempotent backfill to upsert `people` and `session_participants` from:
  - [x] `calendar_events.attendees`, `organizer_email`, `is_organizer`, and `session_id`/`auto_session_id`
  - [x] `sessions.participants`, `participant_me`, `participant_them`
- [x] Populate `person_emails` (set one primary if none)
- [ ] (Optional) Populate `person_identities` when provider IDs available
- [x] Run backfill (Dev); capture counts and sample rows
- [x] Re-run backfill to confirm idempotency (no duplicates)

Note: In current Dev data, no `session_participants` were created because there are no events linked to sessions (`session_id`/`auto_session_id`) and no qualifying `sessions.participants`/`participant_me/them` that map to existing `people`. Logic is in place and idempotent; future data will populate automatically when present.

Gate: >90% of recent sessions show correct people; re-run is no-op

---

### Phase 3 — Dev Views (Person Activity)
- [x] Create `person_calendar_attendance` and `person_calendar_stats` views
- [x] Create `person_activity` VIEW aggregating:
  - [x] Meetings attended (derived from `calendar_events.attendees`)
  - [x] Emails sent (`email_notifications`, `summary_email_queue` by recipient)
  - [x] Shares (emails) from `shared_reports.email_send_status` (keys mapped to people)
  - [ ] Report interactions (`report_activity` / comments/bookmarks) — deferred until mapping is finalized
- [x] Add supporting indexes
- [x] Validate timeline queries and performance

Gate: Views validated with counts; API consuming views implemented

Gate: Activity view returns expected timeline for sampled people

---

### Phase 4 — Dev API
- [x] Implement API routes (RLS-respecting):
  - [x] GET `/api/people` (list/search with `q`, pagination)
  - [x] GET `/api/people/[id]` (detail + stats + recent activity)
  - [x] PATCH `/api/people/[id]` (update tags/notes/profile fields)
  - [ ] Add unit tests (expected, edge, failure cases)
  - [x] Validate auth and pagination

Gate: API passes tests; manual spot checks successful

---

### Phase 5 — Dev UI/UX
- [ ] People list page: `frontend/src/app/dashboard/people/page.tsx`
  - [ ] Search, filters, sort, pagination
  - [ ] Tag chips; empty states and skeletons
- [ ] Person detail page: `frontend/src/app/dashboard/people/[id]/page.tsx`
  - [ ] Header (avatar/initials, name, primary email, company/title, tags)
  - [ ] Tabs: Activity, Meetings, Notes, Shares & Emails
  - [ ] Right rail: related action items, quick links
- [ ] Theme-aware visuals (dark/light)
- [ ] Add minimal Cypress/Playwright or React Testing Library coverage

Gate: UX reviewed; core flows work in Dev

---

### Phase 6 — Production Rollout
- [ ] Prepare Prod migration script (same as Dev)
- [ ] Apply DDL (Prod) via Supabase
- [ ] Run backfill in controlled batches; record metrics
- [ ] Post-apply checks (RLS, indexes, sampling data)
- [ ] Feature flag or staged release for UI

Gate: Production data correct; no access leakage; UI enabled for all

---

### Phase 7 — Analytics & Monitoring
- [ ] Add lightweight metrics: counts of people per org, recent additions, activity events per day
- [ ] Add error logging around API/backfill
- [ ] Optional: periodic view refresh if materialized

Gate: Dashboards/logs show healthy ingestion and usage

---

### Phase 8 — Documentation & Maintenance
- [ ] Update `README.md` and internal docs (usage, APIs, maintenance, merge policy)
- [ ] Add admin playbook for dedup/merge procedures (phase 2 feature)
- [ ] Add entries to `TASK.md` “Discovered During Work” as needed

Gate: Docs reviewed; maintenance steps clear


