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
      // Handle subscription events
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
        console.log('Price ID:', priceId);
        
        // Hardcode the plan lookup for now
        let planId = null;
        let planType = 'individual_free';
        
        if (priceId === 'price_1RXa5S2eW0vYydurJ8nlepOf' || priceId === 'price_1RXa5Z2eW0vYydurC5gLjswF') {
          planId = 'c4d87221-80b1-477c-bc21-bce5532e764e';
          planType = 'individual_pro';
        }
        
        console.log('Plan:', { planId, planType });
        
        if (!planId) {
          console.error('Unknown price ID:', priceId);
          return new Response(JSON.stringify({ 
            received: true, 
            error: 'Unknown price' 
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200,
          });
        }
        
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
          // Cancel any existing subscriptions without stripe_subscription_id for this user
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.id)
            .is('stripe_subscription_id', null);
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
        console.log('Subscription ID:', invoice.subscription);
        
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
      
      // Handle checkout session completed
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log('Processing checkout completion:', session.id);
        console.log('Subscription ID:', session.subscription);
        
        if (session.subscription && session.payment_status === 'paid') {
          // Update subscription status to active
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', session.subscription);
            
          if (updateError) {
            console.error('Failed to update subscription status:', updateError);
          } else {
            console.log('Subscription marked as active after checkout');
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
});