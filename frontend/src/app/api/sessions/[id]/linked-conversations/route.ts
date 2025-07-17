import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/sessions/[id]/linked-conversations
 * Fetch linked conversations for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get current user from Supabase auth
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
        { error: 'Unauthorized', message: 'Please sign in to view linked conversations' },
        { status: 401 }
      );
    }

    // Create authenticated client
    const authClient = createAuthenticatedSupabaseClient(token);

    // Get linked conversation IDs from conversation_links table
    const { data: links, error: linksError } = await authClient
      .from('conversation_links')
      .select('linked_session_id')
      .eq('session_id', sessionId);

    if (linksError) {
      console.error('Error fetching conversation links:', linksError);
      return NextResponse.json(
        { error: 'Database error', message: linksError.message },
        { status: 500 }
      );
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ linkedConversations: [] });
    }

    // Get session details for linked conversations
    const linkedSessionIds = links.map((link: any) => link.linked_session_id);
    const { data: linkedSessions, error: sessionsError } = await authClient
      .from('sessions')
      .select('id, title, conversation_type, created_at, recording_duration_seconds, status, realtime_summary_cache')
      .in('id', linkedSessionIds)
      .is('deleted_at', null);

    if (sessionsError) {
      console.error('Error fetching linked sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Database error', message: sessionsError.message },
        { status: 500 }
      );
    }

    // Format response
    const linkedConversations = linkedSessions?.map((session: any) => ({
      id: session.id,
      title: session.title || 'Untitled Meeting',
      conversation_type: session.conversation_type,
      created_at: session.created_at,
      recording_duration_seconds: session.recording_duration_seconds,
      status: session.status,
      realtime_summary_cache: session.realtime_summary_cache
    })) || [];

    return NextResponse.json({ linkedConversations });

  } catch (error) {
    console.error('Linked conversations fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch linked conversations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[id]/linked-conversations
 * Add linked conversations to a session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { sessionIds } = await request.json();
    
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input', message: 'sessionIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get current user from Supabase auth
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
        { error: 'Unauthorized', message: 'Please sign in to add linked conversations' },
        { status: 401 }
      );
    }

    // Create authenticated client
    const authClient = createAuthenticatedSupabaseClient(token);

    // Verify the session exists and user has access
    const { data: session, error: sessionError } = await authClient
      .from('sessions')
      .select('id, organization_id')
      .eq('id', sessionId)
      .is('deleted_at', null)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Verify linked sessions exist and user has access
    // RLS will ensure user can only see sessions they have access to (own or shared)
    const { data: linkedSessions, error: linkedSessionsError } = await authClient
      .from('sessions')
      .select('id, title, conversation_type, created_at, recording_duration_seconds, status')
      .in('id', sessionIds)
      .is('deleted_at', null);

    if (linkedSessionsError) {
      console.error('Error verifying linked sessions:', linkedSessionsError);
      return NextResponse.json(
        { error: 'Database error', message: linkedSessionsError.message },
        { status: 500 }
      );
    }

    const validSessionIds = linkedSessions?.map((s: any) => s.id) || [];
    if (validSessionIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid sessions', message: 'No valid sessions found to link' },
        { status: 400 }
      );
    }

    // Get existing links to avoid duplicates
    const { data: existingLinks, error: existingLinksError } = await authClient
      .from('conversation_links')
      .select('linked_session_id')
      .eq('session_id', sessionId)
      .in('linked_session_id', validSessionIds);

    if (existingLinksError) {
      console.error('Error checking existing links:', existingLinksError);
      return NextResponse.json(
        { error: 'Database error', message: existingLinksError.message },
        { status: 500 }
      );
    }

    const existingLinkIds = existingLinks?.map((link: any) => link.linked_session_id) || [];
    const newSessionIds = validSessionIds.filter((id: any) => !existingLinkIds.includes(id));

    if (newSessionIds.length === 0) {
      // All sessions are already linked, return current state
      const linkedConversations = linkedSessions?.map((session: any) => ({
        id: session.id,
        title: session.title || 'Untitled Meeting',
        conversation_type: session.conversation_type,
        created_at: session.created_at,
        recording_duration_seconds: session.recording_duration_seconds,
        status: session.status
      })) || [];

      return NextResponse.json({ linkedConversations });
    }

    // Create new links
    const linksToCreate = newSessionIds.map((linkedSessionId: any) => ({
      session_id: sessionId,
      linked_session_id: linkedSessionId
    }));

    const { error: insertError } = await authClient
      .from('conversation_links')
      .insert(linksToCreate);

    if (insertError) {
      console.error('Error creating conversation links:', insertError);
      return NextResponse.json(
        { error: 'Database error', message: insertError.message },
        { status: 500 }
      );
    }

    // Return the newly added linked conversations
    const newlyLinkedSessions = linkedSessions?.filter((session: any) => 
      newSessionIds.includes(session.id)
    ) || [];

    const linkedConversations = newlyLinkedSessions.map((session: any) => ({
      id: session.id,
      title: session.title || 'Untitled Meeting',
      conversation_type: session.conversation_type,
      created_at: session.created_at,
      recording_duration_seconds: session.recording_duration_seconds,
      status: session.status
    }));

    return NextResponse.json({ linkedConversations });

  } catch (error) {
    console.error('Add linked conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to add linked conversations' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]/linked-conversations
 * Remove linked conversations from a session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { sessionIds } = await request.json();
    
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input', message: 'sessionIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get current user from Supabase auth
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
        { error: 'Unauthorized', message: 'Please sign in to remove linked conversations' },
        { status: 401 }
      );
    }

    // Create authenticated client
    const authClient = createAuthenticatedSupabaseClient(token);

    // Verify the session exists and user has access
    const { data: session, error: sessionError } = await authClient
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .is('deleted_at', null)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Remove the conversation links
    const { error: deleteError } = await authClient
      .from('conversation_links')
      .delete()
      .eq('session_id', sessionId)
      .in('linked_session_id', sessionIds);

    if (deleteError) {
      console.error('Error removing conversation links:', deleteError);
      return NextResponse.json(
        { error: 'Database error', message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Remove linked conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to remove linked conversations' },
      { status: 500 }
    );
  }
} 