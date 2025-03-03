/**
 * Central barrel file that exports all service modules in the backend services directory,
 * providing a single access point for the application's business logic and service layer.
 * This includes services for authentication, user management, creator and brand operations,
 * content and platform management, analytics, and AI capabilities.
 */

import { authService } from './auth'; // Authentication service with user login, signup, and session management
import userService from './user'; // User management service for common user operations
import creatorService from './creator'; // Creator management service for creator-specific operations
import brandService from './brand'; // Brand management service for brand-specific operations
import contentService from './content'; // Content management service for content operations
import contentRelationshipService from './contentRelationship'; // Service for managing relationships between content items
import platformService from './platform'; // Platform integration service for social media platforms
import analyticsService from './analytics'; // Analytics service for processing and standardizing metrics
import discoveryService from './discovery'; // Discovery service for creator search and matching
import partnershipService from './partnership'; // Partnership service for managing creator-brand collaborations
import paymentService from './payment'; // Payment service for handling financial transactions
import subscriptionService from './subscription'; // Subscription service for managing subscription tiers and features
import emailService from './email'; // Email service for sending transactional emails
import AIRouter, { analyzeContent, generateCreativeContent, analyzeImage } from './ai'; // AI service for routing AI tasks to appropriate models

// Export all service modules and functions for use throughout the application
export {
  authService, // Authentication service for user authentication operations
  userService, // User management service for general user operations
  creatorService, // Creator management service for creator-specific operations
  brandService, // Brand management service for brand-specific operations
  contentService, // Content management service for content creation and retrieval
  contentRelationshipService, // Service for managing relationships between content items
  platformService, // Platform service for social media platform integrations
  analyticsService, // Analytics service for metrics processing and insights
  discoveryService, // Discovery service for creator search and brand matching
  partnershipService, // Partnership service for managing creator-brand collaborations
  paymentService, // Payment service for handling financial transactions
  subscriptionService, // Subscription service for managing subscription tiers and features
  emailService, // Email service for sending transactional emails
  AIRouter, // AI router for directing tasks to appropriate AI models
  analyzeContent, // Content analysis utility function
  generateCreativeContent, // Creative content generation utility function
  analyzeImage // Image analysis utility function
};