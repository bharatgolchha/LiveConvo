import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { Observable } from 'rxjs';

/**
 * Production-ready Deepgram hook for WebSocket connection and transcript streaming
 * Designed to work with XState conversation machine
 */

export interface DeepgramConfig {
  model?: 'nova-2' | 'nova' | 'enhanced' | 'base';
  language?: string;
  smartFormat?: boolean;
  interimResults?: boolean;
  endpointing?: boolean;
  punctuate?: boolean;
  utteranceEndMs?: number;
  vadEvents?: boolean;
}

export interface TranscriptSegment {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
  speaker?: 'ME' | 'THEM';
}

export interface DeepgramError {
  code: 'CONNECTION_FAILED' | 'AUTH_FAILED' | 'STREAM_ERROR' | 'INIT_ERROR';
  message: string;
  retryable: boolean;
  timestamp: Date;
}

export interface ConnectionQuality {
  status: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency?: number;
  packetsLost?: number;
}

export interface UseDeepgramResult {
  isConnected: boolean;
  isConnecting: boolean;
  error: DeepgramError | null;
  connectionQuality: ConnectionQuality;
  connect: () => Promise<void>;
  disconnect: () => void;
  startStreaming: (audioStream: MediaStream) => Promise<void>;
  stopStreaming: () => void;
  transcriptObservable$: Observable<TranscriptSegment> | null;
}

// Singleton AudioContext to avoid Chrome's 6-context limit
let globalAudioContext: AudioContext | null = null;

// Get or create singleton AudioContext
function getAudioContext(): AudioContext {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    // Handle vendor prefixes for Safari
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioContext = new AudioContextClass({ sampleRate: 16000 });
  }
  return globalAudioContext;
}

// API configuration cache with TTL
const configCache = {
  data: null as { deepgramApiKey: string } | null,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes
};

async function getApiConfig(timeout = 500): Promise<string> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (configCache.data && now - configCache.timestamp < configCache.ttl) {
    return configCache.data.deepgramApiKey;
  }
  
  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timeout', 'TimeoutError'));
  }, timeout);
  
  try {
    const response = await fetch('/api/config', { signal: controller.signal });
    
    // Clear timeout immediately after successful response
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to fetch API configuration');
    }
    
    const data = await response.json();
    if (!data.deepgramApiKey) {
      throw new Error('Deepgram API key not configured');
    }
    
    // Cache the result
    configCache.data = data;
    configCache.timestamp = now;
    
    return data.deepgramApiKey;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Re-throw with more context
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (error.message === 'Request timeout') {
        throw new Error('API configuration request timed out');
      }
      throw new Error('API configuration request was aborted');
    }
    throw error;
  }
}

export function useDeepgram(config?: DeepgramConfig): UseDeepgramResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<DeepgramError | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    status: 'disconnected'
  });
  
  // Refs for stable references
  const deepgramRef = useRef<any>(null);
  const connectionRef = useRef<any>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStreamingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const connectionOpenRef = useRef(false);
  const pendingAudioRef = useRef<Uint8Array[]>([]);
  
  // Observable for XState integration
  const [transcriptObservable$, setTranscriptObservable] = useState<Observable<TranscriptSegment> | null>(null);
  
  // Configuration with defaults
  const finalConfig: DeepgramConfig = {
    model: 'nova-2',
    language: 'en-US',
    smartFormat: true,
    interimResults: true,
    endpointing: true,
    punctuate: true,
    utteranceEndMs: 1000,
    vadEvents: true,
    ...config
  };
  
  // Create error with proper typing
  const createError = (
    code: DeepgramError['code'],
    message: string,
    retryable = true
  ): DeepgramError => ({
    code,
    message,
    retryable,
    timestamp: new Date()
  });
  
  // Initialize Deepgram client
  useEffect(() => {
    async function initializeDeepgram() {
      try {
        // Fetch API key from server endpoint
        const apiKey = await getApiConfig();
        deepgramRef.current = createClient(apiKey);
      } catch (err) {
        setError(createError(
          'INIT_ERROR',
          err instanceof Error ? err.message : 'Failed to initialize Deepgram',
          false
        ));
      }
    }
    
    initializeDeepgram();
    
    return () => {
      // Cleanup on unmount
      clearTimeout(reconnectTimeoutRef.current);
      if (connectionRef.current) {
        connectionRef.current.finish();
      }
    };
  }, []);
  
  // Reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current);
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current += 1;
    
    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isConnected && !isConnecting) {
        connect();
      }
    }, delay);
  }, [isConnected, isConnecting]);
  
  // Connect to Deepgram WebSocket
  const connect = useCallback(async () => {
    if (!deepgramRef.current || isConnected || isConnecting) {
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    connectionOpenRef.current = false;
    
    try {
      // Create live transcription connection
      connectionRef.current = deepgramRef.current.listen.live({
        model: finalConfig.model,
        language: finalConfig.language,
        smart_format: finalConfig.smartFormat,
        interim_results: finalConfig.interimResults,
        endpointing: finalConfig.endpointing ? 300 : false,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        punctuate: finalConfig.punctuate,
        utterance_end_ms: finalConfig.utteranceEndMs,
        vad_events: finalConfig.vadEvents,
        diarize: false,
        alternatives: 1,
      });
      
      // Create observable for transcript segments
      const observable = new Observable<TranscriptSegment>(subscriber => {
        const handlers = {
          transcript: (data: any) => {
            if (data?.channel?.alternatives?.[0]?.transcript) {
              const transcript = data.channel.alternatives[0].transcript.trim();
              const confidence = data.channel.alternatives[0].confidence || 0.9;
              const isFinal = data.is_final || false;
              
              if (transcript.length > 0) {
                subscriber.next({
                  text: transcript,
                  confidence,
                  isFinal,
                  timestamp: new Date(),
                  speaker: 'ME' // Default, can be enhanced with diarization
                });
              }
            }
          },
          error: (err: any) => {
            subscriber.error(err);
          },
          close: () => {
            subscriber.complete();
          }
        };
        
        // Set up event handlers
        connectionRef.current.on(LiveTranscriptionEvents.Transcript, handlers.transcript);
        connectionRef.current.on(LiveTranscriptionEvents.Error, handlers.error);
        connectionRef.current.on(LiveTranscriptionEvents.Close, handlers.close);
        
        // Cleanup function
        return () => {
          if (connectionRef.current) {
            connectionRef.current.off(LiveTranscriptionEvents.Transcript, handlers.transcript);
            connectionRef.current.off(LiveTranscriptionEvents.Error, handlers.error);
            connectionRef.current.off(LiveTranscriptionEvents.Close, handlers.close);
          }
        };
      });
      
      setTranscriptObservable(observable);
      
      // Connection lifecycle handlers
      connectionRef.current.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        connectionOpenRef.current = true;
        reconnectAttemptsRef.current = 0;
        setConnectionQuality({ status: 'excellent' });
        
        // Send any pending audio
        if (pendingAudioRef.current.length > 0) {
          console.log(`📤 Sending ${pendingAudioRef.current.length} pending audio chunks`);
          pendingAudioRef.current.forEach(chunk => {
            connectionRef.current?.send(chunk);
          });
          pendingAudioRef.current = [];
        }
      });
      
      connectionRef.current.on(LiveTranscriptionEvents.Close, () => {
        console.log('❌ Deepgram WebSocket closed');
        setIsConnected(false);
        connectionOpenRef.current = false;
        setConnectionQuality({ status: 'disconnected' });
        
        // Schedule reconnection if not intentionally disconnected
        if (isStreamingRef.current) {
          scheduleReconnect();
        }
      });
      
      connectionRef.current.on(LiveTranscriptionEvents.Error, (err: any) => {
        console.error('🚨 Deepgram error:', err);
        const error = createError(
          'CONNECTION_FAILED',
          err?.message || 'Deepgram connection error',
          true
        );
        setError(error);
        setConnectionQuality({ status: 'poor' });
      });
      
      // VAD events for connection quality
      connectionRef.current.on(LiveTranscriptionEvents.SpeechStarted, () => {
        setConnectionQuality(prev => ({ ...prev, status: 'good' }));
      });
      
    } catch (err) {
      console.error('Failed to connect to Deepgram:', err);
      const error = createError(
        'CONNECTION_FAILED',
        err instanceof Error ? err.message : 'Connection failed',
        true
      );
      setError(error);
      setIsConnecting(false);
      
      // Schedule reconnect on failure
      scheduleReconnect();
    }
  }, [isConnected, isConnecting, finalConfig, scheduleReconnect]);
  
  // Disconnect from Deepgram
  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current);
    isStreamingRef.current = false;
    
    if (connectionRef.current) {
      try {
        connectionRef.current.finish();
      } catch (err) {
        console.warn('Error closing Deepgram connection:', err);
      }
      connectionRef.current = null;
    }
    
    setIsConnected(false);
    connectionOpenRef.current = false;
    setError(null);
    setTranscriptObservable(null);
    setConnectionQuality({ status: 'disconnected' });
  }, []);
  
  // Load audio worklet processor
  const loadAudioWorklet = async (audioContext: AudioContext): Promise<void> => {
    try {
      await audioContext.audioWorklet.addModule('/audio-processor.js');
    } catch (err) {
      console.warn('AudioWorklet not supported, falling back to ScriptProcessor');
      throw err;
    }
  };
  
  // Start streaming audio to Deepgram
  const startStreaming = useCallback(async (audioStream: MediaStream) => {
    if (!connectionRef.current || isStreamingRef.current) {
      console.warn('Cannot start streaming: connection not ready or already streaming');
      return;
    }
    
    try {
      streamRef.current = audioStream;
      const audioContext = getAudioContext();
      
      // Resume context if suspended (Chrome autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      sourceRef.current = audioContext.createMediaStreamSource(audioStream);
      
      // Try to use AudioWorklet first, fallback to ScriptProcessor
      try {
        await loadAudioWorklet(audioContext);
        
        workletRef.current = new AudioWorkletNode(audioContext, 'audio-processor', {
          processorOptions: { sampleRate: 16000 }
        });
        
        workletRef.current.port.onmessage = (event) => {
          if (event.data.type === 'audio' && connectionOpenRef.current) {
            connectionRef.current.send(event.data.buffer);
          } else if (!connectionOpenRef.current) {
            // Queue audio if connection not ready
            pendingAudioRef.current.push(event.data.buffer);
          }
        };
        
        sourceRef.current.connect(workletRef.current);
        workletRef.current.connect(audioContext.destination);
        
      } catch (workletError) {
        // Fallback to ScriptProcessor (deprecated but more compatible)
        console.warn('AudioWorklet failed, using ScriptProcessor fallback');
        
        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        const int16Array = new Int16Array(2048);
        const buffer = new ArrayBuffer(int16Array.length * 2);
        const view = new DataView(buffer);
        
        processor.onaudioprocess = (event) => {
          if (!isStreamingRef.current) return;
          
          const audioData = event.inputBuffer.getChannelData(0);
          
          // Reuse buffers for efficiency
          for (let i = 0; i < audioData.length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            int16Array[i] = sample * 32767;
            view.setInt16(i * 2, int16Array[i], true);
          }
          
          const uint8Array = new Uint8Array(buffer);
          
          if (connectionOpenRef.current && connectionRef.current) {
            connectionRef.current.send(uint8Array);
          } else {
            // Queue audio if connection not ready
            pendingAudioRef.current.push(uint8Array.slice());
          }
        };
        
        sourceRef.current.connect(processor);
        processor.connect(audioContext.destination);
        workletRef.current = processor as any;
      }
      
      isStreamingRef.current = true;
      console.log('🎙️ Started streaming audio to Deepgram');
      
      // Ensure connection is established
      if (!connectionOpenRef.current && !isConnecting) {
        await connect();
      }
      
    } catch (err) {
      console.error('Failed to start audio streaming:', err);
      const error = createError(
        'STREAM_ERROR',
        err instanceof Error ? err.message : 'Failed to start streaming',
        false
      );
      setError(error);
    }
  }, [isConnecting, connect]);
  
  // Stop streaming audio
  const stopStreaming = useCallback(() => {
    if (!isStreamingRef.current) {
      return;
    }
    
    isStreamingRef.current = false;
    pendingAudioRef.current = [];
    
    // Clean up audio nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (workletRef.current) {
      workletRef.current.disconnect();
      if ('port' in workletRef.current) {
        workletRef.current.port.close();
      }
      workletRef.current = null;
    }
    
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Signal end of stream to Deepgram
    if (connectionRef.current && connectionOpenRef.current) {
      try {
        connectionRef.current.send(new Uint8Array(0));
      } catch (err) {
        console.warn('Error signaling end of stream:', err);
      }
    }
    
    console.log('🛑 Stopped streaming audio to Deepgram');
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
      disconnect();
    };
  }, [stopStreaming, disconnect]);
  
  return {
    isConnected,
    isConnecting,
    error,
    connectionQuality,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
    transcriptObservable$
  };
}