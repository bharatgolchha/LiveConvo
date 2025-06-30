'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestAutoJoin() {
  const [logs, setLogs] = useState<any>(null);
  const [meetingStatus, setMeetingStatus] = useState<any>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [eventIdToReset, setEventIdToReset] = useState<string>('');

  useEffect(() => {
    // Get auth token from localStorage
    const authData = localStorage.getItem('sb-ucvfgfbjcrxbzppwjpuu-auth-token');
    if (authData) {
      const parsed = JSON.parse(authData);
      setToken(parsed.access_token);
    }
  }, []);

  const testLogs = async () => {
    try {
      const response = await fetch('/api/calendar/auto-join/logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setLogs(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const testMeetingStatus = async () => {
    try {
      const response = await fetch('/api/calendar/meeting-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setMeetingStatus(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const testNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?unread=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setNotifications(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const triggerAutoJoinWorker = async () => {
    try {
      const response = await fetch('/api/calendar/auto-join/worker', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer aj_secret_7f3d8b2c9e1a5f6d4b8c2e9a1f5d7b3c'
        }
      });
      const data = await response.json();
      alert('Worker triggered! Check console for results.');
      console.log('Worker response:', data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const enableAutoJoin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Not logged in');
        return;
      }

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('calendar_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing preferences
        const { error } = await supabase
          .from('calendar_preferences')
          .update({
            auto_record_enabled: true,
            join_buffer_minutes: 2,
            excluded_keywords: []
          })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Create new preferences
        const { error } = await supabase
          .from('calendar_preferences')
          .insert({
            user_id: user.id,
            auto_record_enabled: true,
            auto_join_enabled: true,
            join_buffer_minutes: 2,
            notify_before_join: true,
            notification_minutes: 5,
            excluded_keywords: [],
            included_domains: []
          });
        
        if (error) throw error;
      }

      alert('Auto-join enabled successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetEvent = async () => {
    if (!eventIdToReset) {
      setError('Please enter an event ID');
      return;
    }

    try {
      const response = await fetch('/api/calendar/auto-join/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId: eventIdToReset })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset event');
      }
      
      alert('Event reset successfully! You can now trigger auto-join again.');
      setEventIdToReset('');
      testLogs(); // Refresh logs
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Auto-Join Testing Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Auth Token: {token ? '✓ Found' : '✗ Not found'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={enableAutoJoin}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Enable Auto-Join in Database
        </button>
        <button
          onClick={triggerAutoJoinWorker}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Trigger Auto-Join Worker
        </button>
      </div>

      <div className="mb-8 p-4 bg-yellow-100 rounded">
        <h3 className="font-semibold mb-2">Reset Failed Event</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter event ID (e.g., 9e33e49b-b122-4998-85bc-01e65ee97ff0)"
            value={eventIdToReset}
            onChange={(e) => setEventIdToReset(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={resetEvent}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Reset Event
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Use this to reset failed auto-join attempts. Find the event ID in the logs above.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <button
            onClick={testLogs}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-2 w-full"
          >
            Test Logs API
          </button>
          {logs && (
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(logs, null, 2)}
            </pre>
          )}
        </div>

        <div>
          <button
            onClick={testMeetingStatus}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-2 w-full"
          >
            Test Meeting Status API
          </button>
          {meetingStatus && (
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(meetingStatus, null, 2)}
            </pre>
          )}
        </div>

        <div>
          <button
            onClick={testNotifications}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-2 w-full"
          >
            Test Notifications API
          </button>
          {notifications && (
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(notifications, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Testing Steps:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Enable Auto-Join in Database" to enable the feature</li>
          <li>Create a calendar event with a meeting URL starting in 5-10 minutes</li>
          <li>Click "Trigger Auto-Join Worker" to process meetings</li>
          <li>Click the test buttons to see the API responses</li>
          <li>Check if a session was created and bot deployed</li>
        </ol>
      </div>
    </div>
  );
}