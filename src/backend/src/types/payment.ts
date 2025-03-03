/**
 * payment.ts
 * 
 * Defines TypeScript interfaces, enums, and types for payment-related data structures 
 * used throughout the Engagerr platform, including payment processing, escrow management, 
 * and subscription billing.
 */

/**
 * Status values for tracking the state of a payment
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  IN_ESCROW = 'IN_ESCROW',
  RELEASED = 'RELEASED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED'
}

/**
 * Type of payment being processed
 */
export enum PaymentType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  MARKETPLACE = 'MARKETPLACE',
  MILESTONE = 'MILESTONE',
  ADD_ON = 'ADD_ON',
  REFUND = 'REFUND'
}

/**
 * Types of payment methods supported by the platform
 */
export enum PaymentMethodType {
  CARD = 'CARD',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  WALLET = 'WALLET'
}

/**
 * Main interface representing a payment record in the system
 */
export interface Payment {
  id: string;
  partnershipId: string;
  milestoneId: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  platformFee: number;
  type: PaymentType;
  status: PaymentStatus;
  paymentMethodId: string;
  paymentMethodType: PaymentMethodType;
  description: string;
  stripePaymentIntentId: string;
  stripeTransferId: string;
  escrowId: string;
  inEscrow: boolean;
  scheduledAt: Date;
  paidAt: Date;
  releasedAt: Date;
  refundedAt: Date;
  refundAmount: number;
  refundReason: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Record of individual transactions related to payments
 */
export interface Transaction {
  id: string;
  paymentId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  stripeTransactionId: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

/**
 * Details of funds held in escrow before release to recipient
 */
export interface Escrow {
  id: string;
  paymentId: string;
  partnershipId: string;
  amount: number;
  currency: string;
  status: string;
  holdPeriod: number;
  autoReleaseAt: Date;
  releasedAt: Date;
  releasedBy: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stored payment method for a user
 */
export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  stripePaymentMethodId: string;
  isDefault: boolean;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Record of subscription billing events
 */
export interface SubscriptionBilling {
  id: string;
  userId: string;
  subscriptionId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  stripeInvoiceId: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

/**
 * Input data for creating a new payment
 */
export interface CreatePaymentInput {
  partnershipId: string;
  milestoneId: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  type: PaymentType;
  paymentMethodId: string;
  description: string;
  inEscrow: boolean;
  metadata: Record<string, any>;
}

/**
 * Input data for updating an existing payment
 */
export interface UpdatePaymentInput {
  status: PaymentStatus;
  stripePaymentIntentId: string;
  stripeTransferId: string;
  paidAt: Date;
  releasedAt: Date;
  inEscrow: boolean;
  metadata: Record<string, any>;
}

/**
 * Input data for requesting a refund
 */
export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
  requestedById: string;
}

/**
 * Detailed breakdown of payment amounts including fees
 */
export interface PaymentBreakdown {
  subtotal: number;
  platformFee: number;
  platformFeePercentage: number;
  processingFee: number;
  total: number;
  netAmount: number;
  currency: string;
}

/**
 * Namespace containing all payment-related types for use throughout the application
 */
export namespace PaymentTypes {
  export {
    Payment,
    PaymentStatus,
    PaymentType,
    Transaction,
    Escrow,
    PaymentMethodType,
    PaymentMethod,
    SubscriptionBilling,
    CreatePaymentInput,
    UpdatePaymentInput,
    RefundRequest,
    PaymentBreakdown
  };
}