/**
 * Production-ready logging utility
 * Wraps console methods to allow conditional logging based on environment
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  enabledInProduction: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

const defaultConfig: LoggerConfig = {
  enabledInProduction: false,
  minLevel: LogLevel.DEBUG,
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  private shouldLog(): boolean {
    if (isDev) return true;
    return this.config.enabledInProduction;
  }

  private formatMessage(message: string, data?: unknown): [string, unknown?] {
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    const timestamp = new Date().toISOString();
    const formattedMessage = `${prefix}[${timestamp}] ${message}`;

    return data !== undefined ? [formattedMessage, data] : [formattedMessage];
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog()) {
      console.log(...this.formatMessage(message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog()) {
      console.info(...this.formatMessage(message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog()) {
      console.warn(...this.formatMessage(message, data));
    }
  }

  error(message: string, error?: Error | unknown): void {
    if (this.shouldLog()) {
      const [formattedMessage] = this.formatMessage(message);
      if (error instanceof Error) {
        console.error(formattedMessage, error.message, error.stack);
      } else {
        console.error(formattedMessage, error);
      }
    }
  }

  /**
   * Group related log statements
   */
  group(label: string, callback: () => void): void {
    if (this.shouldLog()) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }
}

// Export singleton instances for different parts of the app
export const logger = new Logger();
export const chatLogger = new Logger({ prefix: 'Chat' });
export const wsLogger = new Logger({ prefix: 'WebSocket' });
export const fileLogger = new Logger({ prefix: 'FileUpload' });

// For backwards compatibility, export simple logging functions
export const devLog = isDev ? console.log.bind(console) : () => {};
export const devError = isDev ? console.error.bind(console) : () => {};
export const devWarn = isDev ? console.warn.bind(console) : () => {};
