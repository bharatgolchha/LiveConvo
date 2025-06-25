# Extra Minutes Feature - Implementation Summary

## Quick Overview
Users can purchase additional minutes when they exceed their monthly plan limits, allowing uninterrupted service without plan upgrades.

## Implementation Approach

### Phase 1: Database & Backend (3-4 days)
1. **Database Migration** ✅
   - Created tables: `extra_minutes_packages`, `extra_minutes_purchases`, `extra_minutes_usage`
   - Updated `monthly_usage_cache` with extra minutes tracking
   - Added `check_usage_limit` function enhancement
   - Created `deduct_extra_minutes` function

2. **Core APIs** (Next Steps)
   - Update `/api/usage/track-minute` to deduct extra minutes when plan limit exceeded
   - Update `/api/usage/check-limit` to include extra minutes in availability
   - Create `/api/extra-minutes/packages` - List available packages
   - Create `/api/extra-minutes/purchase` - Initialize Stripe payment
   - Create `/api/extra-minutes/balance` - Get user's balance

### Phase 2: Payment Integration (2-3 days)
1. **Stripe Setup**
   - Create products in Stripe Dashboard for each package
   - Add Stripe webhook handler at `/api/webhooks/stripe`
   - Handle payment confirmations and credit minutes

2. **Payment Flow**
   ```
   User clicks "Buy Minutes" → Select Package → Stripe Payment → 
   Webhook Confirms → Credit Minutes → Update UI
   ```

### Phase 3: Frontend UI (3-4 days)
1. **Purchase Modal**
   - Similar design to existing `PricingModal`
   - Package selection with clear pricing
   - Stripe Elements integration

2. **Usage Display Updates**
   - Dashboard: Show extra minutes balance
   - Recording UI: Display when using extra minutes
   - Add visual indicator (different color progress bar)

3. **Purchase Triggers**
   - Auto-show purchase modal when limits reached
   - "Buy Minutes" button in dashboard
   - Warning notifications at 80%, 90%, 100% usage

## Key Technical Decisions

### Usage Priority
- Always use plan minutes first
- Automatically switch to extra minutes when plan exhausted
- FIFO consumption of extra minutes (oldest purchases first)

### Pricing Strategy
- Small (60 min): $9.99 - Best for occasional overages
- Medium (150 min): $19.99 - Popular choice
- Large (300 min): $34.99 - Better value
- Jumbo (600 min): $59.99 - Best price per minute

### No Expiration (Initially)
- Purchased minutes don't expire
- Simplifies implementation and improves user experience
- Can add expiration later if needed

## Integration Points

### Minimal Changes Required
1. **track-minute API**: Add 10-15 lines for extra minutes deduction
2. **check-limit API**: Already updated via SQL function
3. **Dashboard**: Add balance display component
4. **UsageDisplay**: Update to show extra minutes

### New Components
1. **ExtraMinutesPurchaseModal**: Package selection and payment
2. **ExtraMinutesBalance**: Display widget for dashboard
3. **PurchaseHistory**: Transaction history view

## Success Metrics
- Conversion rate: % of users hitting limit who purchase
- Average package size purchased
- Revenue from extra minutes
- User retention improvement

## Risks & Mitigations
1. **Payment Failures**: Implement retry logic and clear error messages
2. **Race Conditions**: Use database transactions for minute deduction
3. **User Confusion**: Clear UI showing plan vs extra minutes

## Timeline Estimate
- **Total**: 8-11 days
- **MVP** (purchase & use): 5-6 days
- **Polish** (history, analytics): 3-5 days

## Next Immediate Steps
1. Set up Stripe products and webhook endpoint
2. Implement purchase API with payment intent creation
3. Update track-minute API to handle extra minutes
4. Build purchase modal UI component