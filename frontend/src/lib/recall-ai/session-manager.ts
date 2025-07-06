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
      apiKeyFirstChars: apiKey?.substring(0, 8) + '...',
      region,
      webhookUrl,
      appUrl,
      envKeys: Object.keys(process.env).filter(k => k.includes('RECALL')).sort()
    });
    
    if (!apiKey) {
      console.error('❌ RECALL_AI_API_KEY is not set in environment variables!');
      throw new Error('RECALL_AI_API_KEY environment variable is required');
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
      // Get streaming provider from system settings
      const { data: providerSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'streaming_provider')
        .single();
      
      const streamingProvider = providerSetting?.value || 'assembly_ai';
      // Validate meeting URL
      const platform = this.recallClient.detectMeetingPlatform(meetingUrl);
      if (!platform) {
        throw new Error('Unsupported meeting platform');
      }

      // Get session details for metadata
      const { data: sessionData } = await supabase
        .from('sessions')
        .select(`
          title,
          user_id,
          organization_id,
          users!inner(email, full_name),
          organizations!inner(name)
        `)
        .eq('id', sessionId)
        .single();

      // Prepare metadata
      const metadata = {
        userEmail: (sessionData as any)?.users?.email,
        userName: (sessionData as any)?.users?.full_name,
        organizationId: sessionData?.organization_id,
        organizationName: (sessionData as any)?.organizations?.name,
        meetingTitle: sessionData?.title,
        platform: platform,
      };

      // Create Recall bot with retry logic
      let bot;
      let lastError;
      
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          bot = await this.recallClient.createBot({
            sessionId,
            meetingUrl,
            transcriptionProvider: streamingProvider as 'deepgram' | 'assembly_ai' | 'speechmatics',
            metadata,
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

      if (!bot) {
        throw new Error('Failed to create bot after retries');
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
    let isMonitoringActive = true; // Flag to control monitoring
    
    const checkStatus = async () => {
      // Stop monitoring if it's been deactivated
      if (!isMonitoringActive) {
        console.log('📍 Bot monitoring stopped');
        return;
      }

      try {
        const bot = await this.recallClient.getBot(botId);
        const botData = bot as any;
        
        // Get the latest status from status_changes array (this is how Recall.ai actually works)
        let latestStatusCode = null;
        if (Array.isArray(botData.status_changes) && botData.status_changes.length > 0) {
          const latestChange = botData.status_changes[botData.status_changes.length - 1];
          latestStatusCode = latestChange.code;
        }
        
        console.log('🔍 Bot monitoring check:', {
          botId,
          latestStatusCode,
          statusChangesCount: botData.status_changes?.length || 0
        });
        
        // Check for failure states
        if (latestStatusCode === 'error' || latestStatusCode === 'fatal') {
          console.error('Bot failed to join meeting:', bot);
          
          // Update session with failure
          await supabase
            .from('sessions')
            .update({
              recall_bot_status: 'failed',
              recall_bot_error: 'Bot failed to join meeting',
            })
            .eq('id', sessionId);
            
          isMonitoringActive = false; // Stop monitoring
          return;
        }
        
        // Check for successful join (any of these means bot is in the call)
        const successStates = ['in_call', 'in_call_recording', 'in_call_not_recording', 'in_waiting_room'];
        if (successStates.includes(latestStatusCode)) {
          console.log('✅ Bot successfully joined the meeting - Status:', latestStatusCode);
          
          // Update session with success
          await supabase
            .from('sessions')
            .update({
              recall_bot_status: 'in_call',
              recall_bot_error: null,
            })
            .eq('id', sessionId);
            
          isMonitoringActive = false; // ✅ Stop monitoring - bot is successfully in call
          console.log('✅ Bot monitoring completed - bot is in call');
          return;
        }
        
        // Check if we've exceeded max wait time
        if (Date.now() - startTime > maxWaitTime) {
          console.error('Bot join timeout - never reached in_call state');
          
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
          
          isMonitoringActive = false; // Stop monitoring
          return;
        }
        
        // Continue monitoring only if still active
        if (isMonitoringActive) {
          setTimeout(checkStatus, checkInterval);
        }
      } catch (error) {
        console.error('Error monitoring bot status:', error);
        // Continue monitoring even on error, but check if still active
        if (isMonitoringActive) {
          setTimeout(checkStatus, checkInterval);
        }
      }
    };
    
    // Start monitoring
    console.log('🔍 Starting bot status monitoring for:', botId);
    setTimeout(checkStatus, checkInterval);
  }

  async stopRecallBot(sessionId: string) {
    const supabase = createServerSupabaseClient();
    
    console.log(`🛑 Attempting to stop bot for session: ${sessionId}`);
    
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('recall_bot_id, recall_bot_status')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('❌ Failed to get session for bot stop:', sessionError);
      throw new Error(`Failed to get session: ${sessionError.message}`);
    }

    if (!session?.recall_bot_id) {
      console.warn(`⚠️ No bot ID found for session ${sessionId}`);
      return;
    }

    console.log(`🤖 Found bot ${session.recall_bot_id} with status: ${session.recall_bot_status}`);

    try {
      await this.recallClient.stopBot(session.recall_bot_id);
      
      // Update bot status in database
      await supabase
        .from('sessions')
        .update({
          recall_bot_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
        
      console.log(`✅ Bot ${session.recall_bot_id} stopped successfully`);
    } catch (error) {
      console.error(`❌ Failed to stop bot ${session.recall_bot_id}:`, error);
      throw error;
    }
  }

  async getBotStatus(botId: string) {
    return await this.recallClient.getBot(botId);
  }

  /**
   * Create a new bot for a meeting URL
   */
  async createBot(meetingUrl: string, sessionId: string): Promise<string> {
    const supabase = createServerSupabaseClient();
    
    console.log(`🤖 Creating Recall.ai bot for meeting: ${meetingUrl}`);
    
    let bot;
    let botId;
    
    try {
      // Get streaming provider from system settings
      const { data: providerSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'streaming_provider')
        .single();
      
      const streamingProvider = providerSetting?.value || 'assembly_ai';
      const platform = this.recallClient.detectMeetingPlatform(meetingUrl);
      console.log(`📱 Detected platform: ${platform}`);
      
      // Check if session already has a bot
      const { data: existingSession, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          recall_bot_id,
          title,
          user_id,
          organization_id,
          users!inner(email, full_name),
          organizations!inner(name)
        `)
        .eq('id', sessionId)
        .single();
        
      if (sessionError) {
        console.error('Error fetching session with joins:', sessionError);
        // Fallback to basic session query
        const { data: basicSession } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
          
        if (basicSession?.recall_bot_id) {
          console.log(`♻️ Session ${sessionId} already has bot ${basicSession.recall_bot_id}`);
          return basicSession.recall_bot_id;
        }
      }
      
      if (existingSession?.recall_bot_id) {
        console.log(`♻️ Session ${sessionId} already has bot ${existingSession.recall_bot_id}`);
        return existingSession.recall_bot_id;
      }
      
      // Prepare metadata with user and organization info
      // Ensure all metadata values are strings as required by Recall.ai API
      const metadata: Record<string, string> = {};
      
      // Only add fields that are definitely present and string-convertible
      if (existingSession?.title) {
        metadata.meetingTitle = String(existingSession.title);
      }
      if (platform) {
        metadata.platform = String(platform);
      }
      
      // Try to add user/org info if available
      try {
        if ((existingSession as any)?.users?.email) {
          metadata.userEmail = String((existingSession as any).users.email);
        }
        if ((existingSession as any)?.users?.full_name) {
          metadata.userName = String((existingSession as any).users.full_name);
        }
        if (existingSession?.organization_id) {
          metadata.organizationId = String(existingSession.organization_id);
        }
        if ((existingSession as any)?.organizations?.name) {
          metadata.organizationName = String((existingSession as any).organizations.name);
        }
      } catch (e) {
        console.warn('Error adding user/org metadata:', e);
      }
      
      // Log metadata before sending
      console.log('📊 Session data:', {
        email: (existingSession as any)?.users?.email,
        fullName: (existingSession as any)?.users?.full_name,
        organizationId: existingSession?.organization_id,
        organizationName: (existingSession as any)?.organizations?.name,
        title: existingSession?.title,
        platform
      });
      console.log('📊 Final metadata object:', metadata);
      
      bot = await this.recallClient.createBot({
        meetingUrl: meetingUrl,
        sessionId: sessionId,
        botName: "LivePrompt Assistant",
        transcriptionProvider: streamingProvider as 'deepgram' | 'assembly_ai' | 'speechmatics',
        metadata,
      });
      
      botId = bot.id;
      console.log(`✅ Bot created successfully: ${botId} with metadata:`, metadata);
      
      // Update session with bot ID
      await supabase.from('sessions').update({
        recall_bot_id: botId,
        recording_started_at: new Date().toISOString(),
        meeting_platform: this.recallClient.detectMeetingPlatform(meetingUrl),
        status: 'recording'
      }).eq('id', sessionId);

      // 🎯 START BOT USAGE TRACKING
      await this.initializeBotUsageTracking(sessionId, botId, supabase);
      
      // Start monitoring bot status
      this.monitorBotStatus(sessionId, botId);
      
      return botId;
      
    } catch (error) {
      console.error(`❌ Failed to create bot:`, error);
      throw error;
    }
  }

  /**
   * Initialize bot usage tracking record
   */
  private async initializeBotUsageTracking(
    sessionId: string, 
    botId: string, 
    supabase: any
  ): Promise<void> {
    try {
      // Get session info for user/org tracking
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('user_id, organization_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error('❌ Failed to get session for bot usage tracking:', sessionError);
        return;
      }

      // Create bot usage tracking record
      const { error: trackingError } = await supabase
        .from('bot_usage_tracking')
        .insert({
          bot_id: botId,
          session_id: sessionId,
          user_id: session.user_id,
          organization_id: session.organization_id,
          status: 'recording',
          created_at: new Date().toISOString()
        });

      if (trackingError) {
        console.error('❌ Failed to create bot usage tracking record:', trackingError);
      } else {
        console.log(`✅ Bot usage tracking initialized for ${botId}`);
      }
    } catch (error) {
      console.error('❌ Error initializing bot usage tracking:', error);
    }
  }
}