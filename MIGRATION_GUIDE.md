# Migration Guide: Monolithic App to State Machine Architecture

## Overview
This guide covers the migration from the 2,757-line monolithic component (`/app/app/page.tsx`) to the new state machine-based architecture (`/app/conversation/[id]/page.tsx`).

## Architecture Changes

### Before: Monolithic Component
- Single 2,757-line component
- 31+ state variables
- 40+ useEffects
- Tightly coupled logic
- Poor testability

### After: State Machine Architecture
- ~280-line main component
- State managed by XState
- Modular hooks and services
- 80%+ test coverage
- Clean separation of concerns

## Migration Path

### Phase 1: Parallel Deployment (Current State)
Both old and new implementations exist side-by-side:
- Old: `/app/app/page.tsx` (2,757 lines)
- New: `/app/conversation/[id]/page.tsx` (Server component + Client wrapper)

### Phase 2: Gradual Redirect
1. Add feature flag for gradual rollout
2. Redirect percentage of users to new route
3. Monitor for issues

### Phase 3: Full Migration
1. Update all links to point to new routes
2. Add permanent redirect from old route
3. Archive old component

## Route Mapping

| Old Route | New Route | Notes |
|-----------|-----------|-------|
| `/app` | `/conversation/new` | Creates new session |
| `/app?session={id}` | `/conversation/{id}` | Direct session access |
| `/app/demo` | `/demo` | Demo mode |

## Feature Parity Checklist

### Core Features
- [x] Real-time transcription (Deepgram)
- [x] AI-powered guidance
- [x] Session management
- [x] Summary generation
- [x] Minute tracking
- [x] File uploads
- [x] Context management
- [x] Export functionality

### UI Components
- [x] Recording controls
- [x] Transcript display
- [x] Summary pane
- [x] Context drawer
- [x] Header navigation
- [x] Mobile responsive

### State Management
- [x] Recording states (ready, recording, paused, finalizing)
- [x] Error handling
- [x] Loading states
- [x] Optimistic updates

## Code Structure

### Old Structure
```
/app/app/page.tsx (monolith)
```

### New Structure
```
/app/conversation/[id]/
  ├── page.tsx              # Server component
  └── ConversationClient.tsx # Client component

/hooks/conversation/
  ├── useDeepgram.ts       # WebSocket management
  ├── useTranscript.ts     # Transcript state
  ├── useSessionSync.ts    # React Query integration
  ├── useSummary.ts        # Summary generation
  └── usePageVisibility.ts # Tab management

/machines/
  └── conversationMachine.ts # XState machine

/components/conversation/
  ├── Header.tsx
  ├── Controls.tsx
  ├── TranscriptPane.tsx
  ├── SummaryPane.tsx
  └── ContextDrawer.tsx
```

## API Compatibility

All API endpoints remain the same:
- `POST /api/sessions` - Create session
- `GET /api/sessions/{id}` - Get session
- `PATCH /api/sessions/{id}` - Update session
- `POST /api/sessions/{id}/finalize` - Finalize session
- `POST /api/summary` - Generate summary
- `POST /api/guidance` - Get AI guidance

## Testing Strategy

### Unit Tests
```bash
npm test -- useDeepgram.test.ts
npm test -- useTranscript.test.ts
npm test -- useSessionSync.test.ts
npm test -- useSummary.test.ts
```

### Integration Tests
```bash
npm test -- conversation-flow.test.tsx
```

### E2E Tests (Recommended)
- Test full recording flow
- Test summary generation
- Test export functionality
- Test error scenarios

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**
   - Remove redirect logic
   - Point all routes back to old component
   - Monitor and fix issues

2. **Partial Rollback**
   - Keep new implementation
   - Fix specific issues
   - Re-deploy gradually

## Performance Improvements

### Bundle Size
- Old: Single large chunk
- New: Code-split with lazy loading

### Render Performance
- React.memo on heavy components
- Memoized computations
- Virtual scrolling for transcripts

### Memory Usage
- Singleton AudioContext
- Proper cleanup on unmount
- Throttled updates

## Monitoring Checklist

During migration, monitor:
- [ ] Error rates
- [ ] API response times
- [ ] Client-side performance
- [ ] User engagement metrics
- [ ] Session completion rates
- [ ] Audio quality issues

## Common Issues & Solutions

### Issue 1: State Not Persisting
**Solution**: Check React Query cache configuration

### Issue 2: WebSocket Disconnections
**Solution**: Exponential backoff implemented in useDeepgram

### Issue 3: Summary Not Updating
**Solution**: Check throttle intervals in useSummary

### Issue 4: Minute Tracking Mismatch
**Solution**: Verify state machine guards

## Developer Notes

### Adding New Features
1. Update state machine if needed
2. Create/update hooks
3. Update UI components
4. Add tests
5. Update this guide

### Debugging
- Use XState inspector for state debugging
- React Query devtools for cache inspection
- Check browser console for WebSocket issues

## Timeline

1. **Week 1-2**: Feature flag implementation
2. **Week 3-4**: Gradual rollout (10% → 50% → 100%)
3. **Week 5**: Full migration
4. **Week 6**: Remove old code

## Support

For issues during migration:
1. Check error logs
2. Review this guide
3. Check test coverage
4. Create detailed bug reports

---

**Last Updated**: January 2024
**Status**: Ready for migration
**Approval**: Pending