import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get the session with bot info
    const supabase = createServerSupabaseClient();
    const { data: session, error } = await supabase
      .from('sessions')
      .select('recall_bot_id')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.recall_bot_id) {
      return NextResponse.json(
        { error: 'No bot found for this session' },
        { status: 400 }
      );
    }

    // Stop the bot
    const recallManager = new RecallSessionManager();
    await recallManager.stopRecallBot(sessionId);

    // Update session status
    await supabase
      .from('sessions')
      .update({
        recall_bot_status: 'completed'
      })
      .eq('id', sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stop bot error:', error);
    return NextResponse.json(
      { error: 'Failed to stop bot' },
      { status: 500 }
    );
  }
}