import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { meeting_url } = await request.json();
    
    // Validate meeting URL format
    if (meeting_url && !meeting_url.match(/^https?:\/\/(.*\.)?(zoom\.us|meet\.google\.com|teams\.microsoft\.com)/)) {
      return NextResponse.json(
        { error: 'Invalid meeting URL. Please use a valid Zoom, Google Meet, or Teams link.' },
        { status: 400 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    
    // Get current session
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('recall_bot_id, recall_bot_status, meeting_url')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Don't allow changing URL if bot is active (not in terminal state)
    if (session.recall_bot_id && 
        session.recall_bot_status !== 'completed' && 
        session.recall_bot_status !== 'failed' && 
        session.recall_bot_status !== 'timeout') {
      return NextResponse.json(
        { error: 'Cannot change meeting URL while bot is active. Please stop the bot first.' },
        { status: 400 }
      );
    }
    
    // Clear bot data if changing URL and bot is in terminal state
    if (session.recall_bot_id && 
        (session.recall_bot_status === 'completed' || 
         session.recall_bot_status === 'failed' || 
         session.recall_bot_status === 'timeout')) {
      await supabase
        .from('sessions')
        .update({
          recall_bot_id: null,
          recall_bot_status: null,
          recall_bot_error: null
        })
        .eq('id', sessionId);
    }

    // Detect meeting platform
    let meeting_platform = null;
    if (meeting_url) {
      if (meeting_url.includes('zoom.us')) {
        meeting_platform = 'zoom';
      } else if (meeting_url.includes('meet.google.com')) {
        meeting_platform = 'google_meet';
      } else if (meeting_url.includes('teams.microsoft.com')) {
        meeting_platform = 'teams';
      }
    }

    // Update session with new meeting URL
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        meeting_url,
        meeting_platform,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      success: true,
      meeting_url,
      meeting_platform
    });
  } catch (error) {
    console.error('Update meeting URL error:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting URL' },
      { status: 500 }
    );
  }
}