# LivePrompt Chrome Extension Plan

## Overview
A Chrome extension that seamlessly integrates liveprompt.ai with popular video conferencing platforms (Google Meet, Microsoft Teams, Zoom) to provide real-time conversation coaching and meeting management capabilities.

## Core Features

### 1. Meeting Dashboard Modal
- **Quick Access Button**: Chrome toolbar icon that opens a modal overlay
- **Upcoming Meetings View**:
  - Calendar integration (Google Calendar, Outlook)
  - List of upcoming meetings with:
    - Meeting title and time
    - Platform indicator (Meet/Teams/Zoom)
    - Participants list
    - Quick join button
    - "Start LivePrompt Session" button
- **Active Sessions Tab**: View and manage ongoing liveprompt sessions
- **Recent Sessions Tab**: Quick access to recent session summaries and insights

### 2. In-Meeting Floating Widget
- **Smart Detection**: Automatically appears when user joins Meet/Teams/Zoom
- **Floating Action Button (FAB)**:
  - Positioned at bottom-right corner (draggable)
  - LivePrompt logo with pulsing indicator when active
  - Expandable menu with options:
    - Start/Stop LivePrompt session
    - View real-time guidance
    - Upload context documents
    - Access checklist
    - Toggle AI advisor visibility

### 3. Real-time Integration Panel
- **Slide-out Panel** (activated from FAB):
  - Real-time transcription display
  - AI guidance and suggestions
  - Speaking time tracker
  - Key points capture
  - Action items tracker
  - Context documents viewer

### 4. Platform-Specific Features

#### Google Meet Integration
- Inject custom UI elements into Meet interface
- Access meeting metadata (title, participants)
- Sync with Google Calendar for meeting prep
- Auto-detect when screensharing starts/stops

#### Microsoft Teams Integration
- Teams API integration for meeting details
- Support for Teams channels and chats context
- Integration with Teams calendar

#### Zoom Integration
- Zoom Web SDK integration
- Support for webinars and meetings
- Breakout room detection

## Additional Smart Features

### 5. Pre-Meeting Preparation
- **15-minute reminder** before meetings with:
  - Quick prep checklist
  - Context document upload reminder
  - Previous meeting notes with same participants
  - AI-suggested talking points based on meeting title/agenda

### 6. Meeting Intelligence
- **Smart Context Detection**:
  - Auto-parse meeting invites for agenda items
  - Extract shared document links from calendar
  - Identify key stakeholders and their roles
- **Participant Insights**:
  - Show previous interactions with participants
  - LinkedIn integration for quick participant research

### 7. Post-Meeting Automation
- **Auto-trigger** when meeting ends:
  - Generate and email summary to selected participants
  - Create follow-up tasks in integrated tools
  - Schedule follow-up meetings if discussed
  - Export action items to task management tools

### 8. Quick Actions & Shortcuts
- **Keyboard Shortcuts**:
  - Ctrl/Cmd + Shift + L: Toggle LivePrompt
  - Ctrl/Cmd + Shift + G: Show/hide guidance
  - Ctrl/Cmd + Shift + S: Save important moment
- **Voice Commands** (experimental):
  - "LivePrompt, save this point"
  - "LivePrompt, create action item"

### 9. Privacy & Security Features
- **Recording Indicator**: Clear visual when LivePrompt is active
- **Participant Consent**: Optional consent request for transcription
- **Data Control**: 
  - Local-first mode option
  - Choose what to sync to cloud
  - Auto-delete recordings after summary

## Technical Architecture

### Extension Structure
```
chrome-extension/
├── manifest.json          # Extension configuration
├── background/
│   ├── service-worker.js  # Background processes
│   └── api-client.js      # LivePrompt API integration
├── content-scripts/
│   ├── meet-injector.js   # Google Meet specific
│   ├── teams-injector.js  # MS Teams specific
│   ├── zoom-injector.js   # Zoom specific
│   └── common-ui.js       # Shared UI components
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup logic
│   └── popup.css          # Popup styles
├── components/
│   ├── FloatingWidget.js  # FAB component
│   ├── GuidancePanel.js   # Slide-out panel
│   └── MeetingModal.js    # Dashboard modal
└── assets/
    ├── icons/             # Extension icons
    └── styles/            # Shared styles
```

### Permissions Required
```json
{
  "permissions": [
    "activeTab",
    "storage",
    "notifications",
    "alarms",
    "identity",
    "contextMenus"
  ],
  "host_permissions": [
    "https://meet.google.com/*",
    "https://teams.microsoft.com/*",
    "https://*.zoom.us/*",
    "https://calendar.google.com/*"
  ],
  "optional_permissions": [
    "clipboardWrite",
    "downloads"
  ]
}
```

### API Integration
- **Authentication**: OAuth2 flow with liveprompt.ai
- **WebSocket**: Real-time updates for transcription and guidance
- **REST API**: Session management, summary generation
- **Storage**: Chrome storage API for user preferences and cache

## User Experience Flow

### First-Time Setup
1. Install extension from Chrome Web Store
2. Click extension icon → Sign in to liveprompt.ai
3. Grant calendar permissions (optional)
4. Configure preferences (default AI model, privacy settings)
5. Quick tutorial overlay on first meeting join

### Typical Usage
1. **Before Meeting**:
   - Get notification 15 min before
   - Click to review prep materials
   - Upload any context documents

2. **During Meeting**:
   - Extension auto-detects meeting platform
   - Floating icon appears
   - Click to start LivePrompt session
   - View real-time guidance in slide-out panel

3. **After Meeting**:
   - Auto-generate summary
   - Review and edit if needed
   - Share with participants or save

## Development Phases

### Phase 1: MVP (4-6 weeks)
- Basic popup with meeting list (manual entry)
- Floating widget for Meet/Teams/Zoom
- Start/stop LivePrompt sessions
- Simple authentication

### Phase 2: Calendar Integration (2-3 weeks)
- Google Calendar integration
- Automated meeting detection
- Pre-meeting notifications

### Phase 3: Enhanced UI (3-4 weeks)
- Slide-out guidance panel
- Real-time transcription display
- Improved floating widget

### Phase 4: Intelligence Features (4-5 weeks)
- Context detection
- Participant insights
- Post-meeting automation
- Advanced AI features

## Success Metrics
- Extension installation rate
- Daily active users
- Sessions started from extension
- Average session duration
- User retention (30-day)
- Feature adoption rates
- User feedback scores

## Marketing & Distribution
- Chrome Web Store listing with demo video
- Integration with liveprompt.ai onboarding
- Email campaign to existing users
- Product Hunt launch
- Partnership with productivity influencers

## Future Enhancements
- Firefox and Edge versions
- Mobile companion app
- Slack/Discord integration
- AI meeting scheduler
- Meeting analytics dashboard
- Team collaboration features
- Custom AI prompt templates
- Integration with CRM systems