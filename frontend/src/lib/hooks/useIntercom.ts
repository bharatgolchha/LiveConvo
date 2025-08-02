'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasConsentForCategory } from '@/lib/cookies/cookie-consent';

interface IntercomWindow extends Window {
  Intercom?: (...args: any[]) => void;
  intercomSettings?: any;
}

declare const window: IntercomWindow;

export function useIntercom() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if user has consented to functional cookies
    if (!hasConsentForCategory('functional')) {
      // If no consent, ensure Intercom is shut down if it was previously loaded
      if (window.Intercom && isReady) {
        window.Intercom('shutdown');
        setIsReady(false);
      }
      return;
    }

    const loadIntercom = () => {
      // Create the Intercom script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://widget.intercom.io/widget/zclf9bta';
      
      script.onload = () => {
        if (window.Intercom) {
          // Initialize Intercom with base settings
          window.Intercom('boot', {
            app_id: 'zclf9bta',
            hide_default_launcher: true,
            ...(user && {
              user_id: user.id,
              email: user.email || '',
              name: (user.user_metadata as any)?.full_name || user.email || '',
              created_at: user.created_at 
                ? Math.floor(new Date(user.created_at).getTime() / 1000)
                : Math.floor(Date.now() / 1000),
            }),
          });
          setIsReady(true);
        }
      };

      // Check if Intercom is already loaded
      if (window.Intercom) {
        // Update user data if already loaded
        window.Intercom('update', {
          ...(user && {
            user_id: user.id,
            email: user.email || '',
            name: (user.user_metadata as any)?.full_name || user.email || '',
            created_at: user.created_at 
              ? Math.floor(new Date(user.created_at).getTime() / 1000)
              : Math.floor(Date.now() / 1000),
          }),
        });
        setIsReady(true);
      } else {
        // Load Intercom script
        document.body.appendChild(script);
      }
    };

    // Delay loading to ensure DOM is ready
    const timeoutId = setTimeout(loadIntercom, 100);

    // Listen for cookie consent changes
    const handleConsentUpdate = (event: CustomEvent) => {
      const consent = event.detail;
      if (!consent.functional && window.Intercom && isReady) {
        // User revoked functional cookie consent, shut down Intercom
        window.Intercom('shutdown');
        setIsReady(false);
      } else if (consent.functional && !isReady) {
        // User granted functional cookie consent, reload Intercom
        loadIntercom();
      }
    };

    window.addEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener);
      // Don't shutdown on unmount as it causes issues with navigation
    };
  }, [user, isReady]);

  const show = useCallback(() => {
    if (window.Intercom && isReady) {
      window.Intercom('show');
    }
  }, [isReady]);

  const hide = useCallback(() => {
    if (window.Intercom && isReady) {
      window.Intercom('hide');
    }
  }, [isReady]);

  const update = useCallback((data: any) => {
    if (window.Intercom && isReady) {
      window.Intercom('update', data);
    }
  }, [isReady]);

  const shutdown = useCallback(() => {
    if (window.Intercom && isReady) {
      window.Intercom('shutdown');
      setIsReady(false);
    }
  }, [isReady]);

  return {
    isReady,
    show,
    hide,
    update,
    shutdown,
  };
}