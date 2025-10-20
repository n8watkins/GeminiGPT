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
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 *
 * @param ip - IP address string to validate
 * @returns true if valid IP format, false otherwise
 */
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;

  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    return false;
  }

  // Additional validation for IPv4 octets (0-255)
  if (ipv4Regex.test(ip)) {
    const octets = ip.split('.');
    return octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  return true; // IPv6 passed basic regex
}

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
    // Extract client IP with validation to prevent header spoofing
    let ip = 'unknown';

    // Only trust proxy headers if explicitly configured
    // This prevents attackers from spoofing X-Forwarded-For headers
    const trustProxy = process.env.TRUST_PROXY === 'true';

    if (trustProxy) {
      // When behind a trusted proxy (Railway, Vercel, etc.)
      const forwardedFor = request.headers.get('x-forwarded-for');
      if (forwardedFor) {
        // Take the rightmost IP as that's set by the trusted proxy
        // Format: "client, proxy1, proxy2" -> take "proxy2" (most recent)
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        const candidateIp = ips[ips.length - 1];

        // Validate IP format before using
        if (isValidIP(candidateIp)) {
          ip = candidateIp;
        } else {
          logger.warn('Invalid IP in X-Forwarded-For header', { forwardedFor });
        }
      } else {
        // Fallback to X-Real-IP if no X-Forwarded-For
        const realIp = request.headers.get('x-real-ip');
        if (realIp && isValidIP(realIp)) {
          ip = realIp;
        }
      }
    } else {
      // Not behind trusted proxy - use connection IP or mark as unknown
      // In Next.js Edge/Middleware, request.ip may not be available
      // Fall back to 'unknown' which will still rate limit (all unknowns grouped together)
      ip = (request as any).ip || 'unknown';

      if (ip !== 'unknown' && !isValidIP(ip)) {
        logger.warn('Invalid connection IP', { ip });
        ip = 'unknown';
      }
    }

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
