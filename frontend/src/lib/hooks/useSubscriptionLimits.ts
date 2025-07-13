import { useCallback, useMemo } from 'react';
import { useSubscription } from './useSubscription';

export interface SubscriptionLimits {
  // Recording limits
  audioHours: {
    used: number;
    limit: number | null;
    remaining: number | null;
    percentage: number;
    isUnlimited: boolean;
    isAtLimit: boolean;
    isNearLimit: boolean;
  };
  
  // Session limits
  sessions: {
    used: number;
    limit: number | null;
    remaining: number | null;
    percentage: number;
    isUnlimited: boolean;
    isAtLimit: boolean;
    isNearLimit: boolean;
  };

  // Feature access
  features: {
    hasCustomTemplates: boolean;
    hasRealTimeGuidance: boolean;
    hasAdvancedSummaries: boolean;
    hasExportOptions: boolean;
    hasEmailSummaries: boolean;
    hasPrioritySupport: boolean;
    hasAnalyticsDashboard: boolean;
    hasTeamCollaboration: boolean;
  };

  // Plan info
  plan: {
    name: string;
    displayName: string;
    type: 'free' | 'pro' | 'team';
    isPaid: boolean;
  };

  // Helper methods
  canRecord: boolean;
  canCreateSession: boolean;
  getUpgradeReason: (feature: string) => string;
}

export function useSubscriptionLimits() {
  const { subscription, loading, error, isPro, planType, hasFeature } = useSubscription();

  const limits = useMemo<SubscriptionLimits | null>(() => {
    if (!subscription) return null;

    const { usage, plan } = subscription;
    
    // Audio hours calculations
    const audioHoursUsed = usage.currentAudioHours;
    const audioHoursLimit = usage.limitAudioHours;
    const audioHoursUnlimited = audioHoursLimit === null;
    const audioHoursRemaining = audioHoursUnlimited ? null : Math.max(0, audioHoursLimit - audioHoursUsed);
    const audioHoursPercentage = audioHoursUnlimited ? 0 : (audioHoursUsed / audioHoursLimit) * 100;
    const audioHoursAtLimit = !audioHoursUnlimited && audioHoursPercentage >= 100;
    const audioHoursNearLimit = !audioHoursUnlimited && audioHoursPercentage >= 80 && audioHoursPercentage < 100;

    // Session calculations
    const sessionsUsed = usage.currentSessions;
    const sessionsLimit = usage.limitSessions;
    const sessionsUnlimited = sessionsLimit === null;
    const sessionsRemaining = sessionsUnlimited ? null : Math.max(0, sessionsLimit - sessionsUsed);
    const sessionsPercentage = sessionsUnlimited ? 0 : (sessionsUsed / sessionsLimit) * 100;
    const sessionsAtLimit = !sessionsUnlimited && sessionsPercentage >= 100;
    const sessionsNearLimit = !sessionsUnlimited && sessionsPercentage >= 80 && sessionsPercentage < 100;

    // Features
    const features = {
      hasCustomTemplates: plan.features?.hasCustomTemplates ?? false,
      hasRealTimeGuidance: plan.features?.hasRealTimeGuidance ?? true,
      hasAdvancedSummaries: plan.features?.hasAdvancedSummaries ?? false,
      hasExportOptions: plan.features?.hasExportOptions ?? false,
      hasEmailSummaries: plan.features?.hasEmailSummaries ?? false,
      hasPrioritySupport: plan.features?.hasPrioritySupport ?? false,
      hasAnalyticsDashboard: plan.features?.hasAnalyticsDashboard ?? false,
      hasTeamCollaboration: plan.features?.hasTeamCollaboration ?? false,
    };

    return {
      audioHours: {
        used: audioHoursUsed,
        limit: audioHoursLimit,
        remaining: audioHoursRemaining,
        percentage: audioHoursPercentage,
        isUnlimited: audioHoursUnlimited,
        isAtLimit: audioHoursAtLimit,
        isNearLimit: audioHoursNearLimit,
      },
      sessions: {
        used: sessionsUsed,
        limit: sessionsLimit,
        remaining: sessionsRemaining,
        percentage: sessionsPercentage,
        isUnlimited: sessionsUnlimited,
        isAtLimit: sessionsAtLimit,
        isNearLimit: sessionsNearLimit,
      },
      features,
      plan: {
        name: plan.name,
        displayName: plan.displayName,
        type: planType,
        isPaid: isPro,
      },
      canRecord: !audioHoursAtLimit,
      canCreateSession: !sessionsAtLimit && !audioHoursAtLimit,
      getUpgradeReason: (feature: string) => getUpgradeReason(feature, planType),
    };
  }, [subscription, isPro, planType]);

  const getUpgradeReason = useCallback((feature: string, currentPlan: 'free' | 'pro' | 'team'): string => {
    const reasons: Record<string, string> = {
      customTemplates: "Generate unlimited custom AI reports tailored to your specific needs",
      recording: "Get unlimited recording hours to capture all your important conversations",
      sessions: "Create unlimited sessions without monthly restrictions",
      advancedSummaries: "Access detailed AI-powered summaries with deeper insights",
      exportOptions: "Export your meetings in multiple formats including PDF and Word",
      emailSummaries: "Automatically receive meeting summaries via email",
      analytics: "Track your meeting performance with advanced analytics",
      teamCollaboration: "Collaborate with your team on meeting insights and action items",
      prioritySupport: "Get priority support from our team when you need help",
    };

    if (currentPlan === 'free') {
      return reasons[feature] || "Upgrade to Pro to unlock premium features and remove all limits";
    }
    
    return "This feature requires a higher tier plan";
  }, []);

  const checkLimit = useCallback((limitType: 'audio' | 'sessions'): {
    canProceed: boolean;
    message?: string;
    showUpgrade: boolean;
  } => {
    if (!limits) {
      return { canProceed: true, showUpgrade: false };
    }

    if (limitType === 'audio') {
      if (limits.audioHours.isAtLimit) {
        return {
          canProceed: false,
          message: `You've reached your monthly limit of ${limits.audioHours.limit} recording hours`,
          showUpgrade: true,
        };
      }
      if (limits.audioHours.isNearLimit) {
        return {
          canProceed: true,
          message: `You have ${limits.audioHours.remaining?.toFixed(1)} hours remaining this month`,
          showUpgrade: true,
        };
      }
    }

    if (limitType === 'sessions') {
      if (limits.sessions.isAtLimit) {
        return {
          canProceed: false,
          message: `You've reached your monthly limit of ${limits.sessions.limit} sessions`,
          showUpgrade: true,
        };
      }
      if (limits.sessions.isNearLimit) {
        return {
          canProceed: true,
          message: `You have ${limits.sessions.remaining} sessions remaining this month`,
          showUpgrade: true,
        };
      }
    }

    return { canProceed: true, showUpgrade: false };
  }, [limits]);

  return {
    limits,
    loading,
    error,
    checkLimit,
    hasFeature,
  };
}