// Load environment variables from .env.local (if it exists)
try {
  require('dotenv').config({ path: '.env.local' });
} catch {
  console.log('No .env.local file found, using system environment variables');
}

console.log('Server environment check:');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GOOGLE_SEARCH_API_KEY exists:', !!process.env.GOOGLE_SEARCH_API_KEY);
console.log('GOOGLE_SEARCH_ENGINE_ID exists:', !!process.env.GOOGLE_SEARCH_ENGINE_ID);

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { setupWebSocketServer } = require('./websocket-server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0'; // Railway uses 0.0.0.0
let port = parseInt(process.env.PORT) || 3000; // Railway provides PORT env var, default to 3000

// Railway specific configuration
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('🚂 Running on Railway');
  console.log('  RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
  console.log('  RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN);
}

console.log('🚀 Server starting with config:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  dev mode:', dev);
console.log('  hostname:', hostname);
console.log('  port:', port);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/**
 * Try to start server on a port, incrementing if the port is in use
 */
function startServer(currentPort, maxAttempts = 10) {
  if (maxAttempts <= 0) {
    console.error('Failed to find an available port after 10 attempts');
    process.exit(1);
  }

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Handle health check directly
      if (pathname === '/healthz') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('ok');
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Setup Advanced WebSocket server with all features (attachments, embeddings, function calling)
  setupWebSocketServer(server);

  server.listen(currentPort, hostname, (err) => {
    if (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
        server.close();
        startServer(currentPort + 1, maxAttempts - 1);
      } else {
        console.error('❌ Server listen error:', err);
        throw err;
      }
    } else {
      // Display localhost for local development, actual hostname for production
      const displayHost = (hostname === '0.0.0.0' && dev) ? 'localhost' : hostname;
      console.log(`✅ Server ready on http://${displayHost}:${currentPort}`);
      console.log(`✅ WebSocket server running on port ${currentPort}`);
      console.log(`✅ Health check available at http://${displayHost}:${currentPort}/healthz`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
      server.close();
      startServer(currentPort + 1, maxAttempts - 1);
    } else {
      console.error('Server error:', err);
      throw err;
    }
  });
}

app.prepare().then(() => {
  console.log('✅ Next.js app prepared successfully');
  startServer(port);
}).catch((err) => {
  console.error('❌ Failed to prepare Next.js app:', err);
  process.exit(1);
});
