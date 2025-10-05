/**
 * Logger Utility
 * Centralized logging service with environment-aware output
 * Replaces scattered console.log statements across the codebase
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerConfig {
  level: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor(config?: Partial<LoggerConfig>) {
    this.isDevelopment = process.env.NODE_ENV === 'development';

    this.config = {
      level: this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
      enableTimestamps: true,
      enableColors: true,
      ...config
    };
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Debug level logging - development only
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, args, console.debug);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.INFO) {
      this.log('INFO', message, args, console.info);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.WARN) {
      this.log('WARN', message, args, console.warn);
    }
  }

  /**
   * Error level logging - always shown unless NONE
   */
  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      const errorInfo = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;

      this.log('ERROR', message, [errorInfo, ...args], console.error);
    }
  }

  /**
   * Log performance metrics
   */
  perf(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    if (this.config.level <= LogLevel.DEBUG) {
      this.info(`⚡ Performance: ${operation} took ${duration.toFixed(2)}ms`, metadata);
    }
  }

  /**
   * Log data operations (database, file, etc.)
   */
  data(operation: string, details?: Record<string, unknown>): void {
    if (this.config.level <= LogLevel.DEBUG) {
      this.info(`💾 Data: ${operation}`, details);
    }
  }

  /**
   * Log PDF processing
   */
  pdf(message: string, details?: Record<string, unknown>): void {
    if (this.config.level <= LogLevel.DEBUG) {
      this.info(`📄 PDF: ${message}`, details);
    }
  }

  /**
   * Log analysis workflow
   */
  analysis(message: string, details?: Record<string, unknown>): void {
    if (this.config.level <= LogLevel.INFO) {
      this.info(`📊 Analysis: ${message}`, details);
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: string,
    message: string,
    args: unknown[],
    logFn: (...args: unknown[]) => void
  ): void {
    const timestamp = this.config.enableTimestamps
      ? `[${new Date().toISOString()}]`
      : '';

    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    const levelTag = `[${level}]`;

    const fullMessage = [timestamp, prefix, levelTag, message]
      .filter(Boolean)
      .join(' ');

    if (args.length > 0) {
      logFn(fullMessage, ...args);
    } else {
      logFn(fullMessage);
    }
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix
        ? `${this.config.prefix}:${prefix}`
        : prefix
    });
  }

  /**
   * Group related logs
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances
export { Logger };

// Convenience exports for common operations
export const logDebug = (message: string, ...args: unknown[]) => logger.debug(message, ...args);
export const logInfo = (message: string, ...args: unknown[]) => logger.info(message, ...args);
export const logWarn = (message: string, ...args: unknown[]) => logger.warn(message, ...args);
export const logError = (message: string, error?: Error | unknown, ...args: unknown[]) =>
  logger.error(message, error, ...args);
export const logPerf = (operation: string, duration: number, metadata?: Record<string, unknown>) =>
  logger.perf(operation, duration, metadata);
export const logData = (operation: string, details?: Record<string, unknown>) =>
  logger.data(operation, details);
export const logPdf = (message: string, details?: Record<string, unknown>) =>
  logger.pdf(message, details);
export const logAnalysis = (message: string, details?: Record<string, unknown>) =>
  logger.analysis(message, details);
