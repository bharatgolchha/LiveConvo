import { NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createAuthenticatedSupabaseClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Supabase configuration is missing');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Check if we already have this session processed
    const { data: checkoutData, error: checkoutError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (checkoutError && checkoutError.code !== 'PGRST116') {
      console.error('Database error:', checkoutError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (checkoutData) {
      // Return the stored session data
      return NextResponse.json({
        id: checkoutData.stripe_session_id,
        amount_total: checkoutData.amount_total,
        currency: checkoutData.currency,
        payment_status: checkoutData.payment_status,
        subscription_id: checkoutData.subscription_id,
      });
    }

    // If not found, we need to wait for the webhook to process it
    // Return a pending status
    return NextResponse.json({
      id: sessionId,
      payment_status: 'processing',
      message: 'Payment is being processed. Please wait a moment.',
    });
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}