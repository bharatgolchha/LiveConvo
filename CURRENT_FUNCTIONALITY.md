# Current App Page Functionality Documentation

## Overview
The app page (`/app`) is the main conversation interface for liveprompt.ai. It's a complex single-page application managing real-time transcription, AI guidance, and conversation flow.

## Core Features

### 1. Conversation States
The app manages multiple states throughout a conversation lifecycle:
- **setup**: Initial state, user configures conversation
- **ready**: Ready to start recording
- **recording**: Actively recording conversation
- **paused**: Recording paused
- **processing**: Processing/finalizing conversation
- **completed**: Conversation finalized
- **error**: Error state

### 2. Recording Management
- **WebRTC Audio Capture**: Uses browser MediaStream API
- **Deepgram Integration**: Real-time speech-to-text
- **System Audio Capture**: Can capture system audio (screen share)
- **Recording Controls**: Start, stop, pause, resume
- **Duration Tracking**: Tracks session and cumulative duration
- **Auto-pause on Tab Switch**: Protects against accidental recording

### 3. Real-time Features
- **Live Transcription**: Updates transcript as user speaks
- **Speaker Identification**: Differentiates between ME/THEM
- **Talk Stats**: Tracks word count per speaker
- **Confidence Scores**: Shows transcription confidence

### 4. AI Integration
- **Real-time Guidance**: AI suggestions during conversation
- **Chat Interface**: Interactive AI coach sidebar
- **Context-aware Responses**: Based on conversation type and phase
- **Summary Generation**: Auto-generates conversation summaries
- **Topic Summaries**: Extracts key topics and insights
- **Timeline Generation**: Creates chronological event timeline

### 5. Context Management
- **Text Context**: Add preparation notes
- **File Upload**: Upload relevant documents
- **Previous Conversations**: Link to past sessions
- **Personal Context**: User-specific context
- **Session Persistence**: Auto-saves to localStorage

### 6. User Interface
- **Responsive Design**: Works on desktop and mobile
- **Dark Mode**: Theme toggle support
- **Fullscreen Mode**: Distraction-free recording
- **Sidebar Management**: AI Coach and Transcript sidebars
- **Modal System**: Setup, consent, transcript viewing
- **Loading States**: Processing animations

### 7. Data Persistence
- **Database Saving**: Saves transcripts, summaries, guidance
- **LocalStorage**: Draft/recovery functionality
- **Session Management**: Creates and updates sessions
- **Auto-save**: Periodic saving during recording

### 8. Usage Tracking
- **Minute Tracking**: Monitors usage against limits
- **Usage Warnings**: Alerts when approaching limits
- **Subscription Integration**: Respects plan limits
- **Real-time Updates**: Shows remaining time

### 9. Export Features
- **PDF Export**: Export conversation as PDF
- **Share Links**: Generate shareable links
- **Transcript Export**: Download transcript

### 10. Error Handling
- **Connection Errors**: Graceful Deepgram failures
- **API Errors**: User-friendly error messages
- **Recovery**: Attempts to recover from errors
- **Offline Support**: Basic offline functionality

## Key User Flows

### Starting a Conversation
1. User arrives at `/app` (new) or `/app?cid=xxx` (existing)
2. Setup modal appears for configuration
3. User adds context, selects type, uploads files
4. User clicks "Get Ready" → state becomes "ready"
5. User clicks "Start Recording" → begins capture

### During Recording
1. Audio captured via WebRTC
2. Sent to Deepgram for transcription
3. Transcript updates in real-time
4. AI guidance appears based on content
5. User can pause/resume as needed
6. Tab switching auto-pauses recording

### Ending a Conversation
1. User clicks "End & Finalize"
2. Processing animation shows
3. Final transcript saved
4. Summary generated
5. Redirects to summary page

### Resuming a Conversation
1. User opens existing session from dashboard
2. Previous transcript/context loaded
3. Can continue recording or view summary
4. State restored from database

## Component Dependencies

### External Components Used
- `ConversationContent`: Main content area
- `AICoachSidebar`: AI guidance interface
- `SetupModal`: Initial setup interface
- `TranscriptModal`: View full transcript
- `RecordingConsentModal`: Recording permission
- `FloatingChatGuidance`: Chat interface
- `LoadingModal`: Processing indicator

### Custom Hooks Used
- `useAuth`: Authentication state
- `useTranscription`: Transcription management
- `useRealtimeSummary`: Summary generation
- `useChatGuidance`: Chat functionality
- `useAIGuidance`: AI guidance generation
- `useMinuteTracking`: Usage tracking
- `useSessionData`: Session data management
- `useSessions`: Session list management

### Context Providers
- `AuthContext`: User authentication
- `ThemeContext`: Theme management

## State Management

### Core State Variables (30+)
- Conversation state and metadata
- Transcript and talk stats
- UI state (modals, sidebars, fullscreen)
- Session data and timing
- File uploads and context
- Error and loading states

### Side Effects
- Auto-save timers
- Tab visibility listeners
- Keyboard shortcuts
- Periodic transcript saves
- Usage limit checks

## API Endpoints Used
- `/api/sessions`: Session CRUD
- `/api/sessions/[id]/finalize`: End session
- `/api/sessions/[id]/transcript`: Save transcript
- `/api/sessions/[id]/context`: Save context
- `/api/guidance`: Generate guidance
- `/api/chat-guidance`: Chat interactions
- `/api/summary`: Generate summary
- `/api/topic-summary`: Topic extraction
- `/api/documents`: File uploads
- `/api/usage/*`: Usage tracking

## Performance Considerations
- Large transcript handling
- Real-time updates optimization
- Debounced saves
- Memoized computations
- Lazy loading for modals

## Known Limitations
- 2,757 lines in single file
- Complex state interactions
- Some duplicate logic
- Testing challenges
- Performance on long sessions