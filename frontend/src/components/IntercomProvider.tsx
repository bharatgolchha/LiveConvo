'use client';

import { useIntercom } from '@/lib/hooks/useIntercom';

/**
 * IntercomProvider
 *
 * Bootstraps the Intercom Messenger when a signed-in user is available.
 * It automatically handles auth changes so user context stays in sync.
 */
export default function IntercomProvider() {
  // The hook handles all initialization and user updates
  useIntercom();

  // This provider renders nothing visually
  return null;
}