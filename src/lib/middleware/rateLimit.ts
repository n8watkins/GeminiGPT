import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';
import { logger } from '../logger';

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 10000, // Track up to 10k IPs
  ttl: 60 * 60 * 1000, // 1 hour
});

/**
 * Creates a rate limiting function for Next.js API routes
 *
 * @param options - Configuration for rate limiting
 * @param options.maxRequests - Maximum number of requests allowed in window
 * @param options.windowMs - Time window in milliseconds
 * @returns Function that checks rate limit and returns null (allow) or error response
 *
 * @example
 * ```typescript
 * const chatRateLimit = rateLimit({
 *   maxRequests: 30,
 *   windowMs: 60 * 1000 // 30 requests per minute
 * });
 *
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = chatRateLimit(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *   // ... handle request
 * }
 * ```
 */
export function rateLimit(options: {
  maxRequests: number;
  windowMs: number;
}) {
  return (request: NextRequest): NextResponse | null => {
    // Get client IP (works with Railway, Vercel, etc.)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    const now = Date.now();
    const entry = rateLimitCache.get(ip);

    if (!entry || now > entry.resetTime) {
      // New window - allow request
      rateLimitCache.set(ip, {
        count: 1,
        resetTime: now + options.windowMs,
      });

      return null; // Allow request
    }

    if (entry.count >= options.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      logger.warn('Rate limit exceeded', {
        ip,
        count: entry.count,
        maxRequests: options.maxRequests,
        retryAfter
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(options.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(entry.resetTime / 1000)),
          }
        }
      );
    }

    // Increment counter and allow request
    entry.count += 1;
    rateLimitCache.set(ip, entry);

    return null; // Allow request
  };
}

/**
 * Get rate limit statistics (for monitoring/debugging)
 *
 * @returns Statistics about current rate limit cache
 */
export function getRateLimitStats() {
  return {
    trackedIPs: rateLimitCache.size,
    cacheCapacity: rateLimitCache.max,
    utilizationPercent: (rateLimitCache.size / (rateLimitCache.max || 1)) * 100,
  };
}
