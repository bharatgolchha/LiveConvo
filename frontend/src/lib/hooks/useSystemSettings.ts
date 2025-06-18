import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

export interface SystemSettings {
  default_ai_model: string;
  [key: string]: any;
}

const fetcher = async (url: string, token: string): Promise<SystemSettings | null> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch system settings');
  }
  return response.json();
};

/**
 * React hook to load system-wide settings (admin configurable).
 */
export default function useSystemSettings() {
  const { session } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<SystemSettings | null>(
    session ? '/api/admin/system-settings' : null,
    (url: string) => fetcher(url, session!.access_token)
  );

  return {
    settings: data,
    loading: isLoading,
    error,
    refresh: mutate,
  } as const;
} 