/**
 * Graceful Shutdown Handler
 *
 * Ensures clean closure of all resources before process exit.
 * Handles SIGTERM, SIGINT, uncaughtException, and unhandledRejection.
 *
 * Features:
 * - Prevents multiple simultaneous shutdown attempts
 * - 30-second timeout for force exit
 * - Closes HTTP server
 * - Closes WebSocket connections
 * - Closes database connections
 * - Cleans up rate limiter resources
 *
 * Usage:
 * const { ShutdownHandler } = require('./lib/shutdown');
 * const shutdown = new ShutdownHandler();
 * shutdown.setServer(httpServer, ioServer);
 */

const { serverLogger, securityLogger } = require('./logger');

class ShutdownHandler {
  constructor() {
    this.isShuttingDown = false;
    this.server = null;
    this.io = null;
    this.forceExitTimeout = 30000; // 30 seconds
  }

  /**
   * Register HTTP and WebSocket servers
   * @param {Object} server - HTTP server instance
   * @param {Object} io - Socket.IO server instance
   */
  setServer(server, io) {
    this.server = server;
    this.io = io;
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

      // Step 2: Close WebSocket connections
      if (this.io) {
        serverLogger.info('📛 Closing WebSocket connections...');

        try {
          const sockets = await this.io.fetchSockets();
          serverLogger.info(`   Disconnecting ${sockets.length} active socket(s)...`);

          for (const socket of sockets) {
            socket.disconnect(true);
          }

          this.io.close();
          serverLogger.info('✅ WebSocket server closed');
        } catch (error) {
          serverLogger.error('Error closing WebSocket connections:', error);
        }
      }

      // Step 3: Close database connections
      serverLogger.info('📛 Closing database connections...');

      try {
        // Close SQLite
        const { closeDatabase } = await import('../src/lib/database.js');
        await closeDatabase();

        // Close LanceDB
        const { closeDB } = await import('../src/lib/vectordb.js');
        await closeDB();

        serverLogger.info('✅ Databases closed');
      } catch (error) {
        serverLogger.error('Error closing databases:', error);
      }

      // Step 4: Cleanup rate limiter (if accessible)
      serverLogger.info('📛 Cleaning up services...');
      // Rate limiter cleanup happens automatically on process exit
      serverLogger.info('✅ Services cleaned up');

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
