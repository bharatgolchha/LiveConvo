# Stripe Tiered Pricing Setup Guide

## Setting Up Tiered Pricing in Stripe

### Step 1: Create Products with Graduated Pricing

1. Go to **Stripe Dashboard → Products**
2. Click **"+ Add product"**
3. Configure as follows:

#### Pro Team Product
- **Product name**: Pro Team
- **Pricing model**: Graduated pricing
- **Billing period**: Monthly (create yearly separately)

**Graduated Tiers (Recommended):**
```
Tier 1: Up to 5 users     → $29/user
Tier 2: 6 to 15 users     → $26/user  
Tier 3: 16 to 30 users    → $23/user
Tier 4: 31+ users         → $20/user
```

**How Stripe Calculates (Graduated):**
- 8 users = (5 × $29) + (3 × $26) = $223/month
- 20 users = (5 × $29) + (10 × $26) + (5 × $23) = $520/month

#### Max Team Product  
- **Product name**: Max Team
- **Pricing model**: Graduated pricing
- **Billing period**: Monthly

**Graduated Tiers:**
```
Tier 1: Up to 3 users     → $99/user
Tier 2: 4 to 10 users     → $89/user
Tier 3: 11 to 25 users    → $79/user
Tier 4: 26 to 50 users    → $69/user
Tier 5: 51+ users         → $59/user
```

### Step 2: Alternative - Volume Pricing

If you prefer **volume pricing** (all users get same rate based on total):

#### Pro Team Volume Pricing
```
1-5 users:    $29/user (all users pay $29)
6-15 users:   $26/user (all users pay $26)
16-30 users:  $23/user (all users pay $23)
31+ users:    $20/user (all users pay $20)
```

**How Stripe Calculates (Volume):**
- 8 users = 8 × $26 = $208/month (all at tier 2 rate)
- 20 users = 20 × $23 = $460/month (all at tier 3 rate)

### Step 3: API Configuration

When creating subscriptions with tiered pricing:

```javascript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{
    price: 'price_xxxxx', // Your tiered price ID
    quantity: numberOfSeats
  }],
  proration_behavior: 'create_prorations',
  billing_cycle_anchor: 'now',
});
```

### Step 4: Update Your Database

```sql
-- Store the tiered price IDs
UPDATE public.plans 
SET 
    team_stripe_price_id_monthly = 'price_graduated_pro_monthly',
    team_stripe_price_id_yearly = 'price_graduated_pro_yearly',
    -- Store tier information for display
    team_pricing_tiers = jsonb_build_object(
        'type', 'graduated',
        'tiers', jsonb_build_array(
            jsonb_build_object('up_to', 5, 'per_unit', 29),
            jsonb_build_object('up_to', 15, 'per_unit', 26),
            jsonb_build_object('up_to', 30, 'per_unit', 23),
            jsonb_build_object('up_to', null, 'per_unit', 20)
        )
    )
WHERE name = 'pro';
```

## Graduated vs Volume: Which to Choose?

### Graduated Pricing ✅ (Recommended)
**Pros:**
- More revenue per customer
- Rewards early adopters (first seats always cheapest)
- Easier to understand marginal cost
- Better for growing teams

**Example**: Team grows from 5→6 users
- Only the 6th user is at the discounted rate
- Predictable cost increase

### Volume Pricing
**Pros:**
- Simpler to explain ("everyone pays the same")
- Bigger perceived discount
- Better for large teams joining at once

**Cons:**
- Revenue cliff (going from 5→6 users, ALL users get discount)
- Can discourage growth near tier boundaries

## Testing Your Pricing

### Pricing Calculator Example

```typescript
function calculateGraduatedPrice(seats: number): number {
  const tiers = [
    { upTo: 5, price: 29 },
    { upTo: 15, price: 26 },
    { upTo: 30, price: 23 },
    { upTo: Infinity, price: 20 }
  ];
  
  let total = 0;
  let remaining = seats;
  
  for (const tier of tiers) {
    const seatsInTier = Math.min(remaining, tier.upTo - (seats - remaining));
    total += seatsInTier * tier.price;
    remaining -= seatsInTier;
    if (remaining <= 0) break;
  }
  
  return total;
}

// Test cases
console.log(calculateGraduatedPrice(5));  // $145 (5×29)
console.log(calculateGraduatedPrice(10)); // $275 (5×29 + 5×26)
console.log(calculateGraduatedPrice(20)); // $520 (5×29 + 10×26 + 5×23)
```

## Important Considerations

1. **Proration**: Stripe handles this automatically
2. **Downgrades**: Users moving to lower tiers get credits
3. **Display**: Show pricing table clearly on your pricing page
4. **Invoices**: Stripe itemizes each tier on invoices

## Annual Pricing Tiers

For annual plans, offer additional discount:
- Monthly: Use tiers above
- Annual: Apply 15-20% discount on top of tier pricing
- Example: Pro Tier 1 = $29/month or $290/year (save $58)