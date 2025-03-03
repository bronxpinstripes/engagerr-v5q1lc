/**
 * Engagerr Type Definitions
 * 
 * This file re-exports all type definitions used throughout the Engagerr web application.
 * It serves as a central access point for type imports to simplify import statements across the codebase.
 * This barrel file pattern reduces import complexity and provides a consistent way to access all types.
 */

// Authentication types - user sessions, credentials, and access control
export * from './auth';

// User types - user profiles, roles, and account management
export * from './user';

// Creator types - content creator profiles, metrics, and related entities
export * from './creator';

// Brand types - brand profiles, preferences, and discovery functionality
export * from './brand';

// Content types - content items and relationship mapping structures
export * from './content';

// Platform types - social media platform integrations and metrics
export * from './platform';

// Analytics types - cross-platform performance metrics and visualizations
export * from './analytics';

// Partnership types - creator-brand collaborations and contracts
export * from './partnership';

// Messaging types - conversation and communication structures
export * from './message';

// Media kit types - creator portfolio and presentation structures
export * from './media-kit';

// Campaign types - marketing campaign management and analytics
export * from './campaign';

// Chart types - data visualization components and configurations
export * from './charts';

// Form types - form handling, validation, and state management
export * from './form';