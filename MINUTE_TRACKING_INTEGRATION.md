# Minute Tracking Integration Summary

## Overview
Successfully integrated the minute tracking functionality with the XState conversation state machine, ensuring proper usage quota enforcement and real-time tracking.

## Key Changes

### 1. State Machine Updates
- Added `UPDATE_MINUTE_TRACKING` event to sync minute tracking state with the machine
- Updated the recording guard to check:
  - `context.canRecord` - Whether user has minutes remaining
  - `context.authSession !== null` - User is authenticated
  - `context.minutesRemaining > 0` - Has available minutes
- Added minute tracking fields to machine context:
  - `currentSessionMinutes`
  - `canRecord`
  - `minutesRemaining`

### 2. Event Handling
- `USAGE_LIMIT_REACHED` - Triggers transition to finalizing state
- `APPROACHING_USAGE_LIMIT` - Logs warning (can trigger UI notifications)
- `UPDATE_MINUTE_TRACKING` - Updates context with latest tracking data

### 3. ConversationClient Integration
```typescript
// Minute tracking hook with callbacks
const minuteTracking = useMinuteTracking({
  sessionId: context.sessionId,
  isRecording: state.matches('recording'),
  onLimitReached: () => send({ type: 'USAGE_LIMIT_REACHED' }),
  onApproachingLimit: (minutes) => send({ type: 'APPROACHING_USAGE_LIMIT', minutesRemaining: minutes }),
});

// Sync tracking data with state machine
useEffect(() => {
  send({
    type: 'UPDATE_MINUTE_TRACKING',
    canRecord: minuteTracking.canRecord,
    minutesRemaining: minuteTracking.minutesRemaining,
    currentSessionMinutes: minuteTracking.currentSessionMinutes,
  });
}, [minuteTracking.canRecord, minuteTracking.minutesRemaining, minuteTracking.currentSessionMinutes, send]);
```

### 4. Recording State Management
- Start tracking when entering recording state
- Stop tracking when pausing or stopping
- Resume tracking when resuming from pause
- Proper cleanup on state transitions

### 5. Benefits Achieved
- **Deterministic quota enforcement** - Can't start recording without minutes
- **Real-time tracking** - Minutes update as recording progresses
- **Automatic limit handling** - Recording stops when limit reached
- **State consistency** - Machine context always reflects current usage
- **Separation of concerns** - Tracking logic isolated in hook

## Testing Considerations
- Guard prevents recording when `canRecord` is false
- Limit reached event triggers proper finalization
- Tracking starts/stops with recording state changes
- Context updates don't cause unnecessary re-renders

## Future Enhancements
- Add visual warnings when approaching limit
- Implement grace period for finishing thoughts
- Add ability to purchase additional minutes mid-recording
- Track usage analytics for insights