import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  PlayCircleIcon,
  StopCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRecallBotStatus } from '@/lib/meeting/hooks/useRecallBotStatus';

export function MeetingBotControl() {
  const { meeting, setMeeting, botStatus, setBotStatus } = useMeetingContext();
  const { session: authSession } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Monitor bot status
  const { status: recallStatus, refetch } = useRecallBotStatus(
    meeting?.id || '',
    meeting?.botId
  );
  
  // Update bot status when recall status changes
  React.useEffect(() => {
    if (recallStatus) {
      setBotStatus(recallStatus);
    }
  }, [recallStatus, setBotStatus]);

  const handleStartBot = async () => {
    if (!meeting || isStarting) return;
    
    console.log('🚀 Starting bot for meeting:', meeting.id);
    console.log('📍 Meeting URL:', meeting.meeting_url);
    console.log('🔗 Webhook URL will be:', `${window.location.origin}/api/webhooks/recall/${meeting.id}`);
    
    setIsStarting(true);
    setError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const response = await fetch(`/api/meeting/${meeting.id}/start-bot`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start recording bot');
      }

      const { bot } = await response.json();
      console.log('✅ Bot created successfully:', bot);
      console.log('🆔 Bot ID:', bot.id);
      
      // Update bot status
      setBotStatus({
        status: 'joining',
        participantCount: 0
      });

      // Update meeting with bot ID
      if (meeting) {
        setMeeting({
          ...meeting,
          botId: bot.id
        });
      }
      
      // Trigger status refetch
      setTimeout(() => refetch(), 1000);
    } catch (err) {
      console.error('Failed to start bot:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopBot = async () => {
    if (!meeting || !meeting.botId || isStopping) return;
    
    const confirmed = window.confirm('Are you sure you want to stop recording?');
    if (!confirmed) return;

    setIsStopping(true);
    setError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const response = await fetch(`/api/meeting/${meeting.id}/stop-bot`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to stop recording bot');
      }

      // Update bot status
      setBotStatus({
        status: 'completed',
        participantCount: 0
      });
      
      // Clear bot ID from meeting
      if (meeting) {
        setMeeting({
          ...meeting,
          botId: undefined
        });
      }
    } catch (err) {
      console.error('Failed to stop bot:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
    } finally {
      setIsStopping(false);
    }
  };

  const getStatusDisplay = () => {
    if (!botStatus) {
      return {
        showStartButton: true,
        statusElement: null
      };
    }

    switch (botStatus.status) {
      case 'created':
      case 'joining':
        return {
          showStartButton: false,
          statusElement: (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Bot joining meeting...</span>
            </div>
          )
        };
      
      case 'in_call':
        return {
          showStartButton: false,
          showStopButton: true,
          statusElement: (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
              <CheckCircleIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Recording active</span>
              {botStatus.participantCount && botStatus.participantCount > 0 && (
                <span className="text-xs opacity-80">
                  ({botStatus.participantCount} participants)
                </span>
              )}
            </div>
          )
        };
      
      case 'failed':
      case 'timeout':
        return {
          showStartButton: true,
          statusElement: (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
              <XCircleIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Bot failed to join</span>
            </div>
          )
        };
      
      case 'completed':
        return {
          showStartButton: false,
          statusElement: (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400">
              <CheckCircleIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Recording ended</span>
            </div>
          )
        };
      
      default:
        return {
          showStartButton: true,
          statusElement: null
        };
    }
  };

  const { showStartButton, showStopButton, statusElement } = getStatusDisplay();

  return (
    <div className="flex items-center gap-3">
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Display */}
      <AnimatePresence mode="wait">
        {statusElement && (
          <motion.div
            key={botStatus?.status || 'none'}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {statusElement}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Button */}
      {showStartButton && !meeting?.botId && (
        <button
          onClick={handleStartBot}
          disabled={isStarting}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50"
        >
          {isStarting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlayCircleIcon className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {isStarting ? 'Starting...' : 'Start Recording'}
          </span>
        </button>
      )}

      {/* Stop Button */}
      {showStopButton && (
        <button
          onClick={handleStopBot}
          disabled={isStopping}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50"
        >
          {isStopping ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <StopCircleIcon className="w-3 h-3" />
          )}
          <span className="text-xs font-medium">
            {isStopping ? 'Stopping...' : 'Stop'}
          </span>
        </button>
      )}
    </div>
  );
}