/**
 * Structured logging utility for Engagerr
 * Provides consistent log formatting, level-based filtering, and integration with monitoring systems
 */

import pino from 'pino'; // v8.14.1
import pinoPretty from 'pino-pretty'; // v10.0.0
import * as Sentry from '@sentry/node'; // v7.57.0
import { NODE_ENV } from '../config/constants';

// Define log levels
enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
  SILENT = 'silent'
}

// Default log level based on environment
const DEFAULT_LOG_LEVELS = {
  development: LogLevel.DEBUG,
  test: LogLevel.ERROR,
  staging: LogLevel.INFO,
  production: LogLevel.INFO
};

// Get current log level from environment or constants
const LOG_LEVEL = process.env.LOG_LEVEL || DEFAULT_LOG_LEVELS[NODE_ENV] || LogLevel.INFO;

// Sensitive fields that should be redacted in logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'accessToken',
  'refreshToken',
  'auth',
  'credential',
  'apiKey',
  'jwt',
  'email',
  'phone',
  'ssn',
  'creditCard',
  'cvv'
];

/**
 * Create and configure a logger instance
 * @returns Configured Pino logger instance
 */
function createLogger() {
  const isProduction = NODE_ENV === 'production' || NODE_ENV === 'staging';
  
  const loggerOptions: pino.LoggerOptions = {
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      env: NODE_ENV,
      version: process.env.npm_package_version || 'unknown'
    },
    redact: {
      paths: SENSITIVE_FIELDS.map(field => `*.${field}`),
      censor: '[REDACTED]'
    },
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      }
    }
  };
  
  // Use pretty printing for development and test environments
  if (!isProduction) {
    const prettyOptions = {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false
    };
    
    return pino(loggerOptions, pinoPretty(prettyOptions));
  }
  
  // For production, use standard JSON logging
  return pino(loggerOptions);
}

/**
 * Redacts sensitive information from objects before logging
 * @param obj Object to redact sensitive information from
 * @returns Object with sensitive fields redacted
 */
export function redactSensitiveInfo(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  // Clone the object to avoid mutations
  const clonedObj = JSON.parse(JSON.stringify(obj));
  
  // Recursively scan and redact sensitive fields
  const redactObject = (object: any) => {
    if (!object || typeof object !== 'object') {
      return;
    }
    
    for (const key in object) {
      // Check if current key contains any sensitive field name
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitive && typeof object[key] !== 'object') {
        object[key] = '[REDACTED]';
      } else if (typeof object[key] === 'object') {
        // Recursively process nested objects
        redactObject(object[key]);
      }
    }
  };
  
  redactObject(clonedObj);
  return clonedObj;
}

/**
 * Creates a child logger with additional context
 * @param context Additional context to include with all log messages
 * @returns Child logger instance with bound context
 */
export function createChildLogger(context: Record<string, any>) {
  // Ensure sensitive information is redacted
  const safeContext = redactSensitiveInfo(context);
  
  // Add correlation ID if missing but available in current context
  if (!safeContext.correlationId && process.domain?.['correlationId']) {
    safeContext.correlationId = process.domain['correlationId'];
  }
  
  return logger.child(safeContext);
}

// Initialize Sentry for error tracking in production environments
if (NODE_ENV === 'production' || NODE_ENV === 'staging') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true })
    ]
  });
}

// Create the root logger instance
const logger = createLogger();

// Add error tracking integration
const originalErrorLogger = logger.error.bind(logger);
logger.error = (obj: any, ...args: any[]) => {
  // Log the error using Pino
  originalErrorLogger(obj, ...args);
  
  // In production/staging environments, also send to Sentry
  if ((NODE_ENV === 'production' || NODE_ENV === 'staging') && process.env.SENTRY_DSN) {
    // If the first argument is an Error object, capture it directly
    if (obj instanceof Error) {
      Sentry.captureException(obj);
    } 
    // If it's an object with a message, create an error and send it
    else if (typeof obj === 'object' && obj.message) {
      const error = new Error(obj.message);
      error.name = obj.name || 'ApplicationError';
      // Add additional context from the object
      Sentry.withScope(scope => {
        scope.setExtras(redactSensitiveInfo(obj));
        Sentry.captureException(error);
      });
    }
  }
  
  return logger;
};

// Export the configured logger and utilities
export { logger };