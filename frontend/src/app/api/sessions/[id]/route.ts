import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view session' },
        { status: 401 }
      );
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .select(`
        *,
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
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
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

    // Fetch timeline events from session_timeline_events table
    const { data: timelineEvents, error: timelineError } = await supabase
      .from('session_timeline_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('event_timestamp', { ascending: true });

    if (timelineError) {
      console.error('Timeline fetch error:', timelineError);
      console.warn('Failed to fetch timeline events, continuing without them');
    }

    // Add timeline events to session response
    const sessionWithTimeline = {
      ...session,
      timeline_events: timelineEvents || []
    };

    return NextResponse.json({ session: sessionWithTimeline });

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to update session' },
        { status: 401 }
      );
    }

    // Extract allowed fields for update
    const allowedFields = [
      'title',
      'status',
      'conversation_type',
      'recording_duration_seconds',
      'total_words_spoken',
      'recording_started_at',
      'recording_ended_at',
      'realtime_summary_cache'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Log summary cache updates for debugging
    if (updateData.realtime_summary_cache) {
      console.log('💾 Updating realtime_summary_cache:', {
        sessionId,
        hasSummary: !!updateData.realtime_summary_cache,
        tldrLength: updateData.realtime_summary_cache?.tldr?.length,
        keyPointsCount: updateData.realtime_summary_cache?.keyPoints?.length,
        decisionsCount: updateData.realtime_summary_cache?.decisions?.length
      });
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: session, error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to delete session' },
        { status: 401 }
      );
    }

    let result;
    let message;

    if (hardDelete) {
      // Hard delete - permanently remove from database
      const { data: session, error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id)
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
      const { data: session, error } = await supabase
        .from('sessions')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)
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