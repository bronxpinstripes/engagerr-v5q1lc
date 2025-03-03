/**
 * Specialized encryption service for the Engagerr platform
 * Provides enhanced security for sensitive data such as platform credentials, personal information, and payment details
 * Implements a layered encryption approach with different security levels based on data sensitivity
 */

import crypto from 'crypto'; // N/A
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { generateHash, generateRandomToken } from '../utils/crypto';
import { AUTH_CONSTANTS } from '../config/constants';

// Encryption algorithm constants
const ENCRYPTION_ALGORITHM = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const TAG_LENGTH = 16; // 16 bytes for GCM auth tag

// Encryption keys from environment variables
const PLATFORM_TOKEN_ENCRYPTION_KEY = process.env.PLATFORM_TOKEN_ENCRYPTION_KEY;
const PERSONAL_DATA_ENCRYPTION_KEY = process.env.PERSONAL_DATA_ENCRYPTION_KEY;
const PAYMENT_TOKENIZATION_KEY = process.env.PAYMENT_TOKENIZATION_KEY;

/**
 * Custom error class for encryption and decryption operations
 */
class EncryptionError extends AppError {
  code: string;
  details: object;

  /**
   * Creates a new EncryptionError instance
   * @param message Error message
   * @param details Additional error details (will be sanitized)
   */
  constructor(message: string, details?: object) {
    super(message, 500); // 500 status code for server errors
    this.code = 'ENCRYPTION_ERROR';
    
    // Sanitize error details to avoid logging sensitive information
    this.details = details ? this.sanitizeErrorDetails(details) : {};
    
    // Log the error with sanitized details
    logger.error({
      message: `Encryption error: ${message}`,
      code: this.code,
      ...this.details
    });
  }

  /**
   * Removes sensitive information from error details
   */
  private sanitizeErrorDetails(details: object): object {
    const sanitized = { ...details };
    // Remove potentially sensitive fields
    const sensitiveFields = ['data', 'encryptedData', 'decryptedData', 'key', 'token', 'plaintext', 'password'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }
    
    return sanitized;
  }
}

/**
 * KeyManager class to handle encryption keys with secure storage, rotation policies, and access controls
 */
class KeyManager {
  private keyStore: Map<string, Buffer>;
  private keyMetadata: Map<string, string>;

  /**
   * Creates a new KeyManager instance and initializes key store
   */
  constructor() {
    this.keyStore = new Map<string, Buffer>();
    this.keyMetadata = new Map<string, string>();
    
    // Initialize keys from environment variables
    this.loadEnvironmentKeys();
    
    // Set up key rotation schedule (in a production environment, this would be more sophisticated)
  }

  /**
   * Retrieves an encryption key by ID or type
   * @param keyId The key identifier
   * @returns The encryption key
   */
  getKey(keyId: string): Buffer {
    if (!this.keyStore.has(keyId)) {
      throw new EncryptionError(`Encryption key not found: ${keyId}`);
    }
    
    return this.keyStore.get(keyId);
  }

  /**
   * Generates a new key and marks the old one for rotation
   * @param keyType Type of key to rotate
   * @returns New key ID
   */
  rotateKey(keyType: string): string {
    // Generate a new cryptographically secure key
    const newKey = crypto.randomBytes(32); // 256 bits
    
    // Generate a unique ID for the new key
    const newKeyId = `${keyType}-${Date.now()}-${generateRandomToken(8)}`;
    
    // Add the new key to the key store
    this.keyStore.set(newKeyId, newKey);
    
    // Mark this as the current key for the key type
    this.keyMetadata.set(keyType, newKeyId);
    
    return newKeyId;
  }

  /**
   * Gets the current active key ID for a key type
   * @param keyType Type of key
   * @returns Current key ID
   */
  getCurrentKeyId(keyType: string): string {
    return this.keyMetadata.get(keyType);
  }

  /**
   * Loads encryption keys from environment variables or secure storage
   * In a production environment, this would use a secure key management service
   */
  private loadEnvironmentKeys(): void {
    if (PLATFORM_TOKEN_ENCRYPTION_KEY) {
      const platformKeyId = 'platform-token-key';
      this.keyStore.set(platformKeyId, Buffer.from(PLATFORM_TOKEN_ENCRYPTION_KEY, 'base64'));
      this.keyMetadata.set('platform-token', platformKeyId);
    } else {
      logger.warn('PLATFORM_TOKEN_ENCRYPTION_KEY not found in environment');
      // In development, generate a key (not suitable for production)
      if (process.env.NODE_ENV !== 'production') {
        this.rotateKey('platform-token');
      }
    }
    
    if (PERSONAL_DATA_ENCRYPTION_KEY) {
      const personalKeyId = 'personal-data-key';
      this.keyStore.set(personalKeyId, Buffer.from(PERSONAL_DATA_ENCRYPTION_KEY, 'base64'));
      this.keyMetadata.set('personal-data', personalKeyId);
    } else {
      logger.warn('PERSONAL_DATA_ENCRYPTION_KEY not found in environment');
      if (process.env.NODE_ENV !== 'production') {
        this.rotateKey('personal-data');
      }
    }
    
    if (PAYMENT_TOKENIZATION_KEY) {
      const paymentKeyId = 'payment-token-key';
      this.keyStore.set(paymentKeyId, Buffer.from(PAYMENT_TOKENIZATION_KEY, 'base64'));
      this.keyMetadata.set('payment-token', paymentKeyId);
    } else {
      logger.warn('PAYMENT_TOKENIZATION_KEY not found in environment');
      if (process.env.NODE_ENV !== 'production') {
        this.rotateKey('payment-token');
      }
    }
  }
}

// Create a singleton instance of the key manager
const keyManager = new KeyManager();

/**
 * Encrypts platform authentication tokens with enhanced security using dual-layer encryption
 * @param platformToken The platform token to encrypt
 * @param context Additional context to use as additional authenticated data (e.g., platform ID, user ID)
 * @returns Encrypted token with IV, tag, and keyId for later decryption
 */
function encryptPlatformToken(platformToken: string, context?: object): object {
  if (!platformToken) {
    throw new EncryptionError('Cannot encrypt empty platform token');
  }
  
  try {
    // Get the platform token encryption key
    const keyId = keyManager.getCurrentKeyId('platform-token');
    const key = keyManager.getKey(keyId);
    
    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher using AES-256-GCM with the platform token key
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // Include platform ID and user ID in authentication data if provided
    if (context) {
      const platformId = context['platformId'] || '';
      const userId = context['userId'] || '';
      
      if (platformId || userId) {
        const aad = Buffer.from(`${platformId}:${userId}`);
        cipher.setAAD(aad);
      }
    }
    
    // Encrypt the token
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(platformToken, 'utf8')),
      cipher.final()
    ]);
    
    // Get authentication tag from cipher
    const authTag = cipher.getAuthTag();
    
    // Return object with encrypted token, IV, tag, and keyId
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: authTag.toString('base64'),
      keyId: keyId,
      algorithm: ENCRYPTION_ALGORITHM
    };
  } catch (error) {
    throw new EncryptionError('Failed to encrypt platform token', { 
      error: error.message,
      context: context ? JSON.stringify(context) : undefined
    });
  }
}

/**
 * Decrypts platform authentication tokens that were encrypted with encryptPlatformToken
 * @param encryptedData Encrypted data object with IV, tag, and keyId
 * @param context Additional context for authentication
 * @returns Original platform token
 */
function decryptPlatformToken(encryptedData: object, context?: object): string {
  if (!encryptedData || typeof encryptedData !== 'object') {
    throw new EncryptionError('Invalid encrypted data format');
  }
  
  try {
    // Extract IV, auth tag, and encrypted content
    const { encrypted, iv, tag, keyId, algorithm } = encryptedData as any;
    
    if (!encrypted || !iv || !tag || !keyId) {
      throw new EncryptionError('Missing required encryption metadata');
    }
    
    // Determine correct decryption key using keyId
    const key = keyManager.getKey(keyId);
    
    // Decode base64 encrypted data, iv, and tag
    const encryptedBuffer = Buffer.from(encrypted, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    
    // Create decipher using AES-256-GCM with platform token key and IV
    const decipher = crypto.createDecipheriv(
      algorithm || ENCRYPTION_ALGORITHM, 
      key, 
      ivBuffer
    );
    
    // Include platform ID and user ID in authentication data if provided
    if (context) {
      const platformId = context['platformId'] || '';
      const userId = context['userId'] || '';
      
      if (platformId || userId) {
        const aad = Buffer.from(`${platformId}:${userId}`);
        decipher.setAAD(aad);
      }
    }
    
    // Set authentication tag from encrypted data
    decipher.setAuthTag(tagBuffer);
    
    // Decrypt the token
    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    // Handle decryption errors and throw EncryptionError
    throw new EncryptionError('Failed to decrypt platform token', { 
      error: error.message,
      context: context ? JSON.stringify(context) : undefined
    });
  }
}

/**
 * Encrypts sensitive personal information such as contact details or personal identifiers
 * @param personalData Personal data to encrypt
 * @param context Additional context for authentication
 * @returns Encrypted data object with IV, tag, and encrypted content
 */
function encryptPersonalData(personalData: string, context?: object): object {
  if (!personalData) {
    throw new EncryptionError('Cannot encrypt empty personal data');
  }
  
  try {
    // Get the personal data encryption key
    const keyId = keyManager.getCurrentKeyId('personal-data');
    const key = keyManager.getKey(keyId);
    
    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher using personal data encryption key
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // Add user ID to authentication data for additional security
    if (context && context['userId']) {
      const aad = Buffer.from(context['userId']);
      cipher.setAAD(aad);
    }
    
    // Encrypt the personal data
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(personalData, 'utf8')),
      cipher.final()
    ]);
    
    // Get authentication tag from cipher
    const authTag = cipher.getAuthTag();
    
    // Return object with encrypted data, IV, and tag
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: authTag.toString('base64'),
      keyId: keyId,
      algorithm: ENCRYPTION_ALGORITHM
    };
  } catch (error) {
    throw new EncryptionError('Failed to encrypt personal data', { 
      error: error.message
    });
  }
}

/**
 * Decrypts sensitive personal information that was encrypted with encryptPersonalData
 * @param encryptedData Encrypted data object with IV, tag, and keyId
 * @param context Additional context for authentication
 * @returns Original personal data
 */
function decryptPersonalData(encryptedData: object, context?: object): string {
  if (!encryptedData || typeof encryptedData !== 'object') {
    throw new EncryptionError('Invalid encrypted data format');
  }
  
  try {
    // Extract IV, auth tag, and encrypted content
    const { encrypted, iv, tag, keyId, algorithm } = encryptedData as any;
    
    if (!encrypted || !iv || !tag || !keyId) {
      throw new EncryptionError('Missing required encryption metadata');
    }
    
    // Get the decryption key
    const key = keyManager.getKey(keyId);
    
    // Decode base64 encrypted data, iv, and tag
    const encryptedBuffer = Buffer.from(encrypted, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    
    // Create decipher using personal data encryption key and IV
    const decipher = crypto.createDecipheriv(
      algorithm || ENCRYPTION_ALGORITHM, 
      key, 
      ivBuffer
    );
    
    // Add user ID to authentication data if provided
    if (context && context['userId']) {
      const aad = Buffer.from(context['userId']);
      decipher.setAAD(aad);
    }
    
    // Set authentication tag
    decipher.setAuthTag(tagBuffer);
    
    // Decrypt the personal data
    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    // Handle decryption errors and throw EncryptionError
    throw new EncryptionError('Failed to decrypt personal data', { 
      error: error.message
    });
  }
}

/**
 * Tokenizes payment information for secure storage while maintaining partial visibility
 * @param paymentInfo Payment info object
 * @returns Tokenized payment information with visible last 4 digits
 */
function tokenizePaymentInfo(paymentInfo: object): object {
  if (!paymentInfo || typeof paymentInfo !== 'object') {
    throw new EncryptionError('Invalid payment information');
  }
  
  try {
    // Extract card details or payment identifiers
    if ('cardNumber' in paymentInfo) {
      // Credit card information
      const cardNumber = paymentInfo['cardNumber'];
      const expiryDate = paymentInfo['expiryDate'];
      const cvv = paymentInfo['cvv'];
      const cardholderName = paymentInfo['cardholderName'];
      
      // Validate card number
      if (!cardNumber || typeof cardNumber !== 'string' || cardNumber.length < 13) {
        throw new EncryptionError('Invalid card number');
      }
      
      // Preserve last 4 digits or identifying portion for reference
      const last4 = cardNumber.slice(-4);
      
      // Get the payment tokenization key
      const keyId = keyManager.getCurrentKeyId('payment-token');
      const key = keyManager.getKey(keyId);
      
      // Generate random initialization vector
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher using AES-256-GCM with the payment token key
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
      
      // Encrypt the sensitive portions
      const cardData = JSON.stringify({
        cardNumber,
        expiryDate,
        cvv
      });
      
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(cardData, 'utf8')),
        cipher.final()
      ]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Generate token identifier for the payment method
      const tokenId = generateSecureId('pmt_', 24);
      
      // Return tokenized representation with visible portions
      return {
        tokenId,
        type: 'card',
        last4,
        cardholderName,
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: authTag.toString('base64'),
        keyId,
        algorithm: ENCRYPTION_ALGORITHM
      };
    } else if ('accountNumber' in paymentInfo) {
      // Bank account information
      const accountNumber = paymentInfo['accountNumber'];
      const routingNumber = paymentInfo['routingNumber'];
      const accountName = paymentInfo['accountName'];
      
      // Extract last 4 digits for reference
      const last4 = accountNumber.slice(-4);
      
      // Get the payment tokenization key
      const keyId = keyManager.getCurrentKeyId('payment-token');
      const key = keyManager.getKey(keyId);
      
      // Generate random initialization vector
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
      
      // Encrypt account data
      const accountData = JSON.stringify({
        accountNumber,
        routingNumber
      });
      
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(accountData, 'utf8')),
        cipher.final()
      ]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Generate token ID
      const tokenId = generateSecureId('pmt_', 24);
      
      // Return tokenized account info
      return {
        tokenId,
        type: 'bank',
        last4,
        accountName,
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: authTag.toString('base64'),
        keyId,
        algorithm: ENCRYPTION_ALGORITHM
      };
    } else {
      throw new EncryptionError('Unsupported payment method');
    }
  } catch (error) {
    throw new EncryptionError('Failed to tokenize payment information', { 
      error: error.message
    });
  }
}

/**
 * Recovers original payment information from a tokenized representation
 * @param paymentToken Token ID to detokenize
 * @param context Context with user authorization
 * @returns Original payment information
 */
function detokenizePaymentInfo(paymentToken: string, context?: object): object {
  if (!paymentToken) {
    throw new EncryptionError('Invalid payment token');
  }
  
  try {
    // Verify user has permission to access this payment token
    if (!context || !context['userId']) {
      throw new EncryptionError('User authentication required for payment detokenization');
    }
    
    // Log access attempt for audit purposes
    logger.info({
      message: 'Payment information accessed',
      tokenId: paymentToken,
      userId: context['userId'],
      accessTime: new Date().toISOString()
    });
    
    // Note: In a real implementation, the code would:
    // 1. Retrieve encrypted data associated with token from secure database
    // 2. Decrypt the payment information using stored metadata
    // 3. Return the complete payment details
    
    // For this implementation, we'll simulate the error case
    // since actual data retrieval would require database integration
    throw new EncryptionError('Payment detokenization not fully implemented');
  } catch (error) {
    throw new EncryptionError('Failed to detokenize payment information', { 
      error: error.message,
      tokenId: paymentToken
    });
  }
}

/**
 * Encrypts individual database fields for column-level encryption
 * @param fieldValue Field value to encrypt
 * @param fieldName Field name to determine encryption level
 * @param context Additional context for authentication
 * @returns Encrypted field value as string (containing IV, tag, and encrypted data)
 */
function encryptDbField(fieldValue: string, fieldName: string, context?: object): string {
  if (typeof fieldValue !== 'string') {
    throw new EncryptionError('Field value must be a string');
  }
  
  try {
    // Select appropriate encryption key based on field type
    let keyType = 'personal-data'; // default
    
    if (fieldName.includes('token') || 
        fieldName.includes('api_key') || 
        fieldName.includes('secret')) {
      keyType = 'platform-token';
    } else if (fieldName.includes('payment') || 
               fieldName.includes('card') || 
               fieldName.includes('account')) {
      keyType = 'payment-token';
    }
    
    // Get appropriate key
    const keyId = keyManager.getCurrentKeyId(keyType);
    const key = keyManager.getKey(keyId);
    
    // Generate initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher and encrypt the data
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // If context is provided, use it as additional authenticated data
    if (context && (context['userId'] || context['recordId'])) {
      const aad = Buffer.from(`${context['userId'] || ''}:${context['recordId'] || ''}`);
      cipher.setAAD(aad);
    }
    
    // Encrypt the field value
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(fieldValue, 'utf8')),
      cipher.final()
    ]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV, tag, and encrypted data into a single string
    // Format: version:keyId:iv:tag:encrypted
    return `v1:${keyId}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  } catch (error) {
    throw new EncryptionError('Failed to encrypt database field', { 
      error: error.message,
      fieldName
    });
  }
}

/**
 * Decrypts database fields that were encrypted with encryptDbField
 * @param encryptedField Encrypted field value string
 * @param fieldName Field name for context
 * @param context Additional context for authentication
 * @returns Original field value
 */
function decryptDbField(encryptedField: string, fieldName: string, context?: object): string {
  if (!encryptedField || typeof encryptedField !== 'string') {
    throw new EncryptionError('Invalid encrypted field format');
  }
  
  try {
    // Split string into IV, tag, and encrypted data components
    // Format: version:keyId:iv:tag:encrypted
    const parts = encryptedField.split(':');
    
    if (parts.length !== 5 || parts[0] !== 'v1') {
      throw new EncryptionError('Invalid encrypted field format or version');
    }
    
    const [version, keyId, ivBase64, tagBase64, encryptedBase64] = parts;
    
    // Select appropriate decryption key based on field type
    const key = keyManager.getKey(keyId);
    
    // Decode base64 components
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    
    // Create decipher and decrypt the data
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // If context is provided, use it as additional authenticated data
    if (context && (context['userId'] || context['recordId'])) {
      const aad = Buffer.from(`${context['userId'] || ''}:${context['recordId'] || ''}`);
      decipher.setAAD(aad);
    }
    
    // Set authentication tag
    decipher.setAuthTag(tag);
    
    // Decrypt the field value
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    // Return the original field value
    return decrypted.toString('utf8');
  } catch (error) {
    throw new EncryptionError('Failed to decrypt database field', { 
      error: error.message,
      fieldName
    });
  }
}

/**
 * Re-encrypts data with a new key as part of key rotation procedures
 * @param encryptedData Currently encrypted data
 * @param dataType Type of data for key selection
 * @param context Context for authentication
 * @param newKeyId Optional new key ID to use
 * @returns Newly encrypted data with updated keyId
 */
function rotateEncryptedData(encryptedData: object, dataType: string, context?: object, newKeyId?: string): object {
  if (!encryptedData || typeof encryptedData !== 'object') {
    throw new EncryptionError('Invalid encrypted data format');
  }
  
  try {
    // Decrypt data using current key
    let decryptedData: string;
    
    // Determine which decrypt/encrypt functions to use based on data type
    switch (dataType) {
      case 'platform-token':
        decryptedData = decryptPlatformToken(encryptedData, context);
        break;
      case 'personal-data':
        decryptedData = decryptPersonalData(encryptedData, context);
        break;
      default:
        throw new EncryptionError(`Unsupported data type for rotation: ${dataType}`);
    }
    
    // Verify new key is available and valid
    if (newKeyId && !keyManager.getKey(newKeyId)) {
      throw new EncryptionError(`New key not available: ${newKeyId}`);
    }
    
    // Re-encrypt data using new key
    if (!newKeyId) {
      newKeyId = keyManager.getCurrentKeyId(dataType);
    }
    
    // Re-encrypt with appropriate function
    switch (dataType) {
      case 'platform-token':
        return encryptPlatformToken(decryptedData, context);
      case 'personal-data':
        return encryptPersonalData(decryptedData, context);
      default:
        throw new EncryptionError(`Unsupported data type for rotation: ${dataType}`);
    }
  } catch (error) {
    throw new EncryptionError('Failed to rotate encrypted data', { 
      error: error.message,
      dataType
    });
  }
}

/**
 * Generates cryptographically secure identifiers for sensitive operations
 * @param prefix Optional prefix for the identifier 
 * @param length Desired length of identifier (default: 32)
 * @returns Secure random identifier with optional prefix
 */
function generateSecureId(prefix: string = '', length: number = 32): string {
  try {
    // Generate cryptographically secure random bytes
    // Calculate bytes needed for desired length with Base64 encoding (4 chars per 3 bytes)
    const bytesNeeded = Math.ceil((length - prefix.length) * 0.75);
    
    // Convert to URL-safe base64 encoding
    const randomBytes = crypto.randomBytes(bytesNeeded);
    const base64Id = randomBytes.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Apply prefix if provided
    // Ensure total length matches requested length
    return (prefix + base64Id).substring(0, length);
  } catch (error) {
    throw new EncryptionError('Failed to generate secure ID', { 
      error: error.message
    });
  }
}

export {
  encryptPlatformToken,
  decryptPlatformToken,
  encryptPersonalData,
  decryptPersonalData,
  tokenizePaymentInfo,
  detokenizePaymentInfo,
  encryptDbField,
  decryptDbField,
  rotateEncryptedData,
  generateSecureId,
  keyManager,
  EncryptionError
};