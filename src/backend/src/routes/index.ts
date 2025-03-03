import express, { Router } from 'express'; // express ^4.18.2: Express framework for creating and configuring the router
import authRouter from './auth'; // src/backend/src/routes/auth.ts: Authentication and authorization routes
import userRouter from './users'; // src/backend/src/routes/users.ts: User management routes
import creatorRouter from './creators'; // src/backend/src/routes/creators.ts: Creator profile and management routes
import brandRouter from './brands'; // src/backend/src/routes/brands.ts: Brand profile and management routes
import contentRouter from './content'; // src/backend/src/routes/content.ts: Content and content relationship management routes
import analyticsRouter from './analytics'; // src/backend/src/routes/analytics.ts: Analytics data and metrics routes
import platformRouter from './platforms'; // src/backend/src/routes/platforms.ts: Social platform integration routes
import discoveryRouter from './discovery'; // src/backend/src/routes/discovery.ts: Creator discovery and matching routes
import partnershipRouter from './partnerships'; // src/backend/src/routes/partnerships.ts: Partnership management and workflow routes
import paymentRouter from './payments'; // src/backend/src/routes/payments.ts: Payment processing and management routes
import subscriptionRouter from './subscriptions'; // src/backend/src/routes/subscriptions.ts: Subscription management routes
import aiRouter from './ai'; // src/backend/src/routes/ai.ts: AI processing and analysis routes
import webhookRouter from './webhooks'; // src/backend/src/routes/webhooks.ts: Webhook handling routes for external services

// Create a new Express Router instance
const router = express.Router();

/**
 * Sets up and configures all application routes under a main router
 * @returns Router Express router instance with all application routes configured
 */
function setupRoutes(): Router {
  // 1. Create a new Express router instance
  const router = express.Router();

  // 2. Mount all imported route modules to the main router with appropriate path prefixes
  router.use('/auth', authRouter);
  router.use('/users', userRouter);
  router.use('/creators', creatorRouter);
  router.use('/brands', brandRouter);
  router.use('/content', contentRouter);
  router.use('/analytics', analyticsRouter);
  router.use('/platforms', platformRouter);
  router.use('/discovery', discoveryRouter);
  router.use('/partnerships', partnershipRouter);
  router.use('/payments', paymentRouter);
  router.use('/subscriptions', subscriptionRouter);
  router.use('/ai', aiRouter);
  router.use('/webhooks', webhookRouter);

  // 3. Return the configured router for use in the main application
  return router;
}

// Export the configured API router for use in the main application
export default setupRoutes();