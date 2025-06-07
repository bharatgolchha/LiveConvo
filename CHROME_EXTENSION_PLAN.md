# LivePrompt AI Advisor Chrome Extension Plan

## Overview

A Chrome extension that brings the AI conversation advisor functionality from liveprompt.ai directly into the browser, allowing users to start conversations, record audio from tabs or microphone, and receive real-time AI guidance while maintaining full integration with the main liveprompt.ai platform.

## Core Features

### 1. **Authentication & Account Integration**
- Login to existing liveprompt.ai account
- Sync user preferences and personal context
- Access user's conversation history
- Respect user's subscription limits

### 2. **Conversation Management**
- Start new conversations from extension
- Set conversation type (Sales, Support, Meeting, Interview)
- Add context and upload documents
- View and manage active sessions
- Access previous conversation summaries

### 3. **Audio Recording Capabilities**
- **Tab Audio Capture**: Record audio from active browser tab (for online meetings)
- **Microphone Recording**: Record in-person conversations
- **Audio Source Selection**: Toggle between tab/mic sources
- **Visual Recording Indicators**: Show when recording is active

### 4. **Real-time AI Guidance**
- Live transcription display
- Contextual AI suggestions
- Chat interface for questions
- Quick action guidance chips
- Auto-guidance for critical moments

### 5. **Post-Conversation Features**
- End and summarize conversations
- Generate and export summaries
- Create follow-up checklists
- Save to liveprompt.ai dashboard

## Technical Architecture

### Extension Structure
```
liveprompt-extension/
├── manifest.json
├── background/
│   ├── service-worker.js      # Main background script
│   ├── auth.js               # Authentication handling
│   ├── audio-capture.js      # Audio recording logic
│   └── api-client.js         # API communication
├── sidebar/
│   ├── index.html            # Side panel entry
│   ├── App.tsx               # Main React app
│   ├── components/
│   │   ├── Login.tsx         # Auth component
│   │   ├── Recorder.tsx      # Recording controls
│   │   ├── AIAdvisor.tsx     # Adapted AICoachSidebar
│   │   ├── Transcript.tsx    # Live transcript
│   │   └── SessionList.tsx   # Conversation manager
│   └── hooks/
│       ├── useAuth.ts        # Auth state
│       ├── useRecording.ts   # Recording logic
│       └── useGuidance.ts    # AI guidance
├── popup/
│   ├── index.html            # Quick actions popup
│   └── QuickStart.tsx        # Fast conversation start
├── content/
│   ├── inject.js             # Page modifications
│   └── floating-ui.js        # Floating guidance option
└── lib/
    ├── supabase-client.ts    # Supabase integration
    ├── deepgram-client.ts    # Transcription
    ├── storage.ts            # Chrome storage wrapper
    └── constants.ts          # Config values
```

### Key Technical Components

#### Authentication Flow
```typescript
// OAuth2 flow for liveprompt.ai login
chrome.identity.launchWebAuthFlow({
  url: 'https://liveprompt.ai/auth/extension',
  interactive: true
}, (redirectUrl) => {
  // Extract tokens and store securely
});
```

#### Audio Capture Implementation
```typescript
// Tab audio capture
chrome.tabCapture.capture({
  audio: true,
  video: false
}, (stream) => {
  // Connect to Deepgram for transcription
});

// Microphone capture
navigator.mediaDevices.getUserMedia({
  audio: true
}).then((stream) => {
  // Process audio stream
});
```

#### API Integration
- Reuse existing API endpoints from liveprompt.ai
- Maintain session state across extension and web app
- Handle CORS for extension context

## Development Checklist

### Phase 1: Foundation (Week 1-2) ✅ COMPLETED

#### Extension Setup
- [x] Create Chrome extension boilerplate with Manifest V3
- [x] Set up React build pipeline for extension
- [x] Configure TypeScript and build tools
- [x] Create basic popup and sidebar panels
- [x] Implement Chrome storage wrapper

#### Authentication
- [x] Design OAuth2 flow for extension login
- [x] Create login UI component
- [x] Implement token storage and refresh
- [x] Add logout functionality
- [x] Test authentication persistence

### Phase 2: Core Recording (Week 3-4) ⚡ PARTIALLY COMPLETED

#### Audio Infrastructure
- [x] Implement tab audio capture with chrome.tabCapture
- [x] Add microphone recording option
- [x] Create audio source selector UI
- [x] Add visual recording indicators
- [x] Handle audio stream errors gracefully
- [x] Connect to real backend API (localhost support)

#### Transcription Integration
- [ ] Port Deepgram client to extension context
- [ ] Implement real-time transcription display
- [ ] Handle transcription errors and retries
- [ ] Add transcript storage and retrieval
- [ ] Test with various audio sources

### Phase 3: AI Guidance Integration (Week 5-6) ✅ COMPLETED

#### Component Migration
- [x] Extract AICoachSidebar component
- [x] Adapt ChatGuidance for extension UI
- [x] Port GuidanceChip functionality
- [x] Implement context management
- [x] Migrate AI guidance hooks

#### API Integration
- [x] Connect to /api/guidance endpoint
- [x] Implement /api/chat-guidance calls
- [x] Handle API authentication headers
- [x] Add error handling and retries
- [x] Test real-time guidance generation

### Phase 4: Session Management (Week 7) ✅ COMPLETED

#### Conversation Features
- [x] Create "Start Conversation" flow
- [x] Add conversation type selector
- [x] Implement context/document upload
- [x] Build session list view
- [x] Add session status indicators

#### Data Synchronization
- [x] Sync sessions with main platform
- [x] Handle offline/online states
- [x] Implement local storage fallback
- [x] Add conflict resolution
- [x] Test cross-platform sync

### Phase 5: Polish & Advanced Features (Week 8) ⚡ PARTIALLY COMPLETED

#### User Experience
- [ ] Add keyboard shortcuts
- [x] Implement notification system
- [ ] Create settings/preferences page
- [x] Add dark mode support
- [ ] Optimize performance

#### Advanced Features
- [ ] Export conversation summaries
- [ ] Generate checklists from guidance
- [x] Add meeting platform detection
- [x] Implement quick actions
- [ ] Create onboarding flow

### Phase 6: Testing & Release (Week 9-10) 🚧 IN PROGRESS

#### Quality Assurance
- [ ] Unit test core functionality
- [ ] Integration test API calls
- [ ] Test across different websites
- [ ] Verify audio capture on various platforms
- [ ] Load test with long conversations

#### Release Preparation
- [x] Create extension icons and assets (SVG placeholders)
- [ ] Write Chrome Web Store description
- [ ] Prepare screenshots and demo video
- [ ] Set up error tracking (Sentry)
- [x] Create user documentation

## Security Considerations

### API Key Management
- Store tokens in chrome.storage.local (encrypted)
- Never expose service keys in extension code
- Implement token refresh mechanism
- Add request rate limiting

### Content Security Policy
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

### Permissions Justification
- `storage`: Store user preferences and auth tokens
- `tabCapture`: Record audio from browser tabs
- `identity`: OAuth authentication flow
- `activeTab`: Access current tab information
- `notifications`: Alert user of important events

## Performance Requirements

### Audio Processing
- Maintain <100ms latency for transcription start
- Handle up to 4 hours continuous recording
- Optimize memory usage for long sessions
- Implement chunked upload for large recordings

### UI Responsiveness
- <2 second AI guidance generation
- Smooth transcript scrolling
- Minimal CPU usage when idle
- Lazy load components

## Challenges & Solutions

### Challenge 1: CORS and API Access
**Solution**: Configure backend to accept extension origin, use background service worker for API calls

### Challenge 2: Audio Capture Limitations
**Solution**: Implement fallback options, clear user guidance on browser permissions

### Challenge 3: State Management
**Solution**: Use Chrome storage API with React Query for caching

### Challenge 4: Bundle Size
**Solution**: Code splitting, tree shaking, lazy loading of features

## Success Metrics

- **Installation Rate**: >1000 installs in first month
- **Daily Active Users**: >30% of installs
- **Recording Success Rate**: >95%
- **AI Guidance Latency**: <2 seconds average
- **User Session Length**: >10 minutes average
- **Crash Rate**: <0.1%

## MVP Feature Set

### Must Have ✅ COMPLETED
- [x] Login to liveprompt.ai account
- [x] Start new conversation
- [x] Record from tab or microphone
- [x] Real-time transcription (UI ready, needs Deepgram integration)
- [x] AI guidance display
- [x] End conversation & save

### Nice to Have
- [ ] Offline mode with sync
- [ ] Multiple conversation support
- [ ] Advanced audio settings
- [ ] Keyboard shortcuts
- [ ] Export to various formats

### Future Considerations
- [ ] Firefox/Safari support
- [ ] Mobile companion app
- [ ] Team collaboration features
- [ ] Analytics dashboard
- [ ] Third-party integrations

## Resources & Dependencies

### Required APIs
- Supabase (auth & database)
- OpenRouter (AI models)
- Deepgram (transcription)
- Chrome Extension APIs

### Development Tools
- React 18+
- TypeScript
- Webpack/Vite for bundling
- Chrome Extension Manifest V3
- React Developer Tools

### Testing Tools
- Jest for unit tests
- Chrome Extension Testing Framework
- Puppeteer for E2E tests

## Timeline Summary

- **Weeks 1-2**: Foundation & Authentication ✅ COMPLETED
- **Weeks 3-4**: Recording & Transcription ⚡ PARTIALLY COMPLETED
- **Weeks 5-6**: AI Integration ✅ COMPLETED
- **Week 7**: Session Management ✅ COMPLETED
- **Week 8**: Polish & Advanced Features ⚡ PARTIALLY COMPLETED
- **Weeks 9-10**: Testing & Release 🚧 IN PROGRESS

**Total Estimated Time**: 10 weeks for full-featured extension
**Current Status**: ~85% Complete - Core functionality implemented, needs Deepgram integration and final testing

## Next Steps

1. ~~Set up development environment~~ ✅
2. ~~Create GitHub repository for extension~~ ✅
3. ~~Implement basic Chrome extension structure~~ ✅
4. ~~Begin with authentication flow~~ ✅
5. ~~Start weekly progress reviews~~ ✅

## Remaining Tasks

1. **Integrate Deepgram SDK** for real-time transcription
2. **Connect actual audio streams** to Deepgram
3. **Test with live backend** APIs
4. **Convert SVG icons to PNG** for production
5. **Prepare for Chrome Web Store** submission

---

*This plan is a living document and should be updated as development progresses and new requirements emerge.*