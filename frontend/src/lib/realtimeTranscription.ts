import React from 'react';

/**
 * OpenAI Realtime API integration for live transcription
 * 
 * This service handles real-time speech-to-text using OpenAI's Realtime API
 * with WebSocket connections for streaming audio and receiving transcripts.
 */

interface TranscriptEvent {
  type: 'transcript' | 'error' | 'connected' | 'disconnected';
  text?: string;
  confidence?: number;
  timestamp?: Date;
  error?: string;
}

interface RealtimeConfig {
  apiKey: string;
  model?: string;
  voiceActivityDetection?: boolean;
  language?: string;
}

export class RealtimeTranscriptionService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isConnected = false;
  private isRecording = false;
  private config: RealtimeConfig;
  private eventCallbacks: ((event: TranscriptEvent) => void)[] = [];
  private audioBuffer: Float32Array[] = [];
  private bufferInterval: NodeJS.Timeout | null = null;

  constructor(config: RealtimeConfig) {
    this.config = {
      model: 'gpt-4o-mini-transcribe',
      voiceActivityDetection: true,
      language: 'en',
      ...config
    };
  }

  /**
   * Subscribe to transcription events
   */
  onEvent(callback: (event: TranscriptEvent) => void): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Emit event to all subscribers
   */
  private emit(event: TranscriptEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }

  /**
   * Connect to OpenAI Realtime API
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.warn('Already connected to Realtime API');
      return;
    }

    try {
      // Initialize WebSocket connection to OpenAI Realtime API for transcription
      // Include authorization as query parameter since browser WebSocket can't set headers
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${this.config.model}&authorization=${encodeURIComponent('Bearer ' + this.config.apiKey)}`;
      console.log('🔄 Attempting to connect to OpenAI Realtime Transcription API...');
      console.log('📡 WebSocket URL (auth hidden):', `wss://api.openai.com/v1/realtime?model=${this.config.model}&authorization=Bearer%20***`);
      console.log('🔑 API Key:', this.config.apiKey.substring(0, 8) + '...');
      console.log('🎯 Model:', this.config.model);
      
      // Create WebSocket connection with auth in URL
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to OpenAI Realtime API');
        console.log('🔗 WebSocket readyState:', this.ws?.readyState);
        this.isConnected = true;
        this.initializeSession();
        this.emit({ type: 'connected', timestamp: new Date() });
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onclose = (event) => {
        console.log('❌ WebSocket disconnected from OpenAI Realtime API');
        console.log('🔢 Close code:', event.code);
        console.log('📝 Close reason:', event.reason);
        console.log('🧹 Was clean:', event.wasClean);
        this.isConnected = false;
        this.emit({ type: 'disconnected', timestamp: new Date() });
      };

      this.ws.onerror = (error) => {
        console.error('🚨 WebSocket error:', error);
        console.error('🔍 Error details:', {
          target: error.target,
          type: error.type,
          timeStamp: error.timeStamp
        });
        this.emit({ 
          type: 'error', 
          error: 'Failed to connect to OpenAI Realtime API. Check your API key and beta access.',
          timestamp: new Date()
        });
      };

      // Wait for connection or timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws!.addEventListener('open', () => {
          clearTimeout(timeout);
          resolve(void 0);
        });

        this.ws!.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        });
      });

    } catch (error) {
      console.error('Failed to connect to Realtime API:', error);
      this.emit({ 
        type: 'error', 
        error: 'Failed to connect',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Initialize transcription session configuration
   */
  private initializeSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send session configuration (auth is already in URL)
    const sessionEvent = {
      type: 'session.update',
      session: {
        modalities: ['text'],
        instructions: 'You are a helpful assistant that transcribes audio accurately.',
        input_audio_format: 'pcm16',
        input_audio_transcription: {
          model: this.config.model, // gpt-4o-mini-transcribe
          prompt: 'Expect professional conversation and technical terms.',
          language: this.config.language || 'en'
        },
        turn_detection: this.config.voiceActivityDetection ? {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        } : null,
        input_audio_noise_reduction: {
          type: 'near_field'
        }
      }
    };

    console.log('📤 Sending session config...');
    this.ws.send(JSON.stringify(sessionEvent));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 Received event:', data.type);
      console.log('📋 Full event data:', JSON.stringify(data, null, 2));
      
      switch (data.type) {
        case 'transcription_session.created':
          console.log('✅ Transcription session created:', data.session?.id);
          break;
          
        case 'input_audio_buffer.speech_started':
          console.log('🎤 Speech detected');
          break;
          
        case 'input_audio_buffer.speech_stopped':
          console.log('🔇 Speech ended');
          break;
          
        case 'conversation.item.input_audio_transcription.completed':
          console.log('📝 Transcript completed:', data.transcript);
          this.emit({
            type: 'transcript',
            text: data.transcript,
            confidence: 0.9,
            timestamp: new Date()
          });
          break;
          
        case 'conversation.item.input_audio_transcription.delta':
          console.log('📝 Transcript delta:', data.delta);
          this.emit({
            type: 'transcript',
            text: data.delta,
            confidence: 0.9,
            timestamp: new Date()
          });
          break;
          
        case 'error':
          console.error('🚨 API error received:', data);
          console.error('🔍 Error details:', JSON.stringify(data, null, 2));
          
          let errorMessage = 'Unknown error';
          if (data.error) {
            if (typeof data.error === 'string') {
              errorMessage = data.error;
            } else if (data.error.message) {
              errorMessage = data.error.message;
            } else if (data.error.code) {
              errorMessage = `Error code: ${data.error.code}`;
            } else {
              errorMessage = JSON.stringify(data.error);
            }
          }
          
          this.emit({
            type: 'error',
            error: errorMessage,
            timestamp: new Date()
          });
          break;
          
        default:
          // Log all events for debugging
          console.log('📋 Event:', data.type, data);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Start recording and streaming audio
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    if (!this.isConnected) {
      throw new Error('Not connected to Realtime API. Please connect first.');
    }

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Set up audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      const source = this.audioContext.createMediaStreamSource(stream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (this.isRecording) {
          const audioData = event.inputBuffer.getChannelData(0);
          this.sendAudioChunk(audioData);
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('Started recording');

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.emit({
        type: 'error',
        error: 'Microphone access denied',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Send audio chunk to API
   */
  private sendAudioChunk(audioData: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Convert Float32Array to PCM16
    const pcm16Data = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      pcm16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
    }

    // Convert to base64
    const buffer = new ArrayBuffer(pcm16Data.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < pcm16Data.length; i++) {
      view.setInt16(i * 2, pcm16Data[i], true);
    }
    
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const audioEvent = {
      type: 'input_audio_buffer.append',
      audio: base64Audio
    };

    this.ws.send(JSON.stringify(audioEvent));
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Commit the audio buffer
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
    }

    console.log('Stopped recording');
  }

  /**
   * Disconnect from the service
   */
  disconnect(): void {
    this.stopRecording();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.audioBuffer = [];

    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    recording: boolean;
  } {
    return {
      connected: this.isConnected,
      recording: this.isRecording
    };
  }
}

/**
 * Hook for using real-time transcription
 */
export function useRealtimeTranscription(apiKey: string) {
  const [service] = React.useState(() => new RealtimeTranscriptionService({ apiKey }));
  const [isConnected, setIsConnected] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [transcript, setTranscript] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = service.onEvent((event) => {
      switch (event.type) {
        case 'connected':
          setIsConnected(true);
          setError(null);
          break;
          
        case 'disconnected':
          setIsConnected(false);
          setIsRecording(false);
          break;
          
        case 'transcript':
          if (event.text) {
            setTranscript(prev => prev + event.text);
          }
          break;
          
        case 'error':
          setError(event.error || 'Unknown error');
          break;
      }
    });

    return () => {
      unsubscribe();
      service.disconnect();
    };
  }, [service]);

  const connect = React.useCallback(async () => {
    try {
      await service.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [service]);

  const startRecording = React.useCallback(async () => {
    try {
      await service.startRecording();
      setIsRecording(true);
      setTranscript('');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [service]);

  const stopRecording = React.useCallback(() => {
    service.stopRecording();
    setIsRecording(false);
  }, [service]);

  return {
    isConnected,
    isRecording,
    transcript,
    error,
    connect,
    startRecording,
    stopRecording,
    service
  };
} 