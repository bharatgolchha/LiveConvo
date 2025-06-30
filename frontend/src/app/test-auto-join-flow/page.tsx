'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { format, addMinutes } from 'date-fns';

export default function TestAutoJoinFlow() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [testMeetingId, setTestMeetingId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [autoJoinLogs, setAutoJoinLogs] = useState<any[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  // Check calendar connections
  const checkCalendarConnections = async () => {
    try {
      const response = await fetch('/api/calendar/connections', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const { connections } = await response.json();
        addLog(`Found ${connections?.length || 0} calendar connections`);
        connections?.forEach((conn: any) => {
          addLog(`- ${conn.email} (${conn.provider}) - Status: ${conn.status}`);
        });
      } else {
        addLog('Failed to fetch calendar connections');
      }
    } catch (error) {
      addLog(`Error fetching connections: ${error}`);
    }
  };

  // Check calendar events
  const checkCalendarEvents = async () => {
    try {
      const response = await fetch('/api/calendar/events', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const events = data.meetings || data.events || data || [];
        setCalendarEvents(Array.isArray(events) ? events : []);
        addLog(`Found ${Array.isArray(events) ? events.length : 0} calendar events`);
      } else {
        addLog('Failed to fetch calendar events');
      }
    } catch (error) {
      addLog(`Error fetching events: ${error}`);
    }
  };

  // Check auto-join logs
  const checkAutoJoinLogs = async () => {
    try {
      const response = await fetch('/api/calendar/auto-join/logs?limit=10', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const { logs } = await response.json();
        setAutoJoinLogs(logs);
        addLog(`Found ${logs.length} auto-join logs`);
      } else {
        addLog('Failed to fetch auto-join logs');
      }
    } catch (error) {
      addLog(`Error fetching logs: ${error}`);
    }
  };

  // Create a test meeting
  const createTestMeeting = async () => {
    setLoading(true);
    addLog('Creating test meeting...');

    try {
      // Create a test calendar event (you'd normally do this in Google Calendar)
      // For now, we'll simulate by creating a session directly
      const meetingTime = addMinutes(new Date(), 2); // 2 minutes from now
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Test Auto-Join Meeting - ${format(new Date(), 'HH:mm')}`,
          conversation_type: 'meeting',
          meeting_url: 'https://meet.google.com/test-auto-join-' + Date.now(),
          context: {
            metadata: {
              test_meeting: true,
              scheduled_time: meetingTime.toISOString()
            }
          }
        })
      });

      if (response.ok) {
        const { session } = await response.json();
        setTestMeetingId(session.id);
        addLog(`✅ Created test session: ${session.id}`);
        addLog(`Meeting URL: ${session.meeting_url}`);
        addLog('⏰ Auto-join should trigger in ~2 minutes');
      } else {
        const error = await response.text();
        addLog(`❌ Failed to create test meeting: ${error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Manually trigger auto-join worker
  const triggerAutoJoinWorker = async () => {
    setLoading(true);
    addLog('Manually triggering auto-join worker...');

    try {
      const response = await fetch('/api/calendar/auto-join/worker', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer aj_secret_7f3d8b2c9e1a5f6d4b8c2e9a1f5d7b3c`
        }
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Worker executed successfully`);
        addLog(`Processed: ${result.results.processed} meetings`);
        addLog(`Sessions created: ${result.results.sessions_created}`);
        addLog(`Bots deployed: ${result.results.bots_deployed}`);
        if (result.results.errors.length > 0) {
          addLog(`⚠️ Errors: ${JSON.stringify(result.results.errors)}`);
        }
      } else {
        const error = await response.text();
        addLog(`❌ Worker failed: ${error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Check calendar preferences
  const checkPreferences = async () => {
    try {
      const response = await fetch('/api/calendar/preferences', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const { preferences } = await response.json();
        addLog(`Auto-join enabled: ${preferences?.auto_join_enabled ? '✅' : '❌'}`);
        addLog(`Auto-record enabled: ${preferences?.auto_record_enabled ? '✅' : '❌'}`);
        addLog(`Buffer minutes: ${preferences?.join_buffer_minutes || 2}`);
      } else {
        addLog('No calendar preferences found');
      }
    } catch (error) {
      addLog(`Error checking preferences: ${error}`);
    }
  };

  useEffect(() => {
    if (session) {
      checkCalendarEvents();
      checkAutoJoinLogs();
      checkPreferences();
    }
  }, [session]);

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Test Auto-Join Flow</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Test Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Step 1: Create Test Meeting</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Create a test meeting scheduled for 2 minutes from now
              </p>
              <Button 
                onClick={createTestMeeting} 
                disabled={loading}
                className="w-full"
              >
                Create Test Meeting
              </Button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Step 2: Trigger Worker</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Manually trigger the auto-join worker (normally runs every minute)
              </p>
              <Button 
                onClick={triggerAutoJoinWorker}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Trigger Auto-Join Worker
              </Button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Step 3: Check Results</h3>
              <div className="space-y-2">
                <Button 
                  onClick={checkCalendarEvents}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Refresh Calendar Events
                </Button>
                <Button 
                  onClick={checkAutoJoinLogs}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Refresh Auto-Join Logs
                </Button>
                <Button 
                  onClick={checkCalendarConnections}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Check Calendar Connections
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Requirements Checklist */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Requirements Checklist</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span>Google Calendar connected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span>Auto-join enabled in preferences (auto_join_enabled)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span>ENABLE_AUTO_JOIN=true in .env</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span>Recall.ai API key configured</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span>Cron job configured (vercel.json)</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Current Settings</h3>
            <div className="text-sm space-y-1">
              <div>Buffer: {process.env.NEXT_PUBLIC_AUTO_JOIN_BUFFER_MINUTES || '2'} minutes</div>
              <div>Worker runs: Every minute</div>
              <div>Region: {process.env.NEXT_PUBLIC_RECALL_AI_REGION || 'us-west-2'}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar Events */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Calendar Events</h2>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {!calendarEvents || calendarEvents.length === 0 ? (
            <p className="text-muted-foreground">No upcoming events</p>
          ) : (
            calendarEvents.map((event: any) => (
              <div key={event.event_id || event.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_time), 'MMM dd, HH:mm')}
                    </p>
                    {event.meeting_url && (
                      <p className="text-xs text-blue-600">{event.meeting_url}</p>
                    )}
                    {event.calendar_email && (
                      <p className="text-xs text-gray-500">Calendar: {event.calendar_email}</p>
                    )}
                  </div>
                  <div className="text-xs">
                    {event.auto_join_enabled && (
                      <span className="block text-blue-600">🔄 Auto-join enabled</span>
                    )}
                    {event.auto_session_created && (
                      <span className="block text-green-600">✅ Session created</span>
                    )}
                    {event.auto_bot_status && (
                      <span className="block">Bot: {event.auto_bot_status}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Auto-Join Logs */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Auto-Join Activity Logs</h2>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {!autoJoinLogs || autoJoinLogs.length === 0 ? (
            <p className="text-muted-foreground">No auto-join activity yet</p>
          ) : (
            autoJoinLogs.map((log: any) => (
              <div key={log.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{log.action}</span>
                    <span className={`ml-2 text-sm ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {log.status}
                    </span>
                    {log.calendar_events && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {log.calendar_events.title}
                      </p>
                    )}
                    {log.error_message && (
                      <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'HH:mm:ss')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Debug Logs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {!logs || logs.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}