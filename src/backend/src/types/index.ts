/**
 * Central Type Definitions for Engagerr Backend
 * 
 * This file serves as the main export point for all TypeScript type definitions 
 * used throughout the Engagerr backend. It re-exports types from domain-specific
 * type files to provide a convenient single import source for all type needs.
 * 
 * This centralized approach ensures type consistency across the application and
 * simplifies imports in services, controllers, and other components.
 */

// Import all type definitions from domain-specific files
import * as ApiTypes from './api';
import * as UserTypes from './user';
import * as CreatorTypes from './creator';
import * as BrandTypes from './brand';
import * as ContentTypes from './content';
import * as PlatformTypes from './platform';
import * as AnalyticsTypes from './analytics';
import * as PartnershipTypes from './partnership';
import * as PaymentTypes from './payment';

// Export all namespaces for selective imports
export { 
  ApiTypes,
  UserTypes,
  CreatorTypes,
  BrandTypes,
  ContentTypes,
  PlatformTypes,
  AnalyticsTypes,
  PartnershipTypes,
  PaymentTypes 
};

// Re-export all types for direct imports
export * from './api';
export * from './user';
export * from './creator';
export * from './brand';
export * from './content';
export * from './platform';
export * from './analytics';
export * from './partnership';
export * from './payment';