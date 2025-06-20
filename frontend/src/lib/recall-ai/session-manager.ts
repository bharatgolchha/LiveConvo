import { RecallAIClient } from './client';
import { createServerSupabaseClient } from '@/lib/supabase';

export class RecallSessionManager {
  private recallClient: RecallAIClient;

  constructor() {
    const apiKey = process.env.RECALL_AI_API_KEY;
    const region = (process.env.RECALL_AI_REGION as 'us-west-2' | 'us-east-1' | 'eu-west-1') || 'us-west-2';
    
    // Use a server-side environment variable for webhook URL or fallback to public URL
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = appUrl + '/api/webhooks/recall';
    
    console.log('🔧 RecallSessionManager config:', {
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey?.length,
      region,
      webhookUrl
    });
    
    if (!apiKey) {
      console.error('❌ RECALL_AI_API_KEY is not set in environment variables!');
    }
    
    this.recallClient = new RecallAIClient({
      apiKey: apiKey!,
      region,
      webhookUrl,
    });
  }

  async enhanceSessionWithRecall(sessionId: string, meetingUrl?: string, retryCount = 0) {
    if (!meetingUrl) return null;

    const supabase = createServerSupabaseClient();
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    try {
      // Validate meeting URL
      const platform = this.recallClient.detectMeetingPlatform(meetingUrl);
      if (!platform) {
        throw new Error('Unsupported meeting platform');
      }

      // Create Recall bot with retry logic
      let bot;
      let lastError;
      
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          bot = await this.recallClient.createBot({
            sessionId,
            meetingUrl,
            transcriptionProvider: 'deepgram', // Use same as current
          });
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          console.error(`Bot creation attempt ${attempt + 1} failed:`, error);
          
          if (attempt < retryCount) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          }
        }
      }
      
      if (!bot && lastError) {
        throw lastError;
      }

      // Update session with Recall info
      const { error } = await supabase
        .from('sessions')
        .update({
          meeting_url: meetingUrl,
          meeting_platform: platform,
          recall_bot_id: bot.id,
          transcription_provider: 'recall_ai',
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Monitor bot joining status
      this.monitorBotStatus(sessionId, bot.id);

      return bot;
    } catch (error) {
      console.error('Failed to enhance session with Recall:', error);
      
      // Store error in session for debugging
      await supabase
        .from('sessions')
        .update({
          meeting_url: meetingUrl,
          meeting_platform: this.recallClient.detectMeetingPlatform(meetingUrl),
          recall_bot_error: error instanceof Error ? error.message : 'Unknown error',
          transcription_provider: 'deepgram', // Fall back to regular recording
        })
        .eq('id', sessionId);
        
      return null;
    }
  }

  private async monitorBotStatus(sessionId: string, botId: string) {
    const supabase = createServerSupabaseClient();
    const maxWaitTime = 300000; // 5 minutes (increased from 1 minute)
    const checkInterval = 5000; // 5 seconds
    const startTime = Date.now();
    
    const checkStatus = async () => {
      try {
        const bot = await this.recallClient.getBot(botId);
        
        if (bot.status === 'failed') {
          console.error('Bot failed to join meeting:', bot);
          
          // Update session with failure
          await supabase
            .from('sessions')
            .update({
              recall_bot_status: 'failed',
              recall_bot_error: 'Bot failed to join meeting',
            })
            .eq('id', sessionId);
            
          return;
        }
        
        if (bot.status === 'in_call') {
          console.log('Bot successfully joined the meeting');
          
          // Update session with success
          await supabase
            .from('sessions')
            .update({
              recall_bot_status: 'in_call',
              recall_bot_error: null,
            })
            .eq('id', sessionId);
            
          return;
        }
        
        // Check if we've exceeded max wait time
        if (Date.now() - startTime > maxWaitTime) {
          console.error('Bot join timeout');
          
          await supabase
            .from('sessions')
            .update({
              recall_bot_status: 'timeout',
              recall_bot_error: 'Bot failed to join meeting within timeout',
            })
            .eq('id', sessionId);
            
          // Try to stop the bot
          try {
            await this.recallClient.stopBot(botId);
          } catch (stopError) {
            console.error('Failed to stop timed-out bot:', stopError);
          }
          
          return;
        }
        
        // Continue monitoring
        setTimeout(checkStatus, checkInterval);
      } catch (error) {
        console.error('Error monitoring bot status:', error);
      }
    };
    
    // Start monitoring
    setTimeout(checkStatus, checkInterval);
  }

  async stopRecallBot(sessionId: string) {
    const supabase = createServerSupabaseClient();
    
    const { data: session } = await supabase
      .from('sessions')
      .select('recall_bot_id')
      .eq('id', sessionId)
      .single();

    if (session?.recall_bot_id) {
      await this.recallClient.stopBot(session.recall_bot_id);
    }
  }
}