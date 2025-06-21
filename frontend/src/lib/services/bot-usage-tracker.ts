/**
 * Bot Usage Tracker
 * 
 * Tracks Recall.ai bot recording time and integrates with the existing usage tracking system.
 * Handles bot lifecycle events and ensures accurate minute-based billing.
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import { RecallAIClient } from '@/lib/recall-ai/client';

export interface BotUsageData {
  botId: string;
  sessionId: string;
  userId: string;
  organizationId: string;
  recordingStartedAt?: Date;
  recordingEndedAt?: Date;
  totalRecordingSeconds: number;
  billableMinutes: number;
  status: 'recording' | 'completed' | 'failed';
}

export interface UsageTrackingEntry {
  organization_id: string;
  user_id: string;
  session_id: string;
  minute_timestamp: string;
  seconds_recorded: number;
}

export class BotUsageTracker {
  private supabase = createServerSupabaseClient();
  private recallClient = new RecallAIClient({
    apiKey: process.env.RECALL_AI_API_KEY || '',
    region: 'us-west-2',
    webhookUrl: process.env.WEBHOOK_BASE_URL
  });

  /**
   * Start tracking usage for a new bot session
   */
  async startBotUsageTracking(
    botId: string,
    sessionId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    console.log(`🎯 Starting bot usage tracking for bot ${botId}, session ${sessionId}`);

    try {
      // Create initial tracking entry
      await this.supabase
        .from('bot_usage_tracking')
        .insert({
          id: crypto.randomUUID(),
          bot_id: botId,
          session_id: sessionId,
          user_id: userId,
          organization_id: organizationId,
          status: 'recording',
          recording_started_at: new Date().toISOString(),
          total_recording_seconds: 0,
          billable_minutes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      console.log(`✅ Bot usage tracking initialized for ${botId}`);
    } catch (error) {
      console.error(`❌ Failed to start bot usage tracking:`, error);
      throw error;
    }
  }

  /**
   * Process bot status change webhook from Recall.ai
   */
  async processBotStatusChange(
    botId: string,
    status: string,
    timestamp: string,
    metadata?: any
  ): Promise<void> {
    console.log(`🔄 Processing bot status change: ${botId} -> ${status} at ${timestamp}`);

    try {
      const botUsage = await this.getBotUsageData(botId);
      if (!botUsage) {
        console.warn(`⚠️ No bot usage data found for ${botId}`);
        return;
      }

      switch (status) {
        case 'in_call_recording':
          await this.handleRecordingStarted(botUsage, timestamp);
          break;
        
        case 'recording_done':
        case 'done':
          await this.handleRecordingCompleted(botUsage, timestamp);
          break;
        
        case 'failed':
        case 'call_ended':
          await this.handleBotStopped(botUsage, timestamp);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to process bot status change:`, error);
      throw error;
    }
  }

  /**
   * Process recording completion webhook from Recall.ai
   */
  async processRecordingCompleted(
    botId: string,
    recordingData: any
  ): Promise<void> {
    console.log(`🎬 Processing recording completion for bot ${botId}`);

    try {
      const botUsage = await this.getBotUsageData(botId);
      if (!botUsage) {
        console.warn(`⚠️ No bot usage data found for ${botId}`);
        return;
      }

      // Extract recording duration from Recall.ai data
      const startedAt = new Date(recordingData.started_at);
      const completedAt = new Date(recordingData.completed_at);
      const durationSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

      await this.finalizeRecording(botUsage, startedAt, completedAt, durationSeconds);
    } catch (error) {
      console.error(`❌ Failed to process recording completion:`, error);
      throw error;
    }
  }

  /**
   * Handle when bot starts recording
   */
  private async handleRecordingStarted(
    botUsage: BotUsageData,
    timestamp: string
  ): Promise<void> {
    const recordingStartedAt = new Date(timestamp);

    await this.supabase
      .from('bot_usage_tracking')
      .update({
        recording_started_at: recordingStartedAt.toISOString(),
        status: 'recording',
        updated_at: new Date().toISOString()
      })
      .eq('bot_id', botUsage.botId);

    console.log(`🟢 Recording started for bot ${botUsage.botId} at ${timestamp}`);
  }

  /**
   * Handle when bot completes recording
   */
  private async handleRecordingCompleted(
    botUsage: BotUsageData,
    timestamp: string
  ): Promise<void> {
    const recordingEndedAt = new Date(timestamp);
    
    // Calculate duration if we have start time
    let durationSeconds = 0;
    if (botUsage.recordingStartedAt) {
      durationSeconds = Math.floor(
        (recordingEndedAt.getTime() - botUsage.recordingStartedAt.getTime()) / 1000
      );
    }

    await this.finalizeRecording(
      botUsage,
      botUsage.recordingStartedAt,
      recordingEndedAt,
      durationSeconds
    );
  }

  /**
   * Handle when bot stops (failed or ended)
   */
  private async handleBotStopped(
    botUsage: BotUsageData,
    timestamp: string
  ): Promise<void> {
    const stoppedAt = new Date(timestamp);
    
    // If recording was in progress, calculate duration
    let durationSeconds = 0;
    if (botUsage.recordingStartedAt && botUsage.status === 'recording') {
      durationSeconds = Math.floor(
        (stoppedAt.getTime() - botUsage.recordingStartedAt.getTime()) / 1000
      );
    }

    await this.finalizeRecording(
      botUsage,
      botUsage.recordingStartedAt,
      stoppedAt,
      durationSeconds
    );
  }

  /**
   * Finalize recording and create usage tracking entries
   */
  private async finalizeRecording(
    botUsage: BotUsageData,
    startedAt: Date | undefined,
    endedAt: Date,
    durationSeconds: number
  ): Promise<void> {
    console.log(`🎯 Finalizing recording for bot ${botUsage.botId}: ${durationSeconds}s`);

    // Calculate billable minutes (round up partial minutes)
    const billableMinutes = Math.ceil(durationSeconds / 60);

    // Update bot usage tracking record
    await this.supabase
      .from('bot_usage_tracking')
      .update({
        recording_ended_at: endedAt.toISOString(),
        total_recording_seconds: durationSeconds,
        billable_minutes: billableMinutes,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('bot_id', botUsage.botId);

    // Create usage tracking entries for each minute
    if (billableMinutes > 0) {
      await this.createUsageTrackingEntries(botUsage, startedAt || endedAt, durationSeconds);
    }

    // Update session recording duration
    await this.updateSessionDuration(botUsage.sessionId, durationSeconds);

    console.log(`✅ Finalized recording: ${durationSeconds}s = ${billableMinutes} billable minutes`);
  }

  /**
   * Create usage tracking entries for the recording
   */
  private async createUsageTrackingEntries(
    botUsage: BotUsageData,
    startedAt: Date,
    durationSeconds: number
  ): Promise<void> {
    const entries: UsageTrackingEntry[] = [];
    let remainingSeconds = durationSeconds;
    let currentMinute = new Date(startedAt);
    
    // Reset to start of minute
    currentMinute.setSeconds(0, 0);

    while (remainingSeconds > 0) {
      const secondsInThisMinute = Math.min(60, remainingSeconds);
      
      entries.push({
        organization_id: botUsage.organizationId,
        user_id: botUsage.userId,
        session_id: botUsage.sessionId,
        minute_timestamp: currentMinute.toISOString(),
        seconds_recorded: secondsInThisMinute
      });

      remainingSeconds -= secondsInThisMinute;
      currentMinute = new Date(currentMinute.getTime() + 60000); // Add 1 minute
    }

    if (entries.length > 0) {
      await this.supabase
        .from('usage_tracking')
        .insert(entries);

      console.log(`📊 Created ${entries.length} usage tracking entries`);
    }
  }

  /**
   * Update session with recording duration
   */
  private async updateSessionDuration(
    sessionId: string,
    durationSeconds: number
  ): Promise<void> {
    await this.supabase
      .from('sessions')
      .update({
        recording_duration_seconds: durationSeconds,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  }

  /**
   * Get bot usage data from database
   */
  private async getBotUsageData(botId: string): Promise<BotUsageData | null> {
    const { data, error } = await this.supabase
      .from('bot_usage_tracking')
      .select('*')
      .eq('bot_id', botId)
      .single();

    if (error) {
      console.error(`❌ Failed to get bot usage data:`, error);
      return null;
    }

    return {
      botId: data.bot_id,
      sessionId: data.session_id,
      userId: data.user_id,
      organizationId: data.organization_id,
      recordingStartedAt: data.recording_started_at ? new Date(data.recording_started_at) : undefined,
      recordingEndedAt: data.recording_ended_at ? new Date(data.recording_ended_at) : undefined,
      totalRecordingSeconds: data.total_recording_seconds || 0,
      billableMinutes: data.billable_minutes || 0,
      status: data.status
    };
  }

  /**
   * Get total bot usage for a user in current month
   */
  async getUserBotUsageThisMonth(
    userId: string,
    organizationId: string
  ): Promise<{ totalMinutes: number; totalSeconds: number }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const { data, error } = await this.supabase
      .from('bot_usage_tracking')
      .select('billable_minutes, total_recording_seconds')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    if (error) {
      console.error(`❌ Failed to get user bot usage:`, error);
      return { totalMinutes: 0, totalSeconds: 0 };
    }

    const totalMinutes = data.reduce((sum, record) => sum + (record.billable_minutes || 0), 0);
    const totalSeconds = data.reduce((sum, record) => sum + (record.total_recording_seconds || 0), 0);

    return { totalMinutes, totalSeconds };
  }

  /**
   * Sync bot data from Recall.ai API and update usage tracking
   */
  async syncBotUsageFromRecallAI(botId: string): Promise<void> {
    console.log(`🔄 Syncing bot usage from Recall.ai for ${botId}`);

    try {
      const bot = await this.recallClient.getBot(botId);
      const botUsage = await this.getBotUsageData(botId);

      if (!botUsage) {
        console.warn(`⚠️ No bot usage data found for ${botId}`);
        return;
      }

      // For now, we'll skip detailed recording data sync
      // as we're handling this through webhooks
      console.log(`🔄 Bot ${botId} sync completed - using webhook data instead`);
    } catch (error) {
      console.error(`❌ Failed to sync bot usage from Recall.ai:`, error);
      throw error;
    }
  }
}

export default BotUsageTracker; 