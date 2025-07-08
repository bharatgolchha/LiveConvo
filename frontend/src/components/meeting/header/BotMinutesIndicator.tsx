import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useBotUsage } from '@/lib/meeting/hooks/useBotUsage';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface BotMinutesIndicatorProps {
  className?: string;
  compact?: boolean;
}

export function BotMinutesIndicator({ className, compact = false }: BotMinutesIndicatorProps) {
  const { user } = useAuth();
  const { stats, loading, refetch } = useBotUsage(undefined, false); // Current month only

  // Subscribe to real-time updates for bot usage
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`bot-usage-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bot_usage_tracking',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Bot usage update:', payload);
          // Refetch usage data when tracking changes
          refetch();
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
        (payload) => {
          console.log('Monthly usage cache update:', payload);
          // Refetch when monthly cache updates
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  if (loading || !stats) {
    return null;
  }

  const { totalMinutes, monthlyBotMinutesLimit, remainingMinutes } = stats;
  // Hide indicator in compact mode until there are less than 10 minutes remaining
  // Reason: Meeting header should only display the warning when usage is low to avoid cluttering the UI.
  if (compact && remainingMinutes >= 10) {
    return null;
  }
  const usagePercentage = (totalMinutes / monthlyBotMinutesLimit) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = remainingMinutes <= 0;

  // Color based on usage
  const getUsageColor = () => {
    if (isAtLimit) return 'text-red-600 dark:text-red-400';
    if (isNearLimit) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getBgColor = () => {
    if (isAtLimit) return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30';
    if (isNearLimit) return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/30';
    return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30';
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
          getBgColor(),
          className
        )}
      >
        {isAtLimit ? (
          <ExclamationTriangleIcon className={cn("w-4 h-4", getUsageColor())} />
        ) : (
          <ClockIcon className={cn("w-4 h-4", getUsageColor())} />
        )}
        <span className={cn("text-sm font-medium", getUsageColor())}>
          {isAtLimit ? (
            "No minutes left"
          ) : (
            `${remainingMinutes}m left`
          )}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg border transition-colors",
        getBgColor(),
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isAtLimit ? (
          <ExclamationTriangleIcon className={cn("w-5 h-5", getUsageColor())} />
        ) : (
          <ClockIcon className={cn("w-5 h-5", getUsageColor())} />
        )}
        <div>
          <div className={cn("text-sm font-semibold", getUsageColor())}>
            Bot Minutes
          </div>
          <div className="text-xs text-muted-foreground">
            {totalMinutes} / {monthlyBotMinutesLimit} used
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-24 bg-muted/50 rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(usagePercentage, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            isAtLimit ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-green-500"
          )}
        />
      </div>
      
      <div className={cn("text-sm font-medium", getUsageColor())}>
        {isAtLimit ? (
          <span className="flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4" />
            Limit reached
          </span>
        ) : (
          `${remainingMinutes}m left`
        )}
      </div>
    </motion.div>
  );
}