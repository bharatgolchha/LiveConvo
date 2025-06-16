import React from 'react';
import { getApiConfig } from '@/lib/apiConfig';

/**
 * OpenAI Realtime API WebRTC integration for live transcription
 * 
 * This service uses WebRTC instead of WebSocket for browser compatibility
 * with proper authentication support.
 */

interface TranscriptEvent {
  type: 'transcript' | 'error' | 'connected' | 'disconnected';
  text?: string;
  confidence?: number;
  timestamp?: Date;
  error?: string;
}

interface WebRTCConfig {
  apiKey: string;
  model?: string;
  voiceActivityDetection?: boolean;
  language?: string;
}

export class WebRTCTranscriptionService {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioContext: AudioContext | null = null;
  private isConnected = false;
  private isRecording = false;
  private config: WebRTCConfig;
  private eventCallbacks: ((event: TranscriptEvent) => void)[] = [];
  private audioTrack: MediaStreamTrack | null = null;
  private customAudioStream: MediaStream | null = null; // Store custom audio stream

  constructor(config: WebRTCConfig) {
    this.config = {
      // Default to the new STT model
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
   * Set custom audio stream (e.g., screen share audio)
   */
  setCustomAudioStream(stream: MediaStream): void {
    this.customAudioStream = stream;
    console.log('🔊 Custom audio stream set:', stream.getAudioTracks().length, 'audio tracks');
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
   * Connect to OpenAI Realtime API using WebRTC
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.warn('Already connected to Realtime API');
      return;
    }

    try {
      console.log('🔄 Setting up WebRTC connection to OpenAI Realtime API...');
      console.log('🔑 API Key:', this.config.apiKey.substring(0, 8) + '...');
      console.log('🎯 Model:', this.config.model);

      // Get audio stream (custom stream or microphone)
      let stream: MediaStream;
      if (this.customAudioStream) {
        console.log('🔊 Using custom audio stream (screen share)');
        stream = this.customAudioStream;
      } else {
        console.log('🎤 Getting microphone access...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      }

      const audioTracks = stream.getAudioTracks();
      console.log('✅ Audio access granted, tracks:', audioTracks.length);
      
      // Log all tracks
      audioTracks.forEach((track, index) => {
        console.log(`  Track ${index + 1}:`, track.label, 'enabled:', track.enabled);
      });

      // Create RTCPeerConnection
      this.pc = new RTCPeerConnection();

      // Add ALL audio tracks to peer connection
      if (audioTracks.length === 1) {
        // Single track (normal case)
        this.audioTrack = audioTracks[0];
        this.pc.addTrack(audioTracks[0], stream);
        console.log('🎵 Single audio track added to peer connection');
      } else if (audioTracks.length > 1) {
        // Multiple tracks - need to mix them
        console.log('🎛️ Multiple audio tracks detected, mixing them...');
        
        // Create an audio context to mix the tracks
        const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) {
          throw new Error('AudioContext not supported');
        }
        const audioContext = new AudioContextConstructor();
        const destination = audioContext.createMediaStreamDestination();
        
        // Add each track to the mixer
        audioTracks.forEach((track, index) => {
          const source = audioContext.createMediaStreamSource(new MediaStream([track]));
          source.connect(destination);
          console.log(`  Mixed track ${index + 1}:`, track.label);
        });
        
        // Get the mixed track
        const mixedTrack = destination.stream.getAudioTracks()[0];
        this.audioTrack = mixedTrack;
        this.pc.addTrack(mixedTrack, destination.stream);
        console.log('🎵 Mixed audio track added to peer connection');
      } else {
        throw new Error('No audio tracks found in stream');
      }

      // Set up data channel for API communication
      this.dc = this.pc.createDataChannel('oai-events');
      
      this.dc.onopen = () => {
        console.log('✅ Data channel opened');
        this.isConnected = true;
        this.initializeSession();
        this.emit({ type: 'connected', timestamp: new Date() });
      };

      this.dc.onmessage = (event) => {
        this.handleDataChannelMessage(event);
      };

      this.dc.onclose = () => {
        console.log('❌ Data channel closed');
        this.isConnected = false;
        this.emit({ type: 'disconnected', timestamp: new Date() });
      };

      this.dc.onerror = (error) => {
        console.error('🚨 Data channel error:', error);
        this.emit({ 
          type: 'error', 
          error: 'Data channel error',
          timestamp: new Date()
        });
      };

      // Set up audio track handling
      this.pc.ontrack = (event) => {
        console.log('📥 Received remote audio track');
        // Handle incoming audio if needed
      };

      // Create offer (now includes audio track info in SDP)
      console.log('📝 Creating WebRTC offer...');
      await this.pc.setLocalDescription();
      
      // Send offer to OpenAI
      const baseUrl = "https://api.openai.com/v1/realtime";
      console.log('📤 Sending SDP offer to OpenAI...');
      console.log('📋 SDP preview:', this.pc.localDescription!.sdp.split('\n').slice(0, 10).join('\n') + '...');
      
      const response = await fetch(`${baseUrl}?model=${this.config.model}`, {
        method: "POST",
        body: this.pc.localDescription!.sdp,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1" // Required header for realtime API
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      // Set remote description from response
      const answerSdp = await response.text();
      const answer = { type: "answer" as RTCSdpType, sdp: answerSdp };
      await this.pc.setRemoteDescription(answer);

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout. Current state: ${this.pc?.connectionState}`));
        }, 10000);

        this.pc!.addEventListener("connectionstatechange", () => {
          if (this.pc!.connectionState === "connected") {
            clearTimeout(timeout);
            console.log("✅ WebRTC peer connection established!");
            resolve();
          } else if (this.pc!.connectionState === "failed") {
            clearTimeout(timeout);
            reject(new Error("WebRTC connection failed"));
          }
        });
      });

    } catch (error) {
      console.error('Failed to connect to Realtime API:', error);
      this.emit({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Connection failed',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Initialize session configuration
   */
  private initializeSession(): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      return;
    }

    // Use regular session.update with transcription configuration
    const sessionEvent = {
      type: 'session.update',
      session: {
        modalities: ['text'], // Text-only for transcription focus
        instructions: 'Focus only on accurate transcription of spoken words. Do not generate responses.',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          // Use OpenAI's latest STT model
          model: 'gpt-4o-mini-transcribe'
        },
        turn_detection: this.config.voiceActivityDetection ? {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: false // Don't create AI responses, just transcribe
        } : { type: 'none' },
        temperature: 0.6, // Minimum allowed temperature for consistent transcription
        max_response_output_tokens: 1 // Minimize response generation
      }
    };

    console.log('📤 Sending session config...');
    this.dc.send(JSON.stringify(sessionEvent));
  }

  /**
   * Handle incoming data channel messages
   */
  private handleDataChannelMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 Received event:', data.type);
      console.log('📋 Full event data:', JSON.stringify(data, null, 2));
      
      switch (data.type) {
        case 'session.created':
          console.log('✅ Session created:', data.session?.id);
          break;
          
        case 'session.updated':
          console.log('✅ Session updated');
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
          console.log('📋 Event:', data.type, data);
      }
    } catch (error) {
      console.error('Failed to parse data channel message:', error);
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

    if (!this.audioTrack) {
      throw new Error('No audio track available. Connection may have failed.');
    }

    try {
      this.isRecording = true;
      console.log('Started recording and streaming audio via WebRTC');

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.emit({
        type: 'error',
        error: 'Failed to start recording',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    if (this.audioTrack) {
      this.audioTrack.stop();
      this.audioTrack = null;
    }

    console.log('Stopped recording');
  }

  /**
   * Disconnect from the service
   */
  disconnect(): void {
    this.stopRecording();

    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.isConnected = false;
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
 * Hook for using WebRTC-based real-time transcription
 */
export function useWebRTCTranscription(enabled: boolean = true) {
  const [service, setService] = React.useState<WebRTCTranscriptionService | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [transcript, setTranscript] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize service with API key from backend
  React.useEffect(() => {
    if (!enabled) return;
    
    async function initializeService() {
      try {
        console.log('🔑 Fetching OpenAI API key from backend...');
        const config = await getApiConfig();

        if (!config.success) throw new Error('Invalid API config');

        const responseData = { success: true, apiKey: config.apiKey };

        // mimic old behavior vars

        const newService = new WebRTCTranscriptionService({ apiKey: responseData.apiKey! });
        setService(newService);
        setIsInitialized(true);
        return;
      } catch (error) {
        console.error('❌ Failed to initialize transcription service:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize');
      }
    }
    
    initializeService();
  }, [enabled]);

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
    if (!service) {
      setError('Service not initialized');
      return;
    }
    try {
      await service.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [service]);

  const startRecording = React.useCallback(async () => {
    if (!service) {
      setError('Service not initialized');
      return;
    }
    try {
      await service.startRecording();
      setIsRecording(true);
      setTranscript('');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [service]);

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

  const setCustomAudioStream = React.useCallback((stream: MediaStream) => {
    if (!service) return;
    service.setCustomAudioStream(stream);
  }, [service]);

  return {
    isConnected,
    isRecording,
    transcript,
    error,
    isInitialized,
    connect,
    startRecording,
    stopRecording,
    disconnect,
    setCustomAudioStream,
    service
  };
} 