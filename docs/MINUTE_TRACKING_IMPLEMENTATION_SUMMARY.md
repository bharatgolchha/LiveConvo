# Minute Tracking Implementation Summary

## Overview
I've implemented a comprehensive minute-by-minute usage tracking system for LiveConvo to accurately track audio recording usage and enforce plan limits. This is critical for billing and ensuring users stay within their allocated minutes.

## What Was Implemented

### 1. Database Schema (✅ Complete)
Created new tables and functions in `minute_tracking_migration.sql`:

- **`usage_tracking` table**: Stores minute-by-minute usage records
  - Tracks each minute of recording with session ID, user ID, organization ID
  - Records actual seconds used within each minute (1-60)
  - Unique constraint prevents duplicate minute tracking

- **`monthly_usage_cache` table**: Fast lookup for current month usage
  - Caches total minutes and seconds used per user/organization/month
  - Updates automatically via triggers

- **Database functions**:
  - `update_member_usage()`: Trigger function to auto-update stats
  - `check_usage_limit()`: Check if user can continue recording
  - `get_usage_details()`: Get detailed usage for a period

- **Updated `organization_members` table**:
  - Added `current_month_minutes_used` column
  - Added `current_month_start` column

### 2. Real-time Minute Tracking (✅ Complete)

**Frontend Hook** (`useMinuteTracking.ts`):
- Tracks recording time second-by-second
- Saves to database every completed minute
- Handles partial minutes when recording stops
- Provides real-time usage statistics
- Triggers callbacks when approaching/exceeding limits

**Integration in main app**:
- Added timer to update `sessionDuration` every second during recording
- Integrated minute tracking hook with recording state
- Check limits before starting recording
- Auto-stop recording when limit reached
- Show warnings when approaching limit

### 3. API Endpoints (✅ Complete)

Created three new API endpoints:

1. **`/api/usage/check-limit`** (GET)
   - Returns: can_record, minutes_used, minutes_limit, minutes_remaining, percentage_used
   - Used before starting recording

2. **`/api/usage/track-minute`** (POST)
   - Records a minute of usage
   - Updates session duration
   - Handles duplicate prevention
   - Body: session_id, seconds_recorded, minute_timestamp

3. **`/api/usage/current-month`** (GET)
   - Returns comprehensive monthly usage stats
   - Includes daily breakdown (optional)
   - Provides usage projections

4. **`/api/users/stats-v2`** (GET)
   - Enhanced stats endpoint with minute-level data
   - Backward compatible with hour-based stats
   - Includes projections and recommendations

### 4. Usage Display Component (✅ Complete)

Created `UsageDisplay.tsx` component:
- Shows current session time
- Displays monthly usage with progress bar
- Visual indicators for approaching/exceeded limits
- Responsive design with proper styling

### 5. Limit Enforcement (✅ Complete)

**Before Recording**:
- Check available minutes via API
- Block recording if limit exceeded
- Show warning if < 10 minutes remaining

**During Recording**:
- Real-time usage tracking
- Auto-save every minute to database
- Monitor remaining minutes
- Auto-stop when limit reached
- Grace period for saving

### 6. Usage Alerts (✅ Complete)

Implemented toast notifications:
- Warning at 10 minutes remaining
- Error when limit exceeded
- Info about approaching limits
- Upgrade prompts

## How It Works

### Recording Flow:

1. **Start Recording**:
   ```typescript
   // Check limits
   const usageCheck = await checkUsageLimit();
   if (!canRecord || isOverLimit) {
     toast.error('Monthly limit exceeded');
     return;
   }
   ```

2. **During Recording**:
   - Timer updates every second
   - Every 60 seconds: Save minute to database
   - Update monthly cache automatically
   - Check remaining minutes

3. **Stop Recording**:
   - Save partial minute
   - Update final duration
   - Sync with database

### Minute Calculation:
- Plans define limits in hours (e.g., 10 hours)
- System converts to minutes (10 hours = 600 minutes)
- Usage tracked per minute with actual seconds
- Billing based on minutes used (rounded up)

## Migration Strategy

1. **Run the migration**:
   ```bash
   psql $DATABASE_URL < minute_tracking_migration.sql
   ```

2. **Historical data migration**:
   - Migration script backfills usage_tracking from existing sessions
   - Populates monthly_usage_cache with historical data
   - Updates organization_members stats

## Testing the Implementation

1. **Set a low minute limit** (e.g., 5 minutes) for testing
2. **Start a recording** and watch:
   - Timer counts up
   - Usage updates every minute
   - Warnings appear near limit
   - Recording stops at limit

3. **Check database**:
   ```sql
   -- View minute tracking
   SELECT * FROM usage_tracking WHERE session_id = 'xxx';
   
   -- Check monthly usage
   SELECT * FROM monthly_usage_cache WHERE user_id = 'xxx';
   
   -- Verify limits
   SELECT * FROM check_usage_limit('user_id', 'org_id');
   ```

## Next Steps

1. **Dashboard Integration**:
   - Update dashboard to show minute-based usage
   - Add usage chart/graph
   - Show daily usage breakdown

2. **Billing Integration**:
   - Connect to Stripe for overage charges
   - Send usage reports
   - Implement grace periods

3. **Admin Tools**:
   - Usage analytics dashboard
   - Manual minute adjustments
   - Bulk usage reports

4. **Optimizations**:
   - Consider WebSocket for real-time updates
   - Batch minute updates for performance
   - Add Redis caching for limits

## Important Notes

1. **Accuracy**: System tracks to the second but bills by the minute
2. **Reliability**: Includes retry logic and duplicate prevention
3. **Performance**: Uses database triggers for automatic updates
4. **User Experience**: Graceful handling of limits with clear messaging

## Configuration

Set plan limits in the database:
```sql
-- Update organization limit (in hours)
UPDATE organizations 
SET monthly_audio_hours_limit = 10 
WHERE id = 'org_id';

-- Update member-specific limit (in hours)
UPDATE organization_members 
SET monthly_audio_hours_limit = 5 
WHERE user_id = 'user_id';
```

The system uses the most restrictive limit between organization and member limits.