import { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import { User } from '@supabase/supabase-js';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Get initial auth state with error handling
    browser.runtime.sendMessage({ type: 'GET_AUTH_STATE' })
      .then(state => {
        if (state && state.isAuthenticated) {
          setAuthState({
            isAuthenticated: true,
            user: state.user,
            loading: false,
            error: state.error,
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: state?.error || null,
          });
        }
      })
      .catch(error => {
        console.warn('Could not get auth state from background:', error);
        // Fallback to unauthenticated state
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        });
      });

    // Listen for auth state changes
    const handleMessage = (message: any) => {
      if (message.type === 'AUTH_STATE_CHANGED') {
        const state = message.payload;
        if (state.isAuthenticated) {
          setAuthState({
            isAuthenticated: true,
            user: state.user,
            loading: false,
            error: state.error,
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: state.error,
          });
        }
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await browser.runtime.sendMessage({
        type: 'LOGIN',
        payload: { email, password },
      });

      if (result && result.success) {
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          loading: false,
          error: null,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: result?.error || 'Login failed',
        });
      }

      return result;
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: 'Connection error. Please try again.',
      });
      return { success: false, error: 'Connection error' };
    }
  };

  const logout = async () => {
    await browser.runtime.sendMessage({ type: 'LOGOUT' });
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    });
  };

  return {
    ...authState,
    login,
    logout,
  };
}