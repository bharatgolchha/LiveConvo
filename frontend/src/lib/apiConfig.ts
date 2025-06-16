export interface ApiConfig {
  success: boolean;
  apiKey?: string; // for OpenAI (OpenRouter)
  deepgramApiKey?: string;
  [key: string]: any;
}

let cachedConfigPromise: Promise<ApiConfig> | null = null;

/**
 * Fetches /api/config only once per tab life-cycle and caches the promise so
 * multiple hooks don't spam the endpoint.
 */
export function getApiConfig(): Promise<ApiConfig> {
  if (!cachedConfigPromise) {
    cachedConfigPromise = fetch('/api/config')
      .then((res) => {
        if (!res.ok) throw new Error(`/api/config failed: ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        cachedConfigPromise = null; // allow retry next time
        throw err;
      });
  }
  return cachedConfigPromise;
} 