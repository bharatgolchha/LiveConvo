# Stripe Price Migration Strategy: Flat → Quantity-Based

## Current Situation
- You have 37 active subscriptions on flat-rate prices
- Stripe doesn't allow modifying existing prices to be quantity-based
- You want to enable per-seat billing for teams

## Recommended Approach: Dual Product Strategy

### 1. Keep Existing Products for Individuals
```
price_1RiEU5PDRhYPOpbXOUZC5SnA - Pro Individual ($29/month flat)
price_1RlqKlPDRhYPOpbXb2SfdR2i - Max Individual ($99/month flat)
```

### 2. Create New Team Products in Stripe

Go to Stripe Dashboard → Products → Add Product:

**Pro Team**
- Pricing: $29 per seat per month
- Usage type: Licensed (quantity-based)
- Monthly price ID: price_XXXXX_team_monthly
- Yearly price ID: price_XXXXX_team_yearly

**Max Team**
- Pricing: $99 per seat per month  
- Usage type: Licensed (quantity-based)
- Monthly price ID: price_YYYYY_team_monthly
- Yearly price ID: price_YYYYY_team_yearly

### 3. Update Database Schema

```sql
-- Add new team-specific price IDs
UPDATE public.plans 
SET 
    team_stripe_price_id_monthly = 'price_XXXXX_team_monthly',
    team_stripe_price_id_yearly = 'price_XXXXX_team_yearly'
WHERE name = 'pro';

UPDATE public.plans
SET
    team_stripe_price_id_monthly = 'price_YYYYY_team_monthly',
    team_stripe_price_id_yearly = 'price_YYYYY_team_yearly'  
WHERE name = 'max';
```

### 4. Update Checkout Logic

In your checkout flow, determine which price to use:

```typescript
// Pseudo-code for checkout
const priceId = isTeamPurchase 
  ? plan.team_stripe_price_id_monthly  // Quantity-based
  : plan.stripe_price_id_monthly;       // Flat-rate

const checkoutSession = await stripe.checkout.sessions.create({
  line_items: [{
    price: priceId,
    quantity: isTeamPurchase ? numberOfSeats : 1
  }],
  // ...
});
```

## Alternative: Full Migration (More Complex)

If you MUST migrate everyone to quantity-based:

### Phase 1: Create New Prices
1. Create new quantity-based prices in Stripe
2. Update database with new price IDs

### Phase 2: Migrate Subscriptions
```typescript
// Migration script
async function migrateSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Cancel old subscription at period end
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
  
  // Create new subscription with quantity-based pricing
  await stripe.subscriptions.create({
    customer: subscription.customer,
    items: [{
      price: 'new_quantity_based_price_id',
      quantity: 1  // Start with 1 seat
    }],
    trial_end: subscription.current_period_end, // Start after current period
  });
}
```

### Phase 3: Handle Webhooks
- Update webhook handlers to manage both old and new subscription types
- Track migration status in database

## Risks of Full Migration
- Customer confusion (billing changes)
- Potential revenue impact (if not communicated well)
- Technical complexity (managing two systems during transition)
- Risk of billing errors during migration

## Recommendation: Use Dual Strategy
- Keep existing individual flat-rate prices
- Add new team quantity-based prices
- Let market segmentation happen naturally:
  - Individuals → Flat rate
  - Teams → Per-seat pricing
- No forced migration needed!