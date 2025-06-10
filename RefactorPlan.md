# Refactoring Plan for /frontend/src/app/app/page.tsx

## Progress Summary (Updated: Current Date)
- **Steps Completed**: 4 out of 8 (50%)
- **Service Layer**: ✅ Complete (6 services created)
- **Custom Hooks**: 🟨 In Progress (4 out of 6 hooks created)
- **UI Components**: 🟨 In Progress (3 transcript components created)
- **Next Step**: Step 5 - Extract UI Components

## Overview
The `page.tsx` file is extremely large (2299 lines) and contains all the logic for the main conversation interface. It needs to be broken down into smaller, more maintainable components and hooks.

## Current State Analysis

### File Statistics
- **Total Lines**: 2299
- **Main Component**: `AppContent` (2074 lines)
- **Number of State Variables**: ~40+
- **Number of useEffect Hooks**: ~20+
- **Number of Handler Functions**: ~25+
- **Direct API Calls**: Multiple throughout component

### Key Issues
1. **Monolithic Component**: Everything is in one massive component
2. **Mixed Concerns**: UI logic, business logic, API calls, and state management all mixed together
3. **Complex State Management**: Too many state variables managed at the top level
4. **Duplicate Logic**: Similar patterns repeated in multiple places
5. **Hard to Test**: Component is too large and interconnected to unit test effectively
6. **Performance Issues**: Excessive re-renders due to all state being at top level

## Refactoring Checklist

### Phase 1: Extract Custom Hooks ✅
- [x] **useConversationState**: Manage conversation state machine ✅
  - States: setup, ready, recording, paused, processing, completed, error
  - State transitions and validation
  - State persistence to localStorage
  
- [x] **useTranscriptManagement**: Handle transcript operations ✅
  - Transcript state and updates
  - Talk stats calculation
  - Database saving logic
  - Auto-save functionality
  
- [x] **useSessionManagement**: Handle session data ✅
  - Session loading/saving
  - Session status updates
  - Database operations
  
- [x] **useAudioRecording**: Manage audio recording ✅
  - Start/stop/pause/resume recording
  - Deepgram connections
  - System audio capture
  - Live transcript handling
  
- [ ] **useConversationSetup**: Handle conversation configuration
  - Title, type, context management
  - Previous conversation selection
  - File uploads
  
- [ ] **useSummaryManagement**: Handle summary generation
  - Real-time summary updates
  - Summary loading from database
  - Finalization process

### Phase 2: Extract Service Layer ✅
- [x] **TranscriptService**: API calls for transcript operations ✅
- [x] **SessionService**: API calls for session operations ✅
- [x] **SummaryService**: API calls for summary operations ✅
- [x] **ChecklistService**: API calls for checklist operations ✅
- [x] **ContextService**: API calls for context management ✅
- [x] **RecordingService**: Audio recording management ✅

### Phase 3: Extract UI Components ✅
- [ ] **ConversationSetupView**: Setup state UI
- [ ] **ConversationRecordingView**: Recording state UI
- [ ] **ConversationCompletedView**: Completed state UI
- [ ] **ConversationErrorView**: Error state UI
- [x] **TranscriptView**: Transcript display component ✅
- [x] **TranscriptCard**: Transcript statistics component ✅
- [x] **TranscriptPanel**: Full transcript interface ✅
- [ ] **SummaryView**: Summary display component
- [ ] **ContextPanel**: Context setup panel
- [ ] **PreviousConversationsSelector**: Previous conversation selection UI

### Phase 4: Create State Management ✅
- [ ] **ConversationContext**: Global conversation state
- [ ] **TranscriptContext**: Transcript data and operations
- [ ] **SummaryContext**: Summary data and operations
- [ ] **RecordingContext**: Recording state and controls

### Phase 5: Optimize Performance ✅
- [ ] **Memoize Heavy Computations**: Use React.memo and useMemo
- [ ] **Split Code**: Use dynamic imports for large components
- [ ] **Virtualize Lists**: For transcript display
- [ ] **Debounce Updates**: For real-time operations

### Phase 6: Testing Setup ✅
- [ ] **Unit Tests**: For each extracted hook
- [ ] **Component Tests**: For each UI component
- [ ] **Integration Tests**: For main flows
- [ ] **Performance Tests**: For recording and real-time updates

## Implementation Order

### Step 1: Create Base Infrastructure ✅
1. Create folders: `hooks/conversation`, `services`, `components/conversation/views` ✅
2. Set up base types and interfaces ✅
3. Create service layer with proper error handling ✅

### Step 2: Extract Recording Logic First (Most Critical) ✅
1. Create `useAudioRecording` hook ✅
2. Create `RecordingService` ✅
3. Test recording functionality still works ✅

### Step 3: Extract Transcript Management ✅
1. Create `useTranscriptManagement` hook ✅
2. Create `TranscriptService` ✅
3. Move transcript display to `TranscriptView` component ✅

### Step 4: Extract Session Management ✅
1. Create `useSessionManagement` hook ✅
2. Create `SessionService` ✅
3. Ensure database operations still work ✅

### Step 5: Extract UI Components
1. Start with simpler views (Setup, Error)
2. Move to complex views (Recording, Completed)
3. Ensure all event handlers are properly connected

### Step 6: Create Context Providers
1. Wrap components with context providers
2. Move shared state to contexts
3. Remove prop drilling

### Step 7: Performance Optimization
1. Add memoization where needed
2. Implement code splitting
3. Add loading states

### Step 8: Testing
1. Write tests for each new component/hook
2. Ensure coverage of critical paths
3. Add performance benchmarks

## Success Criteria
- [ ] File size reduced to under 300 lines
- [ ] Each component/hook has single responsibility
- [ ] All functionality works as before
- [ ] Tests cover critical paths
- [ ] Performance improved (fewer re-renders)
- [ ] Code is more maintainable and readable

## Risk Mitigation
1. **Create backup**: Save current working version
2. **Test after each step**: Ensure functionality is preserved
3. **Use feature flags**: To switch between old and new implementations
4. **Incremental deployment**: Deploy changes gradually
5. **Monitor errors**: Set up error tracking for new code

## Notes
- Keep the existing `AppContent` component working during refactoring
- Create new components alongside, then switch over
- Ensure backward compatibility with localStorage data
- Maintain all existing API contracts
- Document any breaking changes

## Completed Components

### Services (✅ All Complete)
1. **BaseService** - Base class with error handling
2. **TranscriptService** - Transcript CRUD with retry logic
3. **SessionService** - Session management and finalization
4. **ContextService** - Context and document management
5. **SummaryService** - Summary generation
6. **ChecklistService** - Checklist operations
7. **RecordingService** - Audio stream management

### Hooks (✅ 10 Created)
1. **useAudioRecording** - Audio recording management
2. **useRecordingState** - Recording state machine
3. **useConversationRecording** - Combined recording solution
4. **useTranscriptManagement** - Transcript operations
5. **useTranscriptPersistence** - LocalStorage persistence
6. **useConversationTranscript** - Combined transcript solution
7. **useSessionManagement** - Session CRUD operations
8. **useSessionState** - Session state sync
9. **useSessionList** - Session list management
10. **useFullSessionManagement** - Complete session solution

### UI Components (✅ 3 Created)
1. **TranscriptView** - Chat-style transcript display
2. **TranscriptCard** - Transcript statistics
3. **TranscriptPanel** - Full transcript interface

### Utilities
1. **conversationTypeMap** - Enhanced with bidirectional mapping
2. **ServiceFactory** - Singleton service management