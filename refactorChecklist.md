# App Page Refactoring Checklist

## Overview
This checklist provides a step-by-step approach to refactoring the app page. Each step is designed to be completed and tested independently without breaking existing functionality.

## Pre-Refactoring Setup
- [ ] Create a new branch: `refactor/app-page-breakdown`
- [ ] Run all existing tests to ensure baseline functionality
- [ ] Document current functionality with screenshots/recordings
- [ ] Set up performance baseline metrics
- [ ] Backup current `app/page.tsx` file

## Phase 1: Extract Utility Functions (No State Changes)

### Step 1.1: Format Utilities
- [x] Create `src/lib/conversation/formatUtils.ts`
- [x] Move `formatDuration` function
- [x] Move any other formatting functions
- [x] Update imports in `app/page.tsx`
- [x] **Test**: Verify all formatting still works correctly

### Step 1.2: Database Operations
- [x] Create `src/lib/conversation/databaseOperations.ts`
- [x] Extract `saveTranscriptToDatabase` function
- [x] Extract `saveTranscriptNow` function
- [x] Extract `saveSummaryToDatabase` function
- [x] Update imports in `app/page.tsx`
- [x] **Test**: Create a test conversation and verify saving works

### Step 1.3: State Utilities
- [x] Create `src/lib/conversation/stateUtils.ts`
- [x] Extract state validation logic
- [x] Extract state transition helpers
- [x] Update imports in `app/page.tsx`
- [x] **Test**: Verify all state transitions work correctly

## Phase 2: Extract Custom Hooks (Incremental)

### Step 2.1: Recording State Hook
- [x] Create `src/lib/hooks/conversation/useRecordingState.ts`
- [x] Move recording state variables:
  - [x] `recordingStartTime`
  - [x] `sessionDuration`
  - [x] `cumulativeDuration`
- [x] Move recording duration logic
- [x] Keep original state in `app/page.tsx` (parallel run)
- [x] **Test**: Start/stop recording, verify duration tracking

### Step 2.2: Transcript Manager Hook
- [x] Create `src/lib/hooks/conversation/useTranscriptManager.ts`
- [x] Move transcript state:
  - [x] `transcript`
  - [x] `lastSavedTranscriptIndex`
- [x] Move transcript-related functions:
  - [x] `handleLiveTranscript`
  - [x] Periodic save logic
- [x] Keep original functionality in parallel
- [x] **Test**: Record conversation, verify transcript saves

### Step 2.3: Session Management Hook
- [x] Create `src/lib/hooks/conversation/useConversationSession.ts`
- [x] Move session state:
  - [x] `currentSessionData`
  - [x] `isLoadingFromSession`
  - [x] `conversationId` logic
- [x] Move session loading functions:
  - [x] `loadSessionDetails`
  - [x] `loadSessionTranscript`
- [x] **Test**: Load existing session, create new session

### Step 2.4: UI State Hook
- [x] Create `src/lib/hooks/conversation/useConversationUI.ts`
- [x] Move UI state:
  - [x] `isFullscreen`
  - [x] `showTranscriptSidebar`
  - [x] `showSetupModal`
  - [x] `showRecordingConsent`
  - [x] Tab visibility logic
- [x] **Test**: Toggle UI elements, fullscreen mode

### Step 2.5: Handlers Consolidation Hook
- [x] Create `src/lib/hooks/conversation/useConversationHandlers.ts`
- [x] Group all handler functions
- [x] Create handler interface
- [x] **Test**: All buttons and interactions still work

## Phase 3: Extract Components (Top-Down)

### Step 3.1: Header Components
- [x] Create `src/components/conversation/ConversationHeader/index.tsx`
- [x] Extract header JSX (lines ~2418-2540)
- [x] Create `RecordingControls.tsx` sub-component
- [x] Create `ConversationStatus.tsx` sub-component
- [x] Pass props from main component
- [x] **Test**: Header displays correctly, all controls work

### Step 3.2: State Display Components
- [x] Create `src/components/conversation/ConversationStates/` directory
- [x] Extract Setup state UI → `SetupState.tsx`
- [x] Extract Ready state UI → `ReadyState.tsx`
- [x] Extract Recording state UI → `RecordingState.tsx`
- [x] Extract Processing state UI → `ProcessingState.tsx`
- [x] Extract Completed state UI → `CompletedState.tsx`
- [x] **Test**: Each state displays correctly

### Step 3.3: Layout Components
- [x] Create `src/components/conversation/ConversationLayout/index.tsx`
- [x] Extract main layout structure
- [x] Move sidebar logic to `ConversationSidebar.tsx`
- [x] Move main content to `ConversationMainContent.tsx`
- [x] **Test**: Layout responds correctly, sidebars work

### Step 3.4: Modal Management
- [x] Create `src/components/conversation/ConversationModals/index.tsx`
- [x] Consolidate all modal rendering logic
- [x] Pass modal state and handlers as props
- [x] **Test**: All modals open/close correctly

## Phase 4: Implement Context (Gradual Migration)

### Step 4.1: Create Context Structure
- [x] Create `src/contexts/ConversationContext.tsx`
- [x] Define context interface
- [x] Create provider component
- [x] Create reducer-based state management
- [x] Create convenience hooks for state access
- [x] **Test**: Context works correctly (21 tests passing)

### Step 4.2: Migrate Core State to Context
- [ ] Move `conversationState` to context
- [ ] Move `transcript` to context
- [ ] Move `sessionData` to context
- [ ] Update components to use context
- [ ] Keep local state as fallback
- [ ] **Test**: State updates work through context

### Step 4.3: Migrate Handlers to Context
- [ ] Move recording handlers to context
- [ ] Move UI handlers to context
- [ ] Remove prop drilling
- [ ] **Test**: All interactions work through context

## Phase 5: Cleanup and Optimization

### Step 5.1: Remove Duplicate Code
- [ ] Remove parallel state (kept for safety)
- [ ] Remove unused imports
- [ ] Remove commented code
- [ ] Consolidate similar logic
- [ ] **Test**: Full regression test

### Step 5.2: Performance Optimization
- [ ] Add React.memo to pure components
- [ ] Add useMemo for expensive computations
- [ ] Add useCallback for stable references
- [ ] Implement lazy loading for modals
- [ ] **Test**: Measure performance, ensure no regression

### Step 5.3: TypeScript Improvements
- [ ] Extract interfaces to separate files
- [ ] Add proper typing to all hooks
- [ ] Remove type assertions where possible
- [ ] Add JSDoc comments
- [ ] **Test**: No TypeScript errors

## Phase 6: Testing and Documentation

### Step 6.1: Unit Tests
- [ ] Write tests for `formatUtils`
- [ ] Write tests for `databaseOperations`
- [ ] Write tests for each custom hook
- [ ] Write tests for components
- [ ] Achieve >80% coverage
- [ ] **Test**: All unit tests pass

### Step 6.2: Integration Tests
- [ ] Test complete recording flow
- [ ] Test session persistence
- [ ] Test error scenarios
- [ ] Test edge cases
- [ ] **Test**: All integration tests pass

### Step 6.3: Documentation
- [ ] Update component documentation
- [ ] Document hook interfaces
- [ ] Update README with new structure
- [ ] Create migration guide
- [ ] **Test**: Documentation is accurate

## Phase 7: Final Steps

### Step 7.1: Code Review Preparation
- [ ] Run linter and fix issues
- [ ] Run prettier for formatting
- [ ] Check for console.logs
- [ ] Verify no TODO comments
- [ ] **Test**: Code passes all quality checks

### Step 7.2: Final Testing
- [ ] Full regression test
- [ ] Cross-browser testing
- [ ] Mobile responsiveness test
- [ ] Performance comparison
- [ ] **Test**: All functionality preserved

### Step 7.3: Deployment Preparation
- [ ] Update deployment scripts if needed
- [ ] Check bundle size
- [ ] Verify no breaking changes
- [ ] Prepare rollback plan
- [ ] **Test**: Deployment preview works

## Testing Checklist After Each Major Step

### Functional Tests
- [ ] Can create new conversation
- [ ] Can start/stop/pause recording
- [ ] Transcript updates in real-time
- [ ] Can add context and files
- [ ] AI guidance appears correctly
- [ ] Can finalize conversation
- [ ] Summary generates correctly
- [ ] Can export session
- [ ] Can navigate to dashboard
- [ ] Can view in fullscreen

### State Management Tests
- [ ] State persists on page refresh
- [ ] State loads from existing session
- [ ] State transitions work correctly
- [ ] Error states handled properly
- [ ] Loading states display correctly

### UI/UX Tests
- [ ] All buttons clickable
- [ ] Modals open/close properly
- [ ] Sidebars toggle correctly
- [ ] Responsive on mobile
- [ ] Dark mode works
- [ ] Animations smooth
- [ ] No layout shifts

### Integration Tests
- [ ] Database saves work
- [ ] API calls succeed
- [ ] WebRTC connection stable
- [ ] File uploads work
- [ ] Export functionality works

## Rollback Plan

If any step causes critical issues:
1. [ ] Revert to previous commit
2. [ ] Identify issue in isolated environment
3. [ ] Fix issue
4. [ ] Re-test thoroughly
5. [ ] Proceed with caution

## Success Criteria

Before considering refactoring complete:
- [ ] All original functionality preserved
- [ ] No performance regression
- [ ] Improved code maintainability
- [ ] Better test coverage
- [ ] Reduced file sizes
- [ ] Clear separation of concerns
- [ ] Team approval on structure

## Notes
- Take breaks between major phases
- Document any issues encountered
- Keep stakeholders updated on progress
- Celebrate small wins!