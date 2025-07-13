import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface SubscriptionData {
  plan: {
    name: string;
    displayName: string;
    pricing: {
      monthly: number | null;
      yearly: number | null;
    };
    features?: {
      hasCustomTemplates: boolean;
      hasRealTimeGuidance: boolean;
      hasAdvancedSummaries: boolean;
      hasExportOptions: boolean;
      hasEmailSummaries: boolean;
      hasPrioritySupport: boolean;
      hasAnalyticsDashboard: boolean;
      hasTeamCollaboration: boolean;
    };
  };
  subscription: {
    status: string;
    id: string | null;
    startDate: string | null;
    endDate: string | null;
    billingInterval: string | null;
  };
  usage: {
    currentAudioHours: number;
    limitAudioHours: number | null;
    currentSessions: number;
    limitSessions: number | null;
  };
}

export interface UseSubscriptionReturn {
  subscription: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  isPro: boolean;
  planType: 'free' | 'pro' | 'team';
  hasFeature: (feature: keyof NonNullable<SubscriptionData['plan']['features']>) => boolean;
}

/**
 * Hook for fetching and managing user subscription data
 */
export function useSubscription(): UseSubscriptionReturn {
  const { session, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch subscription data from the API
   */
  const fetchSubscription = useCallback(async () => {
    if (!session || authLoading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch subscription data');
      }

      const data: SubscriptionData = await response.json();
      console.log('useSubscription - Fetched data:', data);
      setSubscription(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription data';
      setError(errorMessage);
      console.error('Subscription fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [session, authLoading]);

  /**
   * Refresh subscription (public method)
   */
  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  // Initial fetch on mount
  useEffect(() => {
    if (session && !authLoading) {
      fetchSubscription();
    } else if (!session && !authLoading) {
      setSubscription(null);
      setLoading(false);
      setError(null);
    }
  }, [session, authLoading, fetchSubscription]);

  // Derive plan type from subscription data
  const planType: 'free' | 'pro' | 'team' = subscription?.plan.name === 'pro' 
    ? 'pro' 
    : subscription?.plan.name === 'team' 
    ? 'team' 
    : 'free';
  
  const isPro = planType === 'pro' || planType === 'team';

  // Helper function to check if a feature is available
  const hasFeature = (feature: keyof NonNullable<SubscriptionData['plan']['features']>): boolean => {
    const result = subscription?.plan.features?.[feature] ?? false;
    console.log(`hasFeature check for ${feature}:`, {
      feature,
      result,
      features: subscription?.plan.features,
      planName: subscription?.plan.name
    });
    return result;
  };

  return {
    subscription,
    loading: loading || authLoading,
    error,
    refreshSubscription,
    isPro,
    planType,
    hasFeature,
  };
}