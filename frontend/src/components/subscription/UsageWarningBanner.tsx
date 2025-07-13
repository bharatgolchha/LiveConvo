import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PricingModal } from '@/components/ui/PricingModal';
import {
  AlertTriangle,
  Info,
  X,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useSubscription } from '@/lib/hooks/useSubscription';

interface UsageWarningBannerProps {
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function UsageWarningBanner({
  className = '',
  dismissible = true,
  onDismiss,
}: UsageWarningBannerProps) {
  const { subscription, loading } = useSubscription();
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (loading || !subscription || isDismissed) {
    return null;
  }

  const { currentAudioHours, limitAudioHours } = subscription.usage;
  
  // No limit means unlimited
  if (limitAudioHours === null) {
    return null;
  }

  const usagePercentage = (currentAudioHours / limitAudioHours) * 100;
  const isAtLimit = usagePercentage >= 100;
  const isNearLimit = usagePercentage >= 80 && usagePercentage < 100;

  // Don't show if usage is below 80%
  if (!isAtLimit && !isNearLimit) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleUpgradeClick = () => {
    setShowPricingModal(true);
  };

  const remainingHours = Math.max(0, limitAudioHours - currentAudioHours);
  const remainingMinutes = Math.round(remainingHours * 60);

  const getBannerStyles = () => {
    if (isAtLimit) {
      return 'bg-destructive/10 border-destructive/20 text-destructive';
    }
    return 'bg-accent/10 border-accent/20 text-accent-foreground';
  };

  const getIcon = () => {
    if (isAtLimit) {
      return <AlertTriangle className="w-5 h-5" />;
    }
    return <Info className="w-5 h-5" />;
  };

  const getMessage = () => {
    if (isAtLimit) {
      return {
        title: "You've reached your monthly limit",
        description: `You've used ${currentAudioHours.toFixed(1)} of ${limitAudioHours} hours this month. Upgrade to continue recording meetings.`,
        buttonText: "Upgrade Now",
      };
    }
    return {
      title: "Approaching your monthly limit",
      description: `You have ${remainingMinutes} minutes (${remainingHours.toFixed(1)} hours) remaining this month.`,
      buttonText: "View Plans",
    };
  };

  const message = getMessage();

  return (
    <>
      <div className={`rounded-lg border p-4 ${getBannerStyles()} ${className}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium mb-1">{message.title}</h3>
            <p className="text-sm opacity-90">{message.description}</p>
            
            {/* Progress Bar */}
            <div className="mt-3 mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>{currentAudioHours.toFixed(1)} hours used</span>
                <span>{limitAudioHours} hours limit</span>
              </div>
              <div className="w-full bg-background/50 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isAtLimit ? 'bg-destructive' : 'bg-accent'
                  }`}
                  style={{ width: `${Math.min(100, usagePercentage)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant={isAtLimit ? "primary" : "outline"}
                onClick={handleUpgradeClick}
                className="text-xs"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {message.buttonText}
              </Button>
              {!isAtLimit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPricingModal(true)}
                  className="text-xs"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  View Usage
                </Button>
              )}
            </div>
          </div>
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-background/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          )}
        </div>
      </div>

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        reason={
          isAtLimit
            ? "You've reached your monthly recording limit. Upgrade to Pro for unlimited recording hours."
            : "You're approaching your monthly limit. Upgrade to Pro for unlimited recording hours."
        }
      />
    </>
  );
}