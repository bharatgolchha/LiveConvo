import React from 'react';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

/**
 * Deepgram streaming transcription service for live audio processing
 * 
 * This service handles real-time speech-to-text using Deepgram's streaming API
 * with WebSocket connections for streaming audio and receiving transcripts.
 */

interface TranscriptEvent {
  type: 'transcript' | 'error' | 'connected' | 'disconnected';
  text?: string;
  confidence?: number;
  timestamp?: Date;
  error?: string;
  isFinal?: boolean;
}

interface DeepgramConfig {
  apiKey: string;
  model?: string;
  language?: string;
  smartFormat?: boolean;
  interimResults?: boolean;
  endpointing?: boolean;
  vadEvents?: boolean;
}

export class DeepgramTranscriptionService {
  private deepgram: ReturnType<typeof createClient> | null = null;
  private connection: any = null; // LiveTranscription connection
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isConnected = false;
  private isRecording = false;
  private config: DeepgramConfig;
  private eventCallbacks: ((event: TranscriptEvent) => void)[] = [];
  private audioBuffer: Float32Array[] = [];
  private bufferInterval: NodeJS.Timeout | null = null;

  constructor(config: DeepgramConfig) {
    this.config = {
      model: 'nova-3',
      language: 'en-US',
      smartFormat: true,
      interimResults: true,
      endpointing: true,
      vadEvents: true,
      ...config
    };
  }

  /**
   * Subscribe to transcription events
   */
  onEvent(callback: (event: TranscriptEvent) => void): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit event to all subscribers
   */
  private emit(event: TranscriptEvent): void {
    this.eventCallbacks.forEach(callback => callback(event));
  }

  /**
   * Connect to Deepgram streaming API
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.warn('Already connected to Deepgram API');
      return;
    }

    try {
      console.log('🔄 Connecting to Deepgram streaming API...');
      console.log('🔑 API Key:', this.config.apiKey.substring(0, 8) + '...');
      console.log('🎯 Model:', this.config.model);
      console.log('🌍 Language:', this.config.language);

      // Create Deepgram client
      this.deepgram = createClient(this.config.apiKey);

      // Create live transcription connection with configuration
      this.connection = this.deepgram.listen.live({
        model: this.config.model,
        language: this.config.language,
        smart_format: this.config.smartFormat,
        interim_results: this.config.interimResults,
        endpointing: this.config.endpointing ? 300 : false, // Convert boolean to number/false
        vad_events: this.config.vadEvents,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1
      });

      // Set up event handlers
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram connection opened');
        this.isConnected = true;
        this.emit({ type: 'connected', timestamp: new Date() });
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('❌ Deepgram connection closed');
        this.isConnected = false;
        this.emit({ type: 'disconnected', timestamp: new Date() });
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        console.log('📝 Deepgram transcript received:', data);
        
        // Handle the transcript data from Deepgram
        if (data?.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript;
          const confidence = data.channel.alternatives[0].confidence || 0.9;
          const isFinal = data.is_final || false;
          
          // Only emit non-empty transcripts
          if (transcript.trim()) {
            console.log(`📝 ${isFinal ? 'Final' : 'Interim'} transcript:`, transcript);
            this.emit({
              type: 'transcript',
              text: transcript,
              confidence: confidence,
              timestamp: new Date(),
              isFinal: isFinal
            });
          }
        }
      });

      this.connection.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        console.log('📊 Deepgram metadata:', data);
      });

      this.connection.on(LiveTranscriptionEvents.Error, (err: any) => {
        console.error('🚨 Deepgram error:', err);
        let errorMessage = 'Unknown Deepgram error';
        
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.error) {
          errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
        }
        
        this.emit({
          type: 'error',
          error: errorMessage,
          timestamp: new Date()
        });
      });

      // Wait a moment for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error('Failed to connect to Deepgram API:', error);
      this.emit({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Connection failed',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Start recording and streaming audio to Deepgram
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    if (!this.isConnected) {
      throw new Error('Not connected to Deepgram API. Please connect first.');
    }

    if (!this.connection) {
      throw new Error('No Deepgram connection available.');
    }

    try {
      console.log('🎤 Starting audio capture...');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Set up audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(stream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (this.isRecording && this.connection) {
          const audioData = event.inputBuffer.getChannelData(0);
          this.sendAudioChunk(audioData);
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('✅ Started recording and streaming to Deepgram');

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.emit({
        type: 'error',
        error: 'Microphone access denied or audio setup failed',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Send audio chunk to Deepgram
   */
  private sendAudioChunk(audioData: Float32Array): void {
    if (!this.connection) {
      return;
    }

    try {
      // Convert Float32Array to Int16Array (Linear16 PCM)
      const int16Data = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
      }

      // Convert to Buffer/Uint8Array for sending
      const buffer = new ArrayBuffer(int16Data.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < int16Data.length; i++) {
        view.setInt16(i * 2, int16Data[i], true); // little endian
      }
      
      // Send the raw audio data to Deepgram
      this.connection.send(new Uint8Array(buffer));
      
    } catch (error) {
      console.error('Error sending audio chunk to Deepgram:', error);
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (!this.isRecording) {
      return;
    }

    console.log('🛑 Stopping recording...');
    this.isRecording = false;

    // Clean up audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Signal end of audio stream to Deepgram
    if (this.connection) {
      try {
        // Send empty buffer to signal end of stream
        this.connection.send(new Uint8Array(0));
      } catch (error) {
        console.warn('Error signaling end of stream to Deepgram:', error);
      }
    }

    console.log('✅ Stopped recording');
  }

  /**
   * Disconnect from Deepgram service
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Deepgram...');
    
    this.stopRecording();

    if (this.connection) {
      try {
        this.connection.finish();
      } catch (error) {
        console.warn('Error finishing Deepgram connection:', error);
      }
      this.connection = null;
    }

    this.deepgram = null;
    this.isConnected = false;
    this.audioBuffer = [];

    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }

    console.log('✅ Disconnected from Deepgram');
  }
}

/**
 * React hook for using Deepgram real-time transcription
 */
export function useDeepgramTranscription() {
  const [service, setService] = React.useState<DeepgramTranscriptionService | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [transcript, setTranscript] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [interimTranscript, setInterimTranscript] = React.useState<string>('');

  // Initialize service with API key from backend
  React.useEffect(() => {
    async function initializeService() {
      try {
        console.log('🔑 Fetching Deepgram API key from backend...');
        const response = await fetch('/api/config');
        
        if (!response.ok) {
          throw new Error(`Failed to get API configuration: ${response.status}`);
        }
        
        const config = await response.json();
        
        if (!config.success) {
          throw new Error('Invalid API configuration response');
        }

        // Check if we have a Deepgram API key in the config
        let deepgramApiKey = config.deepgramApiKey;
        
        if (!deepgramApiKey) {
          // For now, we'll show an error if no Deepgram key is configured
          throw new Error('Deepgram API key not configured. Please add DEEPGRAM_API_KEY to your environment variables.');
        }
        
        console.log('✅ Deepgram API key retrieved successfully');
        const newService = new DeepgramTranscriptionService({ 
          apiKey: deepgramApiKey,
          model: 'nova-3',
          language: 'en-US',
          smartFormat: true,
          interimResults: true,
          endpointing: true,
          vadEvents: true
        });
        
        setService(newService);
        setIsInitialized(true);
        
      } catch (error) {
        console.error('❌ Failed to initialize Deepgram transcription service:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize Deepgram service');
      }
    }
    
    initializeService();
  }, []);

  React.useEffect(() => {
    if (!service) return;
    
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
            if (event.isFinal) {
              // For final transcripts, add to cumulative transcript and clear interim
              setTranscript(prev => prev + (prev ? ' ' : '') + event.text);
              setInterimTranscript('');
            } else {
              // For interim transcripts, just update the interim state
              setInterimTranscript(event.text);
            }
          }
          break;
          
        case 'error':
          setError(event.error || 'Unknown Deepgram error');
          break;
      }
    });

    return () => {
      unsubscribe();
      service.disconnect();
    };
  }, [service]);

  const connect = React.useCallback(async () => {
    if (!service) {
      setError('Deepgram service not initialized');
      return;
    }
    try {
      await service.connect();
      // Give a moment for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to connect to Deepgram:', error);
      throw error;
    }
  }, [service]);

  const startRecording = React.useCallback(async () => {
    if (!service) {
      setError('Deepgram service not initialized');
      return;
    }
    try {
      // Ensure we're connected first
      if (!isConnected) {
        await connect();
      }
      await service.startRecording();
      setIsRecording(true);
      setTranscript('');
      setInterimTranscript('');
    } catch (error) {
      console.error('Failed to start Deepgram recording:', error);
      setError(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [service, isConnected, connect]);

  const stopRecording = React.useCallback(() => {
    if (!service) return;
    service.stopRecording();
    setIsRecording(false);
  }, [service]);

  const disconnect = React.useCallback(() => {
    if (!service) return;
    service.disconnect();
    setIsConnected(false);
    setIsRecording(false);
  }, [service]);

  return {
    isConnected,
    isRecording,
    transcript: transcript + (interimTranscript ? (transcript ? ' ' : '') + interimTranscript : ''),
    error,
    isInitialized,
    connect,
    startRecording,
    stopRecording,
    disconnect,
    service
  };
} 