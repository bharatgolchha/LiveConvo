import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon, ArrowUpCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSubscriptionLimits } from '@/lib/hooks/useSubscriptionLimits';
import { PricingModal } from '@/components/ui/PricingModal';

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
  const [showPricingModal, setShowPricingModal] = React.useState(false);
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
  
  const isApproachingLimit = percentage >= 80 && !isNearLimit && !isAtLimit;
  
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div
          className={cn(
            "relative px-6 py-4 border-b",
            isAtLimit 
              ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30" 
              : isNearLimit 
              ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/30"
              : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30"
          )}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-start gap-3 flex-1">
              <ExclamationTriangleIcon 
                className={cn(
                  "w-5 h-5 mt-0.5 flex-shrink-0",
                  isAtLimit 
                    ? "text-red-600 dark:text-red-400" 
                    : isNearLimit 
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-blue-600 dark:text-blue-400"
                )}
              />
              <div className="flex-1">
                <h3 className={cn(
                  "font-semibold",
                  isAtLimit 
                    ? "text-red-900 dark:text-red-100" 
                    : isNearLimit 
                    ? "text-yellow-900 dark:text-yellow-100"
                    : "text-blue-900 dark:text-blue-100"
                )}>
                  {isAtLimit 
                    ? "Recording Limit Reached" 
                    : isNearLimit 
                    ? "Nearly Out of Recording Hours"
                    : "Approaching Recording Limit"}
                </h3>
                <p className={cn(
                  "text-sm mt-1",
                  isAtLimit 
                    ? "text-red-700 dark:text-red-300" 
                    : isNearLimit 
                    ? "text-yellow-700 dark:text-yellow-300"
                    : "text-blue-700 dark:text-blue-300"
                )}>
                  {isAtLimit 
                    ? `You've used all ${audioHoursLimit} recording hours this month. Upgrade to continue recording meetings.`
                    : `You've used ${audioHoursUsed.toFixed(1)} of your ${audioHoursLimit} monthly recording hours (${Math.round(percentage)}%). ${limits?.audioHours.remaining?.toFixed(1) || (minutesRemaining / 60).toFixed(1)} hours remaining.`}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={() => setShowPricingModal(true)}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                      isAtLimit 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : isNearLimit 
                        ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                  >
                    <ArrowUpCircleIcon className="w-4 h-4" />
                    Upgrade Plan
                  </button>
                  <button
                    onClick={() => router.push('/dashboard?tab=usage')}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isAtLimit 
                        ? "text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200" 
                        : isNearLimit 
                        ? "text-yellow-700 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-200"
                        : "text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                    )}
                  >
                    View Usage Details
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors ml-4"
              aria-label="Dismiss"
            >
              <XMarkIcon className={cn(
                "w-5 h-5",
                isAtLimit 
                  ? "text-red-600 dark:text-red-400" 
                  : isNearLimit 
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-blue-600 dark:text-blue-400"
              )} />
            </button>
          </div>
        </div>
      </motion.div>
      
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        reason={
          isAtLimit
            ? "You've reached your monthly recording limit. Upgrade to Pro for unlimited recording hours."
            : isNearLimit
            ? "You're running low on recording hours. Upgrade to Pro for unlimited recording."
            : "You're approaching your monthly limit. Upgrade to Pro for unlimited recording hours."
        }
      />
    </AnimatePresence>
  );
}