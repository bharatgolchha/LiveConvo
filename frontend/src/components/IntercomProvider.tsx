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
    // Helper to compose user properties safely
    const buildUserProps = () => {
      if (!user) return {};
      const createdAt = user.created_at
        ? Math.floor(new Date(user.created_at).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      return {
        user_id: user.id,
        name: (user.user_metadata as any)?.full_name ?? user.email ?? '',
        email: user.email ?? '',
        created_at: createdAt,
      };
    };

    if (!bootedRef.current) {
      // First time → boot Intercom (visitor or user details if present)
      try {
        Intercom({
          app_id: 'zclf9bta',
          ...buildUserProps(),
        });
        bootedRef.current = true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Intercom boot failed', err);
      }
    } else {
      // Already booted → update user context (might transition from visitor→logged-in)
      if (user) {
        try {
          (Intercom as any)('update', buildUserProps());
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Intercom update failed', err);
        }
      }
    }

    // Cleanup when component unmounts
    return () => {
      if (bootedRef.current) {
        (Intercom as any)('shutdown');
        bootedRef.current = false;
      }
    };
  }, [user]);

  // This provider renders nothing visually
  return null;
} 