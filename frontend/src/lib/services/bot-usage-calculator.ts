/**
 * Bot Usage Calculator
 * 
 * Calculates bot usage retrospectively from Recall.ai API data
 * Used for backfilling usage when webhook events are missing
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallAIClient } from '@/lib/recall-ai/client';

export interface BotUsageCalculation {
  botId: string;
  sessionId: string;
  recordingDurationSeconds: number;
  billableMinutes: number;
  recordingStartedAt?: Date;
  recordingEndedAt?: Date;
  status: 'completed' | 'failed' | 'active';
}

export class BotUsageCalculator {
  private supabase = createServerSupabaseClient();
  private recallClient: RecallAIClient;

  constructor() {
    this.recallClient = new RecallAIClient({
      apiKey: process.env.RECALL_AI_API_KEY!,
      region: 'us-west-2',
      webhookUrl: process.env.RECALL_AI_WEBHOOK_URL!,
    });
  }

  /**
   * Calculate usage for a specific bot by fetching data from Recall.ai API
   */
  async calculateBotUsage(botId: string): Promise<BotUsageCalculation | null> {
    try {
      console.log(`🧮 Calculating usage for bot: ${botId}`);

      // Get bot data from Recall.ai
      const botData = await this.recallClient.getBot(botId);
      
      if (!botData) {
        console.error(`❌ Bot not found: ${botId}`);
        return null;
      }

      // Extract recording information from bot status changes
      const statusChanges = this.extractStatusChanges(botData);
      const recordingPeriod = this.calculateRecordingPeriod(statusChanges);

      if (!recordingPeriod) {
        console.log(`⚠️ No recording period found for bot: ${botId}`);
        return {
          botId,
          sessionId: botData.metadata?.session_id || '',
          recordingDurationSeconds: 0,
          billableMinutes: 0,
          status: botData.status === 'failed' ? 'failed' : 'completed'
        };
      }

      const durationSeconds = Math.floor(
        (recordingPeriod.endedAt.getTime() - recordingPeriod.startedAt.getTime()) / 1000
      );
      const billableMinutes = Math.ceil(durationSeconds / 60);

      console.log(`✅ Bot ${botId}: ${durationSeconds}s = ${billableMinutes} minutes`);

      return {
        botId,
        sessionId: botData.metadata?.session_id || '',
        recordingDurationSeconds: durationSeconds,
        billableMinutes,
        recordingStartedAt: recordingPeriod.startedAt,
        recordingEndedAt: recordingPeriod.endedAt,
        status: 'completed'
      };

    } catch (error) {
      console.error(`❌ Error calculating bot usage for ${botId}:`, error);
      return null;
    }
  }

  /**
   * Backfill usage data for all sessions with missing bot usage
   */
  async backfillMissingUsage(): Promise<void> {
    console.log('🔄 Starting bot usage backfill...');

    // Get all sessions with bots but no recorded usage
    const { data: sessions, error } = await this.supabase
      .from('sessions')
      .select('id, recall_bot_id, user_id, organization_id')
      .not('recall_bot_id', 'is', null)
      .eq('bot_recording_minutes', 0);

    if (error) {
      console.error('❌ Error fetching sessions for backfill:', error);
      return;
    }

    console.log(`📊 Found ${sessions?.length || 0} sessions to backfill`);

    for (const session of sessions || []) {
      try {
        await this.backfillSessionUsage(session);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error backfilling session ${session.id}:`, error);
      }
    }

    console.log('✅ Bot usage backfill completed');
  }

  /**
   * Backfill usage data for a specific session
   */
  private async backfillSessionUsage(session: {
    id: string;
    recall_bot_id: string;
    user_id: string;
    organization_id: string | null;
  }): Promise<void> {
    const usage = await this.calculateBotUsage(session.recall_bot_id);
    
    if (!usage || usage.billableMinutes === 0) {
      console.log(`⚠️ No usage to backfill for session ${session.id}`);
      return;
    }

    // Update session with calculated usage
    await this.supabase
      .from('sessions')
      .update({
        bot_recording_minutes: usage.billableMinutes,
        bot_billable_amount: (usage.billableMinutes * 0.10).toFixed(2), // $0.10 per minute
        recording_started_at: usage.recordingStartedAt?.toISOString(),
        recording_ended_at: usage.recordingEndedAt?.toISOString(),
        recording_duration_seconds: usage.recordingDurationSeconds
      })
      .eq('id', session.id);

    // Create bot usage tracking record
    await this.supabase
      .from('bot_usage_tracking')
      .upsert({
        bot_id: usage.botId,
        session_id: session.id,
        user_id: session.user_id,
        organization_id: session.organization_id,
        recording_started_at: usage.recordingStartedAt?.toISOString(),
        recording_ended_at: usage.recordingEndedAt?.toISOString(),
        total_recording_seconds: usage.recordingDurationSeconds,
        billable_minutes: usage.billableMinutes,
        status: 'completed'
      });

    // Create usage tracking entries for billing
    if (usage.recordingStartedAt) {
      await this.createUsageTrackingEntries(
        session.user_id,
        session.organization_id,
        session.id,
        usage.recordingStartedAt.toISOString(),
        usage.recordingDurationSeconds
      );
    }

    console.log(`✅ Backfilled usage for session ${session.id}: ${usage.billableMinutes} minutes`);
  }

  /**
   * Extract status changes from bot data
   */
  private extractStatusChanges(botData: {
    status_changes?: Array<{
      created_at?: string;
      code?: string;
    }>;
  }): Array<{timestamp: Date, status: string}> {
    if (!botData.status_changes || !Array.isArray(botData.status_changes)) {
      return [];
    }

    return botData.status_changes.map((change) => ({
      timestamp: new Date(change.created_at),
      status: change.code
    }));
  }

  /**
   * Calculate recording period from status changes
   */
  private calculateRecordingPeriod(statusChanges: Array<{timestamp: Date, status: string}>): 
    {startedAt: Date, endedAt: Date} | null {
    
    const recordingStart = statusChanges.find(change => 
      change.status === 'in_call_recording'
    );

    const recordingEnd = statusChanges.find(change => 
      ['recording_done', 'call_ended', 'done'].includes(change.status)
    );

    if (!recordingStart || !recordingEnd) {
      return null;
    }

    return {
      startedAt: recordingStart.timestamp,
      endedAt: recordingEnd.timestamp
    };
  }

  /**
   * Create usage tracking entries for billing integration
   */
  private async createUsageTrackingEntries(
    userId: string,
    organizationId: string,
    sessionId: string,
    startedAt: string,
    durationSeconds: number
  ): Promise<void> {
    const startTime = new Date(startedAt);
    const minutes = Math.ceil(durationSeconds / 60);

    for (let i = 0; i < minutes; i++) {
      const minuteTimestamp = new Date(startTime.getTime() + (i * 60 * 1000));
      
      await this.supabase
        .from('usage_tracking')
        .upsert({
          user_id: userId,
          organization_id: organizationId,
          session_id: sessionId,
          minute_timestamp: minuteTimestamp.toISOString(),
          seconds_recorded: Math.min(60, durationSeconds - (i * 60)),
          source: 'recall_ai_bot',
          metadata: {
            bot_usage: true,
            minute_index: i + 1,
            total_minutes: minutes
          }
        });
    }
  }
} 