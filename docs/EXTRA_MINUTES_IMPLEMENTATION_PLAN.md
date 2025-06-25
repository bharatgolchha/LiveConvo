# Extra Minutes Purchase Implementation Plan

## Overview
Add functionality for users to purchase additional minutes beyond their subscription plan limits. This allows users to continue using the service when they exceed their monthly allocation without upgrading their plan.

## Current Infrastructure Summary

### Existing Systems to Leverage
1. **Pricing System**: Already have `plans` table and `PricingModal` component
2. **Usage Tracking**: `usage_tracking` and `monthly_usage_cache` tables track minute-by-minute usage
3. **Limit Checking**: `check_usage_limit` function determines if user can continue recording
4. **Auth System**: Supabase Auth with RLS policies
5. **UI Components**: Existing modal patterns, pricing display components

### Key Integration Points
- **Usage Tracking API** (`/api/usage/track-minute`): Add extra minutes deduction logic
- **Check Limit API** (`/api/usage/check-limit`): Include extra minutes in availability
- **Dashboard** (`/dashboard/page.tsx`): Display extra minutes balance
- **ConversationContent**: Show extra minutes usage in real-time

## Database Schema Design

### New Tables

#### 1. `extra_minutes_packages`
```sql
CREATE TABLE extra_minutes_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. `extra_minutes_purchases`
```sql
CREATE TABLE extra_minutes_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES extra_minutes_packages(id),
  minutes_purchased INTEGER NOT NULL,
  minutes_remaining INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. `extra_minutes_usage`
```sql
CREATE TABLE extra_minutes_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES extra_minutes_purchases(id),
  session_id UUID REFERENCES sessions(id),
  minutes_used INTEGER NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);
```

### Updates to Existing Tables

#### Update `user_stats` table
```sql
ALTER TABLE user_stats ADD COLUMN extra_minutes_balance INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN total_extra_minutes_purchased INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN total_extra_minutes_used INTEGER DEFAULT 0;
```

## Usage Tracking Logic

### Priority Order
1. Use plan minutes first (default behavior)
2. When plan minutes are exhausted, automatically use extra minutes
3. Track usage separately for reporting

### Integration with Existing System
The extra minutes feature will integrate seamlessly with the existing `usage_tracking` and `monthly_usage_cache` tables:

1. **Update `track-minute` API endpoint** to check for extra minutes
2. **Modify `check_usage_limit` function** to include extra minutes in availability
3. **Update `monthly_usage_cache`** to track extra minutes usage and balance

### Implementation in track-minute/route.ts
```typescript
// After regular usage tracking in track-minute API
if (extraMinutesNeeded > 0) {
  // Deduct from extra minutes
  const { data: deductResult } = await supabase
    .rpc('deduct_extra_minutes', {
      p_user_id: user.id,
      p_organization_id: userData.current_organization_id,
      p_session_id: session_id,
      p_minutes_to_deduct: extraMinutesNeeded
    });
  
  if (!deductResult.success) {
    // Handle insufficient extra minutes
    return NextResponse.json({
      error: 'Insufficient minutes',
      message: 'You have exceeded your plan limit and have no extra minutes available'
    }, { status: 402 });
  }
}
```

## API Endpoints

### 1. Get Available Packages
```
GET /api/extra-minutes/packages
Response: Array of available minute packages
```

### 2. Create Purchase Intent
```
POST /api/extra-minutes/purchase
Body: { packageId: string }
Response: { clientSecret: string, purchaseId: string }
```

### 3. Confirm Purchase (Webhook)
```
POST /api/webhooks/stripe
Handles: payment_intent.succeeded
```

### 4. Get User's Extra Minutes
```
GET /api/extra-minutes/balance
Response: { balance: number, purchases: Array, history: Array }
```

## UI Components

### 1. Purchase Modal
- Triggered from dashboard when approaching/exceeding limits
- Shows available packages with pricing
- Integrates Stripe Elements for payment

### 2. Usage Display Updates
- Show extra minutes balance alongside plan minutes
- Visual indicator when using extra minutes
- Progress bars for both plan and extra minutes

### 3. Purchase History
- New section in settings/billing
- Shows all purchases with status
- Download receipts

## Stripe Integration

### Setup Requirements
1. Create products in Stripe for each package
2. Set up webhook endpoint
3. Handle payment confirmations
4. Store payment metadata

### Payment Flow
1. User selects package
2. Create payment intent
3. User completes payment
4. Webhook confirms payment
5. Credit minutes to user account

## Implementation Steps

### Phase 1: Database & Backend (Week 1)
1. Create database migrations
2. Set up Stripe integration
3. Implement purchase API endpoints
4. Update usage tracking logic

### Phase 2: Frontend UI (Week 2)
1. Build purchase modal component
2. Update usage displays
3. Add purchase triggers
4. Implement purchase history

### Phase 3: Testing & Refinement (Week 3)
1. End-to-end testing
2. Error handling
3. Edge cases (refunds, failed payments)
4. Performance optimization

## Security Considerations

1. **RLS Policies**: Ensure users can only see their own purchases
2. **Payment Security**: Never store card details, use Stripe tokens
3. **Webhook Validation**: Verify webhook signatures
4. **Rate Limiting**: Prevent abuse of purchase endpoints

## Monitoring & Analytics

### Track:
- Purchase conversion rates
- Most popular packages
- Usage patterns (plan vs extra)
- Revenue from extra minutes

### Alerts:
- Failed payments
- Unusual purchase patterns
- Low extra minutes balance

## Future Enhancements

1. **Bulk Discounts**: Offer better rates for larger packages
2. **Auto-Refill**: Automatically purchase when low
3. **Team Sharing**: Share extra minutes within organization
4. **Rollover**: Allow unused extra minutes to carry forward
5. **Gift Minutes**: Allow users to gift minutes to others

## Pricing Strategy

### Suggested Packages:
- **Small**: 60 minutes - $9.99
- **Medium**: 150 minutes - $19.99
- **Large**: 300 minutes - $34.99
- **Jumbo**: 600 minutes - $59.99

Price per minute decreases with larger packages to incentivize bulk purchases.

## Success Metrics

1. **Adoption Rate**: % of users who exceed plan limits that purchase extra
2. **Revenue Impact**: Additional revenue from extra minutes
3. **Retention**: Do extra minutes improve user retention?
4. **Usage Patterns**: How quickly are extra minutes consumed?

## Rollout Strategy

1. **Beta Testing**: Roll out to 10% of users first
2. **Monitoring**: Watch for issues and usage patterns
3. **Iterate**: Adjust pricing/packages based on data
4. **Full Launch**: Deploy to all users with marketing campaign