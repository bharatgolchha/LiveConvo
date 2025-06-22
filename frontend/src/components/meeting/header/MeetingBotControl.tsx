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
import { supabase } from '@/lib/supabase';

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
  
  // Debug logging
  React.useEffect(() => {
    console.log('🔍 MeetingBotControl Debug:', {
      meetingId: meeting?.id,
      botId: meeting?.botId,
      botStatus,
      recallStatus
    });
  }, [meeting?.id, meeting?.botId, botStatus, recallStatus]);
  
  // Update bot status when recall status changes
  React.useEffect(() => {
    if (recallStatus) {
      setBotStatus(recallStatus);
    }
  }, [recallStatus, setBotStatus]);

  const handleStartBot = async () => {
    if (!meeting || isStarting) return;
    
    console.log('🚀 Starting bot for meeting:', meeting.id);
    console.log('📍 Meeting URL:', meeting.meetingUrl);
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
        
        // Handle usage limit exceeded error specially
        if (response.status === 403 && data.details?.upgradeRequired) {
          setError(data.details.message || 'Bot recording limit exceeded. Please upgrade your plan.');
          
          // Show upgrade modal or redirect to pricing
          // You could add a state to show upgrade modal here
          console.error('Usage limit exceeded:', data.details);
          return;
        }
        
        throw new Error(data.error || 'Failed to start recording bot');
      }

      const { bot } = await response.json();
      console.log('✅ Bot created successfully:', bot);
      console.log('🆔 Bot ID:', bot.id);
      
      // Update meeting with bot ID FIRST
      if (meeting) {
        const updatedMeeting = {
          ...meeting,
          botId: bot.id
        };
        setMeeting(updatedMeeting);
        
        // Update bot status after meeting is updated
        setBotStatus({
          status: 'joining',
          participantCount: 0
        });
      }
      
      // Manually refetch the meeting data from the database
      // to ensure we have the latest state
      const { data: latestSession } = await supabase
        .from('sessions')
        .select('recall_bot_id')
        .eq('id', meeting.id)
        .single();
      
      if (latestSession?.recall_bot_id) {
        const updatedMeeting = {
          ...meeting,
          botId: latestSession.recall_bot_id
        };
        setMeeting(updatedMeeting);
      }
      
      // Force immediate status check with the new bot ID
      // This ensures we start polling even if the meeting context hasn't updated yet
      if (bot.id) {
        const fetchBotStatus = async () => {
          try {
            const response = await fetch(`/api/sessions/${meeting.id}/bot-status`);
            if (response.ok) {
              const data = await response.json();
              if (data.status) {
                setBotStatus(data);
              }
            }
          } catch (error) {
            console.error('Failed to fetch bot status:', error);
          }
        };
        
        // Fetch immediately
        fetchBotStatus();
        
        // Trigger refetch from the hook
        refetch();
        
        // Force another refetch after a short delay to ensure status is updated
        setTimeout(() => {
          fetchBotStatus();
          refetch();
        }, 2000);
      }
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
      
      // Don't clear bot ID - we keep it to track the completed status
      // This allows us to restart recording later
    } catch (err) {
      console.error('Failed to stop bot:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
    } finally {
      setIsStopping(false);
    }
  };

  const handleCancelBot = async () => {
    if (!meeting || !meeting.botId || isStopping) return;
    
    const confirmed = window.confirm('Cancel bot joining? You can start a new bot immediately after.');
    if (!confirmed) return;

    setIsStopping(true);
    setError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      // Use the stop-bot endpoint to cancel
      const response = await fetch(`/api/meeting/${meeting.id}/stop-bot`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to cancel bot');
      }

      // Clear the bot ID from the session to allow immediate restart
      const { data: clearedSession } = await supabase
        .from('sessions')
        .update({ 
          recall_bot_id: null,
          recall_bot_status: 'cancelled'
        })
        .eq('id', meeting.id)
        .select()
        .single();

      // Update local state
      setBotStatus(null);
      if (meeting) {
        setMeeting({
          ...meeting,
          botId: undefined
        });
      }
      
      // Show success message briefly then clear
      setError('Bot cancelled. You can start a new one.');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Failed to cancel bot:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel bot');
    } finally {
      setIsStopping(false);
    }
  };

  const getStatusDisplay = () => {
    // If we have a botId but no status yet, show loading state
    if (meeting?.botId && !botStatus) {
      return {
        showStartButton: false,
        statusElement: (
          <button disabled className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Connecting...</span>
          </button>
        )
      };
    }

    switch (botStatus?.status) {
      case 'joining':
        return {
          showStartButton: false,
          statusElement: (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Joining...</span>
              </div>
              <button
                onClick={handleCancelBot}
                disabled={isStopping}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                title="Cancel"
              >
                Cancel
              </button>
            </div>
          )
        };

      case 'in_call':
        return {
          showStartButton: false,
          statusElement: (
            <button
              onClick={handleStopBot}
              disabled={isStopping}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {isStopping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StopCircleIcon className="w-4 h-4" />
              )}
              <span className="text-sm">Stop Recording</span>
            </button>
          )
        };

      case 'completed':
        return {
          showStartButton: false,
          statusElement: null // Status shown in main header badge
        };

      case 'failed':
        return {
          showStartButton: true,
          statusElement: (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">Failed</span>
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

  const { showStartButton, statusElement } = getStatusDisplay();

  return (
    <div className="flex items-center gap-2">
      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-3 py-1.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800/30"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status element or start button */}
      {statusElement ? (
        statusElement
      ) : showStartButton ? (
        <button
          onClick={handleStartBot}
          disabled={isStarting || !meeting?.meetingUrl}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 font-medium"
        >
          {isStarting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlayCircleIcon className="w-4 h-4" />
          )}
          <span className="text-sm">Start Recording</span>
        </button>
      ) : null}
    </div>
  );
}