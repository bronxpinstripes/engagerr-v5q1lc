import Stripe from 'stripe'; // ^12.0.0
import { getStripeInstance, stripeConfig } from '../../config/stripe';
import { logger } from '../../utils/logger';
import { ApiError, ExternalServiceError } from '../../utils/errors';
import { processSubscriptionWebhook } from './subscription';
import { PaymentService } from '../../services/payment';
import { EscrowService } from '../../transactions/escrow';

/**
 * Constructs a validated Stripe event from webhook payload and signature
 * 
 * @param payload Raw request body as string
 * @param signature Stripe signature from request headers
 * @returns {Promise<Stripe.Event>} Validated Stripe event
 */
async function constructStripeEvent(payload: string, signature: string): Promise<Stripe.Event> {
  try {
    // LD1: Get Stripe instance using getStripeInstance()
    const stripe = getStripeInstance();

    // LD2: Retrieve webhook secret from stripeConfig
    const webhookSecret = stripeConfig.webhookSecret;

    // LD3: Use Stripe's constructEvent method to validate signature
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    // LD4: Return the constructed event if signature is valid
    return event;
  } catch (error: any) {
    // LD5: Throw appropriate error if signature validation fails
    logger.error({
      message: 'Stripe webhook signature verification failed',
      error: error.message,
    });
    throw new ExternalServiceError('Stripe webhook signature verification failed', 'Stripe', {
      originalError: error.message,
    });
  }
}

/**
 * Processes a validated Stripe webhook event and routes to appropriate handler
 * 
 * @param {Stripe.Event} event Validated Stripe webhook event
 * @returns {Promise<object>} Processing result
 */
async function processWebhookEvent(event: Stripe.Event): Promise<object> {
  // LD1: Log the incoming webhook event type and ID
  logger.info({
    message: 'Processing Stripe webhook event',
    eventType: event.type,
    eventId: event.id,
  });

  try {
    // LD2: Determine event category based on event type prefix
    const eventCategory = event.type.split('.')[0];

    // LD3: Route payment_intent events to handlePaymentIntentEvents
    if (eventCategory === 'payment_intent') {
      return await handlePaymentIntentEvents(event);
    }

    // LD4: Route charge events to handleChargeEvents
    if (eventCategory === 'charge') {
      return await handleChargeEvents(event);
    }

    // LD5: Route subscription events to handleSubscriptionEvents
    if (eventCategory === 'customer' && event.type.includes('subscription')) {
      return await handleSubscriptionEvents(event);
    }

    // LD6: Route invoice events to handleInvoiceEvents
    if (eventCategory === 'invoice') {
      return await handleInvoiceEvents(event);
    }

    // LD7: Route transfer events to handleTransferEvents
    if (eventCategory === 'transfer') {
      return await handleTransferEvents(event);
    }

    // LD8: Log warning for unhandled event types
    logger.warn({
      message: 'Unhandled Stripe webhook event type',
      eventType: event.type,
      eventId: event.id,
    });

    // LD9: Return processing result with event type and status
    return {
      success: true,
      eventType: event.type,
      status: 'unhandled',
    };
  } catch (error: any) {
    logger.error({
      message: 'Error processing Stripe webhook event',
      eventType: event.type,
      eventId: event.id,
      error: error.message,
    });
    throw error; // Re-throw the error for upstream handling
  }
}

/**
 * Handles payment intent related webhook events
 * 
 * @param {Stripe.Event} event Validated Stripe webhook event
 * @returns {Promise<object>} Processing result
 */
async function handlePaymentIntentEvents(event: Stripe.Event): Promise<object> {
  // LD1: Extract payment intent data from event object
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  // LD2: Determine specific event subtype (succeeded, failed, canceled, etc.)
  const eventType = event.type;

  try {
    // LD3: For payment_intent.succeeded events, call handlePaymentIntentSucceeded
    if (eventType === 'payment_intent.succeeded') {
      return await handlePaymentIntentSucceeded(paymentIntent);
    }

    // LD4: For payment_intent.payment_failed events, call handlePaymentIntentFailed
    if (eventType === 'payment_intent.payment_failed') {
      return await handlePaymentIntentFailed(paymentIntent);
    }

    // LD5: For other payment intent events, update payment status accordingly
    logger.info({
      message: 'Processing Stripe payment intent event',
      paymentIntentId: paymentIntent.id,
      eventType: event.type,
    });

    // LD6: Return processing result with event details and actions taken
    return {
      success: true,
      eventType: event.type,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error: any) {
    logger.error({
      message: 'Error handling Stripe payment intent event',
      paymentIntentId: paymentIntent.id,
      eventType: event.type,
      error: error.message,
    });
    throw error; // Re-throw the error for upstream handling
  }
}

/**
 * Handles charge related webhook events
 * 
 * @param {Stripe.Event} event Validated Stripe webhook event
 * @returns {Promise<object>} Processing result
 */
async function handleChargeEvents(event: Stripe.Event): Promise<object> {
  // LD1: Extract charge data from event object
  const charge = event.data.object as Stripe.Charge;

  // LD2: Determine specific event subtype (succeeded, failed, refunded, etc.)
  const eventType = event.type;

  try {
    // LD3: For charge.succeeded events, update associated payment records
    if (eventType === 'charge.succeeded') {
      // Implement logic to update payment records based on charge data
      logger.info({
        message: 'Processing Stripe charge succeeded event',
        chargeId: charge.id,
        paymentIntentId: charge.payment_intent,
      });
    }

    // LD4: For charge.failed events, update payment status and notify if needed
    if (eventType === 'charge.failed') {
      // Implement logic to update payment status and notify users
      logger.warn({
        message: 'Processing Stripe charge failed event',
        chargeId: charge.id,
        paymentIntentId: charge.payment_intent,
        failureCode: charge.failure_code,
        failureMessage: charge.failure_message,
      });
    }

    // LD5: For charge.refunded events, process refund in system
    if (eventType === 'charge.refunded') {
      // Implement logic to process refund in the system
      logger.info({
        message: 'Processing Stripe charge refunded event',
        chargeId: charge.id,
        paymentIntentId: charge.payment_intent,
        refundAmount: charge.amount_refunded,
      });
    }

    // LD6: Return processing result with event details and actions taken
    return {
      success: true,
      eventType: event.type,
      chargeId: charge.id,
      paymentIntentId: charge.payment_intent,
    };
  } catch (error: any) {
    logger.error({
      message: 'Error handling Stripe charge event',
      chargeId: charge.id,
      eventType: event.type,
      error: error.message,
    });
    throw error; // Re-throw the error for upstream handling
  }
}

/**
 * Handles subscription related webhook events
 * 
 * @param {Stripe.Event} event Validated Stripe webhook event
 * @returns {Promise<object>} Processing result from subscription handler
 */
async function handleSubscriptionEvents(event: Stripe.Event): Promise<object> {
  // LD1: Call processSubscriptionWebhook from subscription module
  // LD2: Return processing result from subscription handler
  return await processSubscriptionWebhook(event);
}

/**
 * Handles invoice related webhook events
 * 
 * @param {Stripe.Event} event Validated Stripe webhook event
 * @returns {Promise<object>} Processing result
 */
async function handleInvoiceEvents(event: Stripe.Event): Promise<object> {
  // LD1: Extract invoice data from event object
  const invoice = event.data.object as Stripe.Invoice;

  // LD2: Determine specific event subtype (payment_succeeded, payment_failed, etc.)
  const eventType = event.type;

  try {
    // LD3: For invoice.payment_succeeded events, update subscription or payment status
    if (eventType === 'invoice.payment_succeeded') {
      // Implement logic to update subscription or payment status
      logger.info({
        message: 'Processing Stripe invoice payment succeeded event',
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        customerId: invoice.customer,
      });
    }

    // LD4: For invoice.payment_failed events, handle failed payment and notification
    if (eventType === 'invoice.payment_failed') {
      // Implement logic to handle failed payment and notify users
      logger.warn({
        message: 'Processing Stripe invoice payment failed event',
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        customerId: invoice.customer,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
      });
    }

    // LD5: Return processing result with event details and actions taken
    return {
      success: true,
      eventType: event.type,
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
    };
  } catch (error: any) {
    logger.error({
      message: 'Error handling Stripe invoice event',
      invoiceId: invoice.id,
      eventType: event.type,
      error: error.message,
    });
    throw error; // Re-throw the error for upstream handling
  }
}

/**
 * Handles transfer related webhook events
 * 
 * @param {Stripe.Event} event Validated Stripe webhook event
 * @returns {Promise<object>} Processing result
 */
async function handleTransferEvents(event: Stripe.Event): Promise<object> {
  // LD1: Extract transfer data from event object
  const transfer = event.data.object as Stripe.Transfer;

  try {
    // LD2: For transfer.created events, call handleTransferCreated
    if (event.type === 'transfer.created') {
      return await handleTransferCreated(transfer);
    }

    // LD3: For transfer.failed events, handle failure and notify affected parties
    if (event.type === 'transfer.failed') {
      // Implement logic to handle transfer failure and notify users
      logger.warn({
        message: 'Processing Stripe transfer failed event',
        transferId: transfer.id,
        failureCode: transfer.failure_code,
        failureMessage: transfer.failure_message,
      });
    }

    // LD4: Return processing result with event details and actions taken
    return {
      success: true,
      eventType: event.type,
      transferId: transfer.id,
    };
  } catch (error: any) {
    logger.error({
      message: 'Error handling Stripe transfer event',
      transferId: transfer.id,
      eventType: event.type,
      error: error.message,
    });
    throw error; // Re-throw the error for upstream handling
  }
}

/**
 * Handles successful payment intent webhook events
 * 
 * @param {Stripe.PaymentIntent} paymentIntent Stripe PaymentIntent object
 * @returns {Promise<object>} Processing result
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<object> {
  // LD1: Extract payment details and metadata from payment intent
  const paymentId = paymentIntent.metadata.paymentId;

  try {
    // LD2: Check if payment is for subscription, regular payment, or escrow
    // LD3: For escrow payments, call EscrowService.handlePaymentSuccess
    // LD4: For regular payments, update payment status via PaymentService
    if (paymentIntent.metadata.escrow === 'true') {
      // Call EscrowService to handle successful escrow payment
      const escrowService = new EscrowService();
      await escrowService.holdFunds(paymentIntent.id, paymentId);
      logger.info({ paymentIntentId: paymentIntent.id }, 'Escrow payment intent succeeded');
    } else {
      // Call PaymentService to update payment status
      const paymentService = new PaymentService();
      await paymentService.processPaymentSuccessService(paymentIntent.id);
      logger.info({ paymentIntentId: paymentIntent.id }, 'Payment intent succeeded');
    }

    // LD5: Handle any additional business logic based on payment type

    // LD6: Return processing result with payment details and actions taken
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error: any) {
    logger.error({
      message: 'Error handling successful Stripe payment intent event',
      paymentIntentId: paymentIntent.id,
      error: error.message,
    });
    throw error; // Re-throw the error for upstream handling
  }
}

/**
 * Handles failed payment intent webhook events
 * 
 * @param {Stripe.PaymentIntent} paymentIntent Stripe PaymentIntent object
 * @returns {Promise<object>} Processing result
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<object> {
  // LD1: Extract payment details, error information, and metadata from payment intent
  const paymentId = paymentIntent.metadata.paymentId;
  const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

  try {
    // LD2: Check if payment is for subscription, regular payment, or escrow
    // LD3: For escrow payments, call EscrowService.handlePaymentFailure
    // LD4: For regular payments, update payment status via PaymentService
    if (paymentIntent.metadata.escrow === 'true') {
      // Call EscrowService to handle failed escrow payment
      const escrowService = new EscrowService();
      // Implement handlePaymentFailure method in EscrowService
      // await escrowService.handlePaymentFailure(paymentIntent.id, errorMessage);
      logger.warn({ paymentIntentId: paymentIntent.id }, 'Escrow payment intent failed');
    } else {
      // Call PaymentService to update payment status
      const paymentService = new PaymentService();
      await paymentService.processPaymentFailureService(paymentIntent.id, errorMessage);
      logger.warn({ paymentIntentId: paymentIntent.id }, 'Payment intent failed');
    }

    // LD5: Handle notification to affected users about payment failure

    // LD6: Return processing result with failure details and actions taken
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      errorMessage: errorMessage,
    };
  } catch (error: any) {
    logger.error({
      message: 'Error handling failed Stripe payment intent event',
      paymentIntentId: paymentIntent.id,
      error: error.message,
    });
    throw error; // Re-throw the error for upstream handling
  }
}

/**
 * Handles transfer created webhook events
 * 
 * @param {Stripe.Transfer} transfer Stripe Transfer object
 * @returns {Promise<object>} Processing result
 */
async function handleTransferCreated(transfer: Stripe.Transfer): Promise<object> {
  // LD1: Extract transfer details and metadata
  const transferId = transfer.id;
  const destination = transfer.destination;
  const amount = transfer.amount;
  const currency = transfer.currency;

  try {
    // LD2: Update associated payment or escrow records
    // Implement logic to update payment or escrow records with transfer details
    logger.info({
      message: 'Processing Stripe transfer created event',
      transferId: transferId,
      destination: destination,
      amount: amount,
      currency: currency,
    });

    // LD3: Handle notification to recipient about successful transfer
    // Implement logic to notify recipient about successful transfer

    // LD4: Return processing result with transfer details and actions taken
    return {
      success: true,
      transferId: transferId,
      destination: destination,
      amount: amount,
      currency: currency,
    };
  } catch (error: any) {
    logger.error({
      message: 'Error handling Stripe transfer created event',
      transferId: transferId,
      error: error.message,
    });
    throw error; // Re-throw the error for upstream handling
  }
}

/**
 * Logs webhook event details for audit and debugging
 * 
 * @param {Stripe.Event} event Stripe webhook event
 * @returns {void} No return value
 */
function logWebhookEvent(event: Stripe.Event): void {
  // LD1: Extract event ID, type, and created timestamp
  const eventId = event.id;
  const eventType = event.type;
  const eventCreated = new Date(event.created * 1000).toISOString();

  // LD2: Safely extract relevant data from event object removing sensitive information
  let eventData: any;
  try {
    eventData = JSON.parse(JSON.stringify(event.data.object)); // Clone and stringify
    // Redact sensitive information from eventData
    // Example: delete eventData.account_number;
  } catch (error: any) {
    logger.warn({
      message: 'Failed to stringify event data for logging',
      eventId,
      eventType,
      error: error.message,
    });
    eventData = 'Failed to extract event data';
  }

  // LD3: Log event information at appropriate log level
  logger.debug({
    message: 'Stripe webhook event received',
    eventId,
    eventType,
    eventCreated,
    eventData,
  });

  // LD4: Include additional context for specific event types
  if (eventType === 'payment_intent.succeeded') {
    logger.info({
      message: 'Payment intent succeeded',
      paymentIntentId: (event.data.object as any).id,
    });
  }
}

// Export all functions for use in API routes
export {
  constructStripeEvent,
  processWebhookEvent,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleTransferCreated,
};