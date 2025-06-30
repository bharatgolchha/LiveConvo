# Auto-Join Meetings Testing Guide

## Quick Start - Enable Auto-Join

### 1. Enable Auto-Join via Database (Quickest Method)

Run this SQL query in your Supabase dashboard:

```sql
-- Replace 'your-user-id' with your actual user ID
UPDATE users 
SET calendar_preferences = jsonb_build_object(
  'auto_record_enabled', true,
  'join_buffer_minutes', 2,
  'excluded_keywords', ARRAY[]::text[]
)
WHERE id = 'your-user-id';
```

To find your user ID:
```sql
SELECT id, email FROM users WHERE email = 'your-email@example.com';
```

### 2. Enable Auto-Join via API

```bash
# First, get your auth token from browser localStorage
# In browser console: localStorage.getItem('supabase.auth.token')

# Then update preferences
curl -X PUT http://localhost:3000/api/calendar/preferences \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auto_record_enabled": true,
    "join_buffer_minutes": 2,
    "excluded_keywords": []
  }'
```

### 3. Add Components to Your Dashboard

Update your dashboard layout (e.g., `frontend/src/app/dashboard/layout.tsx`):

```tsx
import { OngoingMeetingsIndicator } from '@/components/calendar/OngoingMeetingsIndicator';
import { ActiveMeetingsModal } from '@/components/calendar/ActiveMeetingsModal';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function DashboardLayout({ children }) {
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);

  return (
    <NotificationProvider>
      <div>
        {/* Your existing layout */}
        {children}
        
        {/* Add these components */}
        <OngoingMeetingsIndicator onOpenModal={() => setShowMeetingsModal(true)} />
        <ActiveMeetingsModal 
          isOpen={showMeetingsModal} 
          onClose={() => setShowMeetingsModal(false)} 
        />
      </div>
    </NotificationProvider>
  );
}
```

## Testing Steps

### Step 1: Create a Test Meeting

1. Go to your calendar integration page
2. Create a Google Calendar event with:
   - A meeting URL (Google Meet, Zoom, etc.)
   - Start time 5-10 minutes from now
   - Duration of at least 30 minutes

### Step 2: Trigger Auto-Join Manually (for immediate testing)

Instead of waiting for the cron job, you can trigger it manually:

```bash
# Trigger the auto-join worker
curl -X POST http://localhost:3000/api/calendar/auto-join/worker \
  -H "Authorization: Bearer aj_secret_7f3d8b2c9e1a5f6d4b8c2e9a1f5d7b3c"
```

### Step 3: Monitor the Process

1. **Check Database Logs**:
```sql
-- View auto-join activity
SELECT * FROM calendar_auto_join_logs 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC;

-- Check calendar events status
SELECT id, title, start_time, auto_session_created, auto_bot_status 
FROM calendar_events 
WHERE calendar_connection_id IN (
  SELECT id FROM calendar_connections WHERE user_id = 'your-user-id'
)
ORDER BY start_time DESC;

-- View notifications
SELECT * FROM meeting_notifications 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC;
```

2. **Check API Responses**:
```bash
# Get meeting status
curl http://localhost:3000/api/calendar/meeting-status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Get auto-join logs
curl http://localhost:3000/api/calendar/auto-join/logs \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Step 4: What to Expect

When working correctly, you should see:

1. **2 minutes before meeting**:
   - Auto-join worker creates a session
   - Bot is deployed to the meeting
   - Toast notification appears: "Bot Deployed"
   - Calendar card shows "Bot will join automatically"

2. **When meeting starts**:
   - Bot status changes to "joining" then "in_call"
   - Ongoing meetings indicator appears (bottom-right)
   - Meeting shows in ActiveMeetingsModal

3. **During meeting**:
   - Real-time transcription starts
   - Session is active and recording

## Troubleshooting

### Auto-Join Not Working?

1. **Check if enabled**:
```sql
SELECT calendar_preferences FROM users WHERE id = 'your-user-id';
```
Should show: `{"auto_record_enabled": true, ...}`

2. **Check environment variables**:
```bash
# In .env.local
ENABLE_AUTO_JOIN=true
AUTO_JOIN_WORKER_SECRET=aj_secret_7f3d8b2c9e1a5f6d4b8c2e9a1f5d7b3c
AUTO_JOIN_BUFFER_MINUTES=2
```

3. **Check cron execution** (in production):
- Vercel dashboard → Functions → Logs
- Look for `/api/calendar/auto-join/worker` executions

4. **Common issues**:
- Meeting URL not detected in calendar event
- Meeting title contains excluded keywords
- Calendar not synced recently
- Recall.ai API limits reached

### Manual Override

If auto-join fails, you can manually trigger it:

```bash
# Enable auto-join for specific event
curl -X POST http://localhost:3000/api/calendar/auto-join/override \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "calendar-event-id",
    "action": "enable"
  }'

# Stop bot
curl -X POST http://localhost:3000/api/calendar/auto-join/override \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "calendar-event-id",
    "action": "stop_bot"
  }'
```

## Quick Debug Checklist

- [ ] Auto-join enabled in user preferences?
- [ ] Meeting has a valid meeting URL?
- [ ] Meeting starts within buffer time (2 minutes)?
- [ ] Calendar sync is recent (check `last_synced_at`)?
- [ ] Recall.ai bot creation successful?
- [ ] Environment variables set correctly?
- [ ] Cron job running (check logs)?

## Testing Different Scenarios

### 1. Test Excluded Keywords
```sql
UPDATE users 
SET calendar_preferences = jsonb_build_object(
  'auto_record_enabled', true,
  'join_buffer_minutes', 2,
  'excluded_keywords', ARRAY['standup', 'personal', '1:1']
)
WHERE id = 'your-user-id';
```

### 2. Test Different Buffer Times
```sql
UPDATE users 
SET calendar_preferences = jsonb_set(
  calendar_preferences,
  '{join_buffer_minutes}',
  '5'
)
WHERE id = 'your-user-id';
```

### 3. Test Bot Failure
- Use an invalid meeting URL
- Check notifications and logs

## Monitoring Dashboard

Create a simple monitoring page:

```tsx
// frontend/src/app/dashboard/auto-join-monitor/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function AutoJoinMonitor() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    // Fetch logs
    fetch('/api/calendar/auto-join/logs', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      }
    })
    .then(res => res.json())
    .then(data => {
      setLogs(data.logs);
      setStats(data.statistics);
    });
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Auto-Join Monitor</h1>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded">
          <div className="text-2xl">{stats.sessions_created_success || 0}</div>
          <div>Sessions Created</div>
        </div>
        <div className="bg-blue-100 p-4 rounded">
          <div className="text-2xl">{stats.bots_deployed_success || 0}</div>
          <div>Bots Deployed</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded">
          <div className="text-2xl">{stats.bots_joined_success || 0}</div>
          <div>Bots Joined</div>
        </div>
        <div className="bg-red-100 p-4 rounded">
          <div className="text-2xl">{stats.bots_deployed_failure || 0}</div>
          <div>Failed</div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="border p-2 rounded">
            <div className="flex justify-between">
              <span>{log.action}</span>
              <span className={log.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                {log.status}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {log.calendar_events?.title} - {new Date(log.created_at).toLocaleString()}
            </div>
            {log.error_message && (
              <div className="text-sm text-red-600">{log.error_message}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Success Criteria

You know auto-join is working when:
1. ✅ Sessions are created automatically before meetings
2. ✅ Bots are deployed without manual intervention
3. ✅ Notifications appear for meeting events
4. ✅ Ongoing meetings indicator shows active calls
5. ✅ Calendar cards show "Bot will join automatically"
6. ✅ Logs show successful bot deployments