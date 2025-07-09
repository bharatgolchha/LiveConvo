import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

/**
 * GET /api/sessions/[id] - Get session details with transcripts and summaries
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view session' },
        { status: 401 }
      );
    }

    // Get user's current organization using service role client (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data: userData, error: userError } = await serviceClient
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

    // Create authenticated client with user's token for RLS
    const authClient = createAuthenticatedSupabaseClient(token);

    const { data: session, error } = await authClient
      .from('sessions')
      .select(`
        *,
        transcripts(
          id,
          content,
          speaker,
          start_time_seconds,
          created_at
        ),
        guidance(
          id,
          content,
          guidance_type,
          created_at
        ),
        summaries(
          id,
          title,
          tldr,
          key_decisions,
          action_items,
          follow_up_questions,
          conversation_highlights,
          structured_notes,
          generation_status,
          created_at
        ),
        recall_recording_id,
        recall_recording_url,
        recall_recording_status,
        recall_recording_expires_at
      `)
      .eq('id', sessionId)
      .eq('organization_id', userData.current_organization_id)
      .is('deleted_at', null)
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

    return NextResponse.json({ session });

  } catch (error) {
    console.error('Session fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[id] - Update session details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to update session' },
        { status: 401 }
      );
    }

    // Get user's current organization using service role client (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data: userData, error: userError } = await serviceClient
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

    // Create authenticated client with user's token for RLS
    const authClient = createAuthenticatedSupabaseClient(token);

    // Extract allowed fields for update
    const allowedFields = [
      'title',
      'status',
      'conversation_type',
      'recording_duration_seconds',
      'total_words_spoken',
      'recording_started_at',
      'recording_ended_at',
      'realtime_summary_cache',
      'ai_instructions'
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: session, error } = await authClient
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('organization_id', userData.current_organization_id)
      .select()
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

    return NextResponse.json({ session });

  } catch (error) {
    console.error('Session update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id] - Delete a session
 * Query Parameters:
 * - hard: Set to 'true' for permanent deletion, otherwise does soft delete (default)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to delete session' },
        { status: 401 }
      );
    }

    // Get user's current organization using service role client (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data: userData, error: userError } = await serviceClient
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

    // Create authenticated client with user's token for RLS
    const authClient = createAuthenticatedSupabaseClient(token);

    // Check if session has a Recall bot that needs to be stopped
    const { data: sessionData } = await authClient
      .from('sessions')
      .select('recall_bot_id, status')
      .eq('id', sessionId)
      .eq('organization_id', userData.current_organization_id)
      .single();
      
    if (sessionData?.recall_bot_id) {
      console.log('🤖 Stopping Recall bot before deleting session...');
      try {
        const recallManager = new RecallSessionManager();
        await recallManager.stopRecallBot(sessionId);
      } catch (error) {
        console.error('Failed to stop Recall bot during deletion:', error);
        // Continue with deletion even if bot stop fails
      }
    }

    let result;
    let message;

    if (hardDelete) {
      // Hard delete - permanently remove from database
      const { data: session, error } = await authClient
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('organization_id', userData.current_organization_id)
        .is('deleted_at', null)  // Only allow deleting non-deleted sessions
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Database error', message: error.message },
          { status: 500 }
        );
      }

      result = session;
      message = 'Session permanently deleted';
    } else {
      // Soft delete - set deleted_at timestamp
      const { data: session, error } = await authClient
        .from('sessions')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('organization_id', userData.current_organization_id)
        .is('deleted_at', null)  // Only allow deleting non-deleted sessions
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Database error', message: error.message },
          { status: 500 }
        );
      }

      result = session;
      message = 'Session deleted successfully';
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message,
      session: result,
      deleted_permanently: hardDelete
    });

  } catch (error) {
    console.error('Session delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete session' },
      { status: 500 }
    );
  }
} 