'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarEventCard } from './CalendarEventCard';
import { UpcomingMeeting } from '@/types/calendar';
import { CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';

interface CalendarEventListProps {
  className?: string;
  compact?: boolean;
  events?: UpcomingMeeting[];
}

export const CalendarEventList: React.FC<CalendarEventListProps> = ({ 
  className = '',
  compact = false,
  events 
}) => {
  const { session } = useAuth();
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>(events || []);
  const [loading, setLoading] = useState(!events);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');

  const calendarEnabled = process.env.NEXT_PUBLIC_CALENDAR_ENABLED === 'true';

  useEffect(() => {
    // Use provided events if available
    if (events) {
      setMeetings(events);
      setLoading(false);
    } else if (session?.access_token && calendarEnabled) {
      loadMeetings();
    }
  }, [session, filter, calendarEnabled, events]);

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
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Upcoming Meetings
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Upcoming Meetings
          </h2>
          <Button
            onClick={loadMeetings}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </Button>
        </div>
        
        <div className="text-center py-8">
          <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {filter === 'today' ? 'No meetings scheduled for today' : 'No upcoming meetings'}
          </p>
          {filter === 'today' && (
            <Button
              onClick={() => setFilter('week')}
              variant="link"
              size="sm"
              className="mt-2"
            >
              View this week&apos;s meetings
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Upcoming Meetings
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'today' | 'week' | 'all')}
            className="text-sm border border-border rounded px-2 py-1"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="all">All Upcoming</option>
          </select>
          <Button
            onClick={loadMeetings}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(meetingGroups).map(([date, dateMeetings]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{date}</h3>
            <div className="space-y-2">
              {dateMeetings.map(meeting => (
                <CalendarEventCard
                  key={meeting.event_id}
                  meeting={meeting}
                  compact={compact}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {meetings.length > 5 && compact && (
        <div className="mt-4 text-center">
          <Button
            onClick={() => window.location.href = '/dashboard/meetings'}
            variant="link"
            size="sm"
          >
            View all meetings →
          </Button>
        </div>
      )}
    </Card>
  );
};