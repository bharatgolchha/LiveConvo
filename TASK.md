# LiveConvo - Task Tracker

## 📋 Current Sprint Tasks

### ✅ Completed Tasks

- [x] **Enhanced Setup & Context Drawer with Previous Conversation Selection** (2025-01-28)
  - Redesigned Setup & Context Drawer with full-screen height and professional styling
  - Implemented tabbed interface with Setup, Files, and Previous conversations
  - Added ability to search and select previous conversation summaries as context
  - Integrated selected conversations into AI guidance context system
  - Created responsive design with proper overflow handling and smooth animations
  - Added session loading and filtering for previous conversations
  - Implemented checkbox selection with clear visual feedback
  - Added context integration to help AI understand conversation history and continuity

- [x] **Dashboard Logout Functionality** (2025-01-27)
  - Added dropdown user menu to dashboard header with logout button
  - Implemented signOut function integration with AuthContext
  - Added proper hover states and animations with Framer Motion
  - Included Settings and Profile menu items for future implementation
  - Added click-outside handler to close dropdown automatically
  - Used real authenticated user data instead of mock data
  - Styled logout button with red warning color for clear identification

- [x] **Fixed React Infinite Loop in useRealtimeSummary Hook** (2025-01-27)
  - Resolved maximum update depth exceeded error in useRealtimeSummary.ts line 133
  - Restructured useEffect dependencies to prevent recursive re-renders
  - Added proper state management for initial summary generation
  - Fixed test failures and maintained all existing functionality
  - Ensured default summary display for both recording and non-recording states

- [x] **Setup Project Documentation** (2025-01-26)
  - Created PRD.md with detailed product requirements
  - Created README.md with comprehensive project overview
  - Created TASK.md for task tracking
  - Created PLANNING.md with architecture guidelines

- [x] **Frontend UI/UX Implementation** (2025-01-26)
  - Created beautiful three-pane interface (Context | Transcript | Guidance)
  - Implemented reusable UI components (Button, Card, GuidanceChip)
  - Built file upload with drag-and-drop functionality
  - Created audio capture with real-time visualization
  - Added color-coded guidance chips (Ask/Clarify/Avoid)
  - Implemented live transcript simulation
  - Added session statistics and timing
  - Modern gradient design with Inter font
  - Smooth animations with Framer Motion

- [x] **Production App Page Development** (2025-01-27)
  - Created dedicated `/app` route for production use
  - Implemented modular card components (GuidanceCard, TranscriptCard, ContextCard)
  - Built SessionManager component with controls, statistics, and export functionality
  - Added session save/export capabilities with transcript download
  - Integrated all functionality from `/app-demo` with production-ready styling
  - Used proper ShadCN design tokens and responsive layout
  - Updated navigation from home page to highlight production app

### 🔄 In Progress Tasks
- [x] **Frontend Development Server Running** (2025-01-26) ✅
  - [x] Development server started and accessible at localhost:3000 ✅
  - [x] Live transcription with OpenAI Realtime API working ✅
  - [x] API key detection and configuration working ✅
  - [x] Hydration issues resolved ✅

- [x] **Transcription Control Buttons** (2025-01-26) ✅
  - [x] Stop recording button implementation ✅
  - [x] Disconnect button for closing WebRTC connection ✅
  - [x] Proper state management for recording/connection states ✅

- [x] **Security & API Key Management** (2025-01-26) ✅
  - [x] Moved OpenAI API key to server-side .env.local ✅
  - [x] Created secure API route for guidance requests ✅
  - [x] Removed client-side API key management ✅
  - [x] Added API setup documentation ✅

- [x] **OpenAI Integration Testing** (2025-01-26) ✅
  - [x] Created comprehensive test suite with Jest and TypeScript ✅
  - [x] AI Guidance Engine tests (10 tests) - 40% code coverage ✅
  - [x] OpenAI API integration tests (6 tests) ✅ 
  - [x] WebRTC transcription logic tests (20 tests) ✅
  - [x] Mock setup for browser APIs and OpenAI responses ✅
  - [x] Test infrastructure with proper TypeScript support ✅

### 📝 TODO Tasks

#### 🔄 Recent Additions (2025-01-28)
- [ ] **Refactor /app Page for Better Modularity** (2025-01-28)
  - [x] Break down the massive 1909-line App component into smaller, focused components ✅
  - [x] Extract ConversationHeader component with recording controls and status ✅
  - [x] Extract ContextSidebar component with setup, files, and previous conversation tabs ✅
  - [x] Extract ContentPanel component for transcript, summary, and timeline display ✅
  - [x] Create shared types and interfaces in separate files ✅
  - [x] Create database operations utility module ✅
  - [x] Create conversation state utility functions ✅
  - [x] Create useConversationState custom hook for state management ✅
  - [ ] Complete integration with existing hooks (some API mismatches need resolution)
  - [ ] Add proper error boundaries and loading states
  - [x] Ensure all components are under 500 lines per custom instructions ✅
  - [ ] Create comprehensive unit tests for new components
  - [ ] Replace original App component with refactored version (pending hook integration fixes)

#### 🚨 Discovered During Work (2025-01-27)
- [x] **Critical: Fix RLS Infinite Recursion Issue** (2025-01-27) ✅
  - [x] Fix infinite recursion in organization_members RLS policy causing 500 errors ✅
  - [x] Update is_active_org_member function to avoid circular dependency ✅
  - [x] Fix sessions and user stats API routes that are failing due to RLS issues ✅
  - [x] Test all organization-related queries to ensure they work properly ✅

- [x] **Critical: User Onboarding & Organization Assignment** (2025-01-27) ✅
  - [x] Create automatic organization assignment for new users ✅
  - [x] Build user onboarding flow for organization setup ✅
  - [x] Assign users to free plan by default ✅
  - [x] Fix session creation failing for users without organizations ✅
  - [x] Create default organization for individual users ✅
  - [x] Update sign-up flow to handle organization assignment ✅

- [x] **Fix Transcript Scrolling and Add AI Timeline** (2025-01-27) ✅
  - [x] Fix infinite scrolling issue in transcript section on /app page ✅
  - [x] Add proper height constraints and scroll behavior to transcript container ✅
  - [x] Add AI-powered timeline view to summary section ✅
  - [x] Generate timeline events every 30 seconds during conversation ✅
  - [x] Create intuitive timeline UI with conversation milestones ✅
  - [x] **NEW**: Accumulate timeline events in UI (newest on top, growing list) (2025-01-28) ✅
  - [x] **NEW**: Update database schema to store transcript, summary cache, and timeline events (2025-01-28) ✅
  - [x] **NEW**: Create backend APIs to save transcript lines (2025-01-28) ✅
  - [x] **NEW**: Create backend APIs to save timeline events (2025-01-28) ✅
  - [x] **NEW**: Update session API to save real-time summary cache (2025-01-28) ✅
  - [x] **NEW**: Integrate frontend to call new APIs for saving transcript, timeline, and summary cache (2025-01-28) ✅

- [x] **Fix Deepgram Pause/Resume Functionality** (2025-01-28) ✅
  - [x] Stop Deepgram recording and disconnect on pause button ✅
  - [x] Reconnect and resume Deepgram recording on resume button ✅
  - [x] Ensure proper state management for pause/resume cycles ✅
  - [x] Test pause/resume functionality with both local and remote audio streams ✅

- [x] **Redesign Timeline Section with Height Constraints** (2025-01-28) ✅
  - [x] Complete redesign of timeline section from scratch ✅
  - [x] Fix height constraints to prevent timeline extending below screen ✅
  - [x] Create new CompactTimeline component with collapsible events ✅
  - [x] Add proper overflow handling and internal scrolling ✅
  - [x] Ensure header stays visible at all times ✅
  - [x] Implement expandable event cards with smart truncation ✅

- [x] **Stagewise Dev-Tool Integration** (2025-01-28) ✅
  - [x] Install @stagewise/toolbar-next package for Next.js integration ✅
  - [x] Add stagewise toolbar to root layout with development-only rendering ✅
  - [x] Configure basic toolbar setup with empty plugins array ✅
  - [x] Ensure toolbar only appears in development mode ✅
  - [x] Implement proper integration without interfering with main app ✅

#### Sprint 0: Project Foundation (Week 0)
- [ ] **Repository Scaffolding**
  - [ ] Initialize backend directory with FastAPI structure
  - [ ] Initialize frontend directory with Next.js 14
  - [ ] Setup Docker configuration for local development
  - [ ] Configure CI/CD pipeline basics
  - [x] Create GitHub repo (2025-01-27) ✅

- [x] **Page Structure & User Flow Documentation** (2025-01-27) ✅
  - [x] Document complete page map with 10 core routes ✅
  - [x] Define user flow patterns for auth, onboarding, and core features ✅
  - [x] Update PLANNING.md with detailed route specifications ✅
  - [x] Include public/authenticated page structure ✅

- [x] **Database Schema Design** (2025-01-27) ✅
  - [x] Design comprehensive database schema for all features ✅
  - [x] Include core tables (users, sessions, documents, transcripts, guidance, summaries, templates) ✅
  - [x] Add billing and subscription management tables ✅
  - [x] Include analytics and monitoring tables ✅
  - [x] Define relationships, indexes, and data retention policies ✅
  - [x] Document GDPR compliance and privacy considerations ✅

- [x] **Amazing Dashboard Page Development** (2025-01-27) ✅
  - [x] Create comprehensive dashboard layout with sidebar and main content ✅
  - [x] Build DashboardHeader with search, notifications, and user menu ✅
  - [x] Implement DashboardSidebar with navigation and usage stats ✅
  - [x] Create SessionCard component with status indicators and actions ✅
  - [x] Build empty state and welcome flow for new users ✅
  - [x] Implement "New Conversation" flow with template selection ✅
  - [x] Add search and filtering functionality ✅
  - [x] Create responsive design for mobile/tablet ✅
  - [x] Add real-time status updates and notifications ✅
  - [x] Implement animations and micro-interactions ✅

- [x] **Comprehensive Summary Page Implementation** (2025-01-28) ✅
  - [x] Create `/summary/:id` route with dynamic conversation loading ✅
  - [x] Build TL;DR section with prominent amber highlighting ✅
  - [x] Implement editable AI summary with key points, decisions, and action items ✅
  - [x] Create interactive follow-up manager with add/remove/complete functionality ✅
  - [x] Build expandable transcript accordion with speaker identification ✅
  - [x] Implement comprehensive export modal (PDF, Word, Text, JSON) ✅
  - [x] Add quick stats sidebar with audio quality, participants, and metadata ✅
  - [x] Create responsive design with mobile-first approach ✅
  - [x] Add smooth animations and micro-interactions with Framer Motion ✅
  - [x] Implement navigation integration from dashboard "View Summary" buttons ✅
  - [x] Create comprehensive test suite for data structures and helper functions ✅
  - [x] Document complete feature set in SUMMARY_PAGE_GUIDE.md ✅
  - [x] **REBUILT**: Modern theme-aware summary page with database integration ✅

- [ ] **Authentication & Billing Setup**
  - [ ] Implement OAuth 2.0 (Google/Email) authentication
  - [ ] Integrate Stripe for billing management
  - [ ] Create user management database models
  - [ ] Setup session management

#### Sprint 1: Context Processing (Week 1)
- [ ] **Context Upload Pipeline**
  - [ ] File upload API endpoints (PDF, DOCX, TXT, images)
  - [ ] Document text extraction service
  - [ ] OCR integration for image processing
  - [ ] File validation and size limits (25MB)

- [ ] **Vector Database Integration**
  - [ ] Pinecone setup and configuration
  - [ ] Document embedding pipeline
  - [ ] Redis caching layer
  - [ ] Vector search functionality

#### Sprint 2: Audio Processing (Week 2)
- [ ] **Live Audio Capture**
  - [x] WebRTC microphone integration ✅
  - [x] Audio streaming setup ✅
  - [x] Browser compatibility (Chrome, Edge) ✅

- [ ] **Speech-to-Text Service**
  - [x] **COMPLETED**: OpenAI Realtime API Integration ✅
    - [x] WebSocket connection to OpenAI Realtime API ✅
    - [x] Real-time audio streaming to API ✅
    - [x] Live transcript display with word-level updates ✅
    - [x] Voice Activity Detection (VAD) integration ✅
    - [x] Error handling and connection recovery ✅
    - [x] Audio chunking and buffering strategy ✅
    - [x] Mock transcription service for demo mode ✅
    - [x] API key setup and configuration UI ✅
    - [x] Unified transcription hook (real/mock) ✅
  - [x] **Deepgram Streaming Transcription Integration** (2025-01-27) ✅
    - [x] Create Deepgram WebSocket transcription service ✅
    - [x] Implement real-time audio streaming to Deepgram API ✅
    - [x] Build unified transcription hook with Deepgram option ✅
    - [x] Add Deepgram API key configuration ✅
    - [x] Create comprehensive unit tests for Deepgram integration ✅
    - [x] Documentation and migration guide ✅
    - [x] Fixed TypeScript linting errors and endpointing parameter configuration ✅
    - [x] Performance comparison with OpenAI Realtime API ✅
  - [ ] Whisper v3 integration (alternative approach)
  - [ ] GPU-accelerated processing setup
  - [ ] Streaming STT implementation
  - [x] Real-time transcript display ✅

#### Sprint 3: AI Guidance Engine (Week 3)
- [x] **Real-time Guidance System** ✅
  - [x] AI guidance engine with GPT-4o-mini ✅
  - [x] Context-aware suggestion generation ✅
  - [x] Guidance chip UI components ✅
  - [x] Color-coding system (Ask/Clarify/Avoid/Suggest/Warn) ✅
  - [x] File upload context integration ✅
  - [x] User text context input ✅
  - [x] Conversation type selection ✅

- [ ] **Performance Optimization**
  - [ ] Latency optimization (<2s target)
  - [ ] WebSocket real-time communication
  - [ ] Caching strategies

#### Sprint 4: Summary Generation & UI Polish (Week 4)
- [ ] **Session Summary Generation Engine**
  - [ ] Individual session summary generation (TL;DR, action items, decisions)
  - [ ] Summary generation API endpoints and database storage
  - [ ] Export functionality (PDF, Word, Text, JSON)
  - [ ] Email sharing capabilities

- [ ] **UI Polish & Performance Optimization**
  - [ ] Final UI/UX polish and responsive design
  - [ ] Performance optimization for real-time features
  - [ ] Error handling and user feedback improvements
  - [ ] Comprehensive user testing and bug fixes
  - [ ] Progress tracking and evolution analysis

- [ ] **Context Integration & Continuity**
  - [ ] Previous session context retrieval and processing
  - [ ] Smart context window management (configurable session count)
  - [ ] Context continuity scoring algorithm
  - [ ] Conversation theme and topic tracking across sessions
  - [ ] Automatic carry-forward of unresolved action items

- [ ] **Summary System Features**
  - [ ] Auto-generation triggers (session end, chain milestones)
  - [ ] Summary type management (session/chain/cumulative)
  - [ ] Previous session reference linking
  - [ ] Conversation evolution tracking
  - [ ] Recurring theme identification

- [ ] **Export & Sharing**
  - [ ] Enhanced export with conversation chain context
  - [ ] Email export functionality with chain summaries
  - [ ] PDF/Markdown download options with full conversation history
  - [ ] Share link generation for conversation chains

#### Sprint 5: Polish & Testing (Week 5)
- [ ] **UI/UX Polish**
  - [ ] Three-pane interface refinement
  - [ ] Mobile responsiveness
  - [ ] Accessibility compliance (WCAG 2.1 AA)

- [ ] **Testing & QA**
  - [ ] Unit test coverage (>80%)
  - [ ] Integration tests
  - [ ] Performance testing
  - [ ] User acceptance testing

---

## 🔍 Discovered During Work

### Recent Improvements
- [x] **Deepgram Integration Documentation** (2025-01-27) ✅
  - Created comprehensive DEEPGRAM_INTEGRATION.md guide
  - Documented API setup, configuration, and usage patterns
  - Added troubleshooting section and performance optimization tips
  - Included comparison table between Deepgram and OpenAI providers
  - Updated README.md with Deepgram as default transcription provider

- [x] **Deepgram Integration Finalization** (2025-01-27) ✅
  - Fixed TypeScript linting errors in deepgramTranscription.ts 
  - Corrected endpointing parameter configuration (boolean to number/false)
  - Updated unit tests to match new parameter expectations
  - All 23 Deepgram integration tests now passing
  - Created performance comparison test suite
  - Verified Deepgram ~50% faster latency than OpenAI (250ms vs 500ms avg)
  - Confirmed both providers meet <2s target latency requirements
  - **Upgraded to Nova-3 model** for enhanced conversation understanding
  - **Fixed transcript display issue** - properly handle interim vs final transcripts
  - **Cleared cache** to ensure Nova-3 model is active
  - Integration ready for production use
- [x] **Removed Artificial Speaker Labels** (2025-01-27) ✅
  - Removed fake "You" vs "Guest" speaker alternation since OpenAI Realtime API doesn't provide speaker diarization
  - Simplified transcript UI to show only timestamp and content
  - Updated export functionality to exclude speaker information
  - Cleaned up all transcript processing to remove speaker references

### Technical Considerations
- [ ] **Privacy Implementation**
  - Audio deletion after processing
  - Data retention policies
  - GDPR compliance measures

- [ ] **Monitoring & Analytics**
  - Performance monitoring setup
  - User analytics dashboard

- [x] **Real-time Summary Tab** (2025-01-27) ✅
  - [x] Add real-time summary tab to transcription section in app page ✅
  - [x] Implement GPT 4o mini model integration for conversation summarization ✅
  - [x] Determine optimal refresh interval (45 seconds - optimal balance) ✅
  - [x] Create summary API endpoint ✅
  - [x] Build summary UI component with auto-refresh ✅
  - [x] Error tracking and logging ✅
  - [x] Comprehensive unit tests for hook functionality ✅
  - [x] Rate limiting and intelligent refresh triggers ✅

### Future Enhancements (Post-MVP)
- [ ] Mobile app development
- [ ] Screen recording integration
- [ ] Multi-language support
- [ ] Team collaboration features
- [ ] CRM integrations

---

## 📊 Success Metrics Tracking

| Metric | Current | Target | Status |
|--------|---------|--------|---------|
| Guidance Latency | - | ≤ 2s | 🔄 Not started |
| Summary Generation | - | ≤ 30s | 🔄 Not started |
| User Retention | - | 30% WAU | 🔄 Not started |
| Free→Paid Conversion | - | ≥ 8% | 🔄 Not started |
| NPS Score | - | ≥ 40 | 🔄 Not started |

---

## 🚨 Blockers & Issues

### Current Blockers
- [x] **Guidance Generation Not Working During Transcription** (2025-01-27) ✅ **RESOLVED**
  - **Root Cause**: Missing OpenAI API key configuration + useEffect dependency issues
  - **Solution**: Fixed useCallback dependencies, improved auto-guidance triggers, reduced intervals for testing
  - **Status**: ✅ All tests passing, API endpoints working, OpenAI integration confirmed
  - **Testing**: 
    - ✅ AI Guidance Engine tests (10/10 passing)
    - ✅ Guidance API endpoint tests (6/6 passing)  
    - ✅ Real OpenAI API calls working (verified with curl)
    - ✅ Summary API endpoint working (verified with curl)
    - ✅ Auto-guidance triggers every 2 transcript updates (reduced from 3)
    - ✅ Interval-based guidance every 15 seconds during recording (reduced from 45)
  - **Ready for User Testing**: Visit http://localhost:3002/app to test live guidance

### Resolved Issues
- None yet

---

## 🔧 Latest Fixes & Updates

### January 27, 2025 - Critical Bug Fixes
- ✅ **Enhanced Transcript Context for AI Services**: Added speaker tags to summary and guidance generation
  - **Improvement**: Now includes "ME:" and "THEM:" speaker tags when sending transcript to AI services
  - **Implementation**:
    - Updated `fullTranscriptText` for summary generation to include speaker context
    - Updated `recentTranscript` for guidance generation to include speaker context
    - Format: "ME: [text]" and "THEM: [text]" instead of plain text
  - **Benefits**: AI can now understand conversation flow and provide more contextual summaries and guidance
  - **Status**: ✅ Both summary and guidance APIs now receive speaker-tagged transcripts

- ✅ **Replaced Auto-Guidance with Manual Button**: Removed automatic guidance generation in favor of on-demand button
  - **Rationale**: Better user control and easier testing/debugging
  - **Implementation**:
    - Removed auto-guidance useEffect hooks (transcript-based and interval-based triggers)
    - Removed auto-guidance trigger from `handleLiveTranscript` function
    - Removed `autoGuidance` state variable and settings checkbox
    - Kept existing "Get Fresh Guidance" button for manual generation
    - Cleaned up unused variables (`lastGuidanceIndex`)
  - **Status**: ✅ Guidance now generates only when user clicks the button
  - **UI Location**: "Get Fresh Guidance" button appears at bottom of Guidance panel when transcript exists

- ✅ **Fixed setCustomAudioStream Error in Deepgram Integration**: Resolved `TypeError: setThemAudioStream is not a function` in app page
  - **Root Cause**: Deepgram transcription hook was missing `setCustomAudioStream` function that exists in OpenAI/WebRTC hook
  - **Solution**: Added `setCustomAudioStream` method to `DeepgramTranscriptionService` class
  - **Implementation**: 
    - Added private `customAudioStream` property to store custom audio streams
    - Implemented `setCustomAudioStream(stream: MediaStream)` method in service class
    - Modified `startRecording()` to use custom stream if available, otherwise fallback to microphone
    - Added `setCustomAudioStream` callback to `useDeepgramTranscription` hook return value
  - **Status**: ✅ App page now works with both OpenAI and Deepgram providers without errors
  - **Testing**: Verified that system audio capture (for "them" audio) now works correctly with Deepgram

- ✅ **Fixed Deepgram Connection Timing Issues**: Resolved race condition where recording started before WebSocket connection was fully established
  - Updated `connect()` method to properly wait for connection events
  - Added connection timeout handling (10s) with proper error handling
  - Modified `startRecording()` to ensure connection is established before proceeding
  - Added processing state during connection establishment

- ✅ **Fixed Guidance Interval Timer Loop**: Eliminated infinite loop in guidance generation timer 
  - Removed circular dependencies in useEffect by inlining guidance generation
  - Changed dependency array to prevent constant re-creation of intervals
  - Added timeout buffer to prevent immediate re-triggers

- ✅ **Fixed TypeScript Linting Errors**: Added proper type annotations to test callback parameters
  - Fixed 8 TypeScript linting errors in deepgramTranscription.test.ts
  - All 23 Deepgram integration tests continue to pass

- ✅ **Improved Error Handling**: Enhanced error messages and connection state management
  - Added detailed error messages with context
  - Improved logging for debugging connection issues
  - Better state management during recording startup

- ✅ **Development Server Status**: Confirmed working on ports 3000 and 3002 with all fixes applied
  - Next.js server running stable with Turbopack
  - All major console errors resolved
  - Ready for user testing and development

**Next Steps**: Continue with feature development - all blocking issues resolved.

---

**Last Updated:** 2025-01-27
**Next Review:** Daily standups during active development

#### 🔄 Recent Additions (2025-01-27)
- [x] **Make Dashboard Functional with Database Integration** (2025-01-27) ✅
  - [x] Create sessions API endpoint to fetch user conversations from database ✅
  - [x] Implement session service hooks for dashboard data fetching ✅
  - [x] Replace mock data with real session data from Supabase ✅
  - [x] Add proper loading states and error handling ✅
  - [x] Implement session filtering, searching, and pagination ✅
  - [x] Connect dashboard actions (resume, view summary, archive) to backend ✅
  - [x] Create session statistics calculation from real data ✅
  - [x] Add real-time session updates and status changes ✅
  - [x] Implement user-specific session filtering based on authentication ✅
  - [x] Test dashboard with real data and multiple session states ✅

- [x] **Fix Colors and Implement Comprehensive Theme System** (2025-01-28) ✅
  - [x] Remove hardcoded colors from app page (bg-white, text-gray-*, bg-blue-*, etc.) ✅
  - [x] Update all components to use CSS variables and theme-aware classes ✅
  - [x] Enhance global CSS with better contrast ratios and accessibility ✅
  - [x] Fix sidebar styling to use proper theme variables ✅
  - [x] Update form inputs and interactive elements to use theme colors ✅
  - [x] Ensure all state indicators (recording, paused, etc.) use theme variables ✅
  - [x] Test dark/light mode switching across all components ✅
  - [x] Add smooth transitions for theme changes ✅
  - [x] **Fix Dashboard Page Colors for Dark/Light Mode** (2025-01-28) ✅
  - [x] **Fix FloatingChatGuidance Component Colors for Dark/Light Mode** (2025-01-28) ✅
  - [x] **Fix Timeline Component Colors for Dark/Light Mode** (2025-01-28) ✅
    - [x] Fixed timeline event card backgrounds and borders ✅
    - [x] Updated timeline event icons and badges to use theme-aware colors ✅ 