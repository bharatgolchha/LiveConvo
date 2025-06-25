import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SyncBotStatusButtonProps {
  sessionId?: string;
  onSyncComplete?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SyncBotStatusButton({ 
  sessionId, 
  onSyncComplete,
  variant = 'outline',
  size = 'default'
}: SyncBotStatusButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const { session } = useAuth();

  const handleSync = async () => {
    if (!session?.access_token) return;

    setSyncing(true);
    setSyncResults(null);

    try {
      const response = await fetch('/api/usage/sync-bot-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          syncAll: !sessionId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncResults(data);
      setShowResults(true);

      if (data.updated > 0 && onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResults({
        error: error instanceof Error ? error.message : 'Failed to sync bot status'
      });
      setShowResults(true);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleSync}
        disabled={syncing}
        variant={variant}
        size={size}
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : sessionId ? 'Sync Status' : 'Sync All Sessions'}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {syncResults?.error ? 'Sync Failed' : 'Sync Results'}
            </DialogTitle>
            <DialogDescription>
              {syncResults?.error ? (
                <div className="flex items-center gap-2 text-red-600 mt-2">
                  <AlertCircle className="w-5 h-5" />
                  {syncResults.error}
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    {syncResults?.message || 'Sync completed successfully'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Completed in {syncResults?.duration}ms
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {syncResults?.sessions && syncResults.sessions.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm">Session Details:</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {syncResults.sessions.map((session: any, index: number) => (
                  <div
                    key={session.sessionId || index}
                    className={`p-3 rounded-lg border text-sm ${
                      session.status === 'updated'
                        ? 'bg-green-50 border-green-200'
                        : session.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{session.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Status: {session.status}
                      {session.billableMinutes > 0 && (
                        <span> • {session.billableMinutes} minutes</span>
                      )}
                      {session.cost && <span> • {session.cost}</span>}
                    </div>
                    {session.error && (
                      <div className="text-xs text-red-600 mt-1">{session.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResults(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}