# IMMEDIATE FIX: Stripe Integration Setup

## The Problem
Your Stripe checkout is failing with a 500 error because the Stripe API keys are not configured in your Supabase Edge Functions.

## Quick Fix Steps (5 minutes)

### Step 1: Get Your Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_`)
3. Go to https://dashboard.stripe.com/test/webhooks
4. Click on your webhook endpoint (or create one if none exists)
5. Copy the **Signing secret** (starts with `whsec_`)

### Step 2: Set Stripe Secrets in Supabase

Open your terminal and run these commands (replace with your actual keys):

```bash
# Navigate to your project directory
cd /Users/bharatgolchha/CursorProjects/LiveConvo

# Set your Stripe secret key
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_YOUR_ACTUAL_KEY_HERE" --project-ref ucvfgfbjcrxbzppwjpuu

# Set your webhook secret
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_YOUR_ACTUAL_SECRET_HERE" --project-ref ucvfgfbjcrxbzppwjpuu
```

### Step 3: Verify Secrets Are Set

Run this command to confirm:

```bash
npx supabase secrets list --project-ref ucvfgfbjcrxbzppwjpuu
```

You should see both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the list.

### Step 4: Test the Checkout

1. Go back to your app
2. Click "Upgrade Now" in the pricing modal
3. You should now be redirected to Stripe Checkout

## If You Don't Have Stripe Keys Yet

### Create a Stripe Account
1. Go to https://stripe.com and sign up
2. Switch to **Test mode** (toggle in the top-right of Stripe Dashboard)

### Create Products and Prices
1. Go to https://dashboard.stripe.com/test/products
2. Create a product called "LiveConvo Pro"
3. Add two prices:
   - Monthly: $29.00 recurring monthly
   - Yearly: $290.00 recurring yearly
4. Copy the price IDs (they start with `price_`)

### Update Your Database

Once you have the price IDs, update your database:

```sql
UPDATE plans 
SET 
  stripe_price_id_monthly = 'price_YOUR_MONTHLY_ID',
  stripe_price_id_yearly = 'price_YOUR_YEARLY_ID'
WHERE name = 'pro';
```

### Create Webhook Endpoint
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/stripe-webhooks`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `checkout.session.completed`
5. Copy the signing secret

## Troubleshooting

### Still Getting 500 Error?
Check the Edge Function logs:
1. Go to https://supabase.com/dashboard/project/ucvfgfbjcrxbzppwjpuu/functions
2. Click on `create-checkout-session`
3. View the logs to see the exact error

### Common Issues:
- **"No such price"**: The price IDs in your database don't match Stripe
- **"Invalid API Key"**: The secret key is incorrect or not set
- **"Customer not found"**: Clear your browser data and try again

## Test Card Numbers
Use these in Stripe's test mode:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

---

**Need more help?** The full setup guide is in `stripeSetup.md`