export interface RecallAIConfig {
  apiKey: string;
  region: 'us-west-2' | 'us-east-1' | 'eu-west-1';
  webhookUrl?: string;
}

export interface CreateBotParams {
  meetingUrl: string;
  sessionId: string;
  botName?: string;
  transcriptionProvider?: 'deepgram' | 'speechmatics' | 'assembly_ai' | 'aws_transcribe';
  metadata?: {
    userEmail?: string;
    userName?: string;
    organizationId?: string;
    organizationName?: string;
    meetingTitle?: string;
    platform?: string;
  };
}

export interface RecallBot {
  id: string;
  status: 'created' | 'joining' | 'in_call' | 'completed' | 'failed';
  recordingId?: string;
  meetingUrl: string;
  metadata?: {
    session_id?: string;
    [key: string]: any;
  };
  status_changes?: Array<{
    code: string;
    created_at: string;
    message?: string;
    sub_code?: string;
  }>;
  recordings?: RecallRecording[];
}

export interface RecallRecording {
  id: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
  status: {
    code: 'processing' | 'paused' | 'done' | 'failed' | 'deleted';
    sub_code?: string | null;
    updated_at: string;
  };
  media_shortcuts?: {
    video_mixed?: {
      status: {
        code: string;
      };
      data?: {
        download_url: string;
      };
      format?: string;
    };
    transcript?: {
      status: {
        code: string;
      };
      data?: {
        download_url: string;
      };
    };
    participant_events?: {
      status: {
        code: string;
      };
      data?: {
        download_url: string;
      };
    };
    meeting_metadata?: {
      status: {
        code: string;
      };
      data?: {
        download_url: string;
      };
    };
  };
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
    
    // Ensure ALL metadata values are strings
    const baseMetadata: Record<string, string> = {
      session_id: String(params.sessionId),
      source: 'liveprompt',
    };
    
    // Add additional metadata, ensuring all values are strings
    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        if (value !== null && value !== undefined) {
          baseMetadata[key] = String(value);
        }
      }
    }
    
    const requestBody = {
      meeting_url: params.meetingUrl,
      bot_name: params.botName || 'LivePrompt',
      metadata: baseMetadata,
      recording_config: {
        transcript: {
          provider: this.getTranscriptionProvider(params.transcriptionProvider),
        },
        start_recording_on: 'call_join',
        realtime_endpoints: params.sessionId ? [
          {
            type: 'webhook',
            url: `${this.config.webhookUrl}/${params.sessionId}`,
            events: [
              'transcript.data', 
              'transcript.partial_data',
              'participant_events.join',
              'participant_events.leave'
            ]
          },
        ] : [],
      },
      automatic_leave: {
        waiting_room_timeout: 3600, // 1 hour instead of 20 minutes
        noone_joined_timeout: 3600, // 1 hour instead of 20 minutes
        everyone_left_timeout: {
          timeout: 600,        // Leave after 10 minutes of an empty room
          activate_after: 300, // Only start counting once the room has been empty for 5 minutes
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
    
    // Debug metadata to ensure all values are strings
    console.log('📤 Metadata being sent:', requestBody.metadata);
    console.log('📤 Metadata types:', Object.entries(requestBody.metadata).map(([key, value]) => ({
      key,
      value,
      type: typeof value
    })));
    console.log('📤 Sending request to Recall API:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${this.baseUrl}/bot`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Recall API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Recall API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      // Provide more specific error messages
      if (response.status === 401) {
        throw new Error('Recall.ai API authentication failed. Please check your API key.');
      } else if (response.status === 400) {
        throw new Error(`Invalid request to Recall.ai: ${errorData.message || errorData.detail || response.statusText}`);
      } else if (response.status === 429) {
        throw new Error('Recall.ai rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Failed to create Recall bot: ${errorData.message || errorData.detail || response.statusText}`);
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
    console.log(`🛑 Attempting to stop bot: ${botId}`);
    
    const response = await fetch(`${this.baseUrl}/bot/${botId}/leave_call`, {
      method: 'POST',
      headers: this.headers,
    });

    console.log(`📥 Stop bot response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to stop bot:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        botId
      });
      
      // Check if it's a 404 - bot might already be gone
      if (response.status === 404) {
        console.warn('⚠️ Bot not found - it may have already left the call');
        return; // Don't throw error for 404
      }
      
      throw new Error(`Failed to stop bot: ${response.statusText} - ${errorText}`);
    }

    console.log('✅ Bot stop request sent successfully');
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

  async getBotWithRecordings(botId: string): Promise<RecallBot> {
    console.log('📡 Recall API - Getting bot with recordings:', botId);
    
    const response = await fetch(`${this.baseUrl}/bot/${botId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to get bot with recordings:', errorText);
      throw new Error(`Failed to get bot: ${response.statusText}`);
    }

    const bot = await response.json();
    console.log('✅ Got bot with recordings:', bot);
    return bot;
  }

  async getRecording(recordingId: string): Promise<RecallRecording> {
    console.log('📡 Recall API - Getting recording:', recordingId);
    
    const response = await fetch(`${this.baseUrl}/recording/${recordingId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to get recording:', errorText);
      throw new Error(`Failed to get recording: ${response.statusText}`);
    }

    const recording = await response.json();
    console.log('✅ Got recording:', recording);
    return recording;
  }

  extractVideoUrl(recording: RecallRecording): string | null {
    const videoMixed = recording.media_shortcuts?.video_mixed;
    console.log('🎬 Extracting video URL from recording:', {
      hasVideoMixed: !!videoMixed,
      status: videoMixed?.status?.code,
      hasData: !!videoMixed?.data,
      hasDownloadUrl: !!videoMixed?.data?.download_url,
      downloadUrl: videoMixed?.data?.download_url
    });
    
    if (videoMixed?.status?.code === 'done' && videoMixed?.data?.download_url) {
      return videoMixed.data.download_url;
    }
    return null;
  }

  extractTranscriptUrl(recording: RecallRecording): string | null {
    const transcript = recording.media_shortcuts?.transcript;
    if (transcript?.status?.code === 'done' && transcript?.data?.download_url) {
      return transcript.data.download_url;
    }
    return null;
  }

  private getTranscriptionProvider(provider?: string) {
    switch (provider) {
      case 'deepgram':
        return { 
          deepgram_streaming: {
            model: 'nova-3',
            language: 'multi',
            smart_format: 'true',
            punctuate: 'true',
            profanity_filter: 'false',
            diarize: 'true',
            utterances: 'true',
            interim_results: 'true'
          }
        };
      case 'speechmatics':
        return { speechmatics_streaming: {} };
      case 'assembly_ai':
        return { assembly_ai_streaming: {} };
      case 'aws_transcribe':
        return {
          aws_transcribe_streaming: {
            language_identification: true,
            language_options: 'en-US,es-US,fr-FR,de-DE,ja-JP,ko-KR,zh-CN,pt-BR,it-IT,hi-IN',
            partial_results_stability: 'high',
            show_speaker_label: true
          }
        };
      default:
        return { 
          deepgram_streaming: {
            model: 'nova-3',
            language: 'multi',
            smart_format: 'true',
            punctuate: 'true',
            profanity_filter: 'false',
            diarize: 'true',
            utterances: 'true',
            interim_results: 'true'
          }
        };
    }
  }

  detectMeetingPlatform(url: string): 'zoom' | 'google_meet' | 'teams' | null {
    if (url.includes('zoom.us')) return 'zoom';
    if (url.includes('meet.google.com')) return 'google_meet';
    if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'teams';
    return null;
  }
}