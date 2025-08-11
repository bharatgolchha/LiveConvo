### Recall.ai Microsoft/Outlook Calendar Integration Checklist

Scope: Connect Microsoft/Outlook calendars via Recall.ai OAuth, persist connections/events in Supabase, and wire webhooks and syncing in the LiveConvo app.

Legend: [x] done, [ ] pending

#### 0) Groundwork
- [x] Create this checklist file (`recall_outlook_checklist.md`).
- [x] Confirm Recall dashboard has Microsoft OAuth Client ID and Client Secret saved.
- [x] Verify Supabase tables exist (`calendar_connections`, `calendar_events`, `calendar_webhooks`, `calendar_preferences`).
- [x] Draft implementation plan in this file.
- [x] Reviewed existing Google callback route and button locations (onboarding, settings) to mirror for Outlook.

#### 1) Azure app verification
- [ ] App registration supports: Accounts in any org directory + personal Microsoft accounts.
- [ ] API permission: Calendars.Read granted (admin consent if tenant requires).
- [ ] Scopes to request: `offline_access openid email https://graph.microsoft.com/Calendars.Read` (URL-encoded).
- [ ] Authorized redirect URI in Azure: `https://liveprompt.ai/api/calendar/auth/outlook/callback` (production) and staging URL.
- [ ] Remove `prompt=consent` once approved to avoid consent loop.

#### 2) Backend: per-user calendar auth token and authorize URL
- [x] Add endpoint: `GET /api/calendar/auth/outlook` (returns Microsoft auth URL)
  - Creates per-user Recall Calendar Auth Token (calendar_authenticate_create)
  - Builds Microsoft authorize URL with JSON `state` containing:
    - `recall_calendar_auth_token`
    - `ms_oauth_redirect_url` (callback on our domain)
    - optional `success_url`, `error_url`
  - Returns the authorize URL
  - [x] API-level guard: if an active connection exists for another provider, return 409

#### 3) Backend: Microsoft callback forwarder
- [x] Add route: `GET /api/ms_oauth_callback`
  - Forwards all query params to `https://us-east-1.recall.ai/api/v1/calendar/ms_oauth_callback/`
  - 307 redirect with original querystring
  - On recall redirect to `success_url`/`error_url`, surface result to UI

#### 4) Frontend: Connect button and flow
- [x] Add "Connect Outlook Calendar" button in settings/integrations page.
- [ ] On click: call authorize endpoint; redirect browser to returned Microsoft authorize URL.
- [ ] Post-success UI: show connected email, last sync time, toggle for auto-join preferences.
  - [x] UI guard: hide connect buttons when any calendar is already connected

#### 5) Persist connection and initial sync
- [ ] After success, fetch calendar metadata from Recall using the auth token.
- [ ] Upsert `calendar_connections` with: `provider=microsoft_outlook`, `recall_calendar_id`, `email`, `display_name`, `is_active=true`, `user_id`, `organization_id`.
- [ ] Initial events fetch via Recall events list API; insert/upsert into `calendar_events` (respect `is_deleted`).

Progress:
- [x] Callback handler implemented for Outlook (code exchange, Recall calendar creation, DB upsert)

#### 6) Webhooks
- [ ] Configure Recall webhooks to `https://yourdomain.com/api/webhooks/recall-calendar`.
- [ ] Handle `calendar.update`: re-fetch calendar to detect disconnects.
- [ ] Handle `calendar.sync_events`: incremental fetch using `updated_at__gte` from `last_updated_ts`.
- [ ] Log to `calendar_webhooks`; retry with backoff on failures.

#### 7) Preferences and auto-join
- [ ] Wire `calendar_preferences` UI: auto-join, join buffer, notifications, exclusions.
- [ ] Ensure event-level override `auto_join_enabled` respected.

#### 8) QA and monitoring
- [ ] Test: individual Microsoft account.
- [ ] Test: Azure AD work account with admin consent.
- [ ] Validate consent loop avoided (no `prompt=consent`).
- [ ] Error paths: `invalid_scope`, `invalid_grant`, missing `refresh_token` surfaced to UI.
- [ ] Add metrics and alerting for webhook failures and disconnects.

#### 9) Production readiness
- [ ] Verify domain ownership and redirect URIs in Azure.
- [ ] Staging and production keys configured in Recall dashboard.
- [ ] Documentation added to `CALENDAR_SETUP.md` and user help docs.

Notes
- Recall OAuth callback must be forwarded from our domain. The `state` must include `recall_calendar_auth_token` and `ms_oauth_redirect_url`.
- Recall sync window ~28 days; rely on `calendar.sync_events` webhook for updates and incremental fetches.


