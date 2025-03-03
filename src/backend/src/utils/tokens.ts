/**
 * Utility functions for handling various tokens used throughout the application.
 * Manages JWT tokens for authentication, refresh tokens for extended sessions,
 * and securely handles OAuth tokens for platform integrations.
 */

import jwt from 'jsonwebtoken'; // ^9.0.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import dayjs from 'dayjs'; // ^1.11.7
import { encrypt, decrypt } from '../utils/crypto';
import { CONSTANTS } from '../config/constants';
import { logger } from '../utils/logger';

/**
 * Generates a JWT token with the provided payload and expiration time
 * @param payload - Object containing data to include in the token
 * @param expiresIn - Optional expiration time override (default from constants)
 * @returns Generated JWT token string
 */
export function generateToken(
  payload: Record<string, any>,
  expiresIn?: string
): string {
  // Validate the payload object contains required fields
  if (!payload.userId || !payload.userType) {
    logger.error('Invalid token payload: missing required fields');
    throw new Error('Invalid token payload: userId and userType are required');
  }

  // Set default expiration if not provided
  const tokenExpiry = expiresIn || CONSTANTS.JWT_EXPIRY;
  
  // Generate a unique token ID (jti) using uuid
  const tokenId = uuidv4();
  
  // Add timestamp information (iat, exp) to the payload
  const tokenPayload = {
    ...payload,
    jti: tokenId,
    iat: Math.floor(Date.now() / 1000), // Issued at timestamp
  };
  
  try {
    // Sign the token using jwt.sign with CONSTANTS.JWT_SECRET
    const token = jwt.sign(
      tokenPayload,
      CONSTANTS.JWT_SECRET,
      { expiresIn: tokenExpiry }
    );
    
    // Log token generation (excluding sensitive data)
    logger.info({
      message: 'JWT token generated',
      userId: payload.userId,
      userType: payload.userType,
      tokenId,
      expiresIn: tokenExpiry
    });
    
    // Return the signed token
    return token;
  } catch (error) {
    logger.error({
      message: 'Failed to generate JWT token',
      error: error.message,
      userId: payload.userId
    });
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verifies a JWT token and returns the decoded payload
 * @param token - JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string): Record<string, any> | null {
  // Check if token is provided
  if (!token) {
    logger.warn('Token verification attempted with empty token');
    return null;
  }
  
  try {
    // Try to verify the token using jwt.verify with CONSTANTS.JWT_SECRET
    const decoded = jwt.verify(token, CONSTANTS.JWT_SECRET) as Record<string, any>;
    // Return the decoded payload if successful
    return decoded;
  } catch (error) {
    // Log and return null if verification fails (expired or invalid signature)
    if (error instanceof jwt.TokenExpiredError) {
      logger.info({
        message: 'Token expired',
        error: error.message
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn({
        message: 'Invalid token',
        error: error.message
      });
    } else {
      logger.error({
        message: 'Token verification error',
        error: error.message
      });
    }
    // Catch and handle any unexpected errors during verification
    return null;
  }
}

/**
 * Generates a refresh token for the specified user
 * @param userId - User ID to associate with the token
 * @param userType - Type of user (creator, brand, etc.)
 * @returns Object containing the refresh token and its expiration
 */
export function generateRefreshToken(
  userId: string,
  userType: string
): { token: string; expires: Date; tokenId: string } {
  // Generate a unique token ID using uuid
  const tokenId = uuidv4();
  
  // Create a refresh token payload with userId, userType, and tokenId
  const payload = {
    userId,
    userType,
    tokenId,
    type: 'refresh'
  };
  
  try {
    // Calculate expiration date using CONSTANTS.REFRESH_TOKEN_EXPIRY
    const expires = getTokenExpiry(CONSTANTS.REFRESH_TOKEN_EXPIRY);
    
    // Sign the token using jwt.sign with CONSTANTS.JWT_SECRET
    const token = jwt.sign(
      payload,
      CONSTANTS.JWT_SECRET,
      { expiresIn: CONSTANTS.REFRESH_TOKEN_EXPIRY }
    );
    
    // Log refresh token generation
    logger.info({
      message: 'Refresh token generated',
      userId,
      userType,
      tokenId
    });
    
    // Return object with token, expiration, and tokenId for storage/revocation
    return {
      token,
      expires,
      tokenId
    };
  } catch (error) {
    logger.error({
      message: 'Failed to generate refresh token',
      error: error.message,
      userId
    });
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verifies a refresh token and returns the decoded payload
 * @param refreshToken - Refresh token to verify
 * @returns Decoded refresh token payload or null if invalid
 */
export function verifyRefreshToken(refreshToken: string): Record<string, any> | null {
  // Check if refreshToken is provided
  if (!refreshToken) {
    logger.warn('Refresh token verification attempted with empty token');
    return null;
  }
  
  try {
    // Try to verify the token using jwt.verify with CONSTANTS.JWT_SECRET
    const decoded = jwt.verify(refreshToken, CONSTANTS.JWT_SECRET) as Record<string, any>;
    
    // Ensure it's actually a refresh token
    if (decoded.type !== 'refresh') {
      logger.warn({
        message: 'Invalid token type for refresh token',
        userId: decoded.userId
      });
      return null;
    }
    
    // Return the decoded payload if successful
    return decoded;
  } catch (error) {
    // Log and return null if verification fails
    if (error instanceof jwt.TokenExpiredError) {
      logger.info({
        message: 'Refresh token expired',
        error: error.message
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn({
        message: 'Invalid refresh token',
        error: error.message
      });
    } else {
      logger.error({
        message: 'Refresh token verification error',
        error: error.message
      });
    }
    // Catch and handle any unexpected errors during verification
    return null;
  }
}

/**
 * Securely encrypts platform OAuth tokens before storage
 * @param token - Platform token to encrypt
 * @returns Encrypted token string
 */
export function encryptPlatformToken(token: string): string {
  // Check if token is provided
  if (!token) {
    logger.warn('Attempted to encrypt empty platform token');
    throw new Error('Cannot encrypt empty platform token');
  }
  
  try {
    // Use the encrypt utility from crypto.ts to encrypt the token
    const encryptedToken = encrypt(token);
    return encryptedToken;
  } catch (error) {
    // Handle and log any encryption errors
    logger.error({
      message: 'Failed to encrypt platform token',
      error: error.message
    });
    throw new Error('Failed to secure platform token');
  }
}

/**
 * Decrypts an encrypted platform OAuth token for use
 * @param encryptedToken - Encrypted token to decrypt
 * @returns Decrypted token string
 */
export function decryptPlatformToken(encryptedToken: string): string {
  // Check if encryptedToken is provided
  if (!encryptedToken) {
    logger.warn('Attempted to decrypt empty platform token');
    throw new Error('Cannot decrypt empty platform token');
  }
  
  try {
    // Use the decrypt utility from crypto.ts to decrypt the token
    const decryptedToken = decrypt(encryptedToken);
    return decryptedToken;
  } catch (error) {
    // Handle and log any decryption errors
    logger.error({
      message: 'Failed to decrypt platform token',
      error: error.message
    });
    throw new Error('Failed to access platform token');
  }
}

/**
 * Calculates expiration date for a token based on specified duration
 * @param duration - Duration string (e.g., '1d', '4h', '30m')
 * @returns Expiration date for the token
 */
export function getTokenExpiry(duration: string): Date {
  try {
    // Parse the duration string (e.g., '1d', '4h', '30m')
    const match = duration.match(/^(\d+)([smhdwMy])$/);
    
    if (!match) {
      logger.warn({
        message: 'Invalid duration format, using default expiry',
        duration
      });
      // Default to standard expiry if duration format is invalid
      return dayjs().add(1, 'hour').toDate();
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    // Map the unit character to dayjs time unit
    const unitMap: { [key: string]: dayjs.ManipulateType } = {
      s: 'second',
      m: 'minute',
      h: 'hour',
      d: 'day',
      w: 'week',
      M: 'month',
      y: 'year'
    };
    
    // Use dayjs to calculate the future date based on current time
    return dayjs().add(value, unitMap[unit]).toDate();
  } catch (error) {
    logger.error({
      message: 'Error calculating token expiry',
      duration,
      error: error.message
    });
    // Default to standard expiry if format is invalid
    return dayjs().add(1, 'hour').toDate();
  }
}

/**
 * Checks if a token or expiry date is expired
 * @param tokenOrDate - JWT token string or expiration date
 * @returns True if token is expired, false otherwise
 */
export function isTokenExpired(tokenOrDate: string | Date): boolean {
  try {
    // Accept either a JWT token string or an expiration date
    if (!tokenOrDate) {
      return true; // Treat null/undefined as expired
    }
    
    // If input is a date, compare it to current time
    if (tokenOrDate instanceof Date) {
      return dayjs().isAfter(tokenOrDate);
    }
    
    // If input is a token, decode it without verification to check exp claim
    if (typeof tokenOrDate === 'string') {
      try {
        const decoded = jwt.decode(tokenOrDate) as { exp?: number };
        
        if (!decoded || !decoded.exp) {
          return true; // Invalid token or missing exp claim
        }
        
        return decoded.exp < Math.floor(Date.now() / 1000);
      } catch {
        return true; // Decode error, treat as expired
      }
    }
    
    // Handle invalid inputs by returning true (treating them as expired)
    return true;
  } catch (error) {
    logger.error({
      message: 'Error checking token expiration',
      error: error.message
    });
    return true; // On error, treat as expired for safety
  }
}