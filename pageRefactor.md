# Page Refactor Checklist - app/page.tsx

## Overview
Complete architectural refactor of `frontend/src/app/app/page.tsx` from a 2,757-line god-component into a modern, state-machine driven architecture.

## Current Status
- [✅] Started
- [✅] Major Refactoring Complete (Phases 0-7)
- [🔄] Migration & Cleanup In Progress (Phase 8)
- [ ] Fully Completed

## Phase 0: Architecture Decision & Setup 🏗️

### 0.1 State Machine Setup
- [✅] Install XState: `npm install xstate @xstate/react`
- [✅] Install React Query: `npm install @tanstack/react-query`
- [⏭️] Install development tools: `npm install -D @xstate/inspect` (skipped due to peer dependency conflict)
- [✅] Create `/frontend/src/machines/` directory
- [✅] Create `/frontend/src/hooks/conversation/` directory

### 0.2 Type Definitions
- [✅] Move all types from app/page.tsx to `/frontend/src/types/conversation.ts`
- [✅] Define state machine context type
- [✅] Define state machine events type
- [✅] Export all conversation-related types

## Phase 1: Design & Build the State Machine 🎯

### 1.1 Create Conversation State Machine
- [✅] Create `/frontend/src/machines/conversationMachine.ts`
- [✅] Define all states:
  - [✅] `setup` - Initial configuration
  - [✅] `ready` - Ready to record
  - [✅] `recording` - Active recording
  - [✅] `paused` - Recording paused
  - [✅] `finalizing` - Processing and saving
  - [✅] `completed` - Session complete
  - [✅] `error` - Error state
- [✅] Define all transitions:
  - [✅] `READY` (setup → ready)
  - [✅] `START` (ready → recording)
  - [✅] `PAUSE` (recording → paused)
  - [✅] `RESUME` (paused → recording)
  - [✅] `STOP` (recording/paused → finalizing)
  - [✅] `COMPLETE` (finalizing → completed)
  - [✅] `ERROR` (any → error)
- [✅] Define machine context (all shared state)
- [✅] Define guards for conditional transitions

### 1.2 Machine Services & Actions
- [✅] Create `startRecording` service (connects Deepgram, starts tracking)
- [✅] Create `pauseRecording` action
- [✅] Create `resumeRecording` service
- [✅] Create `finalizeSession` service (saves data, generates summary)
- [✅] Create `saveTranscript` action (throttled)
- [✅] Add error handling for all services

### 1.3 Test the State Machine
- [✅] Write unit tests for all state transitions
- [✅] Test guard conditions
- [✅] Test service invocations
- [✅] Test error scenarios
- [✅] Verify no invalid state combinations
- [✅] Fix XState v5 test syntax issues

## Phase 2: Extract Core Hooks 🪝

### 2.1 Deepgram Hook
- [✅] Create `/frontend/src/hooks/conversation/useDeepgram.ts`
- [✅] Extract WebSocket connection logic
- [✅] Handle connection/reconnection
- [✅] Stream transcript segments
- [✅] Clean up on unmount
- [✅] Add proper TypeScript types
- [✅] Production-ready rewrite with all issues fixed:
  - [✅] API key caching with TTL
  - [✅] Connection lifecycle management
  - [✅] AudioContext singleton pattern (avoid Chrome's 6-context limit)
  - [✅] Full TypeScript typing (Observable<TranscriptSegment>)
  - [✅] Exponential backoff reconnection
  - [✅] Browser compatibility (Safari AudioContext)
  - [✅] Connection quality monitoring
  - [✅] Pending audio queue for dropped connections
  - [✅] AudioWorklet with ScriptProcessor fallback

### 2.2 Transcript Hook
- [✅] Create `/frontend/src/hooks/conversation/useTranscript.ts`
- [✅] Accept transcript segments from Deepgram
- [✅] Maintain transcript array
- [✅] Calculate talk statistics
- [✅] Expose throttled save function
- [✅] Handle speaker detection

### 2.3 Session Sync Hook
- [✅] Create `/frontend/src/hooks/conversation/useSessionSync.ts`
- [✅] Wrap with React Query
- [✅] Handle session creation/updates
- [✅] Cache session data
- [✅] Auto-retry failed requests
- [✅] Optimistic updates

### 2.4 Summary Hook
- [✅] Create `/frontend/src/hooks/conversation/useSummary.ts`
- [✅] Real-time summary generation
- [✅] Cache with React Query
- [✅] Handle incremental updates
- [✅] Export summary data

### 2.5 Minute Quota Hook
- [✅] Review existing `useMinuteTracking.ts`
- [✅] Integrate with state machine events
- [✅] Add quota checks to machine guards
- [✅] Handle limit reached scenarios

### 2.6 Page Visibility Hook
- [✅] Create `/frontend/src/hooks/conversation/usePageVisibility.ts`
- [✅] Extract visibility change logic
- [✅] Handle tab switching
- [✅] Integrate with machine pause/resume
- [✅] Add beforeunload protection

## Phase 3: Split UI Components 🎨

### 3.1 Header Component
- [✅] Create `/frontend/src/components/conversation/Header.tsx`
- [✅] Extract navigation elements
- [✅] Move title display
- [✅] Add recording status indicator
- [✅] Pure presentational component

### 3.2 Recording Controls
- [✅] Create `/frontend/src/components/conversation/Controls.tsx`
- [✅] Start/Pause/Resume/Stop buttons
- [✅] Duration display
- [✅] Status indicators
- [✅] Accept callbacks as props

### 3.3 Transcript Pane
- [✅] Create `/frontend/src/components/conversation/TranscriptPane.tsx`
- [✅] Display transcript lines
- [✅] Virtual scrolling for performance
- [✅] Speaker indicators
- [✅] Confidence scores

### 3.4 Summary Pane
- [✅] Create `/frontend/src/components/conversation/SummaryPane.tsx`
- [✅] Display real-time summary
- [✅] Show key points
- [✅] Action items
- [✅] Export functionality

### 3.5 Context Drawer
- [✅] Create `/frontend/src/components/conversation/ContextDrawer.tsx`
- [✅] File upload UI
- [✅] Text context input
- [✅] Previous conversations selector
- [✅] Document display

## Phase 4: Server Component & Client Wrapper 🖥️

### 4.1 Server Component
- [✅] Move page to `/frontend/src/app/conversation/[id]/page.tsx`
- [✅] Create server component for initial data fetch
- [✅] Load session data server-side
- [✅] Pass to client component as props
- [✅] Handle authentication

### 4.2 Client Component
- [✅] Create `ConversationClient.tsx`
- [✅] Initialize state machine with server data
- [✅] Compose all hooks
- [✅] Render UI components
- [⚠️] Target: ~200 lines max (currently ~280 lines)

### 4.3 Layout Optimization
- [✅] Use CSS Grid for layout
- [✅] Remove inline styles
- [✅] Responsive design tokens
- [✅] Proper spacing system

## Phase 5: React Query Integration 📡

### 5.1 Query Client Setup
- [✅] Configure React Query provider
- [✅] Set default retry/stale times
- [✅] Add error boundary
- [✅] Configure dev tools

### 5.2 Mutations
- [✅] Create session mutation
- [✅] Update session mutation
- [✅] Save transcript mutation
- [✅] Generate summary mutation
- [✅] Upload document mutation

### 5.3 Queries
- [✅] Fetch session query
- [✅] Fetch transcript query
- [✅] Fetch documents query
- [✅] User quota query
- [✅] Previous sessions query

### 5.4 Optimistic Updates
- [✅] Transcript updates
- [✅] Session status changes
- [✅] Document uploads
- [✅] Context changes

## Phase 6: Performance Optimization 🚀

### 6.1 Code Splitting
- [✅] Lazy load modals with `next/dynamic`
- [✅] Split heavy components
- [ ] Analyze bundle size
- [✅] Remove unused imports

### 6.2 Memoization
- [✅] Memoize expensive computations (TranscriptPane, SummaryPane)
- [✅] Add React.memo to pure components (TranscriptPane, SummaryPane, Header)
- [✅] Optimize re-renders with custom comparison functions
- [ ] Profile with React DevTools

### 6.3 Asset Optimization
- [ ] Create icon sprite/barrel export
- [✅] Optimize SVG imports
- [✅] Remove console.logs in production
- [ ] Tree-shake unused code

## Phase 7: Testing Strategy 🧪

### 7.1 State Machine Tests
- [✅] Test all state transitions
- [✅] Test guard conditions
- [✅] Test service failures
- [✅] Snapshot test machine config

### 7.2 Hook Tests
- [✅] Test useDeepgram connection
- [✅] Test useTranscript operations
- [✅] Test React Query hooks (useSessionSync, useSummary)
- [✅] Mock external services

### 7.3 Component Tests
- [✅] Test pure UI components (TranscriptPane, SummaryPane)
- [✅] Test user interactions
- [ ] Visual regression tests
- [ ] Accessibility tests

### 7.4 Integration Tests
- [✅] Full conversation flow
- [✅] Error scenarios
- [✅] Edge cases
- [ ] Performance benchmarks

## Phase 8: Migration & Cleanup 🧹

### 8.1 Gradual Migration
- [✅] Run old and new versions in parallel (both routes exist)
- [✅] Create redirect component for old route
- [ ] A/B test with feature flag
- [ ] Monitor for issues
- [ ] Gather metrics

### 8.2 Remove Old Code
- [ ] Delete old app/page.tsx (after migration complete)
- [ ] Remove unused utilities
- [ ] Clean up old types
- [ ] Update imports

### 8.3 Documentation
- [✅] Document state machine (STATE_MACHINE_DOCS.md created)
- [ ] API documentation
- [ ] Component storybook
- [✅] Migration guide (MIGRATION_GUIDE.md created)

## Success Metrics 📊

### Before Refactoring
- Lines of Code: 2,757
- State Variables: 31+
- useEffects: 40+
- Testability: Poor
- Performance: Degraded

### Target After Refactoring
- Main Component: ~200 lines
- State: Managed by XState
- Side Effects: Isolated in services
- Test Coverage: >80%
- Performance: Optimized

## Directory Structure 📁

```
/app
  /conversation
    /[id]
      page.tsx              // Server component
      ConversationClient.tsx
/hooks
  /conversation
    useDeepgram.ts
    useTranscript.ts
    useSessionSync.ts
    useSummary.ts
/machines
  conversationMachine.ts
  conversationMachine.test.ts
/components
  /conversation
    Header.tsx
    Controls.tsx
    TranscriptPane.tsx
    SummaryPane.tsx
    ContextDrawer.tsx
/lib
  /api
    mutations.ts
    queries.ts
/types
  conversation.ts
```

## Implementation Order 🎯

1. **Week 1**: State machine + tests (Phase 1)
2. **Week 2**: Core hooks extraction (Phase 2)
3. **Week 3**: UI components + Client wrapper (Phase 3-4)
4. **Week 4**: React Query + Performance (Phase 5-6)
5. **Week 5**: Testing + Migration (Phase 7-8)

## Dev Safeguards 🛡️

- [✅] ESLint rule: `max-lines-per-function: 300`
- [✅] ESLint rule: `max-lines: 500` per file
- [✅] Additional rules: complexity, max-depth, max-nested-callbacks
- [ ] Pre-commit hook for type checking
- [ ] Bundle size monitoring
- [ ] Required PR reviews

---

**Status Legend:**
- [ ] Not Started
- [🔄] In Progress
- [✅] Completed
- [❌] Blocked
- [⏭️] Skipped