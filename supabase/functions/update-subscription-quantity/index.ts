import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

interface UpdateQuantityRequest {
  subscriptionId: string;
  quantity: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { subscriptionId, quantity } = await req.json() as UpdateQuantityRequest;

    if (!subscriptionId || !quantity || quantity < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription ID or quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Stripe secret key from Vault
    const stripeSecretKey = await getSecret('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not found in Vault');
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (!subscription || subscription.status === 'canceled') {
      return new Response(
        JSON.stringify({ error: 'Subscription not found or canceled' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the subscription item for the seat-based product
    const subscriptionItem = subscription.items.data[0]; // Assuming single item subscription
    if (!subscriptionItem) {
      return new Response(
        JSON.stringify({ error: 'No subscription items found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the subscription quantity
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscriptionItem.id,
        quantity: quantity,
      }],
      proration_behavior: 'always_invoice', // Create prorations for immediate payment
      expand: ['latest_invoice'],
    });

    // Calculate proration amount if available
    let prorationAmount = 0;
    if (updatedSubscription.latest_invoice && typeof updatedSubscription.latest_invoice !== 'string') {
      const invoice = updatedSubscription.latest_invoice as Stripe.Invoice;
      prorationAmount = invoice.amount_due / 100; // Convert from cents to dollars
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          quantity: quantity,
          current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        },
        proration: prorationAmount,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error updating subscription quantity:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to update subscription quantity' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to get secrets from Supabase Vault
async function getSecret(name: string): Promise<string | undefined> {
  try {
    const secrets = Deno.env.toObject();
    return secrets[name];
  } catch (error) {
    console.error('Error accessing secret:', error);
    return undefined;
  }
}