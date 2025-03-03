import { errorMiddleware, catchAsync, handleNotFound } from './error';
import { requestLoggingMiddleware, generateCorrelationId } from './logging';
import { validateBody, validateQuery, validateParams, validateRequestSchema } from './validation';
import createRateLimiter, { getRequestIdentifier } from './rateLimit';
import { authenticate, requireRole, requirePermission, optionalAuth } from './auth';

/**
 * Centralized export of all middleware functions used by the Engagerr backend API.
 * This index file aggregates authentication, validation, error handling, rate limiting, and logging middleware into a single import location.
 */

// Export error handling middleware
export { errorMiddleware, catchAsync, handleNotFound };

// Export request logging middleware
export { requestLoggingMiddleware, generateCorrelationId };

// Export request validation middleware
export { validateBody, validateQuery, validateParams, validateRequestSchema };

// Export rate limiting middleware and utility
export const rateLimiter = createRateLimiter(); // Create a default rate limiter instance
export { getRequestIdentifier };

// Export authentication and authorization middleware
export { authenticate, requireRole, requirePermission, optionalAuth };