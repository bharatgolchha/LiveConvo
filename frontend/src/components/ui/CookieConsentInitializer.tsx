'use client';

import { useEffect } from 'react';
import { initializeCookieConsent } from '@/lib/cookies/cookie-consent';

export function CookieConsentInitializer() {
  useEffect(() => {
    initializeCookieConsent();
  }, []);
  
  return null;
}