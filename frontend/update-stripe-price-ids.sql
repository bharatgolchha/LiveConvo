-- Update Stripe Price IDs in Development Database
-- 
-- Instructions:
-- 1. Go to https://dashboard.stripe.com/test/products
-- 2. Create a product called "Pro Plan" if it doesn't exist
-- 3. Add two prices:
--    - Monthly: $X/month
--    - Yearly: $Y/year
-- 4. Copy the price IDs (they start with price_)
-- 5. Replace the placeholders below with your actual price IDs
-- 6. Run this SQL in your Supabase SQL editor

-- Replace these with your actual Stripe price IDs
UPDATE plans
SET 
  stripe_price_id_monthly = 'price_YOUR_MONTHLY_PRICE_ID',
  stripe_price_id_yearly = 'price_YOUR_YEARLY_PRICE_ID'
WHERE name = 'pro';

-- Verify the update
SELECT id, name, stripe_price_id_monthly, stripe_price_id_yearly 
FROM plans 
WHERE is_active = true 
ORDER BY sort_order;