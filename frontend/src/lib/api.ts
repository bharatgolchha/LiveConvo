import { Session } from '@supabase/supabase-js';

/**
 * Utility function to make authenticated API requests
 * Automatically includes the Bearer token from the session
 */
export async function authenticatedFetch(
  url: string,
  session: Session | null,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if session is available
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Utility function to make authenticated API requests with JSON response
 * Automatically includes the Bearer token and parses JSON response
 */
export async function authenticatedFetchJson<T = any>(
  url: string,
  session: Session | null,
  options: RequestInit = {}
): Promise<T> {
  const response = await authenticatedFetch(url, session, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }
  
  return response.json();
} 