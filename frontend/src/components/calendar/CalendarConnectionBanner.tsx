'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon,
  XMarkIcon,
  ArrowRightIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarPermissionModal } from './CalendarPermissionModal';

interface CalendarConnectionBannerProps {
  onConnect?: () => void;
}

export const CalendarConnectionBanner: React.FC<CalendarConnectionBannerProps> = ({ 
  onConnect 
}) => {
  const { session } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeConnection, setActiveConnection] = useState<any | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<'google' | 'outlook' | null>(null);

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED === 'true';
  const outlookEnabled = process.env.NEXT_PUBLIC_OUTLOOK_CALENDAR_ENABLED === 'true';

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissedUntil = localStorage.getItem('calendarBannerDismissedUntil');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        setIsDismissed(true);
        return;
      }
    }

    // Check calendar connection status
    if (session?.access_token) {
      checkCalendarConnection();
    }
  }, [session]);

  const checkCalendarConnection = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };

      const response = await fetch('/api/calendar/connections', { headers });
      
      if (response.ok) {
        const data = await response.json();
        const activeConnections = (data.connections || []).filter((c: any) => c.is_active);
        const firstActive = activeConnections[0] || null;
        setActiveConnection(firstActive);
        const hasConnection = !!firstActive;
        setIsVisible(!hasConnection && !isDismissed);
      }
    } catch (error) {
      console.error('Failed to check calendar connection:', error);
    }
  };

  const handleConnect = async (provider: 'google' | 'outlook') => {
    if (onConnect) {
      onConnect();
      return;
    }
    setPendingProvider(provider);
    setShowPermissionModal(true);
  };

  const handlePermissionModalContinue = async () => {
    try {
      setIsConnecting(true);
      setShowPermissionModal(false);
      
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };

      const provider = pendingProvider ?? (googleEnabled ? 'google' : 'outlook');
      const response = await fetch(`/api/calendar/auth/${provider}?redirect=/dashboard`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      setIsConnecting(false);
    }
  };

  const handlePermissionModalClose = () => {
    setShowPermissionModal(false);
    setPendingProvider(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss for 7 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem('calendarBannerDismissedUntil', dismissUntil.toISOString());
    setIsDismissed(true);
  };

  // If a calendar is connected, show a small connected card instead of CTA
  if (activeConnection) {
    const isGoogle = activeConnection.provider === 'google_calendar';
    const iconSrc = isGoogle
      ? 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/7123030_google_calendar_icon.png'
      : '/logos-recorders/teams.png';

    return (
      <div className="mb-6 rounded-xl border border-border/30 bg-muted/20 p-4">
        <div className="flex items-center gap-3">
          <img src={iconSrc} alt="Calendar" className="w-5 h-5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground">Connected Calendar</div>
            <div className="text-xs text-muted-foreground">
              {activeConnection.email} · {isGoogle ? 'Google' : 'Outlook'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="calendar-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className="bg-gradient-to-r from-app-primary/10 via-app-primary-light/10 to-app-success/10 border border-app-primary/20 rounded-xl p-4 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="bg-app-primary/20 p-2 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-app-primary" />
                  </div>
                  
                  <div className="flex-1">
                     <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                       Connect Your Calendar
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-app-warning bg-app-warning/10 px-2 py-0.5 rounded-full">
                        <BellAlertIcon className="w-3 h-3" />
                        Recommended
                      </span>
                    </h3>
                     <p className="text-sm text-muted-foreground mb-3">
                       Sync your calendar to see upcoming meetings, enable auto-join, and never miss important conversations.
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-3">
                        {googleEnabled && (
                          <button
                            onClick={() => handleConnect('google')}
                            disabled={isConnecting}
                            className="inline-flex items-center gap-2 bg-app-primary hover:bg-app-primary-dark text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
                          >
                            {isConnecting && pendingProvider === 'google' ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  className="w-4 h-4"
                                >
                                  <ArrowRightIcon />
                                </motion.div>
                                Connecting...
                              </>
                            ) : (
                              <>
                                <img src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/7123030_google_calendar_icon.png" alt="Google Calendar" className="w-4 h-4" />
                                Connect Google
                              </>
                            )}
                          </button>
                        )}
                        {outlookEnabled && (
                          <button
                            onClick={() => handleConnect('outlook')}
                            disabled={isConnecting}
                            className="inline-flex items-center gap-2 bg-muted hover:bg-muted/70 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md disabled:opacity-50 border border-border/40"
                          >
                            {isConnecting && pendingProvider === 'outlook' ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  className="w-4 h-4"
                                >
                                  <ArrowRightIcon />
                                </motion.div>
                                Connecting...
                              </>
                            ) : (
                              <>
                                <img src="/logos-recorders/teams.png" alt="Outlook" className="w-4 h-4" />
                                Connect Outlook
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-app-success rounded-full" />
                          Auto-join meetings
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-app-success rounded-full" />
                          Real-time sync
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-app-success rounded-full" />
                          Meeting insights
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Dismiss for 7 days"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Permission Modal */}
      <CalendarPermissionModal
        isOpen={showPermissionModal}
        onClose={handlePermissionModalClose}
        onContinue={handlePermissionModalContinue}
        provider={pendingProvider ?? 'google'}
      />
    </>
  );
};