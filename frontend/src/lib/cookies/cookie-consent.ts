export type CookieCategory = 'essential' | 'analytics' | 'functional' | 'marketing';

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  timestamp: number;
}

const CONSENT_KEY = 'cookie-consent';
const CONSENT_EXPIRY_DAYS = 365; // 13 months max per GDPR

export const defaultConsent: CookieConsent = {
  essential: true, // Always required
  analytics: true,
  functional: true,
  marketing: true,
  timestamp: Date.now(),
};

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    
    const consent = JSON.parse(stored) as CookieConsent;
    
    // Check if consent is expired (13 months)
    const expiryTime = consent.timestamp + (CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    if (Date.now() > expiryTime) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    
    return consent;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
}

export function setCookieConsent(consent: Partial<CookieConsent>): void {
  if (typeof window === 'undefined') return;
  
  const fullConsent: CookieConsent = {
    ...defaultConsent,
    ...consent,
    essential: true, // Essential cookies cannot be disabled
    timestamp: Date.now(),
  };
  
  localStorage.setItem(CONSENT_KEY, JSON.stringify(fullConsent));
  
  // Dispatch custom event for other components to react
  window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: fullConsent }));
  
  // Apply consent immediately
  applyConsent(fullConsent);
}

export function hasConsentForCategory(category: CookieCategory): boolean {
  const consent = getCookieConsent();
  if (!consent) return false;
  return consent[category] === true;
}

export function acceptAllCookies(): void {
  setCookieConsent({
    essential: true,
    analytics: true,
    functional: true,
    marketing: true,
  });
}

export function rejectAllCookies(): void {
  setCookieConsent({
    essential: true,
    analytics: false,
    functional: false,
    marketing: false,
  });
  clearNonEssentialCookies();
}

export function clearNonEssentialCookies(): void {
  if (typeof window === 'undefined') return;
  
  // Get all cookies
  const cookies = document.cookie.split(';');
  
  // List of essential cookies to keep
  const essentialCookies = [
    'supabase-auth-token',
    '__stripe_mid',
    '__stripe_sid',
  ];
  
  cookies.forEach(cookie => {
    const [name] = cookie.split('=').map(c => c.trim());
    
    // Skip essential cookies
    if (essentialCookies.some(essential => name.includes(essential))) {
      return;
    }
    
    // Delete cookie by setting expiry in the past
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
  });
}

function applyConsent(consent: CookieConsent): void {
  // Handle Google Analytics
  if (!consent.analytics && typeof window !== 'undefined' && 'gtag' in window) {
    // Disable Google Analytics
    (window as any).gtag('consent', 'update', {
      'analytics_storage': 'denied'
    });
  } else if (consent.analytics && typeof window !== 'undefined' && 'gtag' in window) {
    // Enable Google Analytics
    (window as any).gtag('consent', 'update', {
      'analytics_storage': 'granted'
    });
  }
  
  // Handle Google Ads
  if (!consent.marketing && typeof window !== 'undefined' && 'gtag' in window) {
    // Disable Google Ads
    (window as any).gtag('consent', 'update', {
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied'
    });
  } else if (consent.marketing && typeof window !== 'undefined' && 'gtag' in window) {
    // Enable Google Ads
    (window as any).gtag('consent', 'update', {
      'ad_storage': 'granted',
      'ad_user_data': 'granted',
      'ad_personalization': 'granted'
    });
  }
}

// Initialize consent on page load
export function initializeCookieConsent(): void {
  const consent = getCookieConsent();
  if (consent) {
    applyConsent(consent);
  } else {
    // No consent stored yet, apply default consent (all enabled)
    applyConsent(defaultConsent);
  }
}