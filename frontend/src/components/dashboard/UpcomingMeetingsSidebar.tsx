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
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import { format, isToday, isTomorrow, isThisWeek, differenceInMinutes } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarEventCard } from '@/components/calendar/CalendarEventCard';
import { useAuth } from '@/contexts/AuthContext';
import { UpcomingMeeting } from '@/types/calendar';

interface UpcomingMeetingsSidebarProps {
  className?: string;
  defaultOpen?: boolean;
  isMobile?: boolean;
}

export const UpcomingMeetingsSidebar: React.FC<UpcomingMeetingsSidebarProps> = ({ 
  className = '',
  defaultOpen = true,
  isMobile = false
}) => {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('week');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

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

  // Load meetings
  useEffect(() => {
    if (session?.access_token && calendarEnabled && isOpen) {
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

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };

      const response = await fetch(`/api/calendar/events?filter=${filter}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
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
      
      // First, get the calendar connection
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`
      };
      
      // Get calendar connections
      const connectionsResponse = await fetch('/api/calendar/connections', { headers });
      if (!connectionsResponse.ok) {
        throw new Error('Failed to get calendar connections');
      }
      
      const { connections } = await connectionsResponse.json();
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
      
      // Use the refresh endpoint to force Recall.ai to sync with Google Calendar
      const refreshResponse = await fetch('/api/calendar/refresh', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId: activeConnection.id })
      });
      
      if (!refreshResponse.ok) {
        // Fallback to regular sync if refresh endpoint doesn't exist
        const syncResponse = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ connectionId: activeConnection.id })
        });
        
        if (!syncResponse.ok) {
          throw new Error('Failed to sync calendar');
        }
      }
      
      setSyncStatus('success');
      
      // Reload meetings after sync
      await loadMeetings();
      
      // Reset status after 3 seconds
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to sync calendar:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
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
      {/* Floating Toggle Button (shown when sidebar is closed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            onClick={toggleSidebar}
            className={`fixed z-40 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-colors ${
              isMobile ? 'bottom-4 right-4' : 'right-4 top-24'
            }`}
            title="Show upcoming meetings"
          >
            <CalendarIcon className="w-6 h-6" />
            {hasUpcomingMeetings && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
            )}
          </motion.button>
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
                  <h2 className="text-lg font-semibold">Upcoming Meetings</h2>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={handleSyncCalendar}
                    variant="ghost"
                    size="sm"
                    className={`p-1.5 ${
                      syncStatus === 'success' ? 'text-green-500' : 
                      syncStatus === 'error' ? 'text-red-500' : ''
                    }`}
                    disabled={isSyncing}
                    title={
                      isSyncing ? 'Syncing with Google Calendar...' : 
                      syncStatus === 'success' ? 'Sync successful!' :
                      syncStatus === 'error' ? 'Sync failed' :
                      'Sync with Google Calendar'
                    }
                  >
                    <CloudArrowDownIcon className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                  </Button>
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
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-muted/50 rounded-lg"></div>
                    </div>
                  ))}
                </div>
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
              {meetings.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground mt-1">
                  Note: New events may take a few minutes to appear
                </p>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

// Helper function to get meeting platform logo
const getMeetingPlatformLogo = (meetingUrl: string | null) => {
  if (!meetingUrl) return null;
  
  const baseUrl = 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Logos/';
  
  if (meetingUrl.includes('zoom.us')) {
    return `${baseUrl}zoom.png`;
  } else if (meetingUrl.includes('teams.microsoft.com')) {
    return `${baseUrl}teams.png`;
  } else if (meetingUrl.includes('meet.google.com')) {
    return `${baseUrl}meet.png`;
  }
  
  return null;
};

// Compact meeting card component
const MeetingCard: React.FC<{ meeting: UpcomingMeeting }> = ({ meeting }) => {
  const startTime = new Date(meeting.start_time);
  const endTime = new Date(meeting.end_time);
  const duration = differenceInMinutes(endTime, startTime);
  const isNow = new Date() >= startTime && new Date() <= endTime;
  const platformLogo = getMeetingPlatformLogo(meeting.meeting_url);

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
            <h4 className="text-sm font-medium truncate">
              {meeting.title}
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
            variant={isNow ? 'default' : 'outline'}
            onClick={() => window.open(meeting.meeting_url, '_blank')}
            className="shrink-0"
          >
            <VideoCameraIcon className="w-3.5 h-3.5 mr-1" />
            {isNow ? 'Join' : 'Open'}
          </Button>
        )}
      </div>
      {meeting.bot_scheduled && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-muted-foreground">Auto-join enabled</span>
        </div>
      )}
    </motion.div>
  );
};