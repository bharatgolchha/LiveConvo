# App Page Refactoring Plan

## Overview
The current `app/page.tsx` file is a monolithic component with 2,757 lines of code. This refactoring plan aims to break down this large file into smaller, more maintainable, and testable components while preserving all existing functionality.

## Current Issues
1. **File Size**: 2,757 lines in a single file makes it difficult to maintain and debug
2. **Mixed Concerns**: UI, business logic, state management, and API calls are all mixed together
3. **Complex State Management**: 30+ useState hooks managing various aspects of the application
4. **Duplicate Logic**: Similar patterns repeated across different handlers
5. **Testing Difficulty**: Large component is hard to unit test effectively
6. **Performance**: Re-renders affect the entire component tree

## Refactoring Strategy

### Phase 1: Extract Custom Hooks (Priority: High)
Break out state management and business logic into custom hooks:

#### 1.1 `useConversationSession`
- Manages session state (conversationId, sessionData, isLoadingFromSession)
- Handles session loading and updates
- Manages session persistence to localStorage
- Includes session finalization logic

#### 1.2 `useTranscriptManager`
- Manages transcript state and updates
- Handles transcript saving to database
- Manages lastSavedTranscriptIndex
- Includes periodic save functionality
- Handles transcript loading from database

#### 1.3 `useRecordingState`
- Manages recording state (recording, paused, stopped)
- Handles recording duration tracking
- Manages cumulative duration
- Handles recording start/stop/pause/resume logic

#### 1.4 `useConversationUI`
- Manages UI state (fullscreen, sidebar visibility, modals)
- Handles tab visibility and page lifecycle
- Manages prevent unload functionality

#### 1.5 `useConversationHandlers`
- Consolidates all handler functions
- Reduces prop drilling
- Provides clean interface for components

### Phase 2: Extract Components (Priority: High)

#### 2.1 Header Components
- `ConversationHeader`: Main header with navigation and status
- `RecordingControls`: Recording control buttons
- `ConversationStatus`: Status indicators and badges
- `UsageIndicator`: Usage display component

#### 2.2 Layout Components
- `ConversationLayout`: Main layout wrapper
- `ConversationSidebar`: Sidebar management (AI Coach, Transcript)
- `ConversationMainContent`: Central content area

#### 2.3 Modal Components
- `ConversationModals`: Wrapper for all modal states
- Extract existing modals to use consistent patterns

#### 2.4 State Display Components
- `ConversationStateDisplay`: Different UI states (setup, ready, recording, etc.)
- `ProcessingView`: Processing animation and state
- `CompletedView`: Completed conversation view

### Phase 3: Extract Utilities (Priority: Medium)

#### 3.1 Database Operations
Create `lib/conversation/databaseOperations.ts`:
- `saveTranscriptToDatabase`
- `saveTranscriptNow`
- `saveSummaryToDatabase`
- `loadSessionDetails`
- `loadSessionTranscript`

#### 3.2 State Utilities
Create `lib/conversation/stateUtils.ts`:
- State transition logic
- State validation
- State persistence utilities

#### 3.3 Format Utilities
Create `lib/conversation/formatUtils.ts`:
- `formatDuration`
- `formatTranscript`
- Other formatting functions

### Phase 4: Implement State Management Pattern (Priority: Medium)

#### 4.1 Create Conversation Context
- Centralize conversation state
- Reduce prop drilling
- Improve performance with selective updates

#### 4.2 Use Reducer Pattern
- Replace multiple useState with useReducer
- Define clear action types
- Centralize state update logic

### Phase 5: Performance Optimizations (Priority: Low)

#### 5.1 Memoization
- Use React.memo for pure components
- Use useMemo for expensive computations
- Use useCallback for stable function references

#### 5.2 Code Splitting
- Lazy load heavy components (modals, sidebars)
- Dynamic imports for optional features

## Implementation Plan

### Step 1: Create Hook Structure (Week 1)
1. Create `lib/hooks/conversation/` directory
2. Implement `useConversationSession` hook
3. Implement `useTranscriptManager` hook
4. Implement `useRecordingState` hook
5. Test each hook individually

### Step 2: Extract Database Operations (Week 1)
1. Create database operation utilities
2. Move all API calls to utilities
3. Add proper error handling
4. Add retry logic where appropriate

### Step 3: Create Component Structure (Week 2)
1. Create component directories
2. Extract header components
3. Extract layout components
4. Extract state display components
5. Update imports and props

### Step 4: Implement Context (Week 2)
1. Create ConversationContext
2. Migrate state to context
3. Update components to use context
4. Remove prop drilling

### Step 5: Testing & Optimization (Week 3)
1. Write unit tests for hooks
2. Write component tests
3. Performance profiling
4. Apply optimizations

## File Structure After Refactoring

```
src/
├── app/
│   └── app/
│       └── page.tsx (reduced to ~200 lines)
├── components/
│   └── conversation/
│       ├── ConversationHeader/
│       │   ├── index.tsx
│       │   ├── RecordingControls.tsx
│       │   ├── ConversationStatus.tsx
│       │   └── UsageIndicator.tsx
│       ├── ConversationLayout/
│       │   ├── index.tsx
│       │   ├── ConversationSidebar.tsx
│       │   └── ConversationMainContent.tsx
│       ├── ConversationStates/
│       │   ├── SetupState.tsx
│       │   ├── ReadyState.tsx
│       │   ├── RecordingState.tsx
│       │   ├── ProcessingState.tsx
│       │   └── CompletedState.tsx
│       └── ConversationModals/
│           └── index.tsx
├── lib/
│   ├── hooks/
│   │   └── conversation/
│   │       ├── useConversationSession.ts
│   │       ├── useTranscriptManager.ts
│   │       ├── useRecordingState.ts
│   │       ├── useConversationUI.ts
│   │       └── useConversationHandlers.ts
│   └── conversation/
│       ├── databaseOperations.ts
│       ├── stateUtils.ts
│       └── formatUtils.ts
└── contexts/
    └── ConversationContext.tsx
```

## Testing Strategy

### Unit Tests
- Test each hook in isolation
- Test utility functions
- Test component render and interactions

### Integration Tests
- Test data flow between hooks
- Test state transitions
- Test API interactions

### E2E Tests
- Test complete recording flow
- Test session persistence
- Test error scenarios

## Migration Strategy

1. **Create new files alongside existing code**
2. **Gradually move functionality**
3. **Maintain backward compatibility**
4. **Test at each step**
5. **Deploy incrementally**

## Risk Mitigation

1. **Maintain Feature Parity**: Ensure no functionality is lost
2. **Incremental Changes**: Small, testable changes
3. **Comprehensive Testing**: Test each change thoroughly
4. **Rollback Plan**: Keep old code until new code is stable
5. **Performance Monitoring**: Track performance metrics

## Success Metrics

1. **Code Maintainability**: Reduced file sizes, clear separation of concerns
2. **Test Coverage**: >80% coverage for new code
3. **Performance**: No regression in load times or interaction speed
4. **Developer Experience**: Easier to understand and modify code
5. **Bug Reduction**: Fewer bugs due to clearer code structure

## Timeline

- **Week 1**: Hooks and utilities extraction
- **Week 2**: Component extraction and context implementation
- **Week 3**: Testing, optimization, and cleanup
- **Week 4**: Final testing, documentation, and deployment

## Notes

- All existing functionality must be preserved
- TypeScript types should be properly maintained
- Follow existing code style and conventions
- Ensure proper error handling throughout
- Maintain accessibility features
- Keep performance characteristics similar or better