import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

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

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if bot is already deployed
    if (session.recall_bot_id) {
      return NextResponse.json(
        { error: 'Bot already deployed for this session' },
        { status: 400 }
      );
    }

    // Check if meeting URL exists
    if (!session.meeting_url) {
      return NextResponse.json(
        { error: 'No meeting URL found for this session' },
        { status: 400 }
      );
    }

    // Deploy Recall.ai bot
    try {
      const sessionManager = new RecallSessionManager();
      
      const bot = await sessionManager.enhanceSessionWithRecall(
        session.id,
        session.meeting_url,
        3 // retry count
      );

      if (!bot) {
        throw new Error('Failed to create bot');
      }

      // The session is already updated by enhanceSessionWithRecall
      // Just update the recording start time
      await supabase
        .from('sessions')
        .update({ 
          recording_started_at: new Date().toISOString()
        })
        .eq('id', session.id);

      return NextResponse.json({
        success: true,
        bot: {
          id: bot.id,
          status: bot.status,
          meeting_url: bot.meetingUrl || session.meeting_url
        }
      });

    } catch (botError) {
      console.error('Failed to deploy bot:', botError);
      return NextResponse.json(
        { error: 'Failed to deploy meeting bot' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Start bot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}