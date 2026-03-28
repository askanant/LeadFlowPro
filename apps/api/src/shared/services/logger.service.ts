import { randomUUID } from 'crypto';
import { config } from '../../config';
import * as Sentry from '@sentry/node';

// Initialize Sentry if configured
if (config.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  });
}

export interface ErrorLog {
  id: string; // Unique request ID
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  code: string; // Error code (VALIDATION_ERROR, UNAUTHORIZED, etc)
  message: string;
  statusCode: number;
  userId?: string;
  tenantId?: string;
  path: string;
  method: string;
  ip: string;
  userAgent?: string;
  body?: Record<string, unknown>; // Redacted
  stack?: string; // Only in development/error level
  duration?: number; // Request duration in ms
}

export class LoggerService {
  /**
   * Log an error with context
   * Automatically redacts sensitive fields
   * Logs to console in development, database in production
   */
  static log(context: Partial<ErrorLog>): void {
    const log: ErrorLog = {
      id: context.id || randomUUID(),
      timestamp: new Date().toISOString(),
      level: context.level || 'info',
      code: context.code || 'UNKNOWN',
      message: context.message || '',
      statusCode: context.statusCode || 200,
      path: context.path || '',
      method: context.method || 'GET',
      ip: context.ip || '',
      ...context,
    };

    // Redact sensitive fields from body
    if (log.body) {
      log.body = this.redactSensitiveData(log.body);
    }

    // Console output based on environment
    if (config.NODE_ENV === 'development') {
      const logFn =
        log.level === 'error' || log.level === 'fatal' ? console.error : console.log;
      logFn(
        `[${log.id}] ${log.level.toUpperCase()}: ${log.code} - ${log.message}`,
        {
          statusCode: log.statusCode,
          userId: log.userId,
          tenantId: log.tenantId,
          path: log.path,
          method: log.method,
          duration: log.duration,
          ...(log.stack && { stack: log.stack }),
        }
      );
    }

    // Store critical errors in production (implement with your logging service)
    if (config.NODE_ENV === 'production' && (log.level === 'error' || log.level === 'fatal')) {
      // Send to Sentry if configured
      if (process.env.SENTRY_DSN) {
        try {
          const severity = log.level === 'fatal' ? 'fatal' : 'error';
          Sentry.captureException(new Error(log.message), {
            level: severity as any,
            tags: {
              code: log.code,
              requestId: log.id,
              userId: log.userId,
              tenantId: log.tenantId,
            },
            contexts: {
              request: {
                url: log.path,
                method: log.method,
                ip: log.ip,
              },
              performance: {
                duration: log.duration,
              },
            },
            extra: {
              statusCode: log.statusCode,
              userAgent: log.userAgent,
            },
          });
        } catch (sentryError) {
          // Sentry error - fail silently to avoid cascading failures
          console.error('[Logger] Failed to send error to Sentry:', sentryError);
        }
      }
    }
  }

  /**
   * Log an error with error level
   */
  static error(context: Partial<ErrorLog>): void {
    this.log({ ...context, level: 'error' });
  }

  /**
   * Log a warning
   */
  static warn(context: Partial<ErrorLog>): void {
    this.log({ ...context, level: 'warn' });
  }

  /**
   * Log info message
   */
  static info(context: Partial<ErrorLog>): void {
    this.log({ ...context, level: 'info' });
  }

  /**
   * Log debug message (only in development)
   */
  static debug(context: Partial<ErrorLog>): void {
    if (config.NODE_ENV === 'development') {
      this.log({ ...context, level: 'debug' });
    }
  }

  /**
   * Redact sensitive fields from an object
   */
  private static redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'apiSecret',
      'apiToken',
      'creditCard',
      'cardNumber',
      'cvv',
      'ssn',
      'stripeKey',
      'stripeSecret',
      'slackToken',
      'metaToken',
      'facebookToken',
      'googleKey',
      'linkedinToken',
      'microsoftToken',
    ];

    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        redacted[key] = this.redactSensitiveData(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        redacted[key] = value.map((item) =>
          typeof item === 'object' && item !== null && !Array.isArray(item)
            ? this.redactSensitiveData(item)
            : item
        );
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }
}
