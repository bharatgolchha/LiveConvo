'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { format } from 'date-fns';

export default function TestBotStatus() {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  // Fetch sessions with bot status
  const fetchSessions = async () => {
    try {
      setLoading(true);
      addLog('Fetching sessions with bot status...');

      const response = await fetch('/api/sessions?limit=50', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        addLog(`Found ${data.sessions.length} sessions`);
        
        // Count sessions with bot status
        const withBotStatus = data.sessions.filter((s: any) => s.recall_bot_status);
        addLog(`${withBotStatus.length} sessions have bot status`);
        
        // Log bot status breakdown
        const statusCounts: Record<string, number> = {};
        withBotStatus.forEach((s: any) => {
          statusCounts[s.recall_bot_status] = (statusCounts[s.recall_bot_status] || 0) + 1;
        });
        
        Object.entries(statusCounts).forEach(([status, count]) => {
          addLog(`- ${status}: ${count} sessions`);
        });
      } else {
        addLog('Failed to fetch sessions');
      }
    } catch (error) {
      addLog(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Update bot status for a session
  const updateBotStatus = async (sessionId: string, newStatus: string) => {
    try {
      addLog(`Updating session ${sessionId} bot status to: ${newStatus}`);
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recall_bot_status: newStatus
        })
      });
      
      if (response.ok) {
        addLog(`✅ Bot status updated to ${newStatus}`);
        await fetchSessions(); // Refresh list
      } else {
        const error = await response.text();
        addLog(`❌ Failed to update bot status: ${error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  // Check bot status from Recall.ai
  const checkBotStatus = async (sessionId: string, botId: string) => {
    try {
      addLog(`Checking bot status for session ${sessionId}, bot ${botId}`);
      
      const response = await fetch(`/api/sessions/${sessionId}/bot-status`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const { bot_status, recall_status } = await response.json();
        addLog(`✅ Bot status: ${bot_status} (Recall status: ${recall_status})`);
      } else {
        addLog('❌ Failed to check bot status');
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  useEffect(() => {
    if (session) {
      fetchSessions();
    }
  }, [session]);

  const botStatuses = ['created', 'joining', 'in_call', 'completed', 'failed', 'timeout'];

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Test Bot Status Display</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Controls */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <div className="space-y-4">
            <Button 
              onClick={fetchSessions} 
              disabled={loading}
              className="w-full"
            >
              Refresh Sessions
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p>Sessions with bots will show status badges in the dashboard.</p>
              <p className="mt-2">Status types:</p>
              <ul className="mt-1 space-y-1">
                <li>• <span className="font-medium">created</span> - Bot created, not yet joined</li>
                <li>• <span className="font-medium">joining</span> - Bot is joining the meeting</li>
                <li>• <span className="font-medium">in_call</span> - Bot is actively recording</li>
                <li>• <span className="font-medium">completed</span> - Recording finished successfully</li>
                <li>• <span className="font-medium">failed</span> - Bot failed to join or record</li>
                <li>• <span className="font-medium">timeout</span> - Bot timed out</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Session Stats */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Session Statistics</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Sessions:</span>
              <span className="font-medium">{sessions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Sessions with Bots:</span>
              <span className="font-medium">
                {sessions.filter(s => s.recall_bot_id).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Active Bots:</span>
              <span className="font-medium">
                {sessions.filter(s => s.recall_bot_status === 'in_call').length}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Sessions with Bot Status */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Sessions with Bot Status</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sessions.filter(s => s.recall_bot_id).length === 0 ? (
            <p className="text-muted-foreground">No sessions with bots found</p>
          ) : (
            sessions.filter(s => s.recall_bot_id).map((session: any) => (
              <div key={session.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium">{session.title}</h3>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>Status: {session.status}</span>
                      {session.recall_bot_status && (
                        <span className="ml-3">Bot: {session.recall_bot_status}</span>
                      )}
                      {session.recall_bot_id && (
                        <span className="ml-3 text-xs">Bot ID: {session.recall_bot_id.slice(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {session.recall_bot_id && (
                      <Button
                        onClick={() => checkBotStatus(session.id, session.recall_bot_id)}
                        size="sm"
                        variant="outline"
                      >
                        Check Status
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Test different bot statuses */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {botStatuses.map(status => (
                    <Button
                      key={status}
                      onClick={() => updateBotStatus(session.id, status)}
                      size="sm"
                      variant={session.recall_bot_status === status ? 'primary' : 'outline'}
                      className="text-xs"
                    >
                      Set: {status}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Debug Logs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
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