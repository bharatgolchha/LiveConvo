# Timeline Events RLS Fix Test

## Issue Fixed
The `session_timeline_events` table had RLS policies that were preventing timeline events from being saved. The error was:
```
new row violates row-level security policy for table "session_timeline_events"
```

## Solution Applied
Updated the RLS policy to properly check that:
1. The user owns the session (via `sessions.user_id = auth.uid()`)
2. The session is not deleted (`sessions.deleted_at IS NULL`)

## New RLS Policy
```sql
CREATE POLICY "Users can manage their own session timeline events" ON session_timeline_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = session_timeline_events.session_id
            AND sessions.user_id = auth.uid()
            AND sessions.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = session_timeline_events.session_id
            AND sessions.user_id = auth.uid()
            AND sessions.deleted_at IS NULL
        )
    );
```

## Testing Steps
1. Start a new recording session
2. Let the session run for a bit to generate timeline events
3. Check the console logs - you should see:
   - "✅ Timeline API Response" with successful events
   - "💾 Saving timeline events to database..."
   - "✅ Timeline events saved successfully"

## API Endpoint
The timeline events are saved via:
- POST `/api/sessions/[id]/timeline`

The endpoint properly authenticates the user and checks session ownership before saving events.