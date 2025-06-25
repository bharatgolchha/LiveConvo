# LiveConvo Stripe Integration - Implementation Roadmap

## 🎯 Current Status: Infrastructure Ready

- ✅ Stripe product created (`prod_SSMQpSGAstcxB3`)
- ✅ Setup script ready (`./create_stripe_prices.sh`)
- ✅ Database schema confirmed
- 🔄 **Next**: Run setup script, then implement payment flow

## 📋 Implementation Phases

### Phase 1: Complete Stripe Setup (5 minutes)
```bash
# 1. Set environment variable
export STRIPE_SECRET_KEY=sk_test_your_key_here

# 2. Run setup script
./create_stripe_prices.sh

# 3. Update database with the price IDs from script output
```

### Phase 2: Backend API Routes (1-2 hours)

#### A. Create Checkout Session Endpoint
**File**: `pages/api/stripe/create-checkout-session.js`
```javascript
// Create subscription checkout session
// Input: priceId (monthly or yearly)
// Output: Stripe checkout session URL
```

#### B. Webhook Handler
**File**: `pages/api/webhooks/stripe.js`
```javascript
// Handle Stripe webhook events:
// - customer.subscription.created
// - customer.subscription.updated
// - customer.subscription.deleted
// - invoice.payment_succeeded
// - invoice.payment_failed
```

#### C. Customer Portal Session
**File**: `pages/api/stripe/create-portal-session.js`
```javascript
// Create customer portal session for subscription management
```

### Phase 3: Frontend Integration (2-3 hours)

#### A. Environment Variables
**File**: `.env.local`
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# From script output:
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
```

#### B. Pricing Page Update
**File**: `components/PricingPage.tsx` (or similar)
```typescript
// Update to show only Pro plan
// Use environment variables for price IDs
// Remove references to old plans
```

#### C. Subscription Management
**File**: `components/SubscriptionManager.tsx`
```typescript
// Show current subscription status
// Cancel/upgrade options
// Link to customer portal
```

### Phase 4: Database Integration (30 minutes)

#### A. Subscription Status Sync
Update user subscription status based on webhook events:
```sql
-- Update user subscription status
UPDATE users SET 
  subscription_status = 'active|past_due|canceled',
  subscription_id = 'sub_...',
  plan_id = 'individual_pro'
WHERE stripe_customer_id = '...';
```

#### B. Usage Enforcement
Implement subscription checks in your app logic:
```javascript
// Check if user has active Pro subscription
const hasActiveSubscription = user.subscription_status === 'active' 
  && user.plan_id === 'individual_pro';
```

### Phase 5: Testing & Deployment (1 hour)

#### A. Test Mode Verification
- [ ] Subscription creation flow
- [ ] Webhook event processing
- [ ] Customer portal access
- [ ] Payment failure handling
- [ ] Subscription cancellation

#### B. Production Deployment
- [ ] Switch to live Stripe keys
- [ ] Update webhook URLs
- [ ] Test with real payment methods
- [ ] Monitor Stripe dashboard

## 🛠️ Code Templates

### Checkout Session Creation
```javascript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: priceId, // From environment variables
    quantity: 1,
  }],
  success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
  customer_email: user.email,
  metadata: {
    userId: user.id,
  },
});
```

### Webhook Event Handler
```javascript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

switch (event.type) {
  case 'customer.subscription.created':
    // Activate user's Pro subscription
    break;
  case 'customer.subscription.deleted':
    // Downgrade user to free plan
    break;
  // ... other events
}
```

## 🎁 Pro Plan Features to Enable

Once subscription is active, enable these features:
- ✅ Real-time guidance (`has_real_time_guidance: true`)
- ✅ Unlimited audio hours (`monthly_audio_hours_limit: null`)
- ✅ Max 50 guidance requests per session
- ✅ Advanced AI models (`["gpt-4o-mini"]`)

## 🚨 Important Notes

1. **Webhook Security**: Always verify webhook signatures
2. **Idempotency**: Handle duplicate webhook events
3. **Error Handling**: Graceful payment failure handling
4. **Testing**: Use Stripe test mode for development
5. **Monitoring**: Set up Stripe dashboard alerts

## ⏱️ Estimated Timeline

- **Phase 1** (Setup): 5 minutes
- **Phase 2** (Backend): 1-2 hours  
- **Phase 3** (Frontend): 2-3 hours
- **Phase 4** (Database): 30 minutes
- **Phase 5** (Testing): 1 hour

**Total**: ~4-6 hours for complete implementation

---

**Ready to start?** Run `./create_stripe_prices.sh` and then follow Phase 2! 🚀 