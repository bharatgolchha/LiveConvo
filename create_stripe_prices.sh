#!/bin/bash

# LiveConvo Stripe Pro Plan Price Creation Script
# Run this script after setting your STRIPE_SECRET_KEY environment variable

set -e  # Exit on error

# Check if STRIPE_SECRET_KEY is set
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ Error: STRIPE_SECRET_KEY environment variable is not set"
    echo "Please set it with: export STRIPE_SECRET_KEY='sk_test_...'"
    exit 1
fi

PRODUCT_ID="prod_SSMQpSGAstcxB3"

echo "🚀 Creating recurring prices for LiveConvo Pro Plan..."
echo "Product ID: $PRODUCT_ID"
echo ""

# Create Monthly Price ($29/month)
echo "Creating monthly price ($29/month)..."
MONTHLY_RESPONSE=$(curl -s https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d product="$PRODUCT_ID" \
  -d unit_amount=2900 \
  -d currency=usd \
  -d "recurring[interval]"=month \
  -d "nickname"="LiveConvo Pro Monthly")

MONTHLY_PRICE_ID=$(echo "$MONTHLY_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$MONTHLY_PRICE_ID" ]; then
    echo "✅ Monthly price created: $MONTHLY_PRICE_ID"
else
    echo "❌ Failed to create monthly price"
    echo "Response: $MONTHLY_RESPONSE"
    exit 1
fi

echo ""

# Create Yearly Price ($290/year)
echo "Creating yearly price ($290/year)..."
YEARLY_RESPONSE=$(curl -s https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY:" \
  -d product="$PRODUCT_ID" \
  -d unit_amount=29000 \
  -d currency=usd \
  -d "recurring[interval]"=year \
  -d "nickname"="LiveConvo Pro Yearly")

YEARLY_PRICE_ID=$(echo "$YEARLY_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$YEARLY_PRICE_ID" ]; then
    echo "✅ Yearly price created: $YEARLY_PRICE_ID"
else
    echo "❌ Failed to create yearly price"
    echo "Response: $YEARLY_RESPONSE"
    exit 1
fi

echo ""
echo "🎉 Price creation completed!"
echo ""
echo "📝 Next steps:"
echo "1. Update your Edge Functions environment variables:"
echo "   STRIPE_PRO_MONTHLY_PRICE_ID=$MONTHLY_PRICE_ID"
echo "   STRIPE_PRO_YEARLY_PRICE_ID=$YEARLY_PRICE_ID"
echo ""
echo "2. Update your database plans table with these price IDs"
echo ""
echo "3. Test the Edge Functions with these new price IDs" 