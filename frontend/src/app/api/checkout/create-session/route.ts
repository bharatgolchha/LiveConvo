import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface CheckoutRequest {
  priceId: string;
  billingCycle: 'monthly' | 'yearly';
  referralCode?: string;
}

export async function POST(request: NextRequest) {
  try {
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

    // Use the current Supabase URL from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('Calling Supabase edge function for checkout...');
    console.log('Using Supabase URL:', supabaseUrl);

    // Get the origin URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Call the edge function with the user's token
    const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
        'origin': origin  // Pass origin explicitly
      },
      body: JSON.stringify({
        priceId: priceId,
        interval: billingCycle,
        referralCode: referralCode,
        successUrl: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/dashboard`
      })
    });

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('Edge function error:', errorText);
      console.error('Response status:', edgeResponse.status);
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error && errorData.error.includes('STRIPE_SECRET_KEY')) {
          return NextResponse.json(
            { error: 'Payment system is not configured. Please add Stripe keys to Supabase Vault.' },
            { status: 500 }
          );
        }
        return NextResponse.json(errorData, { status: edgeResponse.status });
      } catch {
        return NextResponse.json(
          { error: 'Failed to create checkout session' },
          { status: edgeResponse.status }
        );
      }
    }

    const data = await edgeResponse.json();
    console.log('Edge function response:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}