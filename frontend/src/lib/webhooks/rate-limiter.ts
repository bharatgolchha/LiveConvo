import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  identifier: string;    // Key to identify the rate limit bucket
}

export class WebhookRateLimiter {
  private static readonly DEFAULT_WINDOW_MS = 60000; // 1 minute
  private static readonly DEFAULT_MAX_REQUESTS = 100; // 100 requests per minute
  
  // In-memory store for rate limiting (consider Redis for production)
  private static rateLimitStore = new Map<string, {
    count: number;
    resetTime: number;
  }>();

  /**
   * Check if request should be rate limited
   */
  static async checkRateLimit(
    request: NextRequest,
    config?: Partial<RateLimitConfig>
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const windowMs = config?.windowMs ?? this.DEFAULT_WINDOW_MS;
    const maxRequests = config?.maxRequests ?? this.DEFAULT_MAX_REQUESTS;
    
    // Get identifier (IP address or custom identifier)
    const identifier = config?.identifier || this.getClientIdentifier(request);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = this.rateLimitStore.get(identifier);
    
    if (!entry || entry.resetTime <= now) {
      // Create new window
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
      this.rateLimitStore.set(identifier, entry);
    }
    
    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }
    
    // Increment counter
    entry.count++;
    
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Get client identifier from request
   */
  private static getClientIdentifier(request: NextRequest): string {
    // Try to get real IP from various headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    const ip = forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
    
    // For webhooks, also consider the webhook source
    const webhookSource = request.headers.get('x-webhook-source') || 'unknown';
    
    return `${ip}:${webhookSource}`;
  }

  /**
   * Clean up expired entries (run periodically)
   */
  static cleanupExpiredEntries() {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.rateLimitStore.forEach((entry, key) => {
      if (entry.resetTime <= now) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.rateLimitStore.delete(key));
  }

  /**
   * Verify webhook IP is from allowed sources
   */
  static async verifyWebhookSource(request: NextRequest): Promise<boolean> {
    // Get client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    const clientIp = forwardedFor?.split(',')[0] || realIp || cfConnectingIp;
    
    if (!clientIp) {
      console.warn('⚠️ Could not determine client IP for webhook');
      return true; // Allow if we can't determine IP (for local development)
    }
    
    // Recall.ai IP ranges (these are examples - get actual IPs from Recall.ai)
    const allowedIpRanges = [
      // Add Recall.ai IP ranges here
      '52.0.0.0/8',     // AWS us-east-1 range (example)
      '54.0.0.0/8',     // AWS us-west-2 range (example)
      '13.0.0.0/8',     // AWS eu-west-1 range (example)
    ];
    
    // For development, allow localhost and private IPs
    if (process.env.NODE_ENV === 'development') {
      allowedIpRanges.push(
        '127.0.0.1',
        '::1',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16'
      );
    }
    
    // Check if IP is in allowed ranges
    // Note: This is a simplified check - use a proper IP range library in production
    const isAllowed = allowedIpRanges.some(range => {
      if (range.includes('/')) {
        // CIDR notation - simplified check
        return clientIp.startsWith(range.split('/')[0].split('.').slice(0, -1).join('.'));
      }
      return clientIp === range;
    });
    
    if (!isAllowed) {
      console.warn(`⚠️ Webhook from unauthorized IP: ${clientIp}`);
    }
    
    return isAllowed;
  }

  /**
   * Log suspicious webhook activity
   */
  static async logSuspiciousActivity(
    request: NextRequest,
    reason: string
  ) {
    const supabase = createServerSupabaseClient();
    
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');
    
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'security_alert',
        event_type: 'suspicious_activity',
        payload: {
          reason,
          ip: forwardedFor || realIp || 'unknown',
          user_agent: userAgent,
          headers: Object.fromEntries(request.headers.entries()),
          url: request.url,
          method: request.method
        },
        processed: false,
        created_at: new Date().toISOString()
      });
  }
}

// Cleanup expired entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    WebhookRateLimiter.cleanupExpiredEntries();
  }, 5 * 60 * 1000);
}