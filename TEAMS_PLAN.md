# LivePrompt.ai Teams System Implementation Plan

## Overview
Implement a comprehensive team/seat-based billing system where users can invite team members via email. Each team member gets the same plan benefits as the organization owner, and billing is based on the number of seats.

## Current System Analysis

### Existing Infrastructure
- ✅ Organizations table with multi-member support
- ✅ Organization Members with role system (owner, admin, member)
- ✅ Organization Invitations table (unused)
- ✅ Individual user subscriptions
- ✅ Stripe integration via Edge Functions
- ✅ Onboarding flow creates one org per user

### Key Constraints
- One organization ownership per user (database constraint)
- Subscriptions currently tied to individual users
- Plans have individual pricing only
- No seat quantity tracking in subscriptions

## Implementation Checklist

### Phase 1: Database Schema Updates ✅

#### 1.1 Subscriptions Table Modifications
- [x] Add `quantity` column (integer, default 1) - number of seats
- [x] Add `price_per_seat` column (decimal, nullable) - for custom pricing
- [x] Add `billing_type` column (enum: 'individual', 'team_seats', default 'individual')
- [x] Add `team_discount_percentage` column (decimal, nullable) - for volume discounts
- [x] Create migration script: `add_team_billing_to_subscriptions.sql`

#### 1.2 Plans Table Extensions
- [x] Add `supports_team_billing` column (boolean, default false)
- [x] Add `team_price_per_seat_monthly` column (decimal, nullable)
- [x] Add `team_price_per_seat_yearly` column (decimal, nullable)
- [x] Add `team_minimum_seats` column (integer, default 2)
- [x] Add `team_maximum_seats` column (integer, nullable)
- [x] Add `team_stripe_price_id_monthly` column (string, nullable)
- [x] Add `team_stripe_price_id_yearly` column (string, nullable)
- [x] Create migration script: `add_team_pricing_to_plans.sql`

#### 1.3 New Tables
- [x] Create `team_billing_events` table:
  ```sql
  - id (uuid, primary key)
  - organization_id (uuid, FK)
  - subscription_id (uuid, FK)
  - event_type (enum: 'seat_added', 'seat_removed', 'plan_changed')
  - user_id (uuid, FK) - affected user
  - performed_by (uuid, FK) - who made the change
  - old_quantity (integer)
  - new_quantity (integer)
  - old_price_per_seat (decimal)
  - new_price_per_seat (decimal)
  - created_at (timestamp)
  ```

- [x] Create `team_invitation_settings` table:
  ```sql
  - organization_id (uuid, primary key, FK)
  - auto_approve_domain (string) - e.g., "@company.com"
  - default_role (enum: 'member', 'admin', default 'member')
  - invitation_message_template (text)
  - max_pending_invitations (integer, default 50)
  - created_at (timestamp)
  - updated_at (timestamp)
  ```

### Phase 2: Backend API Implementation ✅

#### 2.1 Team Invitation Endpoints ✅
- [x] `POST /api/teams/invite`
  - Validate sender permissions (owner/admin only)
  - Check organization seat limits
  - Generate secure invitation token
  - Send invitation email
  - Track in organization_invitations table

- [x] `GET /api/teams/invitations`
  - List pending invitations
  - Include invitation status and expiry
  - Filter by organization

- [x] `POST /api/teams/invitations/[token]/accept`
  - Validate token and expiry
  - Create organization member record
  - Update subscription quantity
  - Send notifications
  - Clean up invitation record

- [x] `DELETE /api/teams/invitations/[id]`
  - Validate permissions
  - Mark invitation as cancelled
  - Send cancellation email

- [x] `POST /api/teams/invitations/resend/[id]`
  - Validate permissions
  - Generate new token
  - Resend invitation email

#### 2.2 Team Management Endpoints ✅
- [x] `GET /api/teams/members`
  - List all team members
  - Include usage statistics per member
  - Support pagination and filtering

- [x] `PATCH /api/teams/members/[id]`
  - Update member role
  - Update member permissions
  - Validate permission hierarchy

- [x] `DELETE /api/teams/members/[id]`
  - Validate removal permissions
  - Update subscription quantity
  - Handle data ownership transfer
  - Send notification emails

- [x] `GET /api/teams/settings`
  - Get team invitation settings
  - Include seat usage summary

- [x] `PATCH /api/teams/settings`
  - Update auto-approve domains
  - Update default roles
  - Update invitation templates

#### 2.3 Billing Endpoints ✅
- [x] `POST /api/teams/billing/add-seats`
  - Calculate proration
  - Update Stripe subscription
  - Update local records
  - Send confirmation email

- [x] `POST /api/teams/billing/remove-seats`
  - Validate minimum seats
  - Calculate proration
  - Update Stripe subscription
  - Handle member removal if needed

- [x] `GET /api/teams/billing/preview`
  - Preview cost changes
  - Show proration amounts
  - Display next billing date

### Phase 3: Stripe Integration Updates ✅

#### 3.1 Stripe Product Setup
- [ ] Create team versions of each plan in Stripe Dashboard
- [ ] Set up per-seat pricing for each team plan
- [ ] Configure quantity-based pricing
- [ ] Add metadata for team plan identification

#### 3.2 Edge Function Updates ✅
- [x] Update `create-checkout-session` function:
  - Accept quantity parameter
  - Support team plan price IDs
  - Add team metadata to session
  - Handle initial team size selection

- [x] Create `update-subscription-quantity` function:
  - Handle seat additions/removals
  - Calculate proration
  - Update Stripe subscription
  - Return updated subscription details

- [x] Update `stripe-webhooks` function:
  - Handle `customer.subscription.updated` for quantity changes
  - Process team-specific events
  - Update local database on quantity changes
  - Send notification emails

### Phase 4: Modified User Flows ✅

#### 4.1 Invitation-Based Signup
- [x] Update signup page to detect invitation token
- [x] Create invitation verification endpoint
- [x] Skip organization creation for invited users
- [x] Auto-populate user details from invitation
- [x] Show team-specific welcome message

#### 4.2 Modified Onboarding
- [x] Update `/app/onboarding/page.tsx`:
  - Check for invitation token in query params
  - Skip organization setup step for invited users
  - Add team member welcome step
  - Show team benefits and features

- [x] Update `/api/auth/onboard/route.ts`:
  - Handle invitation token validation
  - Join existing organization instead of creating new
  - Set appropriate member role
  - Update seat count on organization

#### 4.3 Team Upgrade Flow
- [ ] Create team upgrade modal
- [ ] Show seat calculator
- [ ] Display team benefits
- [ ] Handle migration from individual to team plan

### Phase 5: Frontend Components ✅

#### 5.1 Team Management Page (`/dashboard/team`) ✅
- [x] Create main team page layout
- [x] Implement `TeamMembersList` component:
  - Show member details and roles
  - Display last active dates
  - Show usage per member
  - Add quick actions menu

- [x] Implement `InviteTeamMemberModal`:
  - Email input with validation
  - Role selection dropdown
  - Custom message field
  - Bulk invite option

- [x] Implement `PendingInvitationsList`:
  - Show invitation status
  - Display expiry countdown
  - Add resend/cancel actions
  - Show invitation history

- [x] Implement `TeamBillingCard`:
  - Current seats and cost
  - Add/remove seats buttons
  - Next billing date
  - Usage summary

#### 5.2 Updated Components ✅
- [x] Update `DashboardSidebar`:
  - Add "Team" navigation item
  - Show team member count
  - Add invite button shortcut

- [x] Update `PricingPage`:
  - Add team/individual toggle
  - Show per-seat pricing
  - Add team size selector
  - Update price calculations

- [ ] Update `SubscriptionManager`:
  - Show seat management for teams
  - Display per-seat costs
  - Add seat adjustment controls

### Phase 6: Database Functions and Procedures

#### 6.1 Usage Tracking Updates
- [x] Update `check_usage_limit` function:
  - Consider team billing type
  - Aggregate team usage (optional)
  - Handle per-seat limits

- [x] Create `update_team_seats` function:
  ```sql
  - Validate seat changes
  - Update subscription quantity
  - Log billing events
  - Return new subscription state
  ```

- [x] Create `calculate_team_usage` function:
  ```sql
  - Aggregate usage across team members
  - Calculate per-member averages
  - Identify high/low usage members
  ```

#### 6.2 Invitation Functions
- [x] Create `process_team_invitation` function:
  ```sql
  - Validate invitation token
  - Check seat availability
  - Create member record
  - Update subscription
  - Clean up invitation
  ```

- [ ] Create `cleanup_expired_invitations` function:
  ```sql
  - Find expired invitations
  - Mark as expired
  - Send expiry notifications
  ```

### Phase 7: Email Templates

#### 7.1 Invitation Emails
- [ ] Create `team-invitation.tsx` template:
  - Inviter details
  - Organization name and benefits
  - Accept/decline buttons
  - Expiry notice

- [ ] Create `invitation-accepted.tsx` template:
  - Notify owner of new member
  - Show updated seat count
  - Include member details

- [ ] Create `invitation-expired.tsx` template:
  - Notify inviter of expiry
  - Include re-invite link

#### 7.2 Billing Emails
- [ ] Create `seats-added.tsx` template:
  - Show new seat count
  - Display cost changes
  - Include proration details

- [ ] Create `member-removed.tsx` template:
  - Notify removed member
  - Provide data export options
  - Show grace period details

### Phase 8: Security and Permissions

#### 8.1 Row Level Security (RLS) Updates
- [x] Update organizations policy:
  - Allow team members to read org details
  - Restrict updates to owners/admins

- [ ] Update sessions policy:
  - Allow team members to view all team sessions
  - Maintain create/edit permissions

- [x] Update organization_invitations policy:
  - Only owners/admins can create
  - Invitees can read their own invitations

#### 8.2 Permission Helpers
- [ ] Create `canInviteMembers` helper function
- [ ] Create `canRemoveMembers` helper function
- [ ] Create `canChangeBilling` helper function
- [ ] Create `canViewTeamUsage` helper function

### Phase 9: Testing

#### 9.1 Unit Tests
- [ ] Test invitation token generation and validation
- [ ] Test seat calculation logic
- [ ] Test proration calculations
- [ ] Test permission checks

#### 9.2 Integration Tests
- [ ] Test complete invitation flow
- [ ] Test seat addition with Stripe
- [ ] Test member removal flow
- [ ] Test billing updates

#### 9.3 E2E Tests
- [ ] Test team signup via invitation
- [ ] Test team management UI
- [ ] Test billing changes
- [ ] Test permission restrictions

### Phase 10: Migration and Deployment

#### 10.1 Data Migration
- [x] Set `quantity = 1` for all existing subscriptions
- [x] Set `billing_type = 'individual'` for existing subscriptions
- [ ] Create organization_members records for existing users
- [ ] Backfill any missing organization data

#### 10.2 Feature Flags
- [ ] Add `teams_enabled` feature flag
- [ ] Add `team_billing_enabled` feature flag
- [ ] Implement gradual rollout logic
- [ ] Add flag checks in UI components

#### 10.3 Deployment Steps
- [ ] Deploy database migrations
- [ ] Deploy updated Edge Functions
- [ ] Deploy backend API changes
- [ ] Deploy frontend with feature flags
- [ ] Enable for beta users
- [ ] Monitor and fix issues
- [ ] Gradual rollout to all users

### Phase 11: Documentation

#### 11.1 User Documentation
- [ ] Create team setup guide
- [ ] Write invitation process docs
- [ ] Document billing changes
- [ ] Create admin best practices

#### 11.2 Developer Documentation
- [ ] Update API documentation
- [ ] Document new database schema
- [ ] Add team billing examples
- [ ] Update contribution guide

## Success Metrics

- [ ] Track invitation acceptance rate
- [ ] Monitor seat utilization
- [ ] Measure team size growth
- [ ] Calculate revenue per seat
- [ ] Monitor support tickets related to teams

## Post-Launch Enhancements

- [ ] Bulk invitation upload (CSV)
- [ ] Team analytics dashboard
- [ ] Department/sub-team support
- [ ] SSO integration for enterprise
- [ ] Team-wide settings sync
- [ ] Shared templates and resources

## Notes and Considerations

1. **Billing Edge Cases**:
   - Mid-cycle seat changes need proper proration
   - Handle downgrades gracefully
   - Free tier teams limited to owner only
   - Trial periods apply to whole team

2. **Performance Optimizations**:
   - Cache team member counts
   - Batch invitation emails
   - Optimize team listing queries
   - Consider pagination for large teams

3. **Security Concerns**:
   - Rate limit invitation sending
   - Validate email domains
   - Prevent invitation spam
   - Audit trail for all team changes

4. **User Experience**:
   - Clear pricing communication
   - Smooth invitation flow
   - Helpful error messages
   - Progress indicators for long operations