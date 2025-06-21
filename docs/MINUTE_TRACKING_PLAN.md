# Audio Minute Tracking Implementation Plan

## Overview
Implement precise minute-by-minute tracking of audio recording usage to enforce plan limits and provide accurate billing.

## Current State Analysis

### Database Structure
- **sessions table**: Has `recording_duration_seconds`, `recording_started_at`, `recording_ended_at`
- **organization_members table**: Has `total_audio_hours_used` (numeric 6,2), `monthly_audio_hours_limit`
- **plans table**: Has `monthly_audio_hours_limit` (integer)
- **organizations table**: Has `monthly_audio_hours_limit` (integer)

### Current Issues
1. No active timer tracking during recording
2. Duration not auto-saved during recording
3. No minute-level granularity tracking
4. No enforcement of plan limits
5. No real-time usage updates

## Implementation Plan

### Phase 1: Database Schema Updates

1. **Create usage_tracking table** for minute-by-minute tracking:
```sql
CREATE TABLE IF NOT EXISTS "public"."usage_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "minute_timestamp" timestamp with time zone NOT NULL,
    "seconds_recorded" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("session_id", "minute_timestamp")
);

-- Index for fast lookups
CREATE INDEX idx_usage_tracking_org_month ON usage_tracking(organization_id, minute_timestamp);
CREATE INDEX idx_usage_tracking_user_month ON usage_tracking(user_id, minute_timestamp);
```

2. **Add monthly_usage_cache table** for fast limit checking:
```sql
CREATE TABLE IF NOT EXISTS "public"."monthly_usage_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month_year" character varying(7) NOT NULL, -- Format: YYYY-MM
    "total_minutes_used" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    UNIQUE ("organization_id", "user_id", "month_year")
);
```

3. **Update organization_members table**:
```sql
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS current_month_minutes_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_month_start date;
```

### Phase 2: Real-time Tracking Implementation

1. **Frontend Timer Component** (`MinuteTracker.tsx`):
   - Track recording state
   - Update every second during recording
   - Save to database every minute
   - Handle interruptions gracefully

2. **API Endpoints**:
   - `POST /api/usage/track-minute` - Record a minute of usage
   - `GET /api/usage/check-limit` - Check if user can continue recording
   - `GET /api/usage/current-month` - Get current month usage stats

3. **Real-time Updates**:
   - WebSocket or polling for live usage updates
   - Alert when approaching limits
   - Auto-stop recording when limit reached

### Phase 3: Minute Tracking Logic

1. **Recording Start**:
   - Check available minutes
   - Store recording start timestamp
   - Initialize minute tracker

2. **During Recording** (every second):
   - Increment local counter
   - Update UI display
   - Every 60 seconds:
     - Save minute to database
     - Update monthly cache
     - Check remaining minutes

3. **Recording End**:
   - Save final partial minute
   - Update session duration
   - Update user stats

### Phase 4: Limit Enforcement

1. **Pre-recording Check**:
   - Calculate minutes used this month
   - Compare with plan limit
   - Show warning if < 10 minutes remaining
   - Block recording if limit exceeded

2. **During Recording**:
   - Monitor usage in real-time
   - Show countdown when < 5 minutes left
   - Auto-stop at limit
   - Save recording before stopping

3. **Grace Period**:
   - Allow 1-minute grace for saving
   - Send notification to upgrade

### Phase 5: Usage Display & Analytics

1. **Dashboard Updates**:
   - Show minutes used / total
   - Visual progress bar
   - Daily usage chart
   - Peak usage times

2. **Notifications**:
   - 80% usage warning
   - 90% usage alert
   - Limit reached notification
   - Monthly reset notification

## Technical Implementation Details

### Frontend State Management
```typescript
interface UsageTrackingState {
  currentSessionMinutes: number;
  currentSessionSeconds: number;
  monthlyMinutesUsed: number;
  monthlyMinutesLimit: number;
  isApproachingLimit: boolean;
  minutesRemaining: number;
}
```

### Minute Calculation Formula
```typescript
// Convert hours limit to minutes
const monthlyMinutesLimit = plan.monthly_audio_hours_limit * 60;

// Calculate minutes from seconds
const minutesUsed = Math.ceil(totalSeconds / 60);

// Remaining minutes
const minutesRemaining = monthlyMinutesLimit - minutesUsed;
```

### Database Triggers
```sql
-- Auto-update organization_members stats on usage_tracking insert
CREATE OR REPLACE FUNCTION update_member_usage() RETURNS TRIGGER AS $$
BEGIN
    UPDATE organization_members
    SET current_month_minutes_used = current_month_minutes_used + 1
    WHERE user_id = NEW.user_id 
    AND organization_id = NEW.organization_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Migration Strategy

1. **Backward Compatibility**:
   - Keep existing duration fields
   - Migrate historical data
   - Dual tracking during transition

2. **Data Migration**:
   - Calculate minutes from existing duration_seconds
   - Populate monthly_usage_cache
   - Update organization_members stats

3. **Rollout Plan**:
   - Enable for new sessions first
   - Backfill for active users
   - Full migration after testing

## Testing Requirements

1. **Unit Tests**:
   - Minute calculation accuracy
   - Limit enforcement logic
   - Edge cases (month boundaries)

2. **Integration Tests**:
   - Recording flow with limits
   - Real-time updates
   - Database consistency

3. **Load Tests**:
   - Multiple concurrent recordings
   - High-frequency minute updates
   - Cache performance

## Security Considerations

1. **Rate Limiting**:
   - Max 1 minute update per minute per session
   - Validate timestamps server-side
   - Prevent usage manipulation

2. **Data Integrity**:
   - Use database constraints
   - Audit trail for usage
   - Regular consistency checks

## Performance Optimizations

1. **Caching Strategy**:
   - Cache current month usage
   - Update cache on write
   - Refresh cache daily

2. **Database Indexes**:
   - Index on timestamp ranges
   - Composite indexes for queries
   - Partition by month if needed

3. **Batch Operations**:
   - Batch minute updates
   - Aggregate queries
   - Async processing

## Success Metrics

1. **Accuracy**:
   - 100% minute tracking accuracy
   - < 1% discrepancy in billing

2. **Performance**:
   - < 100ms limit check
   - < 500ms usage update
   - No recording interruptions

3. **User Experience**:
   - Clear usage visibility
   - Timely warnings
   - Smooth limit enforcement