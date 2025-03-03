/**
 * Core cryptographic utility library for the Engagerr platform
 * Provides secure encryption, decryption, hashing, and random token generation functions
 * Handles sensitive data protection, including platform credentials, personal information, and security tokens
 */

import crypto from 'crypto';
import { AppError } from './errors';
import { logger } from './logger';

// Encryption settings
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || generateFallbackKey();
const ENCRYPTION_ALGORITHM = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
const ENCRYPTION_KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const AUTH_TAG_LENGTH = 16; // GCM mode authentication tag length

/**
 * Custom error class for encryption and decryption failures
 */
class EncryptionError extends AppError {
  /**
   * Creates a new EncryptionError instance
   * @param message Error message
   * @param details Additional error details (will be sanitized)
   */
  constructor(message: string, details?: Record<string, any>) {
    // Remove any potentially sensitive data from details
    const sanitizedDetails = details ? { ...details } : {};
    
    // Remove any actual encrypted or decrypted data
    if (sanitizedDetails.data) delete sanitizedDetails.data;
    if (sanitizedDetails.encryptedData) delete sanitizedDetails.encryptedData;
    if (sanitizedDetails.decryptedData) delete sanitizedDetails.decryptedData;
    
    super(message, 500, 'ENCRYPTION_ERROR', sanitizedDetails);
    
    // Log the error without sensitive data
    logger.error({
      message: `Encryption error: ${message}`,
      ...sanitizedDetails
    });
  }
}

/**
 * Encrypts sensitive data using AES-256-GCM with an initialization vector and authentication tag
 * @param data String data to encrypt
 * @param context Optional context to use as additional authenticated data (AAD)
 * @returns Encrypted data in format: iv:authTag:encryptedData (base64)
 */
function encrypt(data: string, context?: object): string {
  try {
    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher using AES-256-GCM with the encryption key and IV
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM, 
      Buffer.isBuffer(ENCRYPTION_KEY) ? ENCRYPTION_KEY : Buffer.from(ENCRYPTION_KEY, 'base64'), 
      iv
    );
    
    // Add additional authenticated data if context is provided
    if (context) {
      const aad = Buffer.from(JSON.stringify(context));
      cipher.setAAD(aad);
    }
    
    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data, 'utf8')),
      cipher.final()
    ]);
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag and encrypted data
    const result = Buffer.concat([
      iv, 
      authTag, 
      encrypted
    ]).toString('base64');
    
    return result;
  } catch (error) {
    throw new EncryptionError('Failed to encrypt data', { error: error.message });
  }
}

/**
 * Decrypts data that was encrypted using the encrypt function
 * @param encryptedData Encrypted data string (base64 encoded)
 * @param context Optional context used as additional authenticated data (AAD) during encryption
 * @returns Decrypted data as a string
 */
function decrypt(encryptedData: string, context?: object): string {
  try {
    // Decode base64 encrypted data
    const buffer = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, auth tag and encrypted content
    const iv = buffer.slice(0, IV_LENGTH);
    const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedContent = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    // Create decipher using AES-256-GCM with the encryption key and extracted IV
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM, 
      Buffer.isBuffer(ENCRYPTION_KEY) ? ENCRYPTION_KEY : Buffer.from(ENCRYPTION_KEY, 'base64'), 
      iv
    );
    
    // Add additional authenticated data if context is provided
    if (context) {
      const aad = Buffer.from(JSON.stringify(context));
      decipher.setAAD(aad);
    }
    
    // Set the authentication tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the encrypted content
    const decrypted = Buffer.concat([
      decipher.update(encryptedContent),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    throw new EncryptionError('Failed to decrypt data', { 
      error: error.message,
      // Include limited info to help diagnose issues without revealing the actual data
      dataFormat: 'base64',
      dataLength: encryptedData ? encryptedData.length : 0
    });
  }
}

/**
 * Encrypts an object by converting it to JSON and encrypting the result
 * @param obj Object to encrypt
 * @param context Optional context for additional authentication
 * @returns Encrypted object as a string
 */
function encryptObject<T extends object>(obj: T, context?: object): string {
  try {
    const jsonString = JSON.stringify(obj);
    return encrypt(jsonString, context);
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Failed to encrypt object', { error: error.message });
  }
}

/**
 * Decrypts and parses a JSON object that was encrypted with encryptObject
 * @param encryptedData Encrypted data string
 * @param context Optional context used during encryption
 * @returns Decrypted and parsed object
 */
function decryptObject<T = any>(encryptedData: string, context?: object): T {
  try {
    const jsonString = decrypt(encryptedData, context);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    
    // If the error is due to JSON parsing, it's likely a decryption issue
    if (error instanceof SyntaxError) {
      throw new EncryptionError('Failed to parse decrypted object as JSON', {
        error: error.message
      });
    }
    
    throw new EncryptionError('Failed to decrypt object', { error: error.message });
  }
}

/**
 * Generates a cryptographic hash of data using SHA-256 or specified algorithm
 * @param data Data to hash
 * @param algorithm Hash algorithm to use (default: sha256)
 * @param encoding Output encoding (default: hex)
 * @returns Hashed data in specified encoding
 */
function generateHash(
  data: string, 
  algorithm: string = 'sha256', 
  encoding: crypto.BinaryToTextEncoding = 'hex'
): string {
  try {
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest(encoding);
  } catch (error) {
    logger.warn(`Hash generation failed: ${error.message}`);
    throw new EncryptionError('Failed to generate hash', { 
      algorithm,
      error: error.message 
    });
  }
}

/**
 * Securely compares a plaintext value with a hashed value using constant-time comparison
 * @param plaintext Plaintext value to compare
 * @param hashedValue Hashed value to compare against
 * @param algorithm Hash algorithm used for the hashed value (default: sha256)
 * @returns True if hash of plaintext matches hashedValue, false otherwise
 */
function compareHash(
  plaintext: string, 
  hashedValue: string, 
  algorithm: string = 'sha256'
): boolean {
  try {
    const hashedPlaintext = generateHash(plaintext, algorithm);
    
    // Use constant time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(hashedPlaintext, 'hex'),
      Buffer.from(hashedValue, 'hex')
    );
  } catch (error) {
    logger.warn(`Hash comparison failed: ${error.message}`);
    // Return false on any error rather than throwing
    return false;
  }
}

/**
 * Generates a cryptographically secure random token of specified length
 * @param length Desired length of token (default: 32)
 * @param encoding Output encoding (default: base64url)
 * @returns Random token string
 */
function generateRandomToken(
  length: number = 32, 
  encoding: crypto.BinaryToTextEncoding = 'base64url'
): string {
  try {
    // Calculate bytes needed based on encoding
    let bytesNeeded: number;
    
    switch (encoding) {
      case 'hex':
        bytesNeeded = Math.ceil(length / 2);
        break;
      case 'base64':
      case 'base64url':
        bytesNeeded = Math.ceil(length * 3 / 4);
        break;
      default:
        bytesNeeded = length;
    }
    
    // Generate random bytes
    const randomBytes = crypto.randomBytes(bytesNeeded);
    
    // Convert to requested encoding
    const token = randomBytes.toString(encoding);
    
    // Trim to requested length
    return token.slice(0, length);
  } catch (error) {
    logger.error(`Token generation failed: ${error.message}`);
    throw new EncryptionError('Failed to generate random token', { 
      error: error.message 
    });
  }
}

/**
 * Generates a fallback encryption key when environment key is not available (development only)
 * This should ONLY be used in development environments
 * @returns Generated encryption key
 */
function generateFallbackKey(): Buffer {
  // Log warning for security implications
  logger.warn(
    'Using fallback encryption key. This is not secure for production environments!'
  );
  
  // In development, use a deterministic key for consistency
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // This is intentionally deterministic for development environments only
    return crypto.pbkdf2Sync(
      'engagerr-development-key',
      'engagerr-dev-salt',
      10000,
      ENCRYPTION_KEY_LENGTH,
      'sha256'
    );
  }
  
  // For production environments without a key, generate a random one
  // Note: This will change on every application restart and break decryption!
  return crypto.randomBytes(ENCRYPTION_KEY_LENGTH);
}

/**
 * Derives a cryptographic key from a password using PBKDF2
 * @param password Password to derive key from
 * @param salt Salt for key derivation (random if not provided)
 * @param keyLength Length of derived key in bytes (default: 32)
 * @param iterations Number of iterations for PBKDF2 (default: 10000)
 * @returns Derived key as a Buffer
 */
function deriveKeyFromPassword(
  password: string,
  salt?: string,
  keyLength: number = ENCRYPTION_KEY_LENGTH,
  iterations: number = 10000
): Buffer {
  try {
    // Use provided salt or generate a random one
    const useSalt = salt ? Buffer.from(salt, 'base64') : crypto.randomBytes(16);
    
    // Derive key using PBKDF2
    const derivedKey = crypto.pbkdf2Sync(
      password,
      useSalt,
      iterations,
      keyLength,
      'sha256'
    );
    
    return derivedKey;
  } catch (error) {
    logger.warn('Key derivation failed');
    throw new EncryptionError('Failed to derive key from password', {
      error: error.message
    });
  }
}

export {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  generateHash,
  compareHash,
  generateRandomToken,
  deriveKeyFromPassword,
  EncryptionError
};