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
      // Handle checkout session completed
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log('Processing checkout completion:', session.id);
        console.log('Subscription ID:', session.subscription);
        console.log('Payment status:', session.payment_status);
        console.log('Customer:', session.customer);
        console.log('Metadata:', session.metadata);
        
        if (session.subscription && session.payment_status === 'paid') {
          // Get the subscription from Stripe to get all details
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          console.log('Retrieved subscription:', subscription.id);
          console.log('Subscription status:', subscription.status);
          
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
      
      // Handle invoice payment succeeded - REFERRAL PROCESSING
      if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        console.log('Processing payment success for invoice:', invoice.id);
        console.log('Invoice details:', {
          subscription_id: invoice.subscription,
          customer_id: invoice.customer,
          amount_paid: invoice.amount_paid,
          billing_reason: invoice.billing_reason,
          metadata: invoice.metadata
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
          
          // Get subscription and user data
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('user_id, stripe_checkout_session_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();
            
          if (subData) {
            // Update user's last_subscription_change timestamp
            await supabase
              .from('users')
              .update({ 
                last_subscription_change: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', subData.user_id);
            
            // REFERRAL PROCESSING - Check if this is first payment
            if (invoice.billing_reason === 'subscription_create') {
              console.log('First payment detected, processing referral...');
              
              // Check for pending referral
              const { data: referralData, error: referralError } = await supabase
                .from('user_referrals')
                .select('*')
                .eq('referee_user_id', subData.user_id)
                .eq('status', 'pending')
                .single();
              
              if (referralData && !referralError) {
                console.log('Found pending referral:', referralData.id);
                
                // Update referral to completed
                const { error: updateRefError } = await supabase
                  .from('user_referrals')
                  .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    first_payment_id: invoice.payment_intent,
                    stripe_checkout_session_id: subData.stripe_checkout_session_id
                  })
                  .eq('id', referralData.id);
                
                if (!updateRefError) {
                  console.log('Referral marked as completed');
                  
                  // Schedule credit for referrer after 7 days
                  const creditDate = new Date();
                  creditDate.setDate(creditDate.getDate() + 7);
                  
                  // Create a scheduled credit record
                  const { error: creditError } = await supabase
                    .from('user_credits')
                    .insert({
                      user_id: referralData.referrer_user_id,
                      amount: referralData.reward_amount || 5.00,
                      type: 'referral_reward',
                      description: `Referral reward for referring a new user`,
                      reference_id: referralData.id,
                      expires_at: new Date(creditDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from credit date
                      created_at: creditDate.toISOString() // Will be available after 7 days
                    });
                  
                  if (!creditError) {
                    console.log('Referral credit scheduled for:', creditDate.toISOString());
                    
                    // Update referral status to rewarded
                    await supabase
                      .from('user_referrals')
                      .update({
                        status: 'rewarded',
                        rewarded_at: creditDate.toISOString()
                      })
                      .eq('id', referralData.id);
                  } else {
                    console.error('Failed to create credit:', creditError);
                  }
                } else {
                  console.error('Failed to update referral:', updateRefError);
                }
              }
            }

            // Reset monthly usage if it's a new billing period
            if (invoice.billing_reason === 'subscription_cycle') {
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

      // Handle customer subscription events
      if (event.type === 'customer.subscription.created' || 
          event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        console.log('Processing subscription:', subscription.id);
        console.log('Customer ID:', subscription.customer);
        console.log('Status:', subscription.status);
        
        // Get customer email
        let email: string | null = null;
        try {
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          email = (customer as any).email;
          console.log('Customer email:', email);
        } catch (err: any) {
          console.error('Failed to retrieve customer:', err.message);
          
          // Try to find user by stripe_customer_id
          console.log('Looking up user by stripe_customer_id...');
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, current_organization_id')
            .eq('stripe_customer_id', subscription.customer)
            .single();
            
          if (userData) {
            console.log('Found user by customer ID:', userData);
            email = userData.email;
          } else {
            console.error('User lookup failed:', userError);
            return new Response(JSON.stringify({ 
              received: true, 
              error: 'Customer not found' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200,
            });
          }
        }
        
        if (!email) {
          console.error('No email found');
          return new Response(JSON.stringify({ 
            received: true, 
            error: 'No email' 
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200,
          });
        }
        
        // Get user
        console.log('Looking up user by email:', email);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, current_organization_id')
          .eq('email', email)
          .single();
          
        if (!userData) {
          console.error('User not found:', userError);
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
          .select('id, name, plan_type, monthly_audio_hours_limit')
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
        if (subscription.status === 'active' && userData.current_organization_id && planData) {
          console.log('Syncing organization member limits...');
          
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
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          subscription_id: subscription.id 
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

      // Handle refunds
      if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        console.log('Charge refunded:', charge.id);
        console.log('Amount refunded:', charge.amount_refunded);
        
        // Could be used to track refunds in your database
        
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