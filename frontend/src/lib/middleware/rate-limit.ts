import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimit(
  windowMs: number = 60 * 1000, // 1 minute
  max: number = 10 // 10 requests per window
) {
  return async (request: NextRequest): Promise<{ allowed: boolean; remaining: number }> => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                request.headers.get('x-real-ip') || 
                'unknown';
    
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();
    
    // Clean up expired entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });
    
    // Get or create rate limit entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    store[key].count++;
    const remaining = Math.max(0, max - store[key].count);
    
    return {
      allowed: store[key].count <= max,
      remaining
    };
  };
}