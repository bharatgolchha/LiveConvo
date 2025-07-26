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
      hasRecordingAccess: boolean;
      hasFileUploads: boolean;
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

// --- Added global cache and deduplication logic for subscription requests ---
type CacheEntry = { data: SubscriptionData; timestamp: number };

// Keep a cache per user id so that different users don’t share subscription data
const subscriptionCache = new Map<string, CacheEntry>();

// Track pending requests so that concurrent hooks can share the same promise
const pendingRequests = new Map<string, Promise<SubscriptionData>>();

// Re-fetch subscription data at most once every 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

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

    // ------------------------------------------------------------------
    // 1.  Resolve the current user id (if any). If we ever support multi-org
    //     contexts, consider adding org id to the cache key.
    // ------------------------------------------------------------------
    const userId = session.user.id;

    // ------------------------------------------------------------------
    // 2.  Check if we have a fresh cache entry for this user. If so, use it
    //     instead of performing a network request.
    // ------------------------------------------------------------------
    const cached = subscriptionCache.get(userId);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      setSubscription(cached.data);
      setLoading(false);
      return;
    }

    // ------------------------------------------------------------------
    // 3.  If another component has already kicked off the fetch for this user
    //     just wait for it instead of duplicating the request.
    // ------------------------------------------------------------------
    const pending = pendingRequests.get(userId);
    if (pending) {
      try {
        const data = await pending;
        setSubscription(data);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription data';
        setError(errorMessage);
        setLoading(false);
      }
      return;
    }

    // ------------------------------------------------------------------
    // 4.  No valid cache or pending request — perform the fetch now and store
    //     the promise so any concurrent hook calls can piggy-back on it.
    // ------------------------------------------------------------------

    setLoading(true);
    setError(null);

    try {
      const fetchPromise = fetch('/api/users/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch subscription data');
        }

        const data: SubscriptionData = await response.json();
        console.log('useSubscription - Fetched data:', data);

        // Cache and return
        subscriptionCache.set(userId, { data, timestamp: Date.now() });
        return data;
      });

      // Store the pending request before awaiting so others can wait on it
      pendingRequests.set(userId, fetchPromise);

      const data = await fetchPromise;
      setSubscription(data);

      // Fetch succeeded – clear pending promise
      pendingRequests.delete(userId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription data';
      setError(errorMessage);
      console.error('Subscription fetch error:', err);
    } finally {
      pendingRequests.delete(userId);
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