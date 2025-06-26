/**
 * Desktop Recording SDK Integration
 * 
 * IMPORTANT: This module is designed for use in an Electron application only.
 * The Recall.ai Desktop SDK cannot run in web browsers due to its requirement
 * for native system access (child_process, file system, etc.).
 * 
 * To use this SDK:
 * 1. Build a separate Electron application
 * 2. Import this module in your Electron app
 * 3. Communicate with your web app via APIs
 * 
 * For browser-based recording, use:
 * - Recall.ai Meeting Bots (recommended)
 * - WebRTC local recording
 */

// This import will only work in Electron environments
// import RecallAiSdk from '@recallai/desktop-sdk';

export interface DesktopRecordingWindow {
  id: string;
  title?: string;
  url?: string;
  platform?: string;
}

export interface DesktopRecordingConfig {
  apiUrl: string;
  sessionId: string;
  transcriptProvider?: 'assembly_ai_streaming' | 'deepgram_streaming';
}

export interface DesktopRecordingEvents {
  onMeetingDetected?: (window: DesktopRecordingWindow) => void;
  onRecordingStarted?: (window: DesktopRecordingWindow) => void;
  onRecordingEnded?: (window: DesktopRecordingWindow) => void;
  onTranscriptReceived?: (transcript: any) => void;
  onError?: (error: { type: string; message: string; windowId?: string }) => void;
  onUploadProgress?: (progress: number, windowId: string) => void;
  onPermissionStatus?: (permission: string, granted: boolean) => void;
}

export class DesktopRecordingClient {
  private initialized = false;
  private activeRecordings = new Map<string, { uploadToken: string; sessionId: string }>();
  private eventHandlers: DesktopRecordingEvents = {};

  constructor(private config: DesktopRecordingConfig) {
    // Check if running in Electron
    if (typeof window !== 'undefined' && !window.process?.type) {
      throw new Error(
        'DesktopRecordingClient can only be used in an Electron environment. ' +
        'For browser-based recording, use Recall.ai Meeting Bots or WebRTC local recording.'
      );
    }
  }

  async initialize(): Promise<void> {
    throw new Error('Desktop SDK requires Electron. This method is a placeholder for Electron implementation.');
  }

  setEventHandlers(handlers: DesktopRecordingEvents): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  private setupEventListeners(): void {
    RecallAiSdk.addEventListener('permissions-granted', () => {
      console.log('All permissions granted for desktop recording');
    });

    RecallAiSdk.addEventListener('meeting-detected', (evt) => {
      console.log('Meeting detected:', evt.window);
      this.eventHandlers.onMeetingDetected?.(evt.window);
    });

    RecallAiSdk.addEventListener('recording-started', (evt) => {
      console.log('Recording started:', evt.window);
      this.eventHandlers.onRecordingStarted?.(evt.window);
    });

    RecallAiSdk.addEventListener('recording-ended', (evt) => {
      console.log('Recording ended:', evt.window);
      this.eventHandlers.onRecordingEnded?.(evt.window);
      
      // Automatically start upload when recording ends
      this.uploadRecording(evt.window.id);
    });

    RecallAiSdk.addEventListener('realtime-event', (evt) => {
      if (evt.type === 'transcript' && this.eventHandlers.onTranscriptReceived) {
        this.eventHandlers.onTranscriptReceived(evt);
      }
    });

    RecallAiSdk.addEventListener('upload-progress', (evt) => {
      console.log(`Upload progress: ${evt.progress}%`);
      this.eventHandlers.onUploadProgress?.(evt.progress, evt.window.id);
    });

    RecallAiSdk.addEventListener('error', (evt) => {
      console.error('Desktop SDK error:', evt);
      this.eventHandlers.onError?.(evt);
    });

    RecallAiSdk.addEventListener('permission-status', (evt) => {
      console.log(`Permission ${evt.permission}: ${evt.granted ? 'granted' : 'denied'}`);
      this.eventHandlers.onPermissionStatus?.(evt.permission, evt.granted);
    });
  }

  async createSDKUpload(sessionId: string): Promise<string> {
    try {
      const response = await fetch('/api/recall/desktop-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          transcriptProvider: this.config.transcriptProvider || 'deepgram_streaming',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create SDK upload: ${response.statusText}`);
      }

      const { upload_token } = await response.json();
      return upload_token;
    } catch (error) {
      console.error('Error creating SDK upload:', error);
      throw error;
    }
  }

  async startRecording(windowId: string, sessionId?: string): Promise<void> {
    try {
      const actualSessionId = sessionId || this.config.sessionId;
      const uploadToken = await this.createSDKUpload(actualSessionId);
      
      this.activeRecordings.set(windowId, { uploadToken, sessionId: actualSessionId });
      
      await RecallAiSdk.startRecording({
        windowId,
        uploadToken,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(windowId: string): Promise<void> {
    try {
      await RecallAiSdk.stopRecording({ windowId });
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  async pauseRecording(windowId: string): Promise<void> {
    try {
      await RecallAiSdk.pauseRecording({ windowId });
    } catch (error) {
      console.error('Error pausing recording:', error);
      throw error;
    }
  }

  async resumeRecording(windowId: string): Promise<void> {
    try {
      await RecallAiSdk.resumeRecording({ windowId });
    } catch (error) {
      console.error('Error resuming recording:', error);
      throw error;
    }
  }

  async uploadRecording(windowId: string): Promise<void> {
    try {
      await RecallAiSdk.uploadRecording({ windowId });
      
      // Clean up active recording
      this.activeRecordings.delete(windowId);
    } catch (error) {
      console.error('Error uploading recording:', error);
      throw error;
    }
  }

  async prepareDesktopAudioRecording(sessionId?: string): Promise<string> {
    try {
      const actualSessionId = sessionId || this.config.sessionId;
      const uploadToken = await this.createSDKUpload(actualSessionId);
      const windowId = await RecallAiSdk.prepareDesktopAudioRecording();
      
      this.activeRecordings.set(windowId, { uploadToken, sessionId: actualSessionId });
      
      await RecallAiSdk.startRecording({
        windowId,
        uploadToken,
      });
      
      return windowId;
    } catch (error) {
      console.error('Error preparing desktop audio recording:', error);
      throw error;
    }
  }

  async requestPermission(permission: 'accessibility' | 'screen-capture' | 'microphone'): Promise<void> {
    try {
      await RecallAiSdk.requestPermission(permission);
    } catch (error) {
      console.error(`Error requesting ${permission} permission:`, error);
      throw error;
    }
  }

  shutdown(): void {
    RecallAiSdk.shutdown();
    this.initialized = false;
    this.activeRecordings.clear();
  }

  getActiveRecordings(): string[] {
    return Array.from(this.activeRecordings.keys());
  }

  isRecording(windowId: string): boolean {
    return this.activeRecordings.has(windowId);
  }
}