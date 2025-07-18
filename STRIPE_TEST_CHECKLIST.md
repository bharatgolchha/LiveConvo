# Stripe Subscription Testing Checklist

## Prerequisites
- [ ] Stripe CLI installed (`brew install stripe/stripe-cli/stripe`)
- [ ] Stripe test mode API keys configured in Supabase Vault
- [ ] Test credit card numbers ready (4242 4242 4242 4242)

## Local Development Setup

1. **Start webhook forwarding**:
   ```bash
   # For development database
   stripe listen --forward-to https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/stripe-webhooks
   
   # Copy the webhook signing secret and update in Supabase Vault
   ```

2. **Monitor logs**:
   - Stripe CLI terminal for webhook events
   - Browser console for frontend errors
   - Supabase Dashboard → Functions → Logs for edge function logs

## Test Scenarios

### 1. New Subscription Flow
- [ ] Navigate to pricing page as logged-in user
- [ ] Click "Upgrade Now" on a paid plan
- [ ] Verify redirect to Stripe Checkout
- [ ] Complete payment with test card (4242 4242 4242 4242)
- [ ] Verify redirect back to dashboard
- [ ] Check subscription status in Settings → Subscription
- [ ] Verify webhook created subscription record in database

### 2. Billing Portal Access
- [ ] Go to Settings → Subscription as subscribed user
- [ ] Click "Manage Billing" button
- [ ] Verify redirect to Stripe Customer Portal
- [ ] Check all sections load correctly

### 3. Upgrade Subscription
- [ ] In Stripe Portal, click "Update plan"
- [ ] Select a higher tier plan
- [ ] Confirm upgrade
- [ ] Return to app and verify new plan is active
- [ ] Check database has updated plan_id

### 4. Downgrade Subscription
- [ ] In Stripe Portal, click "Update plan"
- [ ] Select a lower tier plan
- [ ] Note: Downgrade happens at period end
- [ ] Verify app shows pending plan change
- [ ] Check cancel_at_period_end is false but plan scheduled

### 5. Cancel Subscription
- [ ] In Stripe Portal, click "Cancel plan"
- [ ] Confirm cancellation
- [ ] Return to app and verify:
  - Status shows as active (until period end)
  - Access to features continues
  - Shows cancellation pending

### 6. Reactivate Subscription
- [ ] With canceled subscription, go back to portal
- [ ] Click "Renew plan" or similar
- [ ] Verify subscription reactivated
- [ ] Check app shows active status again

### 7. Payment Method Update
- [ ] In Stripe Portal, go to payment methods
- [ ] Add new card or update existing
- [ ] Verify no errors
- [ ] No webhook needed - Stripe handles this

### 8. Failed Payment Simulation
- [ ] Use card number 4000 0000 0000 0341 (fails after attach)
- [ ] Verify subscription goes to past_due status
- [ ] Check user receives appropriate messaging

## Database Verification

After each test, verify in Supabase:

```sql
-- Check active subscriptions
SELECT * FROM active_user_subscriptions 
WHERE user_id = '[YOUR_USER_ID]';

-- Check subscription history
SELECT * FROM subscriptions 
WHERE user_id = '[YOUR_USER_ID]' 
ORDER BY created_at DESC;

-- Check webhook events processed
SELECT * FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 10;
```

## Common Issues & Solutions

### Portal won't open
- Check stripe_customer_id exists for user
- Verify edge function has correct Stripe keys
- Check browser console for CORS errors

### Subscription not updating
- Verify webhook is receiving events (check Stripe CLI)
- Check edge function logs in Supabase
- Ensure database has correct plan IDs

### Plan features not changing
- Clear browser cache
- Check active_user_subscriptions view
- Verify plan configuration in plans table

## Production Testing

Before going live:
1. Test entire flow in Stripe test mode
2. Verify webhook endpoint in Stripe Dashboard
3. Switch to live keys in Supabase Vault
4. Test with real card (can refund after)
5. Monitor first few real subscriptions closely