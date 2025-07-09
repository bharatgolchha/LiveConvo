import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * PATCH /api/sessions/[id]/ai-instructions - Update AI instructions for a session
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { ai_instructions } = body;

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
    // Create authenticated client with user's token for RLS
    const authClient = createAuthenticatedSupabaseClient(token);
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to update AI instructions' },
        { status: 401 }
      );
    }

    // Update AI instructions
    const { data: session, error } = await authClient
      .from('sessions')
      .update({ 
        ai_instructions,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select('id, ai_instructions')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      session,
      message: 'AI instructions updated successfully'
    });

  } catch (error) {
    console.error('AI instructions update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update AI instructions' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions/[id]/ai-instructions - Get AI instructions for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
    // Create authenticated client with user's token for RLS
    const authClient = createAuthenticatedSupabaseClient(token);
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view AI instructions' },
        { status: 401 }
      );
    }

    // Get AI instructions
    const { data: session, error } = await authClient
      .from('sessions')
      .select('id, ai_instructions')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      ai_instructions: session.ai_instructions || null
    });

  } catch (error) {
    console.error('AI instructions fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch AI instructions' },
      { status: 500 }
    );
  }
}