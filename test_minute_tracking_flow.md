# Test Minute Tracking Flow

## Test Setup
1. Make sure you're logged in as a user
2. Start a new recording session
3. Let it run for at least 1 minute

## Expected Behavior

### During Recording:
- Timer should update every second
- After 60 seconds, the first minute should be tracked
- You should see console logs in the browser showing:
  - "⏰ Completed minute 1, tracking 60 seconds..."
  - "✅ Track minute success:" followed by response data

### API Endpoints to Monitor:

1. **POST /api/usage/track-minute**
   - Should be called after each complete minute
   - Should return: `{ success: true, total_minutes_used: X, usage_id: "..." }`
   - Check Network tab in browser DevTools

2. **GET /api/usage/check-limit**
   - Called when recording starts
   - Should return usage limits without errors

3. **GET /api/usage/current-month**
   - Can be called to verify usage is being tracked
   - Should show updated minutes_used

## Debugging Steps

### If minutes aren't being tracked:

1. **Check Browser Console**
   - Look for errors starting with "❌"
   - Look for successful logs starting with "✅"

2. **Check Network Tab**
   - Filter by "track-minute"
   - Check if requests are being made
   - Check response status (should be 200)

3. **Check Database Directly**
   ```sql
   -- Check if usage records are being created
   SELECT * FROM usage_tracking 
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY minute_timestamp DESC
   LIMIT 10;
   
   -- Check monthly cache
   SELECT * FROM monthly_usage_cache
   WHERE user_id = 'YOUR_USER_ID'
   AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
   ```

## What Was Fixed

1. **API Authentication**: Updated all usage endpoints to use proper authenticated clients
2. **RLS Policies**: Cleaned up conflicting policies on both `usage_tracking` and `monthly_usage_cache` tables
3. **Service Role Usage**: API now uses service role client for database operations to bypass RLS where needed

## Summary of Changes

### API Files Updated:
- `/api/usage/track-minute/route.ts` - Now uses service role for inserts
- `/api/usage/check-limit/route.ts` - Now uses service role for queries
- `/api/usage/current-month/route.ts` - Now uses service role for queries

### Database Changes:
- Removed conflicting RLS policies
- Simplified to basic user-owns-data policies
- Ensured RLS is enabled on both tables