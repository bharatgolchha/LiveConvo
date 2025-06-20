import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallAIClient } from '@/lib/recall-ai/client';

export async function GET(
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
        { status: null, message: 'No bot associated with this session' },
        { status: 200 }
      );
    }

    // Get bot status from Recall.ai
    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_AI_API_KEY!,
      region: (process.env.RECALL_AI_REGION as 'us-west-2' | 'us-east-1' | 'eu-west-1') || 'us-west-2',
      webhookUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/recall'
    });

    try {
      const bot = await recallClient.getBot(session.recall_bot_id);
      
      // Map Recall.ai status to our simplified status
      let status: 'created' | 'joining' | 'in_call' | 'completed' | 'failed' = 'created';
      
      // Get the latest status from status_changes array
      if (bot.status_changes && bot.status_changes.length > 0) {
        const latestStatus = bot.status_changes[bot.status_changes.length - 1];
        const statusCode = latestStatus.code;
        
        if (statusCode === 'joining_call') {
          status = 'joining';
        } else if (statusCode === 'in_waiting_room') {
          status = 'joining';
        } else if (statusCode === 'in_call_not_recording' || statusCode === 'in_call_recording') {
          status = 'in_call';
        } else if (statusCode === 'done' || statusCode === 'call_ended') {
          status = 'completed';
        } else if (statusCode === 'failed') {
          status = 'failed';
        }
      }

      return NextResponse.json({ 
        status,
        botId: bot.id,
        recordingId: bot.recordingId
      });
    } catch (recallError: any) {
      console.error('Recall.ai API error:', recallError);
      
      // If bot not found, it might have been deleted
      if (recallError.message?.includes('404')) {
        return NextResponse.json({ 
          status: 'completed',
          message: 'Bot no longer exists'
        });
      }
      
      throw recallError;
    }
  } catch (error) {
    console.error('Bot status error:', error);
    return NextResponse.json(
      { error: 'Failed to get bot status' },
      { status: 500 }
    );
  }
}