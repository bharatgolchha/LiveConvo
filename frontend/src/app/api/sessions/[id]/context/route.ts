import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/sessions/[id]/context - Save context data for a session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();
    const { text_context, context_metadata } = body;

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to save context' },
        { status: 401 }
      );
    }

    // Get user's current organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Verify session belongs to user's organization
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id')
      .eq('id', sessionId)
      .eq('organization_id', userData.current_organization_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found', message: 'Session does not exist or access denied' },
        { status: 404 }
      );
    }

    // Check if context already exists
    const { data: existingContext } = await supabase
      .from('session_context')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    let contextData;
    if (existingContext) {
      // Update existing context
      const { data, error } = await supabase
        .from('session_context')
        .update({
          text_context,
          context_metadata,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Database error updating context:', error);
        return NextResponse.json(
          { error: 'Database error', message: error.message },
          { status: 500 }
        );
      }
      contextData = data;
    } else {
      // Create new context
      const { data, error } = await supabase
        .from('session_context')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          organization_id: userData.current_organization_id,
          text_context,
          context_metadata
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating context:', error);
        return NextResponse.json(
          { error: 'Database error', message: error.message },
          { status: 500 }
        );
      }
      contextData = data;
    }

    return NextResponse.json({ 
      context: contextData,
      message: 'Context saved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Session context API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to save context' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions/[id]/context - Get context data for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view context' },
        { status: 401 }
      );
    }

    // Get user's current organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Get context for the session
    const { data: context, error } = await supabase
      .from('session_context')
      .select('*')
      .eq('session_id', sessionId)
      .eq('organization_id', userData.current_organization_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      context: context || null 
    });

  } catch (error) {
    console.error('Session context get API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch context' },
      { status: 500 }
    );
  }
} 