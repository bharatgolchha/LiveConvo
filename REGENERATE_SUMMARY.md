# How to Regenerate Summaries

## Issue
The cached summary is showing generic content like "Conversation with 179 exchanges covering various topics" which was likely generated before the Gemini API migration.

## Solution Options

### Option 1: Clear Cache via Database (Recommended)
If you have access to Supabase dashboard:
1. Go to the `sessions` table
2. Find the session with ID `1a5d0a76-a097-43c8-9c1f-5ae32c81b22c`
3. Set `realtime_summary_cache` to `null`
4. Refresh the app page - it should regenerate the summary

### Option 2: Force Regeneration via API
You can manually trigger summary regeneration:

```bash
# Get your auth token from browser DevTools > Application > Storage > Session Storage
# Look for the supabase auth token

curl -X POST http://localhost:3000/api/summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "sessionId": "1a5d0a76-a097-43c8-9c1f-5ae32c81b22c",
    "transcript": "YOUR_TRANSCRIPT_TEXT",
    "conversationType": "sales"
  }'
```

### Option 3: Delete and Recreate Session
1. Delete the current session from the dashboard
2. Start a new conversation
3. Upload/paste the same transcript

## Verification
After regenerating, the summary should show:
- Specific details about the MacBook Pro being sold
- Key points about the 2019 16-inch model with Intel i7
- Actual conversation analysis instead of generic text

## Note
The error in AICoachSidebar has been fixed. The undefined content issue should no longer occur.