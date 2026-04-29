/**
 * Structured logger utility with severity levels.
 * Provides consistent log formatting across the application.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m',  // Cyan
  [LogLevel.INFO]: '\x1b[32m',   // Green
  [LogLevel.WARN]: '\x1b[33m',   // Yellow
  [LogLevel.ERROR]: '\x1b[31m',  // Red
};

const LOG_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

const RESET = '\x1b[0m';

class Logger {
  private level: LogLevel;
  private context: string;

  constructor(context: string = 'App', level?: LogLevel) {
    this.context = context;
    this.level = level ?? (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (level < this.level) return;
    const timestamp = new Date().toISOString();
    const color = LOG_COLORS[level];
    const label = LOG_LABELS[level];
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`${color}[${timestamp}] [${label}] [${this.context}]${RESET} ${message}${metaStr}`);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.level);
  }
}

export const logger = new Logger('AIAppGen');
export { Logger };
