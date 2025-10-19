/**
 * Server-side production-ready logging utility
 * Node.js compatible version
 */

const isDev = process.env.NODE_ENV !== 'production';

class Logger {
  constructor(prefix = '') {
    this.prefix = prefix;
    this.enabledInProduction = true; // Server logs should always be enabled
  }

  formatMessage(message) {
    const timestamp = new Date().toISOString();
    const prefixStr = this.prefix ? `[${this.prefix}]` : '';
    return `${prefixStr}[${timestamp}] ${message}`;
  }

  debug(message, data) {
    if (isDev) {
      if (data !== undefined) {
        console.log(this.formatMessage(message), data);
      } else {
        console.log(this.formatMessage(message));
      }
    }
  }

  info(message, data) {
    if (data !== undefined) {
      console.info(this.formatMessage(message), data);
    } else {
      console.info(this.formatMessage(message));
    }
  }

  warn(message, data) {
    if (data !== undefined) {
      console.warn(this.formatMessage(message), data);
    } else {
      console.warn(this.formatMessage(message));
    }
  }

  error(message, error) {
    const formattedMessage = this.formatMessage(message);
    if (error instanceof Error) {
      console.error(formattedMessage, error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    } else if (error !== undefined) {
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }
  }

  group(label, callback) {
    console.group(label);
    callback();
    console.groupEnd();
  }
}

// Export singleton instances for different parts of the server
const logger = new Logger();
const serverLogger = new Logger('Server');
const wsLogger = new Logger('WebSocket');
const geminiLogger = new Logger('Gemini');
const rateLimitLogger = new Logger('RateLimit');
const securityLogger = new Logger('Security');

module.exports = {
  logger,
  serverLogger,
  wsLogger,
  geminiLogger,
  rateLimitLogger,
  securityLogger,
  Logger
};
