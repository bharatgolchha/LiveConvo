import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Payment system is not configured. STRIPE_SECRET_KEY is missing. Please contact support.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { priceId, planId, interval, referralCode } = await req.json()

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Price ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating checkout session for:', { userId: user.id, priceId, planId, interval, referralCode })

    // Get or create Stripe customer
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve user data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let customerId = userData?.stripe_customer_id

    if (!customerId) {
      console.log('Creating new Stripe customer for user:', user.id)
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // First, verify the price exists and is recurring
    try {
      const price = await stripe.prices.retrieve(priceId)
      console.log('Retrieved price:', { id: price.id, type: price.type, recurring: price.recurring })
      
      if (price.type !== 'recurring') {
        throw new Error(`Price ${priceId} is not a recurring price. It's type is: ${price.type}`)
      }
    } catch (priceError: any) {
      console.error('Error retrieving price:', priceError)
      return new Response(
        JSON.stringify({ 
          error: `Invalid price configuration: ${priceError.message}`,
          priceId: priceId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the origin URL with fallback
    const origin = req.headers.get('origin') || 'https://liveprompt.ai'
    console.log('Using origin URL:', origin)

    // Handle referral code if provided
    let discounts: any[] = []
    let referralMetadata: any = {}
    
    if (referralCode) {
      console.log('Validating referral code:', referralCode)
      
      // Validate the referral code
      const { data: referrer, error: referralError } = await supabase
        .from('users')
        .select('id, email')
        .eq('referral_code', referralCode)
        .single()
        
      if (referralError || !referrer) {
        console.error('Invalid referral code:', referralCode, referralError)
        return new Response(
          JSON.stringify({ error: 'Invalid referral code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Make sure user isn't using their own referral code
      if (referrer.id === user.id) {
        return new Response(
          JSON.stringify({ error: 'You cannot use your own referral code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log('Valid referral code from user:', referrer.email)
      
      // Create or retrieve a 10% discount coupon
      const couponId = 'REFERRAL_10_PERCENT_OFF'
      let coupon
      
      try {
        // Try to retrieve existing coupon
        coupon = await stripe.coupons.retrieve(couponId)
        console.log('Retrieved existing referral coupon:', couponId)
      } catch (error: any) {
        // If coupon doesn't exist, create it
        if (error.code === 'resource_missing') {
          console.log('Creating new referral coupon')
          coupon = await stripe.coupons.create({
            id: couponId,
            percent_off: 10,
            duration: 'forever',
            name: 'Referral Discount',
            metadata: {
              type: 'referral_discount'
            }
          })
          console.log('Created new referral coupon:', coupon.id)
        } else {
          throw error
        }
      }
      
      // Add the coupon to discounts array
      discounts = [{
        coupon: couponId
      }]
      
      // Add referral metadata
      referralMetadata = {
        referral_code: referralCode,
        referrer_id: referrer.id,
        referrer_email: referrer.email
      }
    }

    // Create checkout session - back to line_items which is the correct format
    const sessionConfig: any = {
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
          interval: interval,
          ...referralMetadata
        },
      },
    }
    
    // Add discounts if we have a referral code
    if (discounts.length > 0) {
      sessionConfig.discounts = discounts
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('Checkout session created:', session.id)

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    
    if (error.type === 'StripeInvalidRequestError') {
      return new Response(
        JSON.stringify({ 
          error: `Stripe error: ${error.message}`,
          details: error.raw 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        error: 'Failed to create checkout session',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})