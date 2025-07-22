// fetchCache.ts
// Lightweight in-memory cache + request deduplication for GET requests.
// NOTE: This is *client-side* only – the cache resets on page reload.
// Usage:
//   const data = await fetchWithCache('/api/calendar/connections', {
//     headers: { ...auth },
//   }, 60_000); // cache for 1 minute

export interface FetchCacheOptions extends RequestInit {
  /**
   * Time-to-live for the cache entry in milliseconds.
   * Defaults to 30 seconds.
   */
  ttl?: number;
}

type CacheEntry = {
  expiry: number;
  data: any;
};

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<any>>();

function buildKey(url: string, init?: RequestInit): string {
  const { headers, method = 'GET', body } = init || {};
  // We only cache GET requests without a body.
  if (method && method.toUpperCase() !== 'GET') return `${Date.now()}_${url}`;
  if (body) return `${Date.now()}_${url}`;

  // Normalise headers that influence auth (e.g. Bearer token)
  let auth = '';
  if (headers && (headers as any)['Authorization']) {
    auth = (headers as any)['Authorization'];
  }
  return `${url}::${auth}`;
}

export async function fetchWithCache(url: string, init: FetchCacheOptions = {}, defaultTtl = 30_000): Promise<any> {
  const ttl = init.ttl ?? defaultTtl;
  const key = buildKey(url, init);
  const now = Date.now();

  // 1. Serve from cache if fresh
  const cached = cache.get(key);
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  // 2. If there is an in-flight request, wait for it
  const inflight = pending.get(key);
  if (inflight) {
    return inflight;
  }

  // 3. Kick off the fetch
  const fetchPromise = fetch(url, { ...init, cache: 'no-store' }).then(async (res) => {
    if (!res.ok) {
      // Remove pending so next call can retry
      pending.delete(key);
      throw new Error(`Request failed: ${res.status}`);
    }
    const data = await res.json();
    // Cache result
    cache.set(key, { data, expiry: Date.now() + ttl });
    pending.delete(key);
    return data;
  }).catch((err) => {
    pending.delete(key);
    throw err;
  });

  // Track inflight
  pending.set(key, fetchPromise);
  return fetchPromise;
} 