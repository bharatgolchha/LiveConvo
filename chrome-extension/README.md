# LivePrompt AI Advisor Chrome Extension

A Chrome extension that brings AI-powered conversation coaching directly to your browser. Get real-time guidance during meetings, calls, and conversations.

## Features

- 🎙️ **Real-time Recording**: Capture audio from browser tabs or microphone
- 🤖 **AI-Powered Guidance**: Get contextual suggestions during conversations
- 💬 **Interactive Chat**: Ask questions and get instant AI responses
- 📝 **Live Transcription**: See real-time transcripts of your conversations
- 🔐 **Secure Authentication**: Integrates with your liveprompt.ai account
- 🎯 **Smart Detection**: Automatically detects meeting platforms

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Chrome browser (for testing)
- liveprompt.ai account

### Installation

1. Clone the repository and navigate to the extension directory:
```bash
cd chrome-extension
npm install
```

2. Build the extension:
```bash
npm run build
```

3. For development with hot reload:
```bash
npm run dev
```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chrome-extension/dist` directory

## Project Structure

```
chrome-extension/
├── src/
│   ├── background/          # Service worker
│   ├── popup/              # Extension popup UI
│   ├── sidebar/            # Main AI advisor interface
│   ├── content/            # Content scripts
│   ├── components/         # React components
│   │   ├── auth/          # Authentication
│   │   ├── recording/     # Recording controls
│   │   └── guidance/      # AI guidance UI
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Utilities
├── public/                 # Static assets
└── dist/                   # Built extension
```

## Architecture

### Key Components

1. **Service Worker** (`background/service-worker.ts`)
   - Manages extension state
   - Handles authentication
   - Controls recording sessions
   - Communicates with liveprompt.ai API

2. **Popup** (`popup/popup.tsx`)
   - Quick access controls
   - Recording start/stop
   - Session management

3. **Sidebar** (`sidebar/sidebar.tsx`)
   - Main AI advisor interface
   - Real-time guidance display
   - Chat interaction
   - Live transcript view

4. **Content Scripts** (`content/inject.ts`)
   - Injected into meeting platforms
   - Detects meeting state
   - Handles audio capture

## API Integration

The extension communicates with the liveprompt.ai backend:

- **Authentication**: `/api/auth/login`
- **Sessions**: `/api/sessions`
- **Guidance**: `/api/guidance`
- **Chat**: `/api/chat-guidance`
- **Transcripts**: `/api/sessions/{id}/transcript`

## Building for Production

1. Create production build:
```bash
npm run build
```

2. The built extension will be in the `dist` directory

3. To package for Chrome Web Store:
   - Zip the contents of the `dist` directory
   - Upload to Chrome Web Store Developer Dashboard

## Testing

Run tests:
```bash
npm test
```

Lint code:
```bash
npm run lint
```

Type check:
```bash
npm run type-check
```

## Security Considerations

- API keys are stored securely in Chrome's storage API
- All API calls use HTTPS
- OAuth tokens are refreshed automatically
- Content scripts have minimal permissions

## Troubleshooting

### Extension not loading
- Ensure you're in developer mode
- Check the console for errors
- Verify the manifest.json is valid

### Recording not working
- Check microphone/tab permissions
- Ensure you're on a supported platform
- Verify API connection

### Authentication issues
- Clear extension storage
- Re-authenticate
- Check network connectivity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

Proprietary - LivePrompt AI

## Support

For support, visit [liveprompt.ai/help](https://liveprompt.ai/help) or contact support@liveprompt.ai