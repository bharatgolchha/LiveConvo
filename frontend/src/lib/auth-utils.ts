/**
 * Utility functions for handling authentication errors and recovery
 */

export const clearAuthData = () => {
  if (typeof window === 'undefined') return;
  
  // Clear all auth-related data from localStorage
  const localKeys = Object.keys(localStorage);
  localKeys.forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
      localStorage.removeItem(key);
    }
  });
  
  // Also clear sessionStorage
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
      sessionStorage.removeItem(key);
    }
  });
  
  // Clear cookies that might contain auth data
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
    if (name.includes('supabase') || name.includes('sb-') || name.includes('auth')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
};

export const isAuthError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  const authErrorPatterns = [
    'Auth session missing',
    'refresh token',
    'Refresh Token',
    'token expired',
    'Invalid token',
    'jwt expired',
    'JWT expired',
    'unauthorized',
    'Unauthorized',
    'authentication failed',
    'not authenticated'
  ];
  
  return authErrorPatterns.some(pattern => errorMessage.includes(pattern));
};

export const handleAuthError = (error: any) => {
  if (isAuthError(error)) {
    console.error('Auth error detected:', error);
    clearAuthData();
    
    // Redirect to recovery page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/recovery';
    }
  }
};