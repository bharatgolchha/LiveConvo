'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarConnection, CalendarPreferences } from '@/types/calendar';
import { CalendarConnectionCard } from './CalendarConnectionCard';
import { CalendarPreferences as CalendarPreferencesComponent } from './CalendarPreferences';
import { CalendarPermissionModal } from './CalendarPermissionModal';
import { PlusIcon } from '@heroicons/react/24/outline';

export const CalendarSettings: React.FC = () => {
  const { session } = useAuth();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [preferences, setPreferences] = useState<CalendarPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<'google' | 'outlook' | null>(null);

  const calendarEnabled = process.env.NEXT_PUBLIC_CALENDAR_ENABLED === 'true';
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED === 'true';
  const outlookEnabled = process.env.NEXT_PUBLIC_OUTLOOK_CALENDAR_ENABLED === 'true';

  useEffect(() => {
    if (session?.access_token && calendarEnabled) {
      loadCalendarData();
    }
  }, [session, calendarEnabled]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };

      // Load connections
      const connectionsResponse = await fetch('/api/calendar/connections', { headers });
      if (connectionsResponse.ok) {
        const data = await connectionsResponse.json();
        setConnections(data.connections || []);
      }

      // Load preferences
      const preferencesResponse = await fetch('/api/calendar/preferences', { headers });
      if (preferencesResponse.ok) {
        const data = await preferencesResponse.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCalendar = async (provider: 'google' | 'outlook') => {
    setPendingProvider(provider);
    setShowPermissionModal(true);
  };

  const handlePermissionModalContinue = async () => {
    if (!pendingProvider) return;
    
    try {
      setConnecting(true);
      setShowPermissionModal(false);
      
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };

      const response = await fetch(`/api/calendar/auth/${pendingProvider}`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to initiate calendar connection');
      }

      const data = await response.json();
      
      if (data.auth_url) {
        // Redirect to OAuth provider
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      alert('Failed to connect calendar. Please try again.');
    } finally {
      setConnecting(false);
      setPendingProvider(null);
    }
  };

  const handlePermissionModalClose = () => {
    setShowPermissionModal(false);
    setPendingProvider(null);
  };

  const handleDisconnectCalendar = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar?')) {
      return;
    }

    try {
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/calendar/connections', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ connectionId })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      // Reload connections
      await loadCalendarData();
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      alert('Failed to disconnect calendar. Please try again.');
    }
  };

  const handleUpdatePreferences = async (updates: Partial<CalendarPreferences>) => {
    try {
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/calendar/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      alert('Failed to update preferences. Please try again.');
    }
  };

  if (!calendarEnabled) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Calendar Integration</h2>
        <p className="text-muted-foreground">Calendar integration is not enabled for this environment.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Calendar Integration</h2>
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-20 bg-muted rounded mb-4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  const hasGoogleConnection = connections.some(c => c.provider === 'google_calendar');
  const hasOutlookConnection = connections.some(c => c.provider === 'microsoft_outlook');

  return (
    <div className="space-y-6">
      {/* Connected Calendars */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Connected Calendars</h2>
          {(googleEnabled || outlookEnabled) && (
            <div className="flex gap-2">
              {googleEnabled && !hasGoogleConnection && (
                <Button
                  onClick={() => handleConnectCalendar('google')}
                  disabled={connecting}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Connect Google Calendar
                </Button>
              )}
              {outlookEnabled && !hasOutlookConnection && (
                <Button
                  onClick={() => handleConnectCalendar('outlook')}
                  disabled={connecting}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Connect Outlook
                </Button>
              )}
            </div>
          )}
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No calendars connected yet. Connect your calendar to automatically join meetings and enable AI-powered meeting assistance.
            </p>
            <div className="flex justify-center gap-4">
              {googleEnabled && (
                <Button
                  onClick={() => handleConnectCalendar('google')}
                  disabled={connecting}
                  className="flex items-center gap-2"
                >
                  <img src="/google-calendar-icon.svg" alt="Google Calendar" className="w-5 h-5" />
                  Connect Google Calendar
                </Button>
              )}
              {outlookEnabled && (
                <Button
                  onClick={() => handleConnectCalendar('outlook')}
                  disabled={connecting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <img src="/outlook-icon.svg" alt="Outlook" className="w-5 h-5" />
                  Connect Outlook
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {connections.map((connection) => (
              <CalendarConnectionCard
                key={connection.id}
                connection={connection}
                onDisconnect={() => handleDisconnectCalendar(connection.id)}
                onSync={() => loadCalendarData()}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Calendar Preferences */}
      {connections.length > 0 && preferences && (
        <CalendarPreferencesComponent
          preferences={preferences}
          onUpdate={handleUpdatePreferences}
        />
      )}

      {/* Permission Modal */}
      {pendingProvider && (
        <CalendarPermissionModal
          isOpen={showPermissionModal}
          onClose={handlePermissionModalClose}
          onContinue={handlePermissionModalContinue}
          provider={pendingProvider}
        />
      )}
    </div>
  );
};