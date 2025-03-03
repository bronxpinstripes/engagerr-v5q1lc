# src/backend/src/routes/partnerships.ts
```typescript
import express, { Router, Request, Response } from 'express'; // Express framework for handling HTTP requests and responses // v4.18.2
const router = express.Router(); // Create a new Express router instance

import { authenticate, requireRole, requirePermission } from '../middlewares/auth'; // Middleware to authenticate requests
import { validateBody, validateQuery, validateParams } from '../middlewares/validation'; // Middleware for request validation
import rateLimit from '../middlewares/rateLimit'; // Middleware for rate limiting API requests
import partnershipController from '../controllers/partnerships'; // Controller for handling partnership-related operations
import { PartnershipTypes } from '../types/partnership'; // Type definitions for partnership-related data structures

/**
 * Configures all partnership-related routes and returns the Express router
 */
function setupPartnershipRoutes(): Router {
  // 1. Create a new Express router instance
  const router = express.Router();

  // 2. Set up route for creating a new partnership
  router.post(
    '/',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.createPartnership // Route handler
  );

  // 3. Set up route for retrieving a partnership by ID
  router.get(
    '/:id',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requirePermission('view', 'partnership'), // Require specific permission
    partnershipController.getPartnership // Route handler
  );

  // 4. Set up route for searching partnerships with filters
  router.get(
    '/',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.searchPartnerships // Route handler
  );

  // 5. Set up routes for retrieving creator and brand partnerships
  router.get(
    '/creator/:creatorId',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requirePermission('view', 'partnership'), // Require specific permission
    partnershipController.getCreatorPartnerships // Route handler
  );

  router.get(
    '/brand/:brandId',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requirePermission('view', 'partnership'), // Require specific permission
    partnershipController.getBrandPartnerships // Route handler
  );

  // 6. Set up routes for updating partnership details and status
  router.put(
    '/:id',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requirePermission('edit', 'partnership'), // Require specific permission
    partnershipController.updatePartnership // Route handler
  );

  router.patch(
    '/:id/status',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requirePermission('edit', 'partnership'), // Require specific permission
    partnershipController.updatePartnershipStatus // Route handler
  );

  // 7. Set up routes for proposal management (create, respond)
  router.post(
    '/:partnershipId/proposals',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.createProposal // Route handler
  );

  router.post(
    '/proposals/:proposalId/respond',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.respondToProposal // Route handler
  );

  // 8. Set up routes for contract management (generate, sign)
  router.post(
    '/:partnershipId/contracts',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.generateContract // Route handler
  );

  router.post(
    '/:partnershipId/contracts/sign',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.signContract // Route handler
  );

  // 9. Set up routes for deliverables management (create, update status)
  router.post(
    '/:partnershipId/deliverables',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.createDeliverable // Route handler
  );

  router.patch(
    '/deliverables/:deliverableId/status',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.updateDeliverableStatus // Route handler
  );

  // 10. Set up routes for payment management (create, release)
  router.post(
    '/:partnershipId/payments',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.createPayment // Route handler
  );

  router.post(
    '/:partnershipId/payments/:paymentId/release',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.releasePayment // Route handler
  );

  // 11. Set up routes for milestone management (create, complete)
  router.post(
    '/:partnershipId/milestones',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.createMilestone // Route handler
  );

  router.post(
    '/milestones/:milestoneId/complete',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.completeMilestone // Route handler
  );

  // 12. Set up route for cancelling partnerships
  router.post(
    '/:partnershipId/cancel',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requireRole(['creator_owner', 'brand_owner', 'system_admin']), // Require specific roles
    partnershipController.cancelPartnership // Route handler
  );

  // 13. Set up route for retrieving partnership analytics
  router.get(
    '/:partnershipId/analytics',
    rateLimit('PARTNERSHIPS'), // Apply rate limiting
    authenticate, // Authenticate the user
    requirePermission('view', 'partnership'), // Require specific permission
    partnershipController.getPartnershipAnalytics // Route handler
  );

  // 14. Return the configured router
  return router;
}

export default setupPartnershipRoutes;