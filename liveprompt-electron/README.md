# LivePrompt Desktop Recorder

An Electron application that uses the Recall.ai Desktop Recording SDK to record and transcribe Zoom and Google Meet calls locally.

## Features

- **Automatic Meeting Detection**: Detects Zoom and Google Meet windows automatically
- **Real-time Transcription**: Live transcription using Deepgram or AssemblyAI
- **Desktop Audio Recording**: Record all desktop audio for in-person meetings
- **Seamless Integration**: Works with your LivePrompt.ai web app
- **Secure**: All recordings are processed locally before upload

## Prerequisites

- Node.js 18+ installed
- macOS (Apple Silicon) - Currently the only supported platform
- Recall.ai API key with Desktop SDK access
- LivePrompt.ai account

## Setup

1. **Clone and Install Dependencies**
   ```bash
   cd liveprompt-electron
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   - `RECALL_AI_API_KEY`: Your Recall.ai API key
   - `RECALL_AI_API_URL`: Recall.ai API URL (default: https://us-east-1.recall.ai)
   - `BACKEND_URL`: Your LivePrompt web app URL (default: http://localhost:3000)
   - `USER_AUTH_TOKEN`: Authentication token from your LivePrompt account

3. **Grant Permissions**
   
   The app will request the following permissions on first launch:
   - **Accessibility**: To detect meeting windows
   - **Screen Recording**: To capture video
   - **Microphone**: To capture audio

## Running the App

### Development Mode
```bash
npm start
```

### Building for Distribution

**macOS:**
```bash
npm run dist:mac
```

**Windows:**
```bash
npm run dist:win
```

**All Platforms:**
```bash
npm run dist
```

Built applications will be in the `dist/` directory.

## Usage

1. **Start the App**: Launch LivePrompt Desktop Recorder

2. **Grant Permissions**: Click "Grant" for each required permission

3. **Recording a Meeting**:
   - Start a Zoom or Google Meet call
   - The app will automatically detect the meeting
   - Enter a session ID from your LivePrompt web app
   - Click "Start Recording"

4. **Desktop Audio Recording**:
   - Use this for in-person meetings or unsupported platforms
   - Enter a session ID
   - Click "Start Desktop Recording"

5. **View Transcripts**: Real-time transcripts appear in the app

6. **Stop Recording**: Click "Stop Recording" when done

## Integration with LivePrompt Web App

### Getting a Session ID

1. Log into your LivePrompt.ai account
2. Create a new session or use an existing one
3. Copy the session ID from the URL or session details
4. Paste it into the Desktop Recorder

### Deep Linking

Open the desktop app from your web app:
```javascript
window.open('liveprompt-desktop://start-recording?sessionId=YOUR_SESSION_ID');
```

### Authentication Token

To get your authentication token:

1. Open LivePrompt.ai in your browser
2. Open Developer Tools (F12)
3. Go to Application/Storage > Local Storage
4. Find your authentication token
5. Add it to your `.env` file

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   LivePrompt    │────▶│  LivePrompt API  │────▶│   Recall.ai     │
│   Web App       │     │  (Next.js)       │     │   API Server    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         ▲                       ▲
         │                       │ API Calls
         │   Deep Links          │
         └───────────────────────┤
                                │
                    ┌───────────────────┐
                    │  Desktop Recorder  │
                    │  (This Electron    │
                    │   Application)     │
                    └───────────────────┘
                                │
                    ┌───────────────────┐
                    │ Zoom/Google Meet  │
                    │ (Native Apps)     │
                    └───────────────────┘
```

## Troubleshooting

### Meeting Not Detected
- Ensure Accessibility permission is granted
- Restart the app after granting permissions
- Make sure Zoom/Google Meet window is visible

### No Audio Recording
- Check Microphone permission in System Preferences
- Verify audio input device is working

### Upload Failures
- Check your Recall.ai API key
- Verify network connectivity
- Ensure you have sufficient API credits

### Permission Issues on macOS
1. Open System Preferences > Security & Privacy
2. Grant permissions for:
   - Accessibility
   - Screen Recording
   - Microphone
3. Restart the app

## Security

- API keys are stored locally in `.env`
- All recordings are processed locally before upload
- Transcripts are sent securely to your backend
- No data is stored permanently on the desktop

## Development

### Project Structure
```
liveprompt-electron/
├── main.js           # Main process
├── preload.js        # Preload script
├── renderer.js       # Renderer process
├── index.html        # UI
├── styles.css        # Styles
├── package.json      # Dependencies
└── .env             # Configuration
```

### Key Technologies
- Electron 27+
- Recall.ai Desktop SDK
- Node.js native modules

## Support

For issues or questions:
- LivePrompt support: support@liveprompt.ai
- Recall.ai documentation: https://docs.recall.ai

## License

MIT License - See LICENSE file for details