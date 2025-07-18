import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

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

    // Get the Supabase URL and anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('Creating billing portal session for user:', user.email);
    console.log('Using Supabase URL:', supabaseUrl);

    // Get the origin URL for return
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Call the edge function with the user's token
    const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        returnUrl: `${origin}/dashboard/settings`
      })
    });

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('Edge function error:', errorText);
      console.error('Response status:', edgeResponse.status);
      
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: edgeResponse.status });
      } catch {
        return NextResponse.json(
          { error: 'Failed to create billing portal session' },
          { status: edgeResponse.status }
        );
      }
    }

    const data = await edgeResponse.json();
    console.log('Portal session created successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}