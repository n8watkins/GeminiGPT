// Load environment variables from .env.local (if it exists)
try {
  require('dotenv').config({ path: '.env.local' });
} catch {
  // Will be logged after logger is imported
}

// Import logger
const { serverLogger, securityLogger } = require('./lib/logger');

// Import graceful shutdown handler
const { ShutdownHandler } = require('./lib/shutdown');
const shutdownHandler = new ShutdownHandler();

/**
 * ============================================
 * ENVIRONMENT VARIABLE VALIDATION
 * ============================================
 * CRITICAL: Validate required environment variables before starting server
 */
function validateEnvironment() {
  const required = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY
  };

  const optional = {
    GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY,
    GOOGLE_SEARCH_ENGINE_ID: process.env.GOOGLE_SEARCH_ENGINE_ID,
    NEXT_PUBLIC_RAILWAY_URL: process.env.NEXT_PUBLIC_RAILWAY_URL,
    PRODUCTION_URL: process.env.PRODUCTION_URL
  };

  const missing = [];
  const warnings = [];

  // Check required variables
  for (const [key, value] of Object.entries(required)) {
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }

  // Validate API key format
  if (required.GEMINI_API_KEY && !required.GEMINI_API_KEY.startsWith('AIzaSy')) {
    warnings.push('GEMINI_API_KEY does not match expected format (should start with AIzaSy)');
  }

  // Check optional variables
  for (const [key, value] of Object.entries(optional)) {
    if (!value || value.trim() === '') {
      warnings.push(`Optional variable ${key} is not set - some features may be limited`);
    }
  }

  // Production-specific validation
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_RAILWAY_URL && !process.env.PRODUCTION_URL) {
      missing.push('NEXT_PUBLIC_RAILWAY_URL or PRODUCTION_URL (required for CORS in production)');
    }
  }

  serverLogger.info('\n========================================');
  serverLogger.info('🔍 Environment Variable Validation');
  serverLogger.info('========================================');

  // Log status
  for (const [key, value] of Object.entries(required)) {
    if (value) {
      serverLogger.info(`✅ ${key}: Set`);
    } else {
      securityLogger.error(`❌ ${key}: MISSING`);
    }
  }

  for (const [key, value] of Object.entries(optional)) {
    if (value) {
      serverLogger.info(`✅ ${key}: Set`);
    } else {
      serverLogger.warn(`⚠️  ${key}: Not set (optional)`);
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    serverLogger.warn('\n⚠️  WARNINGS:');
    warnings.forEach(warning => serverLogger.warn(`  - ${warning}`));
  }

  // Fail if required variables are missing
  if (missing.length > 0) {
    securityLogger.error('\n❌ CRITICAL: Missing required environment variables:');
    missing.forEach(key => securityLogger.error(`  - ${key}`));
    securityLogger.error('\nPlease set these variables in .env.local or your environment.');
    securityLogger.error('Example .env.local:');
    securityLogger.error('  GEMINI_API_KEY=your_api_key_here');
    securityLogger.error('  GOOGLE_SEARCH_API_KEY=your_search_key_here');
    securityLogger.error('  GOOGLE_SEARCH_ENGINE_ID=your_engine_id_here');
    securityLogger.error('========================================\n');
    process.exit(1);
  }

  serverLogger.info('========================================\n');
}

// Run validation
validateEnvironment();

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const helmet = require('helmet');
const { setupWebSocketServer } = require('./websocket-server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0'; // Railway uses 0.0.0.0
let port = parseInt(process.env.PORT) || 3000; // Railway provides PORT env var, default to 3000

// Railway specific configuration
if (process.env.RAILWAY_ENVIRONMENT) {
  serverLogger.info('🚂 Running on Railway', {
    environment: process.env.RAILWAY_ENVIRONMENT,
    domain: process.env.RAILWAY_PUBLIC_DOMAIN
  });
}

serverLogger.info('🚀 Server starting with config', {
  NODE_ENV: process.env.NODE_ENV,
  dev,
  hostname,
  port
});

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/**
 * Try to start server on a port, incrementing if the port is in use
 */
function startServer(currentPort, maxAttempts = 10) {
  if (maxAttempts <= 0) {
    serverLogger.error('Failed to find an available port after 10 attempts');
    process.exit(1);
  }

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // SECURITY: Apply security headers with Helmet
      // Note: Next.js handles some headers, but we add extra protection
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Next.js needs eval for hot reload
            styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs inline styles
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "wss:", "ws:", "https:"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
        referrerPolicy: {
          policy: 'strict-origin-when-cross-origin',
        },
        noSniff: true, // X-Content-Type-Options: nosniff
        xssFilter: true, // X-XSS-Protection: 1; mode=block
        hidePoweredBy: true, // Remove X-Powered-By header
      })(req, res, () => {});

      // Handle health check directly
      if (pathname === '/healthz') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('ok');
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      serverLogger.error('Error occurred handling request', { url: req.url, error: err.message });
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Setup Advanced WebSocket server with all features (attachments, embeddings, function calling)
  const io = setupWebSocketServer(server);

  server.listen(currentPort, hostname, (err) => {
    if (err) {
      if (err.code === 'EADDRINUSE') {
        serverLogger.warn(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
        server.close();
        startServer(currentPort + 1, maxAttempts - 1);
      } else {
        serverLogger.error('Server listen error', err);
        throw err;
      }
    } else {
      // Display localhost for local development, actual hostname for production
      const displayHost = (hostname === '0.0.0.0' && dev) ? 'localhost' : hostname;

      // Register server with shutdown handler
      shutdownHandler.setServer(server, io);
      shutdownHandler.registerHandlers();

      serverLogger.info(`✅ Server ready on http://${displayHost}:${currentPort}`);
      serverLogger.info(`✅ WebSocket server running on port ${currentPort}`);
      serverLogger.info(`✅ Health check available at http://${displayHost}:${currentPort}/healthz`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      serverLogger.warn(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
      server.close();
      startServer(currentPort + 1, maxAttempts - 1);
    } else {
      serverLogger.error('Server error', err);
      throw err;
    }
  });
}

app.prepare().then(() => {
  serverLogger.info('✅ Next.js app prepared successfully');
  startServer(port);
}).catch((err) => {
  serverLogger.error('Failed to prepare Next.js app', err);
  process.exit(1);
});
