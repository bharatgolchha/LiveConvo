import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PricingModal } from '@/components/ui/PricingModal';
import {
  Sparkles,
  Lock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface UpgradeCTAProps {
  variant?: 'inline' | 'banner' | 'modal';
  feature?: string;
  reason?: string;
  showIcon?: boolean;
  className?: string;
  buttonText?: string;
  onUpgradeClick?: () => void;
}

export function UpgradeCTA({
  variant = 'inline',
  feature = 'premium features',
  reason,
  showIcon = true,
  className = '',
  buttonText = 'Upgrade to Pro',
  onUpgradeClick,
}: UpgradeCTAProps) {
  const [showPricingModal, setShowPricingModal] = useState(false);

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      setShowPricingModal(true);
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'banner':
        return <AlertCircle className="w-5 h-5" />;
      case 'modal':
        return <Lock className="w-6 h-6" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  if (variant === 'inline') {
    return (
      <>
        <div className={`flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg ${className}`}>
          <div className="flex items-start gap-3">
            {showIcon && (
              <div className="p-2 bg-primary/10 rounded-lg">
                {getIcon()}
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Upgrade to unlock {feature}
              </p>
              {reason && (
                <p className="text-sm text-muted-foreground mt-1">
                  {reason}
                </p>
              )}
            </div>
          </div>
          <Button 
            onClick={handleUpgradeClick}
            size="sm"
            className="ml-4"
          >
            {buttonText}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          reason={reason}
        />
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className={`bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-6 ${className}`}>
          <div className="flex items-start gap-4">
            {showIcon && (
              <div className="p-3 bg-background/80 rounded-lg shadow-sm">
                {getIcon()}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Unlock {feature} with Pro
              </h3>
              <p className="text-muted-foreground mb-4">
                {reason || `Get access to ${feature} and many more premium features with our Pro plan.`}
              </p>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleUpgradeClick}
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {buttonText}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPricingModal(true)}
                >
                  View all features
                </Button>
              </div>
            </div>
          </div>
        </div>
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          reason={reason}
        />
      </>
    );
  }

  if (variant === 'modal') {
    return (
      <>
        <div className={`text-center py-12 ${className}`}>
          {showIcon && (
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {getIcon()}
            </div>
          )}
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {feature} is a Pro feature
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {reason || `Upgrade to Pro to unlock ${feature} and enhance your meeting experience.`}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button 
              onClick={handleUpgradeClick}
              size="sm"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {buttonText}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPricingModal(true)}
            >
              Compare plans
            </Button>
          </div>
        </div>
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          reason={reason}
        />
      </>
    );
  }

  return null;
}