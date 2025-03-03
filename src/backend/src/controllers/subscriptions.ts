import { Request, Response } from 'express';
import Stripe from 'stripe';
import {
  createSubscription,
  getSubscription,
  getUserSubscription,
  updateSubscriptionStatus,
  changeSubscriptionTier,
  cancelSubscription,
  reactivateSubscription,
  createBillingPortalSession,
  checkFeatureAccess,
  getSubscriptionFeatures,
  handleStripeWebhook,
  getAllUserSubscriptions,
  compareTiers
} from '../services/subscription';
import { handleAsyncError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Creates a new subscription for a user (creator or brand)
 */
export const createSubscriptionController = handleAsyncError(async (req: Request, res: Response) => {
  logger.info({ body: req.body }, 'Creating subscription');
  
  // Extract data from request
  const { tier, userType, paymentMethodId, metadata, returnUrl } = req.body;
  const userId = req.user.id; // Assuming authentication middleware adds user to req
  
  // Call service function
  const result = await createSubscription({
    userId,
    userType,
    tier,
    paymentMethodId,
    metadata,
    returnUrl
  });
  
  // Return response
  res.status(201).json({
    success: true,
    data: result
  });
});

/**
 * Retrieves a subscription by its ID
 */
export const getSubscriptionController = handleAsyncError(async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  
  logger.info({ subscriptionId }, 'Getting subscription details');
  
  const subscription = await getSubscription(subscriptionId);
  
  res.status(200).json({
    success: true,
    data: subscription
  });
});

/**
 * Retrieves the active subscription for the current user
 */
export const getUserSubscriptionController = handleAsyncError(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userType = req.user.userType;
  
  logger.info({ userId, userType }, 'Getting user subscription');
  
  const subscription = await getUserSubscription(userId, userType);
  
  res.status(200).json({
    success: true,
    data: subscription
  });
});

/**
 * Updates the status of a subscription
 */
export const updateSubscriptionStatusController = handleAsyncError(async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const { status, metadata } = req.body;
  
  logger.info({ subscriptionId, status }, 'Updating subscription status');
  
  const updatedSubscription = await updateSubscriptionStatus(subscriptionId, status, metadata);
  
  res.status(200).json({
    success: true,
    data: updatedSubscription
  });
});

/**
 * Changes a subscription to a different tier
 */
export const changeSubscriptionTierController = handleAsyncError(async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const { newTier, immediateChange, metadata } = req.body;
  
  logger.info({ subscriptionId, newTier, immediateChange }, 'Changing subscription tier');
  
  const updatedSubscription = await changeSubscriptionTier(
    subscriptionId,
    newTier,
    immediateChange,
    { metadata }
  );
  
  res.status(200).json({
    success: true,
    data: updatedSubscription
  });
});

/**
 * Cancels an active subscription
 */
export const cancelSubscriptionController = handleAsyncError(async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const { immediateCancel } = req.body;
  
  logger.info({ subscriptionId, immediateCancel }, 'Cancelling subscription');
  
  const cancelledSubscription = await cancelSubscription(subscriptionId, immediateCancel);
  
  res.status(200).json({
    success: true,
    data: cancelledSubscription
  });
});

/**
 * Reactivates a subscription that was scheduled for cancellation
 */
export const reactivateSubscriptionController = handleAsyncError(async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  
  logger.info({ subscriptionId }, 'Reactivating subscription');
  
  const reactivatedSubscription = await reactivateSubscription(subscriptionId);
  
  res.status(200).json({
    success: true,
    data: reactivatedSubscription
  });
});

/**
 * Creates a Stripe billing portal session for subscription management
 */
export const createBillingPortalSessionController = handleAsyncError(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userType = req.user.userType;
  const { returnUrl } = req.body;
  
  logger.info({ userId, userType }, 'Creating billing portal session');
  
  const session = await createBillingPortalSession(userId, userType, returnUrl);
  
  res.status(200).json({
    success: true,
    data: session
  });
});

/**
 * Checks if a user has access to a specific feature based on their subscription
 */
export const checkFeatureAccessController = handleAsyncError(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userType = req.user.userType;
  const { featureKey } = req.query;
  
  logger.info({ userId, userType, featureKey }, 'Checking feature access');
  
  const hasAccess = await checkFeatureAccess(userId, userType, featureKey as string);
  
  res.status(200).json({
    success: true,
    data: { hasAccess }
  });
});

/**
 * Retrieves the features available for a specific subscription tier
 */
export const getSubscriptionFeaturesController = handleAsyncError(async (req: Request, res: Response) => {
  const { tier, userType } = req.query;
  
  logger.info({ tier, userType }, 'Getting subscription features');
  
  const features = getSubscriptionFeatures(tier as string, userType as string);
  
  res.status(200).json({
    success: true,
    data: { features }
  });
});

/**
 * Processes webhook events from Stripe related to subscriptions
 * 
 * This controller doesn't use handleAsyncError because webhook processing
 * requires special error handling with specific status codes for Stripe.
 * 
 * Note: Requires Express to be configured to preserve raw request body for signature verification
 * Often done with bodyParser.raw({type: 'application/json'}) for the webhook route
 */
export const handleStripeWebhookController = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      logger.error('Stripe webhook missing signature');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    
    logger.info('Processing Stripe webhook');
    
    // Get the raw body - access depends on middleware configuration
    // Express may store it as rawBody, as a buffer, or other ways
    const rawBody = req.rawBody || req.body;
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
    
    // Process the webhook
    const result = await handleStripeWebhook(event);
    
    logger.info({ eventType: event.type }, 'Stripe webhook processed successfully');
    
    // Stripe expects a 200 response
    return res.status(200).json({ received: true, result });
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 'Error processing Stripe webhook');
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('signature')) {
        return res.status(400).json({ error: 'Invalid signature' });
      } else if (error.message.includes('No signatures found')) {
        return res.status(400).json({ error: 'No signatures found' });
      }
    }
    
    return res.status(400).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Retrieves all subscriptions (current and historical) for a user
 */
export const getAllUserSubscriptionsController = handleAsyncError(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userType = req.user.userType;
  
  logger.info({ userId, userType }, 'Getting all user subscriptions');
  
  const subscriptions = await getAllUserSubscriptions(userId, userType);
  
  res.status(200).json({
    success: true,
    data: subscriptions
  });
});

/**
 * Generates comparison data of features between different subscription tiers
 */
export const compareTiersController = handleAsyncError(async (req: Request, res: Response) => {
  const { userType } = req.query;
  
  logger.info({ userType }, 'Comparing subscription tiers');
  
  const comparison = compareTiers(userType as string);
  
  res.status(200).json({
    success: true,
    data: comparison
  });
});