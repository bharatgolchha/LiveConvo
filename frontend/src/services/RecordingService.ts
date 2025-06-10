import { Session } from '@supabase/supabase-js';
import { BaseService } from './BaseService';

export interface RecordingPermission {
  granted: boolean;
  error?: string;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export class RecordingService extends BaseService {
  private mediaStream: MediaStream | null = null;
  private systemAudioStream: MediaStream | null = null;

  async checkMicrophonePermission(): Promise<RecordingPermission> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the stream after checking permission
      stream.getTracks().forEach(track => track.stop());
      return { granted: true };
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return { 
        granted: false, 
        error: error instanceof Error ? error.message : 'Permission denied' 
      };
    }
  }

  async getMicrophoneStream(): Promise<MediaStream> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      return this.mediaStream;
    } catch (error) {
      console.error('Failed to get microphone stream:', error);
      throw new Error(`Failed to access microphone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSystemAudioStream(): Promise<MediaStream | null> {
    if (!navigator.mediaDevices || !('getDisplayMedia' in navigator.mediaDevices)) {
      console.warn('System audio capture not supported');
      return null;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
        audio: true, 
        video: true 
      });
      
      // Extract only audio tracks
      this.systemAudioStream = new MediaStream(displayStream.getAudioTracks());
      
      // Stop video tracks immediately
      displayStream.getVideoTracks().forEach(track => track.stop());
      
      return this.systemAudioStream;
    } catch (error) {
      console.warn('System audio capture failed:', error);
      return null;
    }
  }

  async stopAllStreams(): Promise<void> {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.systemAudioStream) {
      this.systemAudioStream.getTracks().forEach(track => track.stop());
      this.systemAudioStream = null;
    }
  }

  async getAudioDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)})`,
          kind: device.kind as 'audioinput' | 'audiooutput'
        }));
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
      return [];
    }
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  getSystemAudioStream(): MediaStream | null {
    return this.systemAudioStream;
  }
}