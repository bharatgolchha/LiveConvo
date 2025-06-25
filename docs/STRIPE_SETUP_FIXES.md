# Stripe Integration Fixes - Plan Purchase Flow

## Issue Identified
The plan purchase flow is failing because the Stripe secrets are not configured in the Supabase Edge Functions environment.

## Immediate Fix Required

### 1. Set Stripe Secrets in Supabase Edge Functions

You need to set the following environment variables for your Edge Functions. Run these commands:

```bash
# Set your Stripe secret key
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_STRIPE_SECRET_KEY --project-ref ucvfgfbjcrxbzppwjpuu

# Set your Stripe webhook secret
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET --project-ref ucvfgfbjcrxbzppwjpuu
```

Replace `sk_test_YOUR_ACTUAL_STRIPE_SECRET_KEY` and `whsec_YOUR_ACTUAL_WEBHOOK_SECRET` with your actual Stripe keys.

### 2. Verify the Secrets are Set

After setting the secrets, verify they're properly configured:

```bash
npx supabase secrets list --project-ref ucvfgfbjcrxbzppwjpuu
```

### 3. Code Fixes Already Applied

I've already fixed the following issues in your code:

1. **Frontend (PricingModal.tsx)**:
   - Updated to send correct parameters to the Edge Function
   - Now sends `priceId`, `planId`, and `interval`

2. **Edge Function (create-checkout-session)**:
   - Updated to accept the correct parameters
   - Uses the actual Stripe price IDs from the frontend
   - Added detailed logging for debugging

3. **Edge Function (stripe-webhooks)**:
   - Updated to properly look up plans by price ID
   - Fixed plan lookup to use 'pro' instead of 'individual_pro'

### 4. Current Stripe Price IDs in Database

Your database has these price IDs configured for the Pro plan:
- Monthly: `price_1RYheu2eW0vYydurR5KyvwQ3`
- Yearly: `price_1RYhey2eW0vYydurPV88SmSk`

### 5. Testing the Fix

Once you've set the Stripe secrets:

1. Try clicking "Upgrade Now" in the PricingModal again
2. You should be redirected to Stripe Checkout
3. Use test card `4242 4242 4242 4242` with any future date and CVC
4. After successful payment, you'll be redirected back to the dashboard

### 6. Monitoring

To debug any issues, check the Edge Function logs:
1. Go to Supabase Dashboard > Functions
2. Click on `create-checkout-session` 
3. View the logs to see any errors

## Additional Notes

- The webhook endpoint is already configured to handle subscription events
- The database schema is properly set up with plans and subscriptions tables
- User subscription status is tracked in the `active_user_subscriptions` view

## Alternative: Local Development

If you want to test locally first, create a `.env.local` file in your frontend directory:

```bash
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://ucvfgfbjcrxbzppwjpuu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

But remember, the Edge Functions need the secrets set in Supabase directly using the CLI commands above.