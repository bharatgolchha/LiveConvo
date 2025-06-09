# Conversation State Machine Documentation

## Overview
The conversation state machine manages the entire lifecycle of a recording session using XState v5. It provides a predictable, testable way to handle complex recording flows.

## State Diagram

```
┌─────────┐
│  setup  │ (Initial state)
└────┬────┘
     │ READY
     ▼
┌─────────┐     START      ┌───────────┐
│  ready  │ ─────────────> │ recording │
└─────────┘                └─────┬─────┘
     ▲                           │ PAUSE
     │                           ▼
     │                     ┌─────────┐
     │      RESUME         │ paused  │
     └─────────────────────└─────────┘
                                 │
                                 │ STOP
                                 ▼
                           ┌────────────┐
                           │ finalizing │
                           └─────┬──────┘
                                 │ COMPLETE
                                 ▼
                           ┌───────────┐
                           │ completed │
                           └───────────┘

         ┌─────────┐
         │  error  │ (Can be reached from any state)
         └─────────┘
```

## States

### `setup`
- **Purpose**: Initial configuration and permission checks
- **Entry Actions**: Check microphone permissions
- **Transitions**: 
  - `READY` → `ready` (when permissions granted)
  - `ERROR` → `error` (if permissions denied)

### `ready`
- **Purpose**: Ready to start recording
- **Context**: Session initialized, permissions granted
- **Guards**: `canStartRecording` (checks minute quota)
- **Transitions**:
  - `START` → `recording`
  - `ERROR` → `error`

### `recording`
- **Purpose**: Active recording state
- **Activities**: Audio streaming, transcript updates
- **Services**: `startRecording` (Deepgram connection)
- **Transitions**:
  - `PAUSE` → `paused`
  - `STOP` → `finalizing`
  - `ERROR` → `error`

### `paused`
- **Purpose**: Recording temporarily paused
- **Entry Actions**: Pause audio stream
- **Transitions**:
  - `RESUME` → `recording`
  - `STOP` → `finalizing`
  - `ERROR` → `error`

### `finalizing`
- **Purpose**: Processing and saving session data
- **Services**: `finalizeSession` (generates summary, saves data)
- **Transitions**:
  - `COMPLETE` → `completed`
  - `ERROR` → `error`

### `completed`
- **Purpose**: Session successfully completed
- **Entry Actions**: Clean up resources
- **Final State**: Yes

### `error`
- **Purpose**: Error handling state
- **Context**: Error details stored
- **Actions**: Log error, notify user

## Context Schema

```typescript
interface ConversationContext {
  sessionId: string | null;
  session: SessionDataFull | null;
  transcript: TranscriptLine[];
  summary: SummaryData | null;
  error: Error | null;
  recordingStartTime: Date | null;
  recordingDuration: number;
  
  // Minute tracking
  canRecord: boolean;
  minutesRemaining: number;
  currentSessionMinutes: number;
  
  // Audio state
  isAudioEnabled: boolean;
  stream: MediaStream | null;
}
```

## Events

### Control Events
- `START` - Begin recording
- `PAUSE` - Pause recording
- `RESUME` - Resume recording
- `STOP` - End recording
- `COMPLETE` - Finalize completed
- `ERROR` - Error occurred

### Update Events
- `UPDATE_TRANSCRIPT` - New transcript segment
- `UPDATE_SUMMARY` - Summary updated
- `UPDATE_MINUTE_TRACKING` - Quota changed
- `TOGGLE_AUDIO` - Mute/unmute

## Services

### `startRecording`
Connects to Deepgram and begins audio streaming.

```typescript
startRecording: fromPromise(async ({ input }) => {
  const { deepgramHook, transcriptHook } = input;
  await deepgramHook.connect();
  await deepgramHook.startStreaming(input.stream);
  return { success: true };
})
```

### `pauseRecording`
Temporarily stops audio streaming.

```typescript
pauseRecording: ({ context }) => {
  context.deepgramHook?.stopStreaming();
}
```

### `finalizeSession`
Generates final summary and saves all data.

```typescript
finalizeSession: fromPromise(async ({ input }) => {
  const { sessionId, transcript, summary } = input;
  const response = await fetch(`/api/sessions/${sessionId}/finalize`, {
    method: 'POST',
    body: JSON.stringify({ transcript, summary })
  });
  return response.json();
})
```

## Guards

### `canStartRecording`
Checks if user has available minutes.

```typescript
canStartRecording: ({ context }) => {
  return context.canRecord && context.minutesRemaining > 0;
}
```

### `hasTranscript`
Ensures transcript exists before finalizing.

```typescript
hasTranscript: ({ context }) => {
  return context.transcript.length > 0;
}
```

## Actions

### `logError`
Logs error details for debugging.

```typescript
logError: ({ context, event }) => {
  console.error('State machine error:', {
    error: event.error,
    state: context,
    timestamp: new Date()
  });
}
```

### `updateTranscript`
Adds new transcript segment.

```typescript
updateTranscript: assign({
  transcript: ({ context, event }) => [
    ...context.transcript,
    event.segment
  ]
})
```

## Usage Example

```typescript
import { useMachine } from '@xstate/react';
import { conversationMachine } from '@/machines/conversationMachine';

function ConversationComponent() {
  const [state, send] = useMachine(conversationMachine, {
    input: {
      sessionId: 'session-123',
      deepgramHook: useDeepgram(),
      transcriptHook: useTranscript()
    }
  });

  // Start recording
  const handleStart = () => {
    send({ type: 'START' });
  };

  // Check current state
  if (state.matches('recording')) {
    return <div>Recording in progress...</div>;
  }
}
```

## Testing

### State Transitions
```typescript
test('should transition from ready to recording', async () => {
  const actor = createActor(conversationMachine);
  actor.start();
  
  actor.send({ type: 'READY' });
  expect(actor.getSnapshot().value).toBe('ready');
  
  actor.send({ type: 'START' });
  expect(actor.getSnapshot().value).toBe('recording');
});
```

### Guard Conditions
```typescript
test('should prevent recording without minutes', () => {
  const actor = createActor(conversationMachine, {
    input: { canRecord: false, minutesRemaining: 0 }
  });
  
  actor.start();
  actor.send({ type: 'READY' });
  actor.send({ type: 'START' });
  
  // Should remain in ready state
  expect(actor.getSnapshot().value).toBe('ready');
});
```

## Best Practices

1. **Always handle errors**: Every service should have error handling
2. **Use guards**: Validate state transitions with guard conditions
3. **Keep context minimal**: Only store essential state
4. **Test thoroughly**: Cover all state transitions and edge cases
5. **Log state changes**: Use actions to log important transitions

## Debugging

Enable XState inspector in development:

```typescript
const machine = createMachine({
  // ... machine config
}, {
  devTools: process.env.NODE_ENV === 'development'
});
```

View state transitions in browser DevTools or XState Inspector.

## Future Enhancements

1. **Parallel States**: Handle multiple recordings
2. **History States**: Remember previous state after errors
3. **Persisted State**: Save/restore machine state
4. **Time-based Transitions**: Auto-stop after time limit
5. **Advanced Guards**: More complex permission checks

---

**Version**: 1.0.0
**Last Updated**: January 2024
**XState Version**: 5.x