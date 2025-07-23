import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  console.log('=== WEBHOOK CALLED ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify environment variables
    const hasStripeKey = !!Deno.env.get('STRIPE_SECRET_KEY');
    const hasWebhookSecret = !!Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const hasSupabaseUrl = !!Deno.env.get('SUPABASE_URL');
    const hasSupabaseKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', { hasStripeKey, hasWebhookSecret, hasSupabaseUrl, hasSupabaseKey });
    
    const signature = req.headers.get('stripe-signature');
    if (!signature || !hasWebhookSecret) {
      return new Response('Missing signature or webhook secret', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const body = await req.text();
    console.log('Body length:', body.length);

    // Import and verify webhook
    const { default: Stripe } = await import("https://esm.sh/stripe@14.21.0");
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-06-20',
    });
    
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
    let event: any;
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log('✅ Webhook verified! Event type:', event.type);
    } catch (err: any) {
      console.error('Signature verification failed:', err.message);
      return new Response(`Signature verification failed: ${err.message}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Import Supabase
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Process the event
    try {
      // Handle checkout session completed - THIS IS CRITICAL FOR IMMEDIATE UPDATES
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log('Processing checkout completion:', session.id);
        console.log('Subscription ID:', session.subscription);
        console.log('Payment status:', session.payment_status);
        console.log('Customer:', session.customer);
        
        if (session.subscription && session.payment_status === 'paid') {
          // Get the subscription from Stripe to get all details
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          console.log('Retrieved subscription:', subscription.id);
          console.log('Subscription status:', subscription.status);
          console.log('Subscription metadata:', subscription.metadata);
          
          // Find user by customer ID
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, current_organization_id')
            .eq('stripe_customer_id', session.customer)
            .single();
            
          if (!userData) {
            console.error('User not found for customer:', session.customer);
            return new Response(JSON.stringify({ 
              received: true, 
              error: 'User not found' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200,
            });
          }
          
          console.log('User found:', userData.id);
          
          // Store checkout session data for conversion tracking
          try {
            // For trials, get the actual subscription price (not the payment amount which is 0)
            let conversionAmount = session.amount_total || 0;
            if (subscription.trial_end && session.amount_total === 0) {
              // This is a trial - use the subscription price instead
              const price = subscription.items.data[0]?.price;
              if (price && price.unit_amount) {
                conversionAmount = price.unit_amount; // This is the actual subscription price in cents
                console.log('Trial subscription - using actual price:', conversionAmount);
              }
            }
            
            const { error: checkoutError } = await supabase
              .from('checkout_sessions')
              .upsert({
                stripe_session_id: session.id,
                user_id: userData.id,
                amount_total: conversionAmount, // Use actual subscription price for trials
                currency: session.currency || 'usd',
                payment_status: session.payment_status,
                subscription_id: session.subscription as string,
                processed_at: new Date().toISOString(),
              }, {
                onConflict: 'stripe_session_id'
              });

            if (checkoutError) {
              console.error('Failed to store checkout session:', checkoutError);
            } else {
              console.log('Checkout session stored successfully:', session.id);
            }
          } catch (err) {
            console.error('Error storing checkout session:', err);
          }
          
          // Get price details
          const priceId = subscription.items.data[0]?.price.id;
          
          // Look up plan by price ID
          const { data: planData, error: planError } = await supabase
            .from('plans')
            .select('id, name, plan_type')
            .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
            .single();
            
          if (!planData) {
            console.error('Plan not found for price:', priceId);
            return new Response(JSON.stringify({ 
              received: true, 
              error: 'Plan not found' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200,
            });
          }
          
          // Update any existing incomplete subscriptions to canceled
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.id)
            .in('status', ['incomplete', 'active'])
            .neq('stripe_subscription_id', subscription.id);
          
          // Create or update subscription
          const subscriptionData = {
            user_id: userData.id,
            organization_id: userData.current_organization_id || null,
            plan_id: planData.id,
            plan_type: planData.plan_type || 'individual',
            stripe_subscription_id: subscription.id,
            stripe_customer_id: session.customer,
            stripe_price_id: priceId,
            status: 'active', // Set to active immediately since payment is confirmed
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .upsert(subscriptionData, {
              onConflict: 'stripe_subscription_id'
            })
            .select();
            
          if (subError) {
            console.error('Failed to update subscription:', subError);
            return new Response(JSON.stringify({ 
              received: true, 
              error: 'Failed to update subscription' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200,
            });
          }
          
          console.log('✅ Subscription activated from checkout:', subData);
          
          // Update user's last_subscription_change timestamp for notification
          await supabase
            .from('users')
            .update({ 
              last_subscription_change: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);

          // REFERRAL PROCESSING
          const referralCode = subscription.metadata?.referral_code;
          const referrerId = subscription.metadata?.referrer_id;
          
          if (referralCode && referrerId) {
            console.log('Processing referral:', { referralCode, referrerId, userId: userData.id });
            
            // Check for existing referral
            const { data: existingReferral } = await supabase
              .from('user_referrals')
              .select('*')
              .eq('referee_id', userData.id)
              .eq('referrer_id', referrerId)
              .single();
            
            if (existingReferral && existingReferral.status === 'pending') {
              console.log('Found pending referral:', existingReferral.id);
              
              // Update referral status to completed
              const { error: referralUpdateError } = await supabase
                .from('user_referrals')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  stripe_payment_intent_id: session.payment_intent,
                  metadata: {
                    ...existingReferral.metadata,
                    invoice_id: session.invoice,
                    subscription_id: subscription.id,
                    amount_paid: session.amount_total / 100, // Convert from cents
                  }
                })
                .eq('id', existingReferral.id);
              
              if (referralUpdateError) {
                console.error('Error updating referral:', referralUpdateError);
              } else {
                console.log('✅ Referral marked as completed');
                
                // Log the event
                await supabase.rpc('log_referral_event', {
                  p_event_type: 'payment_completed',
                  p_referral_id: existingReferral.id,
                  p_referee_id: userData.id,
                  p_referrer_id: referrerId,
                  p_referral_code: referralCode,
                  p_event_data: {
                    payment_intent_id: session.payment_intent,
                    invoice_id: session.invoice,
                    amount_paid: session.amount_total / 100
                  }
                });
                
                // Schedule credit for 7 days later
                const creditDate = new Date();
                creditDate.setDate(creditDate.getDate() + 7);
                
                const { data: credit, error: creditError } = await supabase
                  .from('user_credits')
                  .insert({
                    user_id: referrerId,
                    amount: existingReferral.reward_amount || 5.00,
                    type: 'referral_reward',
                    description: `Referral reward for ${userData.email}`,
                    reference_id: existingReferral.id,
                    created_at: creditDate.toISOString(), // Schedule for future
                    expires_at: new Date(creditDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiry
                    metadata: {
                      referee_email: userData.email,
                      payment_intent_id: session.payment_intent,
                      scheduled_date: creditDate.toISOString()
                    }
                  })
                  .select()
                  .single();
                
                if (creditError) {
                  console.error('Error creating credit:', creditError);
                  await supabase.rpc('log_referral_event', {
                    p_event_type: 'credit_failed',
                    p_referral_id: existingReferral.id,
                    p_referrer_id: referrerId,
                    p_error_message: creditError.message
                  });
                } else {
                  console.log('✅ Credit scheduled for:', creditDate.toISOString());
                  
                  await supabase.rpc('log_referral_event', {
                    p_event_type: 'credit_scheduled',
                    p_referral_id: existingReferral.id,
                    p_referrer_id: referrerId,
                    p_event_data: {
                      credit_id: credit.id,
                      scheduled_date: creditDate.toISOString(),
                      amount: existingReferral.reward_amount || 5.00
                    }
                  });
                  
                  // Update referral status to rewarded
                  await supabase
                    .from('user_referrals')
                    .update({ status: 'rewarded' })
                    .eq('id', existingReferral.id);
                }
              }
            }
          }
        }
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          session_id: session.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }
      
      // Handle subscription events - FIXED REDUNDANT LOOKUP
      if (event.type === 'customer.subscription.created' || 
          event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        console.log('Processing subscription:', subscription.id);
        console.log('Customer ID:', subscription.customer);
        console.log('Status:', subscription.status);
        
        // Get customer email and user data in one flow
        let userData: any = null;
        let email: string | null = null;
        
        // First try to get user by stripe_customer_id
        const { data: userByCustomerId, error: userLookupError } = await supabase
          .from('users')
          .select('id, email, current_organization_id')
          .eq('stripe_customer_id', subscription.customer)
          .single();
        
        if (userByCustomerId) {
          userData = userByCustomerId;
          email = userData.email;
          console.log('Found user by customer ID:', userData);
        } else {
          // If not found, try to get email from Stripe
          try {
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            email = (customer as any).email;
            console.log('Customer email from Stripe:', email);
            
            if (email) {
              // Look up user by email
              const { data: userByEmail, error: emailLookupError } = await supabase
                .from('users')
                .select('id, current_organization_id')
                .eq('email', email)
                .single();
                
              if (userByEmail) {
                userData = userByEmail;
                userData.email = email; // Add email to userData for consistency
              }
            }
          } catch (err: any) {
            console.error('Failed to retrieve customer from Stripe:', err.message);
          }
        }
        
        if (!userData) {
          console.error('User not found for subscription');
          return new Response(JSON.stringify({ 
            received: true, 
            error: 'User not found' 
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200,
          });
        }
        
        console.log('User found:', userData.id);
        
        // Get price ID and plan
        const priceId = subscription.items.data[0]?.price.id;
        console.log('Price details:', {
          priceId: priceId,
          unitAmount: subscription.items.data[0]?.price.unit_amount,
          interval: subscription.items.data[0]?.price.recurring?.interval
        });
        
        // Look up plan by price ID from database
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('id, name, plan_type')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
          .single();
          
        if (planError || !planData) {
          console.error('Plan lookup error:', planError);
          return new Response(JSON.stringify({ 
            received: true, 
            error: 'Plan not found for price',
            priceId: priceId
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200,
          });
        }
        
        const planId = planData.id;
        const planType = planData.plan_type || 'individual';
        
        console.log('Plan found:', { planId, planType });
        
        // Generate UUID for the subscription
        const subscriptionId = globalThis.crypto.randomUUID();
        
        // Debug subscription dates
        let startDate, endDate;
        try {
          console.log('Raw timestamps:', {
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            type_start: typeof subscription.current_period_start,
            type_end: typeof subscription.current_period_end
          });
          
          startDate = new Date(subscription.current_period_start * 1000).toISOString();
          endDate = new Date(subscription.current_period_end * 1000).toISOString();
          
          console.log('Converted dates:', { startDate, endDate });
        } catch (dateError: any) {
          console.error('Date conversion error:', dateError);
          console.error('Date error stack:', dateError.stack);
          // Use current date as fallback
          startDate = new Date().toISOString();
          endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
        }
        
        // Create/update subscription
        const subscriptionData: any = {
          id: subscriptionId,
          user_id: userData.id,
          organization_id: userData.current_organization_id || null,
          plan_id: planId,
          plan_type: planType,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          stripe_price_id: priceId,
          status: subscription.status,
          current_period_start: startDate,
          current_period_end: endDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Inserting subscription:', subscriptionData);
        
        // Check if subscription already exists
        const { data: existingData } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        
        // If updating, use existing ID
        if (existingData) {
          subscriptionData.id = existingData.id;
          delete subscriptionData.created_at; // Don't update created_at on updates
        } else {
          // Cancel any existing subscriptions for this user
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.id)
            .neq('stripe_subscription_id', subscription.id)
            .in('status', ['active', 'incomplete']);
        }
        
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'stripe_subscription_id'
          })
          .select();
          
        if (subError) {
          console.error('Subscription insert error:', subError);
          console.error('Error details:', JSON.stringify(subError, null, 2));
          return new Response(JSON.stringify({ 
            received: true, 
            error: `Database error: ${subError.message}` 
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200,
          });
        }
        
        console.log('Subscription created/updated:', subData);
        
        // Update user's last_subscription_change timestamp
        await supabase
          .from('users')
          .update({ 
            last_subscription_change: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.id);
        
        // Sync organization member limits (trigger should handle this, but be explicit)
        if (subscription.status === 'active' && userData.current_organization_id) {
          console.log('Syncing organization member limits...');
          
          // Get plan details
          const { data: planData, error: planError } = await supabase
            .from('plans')
            .select('monthly_audio_hours_limit')
            .eq('id', planId)
            .single();
            
          if (planData && !planError) {
            // Update organization member limits
            const { error: memberUpdateError } = await supabase
              .from('organization_members')
              .update({ 
                monthly_audio_hours_limit: planData.monthly_audio_hours_limit,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userData.id)
              .eq('organization_id', userData.current_organization_id);
              
            if (memberUpdateError) {
              console.error('Failed to update organization member limits:', memberUpdateError);
            } else {
              console.log('Organization member limits updated to:', planData.monthly_audio_hours_limit, 'hours');
            }
            
            // Update organization limits
            const { error: orgUpdateError } = await supabase
              .from('organizations')
              .update({ 
                monthly_audio_hours_limit: planData.monthly_audio_hours_limit,
                updated_at: new Date().toISOString()
              })
              .eq('id', userData.current_organization_id);
              
            if (orgUpdateError) {
              console.error('Failed to update organization limits:', orgUpdateError);
            }
          }
        }
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          subscription_id: subscription.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }
      
      // Handle payment success events
      if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        console.log('Processing payment success for invoice:', invoice.id);
        console.log('Invoice details:', {
          subscription_id: invoice.subscription,
          customer_id: invoice.customer,
          amount_paid: invoice.amount_paid,
          billing_reason: invoice.billing_reason
        });
        
        if (invoice.subscription) {
          // Update subscription status to active
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription);
            
          if (updateError) {
            console.error('Failed to update subscription status:', updateError);
          } else {
            console.log('Subscription marked as active');
          }
          
          // Update user's last_subscription_change timestamp
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();
            
          if (subData) {
            await supabase
              .from('users')
              .update({ 
                last_subscription_change: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', subData.user_id);
          }

          // Reset monthly usage if it's a new billing period
          if (invoice.billing_reason === 'subscription_cycle') {
            const { data: subData } = await supabase
              .from('subscriptions')
              .select('user_id')
              .eq('stripe_subscription_id', invoice.subscription)
              .single();
              
            if (subData) {
              // Reset user's monthly usage
              await supabase
                .from('users')
                .update({ 
                  current_month_audio_seconds: 0,
                  updated_at: new Date().toISOString()
                })
                .eq('id', subData.user_id);
                
              console.log('Reset monthly usage for user:', subData.user_id);
            }
          }

          // REFERRAL PROCESSING FOR FIRST PAYMENT
          if (invoice.billing_reason === 'subscription_create') {
            console.log('First subscription payment - checking for referrals');
            
            // Get subscription metadata
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const referralCode = subscription.metadata?.referral_code;
            const referrerId = subscription.metadata?.referrer_id;
            
            if (referralCode && referrerId) {
              // Find the user
              const { data: user } = await supabase
                .from('users')
                .select('id, email')
                .eq('stripe_customer_id', invoice.customer)
                .single();
              
              if (user) {
                // Find referral record
                const { data: referral } = await supabase
                  .from('user_referrals')
                  .select('*')
                  .eq('referee_id', user.id)
                  .eq('referrer_id', referrerId)
                  .eq('status', 'pending')
                  .single();
                
                if (referral) {
                  console.log('Processing referral payment for:', referral.id);
                  
                  // Update referral status
                  await supabase
                    .from('user_referrals')
                    .update({
                      status: 'completed',
                      completed_at: new Date().toISOString(),
                      stripe_payment_intent_id: invoice.payment_intent,
                      metadata: {
                        ...referral.metadata,
                        invoice_id: invoice.id,
                        subscription_id: invoice.subscription,
                        amount_paid: invoice.amount_paid / 100,
                      }
                    })
                    .eq('id', referral.id);
                  
                  // Log payment completed
                  await supabase.rpc('log_referral_event', {
                    p_event_type: 'payment_completed',
                    p_referral_id: referral.id,
                    p_referee_id: user.id,
                    p_referrer_id: referrerId,
                    p_referral_code: referralCode,
                    p_event_data: {
                      payment_intent_id: invoice.payment_intent,
                      invoice_id: invoice.id,
                      amount_paid: invoice.amount_paid / 100
                    }
                  });
                  
                  // Schedule credit for 7 days later
                  const creditDate = new Date();
                  creditDate.setDate(creditDate.getDate() + 7);
                  
                  const { data: credit, error: creditError } = await supabase
                    .from('user_credits')
                    .insert({
                      user_id: referrerId,
                      amount: referral.reward_amount || 5.00,
                      type: 'referral_reward',
                      description: `Referral reward for ${user.email}`,
                      reference_id: referral.id,
                      created_at: creditDate.toISOString(),
                      expires_at: new Date(creditDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                      metadata: {
                        referee_email: user.email,
                        payment_intent_id: invoice.payment_intent,
                        scheduled_date: creditDate.toISOString()
                      }
                    })
                    .select()
                    .single();
                  
                  if (!creditError) {
                    console.log('✅ Credit scheduled for referral');
                    
                    await supabase.rpc('log_referral_event', {
                      p_event_type: 'credit_scheduled',
                      p_referral_id: referral.id,
                      p_referrer_id: referrerId,
                      p_event_data: {
                        credit_id: credit.id,
                        scheduled_date: creditDate.toISOString(),
                        amount: referral.reward_amount || 5.00
                      }
                    });
                    
                    // Update referral to rewarded
                    await supabase
                      .from('user_referrals')
                      .update({ status: 'rewarded' })
                      .eq('id', referral.id);
                  }
                }
              }
            }
          }
        }
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          invoice_id: invoice.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle payment failure events
      if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object;
        console.log('Processing payment failure for invoice:', invoice.id);
        console.log('Invoice details:', {
          subscription_id: invoice.subscription,
          customer_id: invoice.customer,
          amount_due: invoice.amount_due,
          attempt_count: invoice.attempt_count,
          next_payment_attempt: invoice.next_payment_attempt
        });
        
        if (invoice.subscription) {
          // Update subscription status to past_due
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription);
            
          if (updateError) {
            console.error('Failed to update subscription status:', updateError);
          } else {
            console.log('Subscription marked as past_due');
          }

          // TODO: Send email notification to user about failed payment
          // This could trigger an email via Supabase edge function or external service
        }
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          invoice_id: invoice.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle upcoming invoice (3 days before charge)
      if (event.type === 'invoice.upcoming') {
        const invoice = event.data.object;
        console.log('Processing upcoming invoice:', invoice.id);
        console.log('Invoice details:', {
          subscription_id: invoice.subscription,
          customer_id: invoice.customer,
          amount_due: invoice.amount_due,
          billing_date: new Date(invoice.period_end * 1000).toISOString()
        });
        
        // TODO: Send reminder email about upcoming charge
        // This gives users time to update payment method if needed
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          invoice_id: invoice.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle trial ending soon (3 days before trial ends)
      if (event.type === 'customer.subscription.trial_will_end') {
        const subscription = event.data.object;
        console.log('Processing trial ending soon:', subscription.id);
        console.log('Trial ends at:', new Date(subscription.trial_end * 1000).toISOString());
        
        // TODO: Send email notification about trial ending
        // Encourage user to add payment method
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          subscription_id: subscription.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }
      
      // Handle subscription deletion/cancellation
      if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        console.log('Processing subscription cancellation:', subscription.id);
        
        // Update subscription status to canceled
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
          
        if (updateError) {
          console.error('Failed to update subscription status:', updateError);
        } else {
          console.log('Subscription marked as canceled');
        }
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          subscription_id: subscription.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle payment intent failures (immediate failures)
      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        console.log('Processing payment intent failure:', paymentIntent.id);
        console.log('Error:', paymentIntent.last_payment_error?.message);
        
        // This is useful for one-time payments or immediate failures
        // Different from invoice.payment_failed which is for subscription billing
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          payment_intent_id: paymentIntent.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle payment intent success
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log('Processing payment intent success:', paymentIntent.id);
        
        // Useful for tracking successful one-time payments
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          payment_intent_id: paymentIntent.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle customer updates
      if (event.type === 'customer.updated') {
        const customer = event.data.object;
        console.log('Processing customer update:', customer.id);
        console.log('Customer email:', customer.email);
        
        // Update user email if changed
        if (customer.email) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              email: customer.email,
              updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', customer.id);
            
          if (updateError) {
            console.error('Failed to update user email:', updateError);
          } else {
            console.log('User email updated');
          }
        }
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          customer_id: customer.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle customer deletion
      if (event.type === 'customer.deleted') {
        const customer = event.data.object;
        console.log('Processing customer deletion:', customer.id);
        
        // Mark all subscriptions as canceled
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customer.id);
          
        if (updateError) {
          console.error('Failed to cancel subscriptions:', updateError);
        } else {
          console.log('All subscriptions canceled for deleted customer');
        }
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          customer_id: customer.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle payment method events
      if (event.type === 'payment_method.attached') {
        const paymentMethod = event.data.object;
        console.log('Payment method attached:', paymentMethod.id);
        console.log('Customer:', paymentMethod.customer);
        
        // Could be used to send confirmation email
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          payment_method_id: paymentMethod.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle disputes
      if (event.type === 'charge.dispute.created') {
        const dispute = event.data.object;
        console.log('Dispute created:', dispute.id);
        console.log('Amount:', dispute.amount);
        console.log('Reason:', dispute.reason);
        
        // TODO: Alert admin team about dispute
        // Could update subscription status or flag account
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          dispute_id: dispute.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle refunds - FIXED CREDIT REVERSAL LOGIC
      if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        console.log('Charge refunded:', charge.id);
        console.log('Amount refunded:', charge.amount_refunded);
        
        // REFERRAL REFUND PROCESSING
        const paymentIntentId = charge.payment_intent;
        const refundAmount = charge.amount_refunded / 100; // Convert from cents
        const isFullRefund = charge.amount === charge.amount_refunded;
        
        // Find referral by payment intent
        const { data: referral } = await supabase
          .from('user_referrals')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .single();
        
        if (referral) {
          console.log('Found referral for refund:', referral.id);
          
          // Log refund event
          await supabase.rpc('log_referral_event', {
            p_event_type: 'refund_processed',
            p_referral_id: referral.id,
            p_referrer_id: referral.referrer_id,
            p_referee_id: referral.referee_id,
            p_event_data: {
              payment_intent_id: paymentIntentId,
              refund_amount: refundAmount,
              is_full_refund: isFullRefund,
              charge_id: charge.id
            }
          });
          
          // If full refund and referral is still pending/completed (not rewarded yet)
          if (isFullRefund && referral.status !== 'rewarded') {
            // Cancel the referral
            const { error: updateError } = await supabase
              .from('user_referrals')
              .update({
                status: 'expired',
                metadata: {
                  ...referral.metadata,
                  cancelled_reason: 'refund',
                  refund_date: new Date().toISOString(),
                  refund_amount: refundAmount
                }
              })
              .eq('id', referral.id);
            
            if (!updateError) {
              console.log(`Referral ${referral.id} cancelled due to refund`);
            }
          }
          
          // If referral was already rewarded, handle credit reversal
          if (referral.status === 'rewarded' && isFullRefund) {
            // Check if credit exists and hasn't been fully used
            const { data: credit } = await supabase
              .from('user_credits')
              .select('*')
              .eq('reference_id', referral.id)
              .eq('type', 'referral_reward')
              .single();
            
            if (credit) {
              // Check total balance to see if credit can be reversed
              const { data: allCredits } = await supabase
                .from('user_credits')
                .select('amount, type')
                .eq('user_id', referral.referrer_id);
              
              // Calculate current balance
              const currentBalance = allCredits?.reduce((acc, c) => {
                if (c.type === 'redemption') {
                  return acc - c.amount;
                }
                return acc + c.amount;
              }, 0) || 0;
              
              console.log(`Current balance for user ${referral.referrer_id}: ${currentBalance}`);
              
              if (currentBalance >= credit.amount) {
                // User has enough balance, we can reverse the full credit
                // Insert a NEGATIVE credit to reverse the reward
                await supabase
                  .from('user_credits')
                  .insert({
                    user_id: referral.referrer_id,
                    amount: -credit.amount, // NEGATIVE amount to reverse
                    type: 'referral_reward', // Same type but negative
                    description: `Reversal: Refund for ${referral.referee_email}`,
                    reference_id: referral.id,
                    metadata: {
                      reversal_reason: 'refund',
                      original_credit_id: credit.id,
                      refund_amount: refundAmount,
                      charge_id: charge.id
                    }
                  });
                
                console.log(`Reversed ${credit.amount} credits for referral ${referral.id}`);
                
                // Update referral status to indicate reversal
                await supabase
                  .from('user_referrals')
                  .update({
                    status: 'expired',
                    metadata: {
                      ...referral.metadata,
                      credit_reversed: true,
                      reversal_date: new Date().toISOString(),
                      reversal_amount: credit.amount
                    }
                  })
                  .eq('id', referral.id);
                  
              } else if (currentBalance > 0) {
                // User has some balance but not enough for full reversal
                // Reverse what we can
                await supabase
                  .from('user_credits')
                  .insert({
                    user_id: referral.referrer_id,
                    amount: -currentBalance, // Reverse available balance
                    type: 'referral_reward',
                    description: `Partial reversal: Refund for ${referral.referee_email}`,
                    reference_id: referral.id,
                    metadata: {
                      reversal_reason: 'refund',
                      original_credit_id: credit.id,
                      refund_amount: refundAmount,
                      partial_reversal: true,
                      reversed_amount: currentBalance,
                      original_amount: credit.amount
                    }
                  });
                
                console.log(`Partially reversed ${currentBalance} credits for referral ${referral.id}`);
              } else {
                console.log(`Cannot reverse credits for referral ${referral.id} - insufficient balance`);
              }
            }
          }
        }
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          charge_id: charge.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }
      
      // Handle other event types
      console.log('Unhandled event type:', event.type);
      return new Response(JSON.stringify({ received: true, event_type: event.type }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      });
      
    } catch (error: any) {
      console.error('Processing error:', error);
      console.error('Error stack:', error.stack);
      return new Response(JSON.stringify({ 
        received: true, 
        error: 'Processing failed',
        details: error.message 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      });
    }
    
  } catch (error: any) {
    console.error('General error:', error);
    console.error('Stack:', error.stack);
    return new Response('Webhook handler failed', { 
      status: 500,
      headers: corsHeaders 
    });
  }
}, {
  // CRITICAL: Disable JWT verification for Stripe webhooks
  skipAuthorization: true
});