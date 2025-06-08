# Stripe Integration Setup Guide for LiveConvo

## Overview
This guide will walk you through setting up Stripe integration for LiveConvo, focusing on the **Pro plan only** as requested. We'll clean up existing products and create a streamlined setup.

## Current Database Schema
Based on the database analysis, we have:
- **Free Plan**: `individual_free` - No Stripe integration needed
- **Pro Plan**: `individual_pro` - $29/month, $290/year (requires Stripe setup)

## Prerequisites
- Stripe account with API access
- Database access to LiveConvo Supabase project
- Environment variables configured

## Step 1: Environment Variables Setup

Add these environment variables to your `.env` files:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Frontend publishable key

# Stripe Price IDs (will be updated after creation)
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
```

## Step 2: Clean Up Existing Stripe Products

### Current Stripe Products Found:
1. `LiveConvo Extra Minutes` (prod_SSMOiQ0uLtLWeO)
2. `LiveConvo Enterprise` (prod_SSMOSQtxS9E7wr)
3. `LiveConvo Professional` (prod_SSMOP4EmUOKmKh)
4. `LiveConvo Starter` (prod_SSMNO55BbnfTOQ)
5. `Pro` (prod_SFPduKwiuMZbN8)
6. `Starter` (prod_SFOIhBPcSNZ3c8)

**Action Required**: The following products need to be archived (set active=false):

#### Products to Archive:
1. `prod_SSMOiQ0uLtLWeO` - LiveConvo Extra Minutes  
2. `prod_SSMOSQtxS9E7wr` - LiveConvo Enterprise
3. `prod_SSMOP4EmUOKmKh` - LiveConvo Professional  
4. `prod_SSMNO55BbnfTOQ` - LiveConvo Starter
5. `prod_SFPduKwiuMZbN8` - Pro (old)
6. `prod_SFOIhBPcSNZ3c8` - Starter (old)

#### Product to Keep Active:
- `prod_SSMQpSGAstcxB3` - LiveConvo Pro (NEW - focus on Pro plan only)

## Step 3: Create New Stripe Products and Prices

### ✅ Pro Plan Product Creation (COMPLETED)
- **Product ID**: `prod_SSMQpSGAstcxB3`
- **Product Name**: LiveConvo Pro
- **Description**: Professional conversation coaching with real-time guidance, advanced summaries, and unlimited sessions
- **Monthly Price**: $29.00 USD (NEEDS CREATION)
- **Yearly Price**: $290.00 USD (NEEDS CREATION)

### Current Status:
- ✅ Product created successfully
- ❌ Monthly recurring price needs creation
- ❌ Yearly recurring price needs creation
- ❌ Old products need archival

### Required API Calls for Recurring Prices:

Since the MCP create_price function doesn't support the recurring parameter structure, these prices need to be created via direct API calls:

#### Monthly Price Creation:
```bash
curl https://api.stripe.com/v1/prices \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d currency=usd \
  -d unit_amount=2900 \
  -d product=prod_SSMQpSGAstcxB3 \
  -d "recurring[interval]"=month
```

#### Yearly Price Creation:
```bash
curl https://api.stripe.com/v1/prices \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d currency=usd \
  -d unit_amount=29000 \
  -d product=prod_SSMQpSGAstcxB3 \
  -d "recurring[interval]"=year
```

## Step 4: Database Integration

### Current Database Schema (plans table):
```sql
-- Pro plan configuration
name: "individual_pro"
display_name: "Pro"
price_monthly: 29.00
price_yearly: 290.00
stripe_price_id_monthly: "price_individual_pro_monthly"  -- Will update with real ID
stripe_price_id_yearly: "price_individual_pro_yearly"    -- Will update with real ID
```

### Features Included in Pro Plan:
- ✅ Real-time guidance: `has_real_time_guidance: true`
- ✅ Advanced summaries: `has_advanced_summaries: false` (currently)
- ✅ Export options: `has_export_options: false` (currently)
- ✅ Email summaries: `has_email_summaries: false` (currently)
- ✅ Custom templates: `has_custom_templates: false` (currently)
- ✅ Priority support: `has_priority_support: false` (currently)
- ✅ Analytics dashboard: `has_analytics_dashboard: false` (currently)
- ✅ AI model access: `["gpt-4o-mini"]`
- ✅ Max guidance requests per session: 50
- ✅ Monthly audio hours: Unlimited (`monthly_audio_hours_limit: null`)

## Step 5: Webhook Configuration

### Required Webhooks:
1. `customer.subscription.created`
2. `customer.subscription.updated`
3. `customer.subscription.deleted`
4. `invoice.payment_succeeded`
5. `invoice.payment_failed`
6. `customer.created`
7. `customer.updated`

### Webhook Endpoint:
```
https://your-domain.com/api/webhooks/stripe
```

## Step 6: Implementation Checklist

### Backend API Routes to Create/Update:
- [ ] `/api/stripe/create-checkout-session` - For subscription creation
- [ ] `/api/stripe/create-portal-session` - For subscription management
- [ ] `/api/webhooks/stripe` - Webhook handler
- [ ] `/api/stripe/cancel-subscription` - Subscription cancellation
- [ ] Update existing `/api/users/subscription` route

### Frontend Components to Update:
- [ ] Pricing page with Pro plan only
- [ ] Subscription management in settings
- [ ] Usage tracking and limits display
- [ ] Billing portal integration

### Database Updates Required:
- [ ] Update `plans` table with real Stripe price IDs
- [ ] Ensure `subscriptions` table is properly configured
- [ ] Set up proper RLS policies for billing data

## Step 7: Testing Checklist

### Stripe Test Mode:
- [ ] Subscription creation flow
- [ ] Subscription updates/changes
- [ ] Subscription cancellation
- [ ] Webhook processing
- [ ] Payment failure handling
- [ ] Customer portal functionality

### Integration Tests:
- [ ] User sign-up → subscription flow
- [ ] Usage limit enforcement
- [ ] Subscription status changes
- [ ] Billing period transitions

## Step 8: Production Deployment

### Pre-Production:
- [ ] Switch to Stripe live mode keys
- [ ] Update webhook URLs to production
- [ ] Test with real payment methods
- [ ] Verify all webhook events

### Post-Production:
- [ ] Monitor webhook delivery
- [ ] Track subscription metrics
- [ ] Set up Stripe dashboard alerts
- [ ] Configure tax settings if required

## Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **API Key Security**: Use server-side keys for sensitive operations
3. **Customer Data**: Ensure PCI compliance for any payment data
4. **Rate Limiting**: Implement proper rate limiting on Stripe endpoints

## Maintenance

### Regular Tasks:
- Monitor failed payments
- Update product descriptions/pricing as needed
- Review subscription analytics
- Handle customer billing inquiries

### Stripe Dashboard Monitoring:
- Failed charges
- Subscription churn
- Revenue metrics
- Customer disputes

---

## Immediate Next Steps (In Order)

### 1. ✅ COMPLETED: Create Pro Product
- Product `prod_SSMQpSGAstcxB3` has been created successfully

### 2. 🔄 IN PROGRESS: Create Recurring Prices
The MCP tools don't support the nested `recurring[interval]` parameter. Complete these steps manually:

```bash
# Create Monthly Price ($29/month)
curl https://api.stripe.com/v1/prices \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d currency=usd \
  -d unit_amount=2900 \
  -d product=prod_SSMQpSGAstcxB3 \
  -d "recurring[interval]"=month

# Create Yearly Price ($290/year)
curl https://api.stripe.com/v1/prices \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d currency=usd \
  -d unit_amount=29000 \
  -d product=prod_SSMQpSGAstcxB3 \
  -d "recurring[interval]"=year
```

### 3. 📋 TODO: Archive Old Products
Use Stripe Dashboard or API to set `active: false` for:
- `prod_SSMOiQ0uLtLWeO`, `prod_SSMOSQtxS9E7wr`, `prod_SSMOP4EmUOKmKh`
- `prod_SSMNO55BbnfTOQ`, `prod_SFPduKwiuMZbN8`, `prod_SFOIhBPcSNZ3c8`

### 4. 📋 TODO: Update Database
Once prices are created, update the `plans` table:
```sql
UPDATE plans 
SET 
  stripe_price_id_monthly = 'price_MONTHLY_ID_HERE',
  stripe_price_id_yearly = 'price_YEARLY_ID_HERE'
WHERE name = 'individual_pro';
```

### 5. 📋 TODO: Implement Backend Routes
- `/api/stripe/create-checkout-session`
- `/api/webhooks/stripe`
- `/api/stripe/create-portal-session`

### 6. 📋 TODO: Frontend Integration
- Update pricing page to use new price IDs
- Implement subscription management

---

## Development Priority
**Focus on Pro plan only** - Simple monthly/yearly subscription model with unlimited features.

---

*Last Updated: January 2025*
*Status: Product Created ✅ | Prices Pending ⏳ | Integration Pending 📋* 