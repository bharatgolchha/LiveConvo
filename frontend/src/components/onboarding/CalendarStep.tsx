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
import { CalendarPermissionModal } from '@/components/calendar/CalendarPermissionModal';

interface CalendarStepProps {
  data: {
    calendar_connected: boolean;
    auto_join_enabled?: boolean;
    auto_record_enabled?: boolean;
    auto_email_summary_enabled?: boolean;
  };
  updateData: (data: any) => void;
  onComplete?: () => void;
  onNext?: () => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
  isLastStep?: boolean;
}

export const CalendarStep: React.FC<CalendarStepProps> = ({
  data,
  updateData,
  onComplete,
  onNext,
  onBack,
  isLoading = false,
  error,
  isLastStep = true
}) => {
  const { session } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [existingConnection, setExistingConnection] = useState<CalendarConnection | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    const checkCalendarConnection = async () => {
      try {
        // Check URL params first (for OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const calendarConnected = urlParams.get('calendar_connected');
        
        console.log('🔍 Checking calendar connection, URL params:', calendarConnected);
        
        let shouldUpdateCalendarStatus = false;
        
        if (calendarConnected === 'true' || calendarConnected === 'google' || calendarConnected === 'outlook') {
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

  const [pendingProvider, setPendingProvider] = useState<'google' | 'outlook' | null>(null);

  const handleConnectCalendar = async (provider: 'google' | 'outlook' = 'google') => {
    if (provider === 'google') {
      setPendingProvider('google');
      setShowPermissionModal(true);
      return;
    }

    // Outlook: skip modal and go straight to Microsoft OAuth
    try {
      setIsConnecting(true);
      setConnectionError(null);
      const response = await fetch(`/api/calendar/auth/outlook`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }

      const { auth_url } = await response.json();
      window.location.href = auth_url;
    } catch (error) {
      console.error('Calendar connection error (Outlook):', error);
      setConnectionError('Failed to connect Outlook. Please try again.');
      setIsConnecting(false);
    }
  };

  const handlePermissionModalContinue = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      setShowPermissionModal(false);

      const provider = pendingProvider ?? 'google';
      const response = await fetch(`/api/calendar/auth/${provider}`, {
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

  const handlePermissionModalClose = () => {
    setShowPermissionModal(false);
    setPendingProvider(null);
  };

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED === 'true';
  const outlookEnabled = process.env.NEXT_PUBLIC_OUTLOOK_CALENDAR_ENABLED === 'true';
  const providerText = googleEnabled && outlookEnabled ? 'Google or Outlook' : googleEnabled ? 'Google' : 'Outlook';

  const calendarBenefits = [
    'Auto‑join meetings right on time',
    'Get pre‑call prep and AI guidance',
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
        
        <h2 className="text-2xl font-bold text-foreground mb-2">Connect your calendar</h2>
        <p className="text-muted-foreground">Sync your {providerText} calendar to enable auto‑join, pre‑call prep, and AI‑powered notes.</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {googleEnabled && (
            <Button
              onClick={() => handleConnectCalendar('google')}
              disabled={isConnecting}
              variant="primary"
              className="w-full py-4 px-6 text-base font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3 rounded-lg group"
            >
              {isConnecting && pendingProvider === 'google' ? (
                <>
                  <div className="w-5 h-5 border-2 border-app-primary border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 group-hover:bg-white/20 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                    </svg>
                  </div>
                  <span className="font-medium">Connect Google Calendar</span>
                </>
              )}
            </Button>
            )}
            {outlookEnabled && (
            <Button
              onClick={() => handleConnectCalendar('outlook')}
              disabled={isConnecting}
              variant="primary"
              className="w-full py-4 px-6 text-base font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3 rounded-lg group"
            >
              {isConnecting && pendingProvider === 'outlook' ? (
                <>
                  <div className="w-5 h-5 border-2 border-app-primary border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 group-hover:bg-white/20 transition-colors">
                    <img src="/platform-logos/teams.png" alt="Outlook" className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Connect Outlook</span>
                </>
              )}
            </Button>
            )}
            </div>
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
                checked={data.auto_join_enabled ?? true}
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
                checked={data.auto_record_enabled ?? true}
                onCheckedChange={(checked) => updateData({ auto_record_enabled: checked })}
              />
            </div>

            {/* Auto-email summary toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-foreground">Email summary to attendees</p>
                <p className="text-sm text-muted-foreground">
                  Send a post-meeting summary to everyone on the invite
                </p>
              </div>
              <Switch
                checked={data.auto_email_summary_enabled ?? false}
                onCheckedChange={(checked) => updateData({ auto_email_summary_enabled: checked })}
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
          onClick={isLastStep ? onComplete : onNext}
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
              {isLastStep ? (
                data.calendar_connected ? (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Complete Setup
                  </>
                ) : (
                  'Skip for Now'
                )
              ) : (
                data.calendar_connected ? (
                  <>
                    Continue
                    <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                  </>
                ) : (
                  'Skip for Now'
                )
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

      {/* Permission Modal */}
      <CalendarPermissionModal
        isOpen={showPermissionModal}
        onClose={handlePermissionModalClose}
        onContinue={handlePermissionModalContinue}
        provider="google"
      />
    </div>
  );
};