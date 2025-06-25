import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';
import type { SessionData, SessionContext, LinkedConversation, LinkedConversationsData } from '@/types/api';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

// Helper function to detect meeting platform from URL
function detectMeetingPlatform(url: string): string | null {
  if (url.includes('zoom.us') || url.includes('zoom.com')) return 'zoom';
  if (url.includes('meet.google.com')) return 'google_meet';
  if (url.includes('teams.microsoft.com')) return 'teams';
  return null;
}

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
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token provided' },
        { status: 401 }
      );
    }
    
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
      .select(
        `
        id,
        title,
        conversation_type,
        status,
        recording_duration_seconds,
        total_words_spoken,
        created_at,
        updated_at,
        recording_started_at,
        recording_ended_at,
        participant_me,
        participant_them
      `,
        { count: 'exact' }
      )
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

    // Apply pagination **before** executing the query
    query = query.range(offset, offset + limit - 1);

    // Execute a single request to get both data and count
    const { data: sessions, count, error } = await query;

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
    
    // Get transcript speakers for all sessions
    const transcriptSpeakersData = await getTranscriptSpeakers(sessionIds, authClient);

    // Add linked conversations and transcript speakers data to each session
    const sessionsWithLinkedInfo = enhancedSessions.map(session => {
      const linkedData = linkedConversationsData.get(session.id) || { count: 0, conversations: [] };
      const speakersData = transcriptSpeakersData.get(session.id) || [];
      return {
        ...session,
        linkedConversationsCount: linkedData.count,
        linkedConversations: linkedData.conversations,
        transcript_speakers: speakersData
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
    console.log('📥 Session creation request body:', body);
    const { 
      title, 
      conversation_type, 
      selected_template_id,
      context, // { text: string, metadata?: object }
      linkedConversationIds,
      participant_me,
      participant_them,
      meeting_url // New field for Recall.ai integration
    } = body;
    console.log('🔗 Meeting URL received:', meeting_url);

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
      .select('current_organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Set participant_me to user's full name if not provided
    const participantMe = participant_me || userData?.full_name || user.email?.split('@')[0] || 'Host';

    // Create the session using authenticated client
    const { data: session, error: sessionError } = await authClient
      .from('sessions')
      .insert({
        user_id: user.id,
        organization_id: userData.current_organization_id,
        title,
        conversation_type,
        selected_template_id,
        status: 'draft',
        participant_me: participantMe,
        participant_them: participant_them || null,
        meeting_url: meeting_url || null,
        meeting_platform: meeting_url ? detectMeetingPlatform(meeting_url) : null
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

    // If linkedConversationIds provided, create rows in conversation_links
    if (Array.isArray(linkedConversationIds) && linkedConversationIds.length > 0) {
      const rows = linkedConversationIds.map((id: string) => ({
        session_id: session.id,
        linked_session_id: id
      }));

      const { error: linkError } = await authClient
        .from('conversation_links')
        .insert(rows);

      if (linkError) {
        console.error('Error inserting conversation links:', linkError);
        // Do not fail the request; session already created
      }
    }

    // Meeting URL is saved, but bot creation is now manual via "Join Meeting" button
    if (meeting_url) {
      console.log('🔗 Meeting URL saved. Bot will be created when user clicks "Join Meeting"');
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
    if (sessionIds.length === 0) {
      return new Map();
    }

    // Get linked conversations from conversation_links table with session details
    const { data: linkedData, error } = await authClient
      .from('conversation_links')
      .select(`
        session_id,
        linked_session_id,
        linked_session:sessions!conversation_links_linked_session_id_fkey (
          id,
          title,
          created_at,
          conversation_type
        )
      `)
      .in('session_id', sessionIds);

    if (error) {
      console.error('Error fetching linked conversations:', error);
      return new Map();
    }

    const linkedMap = new Map<string, LinkedConversationsData>();

    // Initialize all session IDs with empty data
    sessionIds.forEach(id => linkedMap.set(id, { count: 0, conversations: [] }));

    // Process the linked conversations data
    if (linkedData && linkedData.length > 0) {
      // Group by session_id
      linkedData.forEach((link: any) => {
        const sessionId = link.session_id;
        const linkedSession = link.linked_session;
        
        if (linkedSession) {
          const existingData = linkedMap.get(sessionId) || { count: 0, conversations: [] };
          
          existingData.conversations.push({
            id: linkedSession.id,
            title: linkedSession.title || 'Untitled Conversation'
          });
          existingData.count = existingData.conversations.length;
          
          linkedMap.set(sessionId, existingData);
        }
      });
    }

    // Also check session_context for backwards compatibility
    const { data: contextData, error: contextError } = await authClient
      .from('session_context')
      .select('session_id, context_metadata')
      .eq('organization_id', organizationId)
      .in('session_id', sessionIds)
      .not('context_metadata', 'is', null);

    if (!contextError && contextData) {
      // Get all unique previous conversation IDs from context metadata
      const allPreviousIds = new Set<string>();
      contextData.forEach((context: SessionContext) => {
        if (context.context_metadata?.selectedPreviousConversations && Array.isArray(context.context_metadata.selectedPreviousConversations)) {
          context.context_metadata.selectedPreviousConversations.forEach((id: string) => allPreviousIds.add(id));
        }
      });

      // Fetch titles for context-based linked conversations
      if (allPreviousIds.size > 0) {
        const { data: sessionTitles, error: titlesError } = await authClient
          .from('sessions')
          .select('id, title')
          .in('id', Array.from(allPreviousIds));

        if (!titlesError && sessionTitles) {
          // Add context-based linked conversations if not already in conversation_links
          contextData.forEach((context: SessionContext) => {
            if (context.context_metadata?.selectedPreviousConversations && Array.isArray(context.context_metadata.selectedPreviousConversations)) {
              const existingData = linkedMap.get(context.session_id) || { count: 0, conversations: [] };
              const existingIds = new Set(existingData.conversations.map(c => c.id));
              
              context.context_metadata.selectedPreviousConversations.forEach((id: string) => {
                if (!existingIds.has(id)) {
                  const sessionTitle = sessionTitles.find((s: any) => s.id === id);
                  existingData.conversations.push({
                    id,
                    title: sessionTitle?.title || 'Untitled Conversation'
                  });
                }
              });
              
              existingData.count = existingData.conversations.length;
              linkedMap.set(context.session_id, existingData);
            }
          });
        }
      }
    }

    return linkedMap;
  } catch (error) {
    console.error('Error in getLinkedConversations:', error);
    return new Map();
  }
}

/**
 * Get unique speakers from transcripts for each session
 */
async function getTranscriptSpeakers(sessionIds: string[], authClient: ReturnType<typeof createAuthenticatedSupabaseClient>): Promise<Map<string, string[]>> {
  try {
    if (sessionIds.length === 0) {
      return new Map();
    }

    // Get unique speakers from transcripts for all sessions
    const { data: transcripts, error } = await authClient
      .from('transcripts')
      .select('session_id, speaker')
      .in('session_id', sessionIds)
      .not('speaker', 'is', null)
      .neq('speaker', '');

    if (error) {
      console.error('Error fetching transcript speakers:', error);
      return new Map();
    }

    // Group speakers by session and get unique values
    const speakersMap = new Map<string, string[]>();
    
    transcripts?.forEach(transcript => {
      const sessionId = transcript.session_id;
      const speaker = transcript.speaker?.trim();
      
      if (speaker && !['me', 'them', 'user', 'other'].includes(speaker.toLowerCase())) {
        const existingSpeakers = speakersMap.get(sessionId) || [];
        if (!existingSpeakers.includes(speaker)) {
          speakersMap.set(sessionId, [...existingSpeakers, speaker]);
        }
      }
    });

    return speakersMap;
  } catch (error) {
    console.error('Error in getTranscriptSpeakers:', error);
    return new Map();
  }
}

/**
 * Calculate last activity timestamp for a session
 */
function calculateLastActivity(session: Pick<SessionData, 'recording_ended_at' | 'recording_started_at' | 'updated_at' | 'created_at'>): string {
  const now = new Date();
  const updatedAt = new Date(session.updated_at || session.created_at);
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