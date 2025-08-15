### Team Plan Implementation Checklist

#### Planning & Docs
- [x] Review `team_plan.md` and confirm scope with stakeholders
- [ ] Define exact Stripe price IDs for team monthly/yearly

#### Database & RLS
- [x] Enable RLS on `public.organization_invitations`
- [x] Add policies:
  - [x] Org admins can INSERT/SELECT/UPDATE/DELETE their org invites
  - [x] Invitee access via secure RPC `get_invitation_by_token(token)`
- [x] Enable RLS on `public.subscriptions`
- [x] Add policies:
  - [x] Org admins can SELECT their org subscription
  - [x] Writes only via service role (server)
- [x] Add constraint: UNIQUE(organization_id, user_id) on `organization_members`
- [x] Add indexes: invites(email), org_members(organization_id,status), subscriptions(organization_id)
- [x] Enforce mandatory org association for users (DB trigger to auto-create org + membership on user insert)

#### Backend Endpoints
- [x] POST `/api/team/invitations` (create invite)
- [x] GET `/api/team/invitations` (list)
- [x] POST `/api/team/accept` (accept via token)
- [x] POST `/api/team/remove` (remove member)
- [x] GET `/api/team/members` (list + usage)
- [x] POST `/api/team/seat-sync` (reconcile)
- [x] All write paths: update Stripe subscription quantity + log `team_billing_events`

#### Stripe Integration
- [ ] Store price IDs in `plans` and verify
- [ ] On seat add/remove: PATCH Stripe subscription `quantity`
- [ ] Webhooks: ensure `subscriptions` sync + add `subscription_events`
- [ ] Proration setting confirmed

#### Frontend
- [x] Settings → Team tab UI
  - [x] Members table (name, email, role, status, usage, joined_at)
  - [x] Invite modal (email, role, optional message)
  - [x] Resend/cancel invite; remove member
- [x] Invite acceptance page/flow
  - [x] Token validation, auth, join org, redirect

#### Usage & Quotas
- [ ] Implement effective quota calculation (plan/org/member overrides)
- [ ] Update `organization_members.current_month_minutes_used` on usage ticks
- [ ] Insert `usage_records` with `subscription_id` on session end
- [ ] Block new sessions when member over limit; friendly errors

#### Jobs
- [ ] Nightly reset on period rollover (based on `subscriptions.current_period_*`)
- [ ] Weekly usage summary email to owner (optional)

#### QA & Tests
- [ ] Unit tests: invite/accept/remove, quotas
- [ ] Integration tests: Stripe seat updates, webhooks
- [ ] E2E: full invite flows, expired token, max seats, domain auto-approve

#### Rollout
- [ ] Dev complete → Staging flag → Production deploy with feature flag


