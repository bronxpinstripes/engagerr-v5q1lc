import express from 'express'; // express ^4.18.2: Creates the router for defining creator routes
const router = express.Router();

import { creatorController } from '../controllers/creators'; // src/backend/src/controllers/creators.ts: Controller functions for handling creator-related HTTP requests
import { authenticate, requireRole } from '../middlewares/auth'; // src/backend/src/middlewares/auth.ts: Authentication middleware to protect creator routes
import { validateBody, validateQuery, validateParams } from '../middlewares/validation'; // src/backend/src/middlewares/validation.ts: Validation middleware for request body data
import { UserType } from '../types/user'; // src/backend/src/types/user.ts: User type enumeration for role-based access control

/**
 * Configures and returns an Express router with all creator-related routes
 * @returns Configured Express router with creator routes
 */
export default function configureCreatorRoutes(): express.Router {
  // LD1: Create a new Express router instance
  const router = express.Router();

  // LD1: Define GET /profile route for retrieving creator profile
  router.get('/profile', authenticate, creatorController.getCreatorProfile);

  // LD1: Define PUT /profile route for updating creator profile
  router.put('/profile', authenticate, creatorController.updateCreatorProfile);

  // LD1: Define GET /platforms route for retrieving connected platforms
  router.get('/platforms', authenticate, creatorController.getCreatorPlatforms);

  // LD1: Define POST /platforms route for connecting a new platform
  router.post('/platforms', authenticate, creatorController.connectPlatform);

  // LD1: Define DELETE /platforms/:platformId route for disconnecting platforms
  router.delete('/platforms/:platformId', authenticate, creatorController.disconnectPlatform);

  // LD1: Define GET /content route for retrieving creator content
  router.get('/content', authenticate, creatorController.getCreatorContent);

  // LD1: Define GET /analytics route for retrieving analytics data
  router.get('/analytics', authenticate, creatorController.getCreatorAnalytics);

  // LD1: Define GET /relationships route for retrieving content relationships
  router.get('/relationships', authenticate, creatorController.getContentRelationships);

  // LD1: Define POST /relationships route for creating content relationships
  router.post('/relationships', authenticate, creatorController.createContentRelationship);

  // LD1: Define PUT /relationships/:relationshipId route for updating relationships
  router.put('/relationships/:relationshipId', authenticate, creatorController.updateContentRelationship);

  // LD1: Define DELETE /relationships/:relationshipId route for deleting relationships
  router.delete('/relationships/:relationshipId', authenticate, creatorController.deleteContentRelationship);

  // LD1: Define GET /partnerships route for retrieving creator partnerships
  router.get('/partnerships', authenticate, creatorController.getCreatorPartnerships);

  // LD1: Define PUT /settings route for updating creator settings
  router.put('/settings', authenticate, creatorController.updateCreatorSettings);

  // LD1: Return the configured router
  return router;
}