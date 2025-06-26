# Desktop Recording Setup Guide

This guide explains how to set up and test the Recall.ai Desktop Recording SDK integration with liveprompt.ai.

**⚠️ Important: The Desktop Recording SDK requires an Electron application and cannot run directly in a web browser.**

## Prerequisites

1. **Recall.ai API Key**: You need a valid Recall.ai API key with Desktop SDK access.
2. **Node.js 18+**: Required for the application to run.
3. **macOS (Apple Silicon)**: The Desktop SDK currently supports Apple Silicon Macs.

## Setup Steps

### 1. Environment Configuration

Add the following environment variables to your `.env.local` file:

```bash
# Recall.ai Configuration
RECALL_AI_API_KEY=your_recall_ai_api_key_here
RECALL_AI_API_URL=https://us-east-1.recall.ai

# Optional: Set your Recall.ai region if different
# RECALL_AI_API_URL=https://eu-west-1.recall.ai
```

### 2. Install Dependencies

The Desktop Recording SDK has already been added to the project. Run:

```bash
cd frontend
npm install
```

### 3. Database Migration

The necessary database schema changes have been applied. The sessions table now supports:
- `recording_type`: 'local' | 'meeting' | 'desktop'
- `recall_sdk_upload_id`: Stores the SDK upload ID for desktop recordings

## Understanding the Architecture

The Desktop Recording SDK works differently from browser-based solutions:

1. **Browser App (liveprompt.ai)**: Your main web application
2. **Electron App**: A separate desktop application that runs the SDK
3. **Communication**: The Electron app communicates with your web app via APIs

## Building an Electron App

### 1. Clone the Sample App

```bash
git clone https://github.com/recallai/desktop-sdk-webpack-sample
cd desktop-sdk-webpack-sample
npm install
```

### 2. Configure the Electron App

Add your API credentials to `.env`:
```bash
RECALL_API_KEY=your_recall_ai_api_key_here
RECALL_API_URL=https://us-east-1.recall.ai
BACKEND_URL=http://localhost:3000  # Your liveprompt.ai URL
```

### 3. Run the Electron App

```bash
npm start
```

### 3. Grant Permissions

The Desktop SDK requires the following permissions:
- **Accessibility**: To detect meeting windows
- **Screen Capture**: To record video
- **Microphone**: To record audio

Grant each permission when prompted.

### 4. Test Recording

#### Option A: Record a Meeting
1. Start a Zoom or Google Meet call
2. The SDK will automatically detect the meeting
3. Click "Record" on the detected meeting
4. The recording will start capturing audio and video

#### Option B: Record Desktop Audio
1. Click "Start Desktop Recording" 
2. This will record all audio from your desktop
3. Useful for in-person meetings or unsupported platforms

### 5. View Results

- **Live Transcript**: Appears in real-time during recording
- **Upload Progress**: Shows when recording ends
- **Session Summary**: Available after recording completes

## Integration Points

### Key Components

1. **Desktop Recording Module** (`/lib/recall-ai/desktop-recording.ts`)
   - Main SDK wrapper class
   - Handles initialization and event management

2. **Desktop Recording Component** (`/components/session/DesktopRecordingCapture.tsx`)
   - UI for recording controls
   - Permission management
   - Meeting detection display

3. **API Route** (`/api/recall/desktop-upload/route.ts`)
   - Creates SDK uploads with Recall.ai
   - Manages authentication and session tracking

### Using in Your Application

```typescript
import { DesktopRecordingClient } from '@/lib/recall-ai/desktop-recording';

// Initialize the client
const client = new DesktopRecordingClient({
  apiUrl: process.env.NEXT_PUBLIC_RECALL_AI_API_URL,
  sessionId: 'your-session-id',
  transcriptProvider: 'deepgram_streaming', // or 'assembly_ai_streaming'
});

// Set up event handlers
client.setEventHandlers({
  onMeetingDetected: (window) => {
    console.log('Meeting detected:', window);
  },
  onTranscriptReceived: (transcript) => {
    console.log('Transcript:', transcript);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
});

// Initialize and start recording
await client.initialize();
await client.startRecording(windowId, sessionId);
```

## Troubleshooting

### Common Issues

1. **"Permission Denied" Errors**
   - Ensure all permissions are granted in System Preferences
   - Restart the application after granting permissions

2. **Meeting Not Detected**
   - Make sure Zoom/Google Meet is running
   - Try refreshing the page
   - Check that accessibility permission is granted

3. **No Audio Recording**
   - Verify microphone permission is granted
   - Check audio input settings in System Preferences

4. **Upload Failures**
   - Verify your Recall.ai API key is valid
   - Check network connectivity
   - Ensure you have sufficient Recall.ai credits

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('DEBUG_DESKTOP_RECORDING', 'true');
```

## Security Considerations

1. **API Keys**: Never expose Recall.ai API keys to the client
2. **Permissions**: Always request user consent before recording
3. **Data Privacy**: Ensure compliance with recording laws in your jurisdiction
4. **Session Security**: Validate session ownership on all API calls

## Next Steps

1. **Production Build**: Test with production build before deployment
2. **Error Handling**: Implement comprehensive error handling
3. **User Onboarding**: Create user-friendly permission request flow
4. **Analytics**: Track recording success rates and errors
5. **Compliance**: Add recording consent UI and storage

## Resources

- [Recall.ai Desktop SDK Documentation](https://docs.recall.ai/docs/desktop-recording-sdk)
- [Recall.ai API Reference](https://docs.recall.ai/reference)
- [Sample Electron Apps](https://github.com/recallai/desktop-sdk-samples)