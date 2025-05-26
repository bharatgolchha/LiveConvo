import React from 'react';
import { useWebRTCTranscription } from './webrtcTranscription';

/**
 * Unified transcription hook using WebRTC for browser compatibility
 */
export function useTranscription() {
  // Use WebRTC-based transcription for proper browser support
  const webrtcTranscription = useWebRTCTranscription();

  return {
    ...webrtcTranscription,
    isMockMode: false
  };
}

 