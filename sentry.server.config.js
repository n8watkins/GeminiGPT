/**
 * Sentry Server Configuration
 *
 * Error tracking and performance monitoring for Node.js backend.
 *
 * Features:
 * - Error tracking with context
 * - Performance monitoring (tracing)
 * - Privacy protection (strips sensitive data)
 * - Environment-aware configuration
 * - Ignored errors (known non-critical issues)
 */

const Sentry = require('@sentry/node');

// Only initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Note: Profiling disabled - requires @sentry/profiling-node package
    // Install with: npm install @sentry/profiling-node
    // Then uncomment the lines below
    // profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // integrations: [nodeProfilingIntegration()],

    // PRIVACY: Strip sensitive data before sending to Sentry
    beforeSend(event, hint) {
      // Remove cookies (may contain session tokens)
      if (event.request?.cookies) {
        delete event.request.cookies;
      }

      // Remove authorization headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        // Don't send API keys
        if (event.request.headers['x-api-key']) {
          event.request.headers['x-api-key'] = '[Redacted]';
        }
      }

      // Remove query params that might contain sensitive data
      if (event.request?.query_string) {
        const params = new URLSearchParams(event.request.query_string);
        if (params.has('apiKey')) {
          params.set('apiKey', '[Redacted]');
          event.request.query_string = params.toString();
        }
      }

      // Redact API keys from exception messages
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((exception) => {
          if (exception.value) {
            // Replace anything that looks like a Gemini API key
            exception.value = exception.value.replace(/AIza[A-Za-z0-9_-]{35}/g, 'AIza[Redacted]');
          }
          return exception;
        });
      }

      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Browser errors we can't control
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',

      // Non-Error promise rejections (often not real errors)
      'Non-Error promise rejection captured',

      // Network errors (user connectivity issues)
      'Network request failed',
      'Failed to fetch',
      'NetworkError',

      // WebSocket disconnections (expected behavior)
      'WebSocket is already in CLOSING or CLOSED state',
      'Connection closed',

      // Rate limiting (expected behavior, logged elsewhere)
      'Rate limit exceeded',
    ],

    // Ignore errors from certain URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  console.log('✅ Sentry initialized for backend');
} else {
  console.log('⚠️  Sentry DSN not configured - error tracking disabled');
}

module.exports = Sentry;
