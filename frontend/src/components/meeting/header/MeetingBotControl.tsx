import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  PlayCircleIcon,
  StopCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpCircleIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRecallBotStatus } from '@/lib/meeting/hooks/useRecallBotStatus';
import { useBotUsage } from '@/lib/meeting/hooks/useBotUsage';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { StopRecordingModal } from '../modals/StopRecordingModal';

export function MeetingBotControl() {
  const { meeting, setMeeting, botStatus, setBotStatus } = useMeetingContext();
  const { session: authSession } = useAuth();
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<React.ReactNode>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  
  // Get bot usage data
  const { stats, loading: usageLoading, refetch: refetchUsage } = useBotUsage(undefined, false);
  
  // Monitor bot status
  const { status: recallStatus, refetch } = useRecallBotStatus(
    meeting?.id || '',
    meeting?.botId
  );
  
  // Subscribe to real-time usage updates
  const { user } = useAuth();
  React.useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`bot-control-usage-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bot_usage_tracking',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch usage data when tracking changes
          refetchUsage();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly_usage_cache',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch when monthly cache updates
          refetchUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchUsage]);
  
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
    // Don't clear status here - let other logic handle status clearing
  }, [recallStatus, setBotStatus]);

  const handleStartBot = async () => {
    if (!meeting || isStarting) return;
    
    console.log('🚀 Starting bot for meeting:', meeting.id);
    console.log('📍 Meeting URL:', meeting.meetingUrl);
    console.log('🔗 Webhook URL (client-side display):', `${window.location.origin}/api/webhooks/recall/${meeting.id}`);
    console.log('📝 Note: Actual webhook URL will be configured server-side');
    
    setIsStarting(true);
    setError(null);
    
    // Set initial status to prevent flickering
    setBotStatus({
      status: 'created',
      participantCount: 0
    });

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
          // Show detailed error with usage info
          const minutesUsed = data.details.minutesUsed || 0;
          const minutesLimit = data.details.minutesLimit || 0;
          
          setError(
            <div className="space-y-2">
              <div className="font-medium">Recording Limit Reached</div>
              <div className="text-xs">
                You've used {minutesUsed} of your {minutesLimit} monthly bot minutes.
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowUpCircleIcon className="w-3 h-3" />
                Upgrade to continue
              </button>
            </div>
          );
          
          setShowUpgradePrompt(true);
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
    
    setShowStopModal(false);
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
    // During the starting process, always show the joining state
    if (isStarting && !botStatus) {
      return {
        showStartButton: false,
        statusElement: (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Starting...</span>
          </div>
        )
      };
    }
    
    // If we have a botId but no status yet, show loading state (but this should be rare now)
    if (meeting?.botId && !botStatus && !isStarting) {
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
      case 'created':
        return {
          showStartButton: false,
          statusElement: (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Initializing AI bot...</span>
            </div>
          )
        };

      case 'joining':
        const joiningMessage = botStatus.detailedStatus === 'joining_call' 
          ? 'Connecting to meeting...' 
          : 'Joining...';
        return {
          showStartButton: false,
          statusElement: (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{joiningMessage}</span>
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

      case 'waiting':
        return {
          showStartButton: false,
          statusElement: (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Waiting for host approval...</span>
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
              onClick={() => setShowStopModal(true)}
              disabled={isStopping}
              className="flex items-center gap-2 px-4 py-2 bg-transparent border-2 border-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-500 rounded-lg transition-colors disabled:opacity-50 font-medium"
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
          showStartButton: true,
          statusElement: null // Allow starting a new recording after completion
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
  
  // Check if user has minutes remaining
  const hasMinutesRemaining = !usageLoading && stats && stats.remainingMinutes > 0;
  const isOutOfMinutes = !usageLoading && stats && stats.remainingMinutes <= 0;

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

      {/* Upgrade prompt for users out of minutes */}
      <AnimatePresence>
        {showUpgradePrompt && isOutOfMinutes && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-80 p-4 bg-background border border-border rounded-lg shadow-lg z-50"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Out of Bot Minutes</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    You've used all {stats?.monthlyBotMinutesLimit} minutes in your {stats?.planDisplayName} plan. 
                    Upgrade to continue recording meetings.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/pricing')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <ArrowUpCircleIcon className="w-4 h-4" />
                  Upgrade Plan
                </button>
                <button
                  onClick={() => setShowUpgradePrompt(false)}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status element or start button */}
      {statusElement ? (
        statusElement
      ) : showStartButton ? (
        <div className="relative">
          <button
            onClick={() => {
              if (isOutOfMinutes) {
                setShowUpgradePrompt(true);
              } else {
                handleStartBot();
              }
            }}
            disabled={isStarting || !meeting?.meetingUrl || usageLoading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium",
              isOutOfMinutes 
                ? "bg-muted hover:bg-muted/80 text-muted-foreground cursor-not-allowed" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground",
              "disabled:opacity-50"
            )}
            title={isOutOfMinutes ? "You're out of bot minutes. Upgrade to continue recording." : undefined}
          >
            {isStarting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isOutOfMinutes ? (
              <ExclamationTriangleIcon className="w-4 h-4" />
            ) : (
              <PlayCircleIcon className="w-4 h-4" />
            )}
            <span className="text-sm">
              {isOutOfMinutes ? "No Minutes Left" : "Start Recording"}
            </span>
          </button>
        </div>
      ) : null}

      {/* Stop Recording Modal */}
      <StopRecordingModal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        onConfirm={handleStopBot}
        isLoading={isStopping}
      />
    </div>
  );
}