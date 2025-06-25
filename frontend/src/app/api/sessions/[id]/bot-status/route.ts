import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallAIClient } from '@/lib/recall-ai/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Get the session with bot info and current status
    const supabase = createServerSupabaseClient();
    const { data: session, error } = await supabase
      .from('sessions')
      .select('recall_bot_id, recall_bot_status, status')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.recall_bot_id) {
      console.log('⚠️ No bot ID found for session:', sessionId);
      return NextResponse.json(
        { status: null, message: 'No bot associated with this session' },
        { status: 200 }
      );
    }
    
    // Check bot usage tracking status
    const { data: botUsage } = await supabase
      .from('bot_usage_tracking')
      .select('status, recording_ended_at')
      .eq('bot_id', session.recall_bot_id)
      .single();

    // Get bot status from Recall.ai
    const recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_AI_API_KEY!,
      region: (process.env.RECALL_AI_REGION as 'us-west-2' | 'us-east-1' | 'eu-west-1') || 'us-west-2',
      webhookUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/recall'
    });

    try {
      console.log('🔍 Fetching bot status for:', session.recall_bot_id);
      const bot = await recallClient.getBot(session.recall_bot_id);
      console.log('📊 Bot data from Recall.ai:', JSON.stringify(bot, null, 2));
      
      // Map Recall.ai status codes → simplified status
      // 1. Prefer bot.status.code if available (newer API format)
      // 2. Otherwise, fall back to the latest entry in bot.status_changes

      let status: 'created' | 'joining' | 'in_call' | 'completed' | 'failed' = 'created';

      // Helper to map Recall status codes → simplified status
      const mapCodeToStatus = (code?: string | null) => {
        switch (code) {
          case 'ready':
          case 'created':
            return 'created';
          case 'joining_call':
            return 'joining';
          case 'in_call':
          case 'in_waiting_room':
          case 'in_call_recording':
          case 'in_call_not_recording':
            return 'in_call';
          case 'done':
          case 'call_ended':
          case 'completed':
            return 'completed';
          case 'error':
          case 'fatal':
            return 'failed';
          default:
            return 'created';
        }
      };

      const botData = bot as any;

      if (botData.status?.code) {
        status = mapCodeToStatus(botData.status.code);
      } else if (Array.isArray(botData.status_changes) && botData.status_changes.length > 0) {
        const latest = botData.status_changes[botData.status_changes.length - 1];
        status = mapCodeToStatus(latest.code);
      }

      // Derive recording ID if not provided directly
      const recordingId =
        // Prefer direct field from API if it exists
        botData.recording_id ??
        // Otherwise attempt to pull first recording id
        botData.recordings?.[0]?.id ??
        // Or video mixed shortcut id as last resort
        botData.media_shortcuts?.video_mixed?.id;

      console.log('✅ Recall.ai bot status:', status);
      
      // Reconcile status if there's a mismatch
      if (status === 'completed' && botUsage?.status !== 'completed') {
        console.log('🔄 Status mismatch detected, updating local database');
        
        // Update bot usage tracking
        await supabase
          .from('bot_usage_tracking')
          .update({
            status: 'completed',
            recording_ended_at: (bot as any).completed_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('bot_id', bot.id);
          
        // Update session status
        await supabase
          .from('sessions')
          .update({
            status: 'completed',
            recall_bot_status: 'completed',
            recording_ended_at: (bot as any).completed_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
          
        // Trigger bot usage calculation if needed
        if (botUsage && !botUsage.recording_ended_at) {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}/api/meeting/${sessionId}/calculate-bot-usage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              }
            );
            if (!response.ok) {
              console.error('❌ Failed to calculate bot usage');
            }
          } catch (calcError) {
            console.error('❌ Error calculating bot usage:', calcError);
          }
        }
      }

      return NextResponse.json({
        status,
        botId: bot.id,
        recordingId,
        completedAt: (bot as any).completed_at ?? undefined,
        localStatus: botUsage?.status // Include local status for debugging
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