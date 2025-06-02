# Summary Save/Load Fix Test Checklist

## The Issue
When a page with a completed conversation is reloaded, the summary shows a placeholder message instead of the actual summary content that was generated during the conversation.

## Root Causes Identified
1. Placeholder summaries were being saved to the database when transcript was too short
2. The loaded placeholder was overriding any attempt to generate a real summary
3. The force refresh wasn't clearing the placeholder before generating new content

## Fixes Applied

### 1. Prevent Placeholder Save
- Added extra check in auto-save to skip saving if tldr contains placeholder text
- This ensures only real summaries with content are saved to the database

### 2. Clear Placeholder on Force Refresh
- When force-refreshing summary for a loaded session, clear any placeholder summary first
- This allows the new generation to properly replace the placeholder

### 3. Prioritize Loaded Summary for Completed Sessions
- The `effectiveSummary` logic now prioritizes loaded summary for completed sessions
- This ensures database content is used when available

### 4. Enhanced Stop Recording
- When stopping recording, force a final summary refresh if content > 40 words
- Explicitly save the final summary before marking session as completed
- Added error handling to not block stop action if save fails

## Test Steps

### Test 1: New Recording with Summary
1. Start a new conversation
2. Record for at least 1 minute (ensure > 40 words spoken)
3. Watch console for:
   - "✅ Summary: Starting generation" logs
   - "💾 Auto-saving summary to database" logs
   - Summary content preview in logs (not placeholder)
4. Stop recording
5. Should see:
   - "🔄 Forcing final summary generation before stopping..."
   - "🔴 Saving final summary on stop recording"
6. Reload the page
7. Should see:
   - "✅ Summary loaded from database cache" with actual content
   - Summary displayed in UI (not placeholder)

### Test 2: Existing Session with Placeholder
1. If you have a session with placeholder summary:
2. Load the page
3. Should see:
   - "✅ Summary loaded from database cache" (might be placeholder)
   - "🚀 Forcing summary and timeline generation for loaded transcript"
   - "🧹 Clearing placeholder summary before force refresh"
   - "🔄 Force-refreshing summary for resumed session"
4. After ~2 seconds, should see new summary generated and displayed

### Test 3: Short Recording (Edge Case)
1. Start new conversation
2. Record only a few words (< 40 words)
3. Stop recording
4. Should see:
   - No force refresh (transcript too short)
   - Placeholder summary displayed
5. Reload page
6. Should see placeholder (this is expected for very short conversations)

## Console Logs to Monitor

### During Recording/Saving:
- `💾 Auto-saving summary to database:` - Shows when summary is being saved
- `❌ Skipping save of placeholder summary` - Shows when placeholder save is prevented
- `✅ Summary saved successfully to database` - Confirms successful save

### On Page Load:
- `✅ Summary loaded from database cache:` - Shows what was loaded
- `🧹 Clearing placeholder summary before force refresh` - Shows placeholder being cleared
- `🔄 Force-refreshing summary for resumed session` - Shows new generation starting

### In API:
- `💾 Updating realtime_summary_cache:` - Shows what's being saved to database

## Success Criteria
1. Real summaries (with keyPoints, decisions, etc.) are saved to database
2. Placeholder summaries are NOT saved to database
3. On reload, real summaries are displayed immediately
4. If only placeholder exists, it's cleared and regenerated
5. The stop recording process ensures final summary is saved

## If Issues Persist
1. Check browser console for error messages
2. Check network tab for failed API calls
3. Verify the session has > 40 words in transcript
4. Check database directly:
   ```sql
   SELECT id, realtime_summary_cache 
   FROM sessions 
   WHERE id = 'your-session-id';
   ```
5. Ensure the summary JSON has real content, not just placeholder text