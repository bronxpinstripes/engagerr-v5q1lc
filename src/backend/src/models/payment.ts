/**
 * Payment Model
 * 
 * Handles all payment-related database operations including payment creation,
 * escrow management, and transaction tracking for marketplace payments.
 * 
 * This module implements:
 * - Payment CRUD operations
 * - Escrow functionality for secure marketplace transactions
 * - Platform fee calculation
 * - Integration with Stripe for payment processing
 */

import { 
  PaymentStatus, 
  PaymentType, 
  CreatePaymentInput, 
  UpdatePaymentInput, 
  Payment 
} from '../types/payment';
import { supabase } from '../config/supabase';
import { stripe } from '../config/stripe';
import { DatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';
import { TABLES } from '../config/constants';

// Allowed status transitions for payment lifecycle
const VALID_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [
    PaymentStatus.PROCESSING, 
    PaymentStatus.FAILED, 
    PaymentStatus.CANCELLED
  ],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.COMPLETED, 
    PaymentStatus.FAILED, 
    PaymentStatus.CANCELLED,
    PaymentStatus.IN_ESCROW
  ],
  [PaymentStatus.COMPLETED]: [
    PaymentStatus.REFUNDED
  ],
  [PaymentStatus.IN_ESCROW]: [
    PaymentStatus.RELEASED,
    PaymentStatus.REFUNDED,
    PaymentStatus.DISPUTED,
    PaymentStatus.CANCELLED
  ],
  [PaymentStatus.RELEASED]: [
    PaymentStatus.REFUNDED,
    PaymentStatus.DISPUTED
  ],
  [PaymentStatus.FAILED]: [
    PaymentStatus.PENDING
  ],
  [PaymentStatus.REFUNDED]: [],
  [PaymentStatus.DISPUTED]: [
    PaymentStatus.RELEASED,
    PaymentStatus.REFUNDED,
    PaymentStatus.CANCELLED
  ],
  [PaymentStatus.CANCELLED]: []
};

/**
 * Creates a new payment record in the database
 * 
 * @param paymentData Payment information to create the record
 * @returns The created payment record
 */
export async function createPayment(paymentData: CreatePaymentInput): Promise<Payment> {
  logger.info({ partnershipId: paymentData.partnershipId, amount: paymentData.amount }, 'Creating new payment record');
  
  try {
    // Calculate platform fee
    const platformFee = calculatePlatformFee(paymentData.amount, paymentData.type);
    
    // Create new payment record
    const payment: Partial<Payment> = {
      ...paymentData,
      platformFee,
      status: PaymentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ...paymentData.metadata,
        platformFeeCalculation: {
          amount: paymentData.amount,
          feeAmount: platformFee,
          type: paymentData.type
        }
      }
    };
    
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .insert(payment)
      .select()
      .single();
    
    if (error) {
      logger.error({ error, paymentData }, 'Failed to create payment record');
      throw new DatabaseError('Failed to create payment record', { cause: error });
    }
    
    logger.info({ paymentId: data.id }, 'Payment record created successfully');
    return data as Payment;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error({ error, paymentData }, 'Error creating payment record');
    throw new DatabaseError('Error creating payment record', { cause: error });
  }
}

/**
 * Retrieves a payment record by its ID
 * 
 * @param paymentId ID of the payment to retrieve
 * @returns The payment record or null if not found
 */
export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .select('*')
      .eq('id', paymentId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // PostgreSQL not found error code
        return null;
      }
      logger.error({ error, paymentId }, 'Error retrieving payment by ID');
      throw new DatabaseError('Failed to retrieve payment', { cause: error });
    }
    
    return data as Payment;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error({ error, paymentId }, 'Error retrieving payment by ID');
    throw new DatabaseError('Error retrieving payment by ID', { cause: error });
  }
}

/**
 * Retrieves all payments associated with a specific partnership
 * 
 * @param partnershipId ID of the partnership
 * @returns Array of payment records
 */
export async function getPaymentsByPartnershipId(partnershipId: string): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .select('*')
      .eq('partnershipId', partnershipId)
      .order('createdAt', { ascending: false });
    
    if (error) {
      logger.error({ error, partnershipId }, 'Error retrieving payments by partnership ID');
      throw new DatabaseError('Failed to retrieve partnership payments', { cause: error });
    }
    
    return data as Payment[];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error({ error, partnershipId }, 'Error retrieving payments by partnership ID');
    throw new DatabaseError('Error retrieving payments by partnership ID', { cause: error });
  }
}

/**
 * Updates the status of a payment record
 * 
 * @param paymentId ID of the payment to update
 * @param status New payment status
 * @param metadata Additional metadata to update (optional)
 * @returns The updated payment record
 */
export async function updatePaymentStatus(
  paymentId: string, 
  status: PaymentStatus,
  metadata: Record<string, any> = {}
): Promise<Payment> {
  logger.info({ paymentId, status }, 'Updating payment status');
  
  try {
    // Get current payment record to validate status transition
    const currentPayment = await getPaymentById(paymentId);
    
    if (!currentPayment) {
      throw new DatabaseError('Payment not found', { paymentId });
    }
    
    // Validate status transition
    if (!isValidStatusTransition(currentPayment.status, status)) {
      logger.error(
        { paymentId, currentStatus: currentPayment.status, newStatus: status },
        'Invalid payment status transition'
      );
      throw new DatabaseError('Invalid payment status transition', {
        currentStatus: currentPayment.status, 
        newStatus: status
      });
    }
    
    // Prepare update data
    const updateData: Partial<Payment> = {
      status,
      updatedAt: new Date(),
      metadata: {
        ...currentPayment.metadata,
        ...metadata,
        statusHistory: [
          ...(currentPayment.metadata?.statusHistory || []),
          {
            from: currentPayment.status,
            to: status,
            date: new Date().toISOString()
          }
        ]
      }
    };
    
    // Add timestamp based on status
    if (status === PaymentStatus.COMPLETED) {
      updateData.paidAt = new Date();
    } else if (status === PaymentStatus.RELEASED) {
      updateData.releasedAt = new Date();
    } else if (status === PaymentStatus.REFUNDED) {
      updateData.refundedAt = new Date();
    }
    
    // Update the payment record
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();
    
    if (error) {
      logger.error({ error, paymentId, status }, 'Failed to update payment status');
      throw new DatabaseError('Failed to update payment status', { cause: error });
    }
    
    logger.info({ paymentId, status }, 'Payment status updated successfully');
    return data as Payment;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error({ error, paymentId, status }, 'Error updating payment status');
    throw new DatabaseError('Error updating payment status', { cause: error });
  }
}

/**
 * Releases a payment held in escrow to the recipient
 * 
 * @param paymentId ID of the payment to release from escrow
 * @param approvedBy ID of the user approving the release
 * @returns The updated payment record
 */
export async function releaseEscrowPayment(paymentId: string, approvedBy: string): Promise<Payment> {
  logger.info({ paymentId, approvedBy }, 'Releasing payment from escrow');
  
  try {
    // Get current payment record
    const payment = await getPaymentById(paymentId);
    
    if (!payment) {
      throw new DatabaseError('Payment not found', { paymentId });
    }
    
    // Verify payment is in escrow
    if (!payment.inEscrow) {
      throw new DatabaseError('Payment is not in escrow', { paymentId });
    }
    
    // Verify payment has not already been released
    if (payment.status === PaymentStatus.RELEASED) {
      throw new DatabaseError('Payment has already been released', { paymentId });
    }
    
    // Verify payment is in a status that can be released
    if (payment.status !== PaymentStatus.IN_ESCROW && 
        payment.status !== PaymentStatus.COMPLETED) {
      throw new DatabaseError('Payment cannot be released from escrow in its current status', {
        paymentId,
        status: payment.status
      });
    }
    
    // Update payment record to release from escrow
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .update({
        status: PaymentStatus.RELEASED,
        inEscrow: false,
        releasedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          ...payment.metadata,
          escrowRelease: {
            approvedBy,
            releasedAt: new Date().toISOString(),
            previousStatus: payment.status
          }
        }
      })
      .eq('id', paymentId)
      .select()
      .single();
    
    if (error) {
      logger.error({ error, paymentId }, 'Failed to release payment from escrow');
      throw new DatabaseError('Failed to release payment from escrow', { cause: error });
    }
    
    logger.info({ paymentId }, 'Payment released from escrow successfully');
    return data as Payment;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error({ error, paymentId }, 'Error releasing payment from escrow');
    throw new DatabaseError('Error releasing payment from escrow', { cause: error });
  }
}

/**
 * Creates a milestone payment for a partial release from escrow
 * 
 * @param partnershipId ID of the partnership
 * @param milestoneId ID of the milestone
 * @param amount Amount to pay for this milestone
 * @returns The created milestone payment record
 */
export async function createMilestonePayment(
  partnershipId: string,
  milestoneId: string,
  amount: number
): Promise<Payment> {
  logger.info({ partnershipId, milestoneId, amount }, 'Creating milestone payment');
  
  try {
    // Get partnership details to determine sender and recipient
    const { data: partnership, error: partnershipError } = await supabase
      .from(TABLES.PARTNERSHIPS)
      .select('brandId, creatorId')
      .eq('id', partnershipId)
      .single();
      
    if (partnershipError || !partnership) {
      throw new DatabaseError('Partnership not found', { partnershipId });
    }
    
    // Calculate platform fee
    const platformFee = calculatePlatformFee(amount, PaymentType.MILESTONE);
    
    // Create the milestone payment
    const paymentData: Partial<Payment> = {
      partnershipId,
      milestoneId,
      senderId: partnership.brandId,
      recipientId: partnership.creatorId,
      amount,
      platformFee,
      type: PaymentType.MILESTONE,
      status: PaymentStatus.PENDING,
      inEscrow: true, // Milestone payments start in escrow
      currency: 'usd', // Default currency - in practice, might be configurable
      description: `Milestone payment for partnership ${partnershipId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        milestoneId,
        milestonePayment: true,
        platformFeeCalculation: {
          amount,
          feeAmount: platformFee,
          type: PaymentType.MILESTONE
        }
      }
    };
    
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .insert(paymentData)
      .select()
      .single();
    
    if (error) {
      logger.error({ error, partnershipId, milestoneId }, 'Failed to create milestone payment');
      throw new DatabaseError('Failed to create milestone payment', { cause: error });
    }
    
    logger.info({ paymentId: data.id, milestoneId }, 'Milestone payment created successfully');
    return data as Payment;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error({ error, partnershipId, milestoneId }, 'Error creating milestone payment');
    throw new DatabaseError('Error creating milestone payment', { cause: error });
  }
}

/**
 * Processes a refund for a completed payment
 * 
 * @param paymentId ID of the payment to refund
 * @param reason Reason for the refund
 * @param amount Amount to refund (defaults to full payment amount)
 * @returns The updated payment record with refund information
 */
export async function refundPayment(
  paymentId: string, 
  reason: string,
  amount?: number
): Promise<Payment> {
  logger.info({ paymentId, reason, amount }, 'Processing refund');
  
  try {
    // Get current payment record
    const payment = await getPaymentById(paymentId);
    
    if (!payment) {
      throw new DatabaseError('Payment not found', { paymentId });
    }
    
    // Verify payment can be refunded
    if (payment.status !== PaymentStatus.COMPLETED && 
        payment.status !== PaymentStatus.RELEASED) {
      throw new DatabaseError('Payment cannot be refunded in its current status', {
        paymentId,
        status: payment.status
      });
    }
    
    // Check if already refunded
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new DatabaseError('Payment has already been refunded', { paymentId });
    }
    
    // Determine refund amount
    const refundAmount = amount || payment.amount;
    
    // Validate refund amount doesn't exceed original payment
    if (refundAmount > payment.amount) {
      throw new DatabaseError('Refund amount cannot exceed original payment amount', {
        paymentId,
        paymentAmount: payment.amount,
        refundAmount
      });
    }
    
    // Update payment record with refund information
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .update({
        status: PaymentStatus.REFUNDED,
        refundAmount,
        refundReason: reason,
        refundedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          ...payment.metadata,
          refund: {
            amount: refundAmount,
            reason,
            refundedAt: new Date().toISOString(),
            isPartial: refundAmount < payment.amount,
            previousStatus: payment.status
          }
        }
      })
      .eq('id', paymentId)
      .select()
      .single();
    
    if (error) {
      logger.error({ error, paymentId }, 'Failed to process refund');
      throw new DatabaseError('Failed to process refund', { cause: error });
    }
    
    logger.info({ paymentId, refundAmount }, 'Refund processed successfully');
    return data as Payment;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error({ error, paymentId }, 'Error processing refund');
    throw new DatabaseError('Error processing refund', { cause: error });
  }
}

/**
 * Retrieves all payments associated with a specific user (either as payer or recipient)
 * 
 * @param userId ID of the user
 * @param role Role of the user in the payments (sender, recipient, or both)
 * @returns Array of payment records
 */
export async function getPaymentsByUserId(
  userId: string, 
  role: 'sender' | 'recipient' | 'both' = 'both'
): Promise<Payment[]> {
  try {
    let query = supabase.from(TABLES.PAYMENTS).select('*');
    
    // Filter based on the user's role
    if (role === 'sender') {
      query = query.eq('senderId', userId);
    } else if (role === 'recipient') {
      query = query.eq('recipientId', userId);
    } else {
      // For 'both', find payments where the user is either sender or recipient
      query = query.or(`senderId.eq.${userId},recipientId.eq.${userId}`);
    }
    
    // Execute the query
    const { data, error } = await query.order('createdAt', { ascending: false });
    
    if (error) {
      logger.error({ error, userId, role }, 'Error retrieving payments by user ID');
      throw new DatabaseError('Failed to retrieve user payments', { cause: error });
    }
    
    return data as Payment[];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error({ error, userId, role }, 'Error retrieving payments by user ID');
    throw new DatabaseError('Error retrieving payments by user ID', { cause: error });
  }
}

/**
 * Retrieves escrow payments filtered by status
 * 
 * @param status Status to filter by
 * @returns Array of escrow payment records with the specified status
 */
export async function getEscrowPaymentsByStatus(status: PaymentStatus): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.PAYMENTS)
      .select('*')
      .eq('inEscrow', true)
      .eq('status', status)
      .order('createdAt', { ascending: false });
    
    if (error) {
      logger.error({ error, status }, 'Error retrieving escrow payments by status');
      throw new DatabaseError('Failed to retrieve escrow payments', { cause: error });
    }
    
    return data as Payment[];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    logger.error({ error, status }, 'Error retrieving escrow payments by status');
    throw new DatabaseError('Error retrieving escrow payments by status', { cause: error });
  }
}

/**
 * Calculates the platform fee for a payment based on amount and payment type
 * 
 * @param amount Payment amount
 * @param paymentType Type of payment
 * @returns The calculated platform fee amount
 */
export function calculatePlatformFee(amount: number, paymentType: PaymentType): number {
  // Fee percentages for different payment types
  const feePercentages = {
    [PaymentType.SUBSCRIPTION]: 0, // No fee for subscription payments
    [PaymentType.MARKETPLACE]: 8.0, // 8% fee for marketplace transactions
    [PaymentType.MILESTONE]: 8.0, // 8% fee for milestone payments
    [PaymentType.ADD_ON]: 8.0, // 8% fee for add-on purchases
    [PaymentType.REFUND]: 0 // No fee for refunds
  };
  
  const feePercentage = feePercentages[paymentType] || 8.0;
  const feeAmount = (amount * feePercentage) / 100;
  
  // Round to 2 decimal places
  return Math.round(feeAmount * 100) / 100;
}

/**
 * Helper function to validate payment status transitions
 * 
 * @param currentStatus Current payment status
 * @param newStatus New payment status
 * @returns True if the transition is valid, false otherwise
 */
function isValidStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): boolean {
  // Always allow transition to the same status (no-op)
  if (currentStatus === newStatus) {
    return true;
  }
  
  // Check if the new status is in the list of valid transitions for the current status
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}