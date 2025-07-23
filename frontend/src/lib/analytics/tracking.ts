declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      parameters: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

export interface ConversionEvent {
  value: number;
  currency: string;
  transaction_id: string;
  items?: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>;
}

export interface TrackingEvent {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: any;
}

export const GoogleAdsConfig = {
  CONVERSION_ID: 'AW-17380711971',
  CONVERSION_LABEL: '5o3ECK7Pv_YaEKO84t9A',
} as const;

export const trackConversion = (event: ConversionEvent) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google Analytics not initialized');
    return;
  }

  // Track Google Ads conversion
  window.gtag('event', 'conversion', {
    send_to: `${GoogleAdsConfig.CONVERSION_ID}/${GoogleAdsConfig.CONVERSION_LABEL}`,
    value: event.value,
    currency: event.currency,
    transaction_id: event.transaction_id,
  });

  // Track enhanced e-commerce purchase event
  if (event.items && event.items.length > 0) {
    window.gtag('event', 'purchase', {
      transaction_id: event.transaction_id,
      value: event.value,
      currency: event.currency,
      items: event.items,
    });
  }

  console.log('📊 Conversion tracked:', {
    transaction_id: event.transaction_id,
    value: event.value,
    currency: event.currency,
  });
};

export const trackEvent = (
  action: string,
  category: string,
  params?: TrackingEvent
) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google Analytics not initialized');
    return;
  }

  window.gtag('event', action, {
    event_category: category,
    ...params,
  });
};

export const trackPageView = (url: string, title?: string) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google Analytics not initialized');
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: url,
    page_title: title,
  });
};

export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google Analytics not initialized');
    return;
  }

  window.gtag('set', 'user_properties', properties);
};

export const trackSubscriptionEvent = (
  eventName: 'trial_start' | 'subscription_created' | 'subscription_upgraded' | 'subscription_downgraded' | 'subscription_cancelled',
  params: {
    plan_name: string;
    plan_interval: 'monthly' | 'yearly';
    value?: number;
    currency?: string;
    trial_days?: number;
  }
) => {
  trackEvent(eventName, 'subscription', {
    plan_name: params.plan_name,
    plan_interval: params.plan_interval,
    value: params.value,
    currency: params.currency,
    trial_days: params.trial_days,
  });
};