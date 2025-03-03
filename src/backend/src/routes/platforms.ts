import express, { Router } from 'express'; //  ^4.18.2
import { authenticate, requirePermission } from '../middlewares/auth';
import { validateBody, validateQuery, validateParams } from '../middlewares/validation';
import rateLimit from '../middlewares/rateLimit';
import platformController from '../controllers/platforms';

/**
 * Configures all platform-related routes and returns the Express router
 * @returns Configured Express router for platform endpoints
 */
function setupPlatformRoutes(): Router {
  // Create a new Express router instance
  const router = express.Router();

  // Set up route for generating OAuth URLs for platform connection
  router.get(
    '/oauth/:platformType',
    authenticate,
    validateParams(/* TODO: Add validation schema */ {}),
    platformController.getOAuthUrl
  );

  // Set up route for connecting a creator to a platform with OAuth
  router.post(
    '/connect',
    authenticate,
    validateBody(/* TODO: Add validation schema */ {}),
    platformController.connectPlatform
  );

  // Set up route for disconnecting a platform from a creator
  router.delete(
    '/:platformId',
    authenticate,
    validateParams(/* TODO: Add validation schema */ {}),
    platformController.disconnectPlatform
  );

  // Set up route for retrieving platform details
  router.get(
    '/:platformId',
    authenticate,
    validateParams(/* TODO: Add validation schema */ {}),
    platformController.getPlatformDetails
  );

  // Set up route for listing all platforms connected to a creator
  router.get(
    '/creator/:creatorId',
    authenticate,
    validateParams(/* TODO: Add validation schema */ {}),
    platformController.getCreatorPlatforms
  );

    // Set up route for listing all platforms connected to a creator
    router.get(
        '/me',
        authenticate,
        platformController.getCreatorPlatforms
    );

  // Set up route for fetching content from a platform
  router.get(
    '/:platformId/content',
    authenticate,
    validateParams(/* TODO: Add validation schema */ {}),
    validateQuery(/* TODO: Add validation schema */ {}),
    platformController.fetchPlatformContent
  );

  // Set up route for fetching metrics from a platform
  router.get(
    '/:platformId/metrics',
    authenticate,
    validateParams(/* TODO: Add validation schema */ {}),
    validateQuery(/* TODO: Add validation schema */ {}),
    platformController.fetchPlatformMetrics
  );

  // Set up route for fetching audience demographics from a platform
  router.get(
    '/:platformId/audience',
    authenticate,
    validateParams(/* TODO: Add validation schema */ {}),
    platformController.fetchPlatformAudience
  );

  // Set up route for synchronizing content and metrics from a platform
  router.post(
    '/:platformId/sync',
    authenticate,
    validateParams(/* TODO: Add validation schema */ {}),
    validateBody(/* TODO: Add validation schema */ {}),
    platformController.syncPlatformData
  );

  // Set up route for refreshing platform OAuth tokens
  router.post(
    '/:platformId/refresh',
    authenticate,
    validateParams(/* TODO: Add validation schema */ {}),
    platformController.refreshPlatformTokens
  );

  // Set up route for handling platform webhooks
  router.post(
    '/webhook/:platformType',
    rateLimit(), // Apply default rate limiting
    validateParams(/* TODO: Add validation schema */ {}),
    platformController.handlePlatformWebhook
  );

  // Return the configured router
  return router;
}

// Export the setupPlatformRoutes function as the default export for use in main application
export default setupPlatformRoutes;