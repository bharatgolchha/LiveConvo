import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Stripe from 'stripe';

interface CheckoutRequest {
  priceId: string;
  billingCycle: 'monthly' | 'yearly';
  referralCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe inside the function to avoid build-time errors
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-05-28.basil',
    });
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CheckoutRequest = await request.json();
    const { priceId, billingCycle, referralCode } = body;

    // Get or create Stripe customer
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let stripeCustomerId = userData.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      // Update user record with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);

      stripeCustomerId = customer.id;
    }

    // Prepare checkout session parameters
    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      metadata: {
        user_id: user.id,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
      customer_update: {
        address: 'auto',
      },
    };

    // Handle referral code discount
    if (referralCode) {
      // Validate referral code
      const { data: referrer, error: referralError } = await supabase
        .from('users')
        .select('id, referral_code')
        .eq('referral_code', referralCode)
        .single();

      if (!referralError && referrer && referrer.id !== user.id) {
        // Use a dynamic coupon name to avoid conflicts
        const couponId = `REFERRAL_10_${referralCode.toUpperCase()}`;
        let coupon;
        try {
          // Try to retrieve existing coupon
          coupon = await stripe.coupons.retrieve(couponId);
        } catch (err: any) {
          if (err.code === 'resource_missing') {
            // Create coupon if it doesn't exist
            try {
              coupon = await stripe.coupons.create({
                id: couponId,
                percent_off: 10,
                duration: 'once',
                metadata: {
                  type: 'referral_discount',
                  referral_code: referralCode,
                },
              });
            } catch (createErr: any) {
              // If creation fails due to race condition, try to retrieve again
              if (createErr.code === 'resource_already_exists') {
                coupon = await stripe.coupons.retrieve(couponId);
              } else {
                throw createErr;
              }
            }
          } else {
            throw err;
          }
        }

        // Apply discount to checkout
        checkoutParams.discounts = [
          {
            coupon: coupon.id,
          },
        ];

        // Store referral information in metadata
        checkoutParams.metadata!.referral_code = referralCode;
        checkoutParams.metadata!.referrer_id = referrer.id;
        checkoutParams.subscription_data!.metadata!.referral_code = referralCode;
        checkoutParams.subscription_data!.metadata!.referrer_id = referrer.id;
      }
    }

    // Check if user has any credits
    const { data: creditBalance } = await supabase
      .from('user_credits')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'referral_reward')
      .gte('expires_at', new Date().toISOString());

    const totalCredits = creditBalance?.reduce((sum, credit) => sum + credit.amount, 0) || 0;

    if (totalCredits > 0) {
      // Ensure credits are synced to Stripe
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/credits/sync-stripe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Note: Stripe will automatically apply the customer balance during checkout
      // We can add a note about available credits
      checkoutParams.metadata!.available_credits = totalCredits.toString();
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(checkoutParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      credits_available: totalCredits,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}