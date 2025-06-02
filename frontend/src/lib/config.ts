/**
 * Configuration settings for liveprompt.ai
 */

export const config = {
  // App Configuration
  app: {
    name: 'liveprompt.ai',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    apiUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  },

  // OpenAI API Configuration (server-side only)
  openai: {
    // Default STT model for real-time transcription
    realtimeModel: 'gpt-4o-mini-transcribe',
    realtimeEndpoint: 'wss://api.openai.com/v1/realtime'
  },

  // Feature flags
  features: {
    realtimeTranscription: true,
    voiceActivityDetection: true
  },

  // Audio settings
  audio: {
    sampleRate: 24000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

/**
 * Validate configuration
 */
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation - can be extended as needed
  if (!config.app.name) {
    errors.push('App name is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 