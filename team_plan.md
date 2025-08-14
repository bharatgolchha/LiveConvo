### Team Plan: Organization Members with Per-Seat Billing and Per-Member Quotas

#### Goals
- Enable organizations to add multiple members under one paid subscription.
- Charge the owner per seat; members inherit the plan features. Each member has their own usage quota.
- Support self-serve invites, acceptance, removal, and seat-count sync with Stripe.
- Enforce limits at both organization and member levels with monthly resets.

#### Existing Data Model Mapping
- Organizations: `public.organizations` (rls: ON)
- Members: `public.organization_members` (rls: ON) with roles: `owner | admin | member`
- Invites: `public.organization_invitations` (rls: OFF today → must enable)
- Invitation settings: `public.team_invitation_settings`
- Plans: `public.plans` (team pricing columns present)
- Subscription: `public.subscriptions` with `billing_type='team_seats'`, `quantity`=active seats
- Billing audit: `public.team_billing_events`, `public.subscription_events`
- Usage: `public.usage_tracking`, `public.usage_records`, member rollups on `organization_members`

#### Billing Model
- One active Stripe subscription per organization (owner’s Stripe customer) using team price.
- Subscription `quantity` equals number of active members including owner.
- Plan features and limits are pulled from `plans` and applied to members (unless member override is set in `organization_members`).
- Webhooks update `public.subscriptions.status/current_period_*` and log in `subscription_events`.

#### Invitation & Seat Lifecycle
1) Owner/admin creates invite: insert into `organization_invitations` with `role`, `token`, `expires_at` following `team_invitation_settings`.
2) Email sent to invitee with link containing `invitation_token`.
3) Accept:
   - If user exists: link to org via `organization_members` (status `active`).
   - If new user: create user, then link.
   - Increment `subscriptions.quantity`, upsert Stripe subscription quantity, insert `team_billing_events(seat_added)`.
   - Mark invite `status='accepted'`, set `accepted_by_user_id/accepted_at`.
4) Removal:
   - Set member `status='removed'` (or delete row if desired), decrement quantity, update Stripe, log `seat_removed`.

#### Quotas and Enforcement
- Effective per-member monthly limit (minutes) =
  `COALESCE(organization_members.monthly_audio_hours_limit*60,
            plans.monthly_audio_minutes_limit,
            organizations.monthly_audio_hours_limit*60)`
- Track live usage in `usage_tracking` and update `organization_members.current_month_minutes_used` on tick/end.
- Persist per-session records in `usage_records` with `subscription_id` for audit.
- Reset window uses `subscriptions.current_period_start/end`. Nightly job resets member counters when a new period begins.

#### Security and RLS
- Enable RLS on `public.organization_invitations` and `public.subscriptions`.
  - Invites: org owners/admins can create/read for their org; invitee can read by `invitation_token`.
  - Subscriptions: read for org admins; writes through service role or server-side only.
- Keep strict policies on `organization_members` and `organizations`.

#### Minimal DDL (to implement)
- RLS: enable + policies for `organization_invitations`, `subscriptions`.
- Constraints: `UNIQUE(organization_id, user_id)` on `organization_members`.
- Indexes: `organization_invitations(email)`, `organization_members(organization_id,status)`, `subscriptions(organization_id)`.

#### Server Endpoints
Implementation can be via Next.js Route Handlers or the Python FastAPI backend. Use Supabase service-role key on server only.
- POST `/api/team/invitations` → create invite
- GET `/api/team/invitations` → list invites (admins)
- POST `/api/team/accept` → accept invite by `token`
- POST `/api/team/remove` → remove member `{userId}`
- GET `/api/team/members` → list members, usage
- POST `/api/team/seat-sync` → reconcile Stripe quantity with DB

All write paths also update Stripe (quantity changes) and log to `team_billing_events`.

#### Frontend Changes
- Settings → Team tab:
  - Members table (name, email, role, status, usage, joined_at).
  - Invite modal (email, role, optional message); show domain auto-approve hint from `team_invitation_settings`.
  - Resend/cancel invite actions; remove member action with confirm.
- Invite acceptance page:
  - Validate token, sign in/up flow, join org, then redirect to dashboard.

#### Stripe Integration
- Prices: use `plans.team_stripe_price_id_monthly/yearly`.
- Seat changes: update Stripe subscription `quantity` on add/remove; consider proration settings.
- Webhooks consumed by Supabase Edge Function keep `public.subscriptions` in sync and append `subscription_events`.

#### Background Jobs
- Nightly: check for period rollover and reset `organization_members.current_month_minutes_used` and `current_month_start`.
- Weekly (optional): email owners a usage summary by member.

#### Testing
- Unit tests: invite creation/acceptance, member removal, quota calculation edge cases.
- Integration: Stripe seat sync on add/remove; webhook state sync.
- E2E: invite flow (new user, existing user), max seats, expired token, domain auto-approve.

#### Rollout Plan
1) Apply DDL + RLS policies in dev. 2) Implement server endpoints. 3) Build Team tab and invite UI. 4) Wire Stripe seat updates and webhooks. 5) Add jobs. 6) QA & E2E. 7) Roll to prod with feature flag.


