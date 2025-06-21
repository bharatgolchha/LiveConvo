export interface RecallAIConfig {
  apiKey: string;
  region: 'us-west-2' | 'us-east-1' | 'eu-west-1';
  webhookUrl?: string;
}

export interface CreateBotParams {
  meetingUrl: string;
  sessionId: string;
  botName?: string;
  transcriptionProvider?: 'deepgram' | 'speechmatics' | 'recall_ai';
}

export interface RecallBot {
  id: string;
  status: 'created' | 'joining' | 'in_call' | 'completed' | 'failed';
  recordingId?: string;
  meetingUrl: string;
}

export class RecallAIClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(private config: RecallAIConfig) {
    this.baseUrl = `https://${config.region}.recall.ai/api/v1`;
    this.headers = {
      'Authorization': `Token ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createBot(params: CreateBotParams): Promise<RecallBot> {
    console.log('📡 Recall API - Creating bot with params:', params);
    console.log('🔑 Using API base URL:', this.baseUrl);
    console.log('🔑 API Key present:', !!this.config.apiKey);
    console.log('🔗 Webhook URL:', `${this.config.webhookUrl}/${params.sessionId}`);
    
    const requestBody = {
      meeting_url: params.meetingUrl,
      bot_name: params.botName || 'LivePrompt Assistant',
      metadata: {
        session_id: params.sessionId,
        source: 'liveprompt',
      },
      recording_config: {
        transcript: {
          provider: this.getTranscriptionProvider(params.transcriptionProvider),
        },
        realtime_endpoints: params.sessionId ? [
          {
            type: 'webhook',
            url: `${this.config.webhookUrl}/${params.sessionId}`,
            events: ['transcript.data', 'transcript.partial_data']
          },
        ] : [],
        video_mixed_layout: 'audio_only', // We only need audio
        include_bot_in_recording: { visible: false },
      },
      automatic_leave: {
        waiting_room_timeout: 3600, // 1 hour instead of 20 minutes
        noone_joined_timeout: 3600, // 1 hour instead of 20 minutes
        everyone_left_timeout: {
          timeout: 60, // 1 minute instead of 2 seconds
          activate_after: 60, // Wait 1 minute before activating
        },
        in_call_not_recording_timeout: 7200, // 2 hours instead of 1 hour
        recording_permission_denied_timeout: 300, // 5 minutes instead of 30 seconds
        silence_detection: {
          timeout: 7200, // 2 hours
          activate_after: 3600, // After 1 hour of silence
        },
        bot_detection: {
          using_participant_events: {
            timeout: 1800, // 30 minutes instead of 10 minutes
            activate_after: 3600, // After 1 hour
          },
        },
      },
    };
    
    console.log('📤 Sending request to Recall API:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${this.baseUrl}/bot`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Recall API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Recall API error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(`Failed to create Recall bot: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Recall bot created successfully:', result);
    return result;
  }

  async getBot(botId: string): Promise<RecallBot> {
    const response = await fetch(`${this.baseUrl}/bot/${botId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get bot: ${response.statusText}`);
    }

    return response.json();
  }

  async stopBot(botId: string): Promise<void> {
    await fetch(`${this.baseUrl}/bot/${botId}/leave_call`, {
      method: 'POST',
      headers: this.headers,
    });
  }

  async getTranscript(recordingId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/transcript/${recordingId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get transcript: ${response.statusText}`);
    }

    return response.json();
  }

  private getTranscriptionProvider(provider?: string) {
    switch (provider) {
      case 'deepgram':
        return { deepgram_streaming: {} };
      case 'speechmatics':
        return { speechmatics_streaming: {} };
      case 'assembly_ai':
        return { assembly_ai_streaming: {} };
      default:
        return { deepgram_streaming: {} };
    }
  }

  detectMeetingPlatform(url: string): 'zoom' | 'google_meet' | 'teams' | null {
    if (url.includes('zoom.us')) return 'zoom';
    if (url.includes('meet.google.com')) return 'google_meet';
    if (url.includes('teams.microsoft.com')) return 'teams';
    return null;
  }
}