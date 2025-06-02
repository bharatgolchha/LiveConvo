# Summary Save/Load Test Checklist

## Problem
When a real summary is generated during a conversation, it's not being properly saved to the database's `realtime_summary_cache` field, so when the page reloads, only a placeholder is shown.

## Changes Made

### 1. Enhanced Logging
- Added detailed logging to `saveSummaryToDatabase` in `/lib/conversation/databaseOperations.ts`
- Added logging to PATCH endpoint in `/api/sessions/[id]/route.ts`
- Added debug logging for summary state changes in `/app/app/page.tsx`

### 2. Force Summary on Stop
- Modified `handleStopRecording` to force a final summary generation before stopping
- Added proper error handling to continue stopping even if summary save fails
- Made `handleStopRecording` async to wait for summary generation

### 3. Summary Page Enhancement
- Modified `/app/summary/[id]/page.tsx` to check `realtime_summary_cache` field first
- Falls back to finalized summaries if no realtime cache exists

### 4. Auto-save Improvements
- Added error handling to auto-save effect
- Improved logging to track when and why summaries are saved

## Test Flow

1. **Start a new conversation**
   - Check console for "Summary State Debug" logs
   - Verify initial state shows no summary

2. **Record for ~1 minute to generate content**
   - Watch for "Summary Generation Check" logs
   - Verify summary is generated (look for "Summary API Success")
   - Check for "Auto-saving summary to database" log
   - Verify "Summary saved successfully to database" appears

3. **Stop recording**
   - Check for "Forcing final summary generation before stopping" log
   - Verify "Saving final summary on stop recording" log
   - Confirm "Summary saved successfully to database"

4. **Reload the page**
   - Check for "Summary loaded from database cache" log
   - Verify the summary content is displayed (not placeholder)

5. **Navigate to summary page**
   - Go to `/summary/[sessionId]`
   - Check for "Loaded realtime summary cache" log
   - Verify summary content is displayed correctly

## Expected Logs

### During Recording
```
🔍 Summary State Debug: { hasRawSummary: true, ... }
💾 Auto-saving summary to database: { conversationState: 'recording', ... }
💾 Saving summary to database: { sessionId: '...', hasSummary: true, ... }
💾 Updating realtime_summary_cache: { sessionId: '...', ... }
✅ Summary saved successfully to database
```

### On Stop
```
🔄 Forcing final summary generation before stopping...
🔴 Saving final summary on stop recording: { keyPointsCount: X, ... }
💾 Saving summary to database: { sessionId: '...', ... }
✅ Summary saved successfully to database
```

### On Page Load
```
✅ Summary loaded from database cache: { tldr: '...', keyPoints: [...], ... }
```

### On Summary Page
```
💾 Loaded realtime summary cache: { hasTldr: true, keyPointsCount: X, ... }
```

## Debugging Tips

1. If summary not saving:
   - Check network tab for PATCH request to `/api/sessions/[id]`
   - Verify request body contains `realtime_summary_cache` field
   - Check response status (should be 200)

2. If summary not loading:
   - Check GET request to `/api/sessions/[id]`
   - Verify response includes `realtime_summary_cache` field
   - Check if data is properly parsed (not string)

3. Database verification:
   - Query the database directly:
   ```sql
   SELECT id, title, realtime_summary_cache 
   FROM sessions 
   WHERE id = 'SESSION_ID';
   ```
   - Verify `realtime_summary_cache` contains JSON data

## Common Issues

1. **Race condition**: Summary might not be generated before save
   - Solution: Force refresh before stopping recording

2. **Parsing errors**: Summary might be saved as string instead of JSON
   - Solution: Check parsing logic in both save and load

3. **State mismatch**: Summary only saves during 'recording' or 'completed' states
   - Solution: Verify conversation state when saving