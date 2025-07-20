import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

// Helper to require environment variables
const requireEnv = (key: string): string => {
  const val = Deno.env.get(key);
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
};

// Initialize clients outside handler to avoid cold start delays
let stripe: Stripe | null = null;
let supabase: any = null;

try {
  // Initialize Stripe client
  const STRIPE_SECRET_KEY = requireEnv('STRIPE_SECRET_KEY');
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });

  // Initialize Supabase client
  const SUPABASE_URL = requireEnv('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
} catch (error) {
  console.error('Failed to initialize clients:', error);
}

// Store webhook secret separately for access in handler
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight immediately
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('=== WEBHOOK CALLED ===');
  console.log('Method:', req.method);

  try {
    // Verify webhook secret and client initialization
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return new Response('Server configuration error', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    if (!stripe || !supabase) {
      console.error('Failed to initialize clients - missing environment variables');
      return new Response('Server initialization error', { 
        status: 500,
        headers: corsHeaders 
      });
    }
    
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Missing stripe-signature header', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const body = await req.text();
    console.log('Body length:', body.length);

    let event: Stripe.Event;
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
      console.log('✅ Webhook verified! Event type:', event.type);
    } catch (err: any) {
      console.error('Signature verification failed:', err.message);
      return new Response(`Signature verification failed: ${err.message}`, { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Process the event
    try {
      // Handle checkout session completed
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Processing checkout completion:', session.id);
        console.log('Subscription ID:', session.subscription);
        console.log('Payment status:', session.payment_status);
        console.log('Customer:', session.customer);
        console.log('Metadata:', session.metadata);
        
        if (session.subscription) {
          // Get the subscription from Stripe to get all details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          console.log('Retrieved subscription:', subscription.id);
          console.log('Subscription status:', subscription.status);
          console.log('Trial end:', subscription.trial_end);
          
          // Validate subscription has items
          if (!subscription.items?.data?.length) {
            console.error('CRITICAL: Subscription has no items:', subscription.id);
            // Return 400 to retry - this might be a timing issue
            return new Response(JSON.stringify({ 
              error: 'Subscription has no items - will retry' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 400,
            });
          }
          
          // Find user by customer ID
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, current_organization_id')
            .eq('stripe_customer_id', session.customer)
            .single();
            
          if (!userData) {
            console.error('WARNING: User not found for customer:', session.customer);
            // This is likely a data sync issue - return 200 to not retry forever
            return new Response(JSON.stringify({ 
              received: true, 
              warning: 'User not found - check data sync' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200,
            });
          }
          
          console.log('User found:', userData.id);
          
          // If user doesn't have a current_organization_id, find their organization
          let organizationId = userData.current_organization_id;
          if (!organizationId) {
            console.log('User missing current_organization_id, looking for their organization...');
            const { data: membershipData } = await supabase
              .from('organization_members')
              .select('organization_id')
              .eq('user_id', userData.id)
              .eq('role', 'owner')
              .eq('status', 'active')
              .single();
              
            if (membershipData) {
              organizationId = membershipData.organization_id;
              console.log('Found user organization:', organizationId);
              
              // Update user's current_organization_id
              await supabase
                .from('users')
                .update({ 
                  current_organization_id: organizationId,
                  updated_at: new Date().toISOString()
                })
                .eq('id', userData.id);
            }
          }
          
          // Get price details
          const priceId = subscription.items.data[0].price.id;
          
          // Look up plan by price ID
          const { data: planData, error: planError } = await supabase
            .from('plans')
            .select('id, name, plan_type')
            .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
            .single();
            
          if (!planData) {
            console.error('CRITICAL: Plan not found for price:', priceId);
            // Return 400 to retry - plan might not be synced yet
            return new Response(JSON.stringify({ 
              error: 'Plan not found - will retry' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 400,
            });
          }
          
          // Cancel ALL existing subscriptions for this user (including Free plan)
          console.log('Canceling all existing subscriptions for user:', userData.id);
          const { data: canceledSubs, error: cancelError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.id)
            .in('status', ['incomplete', 'active', 'trialing'])
            .neq('stripe_subscription_id', subscription.id)
            .select('id, plan_id');
            
          if (cancelError) {
            console.error('Failed to cancel old subscriptions:', cancelError);
            return new Response('Database error', { 
              status: 500,
              headers: corsHeaders 
            });
          }
          
          if (canceledSubs && canceledSubs.length > 0) {
            console.log(`Canceled ${canceledSubs.length} existing subscription(s):`, canceledSubs);
          }
          
          // Determine if this is a trial subscription
          const isTrialing = subscription.status === 'trialing';
          const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null;
          const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
          
          // Create or update subscription (no UUID needed)
          const subscriptionData = {
            user_id: userData.id,
            organization_id: organizationId || null,
            plan_id: planData.id,
            plan_type: planData.plan_type || 'individual',
            stripe_subscription_id: subscription.id,
            stripe_customer_id: session.customer as string,
            stripe_price_id: priceId,
            status: subscription.status === 'trialing' ? 'trialing' : 'active',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: trialStart,
            trial_end: trialEnd,
            is_trial: isTrialing,
            has_used_trial: !!trialEnd,
            updated_at: new Date().toISOString()
          };
          
          // Log warning if organization_id is missing
          if (!subscriptionData.organization_id) {
            console.warn('⚠️ WARNING: Creating subscription without organization_id for user:', userData.id);
          }
          
          const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .upsert(subscriptionData, {
              onConflict: 'stripe_subscription_id'
            })
            .select();
            
          if (subError) {
            console.error('Failed to update subscription:', subError);
            return new Response('Database error', { 
              status: 500,
              headers: corsHeaders 
            });
          }
          
          console.log('✅ Subscription created/updated:', subData);
          
          // Update user's has_used_trial flag if this is a trial subscription
          if (isTrialing && trialEnd) {
            console.log('Updating user has_used_trial flag for trial subscription');
            const { error: updateError } = await supabase
              .from('users')
              .update({ 
                has_used_trial: true,
                last_subscription_change: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', userData.id);
              
            if (updateError) {
              console.error('Failed to update user trial flag:', updateError);
              return new Response('Database error', { 
                status: 500,
                headers: corsHeaders 
              });
            }
          } else {
            // Just update last_subscription_change for non-trial subscriptions
            const { error: updateError } = await supabase
              .from('users')
              .update({ 
                last_subscription_change: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', userData.id);
              
            if (updateError) {
              console.error('Failed to update user timestamp:', updateError);
              return new Response('Database error', { 
                status: 500,
                headers: corsHeaders 
              });
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
      
      // Handle trial ending soon (3 days before trial ends)
      if (event.type === 'customer.subscription.trial_will_end') {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing trial ending soon:', subscription.id);
        console.log('Trial ends at:', new Date(subscription.trial_end! * 1000).toISOString());
        
        // Update subscription status
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'trialing',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
          .select('user_id');
          
        if (subError) {
          console.error('Failed to update subscription:', subError);
          return new Response('Database error', { 
            status: 500,
            headers: corsHeaders 
          });
        }
          
        if (subData && subData.length > 0) {
          // TODO: Send email notification about trial ending
          console.log('User to notify about trial ending:', subData[0].user_id);
          
          // Create notification record - check if table exists first
          const { error: notifError } = await supabase
            .from('user_notifications')
            .insert({
              user_id: subData[0].user_id,
              type: 'trial_ending',
              title: 'Your trial is ending soon',
              message: 'Your 7-day trial will end in 3 days. Add a payment method to continue using Pro features.',
              created_at: new Date().toISOString()
            });
            
          if (notifError) {
            console.error('Failed to create notification (table may not exist):', notifError);
            // Don't fail the webhook for notification errors
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
      
      // Handle invoice payment succeeded
      if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Processing payment success for invoice:', invoice.id);
        console.log('Invoice details:', {
          subscription_id: invoice.subscription,
          customer_id: invoice.customer,
          amount_paid: invoice.amount_paid,
          billing_reason: invoice.billing_reason,
          metadata: invoice.metadata
        });
        
        if (invoice.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          // Validate subscription has items
          if (!subscription.items?.data?.length) {
            console.error('CRITICAL: Subscription has no items:', subscription.id);
            return new Response(JSON.stringify({ 
              error: 'Subscription has no items - will retry' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 400,
            });
          }
          
          // Update subscription status
          const updateData: any = { 
            status: subscription.status,
            updated_at: new Date().toISOString()
          };
          
          // If this is the first payment after trial, update trial flags
          if (invoice.billing_reason === 'subscription_cycle' && subscription.status === 'active') {
            const { data: subData } = await supabase
              .from('subscriptions')
              .select('is_trial')
              .eq('stripe_subscription_id', invoice.subscription)
              .single();
              
            if (subData?.is_trial) {
              updateData.is_trial = false;
              console.log('Trial converted to paid subscription');
            }
          }
          
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('stripe_subscription_id', invoice.subscription);
            
          if (updateError) {
            console.error('Failed to update subscription status:', updateError);
            return new Response('Database error', { 
              status: 500,
              headers: corsHeaders 
            });
          }
          
          // Get subscription and user data for referral processing
          const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('user_id, stripe_checkout_session_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();
            
          if (subError) {
            console.error('Failed to get subscription data:', subError);
            return new Response('Database error', { 
              status: 500,
              headers: corsHeaders 
            });
          }
            
          if (subData) {
            // Update user's last_subscription_change timestamp
            const { error: userUpdateError } = await supabase
              .from('users')
              .update({ 
                last_subscription_change: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', subData.user_id);
              
            if (userUpdateError) {
              console.error('Failed to update user:', userUpdateError);
              return new Response('Database error', { 
                status: 500,
                headers: corsHeaders 
              });
            }
            
            // REFERRAL PROCESSING - Check if this is first payment after trial
            if (invoice.billing_reason === 'subscription_cycle' && invoice.amount_paid > 0) {
              console.log('First payment after trial detected, processing referral...');
              
              // Check for pending referral
              const { data: referralData, error: referralError } = await supabase
                .from('user_referrals')
                .select('*')
                .eq('referee_id', subData.user_id)
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
                    first_payment_id: invoice.payment_intent as string,
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
                      user_id: referralData.referrer_id,
                      amount: referralData.reward_amount || 5.00,
                      type: 'referral_reward',
                      description: `Referral reward for referring a new user`,
                      reference_id: referralData.id,
                      expires_at: new Date(creditDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                      created_at: creditDate.toISOString()
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
                    console.error('Failed to create credit (check RLS):', creditError);
                    // Don't fail webhook for credit errors
                  }
                } else {
                  console.error('Failed to update referral:', updateRefError);
                  // Don't fail webhook for referral errors
                }
              }
            }

            // Reset monthly usage if it's a new billing period
            if (invoice.billing_reason === 'subscription_cycle') {
              const { error: resetError } = await supabase
                .from('users')
                .update({ 
                  current_month_audio_seconds: 0,
                  updated_at: new Date().toISOString()
                })
                .eq('id', subData.user_id);
                
              if (resetError) {
                console.error('Failed to reset usage:', resetError);
                return new Response('Database error', { 
                  status: 500,
                  headers: corsHeaders 
                });
              }
                
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
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing subscription:', subscription.id);
        console.log('Customer ID:', subscription.customer);
        console.log('Status:', subscription.status);
        console.log('Trial end:', subscription.trial_end);
        console.log('Subscription metadata:', subscription.metadata);
        
        // Log period dates for debugging
        console.log('Period dates:', {
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          status: subscription.status
        });
        
        // Validate subscription has items
        if (!subscription.items?.data?.length) {
          console.error('CRITICAL: Subscription has no items:', subscription.id);
          return new Response(JSON.stringify({ 
            error: 'Subscription has no items - will retry' 
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 400,
          });
        }
        
        // Check for user_id in metadata first (for direct subscription creation)
        let userData: any = null;
        
        if (subscription.metadata?.user_id) {
          console.log('Found user_id in metadata:', subscription.metadata.user_id);
          const { data: userByMetadata } = await supabase
            .from('users')
            .select('id, email, current_organization_id')
            .eq('id', subscription.metadata.user_id)
            .single();
            
          if (userByMetadata) {
            userData = userByMetadata;
            console.log('User found by metadata user_id');
            
            // Update stripe_customer_id if not set
            if (!userByMetadata.stripe_customer_id) {
              await supabase
                .from('users')
                .update({ 
                  stripe_customer_id: subscription.customer as string,
                  updated_at: new Date().toISOString()
                })
                .eq('id', userByMetadata.id);
              console.log('Updated user with stripe_customer_id');
            }
          }
        }
        
        // If not found by metadata, try customer ID
        if (!userData) {
          userData = await supabase
            .from('users')
            .select('id, email, current_organization_id')
            .eq('stripe_customer_id', subscription.customer)
            .single()
            .then(result => result.data);
        }
          
        if (!userData) {
          console.log('User not found by stripe_customer_id, trying email lookup...');
          
          let email: string | null = null;
          try {
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            if (customer.deleted) {
              console.error('Customer was deleted');
              return new Response(JSON.stringify({ 
                received: true, 
                warning: 'Customer deleted - cannot process' 
              }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
                status: 200,
              });
            }
            email = customer.email;
            console.log('Customer email:', email);
          } catch (err: any) {
            console.error('Failed to retrieve customer:', err.message);
            return new Response(JSON.stringify({ 
              received: true, 
              warning: 'Customer not found - cannot process' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200,
            });
          }
          
          if (!email) {
            console.error('No email found');
            return new Response(JSON.stringify({ 
              received: true, 
              warning: 'No email for customer - cannot process' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200,
            });
          }
          
          const { data: userByEmail, error: emailError } = await supabase
            .from('users')
            .select('id, current_organization_id')
            .eq('email', email)
            .single();
            
          if (!userByEmail) {
            console.error('User not found by email:', emailError);
            return new Response(JSON.stringify({ 
              received: true, 
              warning: 'User not found - check data sync' 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200,
            });
          }
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              stripe_customer_id: subscription.customer as string,
              updated_at: new Date().toISOString()
            })
            .eq('id', userByEmail.id);
            
          if (updateError) {
            console.error('Failed to update user customer ID:', updateError);
            return new Response('Database error', { 
              status: 500,
              headers: corsHeaders 
            });
          }
          
          // Now we can assign to userData
          userData = userByEmail;
        }
        
        console.log('User found:', userData.id);
        
        // If user doesn't have a current_organization_id, find their organization
        let organizationId = userData.current_organization_id;
        if (!organizationId) {
          console.log('User missing current_organization_id, looking for their organization...');
          const { data: membershipData } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userData.id)
            .eq('role', 'owner')
            .eq('status', 'active')
            .single();
            
          if (membershipData) {
            organizationId = membershipData.organization_id;
            console.log('Found user organization:', organizationId);
            
            // Update user's current_organization_id
            await supabase
              .from('users')
              .update({ 
                current_organization_id: organizationId,
                updated_at: new Date().toISOString()
              })
              .eq('id', userData.id);
          }
        }
        
        // Get price ID and plan
        const priceId = subscription.items.data[0].price.id;
        console.log('Price details:', {
          priceId: priceId,
          unitAmount: subscription.items.data[0].price.unit_amount,
          interval: subscription.items.data[0].price.recurring?.interval
        });
        
        // Look up plan by price ID
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('id, name, plan_type, monthly_audio_hours_limit')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
          .single();
          
        if (planError || !planData) {
          console.error('CRITICAL: Plan lookup error:', planError);
          return new Response(JSON.stringify({ 
            error: 'Plan not found - will retry',
            priceId: priceId
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 400,
          });
        }
        
        const planId = planData.id;
        const planType = planData.plan_type || 'individual';
        
        console.log('Plan found:', { planId, planType });
        
        // Convert timestamps to dates - use current time if period dates are missing
        const startDate = subscription.current_period_start 
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const endDate = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
        const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null;
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
        const isTrialing = subscription.status === 'trialing';
        
        console.log('Subscription period:', { startDate, endDate, trialStart, trialEnd, isTrialing });
        
        // Check if subscription already exists
        const { data: existingData } = await supabase
          .from('subscriptions')
          .select('id, created_at')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        
        // Cancel ALL existing active subscriptions for this user (if creating new)
        if (!existingData) {
          console.log('New subscription detected, canceling all existing subscriptions for user:', userData.id);
          const { data: canceledSubs, error: cancelError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.id)
            .neq('stripe_subscription_id', subscription.id)
            .in('status', ['active', 'incomplete', 'trialing'])
            .select('id, plan_id, stripe_subscription_id');
            
          if (cancelError) {
            console.error('Failed to cancel old subscriptions:', cancelError);
            return new Response('Database error', { 
              status: 500,
              headers: corsHeaders 
            });
          }
          
          if (canceledSubs && canceledSubs.length > 0) {
            console.log(`Canceled ${canceledSubs.length} existing subscription(s):`, canceledSubs);
            
            // Also try to cancel Stripe subscriptions if they have stripe_subscription_id
            for (const sub of canceledSubs) {
              if (sub.stripe_subscription_id) {
                try {
                  console.log('Canceling Stripe subscription:', sub.stripe_subscription_id);
                  await stripe.subscriptions.update(sub.stripe_subscription_id, {
                    cancel_at_period_end: true
                  });
                } catch (stripeError: any) {
                  console.error('Failed to cancel Stripe subscription:', sub.stripe_subscription_id, stripeError.message);
                  // Don't fail the webhook if Stripe cancellation fails
                }
              }
            }
          }
        }
        
        // Create/update subscription (no UUID needed)
        const subscriptionData: any = {
          user_id: userData.id,
          organization_id: organizationId || null,
          plan_id: planId,
          plan_type: planType,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          stripe_price_id: priceId,
          status: subscription.status,
          current_period_start: startDate,
          current_period_end: endDate,
          trial_start: trialStart,
          trial_end: trialEnd,
          is_trial: isTrialing,
          has_used_trial: !!trialEnd,
          updated_at: new Date().toISOString()
        };
        
        // Log warning if organization_id is missing
        if (!subscriptionData.organization_id) {
          console.warn('⚠️ WARNING: Creating/updating subscription without organization_id for user:', userData.id);
        }
        
        // Log subscription data for debugging
        console.log('Subscription update details:', {
          event_type: event.type,
          subscription_id: subscription.id,
          user_id: userData.id,
          old_price: event.type === 'customer.subscription.updated' ? 
            (event.data.previous_attributes as any)?.items?.data?.[0]?.price?.id : null,
          new_price: priceId,
          plan_name: planData.name
        });
        
        // Only set created_at for new records
        if (!existingData) {
          subscriptionData.created_at = new Date().toISOString();
        }
        
        console.log('Upserting subscription:', subscriptionData);
        
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'stripe_subscription_id'
          })
          .select();
          
        if (subError) {
          console.error('Subscription insert error:', subError);
          return new Response('Database error', { 
            status: 500,
            headers: corsHeaders 
          });
        }
        
        console.log('Subscription created/updated:', subData);
        
        // Update user's has_used_trial flag if this is a trial subscription
        if (isTrialing && trialEnd) {
          console.log('Updating user has_used_trial flag for trial subscription');
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              has_used_trial: true,
              last_subscription_change: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);
            
          if (updateError) {
            console.error('Failed to update user trial flag:', updateError);
            return new Response('Database error', { 
              status: 500,
              headers: corsHeaders 
            });
          }
        } else {
          // Just update last_subscription_change for non-trial subscriptions
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              last_subscription_change: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);
            
          if (updateError) {
            console.error('Failed to update user timestamp:', updateError);
            return new Response('Database error', { 
              status: 500,
              headers: corsHeaders 
            });
          }
        }
        
        // Sync organization member limits
        if (subscription.status === 'active' && userData.current_organization_id && planData) {
          console.log('Syncing organization member limits...');
          
          const { error: memberUpdateError } = await supabase
            .from('organization_members')
            .update({ 
              monthly_audio_hours_limit: planData.monthly_audio_hours_limit,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.id)
            .eq('organization_id', userData.current_organization_id);
            
          if (memberUpdateError) {
            console.error('Failed to update organization member limits (check RLS):', memberUpdateError);
            // Don't fail webhook for org sync errors
          } else {
            console.log('Organization member limits updated to:', planData.monthly_audio_hours_limit, 'hours');
          }
          
          const { error: orgUpdateError } = await supabase
            .from('organizations')
            .update({ 
              monthly_audio_hours_limit: planData.monthly_audio_hours_limit,
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.current_organization_id);
            
          if (orgUpdateError) {
            console.error('Failed to update organization limits (check RLS):', orgUpdateError);
            // Don't fail webhook for org sync errors
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
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Processing payment failure for invoice:', invoice.id);
        console.log('Invoice details:', {
          subscription_id: invoice.subscription,
          customer_id: invoice.customer,
          amount_due: invoice.amount_due,
          attempt_count: invoice.attempt_count,
          next_payment_attempt: invoice.next_payment_attempt
        });
        
        if (invoice.subscription) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription);
            
          if (updateError) {
            console.error('Failed to update subscription status:', updateError);
            return new Response('Database error', { 
              status: 500,
              headers: corsHeaders 
            });
          } else {
            console.log('Subscription marked as past_due');
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

      // Handle upcoming invoice (3 days before charge)
      if (event.type === 'invoice.upcoming') {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Processing upcoming invoice:', invoice.id);
        console.log('Invoice details:', {
          subscription_id: invoice.subscription,
          customer_id: invoice.customer,
          amount_due: invoice.amount_due,
          billing_date: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null
        });
        
        return new Response(JSON.stringify({ 
          received: true, 
          event_type: event.type,
          invoice_id: invoice.id 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }
      
      // Handle subscription deletion/cancellation
      if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing subscription cancellation:', subscription.id);
        
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
          return new Response('Database error', { 
            status: 500,
            headers: corsHeaders 
          });
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
      // Return 500 for processing errors so Stripe retries
      return new Response('Processing failed', { 
        status: 500,
        headers: corsHeaders 
      });
    }
    
  } catch (error: any) {
    console.error('General error:', error);
    console.error('Stack:', error.stack);
    // Return 500 for general errors so Stripe retries
    return new Response('Webhook handler failed', { 
      status: 500,
      headers: corsHeaders 
    });
  }
}, {
  // CRITICAL: Disable JWT verification for Stripe webhooks
  skipAuthorization: true
});