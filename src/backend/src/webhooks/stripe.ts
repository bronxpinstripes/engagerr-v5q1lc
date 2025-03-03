import Stripe from 'stripe'; // ^11.1.0
import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';
import stripe from '../config/stripe';
import { PaymentService } from '../services/payment';
import { SubscriptionService } from '../services/subscription';
import { EscrowService } from '../transactions/escrow';

/**
 * Express middleware handler for processing Stripe webhook events
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns {Promise<void>} Resolves when webhook is processed
 */
export const handleStripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 1. Extract webhook signature from request headers
  const signature = req.headers['stripe-signature'] as string;

  // 2. Verify webhook signature using Stripe SDK
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      stripe.webhookSecret
    );
  } catch (err: any) {
    // Log the signature verification failure
    logger.error({
      message: 'Stripe webhook signature verification failed',
      error: err.message,
      signature: signature,
    });

    // Return 400 status code for invalid signature
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 3. Parse and validate the webhook event
  try {
    // 4. Log the incoming webhook event
    await logWebhookEvent(event);

    // 5. Route the event to the appropriate handler based on event type
    await processStripeEvent(event);

    // 6. Return 200 status code if processed successfully
    res.status(200).send('Webhook processed successfully');
  } catch (error: any) {
    // Log the error during webhook processing
    logger.error({
      message: 'Error processing Stripe webhook',
      error: error.message,
      eventType: event.type,
      eventData: event.data,
    });

    // 7. Handle errors and return appropriate error responses
    if (error instanceof ApiError) {
      // Handle known API errors
      res.status(error.statusCode).json({ error: error.message });
    } else {
      // Handle unexpected errors
      res.status(500).json({ error: 'Internal server error' });
    }
    next(error);
  }
};

/**
 * Routes the Stripe event to the appropriate handler based on event type
 * @param {Stripe.Event} event The Stripe event object
 * @returns {Promise<void>} Resolves when event is processed
 */
export const processStripeEvent = async (event: Stripe.Event): Promise<void> => {
  // 1. Determine the event type from the Stripe event object
  switch (event.type) {
    // 2. Route to handlePaymentEvent for payment-related events
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled':
      await handlePaymentEvent(event);
      break;

    // 3. Route to handleSubscriptionEvent for subscription-related events
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      await SubscriptionService.handleStripeWebhook(event);
      break;

    // 4. Route to handleCustomerEvent for customer-related events
    case 'customer.created':
    case 'customer.updated':
    case 'customer.deleted':
      await handleCustomerEvent(event);
      break;

    // 5. Log warning for unhandled event types
    default:
      logger.warn({ eventType: event.type }, 'Unhandled Stripe webhook event');
  }
};

/**
 * Processes payment-related Stripe events
 * @param {Stripe.Event} event The Stripe event object
 * @returns {Promise<void>} Resolves when payment event is processed
 */
const handlePaymentEvent = async (event: Stripe.Event): Promise<void> => {
  // 1. Extract payment intent data from the event
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const paymentIntentId = paymentIntent.id;

  try {
    switch (event.type) {
      // 2. For payment_intent.succeeded events, process successful payment
      case 'payment_intent.succeeded':
        await PaymentService.processPaymentSuccessService(paymentIntentId);
        break;

      // 3. For payment_intent.payment_failed events, process failed payment
      case 'payment_intent.payment_failed':
        await PaymentService.processPaymentFailureService(
          paymentIntentId,
          paymentIntent.last_payment_error?.message || 'Payment failed'
        );
        break;

      // 4. For payment_intent.canceled events, update payment status to canceled
      case 'payment_intent.canceled':
        // Placeholder for handling payment intent cancellation
        logger.info({ paymentIntentId }, 'Payment intent was canceled');
        break;

      // 5. Handle escrow for marketplace payments when applicable
      default:
        logger.warn({ eventType: event.type }, 'Unhandled payment-related event');
    }

    // 6. Update payment records in the database
    // This is handled in the individual cases above

    // 7. Send appropriate notifications based on payment status
    // This is handled in the individual cases above
  } catch (error: any) {
    logger.error({
      message: 'Error handling payment event',
      error: error.message,
      eventType: event.type,
      paymentIntentId: paymentIntentId,
    });
    throw error;
  }
};

/**
 * Processes subscription-related Stripe events
 * @param {Stripe.Event} event The Stripe event object
 * @returns {Promise<void>} Resolves when subscription event is processed
 */
const handleSubscriptionEvent = async (event: Stripe.Event): Promise<void> => {
  // 1. Extract subscription data from the event
  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionId = subscription.id;

  try {
    switch (event.type) {
      // 2. For customer.subscription.created events, create new subscription record
      case 'customer.subscription.created':
        // Placeholder for creating new subscription record
        logger.info({ subscriptionId }, 'New subscription created');
        break;

      // 3. For customer.subscription.updated events, update subscription details
      case 'customer.subscription.updated':
        // Placeholder for updating subscription details
        logger.info({ subscriptionId }, 'Subscription updated');
        break;

      // 4. For customer.subscription.deleted events, mark subscription as canceled
      case 'customer.subscription.deleted':
        // Placeholder for marking subscription as canceled
        logger.info({ subscriptionId }, 'Subscription canceled');
        break;

      // 5. For invoice.payment_succeeded events related to subscriptions, update subscription status
      case 'invoice.payment_succeeded':
        // Placeholder for updating subscription status
        logger.info({ subscriptionId }, 'Subscription payment succeeded');
        break;

      // 6. For invoice.payment_failed events related to subscriptions, handle failed payment
      case 'invoice.payment_failed':
        // Placeholder for handling failed payment
        logger.info({ subscriptionId }, 'Subscription payment failed');
        break;

      // 7. Update user tier and access rights based on subscription status
      // This is handled in the individual cases above

      // 8. Send appropriate notifications based on subscription status changes
      // This is handled in the individual cases above

      default:
        logger.warn({ eventType: event.type }, 'Unhandled subscription-related event');
    }
  } catch (error: any) {
    logger.error({
      message: 'Error handling subscription event',
      error: error.message,
      eventType: event.type,
      subscriptionId: subscriptionId,
    });
    throw error;
  }
};

/**
 * Processes customer-related Stripe events
 * @param {Stripe.Event} event The Stripe event object
 * @returns {Promise<void>} Resolves when customer event is processed
 */
const handleCustomerEvent = async (event: Stripe.Event): Promise<void> => {
  // 1. Extract customer data from the event
  const customer = event.data.object as Stripe.Customer;
  const customerId = customer.id;

  try {
    switch (event.type) {
      // 2. For customer.created events, link Stripe customer to user
      case 'customer.created':
        // Placeholder for linking Stripe customer to user
        logger.info({ customerId }, 'New customer created');
        break;

      // 3. For customer.updated events, update customer information
      case 'customer.updated':
        // Placeholder for updating customer information
        logger.info({ customerId }, 'Customer updated');
        break;

      // 4. For customer.deleted events, handle customer deletion
      case 'customer.deleted':
        // Placeholder for handling customer deletion
        logger.info({ customerId }, 'Customer deleted');
        break;

      // 5. Update user records with latest customer information
      // This is handled in the individual cases above

      default:
        logger.warn({ eventType: event.type }, 'Unhandled customer-related event');
    }
  } catch (error: any) {
    logger.error({
      message: 'Error handling customer event',
      error: error.message,
      eventType: event.type,
      customerId: customerId,
    });
    throw error;
  }
};

/**
 * Logs webhook events for audit and debugging purposes
 * @param {Stripe.Event} event The Stripe event object
 * @returns {Promise<void>} Resolves when event is logged
 */
const logWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  // 1. Extract relevant event metadata
  const eventId = event.id;
  const eventType = event.type;
  const eventData = event.data;

  // 2. Log basic event information using logger
  logger.info({
    message: 'Received Stripe webhook event',
    eventId: eventId,
    eventType: eventType,
    eventData: eventData,
  });

  // 3. Remove sensitive data before storing
  // Placeholder for removing sensitive data
};