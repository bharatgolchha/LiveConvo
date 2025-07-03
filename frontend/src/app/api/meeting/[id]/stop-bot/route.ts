import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';
import { BotUsageTracker } from '@/lib/services/bot-usage-tracker';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params
    const { id } = await params;

    // Get session to verify ownership and get bot ID
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('recall_bot_id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.recall_bot_id) {
      return NextResponse.json(
        { error: 'No bot associated with this session' },
        { status: 400 }
      );
    }

    // Stop the bot
    try {
      const sessionManager = new RecallSessionManager();
      const botUsageTracker = new BotUsageTracker();
      
      await sessionManager.stopRecallBot(id);

      // Update session status
      const now = new Date().toISOString();
      await supabase
        .from('sessions')
        .update({ 
          status: 'completed',
          recording_ended_at: now,
          recall_bot_status: 'completed'
        })
        .eq('id', id);

      // Update bot usage tracking
      if (session.recall_bot_id) {
        try {
          await botUsageTracker.processBotStatusChange(
            session.recall_bot_id,
            'done',
            now
          );
        } catch (trackingError) {
          console.error('Failed to update bot usage tracking:', trackingError);
          // Continue even if tracking update fails
        }
      }

      return NextResponse.json({ success: true });
    } catch (botError) {
      console.error('Failed to stop bot:', botError);
      return NextResponse.json(
        { error: 'Failed to stop bot' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Stop bot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}