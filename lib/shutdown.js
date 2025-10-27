/**
 * Graceful Shutdown Handler
 *
 * Ensures clean closure of all resources before process exit.
 * Handles SIGTERM, SIGINT, uncaughtException, and unhandledRejection.
 *
 * Features:
 * - Prevents multiple simultaneous shutdown attempts
 * - 5-second timeout for force exit (optimized for fast dev restarts)
 * - Individual operation timeouts (2s for WebSocket, 1s per database)
 * - Closes HTTP server
 * - Closes WebSocket connections (with timeout)
 * - Cleans up rate limiter (clears setInterval to allow process to exit)
 * - Closes database connections (with timeout per DB)
 *
 * Shutdown Order:
 * 1. Stop accepting new connections (HTTP server)
 * 2. Disconnect active WebSocket clients
 * 3. Clear rate limiter cleanup interval
 * 4. Close database connections (SQLite + LanceDB)
 *
 * Usage:
 * const { ShutdownHandler } = require('./lib/shutdown');
 * const shutdown = new ShutdownHandler();
 * shutdown.setServer(httpServer, ioServer, rateLimiter);
 */

const { serverLogger, securityLogger } = require('./logger');

class ShutdownHandler {
  constructor() {
    this.isShuttingDown = false;
    this.server = null;
    this.io = null;
    this.rateLimiter = null;
    this.forceExitTimeout = 5000; // 5 seconds - faster for dev, still safe for production
  }

  /**
   * Register HTTP server, WebSocket server, and services for cleanup
   * @param {Object} server - HTTP server instance
   * @param {Object} io - Socket.IO server instance
   * @param {Object} rateLimiter - Rate limiter instance with cleanup interval
   */
  setServer(server, io, rateLimiter = null) {
    this.server = server;
    this.io = io;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Helper to run async operation with timeout
   * @param {Function} operation - Async operation to run
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} name - Name of operation for logging
   */
  async withTimeout(operation, timeout, name) {
    return Promise.race([
      operation(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${name} timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Perform graceful shutdown
   * @param {string} signal - Signal that triggered shutdown (SIGTERM, SIGINT, etc.)
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      serverLogger.warn('Shutdown already in progress, ignoring signal:', signal);
      return;
    }

    this.isShuttingDown = true;
    serverLogger.info(`\n🛑 ${signal} received. Starting graceful shutdown...`);

    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimer = setTimeout(() => {
      securityLogger.error(
        `❌ Graceful shutdown timeout (${this.forceExitTimeout}ms). Force exiting...`
      );
      process.exit(1);
    }, this.forceExitTimeout);

    try {
      // Step 1: Stop accepting new connections
      if (this.server) {
        serverLogger.info('📛 Closing HTTP server...');
        await new Promise((resolve, reject) => {
          this.server.close((err) => {
            if (err) {
              serverLogger.error('Error closing HTTP server:', err);
              reject(err);
            } else {
              serverLogger.info('✅ HTTP server closed');
              resolve();
            }
          });
        });
      }

      // Step 2: Close WebSocket connections (with 2s timeout)
      if (this.io) {
        serverLogger.info('📛 Closing WebSocket connections...');

        try {
          await this.withTimeout(async () => {
            const sockets = await this.io.fetchSockets();
            serverLogger.info(`   Disconnecting ${sockets.length} active socket(s)...`);

            for (const socket of sockets) {
              socket.disconnect(true);
            }

            this.io.close();
          }, 2000, 'WebSocket close');

          serverLogger.info('✅ WebSocket server closed');
        } catch (error) {
          serverLogger.warn('WebSocket close timeout, forcing...', error.message);
          try {
            this.io.close();
          } catch (e) {
            // Ignore errors on forced close
          }
        }
      }

      // Step 3: Cleanup rate limiter and services
      serverLogger.info('📛 Cleaning up services...');

      try {
        if (this.rateLimiter && typeof this.rateLimiter.destroy === 'function') {
          this.rateLimiter.destroy();
          serverLogger.info('   ✓ Rate limiter cleanup interval cleared');
        }

        serverLogger.info('✅ Services cleaned up');
      } catch (error) {
        serverLogger.error('Error cleaning up services:', error);
      }

      // Step 4: Close database connections (with 2s timeout for each)
      serverLogger.info('📛 Closing database connections...');

      try {
        // Close SQLite with timeout
        try {
          const { closeDatabase } = await import('../src/lib/database.js');
          await this.withTimeout(() => closeDatabase(), 1000, 'SQLite close');
          serverLogger.info('   ✓ SQLite closed');
        } catch (error) {
          serverLogger.warn('   ⚠ SQLite close timeout or error, continuing...', error.message);
        }

        // Close LanceDB with timeout
        try {
          const { closeDB } = await import('../src/lib/vectordb.js');
          await this.withTimeout(() => closeDB(), 1000, 'LanceDB close');
          serverLogger.info('   ✓ LanceDB closed');
        } catch (error) {
          serverLogger.warn('   ⚠ LanceDB close timeout or error, continuing...', error.message);
        }

        serverLogger.info('✅ Database shutdown complete');
      } catch (error) {
        serverLogger.error('Error during database shutdown:', error);
      }

      clearTimeout(forceExitTimer);
      serverLogger.info('✅ Graceful shutdown completed successfully\n');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimer);
      securityLogger.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Register shutdown handlers for all relevant signals
   */
  registerHandlers() {
    // Handle termination signals
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      securityLogger.error('❌ Uncaught Exception:', error);
      this.shutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      securityLogger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown('UNHANDLED_REJECTION');
    });

    serverLogger.info('✅ Graceful shutdown handlers registered (SIGTERM, SIGINT, uncaughtException, unhandledRejection)');
  }
}

module.exports = { ShutdownHandler };
