'use client';

import { useEffect, useState } from 'react';

/**
 * Detects whether the LivePrompt Chrome extension is installed.
 * Strategy:
 * 1) postMessage handshake with the content script (fast, reliable if our CS is active)
 * 2) fallback probe: load a web_accessible_resource via chrome-extension://<id>/... (requires NEXT_PUBLIC_CHROME_EXTENSION_ID)
 */
export function useExtensionPresence(timeoutMs: number = 1200): { installed: boolean; checking: boolean } {
  const [installed, setInstalled] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let resolved = false;

    const onMessage = (event: MessageEvent) => {
      const data: any = event?.data;
      if (data && data.type === 'LIVEPROMPT_EXT_PONG') {
        resolved = true;
        setInstalled(true);
        setChecking(false);
      }
    };

    window.addEventListener('message', onMessage);

    // 1) Handshake ping
    try {
      window.postMessage({ type: 'LIVEPROMPT_EXT_PING' }, '*');
    } catch {
      // ignore
    }

    const timer = setTimeout(() => {
      if (resolved) return;

      // 2) Fallback probe using web_accessible_resource (requires extension ID)
      const extId = process.env.NEXT_PUBLIC_CHROME_EXTENSION_ID;
      if (extId) {
        try {
          const img = new Image();
          img.onload = () => {
            setInstalled(true);
            setChecking(false);
          };
          img.onerror = () => {
            setInstalled(false);
            setChecking(false);
          };
          img.src = `chrome-extension://${extId}/assets/icons/icon-128.png`;
          return;
        } catch {
          // ignore and fall through
        }
      }

      setInstalled(false);
      setChecking(false);
    }, timeoutMs);

    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
    };
  }, [timeoutMs]);

  return { installed, checking };
}


