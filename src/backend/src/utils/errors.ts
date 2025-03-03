import { logger } from '../utils/logger';

/**
 * Base error class for application-specific errors with additional properties
 */
export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public isOperational: boolean;
  public details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // By default, AppErrors are operational errors
    this.details = details;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error class for input validation failures
 */
export class ValidationError extends AppError {
  public validationErrors: Record<string, any>;

  constructor(message: string, validationErrors: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', validationErrors);
    this.validationErrors = validationErrors;
  }
}

/**
 * Error class for authentication failures (invalid credentials, token issues)
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

/**
 * Error class for authorization failures (insufficient permissions)
 */
export class AuthorizationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Error class for resource not found situations
 */
export class NotFoundError extends AppError {
  constructor(message: string, resourceType?: string, resourceId?: string) {
    super(message, 404, 'NOT_FOUND', { resourceType, resourceId });
  }
}

/**
 * Error class for resource conflicts (duplicate entries, concurrent updates)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Error class for rate limiting situations
 */
export class RateLimitError extends AppError {
  public retryAfter: number;

  constructor(message: string, retryAfter: number, details?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
    this.retryAfter = retryAfter;
  }
}

/**
 * Error class for failures in external service integrations
 */
export class ExternalServiceError extends AppError {
  public service: string;

  constructor(message: string, service: string, details?: Record<string, any>) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
    this.service = service;
  }
}

/**
 * Error class for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    // Sanitize details to avoid exposing sensitive information
    const sanitizedDetails = details ? { ...details } : {};
    // Remove potentially sensitive information from database error details
    if (sanitizedDetails.sql) delete sanitizedDetails.sql;
    if (sanitizedDetails.parameters) delete sanitizedDetails.parameters;
    
    super(message, 500, 'DATABASE_ERROR', sanitizedDetails);
  }
}

/**
 * Formats error objects into standardized API response structure
 * @param error The error object to format
 * @param includeStack Whether to include stack trace in the response (defaults to false)
 * @returns Standardized error response object
 */
export function formatErrorResponse(error: Error, includeStack: boolean = false): Record<string, any> {
  const response: Record<string, any> = {
    success: false,
    error: {}
  };

  if (error instanceof AppError) {
    response.error = {
      status: error.statusCode,
      code: error.errorCode,
      message: error.message
    };
    
    if (error.details) {
      response.error.details = error.details;
    }
    
    // Add validation errors if available
    if (error instanceof ValidationError && error.validationErrors) {
      response.error.validationErrors = error.validationErrors;
    }
    
    // Add retry-after information for rate limit errors
    if (error instanceof RateLimitError) {
      response.error.retryAfter = error.retryAfter;
    }
  } else {
    // Handle standard errors
    response.error = {
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred'
    };
  }
  
  // Include stack trace in development mode if requested
  if (includeStack && process.env.NODE_ENV !== 'production') {
    response.error.stack = error.stack;
  }
  
  // Log error
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      ...response.error
    }
  });
  
  return response;
}

/**
 * Higher-order function to wrap async controller functions for consistent error handling
 * @param fn Async function to wrap
 * @returns Express request handler with built-in error handling
 */
export function handleAsyncError(fn: Function) {
  return async (req: any, res: any, next: any) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Determines if an error is operational (expected/handled) vs programmer error
 * @param error The error to check
 * @returns True if error is operational, false otherwise
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}