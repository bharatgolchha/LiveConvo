import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingData {
  organization_name?: string;
  timezone?: string;
  use_case?: string;
  acquisition_source?: string;
  referral_code?: string;
  device_id?: string;
}

interface OnboardingResponse {
  message: string;
  user: {
    id: string;
    email: string;
    current_organization_id?: string;
    full_name?: string;
  };
  organization: {
    id: string;
    name: string;
    display_name?: string;
    slug?: string;
  };
  membership: {
    user_id: string;
    organization_id: string;
    role: string;
  };
  subscription: {
    id: string;
    organization_id: string;
    plan_type: string;
    status: string;
  };
}

interface UseOnboardingReturn {
  completeOnboarding: (data?: OnboardingData) => Promise<OnboardingResponse>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for handling user onboarding
 * 
 * Creates a default organization for the user and assigns them to the free plan
 */
export function useOnboarding(): UseOnboardingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  const completeOnboarding = async (data: OnboardingData = {}): Promise<OnboardingResponse> => {
    console.log('🔍 Onboarding - user:', user?.id, user?.email);
    console.log('🔍 Onboarding - session available:', !!session);
    console.log('🔍 Onboarding - access_token available:', !!session?.access_token);
    
    if (!user || !session) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const accessToken = session.access_token;
      console.log('🔑 Onboarding - using token (first 20 chars):', accessToken?.substring(0, 20));
      
      const response = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          organization_name: data.organization_name,
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          use_case: data.use_case,
          acquisition_source: data.acquisition_source,
          referral_code: data.referral_code || localStorage.getItem('ref_code'),
          device_id: data.device_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete onboarding');
      }

      const result = await response.json();
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during onboarding';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    completeOnboarding,
    isLoading,
    error,
  };
} 