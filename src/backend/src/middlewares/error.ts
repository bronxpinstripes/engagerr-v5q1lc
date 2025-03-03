import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node'; // v7.57.0
import { logger } from '../utils/logger';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  AuthenticationError, 
  AuthorizationError, 
  formatErrorResponse, 
  isOperationalError 
} from '../utils/errors';
import { APP_CONFIG } from '../config/constants';
import { ApiTypes } from '../types';

/**
 * Centralized error handling middleware for Express
 * Processes all errors and sends standardized responses to clients
 */
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error with appropriate context and severity
  logError(err, req);

  // Default error status and message
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: Record<string, any> = {};
  let validationErrors: Record<string, any> | undefined;
  
  // Handle specific error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details || {};
    
    // Extract validation errors if present
    if (err instanceof ValidationError) {
      validationErrors = err.validationErrors;
    }
  } else if (err.name === 'SyntaxError') {
    // Handle JSON parse errors
    statusCode = 400;
    errorCode = 'BAD_REQUEST';
    message = 'Invalid request format';
  } else if (err.name === 'UnauthorizedError') {
    // Handle JWT verification errors
    statusCode = 401;
    errorCode = 'AUTHENTICATION_ERROR';
    message = 'Authentication required';
  } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
    // Handle 404 errors
    statusCode = 404;
    errorCode = 'RESOURCE_NOT_FOUND';
    message = err.message;
  }

  // Create the error response object
  const errorResponse: ApiTypes.ApiErrorResponse = {
    code: errorCode as ApiTypes.ApiErrorCode,
    message: message,
    path: req.path,
    timestamp: new Date().toISOString(),
    details: details
  };

  // Add validation errors if present
  if (validationErrors) {
    errorResponse.validationErrors = {
      errors: Object.entries(validationErrors).map(([field, message]) => ({
        field,
        message: message as string,
        code: 'invalid_field'
      }))
    };
  }

  // Include stack trace in non-production environments
  if (!APP_CONFIG.IS_PRODUCTION) {
    errorResponse.details = {
      ...errorResponse.details,
      stack: err.stack
    };
  }

  // Send error to Sentry in production for non-operational errors
  if ((APP_CONFIG.IS_PRODUCTION || APP_CONFIG.IS_STAGING) && !isOperationalError(err)) {
    Sentry.withScope((scope) => {
      scope.setExtra('path', req.path);
      scope.setExtra('method', req.method);
      scope.setExtra('correlationId', req.headers['x-correlation-id'] || 'none');
      scope.setExtra('errorCode', errorCode);
      
      if (req.user) {
        scope.setUser({
          id: (req.user as any).id,
          email: (req.user as any).email
        });
      }
      
      Sentry.captureException(err);
    });
  }

  // Add specific headers for certain error types
  if (err.name === 'RateLimitError' && (err as any).retryAfter) {
    res.set('Retry-After', (err as any).retryAfter.toString());
  }

  // Send the error response
  res.status(statusCode).json({ error: errorResponse });
};

/**
 * Wraps async route handlers to automatically catch errors and forward them to the error middleware
 * This eliminates the need for try/catch blocks in every controller
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware for handling requests to non-existent routes
 * Creates a consistent 404 NotFoundError for all unmatched routes
 */
export const handleNotFound = (req: Request, _res: Response, next: NextFunction): void => {
  const notFoundError = new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`);
  next(notFoundError);
};

/**
 * Internal utility to log errors with appropriate severity and context
 */
function logError(err: Error, req: Request): void {
  // Extract request context for log enrichment
  const requestContext = {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    correlationId: req.headers['x-correlation-id'] || 'none',
    userId: (req.user as any)?.id || 'anonymous'
  };

  // Determine log level based on error type and status code
  let errorLevel = 'error';
  
  if (err instanceof AppError) {
    // Use warning level for client errors (4xx) except for 404s
    if (err.statusCode >= 400 && err.statusCode < 500 && !(err instanceof NotFoundError)) {
      errorLevel = 'warn';
    }
    
    // Use error level for server errors (5xx) and authentication/authorization errors
    if (err.statusCode >= 500 || err instanceof AuthenticationError || err instanceof AuthorizationError) {
      errorLevel = 'error';
    }
  }

  // Create structured log data
  const logData = {
    ...requestContext,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
      code: err instanceof AppError ? err.errorCode : 'UNKNOWN_ERROR',
      isOperational: isOperationalError(err)
    }
  };

  // Log with appropriate level
  if (errorLevel === 'warn') {
    logger.warn(logData);
  } else {
    logger.error(logData);
  }
}