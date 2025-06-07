import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import type { SessionData, SessionContext, LinkedConversation, LinkedConversationsData } from '@/types/api';

/**
 * GET /api/sessions - Fetch user sessions/conversations
 * 
 * Query Parameters:
 * - status: Filter by session status (draft, active, completed, archived)
 * - limit: Number of sessions to return (default: 20)
 * - offset: Number of sessions to skip for pagination (default: 0)
 * - search: Search in session titles
 * - conversation_type: Filter by conversation type
 * 
 * Returns:
 * - sessions: Array of session objects
 * - total_count: Total number of sessions matching filters
 * - has_more: Boolean indicating if there are more sessions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const conversationType = searchParams.get('conversation_type');

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view sessions' },
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
    
    // Build the query (filter by organization instead of just user)
    let query = authClient
      .from('sessions')
      .select(`
        id,
        title,
        conversation_type,
        status,
        recording_duration_seconds,
        total_words_spoken,
        created_at,
        updated_at,
        recording_started_at,
        recording_ended_at
      `)
      .eq('organization_id', userData.current_organization_id)
      .is('deleted_at', null)  // Only get non-deleted sessions
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (conversationType) {
      query = query.eq('conversation_type', conversationType);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Get total count for pagination
    const { count } = await query;

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    // Calculate additional fields for each session
    const enhancedSessions = sessions?.map(session => ({
      ...session,
      duration: session.recording_duration_seconds,
      wordCount: session.total_words_spoken,
      lastActivity: calculateLastActivity(session),
      hasSummary: false // We'll query summaries separately if needed
    })) || [];

    // Get linked conversations info for all sessions
    const sessionIds = enhancedSessions.map(s => s.id);
    const linkedConversationsData = await getLinkedConversations(sessionIds, userData.current_organization_id, authClient);

    // Add linked conversations data to each session
    const sessionsWithLinkedInfo = enhancedSessions.map(session => {
      const linkedData = linkedConversationsData.get(session.id) || { count: 0, conversations: [] };
      return {
        ...session,
        linkedConversationsCount: linkedData.count,
        linkedConversations: linkedData.conversations
      };
    });

    const totalCount = count || 0;
    const hasMore = offset + limit < totalCount;

    return NextResponse.json({
      sessions: sessionsWithLinkedInfo,
      total_count: totalCount,
      has_more: hasMore,
      pagination: {
        limit,
        offset,
        total_count: totalCount,
        has_more: hasMore
      }
    });

  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions - Create a new session with optional context data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      conversation_type, 
      selected_template_id,
      context // { text: string, metadata?: object }
    } = body;

    // Get current user from Supabase auth using the access token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to create sessions' },
        { status: 401 }
      );
    }
    
    // Create authenticated client with user's token
    const authClient = createAuthenticatedSupabaseClient(token);
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to create sessions' },
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

    // Create the session using authenticated client
    const { data: session, error: sessionError } = await authClient
      .from('sessions')
      .insert({
        user_id: user.id,
        organization_id: userData.current_organization_id,
        title,
        conversation_type,
        selected_template_id,
        status: 'draft'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Database error creating session:', sessionError);
      return NextResponse.json(
        { error: 'Database error', message: sessionError.message },
        { status: 500 }
      );
    }

    // If context data is provided, save it
    let sessionContext = null;
    if (context && (context.text || context.metadata)) {
      const { data: contextData, error: contextError } = await authClient
        .from('session_context')
        .insert({
          session_id: session.id,
          user_id: user.id,
          organization_id: userData.current_organization_id,
          text_context: context.text || null,
          context_metadata: context.metadata || null
        })
        .select()
        .single();

      if (contextError) {
        console.error('Database error creating context:', contextError);
        // Don't fail the entire request if context creation fails
        // The session was already created successfully
      } else {
        sessionContext = contextData;
      }
    }

    return NextResponse.json({ 
      session,
      context: sessionContext,
      message: sessionContext 
        ? 'Session and context created successfully' 
        : 'Session created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Sessions creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * Get linked conversations data for sessions (how many previous conversations each session has linked)
 */
async function getLinkedConversations(sessionIds: string[], organizationId: string, authClient: ReturnType<typeof createAuthenticatedSupabaseClient>): Promise<Map<string, LinkedConversationsData>> {
  try {
    // Get session context data for the requested sessions
    const { data: contextData, error } = await authClient
      .from('session_context')
      .select('session_id, context_metadata')
      .eq('organization_id', organizationId)
      .in('session_id', sessionIds)
      .not('context_metadata', 'is', null);

    if (error) {
      console.error('Error fetching linked conversations:', error);
      return new Map();
    }

    const linkedData = new Map<string, LinkedConversationsData>();

    // Initialize all session IDs with empty data
    sessionIds.forEach(id => linkedData.set(id, { count: 0, conversations: [] }));

    // Get all unique previous conversation IDs to fetch their titles
    const allPreviousIds = new Set<string>();
    contextData?.forEach((context: SessionContext) => {
      if (context.context_metadata?.selectedPreviousConversations && Array.isArray(context.context_metadata.selectedPreviousConversations)) {
        context.context_metadata.selectedPreviousConversations.forEach((id: string) => allPreviousIds.add(id));
      }
    });

    // Fetch titles for all previous conversations
    const conversationTitles = new Map<string, string>();
    if (allPreviousIds.size > 0) {
      const { data: sessionTitles, error: titlesError } = await authClient
        .from('sessions')
        .select('id, title')
        .in('id', Array.from(allPreviousIds));

      if (!titlesError && sessionTitles) {
        sessionTitles.forEach((session: { id: string, title: string }) => {
          conversationTitles.set(session.id, session.title);
        });
      }
    }

    // Process each session's linked conversations
    contextData?.forEach((context: SessionContext) => {
      if (context.context_metadata?.selectedPreviousConversations && Array.isArray(context.context_metadata.selectedPreviousConversations)) {
        const selectedIds = context.context_metadata.selectedPreviousConversations;
        const conversations: LinkedConversation[] = selectedIds.map((id: string) => ({
          id,
          title: conversationTitles.get(id) || 'Untitled Conversation'
        }));

        linkedData.set(context.session_id, {
          count: selectedIds.length,
          conversations
        });
      }
    });

    return linkedData;
  } catch (error) {
    console.error('Error in getLinkedConversations:', error);
    return new Map();
  }
}

/**
 * Calculate last activity timestamp for a session
 */
function calculateLastActivity(session: Pick<SessionData, 'recording_ended_at' | 'recording_started_at' | 'updated_at' | 'created_at'>): string {
  const now = new Date();
  const updatedAt = new Date(session.updated_at);
  const diffMs = now.getTime() - updatedAt.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
} 