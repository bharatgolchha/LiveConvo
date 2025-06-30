'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, differenceInMinutes } from 'date-fns';
import { 
  Phone, 
  PhoneOff, 
  ExternalLink, 
  Clock, 
  Users, 
  Bot,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { OngoingMeetingStatus } from '@/app/api/calendar/meeting-status/route';
import { cn } from '@/lib/utils';

interface ActiveMeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveMeetingsModal({ isOpen, onClose }: ActiveMeetingsModalProps) {
  const [meetings, setMeetings] = useState<OngoingMeetingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stoppingBots, setStoppingBots] = useState<Set<string>>(new Set());

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/calendar/meeting-status?include_ended=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMeetings();
      const interval = setInterval(fetchMeetings, 15000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleStopBot = async (eventId: string, botId: string) => {
    setStoppingBots(prev => new Set(prev).add(botId));
    
    try {
      const response = await fetch('/api/calendar/auto-join/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
        body: JSON.stringify({
          event_id: eventId,
          action: 'stop_bot'
        })
      });

      if (response.ok) {
        await fetchMeetings();
      } else {
        console.error('Failed to stop bot');
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
    } finally {
      setStoppingBots(prev => {
        const next = new Set(prev);
        next.delete(botId);
        return next;
      });
    }
  };

  const getBotStatusBadge = (status?: string) => {
    switch (status) {
      case 'deployed':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Deployed</Badge>;
      case 'joining':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Joining</Badge>;
      case 'in_call':
        return <Badge className="bg-green-600">In Call</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getMeetingDuration = (meeting: OngoingMeetingStatus) => {
    const now = new Date();
    const start = new Date(meeting.meeting.start_time);
    const end = new Date(meeting.meeting.end_time);
    
    if (now < start) {
      const minutesUntil = differenceInMinutes(start, now);
      return `Starts in ${minutesUntil} min`;
    } else if (now > end) {
      const minutesSince = differenceInMinutes(now, end);
      return `Ended ${minutesSince} min ago`;
    } else {
      const elapsed = differenceInMinutes(now, start);
      const total = differenceInMinutes(end, start);
      return `${elapsed}/${total} min`;
    }
  };

  const activeMeetings = meetings.filter(m => 
    m.bot?.status === 'in_call' || m.bot?.status === 'joining'
  );
  const upcomingMeetings = meetings.filter(m => 
    new Date(m.meeting.start_time) > new Date() && m.auto_join.auto_session_created
  );
  const recentMeetings = meetings.filter(m => 
    !activeMeetings.includes(m) && !upcomingMeetings.includes(m)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Meeting Activity Center</span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {activeMeetings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Active Meetings ({activeMeetings.length})
              </h3>
              <div className="space-y-3">
                {activeMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.meeting.id}
                    meeting={meeting}
                    onStopBot={handleStopBot}
                    isStopping={stoppingBots.has(meeting.bot?.id || '')}
                    isActive
                  />
                ))}
              </div>
            </div>
          )}

          {upcomingMeetings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming Auto-Join ({upcomingMeetings.length})
              </h3>
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.meeting.id}
                    meeting={meeting}
                    onStopBot={handleStopBot}
                    isStopping={false}
                  />
                ))}
              </div>
            </div>
          )}

          {recentMeetings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Recent Meetings
              </h3>
              <div className="space-y-3">
                {recentMeetings.slice(0, 5).map((meeting) => (
                  <MeetingCard
                    key={meeting.meeting.id}
                    meeting={meeting}
                    onStopBot={handleStopBot}
                    isStopping={false}
                    isRecent
                  />
                ))}
              </div>
            </div>
          )}

          {meetings.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No meetings with bot activity found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MeetingCardProps {
  meeting: OngoingMeetingStatus;
  onStopBot: (eventId: string, botId: string) => void;
  isStopping: boolean;
  isActive?: boolean;
  isRecent?: boolean;
}

function MeetingCard({ meeting, onStopBot, isStopping, isActive, isRecent }: MeetingCardProps) {
  const getMeetingDuration = () => {
    const now = new Date();
    const start = new Date(meeting.meeting.start_time);
    const end = new Date(meeting.meeting.end_time);
    
    if (now < start) {
      const minutesUntil = differenceInMinutes(start, now);
      return `Starts in ${minutesUntil} min`;
    } else if (now > end) {
      const minutesSince = differenceInMinutes(now, end);
      return `Ended ${minutesSince} min ago`;
    } else {
      const elapsed = differenceInMinutes(now, start);
      const total = differenceInMinutes(end, start);
      return `${elapsed}/${total} min`;
    }
  };

  return (
    <div className={cn(
      "border rounded-lg p-4",
      isActive && "border-green-500 bg-green-50 dark:bg-green-950",
      isRecent && "opacity-75"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white">
            {meeting.meeting.title}
          </h4>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getMeetingDuration()}
            </span>
            {meeting.meeting.attendees.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {meeting.meeting.attendees.length} attendees
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            {meeting.bot && getBotStatusBadge(meeting.bot.status)}
            {meeting.auto_join.enabled && (
              <Badge variant="outline" className="text-xs">
                <Bot className="h-3 w-3 mr-1" />
                Auto-join
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {meeting.session && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={`/dashboard/session/${meeting.session.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                View
              </a>
            </Button>
          )}
          
          {meeting.bot && ['deployed', 'joining', 'in_call'].includes(meeting.bot.status) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onStopBot(meeting.meeting.id, meeting.bot!.id)}
              disabled={isStopping}
            >
              {isStopping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PhoneOff className="h-4 w-4 mr-1" />
                  Stop Bot
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {meeting.bot?.status === 'failed' && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          Bot failed to join the meeting
        </div>
      )}
    </div>
  );
}