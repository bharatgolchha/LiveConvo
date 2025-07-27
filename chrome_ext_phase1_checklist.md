# Chrome Extension Phase 1 (MVP) Implementation Checklist

## Project Setup & Structure

### ✅ Extension Foundation
- [ ] Create Chrome extension project directory structure
  ```
  chrome-extension/
  ├── manifest.json
  ├── background/
  ├── content-scripts/
  ├── popup/
  ├── components/
  └── assets/
  ```

- [ ] Configure manifest.json (Manifest V3)
  ```json
  {
    "manifest_version": 3,
    "name": "LivePrompt AI Meeting Assistant",
    "version": "1.0.0",
    "description": "Real-time AI conversation coaching for your meetings",
    "permissions": ["storage", "activeTab"],
    "host_permissions": [
      "https://meet.google.com/*",
      "https://teams.microsoft.com/*",
      "https://*.zoom.us/*"
    ],
    "action": {
      "default_popup": "popup/popup.html",
      "default_icon": "assets/icons/icon-128.png"
    }
  }
  ```

- [ ] Create extension icons (16x16, 48x48, 128x128)
- [ ] Set up development environment with hot reload

## Core Components

### ✅ Authentication System
- [ ] Create authentication flow in popup
  - [ ] Login form UI
  - [ ] Store auth token in chrome.storage.local
  - [ ] Validate token on extension load
  - [ ] Handle token expiration/refresh

- [ ] Implement LivePrompt API client
  ```javascript
  // background/api-client.js
  class LivePromptAPI {
    constructor(token) { this.token = token; }
    async createSession(meetingData) { }
    async endSession(sessionId) { }
    async getActiveSessions() { }
  }
  ```

### ✅ Popup Interface (Meeting Dashboard)
- [ ] Create popup.html with basic layout
  ```html
  <!-- popup/popup.html -->
  <div class="popup-container">
    <header>LivePrompt</header>
    <div id="auth-section"></div>
    <div id="meetings-list"></div>
    <div id="active-session"></div>
  </div>
  ```

- [ ] Style popup with Tailwind CSS or custom styles
  - [ ] Width: 400px, Height: 600px
  - [ ] Clean, modern design matching LivePrompt brand

- [ ] Implement meetings list (manual entry for Phase 1)
  - [ ] "Add Meeting" button
  - [ ] Meeting form: title, platform, time, meeting URL
  - [ ] Store meetings in chrome.storage.sync
  - [ ] Display upcoming meetings sorted by time
  - [ ] "Join Meeting" button (opens meeting URL)
  - [ ] "Start LivePrompt" button for each meeting

- [ ] Show active session status
  - [ ] Session timer
  - [ ] "End Session" button
  - [ ] Link to LivePrompt dashboard

### ✅ Content Scripts for Video Platforms

#### Google Meet Integration
- [ ] Create meet-injector.js content script
  - [ ] Detect when user is on meet.google.com
  - [ ] Wait for meeting UI to load
  - [ ] Extract meeting ID from URL
  - [ ] Extract meeting title from DOM

- [ ] Inject floating widget into Meet interface
  ```javascript
  // content-scripts/meet-injector.js
  function injectFloatingWidget() {
    const widget = document.createElement('div');
    widget.id = 'liveprompt-widget';
    widget.className = 'liveprompt-fab';
    document.body.appendChild(widget);
  }
  ```

#### Microsoft Teams Integration
- [ ] Create teams-injector.js content script
  - [ ] Detect Teams meeting URLs
  - [ ] Handle Teams web app structure
  - [ ] Extract meeting context

- [ ] Inject floating widget into Teams interface

#### Zoom Integration
- [ ] Create zoom-injector.js content script
  - [ ] Detect Zoom web client
  - [ ] Extract meeting ID
  - [ ] Handle Zoom UI updates

- [ ] Inject floating widget into Zoom interface

### ✅ Floating Widget Component
- [ ] Create reusable floating action button (FAB)
  ```javascript
  // components/FloatingWidget.js
  class FloatingWidget {
    constructor() {
      this.isExpanded = false;
      this.isSessionActive = false;
    }
    
    render() {
      // Return HTML for FAB
      // Include LivePrompt logo
      // Show pulsing animation when active
    }
    
    toggleExpanded() { }
    startSession() { }
    stopSession() { }
  }
  ```

- [ ] FAB features:
  - [ ] Fixed position (bottom-right corner)
  - [ ] Draggable functionality
  - [ ] Expand on click to show options
  - [ ] Visual states: idle, active, loading

- [ ] Expanded menu options:
  - [ ] "Start LivePrompt Session" button
  - [ ] "Stop Session" button (when active)
  - [ ] "Open Dashboard" link
  - [ ] Session status indicator

### ✅ Background Service Worker
- [ ] Create service-worker.js
  ```javascript
  // background/service-worker.js
  chrome.runtime.onInstalled.addListener(() => {
    // Initialize extension
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle messages from content scripts/popup
  });
  ```

- [ ] Handle communication between components:
  - [ ] Popup ↔ Service Worker
  - [ ] Content Scripts ↔ Service Worker
  - [ ] API calls through service worker

- [ ] Manage session state:
  - [ ] Track active sessions
  - [ ] Sync state across tabs
  - [ ] Handle tab/window changes

### ✅ LivePrompt API Integration
- [ ] Session management endpoints:
  - [ ] POST /api/sessions - Create new session
  - [ ] POST /api/sessions/:id/finalize - End session
  - [ ] GET /api/sessions - Get user sessions

- [ ] Handle API responses and errors
  - [ ] Show user-friendly error messages
  - [ ] Retry logic for network failures
  - [ ] Loading states for all API calls

## Data Storage

### ✅ Chrome Storage Setup
- [ ] Local storage structure:
  ```javascript
  {
    authToken: "user-jwt-token",
    userId: "user-id",
    meetings: [
      {
        id: "meeting-1",
        title: "Team Standup",
        platform: "meet",
        time: "2024-01-20T10:00:00Z",
        url: "https://meet.google.com/abc-defg-hij"
      }
    ],
    activeSession: {
      sessionId: "session-id",
      meetingId: "meeting-1",
      startTime: "timestamp"
    }
  }
  ```

- [ ] Implement storage utilities:
  - [ ] Save/load auth token
  - [ ] CRUD operations for meetings
  - [ ] Session state management

## User Experience

### ✅ Installation Flow
- [ ] First-time setup:
  - [ ] Welcome screen in popup
  - [ ] Login/signup prompt
  - [ ] Brief tutorial (3 slides)
  - [ ] Success confirmation

### ✅ Meeting Flow
- [ ] Pre-meeting:
  - [ ] User adds meeting manually
  - [ ] Clicks "Join Meeting" when ready

- [ ] During meeting:
  - [ ] Floating widget appears automatically
  - [ ] User clicks to start LivePrompt session
  - [ ] Widget shows active status
  - [ ] Can end session from widget

- [ ] Post-meeting:
  - [ ] Session ends (manual)
  - [ ] Link to view summary on dashboard

## Testing & Quality

### ✅ Manual Testing Checklist
- [ ] Extension installation and permissions
- [ ] Authentication flow (login/logout)
- [ ] Meeting CRUD operations
- [ ] Floating widget on all platforms:
  - [ ] Google Meet
  - [ ] Microsoft Teams
  - [ ] Zoom
- [ ] Session start/stop functionality
- [ ] Data persistence across browser restarts
- [ ] Error handling scenarios

### ✅ Cross-platform Testing
- [ ] Test on different video platforms
- [ ] Test with different meeting states
- [ ] Test with multiple tabs open
- [ ] Test offline behavior

## Deployment Preparation

### ✅ Build & Package
- [ ] Create production build script
- [ ] Minimize and bundle JavaScript
- [ ] Optimize images and assets
- [ ] Generate extension ZIP file

### ✅ Chrome Web Store Assets
- [ ] App icon (128x128)
- [ ] Screenshots (1280x800 or 640x400):
  - [ ] Popup interface
  - [ ] Floating widget on Meet
  - [ ] Floating widget on Teams
  - [ ] Floating widget on Zoom
- [ ] Promotional images (optional)
- [ ] Store listing description
- [ ] Privacy policy URL

## MVP Success Criteria
- [ ] User can authenticate with LivePrompt account
- [ ] User can manually add meetings
- [ ] Floating widget appears on all video platforms
- [ ] User can start/stop LivePrompt sessions
- [ ] Sessions are created in LivePrompt backend
- [ ] Basic error handling works
- [ ] Extension is stable (no crashes)

## Next Steps (Post-Phase 1)
- Calendar integration (Google Calendar API)
- Real-time transcription display
- AI guidance panel
- Automated meeting detection
- Pre-meeting notifications
- Enhanced UI/UX

---

**Estimated Timeline**: 4-6 weeks
**Team Size**: 1-2 developers
**Priority**: Get working prototype to test core user flow