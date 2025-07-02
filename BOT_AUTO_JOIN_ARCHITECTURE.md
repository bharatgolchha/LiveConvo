# Bot Auto-Join Architecture Documentation

## Overview

The Bot Auto-Join functionality in LivePrompt.ai enables automatic deployment of Recall.ai recording bots to scheduled meetings based on user preferences. This feature seamlessly integrates with Google Calendar and Microsoft Outlook to provide hands-free meeting recording and transcription.

## System Architecture

### Core Components

1. **Calendar Integration**
   - Google Calendar and Microsoft Outlook sync via Recall.ai Calendar API
   - Real-time event updates via webhooks
   - Calendar data stored in `calendar_connections` and `calendar_events` tables

2. **Auto-Join Worker**
   - Cron job running every minute (Vercel Cron)
   - Processes upcoming meetings (default: 2-minute buffer)
   - Creates sessions and deploys Recall.ai bots automatically

3. **Bot Management**
   - Recall.ai integration for video conference recording
   - Real-time status tracking via webhooks
   - Failsafe daily sync for orphaned bots

4. **User Interface**
   - Ongoing meetings indicator (floating badge)
   - Active meetings modal
   - Real-time notifications
   - Calendar event cards with auto-join status

## Database Schema

### Key Tables

#### `calendar_preferences`
```sql
- user_id (UUID): References users table
- auto_join_enabled (BOOLEAN): Global auto-join toggle
- join_buffer_minutes (INTEGER): Minutes before meeting to join (default: 2)
- auto_record_enabled (BOOLEAN): Enable automatic recording
- excluded_keywords (TEXT[]): Keywords to exclude from auto-join
- notify_before_join (BOOLEAN): Send notifications
- notification_minutes (INTEGER): Minutes before to notify
```

#### `calendar_events`
```sql
- id (UUID): Primary key
- calendar_connection_id (UUID): Link to calendar connection
- meeting_url (TEXT): Video conference URL
- auto_session_created (BOOLEAN): Whether session was auto-created
- auto_session_id (UUID): Reference to auto-created session
- auto_bot_status (TEXT): Bot deployment status
- bot_id (TEXT): Recall.ai bot ID
- bot_scheduled (BOOLEAN): Whether bot is scheduled
```

#### `calendar_auto_join_logs`
```sql
- user_id (UUID): User who owns the meeting
- calendar_event_id (UUID): Calendar event reference
- session_id (UUID): Created session reference
- bot_id (TEXT): Deployed bot ID
- action (TEXT): Action taken (session_created, bot_deployed, etc.)
- status (TEXT): Success or failure
- error_message (TEXT): Error details if failed
- metadata (JSONB): Additional context
```

#### `meeting_notifications`
```sql
- user_id (UUID): User to notify
- calendar_event_id (UUID): Related calendar event
- session_id (UUID): Related session
- notification_type (TEXT): Type of notification
- title (TEXT): Notification title
- message (TEXT): Notification body
- action_url (TEXT): Link to relevant page
- read (BOOLEAN): Read status
```

## Auto-Join Flow

### 1. Calendar Sync
- Calendar connections established via OAuth
- Events synced periodically from Google/Microsoft
- Meeting URLs extracted and stored

### 2. Auto-Join Worker Process
```typescript
Every minute:
1. Query eligible users (auto_join_enabled = true)
2. Find meetings starting within buffer time
3. Apply exclusion rules (keywords, domains)
4. Check usage limits
5. Create session
6. Deploy Recall.ai bot
7. Log activity
8. Send notifications
```

### 3. Bot Deployment
```typescript
// RecallSessionManager.enhanceSessionWithRecall()
1. Validate meeting URL and platform
2. Prepare metadata (user, org, meeting info)
3. Create bot with retry logic (3 attempts)
4. Update session with bot info
5. Start monitoring bot status
6. Initialize bot usage tracking
```

### 4. Status Monitoring
- Real-time updates via Recall.ai webhooks
- Bot states: created → joining → in_call → completed
- Automatic timeout after 5 minutes if not joined
- Daily cron sync for stuck/orphaned bots

## API Endpoints

### Worker Endpoints
- `GET/POST /api/calendar/auto-join/worker` - Main worker process
- `GET /api/calendar/auto-join/logs` - Activity history
- `POST /api/calendar/auto-join/override` - Manual control
- `POST /api/calendar/auto-join/reset` - Reset auto-join state
- `GET /api/calendar/meeting-status` - Real-time meeting status

### Cron Jobs
- `/api/cron/sync-bot-status` - Daily bot status sync
- `/api/cron/monitor-bots` - Active bot monitoring

### Webhooks
- `/api/webhooks/recall/[sessionId]` - Recall.ai event handler
- `/api/webhooks/recall/status` - Bot status updates

## Configuration

### Environment Variables
```env
ENABLE_AUTO_JOIN=true
AUTO_JOIN_WORKER_SECRET=<secure-string>
AUTO_JOIN_BUFFER_MINUTES=2
CRON_SECRET=<vercel-cron-secret>
RECALL_AI_API_KEY=<recall-api-key>
RECALL_AI_REGION=us-west-2
```

### User Preferences
Users control auto-join behavior through calendar_preferences:
- Enable/disable auto-join globally
- Set join buffer time (how early to join)
- Exclude keywords (e.g., "1:1", "personal")
- Configure notifications

## Security & Permissions

### Authentication
- Vercel Cron authentication for worker
- Bearer token for manual triggers
- User-scoped calendar access

### Row Level Security (RLS)
- Users can only view their own calendar data
- Service role required for bot operations
- Proper isolation between organizations

## Usage Tracking

### Bot Usage Flow
1. Bot created → `bot_usage_tracking` record initialized
2. Real-time updates via webhooks
3. Billable minutes calculated on completion
4. Daily sync catches any missed updates

### Billing
- $0.10 per minute of recording
- Usage limits checked before deployment
- Automatic tracking in `bot_usage_tracking` table

## UI Components

### OngoingMeetingsIndicator
- Floating badge showing active meeting count
- Real-time updates every 30 seconds
- Click to expand mini-view or open full modal

### ActiveMeetingsModal
- Full list of all meeting activities
- Bot status indicators
- Quick actions (join, view session)
- Manual override controls

### CalendarEventCard
- Shows auto-join status
- Hides manual join button when auto-join active
- Visual indicators for bot deployment status

## Error Handling

### Common Failure Scenarios
1. **Usage Limit Exceeded**
   - Bot deployment skipped
   - User notified
   - Status: `limit_exceeded`

2. **Bot Join Timeout**
   - 5-minute timeout for joining
   - Bot automatically stopped
   - Status: `timeout`

3. **Platform Not Supported**
   - Non-video meetings skipped
   - Unsupported platforms logged

4. **Network/API Failures**
   - Retry logic (3 attempts)
   - Exponential backoff
   - Error logging

## Monitoring & Debugging

### Logging
- All actions logged to `calendar_auto_join_logs`
- Webhook events in `webhook_logs`
- Bot status in session records

### Health Checks
- Daily orphan detection
- Webhook health monitoring
- Usage reconciliation

### Debug Tools
- `/scripts/check-bot-recording.ts` - Check recording status
- `/scripts/check-recall-bot.ts` - Debug bot status
- `/scripts/sync-recall-recordings.ts` - Manual sync

## Best Practices

### Performance
- Batch processing in worker
- Efficient database queries with indexes
- Parallel bot deployments
- 60-second max duration for worker

### Reliability
- Idempotent operations
- Proper error handling
- Failsafe daily sync
- Activity logging

### User Experience
- Clear status indicators
- Real-time notifications
- Manual override options
- Transparent error messages

## Future Enhancements

### Planned Features
1. Smart scheduling based on meeting importance
2. AI-powered keyword detection
3. Multi-bot support for large meetings
4. Custom bot names per organization
5. Advanced notification preferences

### Scalability Considerations
- Move to dedicated job queue for high volume
- Implement rate limiting per organization
- Add caching for calendar data
- Optimize webhook processing

## Troubleshooting

### Common Issues

1. **Bot Not Joining**
   - Check meeting URL format
   - Verify usage limits
   - Check excluded keywords
   - Review error logs

2. **Missing Recordings**
   - Run daily sync manually
   - Check bot status in Recall.ai
   - Verify webhook delivery

3. **Duplicate Sessions**
   - Check for race conditions
   - Verify worker frequency
   - Review session creation logic

### SQL Queries for Debugging

```sql
-- Check auto-join activity for a user
SELECT * FROM calendar_auto_join_logs 
WHERE user_id = '<user_id>' 
ORDER BY created_at DESC;

-- Find stuck bots
SELECT * FROM bot_usage_tracking 
WHERE status IN ('recording', 'in_call') 
AND updated_at < NOW() - INTERVAL '1 hour';

-- Check meeting notifications
SELECT * FROM meeting_notifications 
WHERE user_id = '<user_id>' 
AND created_at > NOW() - INTERVAL '1 day';
```

## Conclusion

The Bot Auto-Join system provides a seamless, automated solution for meeting recording and transcription. By leveraging calendar integrations, intelligent scheduling, and robust error handling, it ensures users never miss capturing important meeting content while respecting their preferences and usage limits.