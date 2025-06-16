import React from 'react';
import { useWebRTCTranscription } from './webrtcTranscription';
import { useDeepgramTranscription } from './deepgramTranscription';

/**
 * Unified transcription hook with provider selection
 */
export function useTranscription(provider: 'openai' | 'deepgram' = 'deepgram') {
  // Use provider-specific transcription service
  const openaiTranscription = useWebRTCTranscription(provider === 'openai');
  const deepgramTranscription = useDeepgramTranscription(provider === 'deepgram');

  return provider === 'deepgram'
    ? { ...deepgramTranscription, isMockMode: false, provider: 'deepgram' as const }
    : { ...openaiTranscription, isMockMode: false, provider: 'openai' as const };
}

 