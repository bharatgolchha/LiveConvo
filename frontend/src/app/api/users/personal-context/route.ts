import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Create authenticated client with user's token
    const authClient = createAuthenticatedSupabaseClient(token);
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personal_context } = await request.json();

    // Update personal context using the authenticated client
    const { data, error } = await authClient
      .from('users')
      .update({ personal_context })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating personal context:', error);
      return NextResponse.json(
        { error: 'Failed to update personal context' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in personal context endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Create authenticated client with user's token
    const authClient = createAuthenticatedSupabaseClient(token);
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch personal context using the authenticated client
    const { data, error } = await authClient
      .from('users')
      .select('personal_context')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching personal context:', error);
      return NextResponse.json(
        { error: 'Failed to fetch personal context' },
        { status: 500 }
      );
    }

    return NextResponse.json({ personal_context: data?.personal_context || '' });
  } catch (error) {
    console.error('Error in personal context endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}