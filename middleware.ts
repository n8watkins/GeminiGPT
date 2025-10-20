/**
 * Next.js Middleware for Request Logging
 *
 * Provides structured request logging with performance tracking.
 * Logs:
 * - Request method and path
 * - Response status code
 * - Response time
 * - User agent
 * - Error details (if any)
 *
 * Privacy considerations:
 * - Does not log request body
 * - Does not log query parameters (may contain sensitive data)
 * - Does not log full headers (may contain auth tokens)
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from './lib/logger';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname, search } = request.nextUrl;
  const method = request.method;

  // Generate unique request ID for correlation
  const requestId = crypto.randomUUID();

  // Log incoming request
  serverLogger.info('Incoming request', {
    requestId,
    method,
    path: pathname,
    userAgent: request.headers.get('user-agent')?.substring(0, 100), // Truncate long UA strings
  });

  try {
    // Continue with request
    const response = NextResponse.next();

    // Add request ID to response headers for debugging
    response.headers.set('X-Request-ID', requestId);

    // Log response
    const duration = Date.now() - startTime;
    serverLogger.info('Request completed', {
      requestId,
      method,
      path: pathname,
      status: response.status,
      duration, // milliseconds
    });

    // MONITORING: Log slow requests (>1s)
    if (duration > 1000) {
      serverLogger.warn('Slow request detected', {
        requestId,
        method,
        path: pathname,
        duration,
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error
    serverLogger.error('Request failed', {
      requestId,
      method,
      path: pathname,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw to let Next.js handle the error
    throw error;
  }
}

/**
 * Configure which routes should use this middleware
 *
 * We apply middleware to:
 * - All API routes (/api/*)
 * - All app routes except static files
 *
 * We skip:
 * - Static files (_next/static)
 * - Image optimization (_next/image)
 * - Favicon
 * - Public files that are explicitly static
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
