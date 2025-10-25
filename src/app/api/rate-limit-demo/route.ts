/**
 * Rate Limit Demo API Endpoint
 *
 * Demonstrates how to add standard rate limit headers to HTTP responses.
 * This follows the RateLimit header fields specification:
 * https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 *
 * Headers returned:
 * - X-RateLimit-Limit: Maximum requests allowed in the window
 * - X-RateLimit-Remaining: Requests remaining in the current window
 * - X-RateLimit-Reset: Time when the rate limit resets (Unix timestamp)
 * - Retry-After: Seconds to wait before retrying (when rate limited)
 *
 * Response status codes:
 * - 200: Request allowed
 * - 429: Too Many Requests (rate limited)
 */

import { NextResponse } from 'next/server';

interface RateLimitInfo {
  allowed: boolean;
  retryAfter: number;
  remaining: {
    minute: number;
    hour: number;
  };
  limit: {
    minute: number;
    hour: number;
  };
  resetAt: {
    minute: number;
    hour: number;
  };
  limitType?: string;
}

/**
 * Mock rate limiter for demonstration
 * In production, this would use the actual RateLimiter service
 */
function getMockRateLimitInfo(): RateLimitInfo {
  // For demo purposes, simulate rate limit info
  return {
    allowed: true,
    retryAfter: 0,
    remaining: {
      minute: 55,
      hour: 480,
    },
    limit: {
      minute: 60,
      hour: 500,
    },
    resetAt: {
      minute: Date.now() + 30000, // 30 seconds
      hour: Date.now() + 1800000, // 30 minutes
    },
  };
}

/**
 * Add rate limit headers to a response
 */
function addRateLimitHeaders(
  response: NextResponse,
  rateLimitInfo: RateLimitInfo
): void {
  // Use minute window as the primary rate limit for headers
  const { remaining, limit, resetAt } = rateLimitInfo;

  // Standard rate limit headers (minute window)
  response.headers.set('X-RateLimit-Limit', limit.minute.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.minute.toString());
  response.headers.set(
    'X-RateLimit-Reset',
    Math.floor(resetAt.minute / 1000).toString()
  );

  // Additional headers for hour window (custom)
  response.headers.set('X-RateLimit-Limit-Hour', limit.hour.toString());
  response.headers.set('X-RateLimit-Remaining-Hour', remaining.hour.toString());
  response.headers.set(
    'X-RateLimit-Reset-Hour',
    Math.floor(resetAt.hour / 1000).toString()
  );

  // If rate limited, add Retry-After header
  if (!rateLimitInfo.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimitInfo.retryAfter / 1000);
    response.headers.set('Retry-After', retryAfterSeconds.toString());
  }
}

/**
 * GET /api/rate-limit-demo
 *
 * Demonstrates rate limit headers in HTTP responses
 */
export async function GET(): Promise<NextResponse> {
  // Check rate limit
  const rateLimitInfo = getMockRateLimitInfo();

  // If rate limited, return 429 Too Many Requests
  if (!rateLimitInfo.allowed) {
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please try again in ${Math.ceil(
          rateLimitInfo.retryAfter / 1000
        )} seconds.`,
        limitType: rateLimitInfo.limitType,
        retryAfter: rateLimitInfo.retryAfter,
      },
      { status: 429 }
    );

    addRateLimitHeaders(response, rateLimitInfo);
    return response;
  }

  // Request allowed - return success with rate limit info
  const response = NextResponse.json({
    success: true,
    message: 'Request allowed',
    rateLimit: {
      remaining: rateLimitInfo.remaining,
      limit: rateLimitInfo.limit,
      resetAt: {
        minute: new Date(rateLimitInfo.resetAt.minute).toISOString(),
        hour: new Date(rateLimitInfo.resetAt.hour).toISOString(),
      },
    },
  });

  addRateLimitHeaders(response, rateLimitInfo);
  return response;
}

/**
 * POST /api/rate-limit-demo
 *
 * Same as GET but for demonstration of POST requests
 */
export async function POST(): Promise<NextResponse> {
  return GET();
}
