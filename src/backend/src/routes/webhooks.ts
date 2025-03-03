import express, { Router } from 'express'; // ^4.18.2
import { 
  handleStripeWebhookController,
  handlePlatformWebhook,
  registerPlatformWebhook,
  unregisterPlatformWebhook,
  getWebhookStatus,
  getSupportedWebhookEvents
} from '../controllers/webhooks';
import { 
  validateBody,
  validateParams
} from '../middlewares/validation';
import { 
  authenticate,
  requireRole
} from '../middlewares/auth';
import { rateLimiter } from '../middlewares/rateLimit';
import { 
  webhookValidationSchemas,
} from '../utils/validation';
import { UserType } from '../types/user';

/**
 * Factory function that creates and configures the webhook routes with appropriate middleware and handlers
 * @returns {Router} Express router configured with webhook routes
 */
function createWebhookRoutes(): Router {
  // Create a new Express router
  const router = express.Router();

  // Configure the public webhook endpoints without auth requirements
  router.post(
    '/stripe',
    rateLimiter('WEBHOOKS'),
    express.raw({ type: 'application/json' }),
    handleStripeWebhookController
  );

  router.post(
    '/:platform',
    rateLimiter('WEBHOOKS'),
    express.raw({ type: 'application/json' }),
    handlePlatformWebhook
  );

  router.get(
    '/:platform',
    rateLimiter('WEBHOOKS'),
    handlePlatformWebhook
  );

  // Configure the authenticated webhook management endpoints
  router.post(
    '/register',
    authenticate,
    requireRole([UserType.CREATOR, UserType.BRAND]),
    validateBody(webhookValidationSchemas.registerWebhookSchema),
    registerPlatformWebhook
  );

  router.delete(
    '/:platformId',
    authenticate,
    requireRole([UserType.CREATOR, UserType.BRAND]),
    validateParams(webhookValidationSchemas.platformParamSchema),
    unregisterPlatformWebhook
  );

  router.get(
    '/:platformId/status',
    authenticate,
    requireRole([UserType.CREATOR, UserType.BRAND]),
    validateParams(webhookValidationSchemas.platformParamSchema),
    getWebhookStatus
  );

  router.get(
    '/:platform/events',
    authenticate,
    requireRole([UserType.CREATOR, UserType.BRAND]),
    validateParams(webhookValidationSchemas.platformParamSchema),
    getSupportedWebhookEvents
  );

  // Return the configured router
  return router;
}

// Export the configured router with all webhook-related routes for the application
export default createWebhookRoutes();