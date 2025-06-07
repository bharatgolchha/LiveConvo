import React from 'react';
import { createClient, LiveTranscriptionEvents, LiveTranscription } from '@deepgram/sdk';

/**
 * Deepgram streaming transcription service for live audio processing
 * 
 * Optimized for efficiency with:
 * - Reduced logging noise
 * - Debounced interim results
 * - Duplicate result filtering
 * - Performance optimizations
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

interface DeepgramTranscriptData {
  channel?: {
    alternatives?: Array<{
      transcript: string;
      confidence?: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>;
  };
  is_final?: boolean;
  speech_final?: boolean;
  from_finalize?: boolean;
}

interface DeepgramMetadata {
  request_id?: string;
  model_info?: {
    name: string;
    version: string;
  };
}

interface DeepgramError {
  type: string;
  message: string;
  code?: string;
}

export class DeepgramTranscriptionService {
  private deepgram: ReturnType<typeof createClient> | null = null;
  private connection: LiveTranscription | null = null; // LiveTranscription connection
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isConnected = false;
  private isRecording = false;
  private config: DeepgramConfig;
  private eventCallbacks: ((event: TranscriptEvent) => void)[] = [];
  private audioBuffer: Float32Array[] = [];
  private bufferInterval: NodeJS.Timeout | null = null;
  private customAudioStream: MediaStream | null = null; // Store custom audio stream
  
  // Optimization properties
  private lastInterimText = '';
  private interimDebounceTimeout: NodeJS.Timeout | null = null;
  private readonly INTERIM_DEBOUNCE_MS = 150; // Debounce interim results
  private readonly MIN_CONFIDENCE = 0.6; // Filter low confidence results
  private readonly MIN_TEXT_LENGTH = 2; // Ignore very short transcripts
  private verboseLogging = false; // Disable verbose logging by default
  private processedResults = new Set<string>(); // Track processed results to avoid duplicates
  private readonly MAX_PROCESSED_CACHE = 100; // Limit cache size

  // Tab visibility and connection recovery
  private isTabVisible = true;
  private connectionRetryCount = 0;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private retryTimeout: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: DeepgramConfig) {
    this.config = {
      model: 'nova-3',
      language: 'en-US',
      smartFormat: true,
      interimResults: true,
      endpointing: true,
      vadEvents: false, // Disable VAD events for better performance
      ...config
    };
    
    // Set up tab visibility handling
    this.setupVisibilityHandling();
  }

  /**
   * Set up tab visibility change handling
   */
  private setupVisibilityHandling(): void {
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        const isVisible = !document.hidden;
        const wasVisible = this.isTabVisible;
        this.isTabVisible = isVisible;
        
        if (!wasVisible && isVisible) {
          // Tab became visible again
          if (this.verboseLogging) {
            console.log('🔍 Tab visible again - checking Deepgram connection health');
          }
          
          // Check if we need to reconnect
          if (this.isRecording && !this.isConnected) {
            console.log('🔄 Deepgram connection lost during tab switch - attempting recovery');
            this.recoverConnection();
          }
        } else if (wasVisible && !isVisible) {
          // Tab became hidden
          if (this.verboseLogging) {
            console.log('🔍 Tab hidden - Deepgram connection may be suspended by browser');
          }
        }
      };
      
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  /**
   * Attempt to recover lost connection
   */
  private async recoverConnection(): Promise<void> {
    if (this.connectionRetryCount >= this.MAX_RETRY_ATTEMPTS) {
      console.error('🚨 Max Deepgram connection retry attempts reached');
      this.emit({
        type: 'error',
        error: 'Connection lost and could not be recovered. Please refresh the page.',
        timestamp: new Date()
      });
      return;
    }

    this.connectionRetryCount++;
    console.log(`🔄 Attempting Deepgram connection recovery (${this.connectionRetryCount}/${this.MAX_RETRY_ATTEMPTS})`);

    try {
      // Clean up existing connection
      if (this.connection) {
        try {
          this.connection.finish();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.connection = null;
      }

      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000 * this.connectionRetryCount));

      // Reconnect
      await this.connect();
      
      if (this.isConnected) {
        console.log('✅ Deepgram connection recovered successfully');
        this.connectionRetryCount = 0; // Reset retry count on success
        
        // Resume recording if we were recording before
        if (this.isRecording) {
          console.log('🎤 Resuming recording after connection recovery');
          // Note: The audio context should still be active, so we just need the connection
        }
      }
    } catch (error) {
      console.error(`❌ Deepgram connection recovery attempt ${this.connectionRetryCount} failed:`, error);
      
      // Schedule next retry
      this.retryTimeout = setTimeout(() => {
        this.recoverConnection();
      }, 5000 * this.connectionRetryCount); // Exponential backoff
    }
  }

  /**
   * Enable/disable verbose logging (useful for debugging)
   */
  setVerboseLogging(enabled: boolean): void {
    this.verboseLogging = enabled;
  }

  /**
   * Set a custom audio stream to use instead of microphone
   */
  setCustomAudioStream(stream: MediaStream): void {
    if (this.verboseLogging) {
      console.log('🎵 Setting custom audio stream for Deepgram');
    }
    this.customAudioStream = stream;
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
   * Clear processed results cache when it gets too large
   */
  private cleanupCache(): void {
    if (this.processedResults.size > this.MAX_PROCESSED_CACHE) {
      this.processedResults.clear();
    }
  }

  /**
   * Filter and process transcript results efficiently
   */
  private processTranscriptResult(transcript: string, confidence: number, isFinal: boolean): boolean {
    // Basic filtering
    if (!transcript || transcript.trim().length < this.MIN_TEXT_LENGTH) {
      return false;
    }

    // Filter low confidence results (but be more lenient with final results)
    const minConfidence = isFinal ? this.MIN_CONFIDENCE * 0.7 : this.MIN_CONFIDENCE;
    if (confidence < minConfidence) {
      if (this.verboseLogging) {
        console.log(`🔽 Skipping low confidence (${confidence.toFixed(2)}) transcript:`, transcript.substring(0, 50));
      }
      return false;
    }

    // Create result signature for duplicate detection
    const resultSignature = `${isFinal ? 'F' : 'I'}:${transcript.toLowerCase().trim()}`;
    
    // Skip duplicates (but allow final results even if we've seen the interim)
    if (this.processedResults.has(resultSignature)) {
      return false;
    }

    // Mark as processed
    this.processedResults.add(resultSignature);
    this.cleanupCache();

    return true;
  }

  /**
   * Handle interim results with debouncing
   */
  private handleInterimResult(transcript: string, confidence: number): void {
    // Clear existing timeout
    if (this.interimDebounceTimeout) {
      clearTimeout(this.interimDebounceTimeout);
    }

    // Skip if same as last interim
    if (transcript === this.lastInterimText) {
      return;
    }

    this.lastInterimText = transcript;

    // Debounce interim results to reduce processing
    this.interimDebounceTimeout = setTimeout(() => {
      if (this.processTranscriptResult(transcript, confidence, false)) {
        if (this.verboseLogging) {
          console.log(`📝 Interim (${confidence.toFixed(2)}):`, transcript.substring(0, 100));
        }
        this.emit({
          type: 'transcript',
          text: transcript,
          confidence: confidence,
          timestamp: new Date(),
          isFinal: false
        });
      }
    }, this.INTERIM_DEBOUNCE_MS);
  }

  /**
   * Handle final results immediately
   */
  private handleFinalResult(transcript: string, confidence: number): void {
    // Clear any pending interim timeout since we have a final result
    if (this.interimDebounceTimeout) {
      clearTimeout(this.interimDebounceTimeout);
      this.interimDebounceTimeout = null;
    }

    this.lastInterimText = ''; // Reset interim tracking

    if (this.processTranscriptResult(transcript, confidence, true)) {
      console.log(`✅ Final (${confidence.toFixed(2)}):`, transcript); // Always log final results
      this.emit({
        type: 'transcript',
        text: transcript,
        confidence: confidence,
        timestamp: new Date(),
        isFinal: true
      });
    }
  }

  /**
   * Connect to Deepgram streaming API
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      if (this.verboseLogging) {
        console.warn('Already connected to Deepgram API');
      }
      return;
    }

    // Return existing connection promise if we're already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject(new Error('Connection timeout - Deepgram did not respond within 10 seconds'));
      }, 10000);

      try {
        console.log('🔄 Connecting to Deepgram streaming API...');
        if (this.verboseLogging) {
          console.log('🔑 API Key:', this.config.apiKey.substring(0, 8) + '...');
          console.log('🎯 Model:', this.config.model);
          console.log('🌍 Language:', this.config.language);
        }

        // Create Deepgram client
        this.deepgram = createClient(this.config.apiKey);

        // Create live transcription connection with optimized configuration
        this.connection = this.deepgram.listen.live({
        model: this.config.model,
        language: this.config.language,
        smart_format: this.config.smartFormat,
        interim_results: this.config.interimResults,
        endpointing: this.config.endpointing ? 300 : false,
        vad_events: this.config.vadEvents,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        // Performance optimizations
        punctuate: true,
        diarize: false, // Disable speaker diarization for better performance
        ner: false, // Disable named entity recognition for better performance
        multichannel: false,
        alternatives: 1, // Only get top result
        profanity_filter: false, // Disable for performance
        redact: false // Disable for performance
      });

      // Set up event handlers
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram connection opened');
        this.isConnected = true;
        clearTimeout(connectionTimeout);
        this.connectionPromise = null;
        resolve();
        this.emit({ type: 'connected', timestamp: new Date() });
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('❌ Deepgram connection closed');
        this.isConnected = false;
        this.connectionPromise = null;
        this.emit({ type: 'disconnected', timestamp: new Date() });
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: DeepgramTranscriptData) => {
        // Only log raw data in verbose mode
        if (this.verboseLogging) {
          console.log('📝 Raw Deepgram result:', data);
        }
        
        // Handle the transcript data from Deepgram efficiently
        if (data?.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript.trim();
          const confidence = data.channel.alternatives[0].confidence || 0.9;
          const isFinal = data.is_final || false;
          
          // Process based on whether it's final or interim
          if (isFinal) {
            this.handleFinalResult(transcript, confidence);
          } else {
            this.handleInterimResult(transcript, confidence);
          }
        }
      });

      this.connection.on(LiveTranscriptionEvents.Metadata, (data: DeepgramMetadata) => {
        if (this.verboseLogging) {
          console.log('📊 Deepgram metadata:', data);
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (err: DeepgramError) => {
        console.error('🚨 Deepgram error:', err);
        let errorMessage = 'Unknown Deepgram error';
        
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.error) {
          errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
        }
        
        clearTimeout(connectionTimeout);
        this.connectionPromise = null;
        reject(new Error(errorMessage));
        
        this.emit({
          type: 'error',
          error: errorMessage,
          timestamp: new Date()
        });
      });

      } catch (error) {
        clearTimeout(connectionTimeout);
        this.connectionPromise = null;
        console.error('Failed to connect to Deepgram API:', error);
        this.emit({ 
          type: 'error', 
          error: error instanceof Error ? error.message : 'Connection failed',
          timestamp: new Date()
        });
        reject(error);
      }
    });

    try {
      await this.connectionPromise;
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * Start recording and streaming audio to Deepgram
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      if (this.verboseLogging) {
        console.warn('Already recording');
      }
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
      
      // Use custom audio stream if available, otherwise get microphone access
      let stream: MediaStream;
      if (this.customAudioStream) {
        if (this.verboseLogging) {
          console.log('🎵 Using custom audio stream');
        }
        stream = this.customAudioStream;
      } else {
        if (this.verboseLogging) {
          console.log('🎤 Getting microphone access');
        }
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      }

      // Set up audio context for processing with optimizations
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(stream);
      
      // Use smaller buffer size for better real-time performance
      const processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      processor.onaudioprocess = (event) => {
        if (this.isRecording && this.connection) {
          const audioData = event.inputBuffer.getChannelData(0);
          this.sendAudioChunk(audioData);
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.isRecording = true;
      
      // Reset optimization state
      this.lastInterimText = '';
      this.processedResults.clear();
      
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
   * Send audio chunk to Deepgram (optimized)
   */
  private sendAudioChunk(audioData: Float32Array): void {
    if (!this.connection || !this.isRecording) {
      return;
    }

    try {
      // Convert Float32Array to Int16Array (Linear16 PCM) - optimized version
      const int16Data = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        // Clamp and convert in one operation
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        int16Data[i] = sample * 32767;
      }

      // Convert to buffer more efficiently
      const buffer = new ArrayBuffer(int16Data.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < int16Data.length; i++) {
        view.setInt16(i * 2, int16Data[i], true); // little endian
      }
      
      // Send the raw audio data to Deepgram
      this.connection.send(new Uint8Array(buffer));
      
    } catch (error) {
      if (this.verboseLogging) {
        console.error('Error sending audio chunk to Deepgram:', error);
      }
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

    // Clear any pending interim timeouts
    if (this.interimDebounceTimeout) {
      clearTimeout(this.interimDebounceTimeout);
      this.interimDebounceTimeout = null;
    }

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
        if (this.verboseLogging) {
          console.warn('Error signaling end of stream to Deepgram:', error);
        }
      }
    }

    console.log('✅ Stopped recording');
  }

  /**
   * Disconnect from Deepgram service
   */
  disconnect(): void {
    if (this.verboseLogging) {
      console.log('🔌 Disconnecting from Deepgram...');
    }
    
    this.stopRecording();

    // Clear timeouts
    if (this.interimDebounceTimeout) {
      clearTimeout(this.interimDebounceTimeout);
      this.interimDebounceTimeout = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Clean up visibility handler
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.connection) {
      try {
        this.connection.finish();
      } catch (error) {
        if (this.verboseLogging) {
          console.warn('Error finishing Deepgram connection:', error);
        }
      }
      this.connection = null;
    }

    this.deepgram = null;
    this.isConnected = false;
    this.audioBuffer = [];
    this.processedResults.clear();
    this.lastInterimText = '';
    this.connectionRetryCount = 0;

    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }

    if (this.verboseLogging) {
      console.log('✅ Disconnected from Deepgram');
    }
  }

  /**
   * Get recording state
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }
}

/**
 * React hook for using Deepgram real-time transcription
 * Optimized for performance with reduced re-renders and efficient state management
 */
export function useDeepgramTranscription() {
  const [service, setService] = React.useState<DeepgramTranscriptionService | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [transcript, setTranscript] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [interimTranscript, setInterimTranscript] = React.useState<string>('');

  // Performance optimization: reduce interim transcript updates
  const interimUpdateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastInterimRef = React.useRef<string>('');

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
        const deepgramApiKey = config.deepgramApiKey;
        
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
          vadEvents: false // Disabled for better performance
        });
        
        // Enable verbose logging in development
        if (process.env.NODE_ENV === 'development') {
          newService.setVerboseLogging(false); // Still keep it off by default even in dev
        }
        
        setService(newService);
        setIsInitialized(true);
        
      } catch (error) {
        console.error('❌ Failed to initialize Deepgram transcription service:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize Deepgram service');
      }
    }
    
    initializeService();
  }, []);

  // Optimized event handling with debouncing for interim results
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
          // Don't automatically stop recording on disconnect - might be temporary
          // setIsRecording(false);
          break;
          
        case 'transcript':
          if (event.text) {
            if (event.isFinal) {
              // For final transcripts, add to cumulative transcript and clear interim
              setTranscript(prev => {
                const newTranscript = prev + (prev ? ' ' : '') + event.text;
                return newTranscript;
              });
              setInterimTranscript('');
              lastInterimRef.current = '';
              
              // Clear any pending interim updates
              if (interimUpdateTimeoutRef.current) {
                clearTimeout(interimUpdateTimeoutRef.current);
                interimUpdateTimeoutRef.current = null;
              }
            } else {
              // Debounce interim transcript updates to reduce re-renders
              if (interimUpdateTimeoutRef.current) {
                clearTimeout(interimUpdateTimeoutRef.current);
              }
              
              // Only update if text has changed significantly
              if (event.text !== lastInterimRef.current) {
                lastInterimRef.current = event.text;
                
                interimUpdateTimeoutRef.current = setTimeout(() => {
                  setInterimTranscript(event.text || '');
                }, 100); // Small delay to batch rapid updates
              }
            }
          }
          break;
          
        case 'error':
          setError(event.error || 'Unknown Deepgram error');
          // If we get a connection error, try to recover
          if (event.error?.includes('Connection') || event.error?.includes('connection')) {
            console.log('🔄 Connection error detected - service will attempt recovery');
          }
          break;
      }
    });

    return () => {
      unsubscribe();
      // Note: We don't disconnect the service here to avoid issues with React StrictMode
      // The service will be cleaned up when the parent component unmounts
    };
  }, [service]);

  // Cleanup on unmount - this runs only once when component truly unmounts
  React.useEffect(() => {
    const currentService = service;
    return () => {
      if (interimUpdateTimeoutRef.current) {
        clearTimeout(interimUpdateTimeoutRef.current);
      }
      // Only disconnect if we're truly unmounting (not just re-rendering)
      if (currentService && currentService.getIsRecording()) {
        console.log('⚠️ Component unmounting while recording - stopping recording');
        currentService.stopRecording();
      }
    };
  }, []); // Empty deps ensures this only runs on mount/unmount

  const connect = React.useCallback(async () => {
    if (!service) {
      setError('Deepgram service not initialized');
      return;
    }
    try {
      await service.connect();
      // Reduced wait time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
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
      
      // Reset transcript state
      setTranscript('');
      setInterimTranscript('');
      lastInterimRef.current = '';
      
    } catch (error) {
      console.error('Failed to start Deepgram recording:', error);
      setError(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [service, isConnected, connect]);

  const stopRecording = React.useCallback(() => {
    if (!service) return;
    
    // Clear any pending interim updates
    if (interimUpdateTimeoutRef.current) {
      clearTimeout(interimUpdateTimeoutRef.current);
      interimUpdateTimeoutRef.current = null;
    }
    
    service.stopRecording();
    setIsRecording(false);
    setInterimTranscript(''); // Clear interim when stopping
    lastInterimRef.current = '';
  }, [service]);

  const disconnect = React.useCallback(() => {
    if (!service) return;
    
    // Clear timeouts
    if (interimUpdateTimeoutRef.current) {
      clearTimeout(interimUpdateTimeoutRef.current);
      interimUpdateTimeoutRef.current = null;
    }
    
    service.disconnect();
    setIsConnected(false);
    setIsRecording(false);
    setTranscript('');
    setInterimTranscript('');
    lastInterimRef.current = '';
  }, [service]);

  const setCustomAudioStream = React.useCallback((stream: MediaStream) => {
    if (!service) return;
    service.setCustomAudioStream(stream);
  }, [service]);

  // Enable verbose logging for debugging
  const setVerboseLogging = React.useCallback((enabled: boolean) => {
    if (!service) return;
    service.setVerboseLogging(enabled);
  }, [service]);

  // Memoize the combined transcript to avoid unnecessary recalculations
  const fullTranscript = React.useMemo(() => {
    return transcript + (interimTranscript ? (transcript ? ' ' : '') + interimTranscript : '');
  }, [transcript, interimTranscript]);

  return {
    isConnected,
    isRecording,
    transcript: fullTranscript,
    finalTranscript: transcript, // Expose final transcript separately for advanced use cases
    interimTranscript,
    error,
    isInitialized,
    connect,
    startRecording,
    stopRecording,
    disconnect,
    setCustomAudioStream,
    setVerboseLogging,
    service
  };
} 