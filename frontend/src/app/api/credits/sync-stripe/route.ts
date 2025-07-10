import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Stripe from 'stripe';

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

    // Get user's Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // Get all unsynced credits
    const { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'referral_reward')
      .is('stripe_customer_balance_txn_id', null)
      .order('created_at', { ascending: true });

    if (creditsError) {
      console.error('Error fetching credits:', creditsError);
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    if (!credits || credits.length === 0) {
      return NextResponse.json({ message: 'No credits to sync' });
    }

    // Sync each credit to Stripe Customer Balance
    const syncedCredits = [];
    for (const credit of credits) {
      try {
        // Create a customer balance transaction in Stripe
        const balanceTransaction = await stripe.customers.createBalanceTransaction(
          userData.stripe_customer_id,
          {
            amount: Math.round(credit.amount * 100), // Convert to cents
            currency: 'usd',
            description: credit.description || `Referral reward - ${credit.reference_id}`,
          }
        );

        // Update the credit record with Stripe transaction ID
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({ stripe_customer_balance_txn_id: balanceTransaction.id })
          .eq('id', credit.id);

        if (updateError) {
          console.error('Error updating credit:', updateError);
          continue;
        }

        syncedCredits.push({
          credit_id: credit.id,
          stripe_txn_id: balanceTransaction.id,
          amount: credit.amount,
        });
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        continue;
      }
    }

    return NextResponse.json({
      message: 'Credits synced successfully',
      synced: syncedCredits,
      total_synced: syncedCredits.length,
    });
  } catch (error) {
    console.error('Error syncing credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}