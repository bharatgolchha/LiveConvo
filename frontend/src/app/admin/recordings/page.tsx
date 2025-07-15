'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Video, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Download,
  ExternalLink
} from 'lucide-react';

interface SessionWithRecording {
  id: string;
  title: string;
  created_at: string;
  recall_bot_id: string;
  recall_recording_id?: string;
  recall_recording_url?: string;
  recall_recording_status?: string;
  recall_recording_expires_at?: string;
}

export default function AdminRecordingsPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [sessions, setSessions] = useState<SessionWithRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !session) {
      router.push('/auth/login');
      return;
    }
    fetchSessions();
  }, [user, session, router]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/sessions-with-bots', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      setSyncResults(null);
      setError(null);
      
      const response = await fetch('/api/admin/sync-recall-recordings', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Sync failed');
      }

      const results = await response.json();
      setSyncResults(results);
      
      // Refresh the sessions list
      await fetchSessions();
    } catch (error) {
      console.error('Sync error:', error);
      setError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/admin/sync-recall-recordings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Sync failed');
      }

      // Refresh the sessions list
      await fetchSessions();
    } catch (error) {
      console.error('Single session sync error:', error);
      alert(error instanceof Error ? error.message : 'Sync failed');
    }
  };

  const getStatusBadge = (status?: string, expiresAt?: string) => {
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    
    if (isExpired) {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Expired</Badge>;
    }
    
    switch (status) {
      case 'done':
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Available</Badge>;
      case 'processing':
        return <Badge variant="default" className="gap-1"><RefreshCw className="h-3 w-3 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Video className="h-3 w-3" />No Recording</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Recall.ai Recordings Management</h1>
        <p className="text-muted-foreground">
          Sync and manage recording URLs from Recall.ai bots
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {syncResults && (
        <Card className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <h3 className="font-semibold mb-2">Sync Results</h3>
          <p>{syncResults.message}</p>
          {syncResults.results && (
            <div className="mt-2 text-sm">
              <p>Processed: {syncResults.results.processed}</p>
              <p>Updated: {syncResults.results.updated}</p>
              <p>Failed: {syncResults.results.failed}</p>
            </div>
          )}
        </Card>
      )}

      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Sessions with Recall Bots</h2>
          <Button 
            onClick={handleSyncAll}
            disabled={syncing}
            className="gap-2"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sync All Missing
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sessions found with Recall bots
            </p>
          ) : (
            sessions.map((session) => (
              <div 
                key={session.id} 
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{session.title || 'Untitled Session'}</h3>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(session.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bot ID: {session.recall_bot_id}
                  </p>
                  {session.recall_recording_id && (
                    <p className="text-xs text-muted-foreground">
                      Recording ID: {session.recall_recording_id}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {getStatusBadge(session.recall_recording_status, session.recall_recording_expires_at)}
                  
                  {!session.recall_recording_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncSession(session.id)}
                      className="gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Sync
                    </Button>
                  )}
                  
                  {session.recall_recording_url && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/report/${session.id}`)}
                        className="gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(session.recall_recording_url, '_blank')}
                        className="gap-2"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}