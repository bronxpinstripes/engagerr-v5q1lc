import express from 'express'; // ^4.18.2
import joi from 'joi'; // ^17.9.2
import { authenticate, requireRole, requirePermission } from '../middlewares/auth';
import { validateBody, validateQuery, validateParams } from '../middlewares/validation';
import { handleAsyncError } from '../utils/errors';
import rateLimit from '../middlewares/rateLimit';
import { UserTypes } from '../types/user';
import { PaymentTypes } from '../types/payment';
import paymentsController from '../controllers/payments';

// Create a new Express router instance
const router = express.Router();

/**
 * Configures and sets up all payment-related routes for the express router
 */
function setupPaymentRoutes() {
  // Set up routes for payment operations with appropriate middleware
  // Configure authentication and authorization for routes
  // Apply validation middleware with appropriate schemas

  // Route for creating a payment intent
  router.post(
    '/intent',
    authenticate,
    handleAsyncError(paymentsController.createPaymentIntent)
  );

  // Route for retrieving a payment by ID
  router.get(
    '/:id',
    authenticate,
    handleAsyncError(paymentsController.getPayment)
  );

  // Route for retrieving payments for a partnership
  router.get(
    '/partnership/:partnershipId',
    authenticate,
    handleAsyncError(paymentsController.getPartnershipPayments)
  );

  // Route for retrieving payments for a user
  router.get(
    '/user',
    authenticate,
    handleAsyncError(paymentsController.getUserPayments)
  );

  // Route for creating a payment for a partnership
  router.post(
    '/partnership/:partnershipId',
    authenticate,
    requirePermission('initiate', 'payment'),
    handleAsyncError(paymentsController.createPartnershipPayment)
  );

  // Route for creating a payment for a milestone
  router.post(
    '/milestone/:milestoneId',
    authenticate,
    requirePermission('initiate', 'payment'),
    handleAsyncError(paymentsController.createMilestonePayment)
  );

  // Set up public webhook endpoints for payment processing
  // Route for Stripe payment success webhook
  router.post(
    '/webhooks/stripe/success',
    handleAsyncError(paymentsController.webhookStripePaymentSuccess)
  );

  // Route for Stripe payment failure webhook
  router.post(
    '/webhooks/stripe/failure',
    handleAsyncError(paymentsController.webhookStripePaymentFailure)
  );

  // Route for releasing a payment from escrow
  router.put(
    '/:id/release',
    authenticate,
    requirePermission('release', 'payment'),
    handleAsyncError(paymentsController.releaseEscrowPayment)
  );

  // Route for refunding a payment
  router.put(
    '/:id/refund',
    authenticate,
    requirePermission('refund', 'payment'),
    handleAsyncError(paymentsController.refundPayment)
  );

  // Route for cancelling a payment
  router.put(
    '/:id/cancel',
    authenticate,
    requirePermission('cancel', 'payment'),
    handleAsyncError(paymentsController.cancelPayment)
  );

  // Route for generating a payment breakdown
  router.get(
    '/breakdown',
    authenticate,
    handleAsyncError(paymentsController.getPaymentBreakdown)
  );

  // Return the configured router
  return router;
}

// Export configured payment routes for use in the main application router
export default setupPaymentRoutes();