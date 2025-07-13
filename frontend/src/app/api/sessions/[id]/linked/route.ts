import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get auth header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const supabase = createAuthenticatedSupabaseClient(token);
    
    // Fetch linked session IDs from conversation_links table
    const { data: links, error: linksError } = await supabase
      .from('conversation_links')
      .select('linked_session_id, session_id')
      .or(`session_id.eq.${sessionId},linked_session_id.eq.${sessionId}`);

    if (linksError) {
      console.error('Error fetching linked conversations:', linksError);
      return NextResponse.json(
        { error: 'Failed to fetch linked conversations' },
        { status: 500 }
      );
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ linkedSessions: [] });
    }

    // Get unique linked session IDs
    const linkedSessionIds = [...new Set(links.map(link => 
      link.session_id === sessionId ? link.linked_session_id : link.session_id
    ))];

    // Fetch session details for linked sessions
    const { data: linkedSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        created_at,
        recording_duration_seconds,
        participant_me,
        participant_them,
        summaries (
          tldr
        )
      `)
      .in('id', linkedSessionIds)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching session details:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch session details' },
        { status: 500 }
      );
    }

    // Format the response
    const formattedSessions = (linkedSessions || []).map(session => ({
      id: session.id,
      title: session.title || 'Untitled Session',
      date: session.created_at,
      duration: session.recording_duration_seconds,
      participants: {
        me: session.participant_me || 'Speaker 1',
        them: session.participant_them || 'Speaker 2'
      },
      summary: session.summaries?.[0]?.tldr || 'No summary available'
    }));

    return NextResponse.json({ linkedSessions: formattedSessions });

  } catch (error) {
    console.error('Error in linked sessions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}