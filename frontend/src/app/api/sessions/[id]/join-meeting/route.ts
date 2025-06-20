import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get the session with meeting info
    const supabase = createServerSupabaseClient();
    const { data: session, error } = await supabase
      .from('sessions')
      .select('meeting_url, recall_bot_id, recall_bot_status')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.meeting_url) {
      return NextResponse.json(
        { error: 'No meeting URL found for this session' },
        { status: 400 }
      );
    }

    // Check if bot exists and is in a non-terminal state
    if (session.recall_bot_id && 
        session.recall_bot_status !== 'completed' && 
        session.recall_bot_status !== 'failed' && 
        session.recall_bot_status !== 'timeout') {
      return NextResponse.json(
        { error: 'Bot already created for this session' },
        { status: 400 }
      );
    }
    
    // Clear old bot ID if it's in a terminal state
    if (session.recall_bot_id && 
        (session.recall_bot_status === 'completed' || 
         session.recall_bot_status === 'failed' || 
         session.recall_bot_status === 'timeout')) {
      console.log('🧹 Clearing old bot ID in terminal state:', session.recall_bot_status);
      await supabase
        .from('sessions')
        .update({ 
          recall_bot_id: null,
          recall_bot_status: null,
          recall_bot_error: null 
        })
        .eq('id', sessionId);
    }

    // Create and join the meeting with Recall bot
    console.log('🤖 Creating Recall bot for meeting:', session.meeting_url);
    
    try {
      const recallManager = new RecallSessionManager();
      const recallBot = await recallManager.enhanceSessionWithRecall(
        sessionId, 
        session.meeting_url, 
        3 // retry count
      );
      
      console.log('✅ Recall bot created:', recallBot);
      
      return NextResponse.json({ 
        success: true,
        botId: recallBot?.id 
      });
    } catch (recallError) {
      console.error('❌ Recall.ai integration error:', recallError);
      
      return NextResponse.json(
        { 
          error: 'Failed to create bot',
          details: recallError instanceof Error ? recallError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Join meeting error:', error);
    return NextResponse.json(
      { error: 'Failed to join meeting' },
      { status: 500 }
    );
  }
}