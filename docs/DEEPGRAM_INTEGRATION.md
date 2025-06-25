# Deepgram Integration Guide

## Overview

LiveConvo now supports **Deepgram's streaming transcription API** as the default transcription provider, offering superior performance and accuracy for real-time conversation transcription.

## Why Deepgram?

### Performance Benefits
- **Ultra-low latency**: Sub-300ms streaming transcription
- **High accuracy**: Specialized models for conversation audio
- **Real-time processing**: True streaming with interim results
- **Smart formatting**: Automatic punctuation and capitalization
- **Voice Activity Detection**: Intelligent silence detection

### Technical Advantages
- **WebSocket streaming**: Efficient real-time communication
- **Nova-3 model**: Latest generation accuracy improvements with enhanced conversation understanding
- **Interim results**: See transcription as you speak
- **Audio preprocessing**: Optimized for conversation scenarios

## Configuration

### API Key Setup
1. Sign up at [Deepgram Console](https://console.deepgram.com/)
2. Create a new project and generate an API key
3. Add to your `.env.local` file:
   ```bash
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   ```

### Provider Selection
Deepgram is set as the default provider. To use OpenAI instead:
```typescript
// In your component
const transcription = useTranscription('openai'); // Use OpenAI
const transcription = useTranscription('deepgram'); // Use Deepgram (default)
const transcription = useTranscription(); // Uses Deepgram by default
```

## Implementation Details

### Service Architecture
```typescript
// Core service class
class DeepgramTranscriptionService {
  // WebSocket connection management
  connect(): Promise<void>
  disconnect(): Promise<void>
  
  // Audio recording lifecycle
  startRecording(): Promise<void>
  stopRecording(): void
  
  // Event system
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
}
```

### Audio Processing
- **Sample Rate**: 16kHz (optimal for speech)
- **Encoding**: Linear16 PCM
- **Channels**: Mono (single channel)
- **Chunk Size**: 4096 samples for smooth streaming

### Event System
```typescript
// Available events
service.on('connect', () => console.log('Connected to Deepgram'));
service.on('disconnect', () => console.log('Disconnected'));
service.on('transcript', (data) => console.log('New transcript:', data));
service.on('error', (error) => console.error('Error:', error));
```

## React Hook Usage

### Basic Usage
```typescript
import { useDeepgramTranscription } from '@/lib/deepgramTranscription';

function MyComponent() {
  const {
    transcript,
    isConnected,
    isRecording,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording
  } = useDeepgramTranscription();

  return (
    <div>
      <button onClick={connect}>Connect</button>
      <button onClick={startRecording} disabled={!isConnected}>
        Start Recording
      </button>
      <p>{transcript}</p>
    </div>
  );
}
```

### Unified Hook
```typescript
import { useTranscription } from '@/lib/useTranscription';

function MyComponent() {
  // Uses Deepgram by default
  const { transcript, isRecording, startRecording } = useTranscription();
  
  // Or explicitly specify provider
  const deepgram = useTranscription('deepgram');
  const openai = useTranscription('openai');
}
```

## Configuration Options

### Deepgram Model Settings
```typescript
const config = {
  model: 'nova-3',           // Latest accuracy model with enhanced conversation understanding
  language: 'en-US',         // Language code
  smart_format: true,        // Auto punctuation/capitalization
  interim_results: true,     // Real-time partial results
  vad_events: true,          // Voice activity detection
  encoding: 'linear16',      // Audio encoding
  sample_rate: 16000,        // Sample rate in Hz
  channels: 1                // Mono audio
};
```

### Audio Context Settings
```typescript
const audioConfig = {
  sampleRate: 16000,         // Match Deepgram requirements
  channelCount: 1,           // Mono recording
  echoCancellation: true,    // Noise reduction
  noiseSuppression: true,    // Background noise filtering
  autoGainControl: true      // Volume normalization
};
```

## Testing

### Unit Tests
The integration includes comprehensive unit tests covering:
- Service initialization and configuration
- WebSocket connection management
- Audio recording lifecycle
- Event system functionality
- Error handling scenarios
- Transcript processing

### Running Tests
```bash
cd frontend
npm test -- deepgramTranscription.test.ts
```

### Test Coverage
- **23 test cases** covering all functionality
- **Constructor and configuration** testing
- **Event system** validation
- **Connection management** scenarios
- **Transcript handling** edge cases
- **Error handling** robustness
- **Audio recording** lifecycle
- **Disconnection** cleanup

## Comparison: Deepgram vs OpenAI

| Feature | Deepgram | OpenAI Realtime |
|---------|----------|-----------------|
| **Latency** | <300ms | ~500ms |
| **Accuracy** | Conversation-optimized | General purpose |
| **Streaming** | True streaming | Chunked streaming |
| **Interim Results** | ✅ Real-time | ✅ Available |
| **Voice Activity Detection** | ✅ Built-in | ✅ Available |
| **Smart Formatting** | ✅ Automatic | ⚠️ Basic |
| **Cost** | Competitive | Higher for transcription |
| **Setup Complexity** | Simple | Moderate |

## Migration from OpenAI

### Automatic Migration
No code changes required! The unified `useTranscription()` hook automatically uses Deepgram as the default provider.

### Manual Provider Selection
```typescript
// Before (OpenAI only)
const transcription = useWebRTCTranscription();

// After (provider choice)
const transcription = useTranscription('deepgram'); // Recommended
const transcription = useTranscription('openai');   // Fallback
```

### Environment Variables
```bash
# Add Deepgram key (recommended)
DEEPGRAM_API_KEY=your_deepgram_key

# Keep OpenAI key for guidance system
OPENAI_API_KEY=your_openai_key
```

## Troubleshooting

### Common Issues

#### Connection Errors
```typescript
// Check API key configuration
if (!process.env.DEEPGRAM_API_KEY) {
  console.error('Deepgram API key not configured');
}
```

#### Audio Permission Denied
```typescript
// Handle microphone access gracefully
service.on('error', (error) => {
  if (error.message.includes('Permission denied')) {
    // Show user-friendly message about microphone access
  }
});
```

#### WebSocket Connection Failed
```typescript
// Implement retry logic
const retryConnection = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await service.connect();
      break;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Debug Mode
Enable detailed logging:
```typescript
// Set debug flag for verbose logging
const service = new DeepgramTranscriptionService({
  debug: true // Enables console logging
});
```

## Performance Optimization

### Audio Buffer Management
- **Chunk size**: 4096 samples for optimal streaming
- **Buffer management**: Automatic cleanup to prevent memory leaks
- **Sample rate conversion**: Efficient Float32 to Int16 conversion

### Connection Pooling
- **Single connection**: Reuse WebSocket connections when possible
- **Graceful cleanup**: Proper resource disposal on disconnect
- **Error recovery**: Automatic reconnection on connection loss

## Security Considerations

### API Key Protection
- Store Deepgram API key in server-side environment variables
- Never expose API keys in client-side code
- Use secure API proxy endpoints when needed

### Audio Data Privacy
- Audio streams directly to Deepgram (not stored locally)
- Transcripts can be processed client-side
- Follow your organization's data retention policies

## Support and Resources

### Documentation
- [Deepgram API Documentation](https://developers.deepgram.com/)
- [Streaming API Guide](https://developers.deepgram.com/docs/streaming)
- [Model Documentation](https://developers.deepgram.com/docs/models)

### Community
- [Deepgram Discord](https://discord.gg/deepgram)
- [GitHub Issues](https://github.com/deepgram/deepgram-js-sdk/issues)
- [Developer Forum](https://community.deepgram.com/)

---

**Integration completed**: January 27, 2025  
**Default provider**: Deepgram Nova-3  
**Fallback provider**: OpenAI Realtime API  
**Test coverage**: 23 unit tests passing 