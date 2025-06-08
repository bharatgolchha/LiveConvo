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
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch subscription data');
      }

      const data: SubscriptionData = await response.json();
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
  const planType: 'free' | 'pro' | 'team' = subscription?.plan.name === 'individual_pro' 
    ? 'pro' 
    : subscription?.plan.name === 'team' 
    ? 'team' 
    : 'free';
  
  const isPro = planType === 'pro' || planType === 'team';

  return {
    subscription,
    loading: loading || authLoading,
    error,
    refreshSubscription,
    isPro,
    planType,
  };
}