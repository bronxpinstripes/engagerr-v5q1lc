import Stripe from 'stripe'; // v12.0.0
import { 
  getStripeInstance, 
  stripeConfig, 
  PLATFORM_FEE_PERCENTAGE 
} from '../../config/stripe';
import { PaymentTypes } from '../../types/payment';
import { logger } from '../../utils/logger';
import { ApiError, ExternalServiceError } from '../../utils/errors';

/**
 * Creates a Stripe payment intent for processing payments on the frontend
 * 
 * @param paymentData Payment intent creation parameters
 * @returns Created payment intent object
 */
export async function createPaymentIntent(
  paymentData: {
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, string>;
    receipt_email?: string;
    payment_method?: string;
    payment_method_types?: string[];
    customer?: string;
    setup_future_usage?: Stripe.PaymentIntentCreateParams.SetupFutureUsage;
    shipping?: Stripe.PaymentIntentCreateParams.Shipping;
    statement_descriptor?: string;
    statement_descriptor_suffix?: string;
    application_fee_amount?: number;
    on_behalf_of?: string;
    transfer_data?: Stripe.PaymentIntentCreateParams.TransferData;
    transfer_group?: string;
    capture_method?: Stripe.PaymentIntentCreateParams.CaptureMethod;
  }
): Promise<Stripe.PaymentIntent> {
  try {
    const stripe = getStripeInstance();
    
    // Prepare payment intent parameters
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: paymentData.amount,
      currency: paymentData.currency,
      metadata: paymentData.metadata || {},
      payment_method_types: paymentData.payment_method_types || ['card'],
    };

    // Calculate platform fee if applicable
    if (paymentData.application_fee_amount) {
      paymentIntentParams.application_fee_amount = paymentData.application_fee_amount;
    }

    // Add optional parameters if provided
    if (paymentData.description) paymentIntentParams.description = paymentData.description;
    if (paymentData.receipt_email) paymentIntentParams.receipt_email = paymentData.receipt_email;
    if (paymentData.payment_method) paymentIntentParams.payment_method = paymentData.payment_method;
    if (paymentData.customer) paymentIntentParams.customer = paymentData.customer;
    if (paymentData.setup_future_usage) paymentIntentParams.setup_future_usage = paymentData.setup_future_usage;
    if (paymentData.shipping) paymentIntentParams.shipping = paymentData.shipping;
    if (paymentData.statement_descriptor) paymentIntentParams.statement_descriptor = paymentData.statement_descriptor;
    if (paymentData.statement_descriptor_suffix) {
      paymentIntentParams.statement_descriptor_suffix = paymentData.statement_descriptor_suffix;
    }
    if (paymentData.on_behalf_of) paymentIntentParams.on_behalf_of = paymentData.on_behalf_of;
    if (paymentData.transfer_data) paymentIntentParams.transfer_data = paymentData.transfer_data;
    if (paymentData.transfer_group) paymentIntentParams.transfer_group = paymentData.transfer_group;
    if (paymentData.capture_method) paymentIntentParams.capture_method = paymentData.capture_method;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    
    logger.info({
      message: 'Payment intent created successfully',
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
    
    return paymentIntent;
  } catch (error) {
    logger.error({
      message: 'Error creating payment intent',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error creating payment intent: ${error.message}`,
        'Stripe',
        { stripeCode: error.code, type: error.type }
      );
    }
    
    throw new ExternalServiceError(
      'Error creating payment intent',
      'Stripe',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Retrieves a payment intent by its ID
 * 
 * @param paymentIntentId The ID of the payment intent to retrieve
 * @returns Retrieved payment intent
 */
export async function retrievePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    const stripe = getStripeInstance();
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    logger.error({
      message: 'Error retrieving payment intent',
      paymentIntentId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error retrieving payment intent: ${error.message}`,
        'Stripe',
        { stripeCode: error.code, type: error.type, paymentIntentId }
      );
    }
    
    throw new ExternalServiceError(
      'Error retrieving payment intent',
      'Stripe',
      { paymentIntentId, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Captures an authorized payment intent
 * 
 * @param paymentIntentId ID of the payment intent to capture
 * @param amount Optional amount to capture (if different from original amount)
 * @returns Captured payment intent
 */
export async function capturePaymentIntent(
  paymentIntentId: string,
  amount?: number
): Promise<Stripe.PaymentIntent> {
  try {
    const stripe = getStripeInstance();
    
    const captureOptions: Stripe.PaymentIntentCaptureParams = {};
    if (amount) {
      captureOptions.amount_to_capture = amount;
    }
    
    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      captureOptions
    );
    
    logger.info({
      message: 'Payment intent captured successfully',
      paymentIntentId,
      amount: amount || paymentIntent.amount
    });
    
    return paymentIntent;
  } catch (error) {
    logger.error({
      message: 'Error capturing payment intent',
      paymentIntentId,
      amount,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error capturing payment intent: ${error.message}`,
        'Stripe',
        { stripeCode: error.code, type: error.type, paymentIntentId }
      );
    }
    
    throw new ExternalServiceError(
      'Error capturing payment intent',
      'Stripe',
      { paymentIntentId, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Cancels a payment intent that hasn't been captured yet
 * 
 * @param paymentIntentId ID of the payment intent to cancel
 * @param cancellationReason Optional reason for cancellation
 * @returns Cancelled payment intent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string,
  cancellationReason?: string
): Promise<Stripe.PaymentIntent> {
  try {
    const stripe = getStripeInstance();
    
    const cancelOptions: Stripe.PaymentIntentCancelParams = {};
    if (cancellationReason) {
      cancelOptions.cancellation_reason = cancellationReason as Stripe.PaymentIntentCancelParams.CancellationReason;
    }
    
    const paymentIntent = await stripe.paymentIntents.cancel(
      paymentIntentId,
      cancelOptions
    );
    
    logger.info({
      message: 'Payment intent cancelled successfully',
      paymentIntentId,
      cancellationReason
    });
    
    return paymentIntent;
  } catch (error) {
    logger.error({
      message: 'Error cancelling payment intent',
      paymentIntentId,
      cancellationReason,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error cancelling payment intent: ${error.message}`,
        'Stripe',
        { stripeCode: error.code, type: error.type, paymentIntentId }
      );
    }
    
    throw new ExternalServiceError(
      'Error cancelling payment intent',
      'Stripe',
      { paymentIntentId, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Creates a transfer of funds to a connected account or external account
 * 
 * @param destination Stripe account ID or destination to transfer funds to
 * @param amount Amount to transfer in smallest currency unit (e.g., cents)
 * @param currency Three-letter ISO currency code
 * @param transferData Additional transfer data
 * @returns Created transfer object
 */
export async function createTransfer(
  destination: string,
  amount: number,
  currency: string,
  transferData?: {
    description?: string;
    metadata?: Record<string, string>;
    transfer_group?: string;
    source_transaction?: string;
  }
): Promise<Stripe.Transfer> {
  try {
    const stripe = getStripeInstance();
    
    const transferParams: Stripe.TransferCreateParams = {
      amount,
      currency,
      destination
    };
    
    // Add optional parameters if provided
    if (transferData?.description) transferParams.description = transferData.description;
    if (transferData?.metadata) transferParams.metadata = transferData.metadata;
    if (transferData?.transfer_group) transferParams.transfer_group = transferData.transfer_group;
    if (transferData?.source_transaction) transferParams.source_transaction = transferData.source_transaction;
    
    const transfer = await stripe.transfers.create(transferParams);
    
    logger.info({
      message: 'Transfer created successfully',
      transferId: transfer.id,
      destination,
      amount,
      currency
    });
    
    return transfer;
  } catch (error) {
    logger.error({
      message: 'Error creating transfer',
      destination,
      amount,
      currency,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error creating transfer: ${error.message}`,
        'Stripe',
        { stripeCode: error.code, type: error.type, destination }
      );
    }
    
    throw new ExternalServiceError(
      'Error creating transfer',
      'Stripe',
      { destination, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Creates a refund for a payment
 * 
 * @param refundData Refund parameters
 * @returns Created refund object
 */
export async function createRefund(
  refundData: PaymentTypes.RefundRequest & {
    payment_intent?: string;
    charge?: string;
    metadata?: Record<string, string>;
    reason?: string;
    reverse_transfer?: boolean;
    refund_application_fee?: boolean;
  }
): Promise<Stripe.Refund> {
  try {
    const stripe = getStripeInstance();
    
    const refundParams: Stripe.RefundCreateParams = {};
    
    // Must have either payment_intent or charge
    if (refundData.payment_intent) {
      refundParams.payment_intent = refundData.payment_intent;
    } else if (refundData.charge) {
      refundParams.charge = refundData.charge;
    } else {
      throw new Error('Either payment_intent or charge must be provided for refund');
    }
    
    // Add amount if specified (for partial refunds)
    if (refundData.amount) {
      refundParams.amount = refundData.amount;
    }
    
    // Add optional parameters if provided
    if (refundData.metadata) refundParams.metadata = refundData.metadata;
    if (refundData.reason) refundParams.reason = refundData.reason as Stripe.RefundCreateParams.Reason;
    if (refundData.reverse_transfer !== undefined) refundParams.reverse_transfer = refundData.reverse_transfer;
    if (refundData.refund_application_fee !== undefined) {
      refundParams.refund_application_fee = refundData.refund_application_fee;
    }
    
    const refund = await stripe.refunds.create(refundParams);
    
    logger.info({
      message: 'Refund created successfully',
      refundId: refund.id,
      paymentIntent: refundData.payment_intent,
      charge: refundData.charge,
      amount: refund.amount
    });
    
    return refund;
  } catch (error) {
    logger.error({
      message: 'Error creating refund',
      paymentIntent: refundData.payment_intent,
      charge: refundData.charge,
      amount: refundData.amount,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error creating refund: ${error.message}`,
        'Stripe',
        { 
          stripeCode: error.code, 
          type: error.type, 
          paymentIntent: refundData.payment_intent,
          charge: refundData.charge 
        }
      );
    }
    
    throw new ExternalServiceError(
      'Error creating refund',
      'Stripe',
      { 
        paymentIntent: refundData.payment_intent,
        charge: refundData.charge,
        originalError: error instanceof Error ? error.message : String(error) 
      }
    );
  }
}

/**
 * Creates a payment method for future use
 * 
 * @param paymentMethodData Payment method data
 * @returns Created payment method
 */
export async function createPaymentMethod(
  paymentMethodData: {
    type: string;
    card?: Stripe.PaymentMethodCreateParams.Card;
    billing_details?: Stripe.PaymentMethodCreateParams.BillingDetails;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.PaymentMethod> {
  try {
    const stripe = getStripeInstance();
    
    const paymentMethodParams: Stripe.PaymentMethodCreateParams = {
      type: paymentMethodData.type as Stripe.PaymentMethodCreateParams.Type,
    };
    
    // Add card data if provided
    if (paymentMethodData.card) {
      paymentMethodParams.card = paymentMethodData.card;
    }
    
    // Add billing details if provided
    if (paymentMethodData.billing_details) {
      paymentMethodParams.billing_details = paymentMethodData.billing_details;
    }
    
    // Add metadata if provided
    if (paymentMethodData.metadata) {
      paymentMethodParams.metadata = paymentMethodData.metadata;
    }
    
    const paymentMethod = await stripe.paymentMethods.create(paymentMethodParams);
    
    logger.info({
      message: 'Payment method created successfully',
      paymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
      // Logging only last 4 digits for security
      last4: paymentMethod.card?.last4
    });
    
    return paymentMethod;
  } catch (error) {
    logger.error({
      message: 'Error creating payment method',
      type: paymentMethodData.type,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error creating payment method: ${error.message}`,
        'Stripe',
        { stripeCode: error.code, type: error.type }
      );
    }
    
    throw new ExternalServiceError(
      'Error creating payment method',
      'Stripe',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Detaches a payment method from a customer
 * 
 * @param paymentMethodId ID of the payment method to delete
 * @returns Detached payment method
 */
export async function deletePaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  try {
    const stripe = getStripeInstance();
    
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    
    logger.info({
      message: 'Payment method detached successfully',
      paymentMethodId
    });
    
    return paymentMethod;
  } catch (error) {
    logger.error({
      message: 'Error detaching payment method',
      paymentMethodId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error detaching payment method: ${error.message}`,
        'Stripe',
        { stripeCode: error.code, type: error.type, paymentMethodId }
      );
    }
    
    throw new ExternalServiceError(
      'Error detaching payment method',
      'Stripe',
      { paymentMethodId, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Lists payment methods for a customer
 * 
 * @param customerId ID of the customer to list payment methods for
 * @param type Type of payment methods to list
 * @param options Additional options for listing payment methods
 * @returns List of payment methods
 */
export async function listPaymentMethods(
  customerId: string,
  type: PaymentTypes.PaymentMethodType,
  options?: {
    limit?: number;
    starting_after?: string;
    ending_before?: string;
  }
): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
  try {
    const stripe = getStripeInstance();
    
    const listParams: Stripe.PaymentMethodListParams = {
      customer: customerId,
      type: type.toString().toLowerCase() as Stripe.PaymentMethodListParams.Type
    };
    
    // Add options if provided
    if (options?.limit) listParams.limit = options.limit;
    if (options?.starting_after) listParams.starting_after = options.starting_after;
    if (options?.ending_before) listParams.ending_before = options.ending_before;
    
    return await stripe.paymentMethods.list(listParams);
  } catch (error) {
    logger.error({
      message: 'Error listing payment methods',
      customerId,
      type,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error listing payment methods: ${error.message}`,
        'Stripe',
        { stripeCode: error.code, type: error.type, customerId }
      );
    }
    
    throw new ExternalServiceError(
      'Error listing payment methods',
      'Stripe',
      { customerId, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Sets a payment method as the default for a customer
 * 
 * @param customerId ID of the customer to update
 * @param paymentMethodId ID of the payment method to set as default
 * @returns Updated customer object
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  try {
    const stripe = getStripeInstance();
    
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    
    logger.info({
      message: 'Default payment method updated successfully',
      customerId,
      paymentMethodId
    });
    
    return customer;
  } catch (error) {
    logger.error({
      message: 'Error setting default payment method',
      customerId,
      paymentMethodId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error setting default payment method: ${error.message}`,
        'Stripe',
        { stripeCode: error.code, type: error.type, customerId, paymentMethodId }
      );
    }
    
    throw new ExternalServiceError(
      'Error setting default payment method',
      'Stripe',
      { 
        customerId, 
        paymentMethodId,
        originalError: error instanceof Error ? error.message : String(error) 
      }
    );
  }
}

/**
 * Creates a payment intent for escrow payments with appropriate metadata
 * 
 * @param escrowData Escrow payment data
 * @returns Created payment intent for escrow
 */
export async function createEscrowPayment(
  escrowData: {
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, string>;
    partnershipId: string;
    milestoneName?: string;
    milestoneId?: string;
    senderId: string;
    recipientId: string;
    brandId: string;
    creatorId: string;
    payment_method?: string;
    customer?: string;
  }
): Promise<Stripe.PaymentIntent> {
  try {
    // Prepare payment intent data with escrow-specific settings
    const paymentIntentData = {
      amount: escrowData.amount,
      currency: escrowData.currency,
      description: escrowData.description || `Escrow payment for partnership ${escrowData.partnershipId}`,
      // Set capture method to manual for escrow
      capture_method: 'manual' as Stripe.PaymentIntentCreateParams.CaptureMethod,
      metadata: {
        ...escrowData.metadata,
        partnershipId: escrowData.partnershipId,
        escrow: 'true',
        brandId: escrowData.brandId,
        creatorId: escrowData.creatorId,
        senderId: escrowData.senderId,
        recipientId: escrowData.recipientId,
        ...(escrowData.milestoneId && { milestoneId: escrowData.milestoneId }),
        ...(escrowData.milestoneName && { milestoneName: escrowData.milestoneName })
      },
      payment_method: escrowData.payment_method,
      customer: escrowData.customer,
      // Calculate platform fee
      application_fee_amount: Math.round(escrowData.amount * (PLATFORM_FEE_PERCENTAGE / 100))
    };
    
    logger.info({
      message: 'Creating escrow payment intent',
      amount: escrowData.amount,
      currency: escrowData.currency,
      partnershipId: escrowData.partnershipId
    });
    
    // Create the payment intent using the main function
    return await createPaymentIntent(paymentIntentData);
  } catch (error) {
    logger.error({
      message: 'Error creating escrow payment',
      partnershipId: escrowData.partnershipId,
      amount: escrowData.amount,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error creating escrow payment: ${error.message}`,
        'Stripe',
        { 
          stripeCode: error.code, 
          type: error.type, 
          partnershipId: escrowData.partnershipId 
        }
      );
    }
    
    throw new ExternalServiceError(
      'Error creating escrow payment',
      'Stripe',
      { 
        partnershipId: escrowData.partnershipId,
        originalError: error instanceof Error ? error.message : String(error) 
      }
    );
  }
}

/**
 * Releases funds from escrow by capturing the payment and creating a transfer
 * 
 * @param paymentIntentId ID of the payment intent to capture
 * @param recipientId ID of the recipient to transfer funds to
 * @param amount Amount to release from escrow
 * @param metadata Additional metadata for the transfer
 * @returns Object containing the captured payment intent and created transfer
 */
export async function releaseEscrowedFunds(
  paymentIntentId: string,
  recipientId: string,
  amount: number,
  metadata?: Record<string, string>
): Promise<{ paymentIntent: Stripe.PaymentIntent, transfer: Stripe.Transfer }> {
  try {
    // First retrieve the payment intent to verify it's in the correct state
    const paymentIntent = await retrievePaymentIntent(paymentIntentId);
    
    if (paymentIntent.status !== 'requires_capture') {
      throw new Error(`Payment intent is in ${paymentIntent.status} state, not 'requires_capture'`);
    }
    
    // Capture the payment
    const capturedPayment = await capturePaymentIntent(paymentIntentId, amount);
    
    // Calculate platform fee
    const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENTAGE / 100));
    const transferAmount = amount - platformFee;
    
    // Create transfer to the recipient
    const transfer = await createTransfer(
      recipientId,
      transferAmount,
      capturedPayment.currency,
      {
        description: `Release from escrow for payment ${paymentIntentId}`,
        metadata: {
          ...metadata,
          escrow_release: 'true',
          payment_intent_id: paymentIntentId,
          original_amount: amount.toString(),
          platform_fee: platformFee.toString()
        }
      }
    );
    
    logger.info({
      message: 'Successfully released funds from escrow',
      paymentIntentId,
      recipientId,
      amount,
      transferAmount,
      platformFee,
      transferId: transfer.id
    });
    
    return {
      paymentIntent: capturedPayment,
      transfer
    };
  } catch (error) {
    logger.error({
      message: 'Error releasing funds from escrow',
      paymentIntentId,
      recipientId,
      amount,
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new ExternalServiceError(
        `Stripe error releasing escrow funds: ${error.message}`,
        'Stripe',
        { 
          stripeCode: error.code, 
          type: error.type, 
          paymentIntentId,
          recipientId 
        }
      );
    }
    
    throw new ExternalServiceError(
      'Error releasing escrow funds',
      'Stripe',
      { 
        paymentIntentId,
        recipientId,
        originalError: error instanceof Error ? error.message : String(error) 
      }
    );
  }
}

/**
 * Validates a webhook signature from Stripe
 * 
 * @param payload Raw request body as string
 * @param signature Stripe signature from request headers
 * @returns Validated Stripe event
 */
export async function validateWebhookSignature(
  payload: string,
  signature: string
): Promise<Stripe.Event> {
  try {
    const stripe = getStripeInstance();
    const webhookSecret = stripeConfig.webhookSecret;
    
    // Use Stripe's constructEvent to validate signature
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (error) {
    logger.error({
      message: 'Invalid webhook signature',
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw new ExternalServiceError(
      'Invalid webhook signature',
      'Stripe',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}