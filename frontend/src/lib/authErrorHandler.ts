/**
 * Centralized auth error handling utilities
 */

export const isRefreshTokenError = (error: unknown): boolean => {
  if (!error) return false;
  
  const err = error as { message?: string; error?: string; code?: string; status?: number };
  const errorMessage = err.message || err.error || '';
  const errorCode = err.code || '';
  
  return (
    errorMessage.toLowerCase().includes('refresh token') ||
    errorMessage.toLowerCase().includes('invalid refresh token') ||
    errorCode === 'invalid_refresh_token' ||
    err.status === 401
  );
};

export const handleAuthError = (error: unknown): void => {
  if (isRefreshTokenError(error)) {
    console.error('Refresh token error detected:', error);
    
    // Clear local storage
    if (typeof window !== 'undefined') {
      // Clear Supabase auth storage
      localStorage.removeItem('supabase.auth.token');
      
      // Redirect to clear auth endpoint
      window.location.href = '/auth/clear';
    }
  }
};

export const wrapAuthenticatedCall = async <T>(
  fn: () => Promise<T>
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    handleAuthError(error);
    throw error;
  }
};