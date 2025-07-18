# Stripe Subscription Management Guide

## Overview

This guide documents the complete Stripe subscription flow for liveprompt.ai, including checkout, upgrades, downgrades, and cancellations.

## Architecture

### Edge Functions (Supabase)
1. **create-checkout-session** - Creates new subscription checkout sessions
2. **create-portal-session** - Creates Stripe billing portal sessions for subscription management
3. **stripe-webhooks** - Handles all Stripe webhook events

### API Routes (Next.js)
1. **`/api/checkout/create-session`** - Frontend endpoint for new subscriptions
2. **`/api/billing/portal`** - Frontend endpoint for billing management
3. **`/api/users/subscription`** - Get current subscription status

## Complete Flow

### 1. New Subscription (Checkout)

```
User clicks "Upgrade" → Frontend calls /api/checkout/create-session 
→ API calls Supabase edge function create-checkout-session
→ Edge function creates Stripe checkout session
→ User redirected to Stripe Checkout
→ After payment, webhook receives checkout.session.completed
→ Webhook creates subscription record in database
```

### 2. Manage Subscription (Portal)

```
User clicks "Manage Billing" → Frontend calls /api/billing/portal
→ API calls Supabase edge function create-portal-session
→ Edge function creates Stripe portal session
→ User redirected to Stripe Customer Portal
```

### 3. Subscription Changes via Portal

In the Stripe Customer Portal, users can:
- **Update payment method** - No webhook needed, handled by Stripe
- **Download invoices** - No webhook needed, handled by Stripe
- **Upgrade/Downgrade** - Triggers `customer.subscription.updated` webhook
- **Cancel** - Triggers `customer.subscription.updated` with `cancel_at_period_end`
- **Reactivate** - Triggers `customer.subscription.updated` removing cancellation

### 4. Webhook Handling

The `stripe-webhooks` edge function handles these key events:

#### checkout.session.completed
- Creates initial subscription record
- Updates user's stripe_customer_id
- Marks any previous subscriptions as canceled

#### customer.subscription.created/updated
- Updates subscription status
- Updates plan information
- Handles upgrades/downgrades by updating plan_id
- Handles cancellations by checking cancel_at_period_end

#### customer.subscription.deleted
- Marks subscription as canceled
- User reverts to free plan

#### invoice.payment_succeeded
- Confirms subscription is active
- Processes referral rewards (first payment only)
- Resets monthly usage for new billing periods

## Upgrade/Downgrade Logic

### Upgrades (e.g., Starter → Pro)
1. User selects new plan in portal
2. Stripe prorates the difference
3. Webhook receives `customer.subscription.updated`
4. System updates plan_id and limits
5. New features available immediately

### Downgrades (e.g., Pro → Starter)
1. User selects lower plan in portal
2. Change takes effect at period end (no immediate proration)
3. Webhook receives `customer.subscription.updated`
4. System schedules plan change
5. Features remain until period end

### Cancellation
1. User cancels in portal
2. Webhook receives `customer.subscription.updated` with `cancel_at_period_end: true`
3. Access continues until period end
4. At period end, webhook receives `customer.subscription.deleted`

## Database Schema

### subscriptions table
```sql
- id (UUID)
- user_id (UUID) - References users.id
- plan_id (UUID) - References plans.id
- stripe_subscription_id (text) - Unique
- stripe_customer_id (text)
- status (text) - active, past_due, canceled, etc.
- current_period_start (timestamp)
- current_period_end (timestamp)
- cancel_at_period_end (boolean)
- canceled_at (timestamp)
```

### active_user_subscriptions view
Provides a complete view joining subscriptions with plan details for easy querying.

## Testing Checklist

### Local Development
1. Set up Stripe CLI webhook forwarding:
   ```bash
   stripe listen --forward-to https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/stripe-webhooks
   ```

2. Test scenarios:
   - [ ] New subscription creation
   - [ ] Access billing portal
   - [ ] Upgrade subscription
   - [ ] Downgrade subscription
   - [ ] Cancel subscription
   - [ ] Reactivate canceled subscription
   - [ ] Payment method update
   - [ ] Failed payment handling

### Production Verification
1. Verify Stripe webhook endpoint is configured in Stripe Dashboard
2. Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are in Supabase Vault
3. Test with real card in Stripe test mode first
4. Monitor webhook logs in Stripe Dashboard

## Troubleshooting

### Common Issues

1. **"No active subscription found" in portal**
   - Check if user has stripe_customer_id in database
   - Verify subscription status is active

2. **Webhook signature verification failed**
   - Ensure STRIPE_WEBHOOK_SECRET matches Stripe Dashboard
   - Check for clock skew between servers

3. **Plan changes not reflecting**
   - Verify webhook is receiving events
   - Check subscription plan_id is updating
   - Ensure active_user_subscriptions view is working

## Security Notes

1. Always verify webhook signatures
2. Use service role key only in edge functions
3. Never expose Stripe secret keys to frontend
4. Validate all user inputs before Stripe API calls
5. Use RLS policies to protect subscription data