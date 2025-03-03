import express from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1
import { RateLimitError } from '../utils/errors';
import { logger } from '../utils/logger';
import { API_RATE_LIMITS } from '../config/constants';

// Store rate limiters in memory with a map of route type to limiter instance
const limiters = new Map<string, RateLimiterMemory>();

/**
 * Extracts a unique identifier from the request for rate limiting purposes
 * @param req Express request object
 * @returns A unique identifier string based on user ID, IP, or combination
 */
export function getRequestIdentifier(req: express.Request): string {
  // If authenticated, use user ID as the primary identifier
  if (req.user && (req.user as any).id) {
    return `user:${(req.user as any).id}`;
  }
  
  // Otherwise, use IP address
  // Try to get IP from X-Forwarded-For header first (for requests behind proxies)
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
              req.ip || 
              req.socket.remoteAddress || 
              'unknown';
  
  return `ip:${ip}`;
}

/**
 * Factory function that creates rate limiting middleware with configurable options
 * @param routeType Type of route to apply rate limiting to (e.g., 'AUTH', 'CONTENT')
 * @param options Optional configuration to override defaults
 * @returns Express middleware function for rate limiting
 */
function createRateLimiter(
  routeType: string = 'DEFAULT',
  options: Partial<typeof API_RATE_LIMITS.DEFAULT> = {}
): express.RequestHandler {
  // Get rate limit configuration for the specified route type or fall back to default
  const rateConfig = API_RATE_LIMITS[routeType as keyof typeof API_RATE_LIMITS] || API_RATE_LIMITS.DEFAULT;
  
  // Merge with custom options
  const config = {
    ...rateConfig,
    ...options
  };
  
  // Create or retrieve the rate limiter for this route type
  if (!limiters.has(routeType)) {
    limiters.set(routeType, new RateLimiterMemory({
      points: config.max,
      duration: config.windowMs / 1000, // convert ms to seconds
    }));
  }
  
  const rateLimiter = limiters.get(routeType)!;
  
  // Return middleware function
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Get request identifier (user ID or IP address)
    const identifier = getRequestIdentifier(req);
    
    try {
      // Consume points from the rate limiter
      const rateLimiterRes = await rateLimiter.consume(identifier);
      
      // Add rate limit headers if configured
      if (config.standardHeaders) {
        res.setHeader('RateLimit-Limit', config.max);
        res.setHeader('RateLimit-Remaining', rateLimiterRes.remainingPoints);
        res.setHeader('RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).getTime() / 1000);
      }
      
      // Add legacy headers if configured
      if (config.legacyHeaders) {
        res.setHeader('X-RateLimit-Limit', config.max);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).getTime() / 1000);
      }
      
      next();
    } catch (error: any) {
      // If rate limit exceeded
      if (error.remainingPoints !== undefined) {
        // Calculate retry after time in seconds
        const retryAfterSeconds = Math.ceil(error.msBeforeNext / 1000) || 60;
        
        // Add retry-after header
        res.setHeader('Retry-After', retryAfterSeconds);
        
        // Log the rate limit violation
        logger.warn({
          message: `Rate limit exceeded for ${identifier}`,
          routeType,
          path: req.path,
          method: req.method,
          retryAfter: retryAfterSeconds
        });
        
        // Throw rate limit error
        next(new RateLimitError(
          `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
          retryAfterSeconds,
          { routeType, path: req.path, method: req.method }
        ));
      } else {
        // For unexpected errors
        next(error);
      }
    }
  };
}

// Export the rate limiter factory function and the request identifier utility
export { getRequestIdentifier };
export default createRateLimiter;