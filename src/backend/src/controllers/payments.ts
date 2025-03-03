import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { PaymentTypes } from '../types/payment';
import {
  createPaymentIntentService,
  getPaymentService,
  getPartnershipPaymentsService,
  getUserPaymentsService,
  createPartnershipPaymentService,
  createMilestonePaymentService,
  processPaymentSuccessService,
  processPaymentFailureService,
  releaseEscrowPaymentService,
  refundPaymentService,
  cancelPaymentService,
  calculatePaymentBreakdownService,
  validatePaymentPermission,
} from '../services/payment';
import { handleAsyncError } from '../utils/errors';
import { authenticate, requireRole, requirePermission } from '../middlewares/auth';
import { logger } from '../utils/logger';
import { UserTypes } from '../types/user';
import express from 'express';

// Create a new express router for payments
const router = express.Router();

/**
 * @route   POST /api/payments/intent
 * @desc    Creates a payment intent for frontend payment processing
 * @access  Authenticated
 */
router.post(
  '/intent',
  authenticate,
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    }, 'Creating payment intent');

    // Extract required payment data from request body
    const paymentData = req.body;

    // Call createPaymentIntentService with payment data
    const { clientSecret, paymentId } = await createPaymentIntentService(paymentData);

    // Return client secret and payment ID to client for frontend processing
    res.status(201).json({
      success: true,
      data: {
        clientSecret,
        paymentId,
      },
      message: 'Payment intent created successfully',
    });
  })
);

/**
 * @route   GET /api/payments/:id
 * @desc    Retrieves a payment by ID
 * @access  Authenticated
 */
router.get(
  '/:id',
  authenticate,
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      paymentId: req.params.id,
    }, 'Retrieving payment by ID');

    // Extract payment ID from request parameters
    const paymentId = req.params.id;

    // Call getPaymentService to fetch payment details
    const payment = await getPaymentService(paymentId);

    // Verify user has permission to view this payment
    const hasPermission = await validatePaymentPermission(paymentId, req.user!.id, 'view');
    if (!hasPermission) {
      logger.warn({
        userId: req.user?.id,
        paymentId: req.params.id,
      }, 'User does not have permission to view this payment');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Return payment object to client
    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment retrieved successfully',
    });
  })
);

/**
 * @route   GET /api/payments/partnership/:partnershipId
 * @desc    Retrieves all payments for a specific partnership
 * @access  Authenticated
 */
router.get(
  '/partnership/:partnershipId',
  authenticate,
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      partnershipId: req.params.partnershipId,
    }, 'Retrieving payments for partnership');

    // Extract partnership ID from request parameters
    const partnershipId = req.params.partnershipId;

    // Call getPartnershipPaymentsService to fetch payments
    const payments = await getPartnershipPaymentsService(partnershipId);

    // Return array of payment objects to client
    res.status(200).json({
      success: true,
      data: payments,
      message: 'Payments retrieved successfully for partnership',
    });
  })
);

/**
 * @route   GET /api/payments/user
 * @desc    Retrieves payments for the authenticated user
 * @access  Authenticated
 */
router.get(
  '/user',
  authenticate,
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    }, 'Retrieving payments for user');

    // Extract user ID from authenticated user object
    const userId = req.user!.id;

    // Extract optional filter parameters from query string
    const { role, ...filters } = req.query;

    // Call getUserPaymentsService with user ID, role, and filters
    const payments = await getUserPaymentsService(userId, role as string, filters);

    // Return array of filtered payment objects to client
    res.status(200).json({
      success: true,
      data: payments,
      message: 'Payments retrieved successfully for user',
    });
  })
);

/**
 * @route   POST /api/payments/partnership/:partnershipId
 * @desc    Creates a payment for a partnership
 * @access  Authenticated, requires permission to initiate payments
 */
router.post(
  '/partnership/:partnershipId',
  authenticate,
  requirePermission('initiate', 'payment'),
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      partnershipId: req.params.partnershipId,
    }, 'Creating payment for partnership');

    // Extract partnership ID, amount, and payment type from request body
    const { amount, type, ...options } = req.body;
    const partnershipId = req.params.partnershipId;

    // Call createPartnershipPaymentService with payment details
    const payment = await createPartnershipPaymentService(partnershipId, amount, type, options);

    // Return created payment object to client
    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment created successfully for partnership',
    });
  })
);

/**
 * @route   POST /api/payments/milestone/:milestoneId
 * @desc    Creates a payment for a specific milestone within a partnership
 * @access  Authenticated, requires permission to initiate payments
 */
router.post(
  '/milestone/:milestoneId',
  authenticate,
  requirePermission('initiate', 'payment'),
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      milestoneId: req.params.milestoneId,
    }, 'Creating payment for milestone');

    // Extract partnership ID, milestone ID, and amount from request body
    const { amount, ...options } = req.body;
    const milestoneId = req.params.milestoneId;
    const partnershipId = req.body.partnershipId;

    // Call createMilestonePaymentService with payment details
    const payment = await createMilestonePaymentService(partnershipId, milestoneId, amount, options);

    // Return created payment object to client
    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment created successfully for milestone',
    });
  })
);

/**
 * @route   POST /api/webhooks/stripe/success
 * @desc    Webhook handler for successful Stripe payments
 * @access  Public (Stripe Webhook)
 */
router.post(
  '/webhooks/stripe/success',
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
    }, 'Processing Stripe payment success webhook');

    // Extract payment intent ID from Stripe webhook payload
    const paymentIntentId = req.body.data.object.id;

    // Call processPaymentSuccessService with payment intent ID
    await processPaymentSuccessService(paymentIntentId);

    // Send 200 response to acknowledge webhook receipt
    res.status(200).json({ received: true });
  })
);

/**
 * @route   POST /api/webhooks/stripe/failure
 * @desc    Webhook handler for failed Stripe payments
 * @access  Public (Stripe Webhook)
 */
router.post(
  '/webhooks/stripe/failure',
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
    }, 'Processing Stripe payment failure webhook');

    // Extract payment intent ID and error details from Stripe webhook payload
    const paymentIntentId = req.body.data.object.id;
    const errorMessage = req.body.data.object.last_payment_error?.message || 'Payment failed';

    // Call processPaymentFailureService with payment intent ID and error message
    await processPaymentFailureService(paymentIntentId, errorMessage);

    // Send 200 response to acknowledge webhook receipt
    res.status(200).json({ received: true });
  })
);

/**
 * @route   PUT /api/payments/:id/release
 * @desc    Releases a payment from escrow to the recipient
 * @access  Authenticated, requires permission to release payments
 */
router.put(
  '/:id/release',
  authenticate,
  requirePermission('release', 'payment'),
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      paymentId: req.params.id,
    }, 'Releasing payment from escrow');

    // Extract payment ID from request parameters
    const paymentId = req.params.id;

    // Extract user ID from authenticated user object
    const approvedById = req.user!.id;

    // Call releaseEscrowPaymentService with payment ID and user ID
    const payment = await releaseEscrowPaymentService(paymentId, approvedById);

    // Return updated payment object to client
    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment released from escrow successfully',
    });
  })
);

/**
 * @route   PUT /api/payments/:id/refund
 * @desc    Processes a refund for a payment
 * @access  Authenticated, requires permission to refund payments
 */
router.put(
  '/:id/refund',
  authenticate,
  requirePermission('refund', 'payment'),
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      paymentId: req.params.id,
    }, 'Refunding payment');

    // Extract payment ID, refund amount, and reason from request body
    const { amount, reason } = req.body;
    const paymentId = req.params.id;

    // Extract user ID from authenticated user object
    const requestedById = req.user!.id;

    // Create refund request object with details
    const refundRequest: PaymentTypes.RefundRequest = {
      paymentId,
      amount,
      reason,
      requestedById,
    };

    // Call refundPaymentService with refund request
    const payment = await refundPaymentService(refundRequest);

    // Return updated payment object with refund details to client
    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment refunded successfully',
    });
  })
);

/**
 * @route   PUT /api/payments/:id/cancel
 * @desc    Cancels a pending payment before processing
 * @access  Authenticated, requires permission to cancel payments
 */
router.put(
  '/:id/cancel',
  authenticate,
  requirePermission('cancel', 'payment'),
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      paymentId: req.params.id,
    }, 'Cancelling payment');

    // Extract payment ID from request parameters
    const paymentId = req.params.id;

    // Extract cancellation reason from request body
    const { reason } = req.body;

    // Call cancelPaymentService with payment ID and reason
    const payment = await cancelPaymentService(paymentId, reason);

    // Return updated cancelled payment object to client
    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment cancelled successfully',
    });
  })
);

/**
 * @route   GET /api/payments/breakdown
 * @desc    Generates a detailed breakdown of payment amounts including fees
 * @access  Authenticated
 */
router.get(
  '/breakdown',
  authenticate,
  handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    // Log the incoming request
    logger.info({
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    }, 'Generating payment breakdown');

    // Extract amount, payment type, and currency from request query parameters
    const { amount, type, currency } = req.query;

    // Call calculatePaymentBreakdownService with parameters
    const breakdown = await calculatePaymentBreakdownService(
      Number(amount),
      type as PaymentTypes.PaymentType,
      currency as string
    );

    // Return payment breakdown object with subtotal, fees, total to client
    res.status(200).json({
      success: true,
      data: breakdown,
      message: 'Payment breakdown generated successfully',
    });
  })
);

// Export the configured router
export { router };