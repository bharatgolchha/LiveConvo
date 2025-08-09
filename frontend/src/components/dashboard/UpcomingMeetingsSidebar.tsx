'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon, 
  ArrowPathIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ClockIcon,
  VideoCameraIcon,
  UserGroupIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { format, isToday, isTomorrow, isThisWeek, differenceInMinutes } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CalendarEventCard } from '@/components/calendar/CalendarEventCard';
import { CalendarEmptyState } from '@/components/calendar/CalendarEmptyState';
import { MeetingCardSkeleton } from '@/components/calendar/MeetingCardSkeleton';
import { CalendarSyncProgress } from '@/components/calendar/CalendarSyncStatus';
import { CalendarErrorHandler, CalendarError, parseCalendarError } from '@/components/calendar/CalendarErrorHandler';
import { CalendarQuickActions } from '@/components/calendar/CalendarQuickActions';
import { CalendarPermissionModal } from '@/components/calendar/CalendarPermissionModal';
import { ScheduleMeetingModal } from '@/components/calendar/ScheduleMeetingModal';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithCache } from '@/lib/utils/fetchCache';
import { UpcomingMeeting } from '@/types/calendar';

interface UpcomingMeetingsSidebarProps {
  className?: string;
  defaultOpen?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

export const UpcomingMeetingsSidebar: React.FC<UpcomingMeetingsSidebarProps> = ({ 
  className = '',
  defaultOpen = true,
  isMobile = false,
  onClose
}) => {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('week');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [hasCalendarConnection, setHasCalendarConnection] = useState<boolean | null>(null);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [calendarError, setCalendarError] = useState<CalendarError | null>(null);
  const [calendarConnection, setCalendarConnection] = useState<any>(null);
  const [calendarPreferences, setCalendarPreferences] = useState<any>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const calendarEnabled = process.env.NEXT_PUBLIC_CALENDAR_ENABLED === 'true';
  const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('upcomingMeetingsSidebarOpen');
    if (savedState !== null) {
      setIsOpen(savedState === 'true');
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('upcomingMeetingsSidebarOpen', isOpen.toString());
  }, [isOpen]);

  // Load meetings and check calendar connection
  useEffect(() => {
    if (session?.access_token && calendarEnabled && isOpen) {
      checkCalendarConnection();
      loadMeetings();
    }
  }, [session, filter, calendarEnabled, isOpen]);

  // Auto-refresh meetings every 5 minutes when sidebar is open
  useEffect(() => {
    if (!isOpen || !calendarEnabled || !session?.access_token) return;

    const intervalId = setInterval(() => {
      loadMeetings();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isOpen, calendarEnabled, session?.access_token, filter]);

  // Refresh when sidebar is opened after being closed for a while
  useEffect(() => {
    if (isOpen && lastRefreshTime) {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime.getTime();
      if (timeSinceLastRefresh > AUTO_REFRESH_INTERVAL) {
        loadMeetings();
      }
    }
  }, [isOpen]);

  const checkCalendarConnection = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };

      const data = await fetchWithCache('/api/calendar/connections', { headers, ttl: 60_000 });
      
      if (data) {
        const activeConnections = data.connections?.filter((c: any) => c.is_active) || [];
        setHasCalendarConnection(activeConnections.length > 0);
        if (activeConnections.length > 0) {
          setCalendarConnection(activeConnections[0]);
          // Load preferences
          loadCalendarPreferences();
        }
      }
    } catch (error) {
      console.error('Failed to check calendar connection:', error);
      setHasCalendarConnection(false);
      const parsedError = parseCalendarError(error);
      setCalendarError(parsedError);
    }
  };

  const handleConnectCalendar = async () => {
    setShowPermissionModal(true);
  };

  const handlePermissionModalContinue = async () => {
    try {
      setIsConnectingCalendar(true);
      setShowPermissionModal(false);
      
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };
      
      const response = await fetch('/api/calendar/auth/google', { headers });
      
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      } else {
        console.error('Failed to get calendar auth URL');
        setIsConnectingCalendar(false);
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      setIsConnectingCalendar(false);
    }
  };

  const handlePermissionModalClose = () => {
    setShowPermissionModal(false);
  };

  const loadCalendarPreferences = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };

      const prefData = await fetchWithCache('/api/calendar/preferences', { headers, ttl: 60_000 });
      if (prefData) {
        setCalendarPreferences(prefData.preferences);
      }
    } catch (error) {
      console.error('Failed to load calendar preferences:', error);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!calendarConnection) return;
    
    try {
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/calendar/connections', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ connectionId: calendarConnection.id })
      });
      
      if (response.ok) {
        setHasCalendarConnection(false);
        setCalendarConnection(null);
        setMeetings([]);
      }
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      const parsedError = parseCalendarError(error);
      setCalendarError(parsedError);
    }
  };

  const handleUpdatePreferences = async (prefs: any) => {
    try {
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/calendar/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify(prefs)
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalendarPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      const parsedError = parseCalendarError(error);
      setCalendarError(parsedError);
    }
  };

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };

      const data = await fetchWithCache(`/api/calendar/events?filter=${filter}`, { headers, ttl: 60_000 });
      if (data) {
        setMeetings(data.meetings || []);
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
      const parsedError = parseCalendarError(error);
      setCalendarError(parsedError);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMeetings();
    setIsRefreshing(false);
  };

  const handleSyncCalendar = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('syncing');
      setSyncProgress(0);
      setSyncMessage('Fetching calendar connections...');
      
      // First, get the calendar connection
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };
      
      // Simulate progress
      setSyncProgress(20);
      
      // Get calendar connections
      const connectionsResponse = await fetchWithCache('/api/calendar/connections', { headers, ttl: 60_000 });
      if (!connectionsResponse) {
        throw new Error('Failed to get calendar connections');
      }
      
      setSyncProgress(40);
      setSyncMessage('Found calendar connection...');
      
      const { connections } = connectionsResponse;
      if (!connections || connections.length === 0) {
        console.error('No calendar connections found');
        setSyncStatus('error');
        return;
      }
      
      // Sync the first active connection
      const activeConnection = connections.find((c: any) => c.is_active);
      if (!activeConnection) {
        console.error('No active calendar connection found');
        setSyncStatus('error');
        return;
      }
      
      setSyncProgress(60);
      setSyncMessage('Syncing with Google Calendar...');
      
      // Use the refresh endpoint to force Recall.ai to sync with Google Calendar
      const refreshResponse = await fetchWithCache('/api/calendar/refresh', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId: activeConnection.id })
      });
      
      setSyncProgress(80);
      
      if (!refreshResponse) {
        // Fallback to regular sync if refresh endpoint doesn't exist
        const syncResponse = await fetchWithCache('/api/calendar/events', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ connectionId: activeConnection.id })
        });
        
        if (!syncResponse) {
          throw new Error('Failed to sync calendar');
        }
      }
      
      setSyncProgress(100);
      setSyncMessage('Loading updated events...');
      setSyncStatus('success');
      
      // Reload meetings after sync
      await loadMeetings();
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncProgress(0);
        setSyncMessage('');
      }, 3000);
    } catch (error) {
      console.error('Failed to sync calendar:', error);
      setSyncStatus('error');
      setSyncMessage('Sync failed');
      
      const parsedError = parseCalendarError(error);
      setCalendarError(parsedError);
      
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncProgress(0);
        setSyncMessage('');
      }, 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  if (!calendarEnabled) {
    return null;
  }

  const groupMeetingsByDate = () => {
    const groups: { [key: string]: UpcomingMeeting[] } = {};
    
    meetings.forEach(meeting => {
      const date = new Date(meeting.start_time);
      let key: string;
      
      if (isToday(date)) {
        key = 'Today';
      } else if (isTomorrow(date)) {
        key = 'Tomorrow';
      } else if (isThisWeek(date)) {
        key = format(date, 'EEEE');
      } else {
        key = format(date, 'MMM d');
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(meeting);
    });
    
    return groups;
  };

  const meetingGroups = groupMeetingsByDate();
  const hasUpcomingMeetings = meetings.length > 0;

  // Get next meeting
  const nextMeeting = meetings.length > 0 ? meetings[0] : null;
  const minutesUntilNext = nextMeeting 
    ? differenceInMinutes(new Date(nextMeeting.start_time), new Date())
    : null;

  return (
    <>
      {/* Drawer-Style Toggle Button (shown when sidebar is closed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ x: 48 }}
            animate={{ x: 0 }}
            exit={{ x: 48 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`fixed z-40 ${
              isMobile ? 'bottom-20' : 'top-1/2 -translate-y-1/2'
            } right-0`}
          >
            <button
              onClick={toggleSidebar}
              className="relative group"
              title="Show upcoming meetings"
            >
              {/* Main button */}
              <div className="relative bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 rounded-l-2xl pl-3 pr-2 py-2.5 hover:pl-4 flex items-center gap-2">
                {/* Calendar Icon */}
                <CalendarIcon className="w-5 h-5" />
                
                {/* Meeting count badge */}
                {hasUpcomingMeetings && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">
                      {meetings.length}
                    </span>
                  </div>
                )}
                
                {/* Chevron indicator */}
                <ChevronLeftIcon className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Pulse indicator for urgent meetings */}
              {minutesUntilNext !== null && minutesUntilNext <= 15 && minutesUntilNext >= 0 && (
                <span className="absolute -top-1 -left-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                </span>
              )}
              
              {/* Tooltip on hover */}
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded-md shadow-md whitespace-nowrap border border-border">
                  {hasUpcomingMeetings ? (
                    <>
                      {minutesUntilNext !== null && minutesUntilNext <= 60 && minutesUntilNext >= 0 ? (
                        <span className="text-accent font-medium">
                          Next meeting in {minutesUntilNext} min
                        </span>
                      ) : (
                        <span>{meetings.length} upcoming meeting{meetings.length !== 1 ? 's' : ''}</span>
                      )}
                    </>
                  ) : (
                    <span>No upcoming meetings</span>
                  )}
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100%' : 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`bg-card border-l border-border flex flex-col shadow-xl z-30 h-full relative ${className}`}
            style={{ maxWidth: isMobile ? '100vw' : '380px' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-semibold">Upcoming Meetings</h2>
                </div>
                <div className="flex items-center gap-1">
                  
                  {hasCalendarConnection && (
                    <CalendarQuickActions
                      connection={calendarConnection}
                      preferences={calendarPreferences}
                      onDisconnect={handleDisconnectCalendar}
                      onUpdatePreferences={handleUpdatePreferences}
                    />
                  )}

                  {/* Schedule Meeting Button - only when connected */}
                  {hasCalendarConnection && (
                    <Button
                      onClick={() => setShowScheduleModal(true)}
                      variant="ghost"
                      size="sm"
                      className="p-1.5"
                      title="Schedule a meeting"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    onClick={handleRefresh}
                    variant="ghost"
                    size="sm"
                    className="p-1.5"
                    disabled={isRefreshing}
                    title="Refresh meetings"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    onClick={toggleSidebar}
                    variant="ghost"
                    size="sm"
                    className="p-1.5"
                    title="Hide sidebar"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1 mt-3">
                <button
                  onClick={() => setFilter('today')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === 'today' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setFilter('week')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === 'week' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === 'all' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            {/* Sync Progress */}
            <CalendarSyncProgress
              isVisible={syncStatus === 'syncing'}
              progress={syncProgress}
              message={syncMessage}
            />

            {/* Error Display */}
            {calendarError && hasCalendarConnection && (
              <CalendarErrorHandler
                error={calendarError}
                onRetry={() => {
                  setCalendarError(null);
                  handleSyncCalendar();
                }}
                onDismiss={() => setCalendarError(null)}
              />
            )}

            {/* Next Meeting Highlight */}
            {nextMeeting && minutesUntilNext !== null && minutesUntilNext <= 15 && minutesUntilNext >= 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 bg-accent/10 border-b border-accent/20"
              >
                <div className="flex items-center gap-2 text-accent">
                  <ClockIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Starting {minutesUntilNext === 0 ? 'now' : `in ${minutesUntilNext} minute${minutesUntilNext === 1 ? '' : 's'}`}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {nextMeeting.title}
                </p>
              </motion.div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {hasCalendarConnection === false ? (
                <CalendarEmptyState 
                  onConnectCalendar={handleConnectCalendar}
                  isConnecting={isConnectingCalendar}
                />
              ) : loading ? (
                <MeetingCardSkeleton count={4} />
              ) : meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {filter === 'today' ? 'No meetings scheduled for today' : 'No upcoming meetings'}
                  </p>
                  {filter === 'today' && (
                    <Button
                      onClick={() => setFilter('week')}
                      variant="link"
                      size="sm"
                      className="mt-2"
                    >
                      View this week's meetings
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-6">
                  {Object.entries(meetingGroups).map(([date, dateMeetings]) => (
                    <motion.div
                      key={date}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {date}
                      </h3>
                      <div className="space-y-2">
                        {dateMeetings.map(meeting => (
                          <MeetingCard key={meeting.event_id} meeting={meeting} />
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              {hasCalendarConnection !== false && (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {meetings.length} meeting{meetings.length === 1 ? '' : 's'} scheduled
                    </span>
                    {lastRefreshTime && (
                      <span title={format(lastRefreshTime, 'PPpp')}>
                        Updated {format(lastRefreshTime, 'h:mm a')}
                      </span>
                    )}
                  </div>
                  {filter === 'all' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing next 30 days
                    </p>
                  )}
                  {syncStatus === 'syncing' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Syncing with Google Calendar...
                    </p>
                  )}
                  {meetings.length === 0 && !loading && hasCalendarConnection && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: New events may take a few minutes to appear
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Permission Modal */}
      <CalendarPermissionModal
        isOpen={showPermissionModal}
        onClose={handlePermissionModalClose}
        onContinue={handlePermissionModalContinue}
        provider="google"
      />
      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      />
    </>
  );
};

// Helper function to get meeting platform logo
const getMeetingPlatformLogo = (meetingUrl: string | null) => {
  if (!meetingUrl) return null;
  
  if (meetingUrl.includes('zoom.us')) {
    return '/platform-logos/zoom.png';
  } else if (meetingUrl.includes('teams.microsoft.com')) {
    return '/platform-logos/teams.png';
  } else if (meetingUrl.includes('meet.google.com')) {
    return '/platform-logos/meet.png';
  }
  
  return null;
};

// Compact meeting card component
const MeetingCard: React.FC<{ meeting: UpcomingMeeting }> = ({ meeting }) => {
  const { session } = useAuth();
  const [isUpdatingAutoJoin, setIsUpdatingAutoJoin] = useState(false);
  const startTime = new Date(meeting.start_time);
  const endTime = new Date(meeting.end_time);
  const duration = differenceInMinutes(endTime, startTime);
  const isNow = new Date() >= startTime && new Date() <= endTime;
  const platformLogo = getMeetingPlatformLogo(meeting.meeting_url || null);
  
  // Determine the current auto-join state
  // If auto_join_enabled is null, it uses the global preference
  const isAutoJoinEnabled = meeting.auto_join_enabled ?? meeting.bot_scheduled;
  
  const handleAutoJoinToggle = async (checked: boolean) => {
    if (!session?.access_token) return;
    
    setIsUpdatingAutoJoin(true);
    try {
      const response = await fetch(`/api/calendar/events/${meeting.event_id}/auto-join`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ auto_join_enabled: checked })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update auto-join preference');
      }
      
      // Update the local state - in a real app, you'd update the parent state
      meeting.auto_join_enabled = checked;
    } catch (error) {
      console.error('Failed to update auto-join preference:', error);
      // In a real app, show an error toast
    } finally {
      setIsUpdatingAutoJoin(false);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-background border border-border rounded-lg p-3 transition-all ${
        isNow ? 'ring-2 ring-primary shadow-sm' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {platformLogo && (
            <img 
              src={platformLogo} 
              alt="Meeting platform" 
              className="w-8 h-8 rounded object-contain flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate flex items-center gap-2">
              {meeting.title.includes('Engagement with Liveprompt.ai') && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Auto
                </Badge>
              )}
              <span className="truncate">{meeting.title}</span>
            </h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {format(startTime, 'h:mm a')}
              </span>
              <span>{duration} min</span>
            </div>
            {meeting.attendees && meeting.attendees.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <UserGroupIcon className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {meeting.attendees.length} attendee{meeting.attendees.length === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>
        </div>
        {meeting.meeting_url && (
          <Button
            size="sm"
            variant={isNow ? 'primary' : 'outline'}
            onClick={() => window.open(meeting.meeting_url, '_blank')}
            className="shrink-0"
          >
            <VideoCameraIcon className="w-3.5 h-3.5 mr-1" />
            {isNow ? 'Join' : 'Open'}
          </Button>
        )}
      </div>
      {meeting.meeting_url && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={isAutoJoinEnabled}
              onCheckedChange={handleAutoJoinToggle}
              disabled={isUpdatingAutoJoin || isNow}
              className="scale-90"
            />
            <span className="text-xs text-muted-foreground">
              {isAutoJoinEnabled ? 'Auto-join enabled' : 'Auto-join disabled'}
            </span>
          </div>
          {isAutoJoinEnabled && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
      )}
    </motion.div>
  );
};