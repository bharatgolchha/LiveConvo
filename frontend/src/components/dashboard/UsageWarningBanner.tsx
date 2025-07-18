import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon, ArrowUpCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSubscriptionLimits } from '@/lib/hooks/useSubscriptionLimits';

interface UsageWarningBannerProps {
  monthlyMinutesUsed?: number;
  monthlyMinutesLimit?: number;
  minutesRemaining?: number;
  onDismiss?: () => void;
}

export function UsageWarningBanner({ 
  monthlyMinutesUsed = 0, 
  monthlyMinutesLimit = 0, 
  minutesRemaining = 0,
  onDismiss 
}: UsageWarningBannerProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = React.useState(false);
  const { limits, loading } = useSubscriptionLimits();
  
  // Use limits from hook if available, otherwise fall back to props
  const audioHoursUsed = limits?.audioHours.used ?? (monthlyMinutesUsed / 60);
  const audioHoursLimit = limits?.audioHours.limit ?? (monthlyMinutesLimit / 60);
  const isUnlimited = limits?.audioHours.isUnlimited ?? false;
  const isAtLimit = limits?.audioHours.isAtLimit ?? (minutesRemaining <= 0);
  const isNearLimit = limits?.audioHours.isNearLimit ?? false;
  const percentage = limits?.audioHours.percentage ?? ((monthlyMinutesUsed / monthlyMinutesLimit) * 100);
  
  // Don't show if loading, dismissed, or no limit
  if (loading || isDismissed || isUnlimited || (!limits && !monthlyMinutesLimit)) return null;
  
  // Only show warning when approaching, near, or at limit
  const shouldShow = isAtLimit || isNearLimit || percentage >= 80;
  if (!shouldShow) return null;
  
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };
  
  return (
    <>
      <AnimatePresence>
        <motion.div
          key="usage-warning-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "relative px-4 py-3 border-b",
              isAtLimit 
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30" 
                : isNearLimit 
                ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/30"
                : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30"
            )}
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ExclamationTriangleIcon 
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isAtLimit 
                      ? "text-red-600 dark:text-red-400" 
                      : isNearLimit 
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-blue-600 dark:text-blue-400"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className={cn(
                      "text-sm font-medium",
                      isAtLimit 
                        ? "text-red-900 dark:text-red-100" 
                        : isNearLimit 
                        ? "text-yellow-900 dark:text-yellow-100"
                        : "text-blue-900 dark:text-blue-100"
                    )}>
                      {isAtLimit 
                        ? `Recording limit reached: ${audioHoursUsed.toFixed(1)}/${audioHoursLimit} hours used`
                        : `${audioHoursUsed.toFixed(1)}/${audioHoursLimit} hours used (${Math.round(percentage)}%)`}
                    </p>
                    <span className={cn(
                      "text-xs",
                      isAtLimit 
                        ? "text-red-700 dark:text-red-300" 
                        : isNearLimit 
                        ? "text-yellow-700 dark:text-yellow-300"
                        : "text-blue-700 dark:text-blue-300"
                    )}>
                      {!isAtLimit && `${(minutesRemaining / 60).toFixed(1)}h remaining`}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => router.push('/pricing')}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    isAtLimit 
                      ? "bg-red-600 hover:bg-red-700 text-white" 
                      : isNearLimit 
                      ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  <ArrowUpCircleIcon className="w-3.5 h-3.5" />
                  Upgrade
                </button>
                <button
                  onClick={() => router.push('/dashboard?tab=usage')}
                  className={cn(
                    "text-xs font-medium transition-colors px-2 py-1.5",
                    isAtLimit 
                      ? "text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200" 
                      : isNearLimit 
                      ? "text-yellow-700 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-200"
                      : "text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                  )}
                >
                  Details
                </button>
                {onDismiss && (
                  <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                    aria-label="Dismiss"
                  >
                    <XMarkIcon className={cn(
                      "w-4 h-4",
                      isAtLimit 
                        ? "text-red-600 dark:text-red-400" 
                        : isNearLimit 
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-blue-600 dark:text-blue-400"
                    )} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}