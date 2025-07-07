'use client';

import { useEffect, useRef } from 'react';
import Intercom from '@intercom/messenger-js-sdk';
import { useAuth } from '@/contexts/AuthContext';

/**
 * IntercomProvider
 *
 * Bootstraps the Intercom Messenger when a signed-in user is available.
 * It automatically shuts down / reboots on auth changes so user context
 * stays in sync.
 */
export default function IntercomProvider() {
  const { user } = useAuth();
  const bootedRef = useRef(false);

  useEffect(() => {
    // Only initialise on the client after we have a user
    if (!user) {
      // If no user but previously booted → shutdown to clear visitor context
      if (bootedRef.current) {
        Intercom('shutdown');
        bootedRef.current = false;
      }
      return;
    }

    // If already booted with this user, skip
    if (bootedRef.current) return;

    try {
      Intercom({
        app_id: 'zclf9bta',
        user_id: user.id,
        name: (user.user_metadata as any)?.full_name ?? user.email ?? '',
        email: user.email ?? '',
        created_at:
          user.created_at
            ? Math.floor(new Date(user.created_at).getTime() / 1000)
            : undefined,
      });
      bootedRef.current = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Intercom boot failed', err);
    }

    // Cleanup when component unmounts
    return () => {
      if (bootedRef.current) {
        Intercom('shutdown');
        bootedRef.current = false;
      }
    };
  }, [user]);

  // This provider renders nothing visually
  return null;
} 