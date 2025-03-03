/**
 * Authentication middleware for Express API routes
 * Verifies JWT tokens and integrates with Supabase Auth
 * Implements role-based and permission-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { User, UserType, UserRole } from '../types/user';
import { verifyToken, decodeToken } from '../utils/tokens';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { supabaseClient } from '../config/supabase';
import { AUTH_CONSTANTS } from '../config/constants';
import { hasPermission } from '../security/permissions';
import { logger } from '../utils/logger';

// Define custom interface for request with user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userType: UserType;
        role: UserRole;
        email: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * Express middleware that authenticates requests by verifying JWT tokens
 * Checks for token in Authorization header, cookies, or query params
 * Adds the authenticated user to the request object for downstream handlers
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract token from request (header, cookie, or query parameter)
    const token = extractTokenFromRequest(req);
    
    // If no token is provided, return authentication error
    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }
    
    // Verify token signature and expiration
    const decoded = verifyToken(token);
    
    // If token is invalid or expired, return authentication error
    if (!decoded) {
      throw new AuthenticationError('Invalid authentication token');
    }
    
    // Validate that the user session is still active in Supabase
    const isValidSession = await validateSupabaseSession(decoded.userId, token);
    
    if (!isValidSession) {
      throw new AuthenticationError('Session has expired or been revoked');
    }
    
    // Add user object to request for use in subsequent middleware and routes
    req.user = {
      id: decoded.userId,
      userType: decoded.userType,
      role: decoded.role,
      email: decoded.email,
      // Add additional user properties as needed
    };
    
    // Log successful authentication
    logger.debug({
      userId: decoded.userId,
      userType: decoded.userType,
      path: req.path,
      method: req.method
    }, 'User authenticated successfully');
    
    // Proceed to next middleware
    next();
  } catch (error) {
    // Pass authentication errors to error handler middleware
    next(error);
  }
}

/**
 * Middleware factory that creates a middleware to check if authenticated user
 * has one of the required roles
 * 
 * @param allowedRoles Array of user types or roles that are allowed access
 * @returns Express middleware that verifies user role
 */
export function requireRole(allowedRoles: UserType[] | UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }
      
      // Check if user's role is included in the allowed roles
      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        throw new AuthorizationError('Insufficient permissions', {
          userRole,
          allowedRoles,
          path: req.path,
          method: req.method
        });
      }
      
      // Log successful role check
      logger.debug({
        userId: req.user.id,
        userRole,
        allowedRoles,
        path: req.path,
        method: req.method
      }, 'Role check passed');
      
      // Proceed to next middleware
      next();
    } catch (error) {
      // Pass authorization errors to error handler middleware
      next(error);
    }
  };
}

/**
 * Middleware factory that creates a middleware to check if user has specific
 * permission for a resource
 * 
 * @param action Action being performed (e.g., 'create', 'read', 'update', 'delete')
 * @param resourceType Type of resource being accessed (e.g., 'content', 'analytics')
 * @returns Express middleware that verifies user permission for resource
 */
export function requirePermission(action: string, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }
      
      // Extract resource ID from request params if available
      const resourceId = req.params.id;
      
      // Check if user has permission for the specified action and resource
      const hasPermissionResult = await hasPermission(
        req.user,
        action,
        resourceType,
        resourceId
      );
      
      if (!hasPermissionResult) {
        throw new AuthorizationError(`No permission to ${action} ${resourceType}`, {
          userId: req.user.id,
          role: req.user.role,
          action,
          resourceType,
          resourceId,
          path: req.path,
          method: req.method
        });
      }
      
      // Log successful permission check
      logger.debug({
        userId: req.user.id,
        role: req.user.role,
        action,
        resourceType,
        resourceId,
        path: req.path,
        method: req.method
      }, 'Permission check passed');
      
      // Proceed to next middleware
      next();
    } catch (error) {
      // Pass authorization errors to error handler middleware
      next(error);
    }
  };
}

/**
 * Express middleware that authenticates a request if token is present
 * but doesn't require authentication
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract token from request (header, cookie, or query parameter)
    const token = extractTokenFromRequest(req);
    
    // If no token is provided, continue without authentication
    if (!token) {
      return next();
    }
    
    // Verify token signature and expiration
    const decoded = verifyToken(token);
    
    // If token is invalid or expired, continue without authentication but log warning
    if (!decoded) {
      logger.warn({
        token: 'invalid_or_expired',
        path: req.path,
        method: req.method
      }, 'Invalid token in optional auth');
      
      return next();
    }
    
    // Validate that the user session is still active in Supabase
    const isValidSession = await validateSupabaseSession(decoded.userId, token);
    
    if (!isValidSession) {
      logger.warn({
        userId: decoded.userId,
        path: req.path,
        method: req.method
      }, 'Session expired in optional auth');
      
      return next();
    }
    
    // Add user object to request for use in subsequent middleware and routes
    req.user = {
      id: decoded.userId,
      userType: decoded.userType,
      role: decoded.role,
      email: decoded.email,
      // Add additional user properties as needed
    };
    
    // Proceed to next middleware
    next();
  } catch (error) {
    // Log error but continue without blocking the request
    logger.warn({
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method
    }, 'Error in optional authentication');
    
    // Continue without authentication in case of error
    next();
  }
}

/**
 * Helper function to extract JWT token from various locations in the request
 * Checks Authorization header, cookies, and query parameters
 * 
 * @param req Express request object
 * @returns Extracted token or null if not found
 */
function extractTokenFromRequest(req: Request): string | null {
  // Try to extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  // Try to extract token from cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Try to extract token from query parameters
  if (req.query && req.query.token) {
    return req.query.token as string;
  }
  
  // No token found
  return null;
}

/**
 * Validates that a user session is active in Supabase Auth
 * 
 * @param userId User ID from the JWT token
 * @param token JWT token to validate
 * @returns True if session is valid, false otherwise
 */
async function validateSupabaseSession(userId: string, token: string): Promise<boolean> {
  try {
    // Use Supabase Auth to get session information
    const { data, error } = await supabaseClient.auth.getUser(token);
    
    // If there's an error or no data, session is invalid
    if (error || !data) {
      logger.warn({
        userId,
        error: error ? error.message : 'No session data'
      }, 'Failed to validate Supabase session');
      
      return false;
    }
    
    // Verify that the session belongs to the correct user
    if (data.user.id !== userId) {
      logger.warn({
        sessionUserId: data.user.id,
        tokenUserId: userId
      }, 'User ID mismatch in session validation');
      
      return false;
    }
    
    // Session is valid
    return true;
  } catch (error) {
    logger.error({
      userId,
      error: error instanceof Error ? error.message : String(error)
    }, 'Error validating Supabase session');
    
    return false;
  }
}