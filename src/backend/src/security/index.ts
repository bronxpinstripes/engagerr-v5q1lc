/**
 * Security Module
 * 
 * Central export point for all security-related functionality in the Engagerr platform.
 * This module unifies access to encryption services, Row Level Security (RLS) policies,
 * and permission management through a single cohesive interface.
 * 
 * Key functionality includes:
 * - Encryption services for protecting sensitive data (platform tokens, personal information)
 * - Row Level Security (RLS) policies for database-level access control
 * - Permission management for role-based access control and resource-level authorization
 * 
 * This architecture supports the platform's comprehensive security requirements including
 * authentication, authorization, data protection, and compliance with privacy regulations.
 */

// Import all encryption-related functions and utilities
import * as encryption from './encryption';

// Import all Row Level Security (RLS) policy definitions and utilities
import * as rls from './rls';

// Import all permission-related functions and constants
import * as permissions from './permissions';

// Re-export encryption functionality
export const {
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
} = encryption;

// Re-export RLS policy functionality
export const {
  applyCreatorRLS,
  applyBrandRLS,
  applyPartnershipRLS,
  applyTeamRLS,
  applyAdminRLS,
  applyPublicRLS,
  initializeRLSPolicies,
  addRLSToQuery
} = rls;

// Re-export permission management functionality
export const {
  hasPermission,
  checkPermission,
  isResourceOwner,
  hasTeamAccess,
  getResourcePermissions,
  getUserResourceTypesMap,
  permissionMatrix
} = permissions;