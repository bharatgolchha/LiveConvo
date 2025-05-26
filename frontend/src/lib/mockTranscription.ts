import React from 'react';

/**
 * Mock transcription service for development and demo purposes
 */

interface MockTranscriptEvent {
  type: 'transcript' | 'error' | 'connected' | 'disconnected';
  text?: string;
  confidence?: number;
  timestamp?: Date;
  error?: string;
}

export class MockTranscriptionService {
  private isConnected = false;
  private isRecording = false;
  private eventCallbacks: ((event: MockTranscriptEvent) => void)[] = [];
  private transcriptInterval: NodeJS.Timeout | null = null;
  private currentTranscriptIndex = 0;

  // Realistic demo transcript segments
  private demoSegments = [
    "Hello everyone, thank you for joining today's call.",
    "I'd like to start by reviewing our quarterly objectives.",
    "As you can see from the data, we've achieved significant growth.",
    "Our customer acquisition rate has increased by thirty-five percent.",
    "Let's discuss the key metrics that drove this success.",
    "First, our marketing campaigns showed excellent ROI.",
    "Second, the product improvements resonated well with users.",
    "I think we should focus on scaling these initiatives.",
    "What are your thoughts on the budget allocation?",
    "We need to consider both short-term and long-term strategies.",
    "The competitive landscape is evolving rapidly.",
    "Our next milestone is launching in the European market.",
    "This will require careful planning and execution.",
    "Let's schedule a follow-up meeting to dive deeper.",
    "Thank you for your attention and valuable insights."
  ];

  constructor() {
    // Simulate connection delay
    setTimeout(() => {
      this.isConnected = true;
      this.emit({ type: 'connected', timestamp: new Date() });
    }, 1000);
  }

  /**
   * Subscribe to transcription events
   */
  onEvent(callback: (event: MockTranscriptEvent) => void): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Emit event to all subscribers
   */
  private emit(event: MockTranscriptEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in mock event callback:', error);
      }
    });
  }

  /**
   * Mock connect (instant)
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    // Simulate connection time
    await new Promise(resolve => setTimeout(resolve, 500));
    this.isConnected = true;
    this.emit({ type: 'connected', timestamp: new Date() });
  }

  /**
   * Start mock recording
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    if (!this.isConnected) {
      await this.connect();
    }

    this.isRecording = true;
    this.currentTranscriptIndex = 0;
    
    // Start generating mock transcript
    this.startMockTranscription();
    
    console.log('Started mock recording');
  }

  /**
   * Start generating mock transcript segments
   */
  private startMockTranscription(): void {
    const generateSegment = () => {
      if (!this.isRecording || this.currentTranscriptIndex >= this.demoSegments.length) {
        return;
      }

      const segment = this.demoSegments[this.currentTranscriptIndex];
      this.currentTranscriptIndex++;

      this.emit({
        type: 'transcript',
        text: segment,
        confidence: 0.85 + Math.random() * 0.14, // 85-99% confidence
        timestamp: new Date()
      });

      // Schedule next segment with random delay (2-6 seconds)
      const delay = 2000 + Math.random() * 4000;
      this.transcriptInterval = setTimeout(generateSegment, delay);
    };

    // Start first segment after short delay
    this.transcriptInterval = setTimeout(generateSegment, 1000);
  }

  /**
   * Stop mock recording
   */
  stopRecording(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    if (this.transcriptInterval) {
      clearTimeout(this.transcriptInterval);
      this.transcriptInterval = null;
    }

    console.log('Stopped mock recording');
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.stopRecording();
    this.isConnected = false;
    this.emit({ type: 'disconnected', timestamp: new Date() });
  }

  /**
   * Get status
   */
  getStatus(): { connected: boolean; recording: boolean } {
    return {
      connected: this.isConnected,
      recording: this.isRecording
    };
  }
}

/**
 * Hook for using mock transcription
 */
export function useMockTranscription() {
  const [service] = React.useState(() => new MockTranscriptionService());
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
            setTranscript(prev => prev ? prev + ' ' + event.text! : event.text!);
          }
          break;
          
        case 'error':
          setError(event.error || 'Mock error');
          break;
      }
    });

    return () => {
      unsubscribe();
      service.disconnect();
    };
  }, [service]);

  const startRecording = React.useCallback(async () => {
    try {
      await service.startRecording();
      setIsRecording(true);
      setTranscript('');
    } catch (error) {
      console.error('Failed to start mock recording:', error);
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
    startRecording,
    stopRecording,
    service
  };
} 