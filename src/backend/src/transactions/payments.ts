import Stripe from 'stripe'; // ^12.0.0
import { 
  getStripeInstance, 
  stripeConfig, 
  PLATFORM_FEE_PERCENTAGE 
} from '../config/stripe';
import { 
  PaymentTypes,
  PaymentStatus,
  PaymentType,
  CreatePaymentInput,
  UpdatePaymentInput,
  PaymentBreakdown
} from '../types/payment';
import { PartnershipTypes } from '../types/partnership';
import { logger } from '../utils/logger';
import { ApiError, ErrorCodes } from '../utils/errors';
import { validatePaymentInput } from '../utils/validation';
import { 
  createPayment, 
  getPaymentById, 
  updatePaymentStatus, 
  getPaymentsByPartnershipId 
} from '../models/payment';
import { getPartnershipById } from '../models/partnership';
import { 
  createPaymentIntent, 
  retrievePaymentIntent, 
  cancelPaymentIntent, 
  createRefund,
  createEscrowPayment,
  releaseEscrowedFunds
} from '../integrations/stripe/payment';
import { escrowService } from './escrow';
import { supabase } from '../config/supabase';
import { TABLES } from '../config/constants';

/**
 * Creates a payment intent for frontend payment processing
 * 
 * @param paymentData Payment intent creation parameters
 * @returns {Promise<{clientSecret: string, paymentId: string}>} Payment client secret for frontend processing and payment record ID
 */
export async function createPaymentIntent(paymentData: CreatePaymentInput): Promise<{ clientSecret: string; paymentId: string }> {
  logger.info({ paymentData }, 'Creating payment intent');

  // Validate payment input data using validatePaymentInput
  try {
    await validatePaymentInput(paymentData);
  } catch (validationError: any) {
    logger.error({ paymentData, validationError }, 'Invalid payment input');
    throw new ApiError('Invalid payment input', 400, ErrorCodes.VALIDATION_ERROR, validationError.details);
  }

  try {
    // Calculate platform fee based on payment amount and type
    const platformFee = calculatePlatformFee(paymentData.amount, paymentData.type);

    // Create payment record in database with PENDING status
    const payment = await createPayment({
      ...paymentData,
      platformFee,
    });

    // Create Stripe payment intent with appropriate metadata
    const stripePaymentIntent = await createEscrowPayment({
      amount: paymentData.amount,
      currency: paymentData.currency,
      description: paymentData.description,
      metadata: paymentData.metadata,
      partnershipId: paymentData.partnershipId,
      milestoneId: paymentData.milestoneId,
      senderId: paymentData.senderId,
      recipientId: paymentData.recipientId,
      brandId: paymentData.senderId, // Assuming sender is the brand
      creatorId: paymentData.recipientId, // Assuming recipient is the creator
      payment_method: paymentData.paymentMethodId,
      customer: paymentData.senderId, // Assuming sender is the customer
    });

    // Return client secret for frontend and payment record ID
    return {
      clientSecret: stripePaymentIntent.client_secret!,
      paymentId: payment.id,
    };
  } catch (error: any) {
    logger.error({ paymentData, error }, 'Error creating payment intent');
    throw new ApiError('Error creating payment intent', 500, ErrorCodes.PAYMENT_PROCESSING_ERROR, {
      message: error.message,
    });
  }
}

/**
 * Creates a payment for a partnership between brand and creator
 * 
 * @param partnershipPaymentData 
 * @returns {Promise<PaymentTypes.Payment>} Created payment record
 */
export async function createPartnershipPayment(partnershipPaymentData: CreatePaymentInput): Promise<PaymentTypes.Payment> {
  logger.info({ partnershipPaymentData }, 'Creating partnership payment');

  try {
    // Validate partnership exists by calling getPartnershipById
    const partnership = await getPartnershipById(partnershipPaymentData.partnershipId);
    if (!partnership) {
      logger.error({ partnershipId: partnershipPaymentData.partnershipId }, 'Partnership not found');
      throw new ApiError('Partnership not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Prepare payment input with partnership details
    const paymentInput: CreatePaymentInput = {
      partnershipId: partnershipPaymentData.partnershipId,
      milestoneId: partnershipPaymentData.milestoneId,
      senderId: partnership.brandId, // Set brand as sender
      recipientId: partnership.creatorId, // Set creator as recipient
      amount: partnershipPaymentData.amount,
      currency: partnershipPaymentData.currency,
      type: partnershipPaymentData.type,
      paymentMethodId: partnershipPaymentData.paymentMethodId,
      description: partnershipPaymentData.description,
      inEscrow: partnershipPaymentData.inEscrow,
      metadata: partnershipPaymentData.metadata,
    };

    // Calculate platform fee based on payment amount
    const platformFee = calculatePlatformFee(paymentInput.amount, paymentInput.type);

    // Create payment record with PENDING status
    const payment = await createPayment({
      ...paymentInput,
      platformFee,
    });

    logger.info({ paymentId: payment.id }, 'Partnership payment created successfully');
    return payment;
  } catch (error: any) {
    logger.error({ partnershipPaymentData, error }, 'Error creating partnership payment');
    throw new ApiError('Error creating partnership payment', 500, ErrorCodes.PAYMENT_PROCESSING_ERROR, {
      message: error.message,
    });
  }
}

/**
 * Processes a successful payment from Stripe webhook
 * 
 * @param paymentIntentId 
 * @returns {Promise<PaymentTypes.Payment>} Updated payment record with completed status
 */
export async function processPaymentSuccess(paymentIntentId: string): Promise<PaymentTypes.Payment> {
  logger.info({ paymentIntentId }, 'Processing successful payment from Stripe webhook');

  try {
    // Retrieve payment intent details from Stripe
    const paymentIntent = await retrievePaymentIntent(paymentIntentId);

    // Find associated payment record using Stripe ID
    const payment = await getPaymentById(paymentIntentId);
    if (!payment) {
      logger.error({ paymentIntentId }, 'Payment record not found for Stripe payment intent');
      throw new ApiError('Payment record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Update payment status to COMPLETED and record paid timestamp
    const updatedPayment = await updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, {
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
    });

    // If payment is marked for escrow, create escrow record and hold funds
    if (payment.inEscrow) {
      await escrowService.createEscrow(payment);
      await escrowService.holdFunds(payment.escrowId, payment.id);
    }

    logger.info({ paymentId: payment.id }, 'Payment processed successfully');
    return updatedPayment;
  } catch (error: any) {
    logger.error({ paymentIntentId, error }, 'Error processing successful payment');
    throw new ApiError('Error processing successful payment', 500, ErrorCodes.PAYMENT_PROCESSING_ERROR, {
      message: error.message,
    });
  }
}

/**
 * Handles failed payment from Stripe webhook
 * 
 * @param paymentIntentId 
 * @param errorMessage 
 * @returns {Promise<PaymentTypes.Payment>} Updated payment record with failed status
 */
export async function processPaymentFailure(paymentIntentId: string, errorMessage: string): Promise<PaymentTypes.Payment> {
  logger.info({ paymentIntentId, errorMessage }, 'Processing failed payment from Stripe webhook');

  try {
    // Retrieve payment intent information from Stripe
    const paymentIntent = await retrievePaymentIntent(paymentIntentId);

    // Find associated payment record using Stripe ID
    const payment = await getPaymentById(paymentIntentId);
    if (!payment) {
      logger.error({ paymentIntentId }, 'Payment record not found for Stripe payment intent');
      throw new ApiError('Payment record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Update payment status to FAILED
    const updatedPayment = await updatePaymentStatus(payment.id, PaymentStatus.FAILED, {
      stripePaymentIntentId: paymentIntentId,
      metadata: {
        errorMessage: errorMessage,
      },
    });

    logger.info({ paymentId: payment.id }, 'Payment marked as failed');
    return updatedPayment;
  } catch (error: any) {
    logger.error({ paymentIntentId, errorMessage, error }, 'Error processing failed payment');
    throw new ApiError('Error processing failed payment', 500, ErrorCodes.PAYMENT_PROCESSING_ERROR, {
      message: error.message,
    });
  }
}

/**
 * Transfers funds from escrow to creator account
 * 
 * @param paymentId 
 * @param approvedById 
 * @returns {Promise<PaymentTypes.Payment>} Updated payment record with released status
 */
export async function transferPaymentToCreator(paymentId: string, approvedById: string): Promise<PaymentTypes.Payment> {
  logger.info({ paymentId, approvedById }, 'Transferring funds from escrow to creator');

  try {
    // Retrieve payment information from database
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      logger.error({ paymentId }, 'Payment record not found');
      throw new ApiError('Payment record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Verify payment is in escrow and can be released
    if (!payment.inEscrow) {
      logger.error({ paymentId }, 'Payment is not in escrow');
      throw new ApiError('Payment is not in escrow', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Use escrow service to release funds to creator
    await escrowService.releaseFunds(payment.escrowId, approvedById, payment.amount);

    // Update payment status to RELEASED
    const updatedPayment = await updatePaymentStatus(payment.id, PaymentStatus.RELEASED, {
      metadata: {
        releasedBy: approvedById,
        releasedAt: new Date().toISOString(),
      },
    });

    logger.info({ paymentId }, 'Funds transferred to creator successfully');
    return updatedPayment;
  } catch (error: any) {
    logger.error({ paymentId, approvedById, error }, 'Error transferring funds to creator');
    throw new ApiError('Error transferring funds to creator', 500, ErrorCodes.PAYMENT_PROCESSING_ERROR, {
      message: error.message,
    });
  }
}

/**
 * Creates a payment for a specific milestone in a partnership
 * 
 * @param partnershipId 
 * @param milestoneId 
 * @param amount 
 * @param options 
 * @returns {Promise<PaymentTypes.Payment>} Created milestone payment record
 */
export async function createMilestonePayment(
  partnershipId: string,
  milestoneId: string,
  amount: number,
  options: { description?: string; paymentMethodId?: string; inEscrow?: boolean; metadata?: Record<string, any> } = {}
): Promise<PaymentTypes.Payment> {
  logger.info({ partnershipId, milestoneId, amount, options }, 'Creating milestone payment');

  try {
    // Retrieve partnership to verify valid milestone
    const partnership = await getPartnershipById(partnershipId);
    if (!partnership) {
      logger.error({ partnershipId }, 'Partnership not found');
      throw new ApiError('Partnership not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Create payment with milestone reference and MILESTONE type
    const paymentInput: CreatePaymentInput = {
      partnershipId: partnershipId,
      milestoneId: milestoneId,
      senderId: partnership.brandId,
      recipientId: partnership.creatorId,
      amount: amount,
      currency: partnership.currency,
      type: PaymentType.MILESTONE,
      paymentMethodId: options.paymentMethodId || null,
      description: options.description || `Milestone payment for partnership ${partnershipId}`,
      inEscrow: options.inEscrow !== undefined ? options.inEscrow : true,
      metadata: options.metadata || {},
    };

    // Create payment record
    const payment = await createPayment(paymentInput);

    logger.info({ paymentId: payment.id, milestoneId }, 'Milestone payment created successfully');
    return payment;
  } catch (error: any) {
    logger.error({ partnershipId, milestoneId, amount, options, error }, 'Error creating milestone payment');
    throw new ApiError('Error creating milestone payment', 500, ErrorCodes.PAYMENT_PROCESSING_ERROR, {
      message: error.message,
    });
  }
}

/**
 * Retrieves a specific payment by ID
 * 
 * @param paymentId 
 * @returns {Promise<PaymentTypes.Payment>} Payment record with details
 */
export async function getPaymentById(paymentId: string): Promise<PaymentTypes.Payment> {
  logger.info({ paymentId }, 'Retrieving payment by ID');

  try {
    // Query database for payment with specified ID
    const payment = await supabase
      .from(TABLES.PAYMENTS)
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      logger.error({ paymentId }, 'Payment not found');
      throw new ApiError('Payment not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    logger.info({ paymentId }, 'Payment retrieved successfully');
    return payment.data as PaymentTypes.Payment;
  } catch (error: any) {
    logger.error({ paymentId, error }, 'Error retrieving payment by ID');
    throw new ApiError('Error retrieving payment by ID', 500, ErrorCodes.DATABASE_ERROR, {
      message: error.message,
    });
  }
}

/**
 * Retrieves all payments for a partnership
 * 
 * @param partnershipId 
 * @returns {Promise<PaymentTypes.Payment[]>} Array of payment records
 */
export async function getPaymentsByPartnershipId(partnershipId: string): Promise<PaymentTypes.Payment[]> {
  logger.info({ partnershipId }, 'Retrieving payments by partnership ID');

  try {
    // Query database for payments linked to partnership ID
    const payments = await supabase
      .from(TABLES.PAYMENTS)
      .select('*')
      .eq('partnershipId', partnershipId);

    logger.info({ partnershipId, count: payments.data.length }, 'Payments retrieved successfully');
    return payments.data as PaymentTypes.Payment[];
  } catch (error: any) {
    logger.error({ partnershipId, error }, 'Error retrieving payments by partnership ID');
    throw new ApiError('Error retrieving payments by partnership ID', 500, ErrorCodes.DATABASE_ERROR, {
      message: error.message,
    });
  }
}

/**
 * Process a refund for a payment
 * 
 * @param paymentId 
 * @param reason 
 * @param amount 
 * @returns {Promise<PaymentTypes.Payment>} Updated payment record with refund information
 */
export async function refundPayment(paymentId: string, reason: string, amount?: number): Promise<PaymentTypes.Payment> {
  logger.info({ paymentId, reason, amount }, 'Refunding payment');

  try {
    // Retrieve payment record and validate eligibility for refund
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      logger.error({ paymentId }, 'Payment not found');
      throw new ApiError('Payment not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Process refund through Stripe createRefund
    const refund = await createRefund({
      payment_intent: payment.stripePaymentIntentId,
      amount: amount,
      reason: reason,
    });

    // Update payment record with REFUNDED status
    const updatedPayment = await updatePaymentStatus(payment.id, PaymentStatus.REFUNDED, {
      metadata: {
        refundId: refund.id,
        refundReason: reason,
        refundAmount: amount,
      },
    });

    logger.info({ paymentId, refundId: refund.id }, 'Payment refunded successfully');
    return updatedPayment;
  } catch (error: any) {
    logger.error({ paymentId, reason, amount, error }, 'Error refunding payment');
    throw new ApiError('Error refunding payment', 500, ErrorCodes.PAYMENT_PROCESSING_ERROR, {
      message: error.message,
    });
  }
}

/**
 * Calculate platform fee for a payment
 * 
 * @param amount 
 * @param paymentType 
 * @returns {number} Calculated platform fee amount
 */
export function calculatePlatformFee(amount: number, paymentType: PaymentType): number {
  // Determine fee percentage based on payment type
  let feePercentage = PLATFORM_FEE_PERCENTAGE;
  if (paymentType === PaymentType.SUBSCRIPTION) {
    feePercentage = 0; // No fee for subscription payments
  }

  // Calculate fee amount
  const feeAmount = (amount * feePercentage) / 100;

  // Round to 2 decimal places
  return Math.round(feeAmount * 100) / 100;
}

/**
 * Generate detailed payment breakdown including fees
 * 
 * @param amount 
 * @param paymentType 
 * @param currency 
 * @returns {PaymentTypes.PaymentBreakdown} Payment breakdown with subtotal, fees, and totals
 */
export function calculatePaymentBreakdown(amount: number, paymentType: PaymentType, currency: string): PaymentTypes.PaymentBreakdown {
  // Calculate platform fee
  const platformFee = calculatePlatformFee(amount, paymentType);

  // Calculate processing fee (example: 2.9% + 0.30 USD)
  const processingFee = Math.round((amount * 0.029 + 0.30) * 100) / 100;

  // Calculate net amount after all fees
  const netAmount = amount - platformFee - processingFee;

  // Return breakdown object
  return {
    subtotal: amount,
    platformFee: platformFee,
    platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
    processingFee: processingFee,
    total: amount,
    netAmount: netAmount,
    currency: currency,
  };
}