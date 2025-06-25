import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallSessionManager } from '@/lib/recall-ai/session-manager';

/**
 * Finalize bot usage when stopping the bot manually
 */
async function finalizeBotUsageOnStop(
  sessionId: string,
  botId: string,
  supabase: any
): Promise<void> {
  console.log(`🎯 Finalizing bot usage on manual stop for bot ${botId}`);

  try {
    // Get current bot usage data
    const { data: botUsage, error: botUsageError } = await supabase
      .from('bot_usage_tracking')
      .select('recording_started_at, status')
      .eq('bot_id', botId)
      .single();

    if (botUsageError) {
      console.warn(`⚠️ No bot usage tracking found for ${botId}:`, botUsageError);
      return;
    }

    if (!botUsage?.recording_started_at) {
      console.warn(`⚠️ No recording start time found for bot ${botId}`);
      return;
    }

    // Calculate usage
    const startTime = new Date(botUsage.recording_started_at);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const billableMinutes = Math.ceil(durationSeconds / 60);

    console.log(`📊 Bot usage calculation: ${durationSeconds}s = ${billableMinutes} billable minutes`);

    // Update bot usage tracking
    await supabase
      .from('bot_usage_tracking')
      .update({
        recording_ended_at: endTime.toISOString(),
        total_recording_seconds: durationSeconds,
        billable_minutes: billableMinutes,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('bot_id', botId);

    // Update session with bot recording info
    const billableAmount = (billableMinutes * 0.10).toFixed(2); // $0.10 per minute
    await supabase
      .from('sessions')
      .update({
        recording_ended_at: endTime.toISOString(),
        bot_recording_minutes: billableMinutes,
        bot_billable_amount: parseFloat(billableAmount),
        recall_bot_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    console.log(`✅ Bot usage finalized on manual stop: ${billableMinutes} billable minutes, $${billableAmount}`);

  } catch (error) {
    console.error('❌ Failed to finalize bot usage on stop:', error);
  }
}

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

    // Finalize bot usage tracking
    await finalizeBotUsageOnStop(sessionId, session.recall_bot_id, supabase);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stop bot error:', error);
    return NextResponse.json(
      { error: 'Failed to stop bot' },
      { status: 500 }
    );
  }
}