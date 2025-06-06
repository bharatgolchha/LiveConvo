import { supabase } from '@/lib/supabase';

/**
 * Helper function to make authenticated admin API requests
 */
export async function adminFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('Admin API error:', error);
    throw new Error(error.details || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}