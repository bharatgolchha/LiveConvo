import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/users/export-data
 *
 * Returns a downloadable JSON file containing all data that belongs to the
 * authenticated user. Currently this includes:
 *  - User profile information
 *  - Conversations
 *  - Transcripts
 *  - Personal context
 *
 * The response is sent with a `Content-Disposition` header so that browsers
 * download the file instead of displaying it.
 */
export async function GET(request: NextRequest) {
  try {
    // ----------------------------
    // Authenticate user
    // ----------------------------
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user using the token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authedSupabase = createAuthenticatedSupabaseClient(token);

    // ----------------------------
    // Gather data
    // ----------------------------
    // 1. Sessions
    const { data: sessions = [], error: sessionsError } = await authedSupabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    }

    const sessionIds = sessions.map((s) => s.id);

    // 2. Transcripts belonging to those sessions
    const { data: transcripts = [], error: transcriptError } = await authedSupabase
      .from('transcripts')
      .select('*')
      .in('session_id', sessionIds.length ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

    if (transcriptError) {
      console.error('Error fetching transcripts:', transcriptError);
    }

    // 3. Personal context / settings (if any)
    const { data: userProfile } = await authedSupabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // ----------------------------
    // Sanitize data – expose only non-confidential fields
    // ----------------------------
    const safeUser = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? userProfile?.full_name ?? null,
      timezone: userProfile?.timezone ?? null,
      created_at: userProfile?.created_at ?? null,
    };

    const safeSessions = sessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      conversation_type: s.conversation_type,
      status: s.status,
      recording_duration_seconds: s.recording_duration_seconds,
      user_talk_time_seconds: s.user_talk_time_seconds,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    const safeTranscripts = transcripts.map((t: any) => ({
      id: t.id,
      session_id: t.session_id,
      speaker: t.speaker,
      content: t.content,
      start_time_seconds: t.start_time_seconds,
      end_time_seconds: t.end_time_seconds,
      sequence_number: t.sequence_number,
      created_at: t.created_at,
    }));

    // Compose export payload
    const exportPayload = {
      generated_at: new Date().toISOString(),
      user: safeUser,
      sessions: safeSessions,
      transcripts: safeTranscripts,
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="liveconvo_data_export.json"',
      },
    });
  } catch (error) {
    console.error('Data export failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 