'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarConnection } from '@/types/calendar';

interface CalendarStepProps {
  data: {
    calendar_connected: boolean;
    auto_join_enabled?: boolean;
    auto_record_enabled?: boolean;
  };
  updateData: (data: any) => void;
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const CalendarStep: React.FC<CalendarStepProps> = ({
  data,
  updateData,
  onComplete,
  onBack,
  isLoading,
  error
}) => {
  const { session } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [existingConnection, setExistingConnection] = useState<CalendarConnection | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    const checkCalendarConnection = async () => {
      try {
        // Check URL params first (for OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const calendarConnected = urlParams.get('calendar_connected');
        
        console.log('🔍 Checking calendar connection, URL params:', calendarConnected);
        
        let shouldUpdateCalendarStatus = false;
        
        if (calendarConnected === 'true' || calendarConnected === 'google') {
          console.log('✅ Calendar connected via URL param');
          shouldUpdateCalendarStatus = true;
        }

        // Check for existing calendar connections
        const response = await fetch('/api/calendar/connections', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });

        if (response.ok) {
          const responseData = await response.json();
          const connections = responseData.connections || [];
          console.log('📅 Existing calendar connections:', connections);
          
          if (connections.length > 0) {
            setExistingConnection(connections[0]);
            shouldUpdateCalendarStatus = true;
          }
        }
        
        // Only update if calendar status is not already true
        if (shouldUpdateCalendarStatus && !data.calendar_connected) {
          updateData({ calendar_connected: true });
        }
      } catch (error) {
        console.error('❌ Error checking calendar connections:', error);
      } finally {
        setCheckingConnection(false);
      }
    };

    if (session?.access_token) {
      checkCalendarConnection();
    } else {
      setCheckingConnection(false);
    }
  }, [session, updateData, data.calendar_connected]);

  const handleConnectCalendar = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);

      const response = await fetch('/api/calendar/auth/google', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }

      const { auth_url } = await response.json();
      
      // The auth_url already includes the state parameter from the API
      // Just redirect to it directly
      window.location.href = auth_url;
    } catch (error) {
      console.error('Calendar connection error:', error);
      setConnectionError('Failed to connect calendar. Please try again.');
      setIsConnecting(false);
    }
  };

  const calendarBenefits = [
    'Automatically join meetings with AI assistance',
    'Get meeting prep and context before calls',
    'Sync your schedule for better insights'
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full mb-4"
        >
          <CalendarIcon className="w-8 h-8 text-blue-500" />
        </motion.div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Connect Your Calendar
        </h2>
        <p className="text-muted-foreground">
          Get the most out of liveprompt.ai by connecting your Google Calendar
        </p>
      </div>

      <div className="space-y-4">
        {checkingConnection ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-app-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data.calendar_connected && !existingConnection ? (
          <>
            <div className="bg-accent/10 rounded-lg p-6 space-y-3">
              {calendarBenefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircleIcon className="w-5 h-5 text-app-success mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">{benefit}</p>
                </motion.div>
              ))}
            </div>

            <Button
              onClick={handleConnectCalendar}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" />
                  </svg>
                  Connect Google Calendar
                </>
              )}
            </Button>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <CheckCircleIcon className="w-16 h-16 text-app-success mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Calendar Already Connected!
            </h3>
            <p className="text-muted-foreground mb-2">
              Your Google Calendar is synced with liveprompt.ai
            </p>
            {existingConnection && (
              <p className="text-sm text-muted-foreground">
                Connected as: {existingConnection.email}
              </p>
            )}
          </motion.div>
        )}

        {connectionError && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">{connectionError}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Meeting Preferences - Show only when calendar is connected */}
      {(data.calendar_connected || existingConnection) && (
        <div className="space-y-4 border-t pt-6 mt-6">
          <h3 className="text-lg font-medium text-foreground">Meeting Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Configure how liveprompt.ai handles your meetings
          </p>

          <div className="space-y-4">
            {/* Auto-join meetings toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-foreground">Auto-join meetings</p>
                <p className="text-sm text-muted-foreground">
                  Automatically open meeting links when it's time to join
                </p>
              </div>
              <Switch
                checked={data.auto_join_enabled || false}
                onCheckedChange={(checked) => updateData({ auto_join_enabled: checked })}
              />
            </div>

            {/* Auto-record meetings toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-foreground">Auto-record meetings</p>
                <p className="text-sm text-muted-foreground">
                  Automatically deploy recording bot to your scheduled meetings
                </p>
              </div>
              <Switch
                checked={data.auto_record_enabled || false}
                onCheckedChange={(checked) => updateData({ auto_record_enabled: checked })}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            You can change these preferences anytime from your dashboard settings
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={onComplete}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-white py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              {data.calendar_connected ? (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Complete Setup
                </>
              ) : (
                'Skip for Now'
              )}
            </>
          )}
        </Button>
      </div>

      {!data.calendar_connected && (
        <p className="text-center text-xs text-muted-foreground">
          You can always connect your calendar later from settings
        </p>
      )}
    </div>
  );
};