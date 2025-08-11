'use client';

import { useState } from 'react';
import { CalendarConnection } from '@/types/calendar';
import { Button } from '@/components/ui/Button';
import { 
  TrashIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarConnectionCardProps {
  connection: CalendarConnection;
  onDisconnect: () => void;
  onSync: () => void;
}

export const CalendarConnectionCard: React.FC<CalendarConnectionCardProps> = ({
  connection,
  onDisconnect,
  onSync
}) => {
  const { session } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/calendar/refresh', {
        method: 'POST',
        headers,
        body: JSON.stringify({ connectionId: connection.id })
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const result = await response.json();
      console.log('Calendar refresh result:', result);
      
      // After refresh, sync events
      await handleSync();
    } catch (error) {
      console.error('Failed to refresh calendar:', error);
      alert('Failed to refresh calendar. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers,
        body: JSON.stringify({ connectionId: connection.id })
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();
      console.log('Sync result:', result);
      
      if (result.event_count === 0) {
        alert('No events found. Your calendar may still be syncing with Recall.ai. Please try refreshing in a few moments.');
      }

      onSync();
    } catch (error) {
      console.error('Failed to sync calendar:', error);
      alert('Failed to sync calendar. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const getProviderIcon = () => {
    switch (connection.provider) {
      case 'google_calendar':
        return (
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/7123030_google_calendar_icon.png"
              alt="Google Calendar"
              className="w-6 h-6"
            />
          </div>
        );
      case 'microsoft_outlook':
        return (
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/logos-recorders/teams.png" alt="Outlook" className="w-6 h-6" />
          </div>
        );
      default:
        return null;
    }
  };

  const getProviderLabel = () => {
    switch (connection.provider) {
      case 'google_calendar':
        return 'Google';
      case 'microsoft_outlook':
        return 'Outlook';
      default:
        return 'Calendar';
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {getProviderIcon()}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{(connection as any).provider_display_name || connection.display_name || connection.email}</h3>
              {connection.is_active ? (
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ExclamationCircleIcon className="w-4 h-4 text-yellow-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {(connection as any).provider_email || connection.email}
              <span className="ml-2 inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/80 border border-border/50">
                {getProviderLabel()}
              </span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              {connection.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced {formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}
                </p>
              )}
              {(connection as any).recall_status && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  (connection as any).recall_status === 'connected' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : (connection as any).recall_status === 'connecting'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {(connection as any).recall_status}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing || syncing}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            title={`Force refresh from ${getProviderLabel()} Calendar`}
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing || refreshing}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            title="Sync events to local database"
          >
            <ArrowPathIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button
            onClick={onDisconnect}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};