'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UpcomingMeeting } from '@/types/calendar';
import { Button } from '@/components/ui/Button';
import { 
  VideoCameraIcon, 
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  CogIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface CalendarEventCardProps {
  meeting: UpcomingMeeting;
  compact?: boolean;
}

export const CalendarEventCard: React.FC<CalendarEventCardProps> = ({ 
  meeting, 
  compact = false 
}) => {
  const router = useRouter();
  const { session } = useAuth();
  const [joining, setJoining] = useState(false);
  const [schedulingBot, setSchedulingBot] = useState(false);

  const startTime = new Date(meeting.start_time);
  const endTime = new Date(meeting.end_time);
  const isNow = new Date() >= startTime && new Date() <= endTime;
  const isPast = new Date() > endTime;

  const handleJoinMeeting = async () => {
    if (!meeting.meeting_url) return;

    try {
      setJoining(true);
      
      // Check if session already exists for this meeting (auto-created)
      if (meeting.auto_session_id) {
        // Navigate to existing session
        router.push(`/meeting/${meeting.auto_session_id}`);
        return;
      }
      
      // Create a new session for this meeting
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: meeting.title,
          description: meeting.description,
          meeting_url: meeting.meeting_url,
          calendar_event_id: meeting.event_id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { session: newSession } = await response.json();
      
      // Navigate to the meeting page
      router.push(`/meeting/${newSession.id}`);
    } catch (error) {
      console.error('Failed to join meeting:', error);
      alert('Failed to join meeting. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleScheduleBot = async () => {
    try {
      setSchedulingBot(true);
      
      // TODO: Implement bot scheduling via Recall.ai
      alert('Bot scheduling coming soon!');
    } catch (error) {
      console.error('Failed to schedule bot:', error);
    } finally {
      setSchedulingBot(false);
    }
  };

  const getAttendeeCount = () => {
    return meeting.attendees?.filter(a => a.response_status !== 'declined').length || 0;
  };

  if (isPast) return null;

  return (
    <div className={`border border-border rounded-lg p-4 hover:border-primary/50 transition-all ${
      isNow ? 'border-green-500 bg-green-50/5' : ''
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
              isNow ? 'bg-green-100 dark:bg-green-900/20' : 'bg-primary/10'
            }`}>
              <VideoCameraIcon className={`w-5 h-5 ${
                isNow ? 'text-green-600 dark:text-green-400' : 'text-primary'
              }`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{meeting.title}</h3>
              
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
                </div>
                
                {getAttendeeCount() > 0 && (
                  <div className="flex items-center gap-1">
                    <UserGroupIcon className="w-3.5 h-3.5" />
                    <span>{getAttendeeCount()} attendees</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                {meeting.bot_scheduled && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    Bot scheduled
                  </Badge>
                )}
                
                {meeting.auto_join_enabled && meeting.auto_session_created && (
                  <Badge className="bg-blue-600 text-xs">
                    <CogIcon className="w-3 h-3 mr-1 animate-spin" />
                    Auto-join enabled
                  </Badge>
                )}
                
                {meeting.auto_bot_status && (
                  <Badge 
                    variant={meeting.auto_bot_status === 'in_call' ? 'default' : 'outline'}
                    className={`text-xs ${
                      meeting.auto_bot_status === 'in_call' ? 'bg-green-600' : ''
                    }`}
                  >
                    {meeting.auto_bot_status === 'deployed' && 'Bot deployed'}
                    {meeting.auto_bot_status === 'joining' && 'Bot joining...'}
                    {meeting.auto_bot_status === 'in_call' && 'Bot in call'}
                    {meeting.auto_bot_status === 'failed' && 'Bot failed'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {!compact && meeting.meeting_url && (
          <div className="flex items-center gap-2">
            {meeting.auto_join_enabled && meeting.auto_session_created && meeting.auto_session_id ? (
              <Button
                onClick={() => router.push(`/meeting/${meeting.auto_session_id}`)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                Open Session
              </Button>
            ) : meeting.auto_join_enabled && meeting.auto_session_created ? (
              <div className="text-xs text-muted-foreground">
                Bot will join automatically
              </div>
            ) : (
              <>
                {isNow ? (
                  <Button
                    onClick={handleJoinMeeting}
                    disabled={joining}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <PlayIcon className="w-4 h-4" />
                    {joining ? 'Joining...' : 'Join Now'}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleJoinMeeting}
                      disabled={joining}
                      variant="outline"
                      size="sm"
                    >
                      {joining ? 'Opening...' : 'Open Session'}
                    </Button>
                    {!meeting.bot_scheduled && (
                      <Button
                        onClick={handleScheduleBot}
                        disabled={schedulingBot}
                        variant="ghost"
                        size="sm"
                        title="Schedule recording bot"
                      >
                        🤖
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {!compact && meeting.description && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {meeting.description}
        </p>
      )}
    </div>
  );
};