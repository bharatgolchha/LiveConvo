import React from 'react';
import { useWebRTCTranscription } from './webrtcTranscription';
import { useDeepgramTranscription } from './deepgramTranscription';

/**
 * Unified transcription hook with provider selection
 */
export function useTranscription(provider: 'openai' | 'deepgram' = 'deepgram') {
  // Use provider-specific transcription service
  const openaiTranscription = useWebRTCTranscription();
  const deepgramTranscription = useDeepgramTranscription();

  if (provider === 'deepgram') {
    return {
      ...deepgramTranscription,
      isMockMode: false,
      provider: 'deepgram' as const
    };
  } else {
    return {
      ...openaiTranscription,
      isMockMode: false,
      provider: 'openai' as const
    };
  }
}

 