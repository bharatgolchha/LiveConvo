# Bot and Calendar Functions Documentation

## Table of Contents
1. [Overview](#overview)
2. [Calendar Integration](#calendar-integration)
3. [Bot Integration with Recall.ai](#bot-integration-with-recallai)
4. [Auto-Join Feature](#auto-join-feature)
5. [Bot Status Display](#bot-status-display)
6. [Technical Architecture](#technical-architecture)

## Overview

LivePrompt.ai integrates with Google Calendar and Recall.ai to provide automated meeting recording and transcription. The system can:
- Connect to Google Calendar accounts
- Automatically detect upcoming meetings
- Deploy recording bots to meetings
- Display real-time bot status on the dashboard
- Generate transcripts and AI-powered summaries

## Calendar Integration

### 1. Calendar Connection Flow

#### API Endpoints
- `POST /api/calendar/connect` - Initiates OAuth flow with Google
- `GET /api/calendar/callback` - Handles OAuth callback
- `GET /api/calendar/connections` - Lists user's calendar connections
- `DELETE /api/calendar/disconnect` - Removes calendar connection

#### Database Tables
```sql
calendar_connections:
  - id (UUID)
  - user_id (UUID)
  - provider ('google')
  - email (string)
  - access_token (encrypted)
  - refresh_token (encrypted)
  - expires_at (timestamp)
  - recall_calendar_id (UUID from Recall.ai)
  - status ('active' | 'disconnected')

calendar_preferences:
  - user_id (UUID, primary key)
  - auto_join_enabled (boolean)
  - auto_record_enabled (boolean)
  - join_buffer_minutes (integer, default: 2)
  - excluded_keywords (text[])
  - notify_before_join (boolean)

calendar_events:
  - id (UUID)
  - calendar_connection_id (UUID)
  - external_event_id (string)
  - title (string)
  - start_time (timestamp)
  - end_time (timestamp)
  - meeting_url (string)
  - attendees (jsonb)
  - auto_session_created (boolean)
  - auto_session_id (UUID)
  - auto_bot_status (enum)
  - bot_id (UUID)
```

### 2. Calendar Sync Process

1. **Initial Connection**:
   ```typescript
   // User initiates connection
   POST /api/calendar/connect
   → Redirects to Google OAuth
   → Callback to /api/calendar/callback
   → Creates calendar_connections record
   → Registers calendar with Recall.ai
   ```

2. **Event Sync**:
   ```typescript
   // Sync calendar events
   POST /api/calendar/events
   → Fetches events from Recall.ai
   → Stores in calendar_events table
   → Updates last_synced_at
   ```

3. **Upcoming Meetings**:
   ```sql
   -- Function: get_upcoming_meetings
   SELECT * FROM calendar_events
   WHERE start_time >= NOW()
   AND start_time <= NOW() + INTERVAL '7 days'
   AND meeting_url IS NOT NULL
   ORDER BY start_time ASC;
   ```

## Bot Integration with Recall.ai

### 1. Bot Lifecycle

#### Bot Status Flow
```
created → joining → in_call/recording → completed
         ↘        ↘         ↘
           failed   timeout   permission_denied
```

#### Status Definitions
- **created**: Bot instance created in Recall.ai
- **joining**: Bot is attempting to join the meeting
- **waiting**: Bot is in waiting room
- **in_call**: Bot successfully joined and is in the meeting
- **recording**: Bot is actively recording
- **completed**: Recording finished successfully
- **failed**: Bot failed to join or encountered an error
- **timeout**: Bot couldn't join within time limit
- **permission_denied**: Bot was denied access to meeting
- **cancelled**: Bot was manually cancelled

### 2. Bot Deployment Process

#### Manual Deployment (Join Meeting Button)
```typescript
// When user clicks "Join Meeting" in /meeting/[id]
1. RecallSessionManager.enhanceSessionWithRecall()
   → Creates bot in Recall.ai
   → Updates session with recall_bot_id
   → Sets initial status to 'created'
   
2. Bot joins meeting
   → Webhook updates status to 'joining'
   → Then 'in_call' or 'recording'
   
3. Recording completes
   → Webhook updates status to 'completed'
   → Triggers transcript processing
```

#### Database Updates
```sql
sessions:
  - recall_bot_id (UUID)
  - recall_bot_status (enum)
  - recall_session_id (string)
  - meeting_url (string)
  - meeting_platform ('zoom' | 'google_meet' | 'teams')

bot_usage_tracking:
  - bot_id (UUID)
  - session_id (UUID)
  - status (string)
  - recording_started_at (timestamp)
  - recording_ended_at (timestamp)
  - billable_minutes (integer)
```

### 3. Webhook Integration

#### Webhook Endpoint: `/api/webhooks/recall`

Handles status updates from Recall.ai:
```typescript
// Status update flow
1. Recall.ai sends POST to webhook
2. Webhook updates:
   - sessions.recall_bot_status
   - bot_usage_tracking.status
   - Triggers downstream processes
```

#### Key Status Handlers
- `joining_call` → Updates UI to show "Bot joining"
- `in_call_recording` → Shows "Recording" status
- `done` → Marks session as completed, calculates usage

## Auto-Join Feature

### 1. Configuration

#### Environment Variables
```bash
ENABLE_AUTO_JOIN=true
AUTO_JOIN_BUFFER_MINUTES=2
CRON_SECRET=your_cron_secret
AUTO_JOIN_WORKER_SECRET=your_worker_secret
```

#### Vercel Cron Configuration (vercel.json)
```json
{
  "crons": [{
    "path": "/api/calendar/auto-join/worker",
    "schedule": "* * * * *"  // Every minute
  }]
}
```

### 2. Auto-Join Worker Process

#### Worker Flow (`/api/calendar/auto-join/worker`)
```typescript
Every minute:
1. Find users with auto_join_enabled = true
2. For each user:
   - Get meetings starting within buffer time
   - Check if should auto-join (via should_auto_join_meeting function)
   - Create session with status='draft'
   - Deploy bot using RecallSessionManager
   - Update calendar_events.auto_bot_status
   - Log activity in auto_join_logs
```

#### Decision Logic
```sql
-- Function: should_auto_join_meeting
Checks:
- User has auto_join_enabled
- Meeting has valid meeting_url
- Not already processed
- Not excluded by keywords
- Within time window
```

### 3. Usage Limits

Before deploying bots, the system checks:
```sql
-- Function: check_usage_limit
SELECT 
  minutes_used < minutes_limit as can_record
FROM user_subscriptions
WHERE user_id = ?
```

If limit exceeded:
- Bot deployment is skipped
- Status set to 'limit_exceeded'
- User notified

## Bot Status Display

### 1. Dashboard Integration

#### Component: `ConversationInboxItem.tsx`

Bot status badges appear when:
- Session has `recall_bot_id`
- Session has `recall_bot_status`

#### Status Badge Configuration
```typescript
getBotStatusConfig(status) {
  'created': Gray badge with cog icon
  'joining': Blue badge with spinning cog
  'waiting': Yellow badge with clock icon
  'recording': Red badge with animated video icon
  'in_call': Green badge with video icon
  'completed': Gray badge with check icon
  'failed': Red badge with X icon
  'timeout': Orange badge with warning icon
}
```

### 2. Real-time Updates

#### Bot Status API: `/api/sessions/[id]/bot-status`
```typescript
// Checks bot status from Recall.ai
GET /api/sessions/[id]/bot-status
→ Fetches from Recall.ai API
→ Maps status codes to simplified status
→ Updates local database if needed
→ Returns current status
```

#### Status Polling (Meeting Page)
```typescript
// Polls every 5 seconds while bot is active
useEffect(() => {
  if (botStatus === 'joining' || botStatus === 'in_call') {
    const interval = setInterval(checkBotStatus, 5000);
    return () => clearInterval(interval);
  }
}, [botStatus]);
```

## Technical Architecture

### 1. System Flow Diagram

```
User → Calendar Connect → Google OAuth → Recall.ai Registration
                                    ↓
                          Calendar Events Sync
                                    ↓
                          Auto-Join Worker (Cron)
                                    ↓
                          Session Creation → Bot Deployment
                                    ↓
                          Webhook Updates → Status Display
                                    ↓
                          Recording Complete → Transcript Processing
```

### 2. Key Components

#### Frontend
- `/components/calendar/` - Calendar UI components
- `/components/dashboard/ConversationInboxItem.tsx` - Bot status display
- `/app/meeting/[id]/` - Meeting interface with bot controls

#### Backend APIs
- `/api/calendar/` - Calendar management endpoints
- `/api/sessions/` - Session CRUD with bot fields
- `/api/webhooks/recall` - Recall.ai webhook handler
- `/api/calendar/auto-join/worker` - Cron job for auto-join

#### Libraries
- `/lib/recall-ai/` - Recall.ai client and session manager
- `/lib/hooks/useSessions.ts` - Session data with bot status

### 3. Security Considerations

1. **OAuth Tokens**: Encrypted in database
2. **Webhook Validation**: Checks authorization header
3. **Rate Limiting**: Built into Recall.ai API
4. **Usage Tracking**: Prevents overuse of bot minutes
5. **RLS Policies**: Ensures users only see their own data

### 4. Testing

#### Test Pages
- `/test-auto-join-flow` - Test auto-join functionality
- `/test-bot-status` - Test bot status display

#### Manual Testing Flow
1. Connect calendar account
2. Enable auto-join in preferences
3. Create test meeting with Google Meet link
4. Trigger auto-join worker manually
5. Verify bot joins and status updates
6. Check dashboard for status badges

### 5. Troubleshooting

#### Common Issues
1. **Bot not joining**:
   - Check meeting URL format
   - Verify Recall.ai API key
   - Check usage limits

2. **Status not updating**:
   - Verify webhook endpoint is accessible
   - Check webhook logs
   - Ensure database fields are present

3. **Auto-join not working**:
   - Verify ENABLE_AUTO_JOIN=true
   - Check cron job execution
   - Review auto_join_logs table

#### Debug Queries
```sql
-- Check bot status for a session
SELECT id, title, recall_bot_id, recall_bot_status, meeting_url
FROM sessions
WHERE id = 'session-id';

-- View auto-join activity
SELECT * FROM auto_join_logs
WHERE user_id = 'user-id'
ORDER BY created_at DESC
LIMIT 10;

-- Check calendar preferences
SELECT * FROM calendar_preferences
WHERE user_id = 'user-id';
```

## Future Enhancements

1. **Multiple Calendar Support**: Support for Outlook, Apple Calendar
2. **Advanced Scheduling**: Recurring meeting support
3. **Bot Customization**: Custom bot names and avatars
4. **Smart Filtering**: ML-based meeting importance detection
5. **Real-time Notifications**: Push notifications for bot status
6. **Analytics Dashboard**: Bot usage statistics and insights