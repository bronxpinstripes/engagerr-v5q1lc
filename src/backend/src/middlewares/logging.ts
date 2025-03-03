/**
 * Middleware for HTTP request and response logging with correlation IDs
 * Provides structured JSON logging, request tracking, and sensitive data redaction
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import onFinished from 'on-finished'; // ^2.4.1
import { logger, redactSensitiveInfo } from '../utils/logger';

// Paths that should be excluded from logging to reduce noise
const EXCLUDED_PATHS = ['/api/healthcheck', '/api/metrics'];

/**
 * Generates a unique correlation ID for request tracking
 * @returns UUID v4 string
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Determines if a request should be excluded from logging based on path
 * @param req Express request object
 * @returns Boolean indicating whether logging should be skipped
 */
function shouldSkipLogging(req: Request): boolean {
  return EXCLUDED_PATHS.some(path => req.path.startsWith(path));
}

/**
 * Creates a sanitized version of the request path for logging
 * Removes potential sensitive data from URL parameters
 * @param path Request path
 * @returns Sanitized path
 */
function getLoggablePath(path: string): string {
  // Replace potential ID parameters with placeholders to avoid logging sensitive IDs
  return path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Creates a sanitized version of the request body for logging
 * Removes sensitive information like passwords and tokens
 * @param body Request body
 * @returns Sanitized body
 */
function getLoggableBody(body: any): any {
  if (!body) return {};
  
  // Use the redaction utility from logger
  const sanitized = redactSensitiveInfo(body);
  
  // Limit the size of logged body to prevent excessively large logs
  const stringified = JSON.stringify(sanitized);
  if (stringified.length > 1024) {
    return {
      ...sanitized,
      _note: 'Body truncated due to size',
      _size: stringified.length
    };
  }
  
  return sanitized;
}

/**
 * Calculates request duration in milliseconds
 * @param startTime Process.hrtime() start time
 * @returns Duration in milliseconds
 */
function getRequestDuration(startTime: [number, number]): number {
  const diff = process.hrtime(startTime);
  return (diff[0] * 1e3) + (diff[1] * 1e-6);
}

/**
 * Express middleware for HTTP request and response logging
 * Adds correlation IDs and logs structured data about each request/response
 */
export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging for excluded paths
    if (shouldSkipLogging(req)) {
      return next();
    }

    // Generate and store correlation ID
    const correlationId = generateCorrelationId();
    const startTime = process.hrtime();
    
    // Attach correlation ID to request object for use in other middlewares
    req['correlationId'] = correlationId;
    
    // Create a child logger with the correlation ID context
    const requestLogger = logger.child({
      correlationId,
      requestId: req.headers['x-request-id'] || correlationId
    });
    
    // Log the incoming request
    requestLogger.info({
      type: 'request',
      method: req.method,
      path: getLoggablePath(req.path),
      query: redactSensitiveInfo(req.query),
      body: getLoggableBody(req.body),
      contentType: req.get('content-type'),
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket.remoteAddress,
      userId: req.user?.id, // Assuming req.user is set by auth middleware
      userType: req.user?.userType // Creator or Brand
    });
    
    // Capture original response methods
    const originalEnd = res.end;
    const originalWrite = res.write;
    
    // Track response body size
    let responseSize = 0;
    
    // Patch res.write to track response size
    res.write = function(chunk: any, ...args: any[]): boolean {
      if (chunk) {
        responseSize += chunk.length;
      }
      return originalWrite.apply(res, [chunk, ...args]);
    };
    
    // Patch res.end to ensure we track the final chunk
    res.end = function(chunk: any, ...args: any[]): any {
      if (chunk) {
        responseSize += chunk.length;
      }
      return originalEnd.apply(res, [chunk, ...args]);
    };
    
    // Set up response finish handler
    onFinished(res, (err, res) => {
      // Calculate request duration
      const durationMs = getRequestDuration(startTime);
      
      // Get HTTP status code from response
      const statusCode = res.statusCode;
      
      // Log the response with appropriate level based on status code
      const responseLog = {
        type: 'response',
        correlationId,
        method: req.method,
        path: getLoggablePath(req.path),
        statusCode,
        durationMs: Math.round(durationMs),
        responseSize,
        contentType: res.getHeader('content-type'),
      };
      
      // Choose log level based on status code
      if (statusCode >= 500) {
        requestLogger.error(responseLog);
      } else if (statusCode >= 400) {
        requestLogger.warn(responseLog);
      } else {
        requestLogger.info(responseLog);
      }
      
      // Log detailed timing information for slow requests
      if (durationMs > 1000) {
        requestLogger.warn({
          type: 'slowRequest',
          correlationId,
          method: req.method,
          path: getLoggablePath(req.path),
          durationMs: Math.round(durationMs)
        });
      }
    });
    
    // Continue to the next middleware
    next();
  };
}