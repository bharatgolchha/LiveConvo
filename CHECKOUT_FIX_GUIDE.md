# Checkout Session Creation Fix Guide

## Issue Summary
The checkout session is failing with a 500 error because the Stripe API keys are missing from the environment configuration.

## Root Cause
The `/api/checkout/create-session` endpoint requires the following environment variables to be set:
- `STRIPE_SECRET_KEY` - Your Stripe secret API key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (for frontend)
- `STRIPE_WEBHOOK_SECRET` - Your webhook signing secret

These keys are currently missing from your `.env.local` file.

## Solution Steps

### 1. Get Your Stripe Keys

#### For Test Mode (Recommended for Development):
1. Go to [Stripe Test API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret key** (starts with `sk_test_`)
3. Copy your **Publishable key** (starts with `pk_test_`)

#### For Webhook Secret:
1. Go to [Stripe Test Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint" if you don't have one
3. Use this endpoint URL:
   - For development: `https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/stripe-webhooks`
   - For production: `https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/stripe-webhooks`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the **Signing secret** (starts with `whsec_`)

### 2. Update Your `.env.local` File

I've already added the placeholders to your `.env.local` file. Now fill in the values:

```env
# Stripe Keys (REQUIRED FOR CHECKOUT)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

### 3. Create Stripe Products and Prices

You need to create products in Stripe that match your database:

1. Go to [Stripe Test Products](https://dashboard.stripe.com/test/products)
2. Create a product called "LivePrompt Pro"
3. Add these prices:
   - **Monthly**: $29.00 recurring monthly
   - **Yearly**: $290.00 recurring yearly (save $58/year)
4. Copy the price IDs (they look like `price_1234567890`)

### 4. Update Your Database

Connect to your development database and update the plans table with your Stripe price IDs:

```sql
-- Update the pro plan with your Stripe price IDs
UPDATE plans 
SET 
  stripe = jsonb_build_object(
    'monthlyPriceId', 'price_YOUR_MONTHLY_PRICE_ID',
    'yearlyPriceId', 'price_YOUR_YEARLY_PRICE_ID'
  )
WHERE slug = 'individual_pro';
```

### 5. Restart Your Development Server

After updating the environment variables:

```bash
cd frontend
npm run dev
```

### 6. Test the Checkout

1. Open the pricing modal
2. Select a plan
3. Click "Upgrade Now"
4. You should be redirected to Stripe Checkout

Use these test card numbers:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Decline: `4000 0000 0000 0002`

## Verification Checklist

- [ ] Stripe secret key added to `.env.local`
- [ ] Stripe publishable key added to `.env.local`
- [ ] Webhook secret added to `.env.local`
- [ ] Products created in Stripe dashboard
- [ ] Price IDs updated in database
- [ ] Webhook endpoint configured in Stripe
- [ ] Development server restarted
- [ ] Test checkout working

## Production Setup

For production, you'll need to:
1. Use live mode keys (start with `sk_live_` and `pk_live_`)
2. Update the production database (`xkxjycccifwyxgtvflxz`)
3. Set environment variables in Vercel dashboard
4. Configure production webhook endpoint

## Troubleshooting

### Still getting 500 error?
1. Check browser console for detailed error messages
2. Check server logs: `npm run dev` output
3. Verify all environment variables are set correctly
4. Ensure database has correct price IDs

### "No such price" error?
The price IDs in your database don't match Stripe. Re-check step 4.

### "Invalid API Key" error?
The secret key is incorrect. Make sure you're using the right mode (test vs live).

## Additional Resources
- [Stripe Checkout Documentation](https://stripe.com/docs/checkout)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- Original fix guide: `/docs/STRIPE_IMMEDIATE_FIX.md`