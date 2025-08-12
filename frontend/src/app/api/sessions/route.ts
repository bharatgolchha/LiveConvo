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
    const includeShared = searchParams.get('includeShared') === 'true';
    const onlyMine = searchParams.get('onlyMine') === 'true';

    // Get current user from Supabase auth using the access token.
    // Primary source: `Authorization` header. Fallback: `token` URL param
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.split(' ')[1] || null;

    // Chrome-extension background fetches sometimes lose the Authorization
    // header due to host/CORS restrictions. Accept token via query param
    // so the extension can still authenticate safely.
    if (!token) {
      token = searchParams.get('token');
    }

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
    
    // Check if we need to show shared meetings
    const showSharedOnly = searchParams.get('filter') === 'shared';
    
    // Build the query - RLS will handle access permissions for shared meetings
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
        participant_them,
        participants,
        recall_bot_id,
        recall_bot_status,
        meeting_url,
        meeting_platform,
        ai_instructions,
        user_id,
        organization_id
      `,
        { count: 'planned' }
      )
      .is('deleted_at', null)  // Only get non-deleted sessions
      .order('created_at', { ascending: false });
    
    // If showing shared meetings only, filter to meetings shared with current user
    if (showSharedOnly) {
      // Get meetings shared with the user through shared_meetings table
      const { data: sharedMeetingIds, error: sharedError } = await authClient
        .from('shared_meetings')
        .select('session_id')
        .eq('shared_with', user.id)
        .or('expires_at.is.null,expires_at.gt.now()');
        
      if (sharedError) {
        console.error('Error fetching shared meeting IDs:', sharedError);
      }
      
      const sharedIds = sharedMeetingIds?.map(sm => sm.session_id) || [];
      
      // Also get organization shared meetings
      const { data: orgSharedMeetingIds, error: orgSharedError } = await authClient
        .from('organization_shared_meetings')
        .select('session_id')
        .in('organization_id', [userData.current_organization_id]);
        
      if (orgSharedError) {
        console.error('Error fetching org shared meeting IDs:', orgSharedError);
      }
      
      const orgSharedIds = orgSharedMeetingIds?.map(osm => osm.session_id) || [];
      
      // Combine all shared meeting IDs
      const allSharedIds = [...new Set([...sharedIds, ...orgSharedIds])];
      
      if (allSharedIds.length > 0) {
        query = query.in('id', allSharedIds);
      } else {
        // No shared meetings, return empty result
        return NextResponse.json({
          sessions: [],
          total_count: 0,
          has_more: false,
          pagination: {
            limit,
            offset,
            total_count: 0,
            has_more: false
          }
        });
      }
    } else if (includeShared) {
      // Include both user's own meetings and shared meetings
      // RLS will automatically handle this - we just need to not filter by organization
      // The sessions RLS policy already includes shared meetings
    } else if (onlyMine) {
      // Restrict strictly to the current user's own meetings within their current organization
      query = query
        .eq('user_id', user.id)
        .eq('organization_id', userData.current_organization_id);
    } else {
      // Default: Show only user's organization meetings (may include others in org if RLS allows)
      // Note: UI should pass onlyMine=true where needed to restrict to the user
      query = query.eq('organization_id', userData.current_organization_id);
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    } else {
      // If no status filter is provided, exclude only archived sessions
      query = query.not('status', 'in', '("archived")');
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
    }, {
      headers: {
        // Cache for 30 seconds at the edge, allow stale for 2 minutes while revalidating
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
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
      meeting_url, // New field for Recall.ai integration
      ai_instructions, // Custom AI behavior instructions
      calendar_event_id // Calendar event ID to link and get participants from
    } = body;
    console.log('🔗 Meeting URL received:', meeting_url);

    // Get current user from Supabase auth using the access token.
    // Primary via Authorization header, fallback to `token` query param
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.split(' ')[1] || null;

    if (!token) {
      // POST requests don't have searchParams readily; parse from URL
      const { searchParams: postParams } = new URL(request.url);
      token = postParams.get('token');
    }

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

    // Get participants from calendar event if linked
    let participants = [];
    let finalMeetingUrl = meeting_url;
    if (calendar_event_id) {
      const { data: calendarEvent, error: calendarError } = await authClient
        .from('calendar_events')
        .select('attendees, meeting_url')
        .eq('id', calendar_event_id)
        .single();
      
      if (!calendarError && calendarEvent) {
        participants = calendarEvent.attendees || [];
        // Use calendar event's meeting URL if not provided
        if (!finalMeetingUrl && calendarEvent.meeting_url) {
          finalMeetingUrl = calendarEvent.meeting_url;
        }
      }
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
        status: 'draft',
        participant_me: participantMe,
        participant_them: participant_them || null,
        meeting_url: finalMeetingUrl || null,
        meeting_platform: finalMeetingUrl ? detectMeetingPlatform(finalMeetingUrl) : null,
        ai_instructions: ai_instructions || null,
        participants: participants // Store participants from calendar event
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

    // Update calendar event to link it to this session
    if (calendar_event_id && session) {
      const { error: updateError } = await authClient
        .from('calendar_events')
        .update({ session_id: session.id })
        .eq('id', calendar_event_id);
      
      if (updateError) {
        console.error('Error linking calendar event to session:', updateError);
        // Don't fail the request, session is created successfully
      }
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
    if (finalMeetingUrl) {
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
      // Group by session_id; handle both object and array forms for joined row
      type LinkedSessionObj = {
        id: string;
        title: string;
        created_at: string;
        conversation_type: string;
      };
      type LinkedRow = {
        session_id: string;
        linked_session_id: string;
        linked_session: LinkedSessionObj | LinkedSessionObj[] | null;
      };

      (linkedData as LinkedRow[]).forEach((link) => {
        const sessionId = link.session_id;
        const linkedSession = link.linked_session;

        const sessionsArray: LinkedSessionObj[] = Array.isArray(linkedSession)
          ? linkedSession
          : linkedSession
          ? [linkedSession]
          : [];

        if (sessionsArray.length > 0) {
          const existingData = linkedMap.get(sessionId) || { count: 0, conversations: [] };
          sessionsArray.forEach((ls) => {
            existingData.conversations.push({
              id: ls.id,
              title: ls.title || 'Untitled Conversation'
            });
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
                  const sessionTitle = sessionTitles.find((s: { id: string; title: string }) => s.id === id);
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