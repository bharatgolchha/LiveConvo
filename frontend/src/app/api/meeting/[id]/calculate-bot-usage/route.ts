import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { BotUsageCalculator } from '@/lib/services/bot-usage-calculator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = createServerSupabaseClient();

    // Get session with bot information
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, recall_bot_id, user_id, organization_id, bot_recording_minutes')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.recall_bot_id) {
      return NextResponse.json({ error: 'No bot associated with this session' }, { status: 400 });
    }

    // Calculate bot usage using the calculator
    const calculator = new BotUsageCalculator();
    const usage = await calculator.calculateBotUsage(session.recall_bot_id);

    if (!usage) {
      return NextResponse.json({ error: 'Failed to calculate bot usage' }, { status: 500 });
    }

    // Update session with calculated usage
    await supabase
      .from('sessions')
      .update({
        bot_recording_minutes: usage.billableMinutes,
        bot_billable_amount: (usage.billableMinutes * 0.10).toFixed(2), // $0.10 per minute
        recording_started_at: usage.recordingStartedAt?.toISOString(),
        recording_ended_at: usage.recordingEndedAt?.toISOString(),
        recording_duration_seconds: usage.recordingDurationSeconds
      })
      .eq('id', sessionId);

    // Create or update bot usage tracking record
    await supabase
      .from('bot_usage_tracking')
      .upsert({
        bot_id: usage.botId,
        session_id: sessionId,
        user_id: session.user_id,
        organization_id: session.organization_id,
        recording_started_at: usage.recordingStartedAt?.toISOString(),
        recording_ended_at: usage.recordingEndedAt?.toISOString(),
        total_recording_seconds: usage.recordingDurationSeconds,
        billable_minutes: usage.billableMinutes,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    console.log(`✅ Manually calculated bot usage for session ${sessionId}: ${usage.billableMinutes} minutes`);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        botId: usage.botId,
        billableMinutes: usage.billableMinutes,
        recordingDurationSeconds: usage.recordingDurationSeconds,
        recordingStartedAt: usage.recordingStartedAt,
        recordingEndedAt: usage.recordingEndedAt,
        status: usage.status
      }
    });

  } catch (error) {
    console.error('❌ Error calculating bot usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 