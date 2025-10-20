/**
 * Sentry Client Configuration
 *
 * Error tracking for Next.js frontend (browser).
 *
 * Features:
 * - Error tracking with context
 * - Session replay on errors
 * - Performance monitoring
 * - Privacy protection
 */

import * as Sentry from '@sentry/nextjs';

// Only initialize if DSN is provided
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    integrations: [
      Sentry.replayIntegration({
        // Privacy settings for session replay
        maskAllText: true, // Mask all text to protect user privacy
        blockAllMedia: true, // Block images/videos
      }),
    ],

    // PRIVACY: Strip sensitive data
    beforeSend(event, hint) {
      // Remove localStorage data (may contain API keys)
      if (event.contexts?.localStorage) {
        delete event.contexts.localStorage;
      }

      // Redact API keys from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Redact API keys
            if (breadcrumb.data.apiKey) {
              breadcrumb.data.apiKey = '[Redacted]';
            }
            // Redact message content (may contain sensitive user data)
            if (breadcrumb.data.message) {
              breadcrumb.data.message = '[Redacted]';
            }
          }
          return breadcrumb;
        });
      }

      // Redact API keys from exception messages
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((exception) => {
          if (exception.value) {
            exception.value = exception.value.replace(
              /AIza[A-Za-z0-9_-]{35}/g,
              'AIza[Redacted]'
            );
          }
          return exception;
        });
      }

      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'WebSocket is already in CLOSING or CLOSED state',
    ],
  });

  console.log('✅ Sentry initialized for frontend');
}
