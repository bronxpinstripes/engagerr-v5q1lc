import Stripe from 'stripe'; // ^12.0.0
import { 
  PaymentTypes, 
  PartnershipTypes
} from '../types';
import { 
  createPayment, 
  getPaymentById, 
  getPaymentsByPartnershipId,
  updatePaymentStatus, 
  releaseEscrowPayment,
  getPaymentsByUserId,
  calculatePlatformFee
} from '../models/payment';
import { 
  createPaymentIntent, 
  retrievePaymentIntent,
  cancelPaymentIntent,
  createRefund,
  createEscrowPayment,
  releaseEscrowedFunds
} from '../integrations/stripe/payment';
import { getPartnershipById } from '../models/partnership';
import { escrowService } from '../transactions/escrow';
import { logger } from '../utils/logger';
import { ApiError, ErrorCodes } from '../utils/errors';
import { validatePaymentInput } from '../utils/validation';
import { PAYMENT_SETTINGS, PLATFORM_FEE_PERCENTAGE } from '../config/stripe';

/**
 * Creates a payment intent for frontend payment processing with appropriate setup
 * @param paymentData 
 * @returns Payment client secret for frontend processing and payment record ID
 */
export async function createPaymentIntentService(paymentData: any): Promise<{clientSecret: string, paymentId: string}> {
  // Log payment intent creation request with relevant metadata
  logger.info({ paymentData }, 'Creating payment intent');

  // Validate payment input data using validatePaymentInput
  try {
    await validatePaymentInput(paymentData);
  } catch (error) {
    logger.error({ error, paymentData }, 'Invalid payment input data');
    throw error;
  }

  // Calculate platform fee based on payment amount and type
  const platformFee = calculatePlatformFee(paymentData.amount, paymentData.type);

  // Prepare payment data with appropriate metadata and recipient/sender information
  const paymentInput = {
    ...paymentData,
    platformFee,
    status: PaymentTypes.PaymentStatus.PENDING,
  };

  // Create payment record in database with PENDING status via model function
  let paymentRecord: PaymentTypes.Payment;
  try {
    paymentRecord = await createPayment(paymentInput);
  } catch (error) {
    logger.error({ error, paymentData }, 'Failed to create payment record in database');
    throw error;
  }

  // Create Stripe payment intent with appropriate metadata and amount
  let stripePaymentIntent: Stripe.PaymentIntent;
  try {
    stripePaymentIntent = await createPaymentIntent({
      amount: paymentData.amount,
      currency: paymentData.currency,
      metadata: { paymentId: paymentRecord.id },
    });
  } catch (error) {
    logger.error({ error, paymentData }, 'Failed to create Stripe payment intent');
    throw error;
  }

  // Update payment record with Stripe payment intent ID
  try {
    await updatePaymentStatus(paymentRecord.id, PaymentTypes.PaymentStatus.PROCESSING, {
      stripePaymentIntentId: stripePaymentIntent.id,
    });
  } catch (error) {
    logger.error({ error, paymentData }, 'Failed to update payment record with Stripe payment intent ID');
    throw error;
  }

  // Return client secret for frontend processing and payment record ID
  return {
    clientSecret: stripePaymentIntent.client_secret!,
    paymentId: paymentRecord.id,
  };
}

/**
 * Retrieves a specific payment by ID with complete details
 * @param paymentId 
 * @returns Complete payment record with escrow details if applicable
 */
export async function getPaymentService(paymentId: string): Promise<PaymentTypes.Payment> {
  // Validate payment ID format
  if (!paymentId) {
    logger.error({ paymentId }, 'Invalid payment ID format');
    throw new ApiError('Invalid payment ID', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // Call model function to retrieve payment by ID
  let payment: PaymentTypes.Payment | null;
  try {
    payment = await getPaymentById(paymentId);
  } catch (error) {
    logger.error({ error, paymentId }, 'Failed to retrieve payment from database');
    throw error;
  }

  // If payment not found, throw ApiError with NOT_FOUND code
  if (!payment) {
    logger.error({ paymentId }, 'Payment not found');
    throw new ApiError('Payment not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // If payment is in escrow, retrieve and include escrow details
  // This part is not implemented yet, but will be added in the future

  // Return payment record with all related information
  return payment;
}

/**
 * Retrieves all payments associated with a partnership
 * @param partnershipId 
 * @returns Array of payment records for the partnership
 */
export async function getPartnershipPaymentsService(partnershipId: string): Promise<PaymentTypes.Payment[]> {
  // Validate partnership ID format
  if (!partnershipId) {
    logger.error({ partnershipId }, 'Invalid partnership ID format');
    throw new ApiError('Invalid partnership ID', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // Call model function to retrieve payments by partnership ID
  let payments: PaymentTypes.Payment[];
  try {
    payments = await getPaymentsByPartnershipId(partnershipId);
  } catch (error) {
    logger.error({ error, partnershipId }, 'Failed to retrieve payments from database');
    throw error;
  }

  // Enhance payment records with escrow details where applicable
  // This part is not implemented yet, but will be added in the future

  // Return array of payment records with complete information
  return payments;
}

/**
 * Retrieves payments where the user is either the sender or recipient
 * @param userId 
 * @param role 
 * @param filters 
 * @returns Array of payment records for the user
 */
export async function getUserPaymentsService(userId: string, role: string, filters: any): Promise<PaymentTypes.Payment[]> {
  // Validate user ID and role (sender or recipient)
  if (!userId) {
    logger.error({ userId, role }, 'Invalid user ID format');
    throw new ApiError('Invalid user ID', 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (role !== 'sender' && role !== 'recipient' && role !== 'both') {
    logger.error({ userId, role }, 'Invalid role specified');
    throw new ApiError('Invalid role specified', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // Prepare query filters based on provided parameters
  // This part is not implemented yet, but will be added in the future

  // Call model function to retrieve payments by user ID and role
  let payments: PaymentTypes.Payment[];
  try {
    payments = await getPaymentsByUserId(userId, role, filters);
  } catch (error) {
    logger.error({ error, userId, role }, 'Failed to retrieve payments from database');
    throw error;
  }

  // Apply additional filtering for payment type, status, or date range
  // This part is not implemented yet, but will be added in the future

  // Return filtered array of payment records
  return payments;
}

/**
 * Creates a payment for a partnership between brand and creator
 * @param partnershipId 
 * @param amount 
 * @param paymentType 
 * @param options 
 * @returns Created payment record
 */
export async function createPartnershipPaymentService(partnershipId: string, amount: number, paymentType: PaymentTypes.PaymentType, options: any): Promise<PaymentTypes.Payment> {
  // Log partnership payment creation request
  logger.info({ partnershipId, amount, paymentType, options }, 'Creating partnership payment');

  // Retrieve partnership details to verify existence and get participant IDs
  let partnership: PartnershipTypes.Partnership | null;
  try {
    partnership = await getPartnershipById(partnershipId);
  } catch (error) {
    logger.error({ error, partnershipId }, 'Failed to retrieve partnership from database');
    throw error;
  }

  if (!partnership) {
    logger.error({ partnershipId }, 'Partnership not found');
    throw new ApiError('Partnership not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Calculate platform fee based on amount and payment type
  const platformFee = calculatePlatformFee(amount, paymentType);

  // Prepare payment input data with partnership details
  const paymentInput: PaymentTypes.CreatePaymentInput = {
    partnershipId: partnership.id,
    milestoneId: null, // Milestone ID is not applicable for partnership payments
    senderId: partnership.brandId,
    recipientId: partnership.creatorId,
    amount: amount,
    currency: partnership.currency,
    type: paymentType,
    paymentMethodId: options.paymentMethodId,
    description: options.description || `Payment for partnership ${partnershipId}`,
    inEscrow: options.inEscrow || false,
    metadata: options.metadata || {},
  };

  // Create payment record with PENDING status
  let paymentRecord: PaymentTypes.Payment;
  try {
    paymentRecord = await createPayment(paymentInput);
  } catch (error) {
    logger.error({ error, paymentInput }, 'Failed to create payment record in database');
    throw error;
  }

  // Return created payment record with complete details
  return paymentRecord;
}

/**
 * Creates a payment for a specific milestone in a partnership
 * @param partnershipId 
 * @param milestoneId 
 * @param amount 
 * @param options 
 * @returns Created milestone payment record
 */
export async function createMilestonePaymentService(partnershipId: string, milestoneId: string, amount: number, options: any): Promise<PaymentTypes.Payment> {
  // Log milestone payment creation request
  logger.info({ partnershipId, milestoneId, amount, options }, 'Creating milestone payment');

  // Retrieve partnership to verify valid milestone
  let partnership: PartnershipTypes.Partnership | null;
  try {
    partnership = await getPartnershipById(partnershipId);
  } catch (error) {
    logger.error({ error, partnershipId }, 'Failed to retrieve partnership from database');
    throw error;
  }

  if (!partnership) {
    logger.error({ partnershipId }, 'Partnership not found');
    throw new ApiError('Partnership not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Validate milestone exists and payment amount is appropriate
  const milestone = partnership.milestones?.find(m => m.id === milestoneId);
  if (!milestone) {
    logger.error({ milestoneId }, 'Milestone not found');
    throw new ApiError('Milestone not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  if (amount !== milestone.amount) {
    logger.error({ milestoneId, requestedAmount: amount, milestoneAmount: milestone.amount }, 'Milestone payment amount does not match milestone amount');
    throw new ApiError('Milestone payment amount does not match milestone amount', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // Prepare payment input with milestone reference and MILESTONE type
  const paymentInput: PaymentTypes.CreatePaymentInput = {
    partnershipId: partnership.id,
    milestoneId: milestone.id,
    senderId: partnership.brandId,
    recipientId: partnership.creatorId,
    amount: amount,
    currency: partnership.currency,
    type: PaymentTypes.PaymentType.MILESTONE,
    paymentMethodId: options.paymentMethodId,
    description: options.description || `Milestone payment for ${milestone.title}`,
    inEscrow: options.inEscrow || true,
    metadata: options.metadata || {},
  };

  // Set payment amount based on milestone amount
  // Apply escrow settings if specified in options
  // Create payment record with appropriate metadata
  let paymentRecord: PaymentTypes.Payment;
  try {
    paymentRecord = await createPayment(paymentInput);
  } catch (error) {
    logger.error({ error, paymentInput }, 'Failed to create payment record in database');
    throw error;
  }

  // Return created payment record with milestone reference
  return paymentRecord;
}

/**
 * Processes a successful payment and updates associated records
 * @param paymentIntentId 
 * @returns Updated payment record with completed status
 */
export async function processPaymentSuccessService(paymentIntentId: string): Promise<PaymentTypes.Payment> {
  // Log successful payment processing
  logger.info({ paymentIntentId }, 'Processing successful payment');

  // Retrieve payment intent details from Stripe
  let paymentIntent: any;
  try {
    paymentIntent = await retrievePaymentIntent(paymentIntentId);
  } catch (error) {
    logger.error({ error, paymentIntentId }, 'Failed to retrieve payment intent from Stripe');
    throw error;
  }

  // Find associated payment record using Stripe ID
  const paymentId = paymentIntent.metadata.paymentId;
  let paymentRecord: PaymentTypes.Payment | null;
  try {
    paymentRecord = await getPaymentById(paymentId);
  } catch (error) {
    logger.error({ error, paymentIntentId, paymentId }, 'Failed to retrieve payment record from database');
    throw error;
  }

  if (!paymentRecord) {
    logger.error({ paymentIntentId, paymentId }, 'Payment record not found for Stripe payment intent');
    throw new ApiError('Payment record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Update payment status to COMPLETED and record paid timestamp
  try {
    await updatePaymentStatus(paymentRecord.id, PaymentTypes.PaymentStatus.COMPLETED, {
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
    });
  } catch (error) {
    logger.error({ error, paymentIntentId, paymentRecord }, 'Failed to update payment status in database');
    throw error;
  }

  // If payment is marked for escrow, create escrow record
  if (paymentRecord.inEscrow) {
    try {
      await escrowService.createEscrow(paymentRecord);
    } catch (error) {
      logger.error({ error, paymentIntentId, paymentRecord }, 'Failed to create escrow record');
      throw error;
    }
  }

  // Hold funds in escrow if applicable
  // If not in escrow, process immediate transfer to recipient
  // This part is not implemented yet, but will be added in the future

  // Return updated payment record
  return paymentRecord;
}

/**
 * Handles failed payment and updates associated records
 * @param paymentIntentId 
 * @param errorMessage 
 * @returns Updated payment record with failed status
 */
export async function processPaymentFailureService(paymentIntentId: string, errorMessage: string): Promise<PaymentTypes.Payment> {
  // Log payment failure with error details
  logger.info({ paymentIntentId, errorMessage }, 'Processing failed payment');

  // Retrieve payment intent information from Stripe
  let paymentIntent: any;
  try {
    paymentIntent = await retrievePaymentIntent(paymentIntentId);
  } catch (error) {
    logger.error({ error, paymentIntentId }, 'Failed to retrieve payment intent from Stripe');
    throw error;
  }

  // Find associated payment record using Stripe ID
  const paymentId = paymentIntent.metadata.paymentId;
  let paymentRecord: PaymentTypes.Payment | null;
  try {
    paymentRecord = await getPaymentById(paymentId);
  } catch (error) {
    logger.error({ error, paymentIntentId, paymentId }, 'Failed to retrieve payment record from database');
    throw error;
  }

  if (!paymentRecord) {
    logger.error({ paymentIntentId, paymentId }, 'Payment record not found for Stripe payment intent');
    throw new ApiError('Payment record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Update payment status to FAILED
  try {
    await updatePaymentStatus(paymentRecord.id, PaymentTypes.PaymentStatus.FAILED, {
      stripePaymentIntentId: paymentIntentId,
      errorMessage: errorMessage,
    });
  } catch (error) {
    logger.error({ error, paymentIntentId, paymentRecord }, 'Failed to update payment status in database');
    throw error;
  }

  // If partnership payment, notify partnership service of failure
  // This part is not implemented yet, but will be added in the future

  // Return updated payment record
  return paymentRecord;
}

/**
 * Releases funds from escrow to recipient
 * @param paymentId 
 * @param approvedById 
 * @returns Updated payment record with released status
 */
export async function releaseEscrowPaymentService(paymentId: string, approvedById: string): Promise<PaymentTypes.Payment> {
  // Log escrow release request
  logger.info({ paymentId, approvedById }, 'Releasing escrow payment');

  // Retrieve payment information from database
  let paymentRecord: PaymentTypes.Payment | null;
  try {
    paymentRecord = await getPaymentById(paymentId);
  } catch (error) {
    logger.error({ error, paymentId }, 'Failed to retrieve payment record from database');
    throw error;
  }

  if (!paymentRecord) {
    logger.error({ paymentId }, 'Payment record not found');
    throw new ApiError('Payment record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Verify payment is in escrow and can be released
  if (!paymentRecord.inEscrow) {
    logger.error({ paymentId }, 'Payment is not in escrow');
    throw new ApiError('Payment is not in escrow', 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (paymentRecord.status !== PaymentTypes.PaymentStatus.IN_ESCROW) {
    logger.error({ paymentId, status: paymentRecord.status }, 'Payment is not in IN_ESCROW status');
    throw new ApiError('Payment is not in IN_ESCROW status', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // Validate approver has permission to release payment
  // This part is not implemented yet, but will be added in the future

  // Use escrow service to release funds to recipient
  try {
    await escrowService.releaseFunds(paymentRecord.escrowId, approvedById, paymentRecord.amount);
  } catch (error) {
    logger.error({ error, paymentId }, 'Failed to release funds from escrow service');
    throw error;
  }

  // Update payment status to RELEASED
  try {
    await updatePaymentStatus(paymentRecord.id, PaymentTypes.PaymentStatus.RELEASED, {
      releasedAt: new Date(),
    });
  } catch (error) {
    logger.error({ error, paymentId }, 'Failed to update payment status in database');
    throw error;
  }

  // Record release details including approver ID and timestamp
  // Return updated payment record
  return paymentRecord;
}

/**
 * Processes a refund for a payment
 * @param refundRequest 
 * @returns Updated payment record with refund information
 */
export async function refundPaymentService(refundRequest: PaymentTypes.RefundRequest): Promise<PaymentTypes.Payment> {
  // Log refund request with details
  logger.info({ refundRequest }, 'Refunding payment');

  // Retrieve payment record and validate eligibility for refund
  let paymentRecord: PaymentTypes.Payment | null;
  try {
    paymentRecord = await getPaymentById(refundRequest.paymentId);
  } catch (error) {
    logger.error({ error, refundRequest }, 'Failed to retrieve payment record from database');
    throw error;
  }

  if (!paymentRecord) {
    logger.error({ refundRequest }, 'Payment record not found');
    throw new ApiError('Payment record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  // Verify refund amount is not greater than original payment
  if (refundRequest.amount > paymentRecord.amount) {
    logger.error({ refundRequest, paymentAmount: paymentRecord.amount }, 'Refund amount exceeds payment amount');
    throw new ApiError('Refund amount exceeds payment amount', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // Process refund through Stripe integration
  try {
    await createRefund({
      payment_intent: paymentRecord.stripePaymentIntentId,
      amount: refundRequest.amount,
      reason: refundRequest.reason,
    });
  } catch (error) {
    logger.error({ error, refundRequest }, 'Failed to create refund in Stripe');
    throw error;
  }

  // Update payment record with REFUNDED status
  try {
    await updatePaymentStatus(paymentRecord.id, PaymentTypes.PaymentStatus.REFUNDED, {
      refundedAt: new Date(),
      refundAmount: refundRequest.amount,
      refundReason: refundRequest.reason,
    });
  } catch (error) {
    logger.error({ error, refundRequest }, 'Failed to update payment status in database');
    throw error;
  }

  // Record refund amount, reason, and timestamp in payment metadata
  // If partnership payment, notify partnership service of refund
  // Return updated payment record
  return paymentRecord;
}

/**
 * Cancels a pending payment that hasn't been processed yet
 * @param paymentId 
 * @param reason 
 * @returns Updated payment record with cancelled status
 */
export async function cancelPaymentService(paymentId: string, reason: string): Promise<PaymentTypes.Payment> {
  // Log payment cancellation request
  logger.info({ paymentId, reason }, 'Cancelling payment');

  // Retrieve payment record and verify it's in PENDING status
  let paymentRecord: PaymentTypes.Payment | null;
  try {
    paymentRecord = await getPaymentById(paymentId);
  } catch (error) {
    logger.error({ error, paymentId }, 'Failed to retrieve payment record from database');
    throw error;
  }

  if (!paymentRecord) {
    logger.error({ paymentId }, 'Payment record not found');
    throw new ApiError('Payment record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
  }

  if (paymentRecord.status !== PaymentTypes.PaymentStatus.PENDING) {
    logger.error({ paymentId, status: paymentRecord.status }, 'Payment is not in PENDING status');
    throw new ApiError('Payment is not in PENDING status', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // If Stripe payment intent exists, cancel it via Stripe API
  if (paymentRecord.stripePaymentIntentId) {
    try {
      await cancelPaymentIntent(paymentRecord.stripePaymentIntentId, reason);
    } catch (error) {
      logger.error({ error, paymentId, stripePaymentIntentId: paymentRecord.stripePaymentIntentId }, 'Failed to cancel payment intent in Stripe');
      throw error;
    }
  }

  // Update payment status to CANCELLED
  try {
    await updatePaymentStatus(paymentRecord.id, PaymentTypes.PaymentStatus.CANCELLED, {
      cancellationReason: reason,
    });
  } catch (error) {
    logger.error({ error, paymentId }, 'Failed to update payment status in database');
    throw error;
  }

  // Record cancellation reason and timestamp
  // Return updated payment record
  return paymentRecord;
}

/**
 * Generates a detailed breakdown of payment amounts including fees
 * @param amount 
 * @param paymentType 
 * @param currency 
 * @returns Payment breakdown with subtotal, fees, and totals
 */
export function calculatePaymentBreakdownService(amount: number, paymentType: PaymentTypes.PaymentType, currency: string): PaymentTypes.PaymentBreakdown {
  // Calculate platform fee using model function
  const platformFee = calculatePlatformFee(amount, paymentType);

  // Calculate processing fee based on payment processor rates
  const processingFee = Math.round(amount * 0.029 + 30); // Example: 2.9% + $0.30

  // Determine net amount (amount after platform and processing fees)
  const netAmount = amount - platformFee - processingFee;

  // Compile breakdown object with all components (subtotal, fees, total)
  const breakdown: PaymentTypes.PaymentBreakdown = {
    subtotal: amount,
    platformFee: platformFee,
    platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
    processingFee: processingFee,
    total: amount,
    netAmount: netAmount,
    currency: currency,
  };

  // Apply correct currency formatting
  // This part is not implemented yet, but will be added in the future

  // Return detailed payment breakdown
  return breakdown;
}

/**
 * Validates if a user has permission to perform operations on a payment
 * @param paymentId 
 * @param userId 
 * @param action 
 * @returns Whether the user has permission for the requested action
 */
export async function validatePaymentPermission(paymentId: string, userId: string, action: string): Promise<boolean> {
  // Retrieve payment record with details
  const payment = await getPaymentById(paymentId);

  if (!payment) {
    logger.warn({ paymentId, userId, action }, 'Payment not found for permission validation');
    return false;
  }

  // Determine required role for the requested action
  let requiredRole: string | null = null;
  switch (action) {
    case 'view':
      requiredRole = 'any'; // Any user can view
      break;
    case 'release':
      requiredRole = 'recipient'; // Only recipient can release
      break;
    case 'refund':
      requiredRole = 'sender'; // Only sender can refund
      break;
    case 'cancel':
      requiredRole = 'sender'; // Only sender can cancel
      break;
    default:
      logger.warn({ paymentId, userId, action }, 'Unknown action for permission validation');
      return false;
  }

  // Check if user is sender, recipient, or has admin permission
  const isSender = payment.senderId === userId;
  const isRecipient = payment.recipientId === userId;
  const isAdmin = false; // Placeholder for admin check

  // For release actions, verify user is recipient or has release authority
  if (action === 'release' && !isRecipient && !isAdmin) {
    logger.warn({ paymentId, userId, action }, 'User does not have permission to release payment');
    return false;
  }

  // For refund actions, verify user is sender or has refund authority
  if (action === 'refund' && !isSender && !isAdmin) {
    logger.warn({ paymentId, userId, action }, 'User does not have permission to refund payment');
    return false;
  }

  // Return boolean indicating permission result
  return isSender || isRecipient || isAdmin;
}