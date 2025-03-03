/**
 * Subscription Service
 * 
 * Manages subscription functionality for both creators and brands, handling subscription lifecycle
 * including creation, updates, cancellation, and tier changes. Integrates with Stripe for payment
 * processing and maintains subscription state in the database.
 */

import Stripe from 'stripe'; // v12.0.0
import { prisma } from '../config/database';
import { 
  AppError, 
  NotFoundError, 
  ValidationError,
  ExternalServiceError 
} from '../utils/errors';
import { logger } from '../utils/logger';
import { 
  createCustomer, 
  retrieveCustomer, 
  createSubscription as createStripeSubscription,
  updateSubscription as updateStripeSubscription,
  cancelSubscription as cancelStripeSubscription,
  changePlan,
  createPortalSession,
  mapStripeStatusToInternal,
  getPriceIdForTier,
  reactivateSubscription as reactivateStripeSubscription,
  processSubscriptionWebhook
} from '../integrations/stripe/subscription';
import { SUBSCRIPTION_PLANS } from '../config/constants';
import { 
  createSubscription as createSubscriptionDb,
  getSubscriptionById, 
  getUserSubscription,
  updateSubscription,
  cancelSubscription as cancelSubscriptionDb,
  handleSubscriptionWebhook,
  checkSubscriptionAccess,
  getSubscriptionFeatures
} from '../models/subscription';

/**
 * Creates a new subscription for a user (creator or brand) with the specified tier
 * 
 * @param data Subscription creation data
 * @returns Created subscription with payment session details
 */
async function createSubscription(data: {
  userId: string;
  userType: 'creator' | 'brand';
  tier: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
}) {
  logger.info({ userId: data.userId, userType: data.userType, tier: data.tier }, 'Creating subscription');
  
  try {
    // Validate input
    if (!data.userId || !data.userType || !data.tier) {
      throw new ValidationError('Missing required subscription data', {
        userId: !data.userId ? 'User ID is required' : undefined,
        userType: !data.userType ? 'User type is required' : undefined,
        tier: !data.tier ? 'Subscription tier is required' : undefined
      });
    }
    
    // Only allow valid user types
    if (data.userType !== 'creator' && data.userType !== 'brand') {
      throw new ValidationError('Invalid user type', { 
        userType: 'Must be either "creator" or "brand"' 
      });
    }
    
    // Check if the tier is valid for the user type
    const userPlans = SUBSCRIPTION_PLANS[data.userType.toUpperCase()];
    if (!userPlans || !userPlans[data.tier]) {
      throw new ValidationError('Invalid subscription tier', { 
        tier: `"${data.tier}" is not a valid tier for ${data.userType}` 
      });
    }
    
    // Check if user already has an active subscription
    const existingSubscription = await getUserSubscription(data.userId, data.userType);
    if (existingSubscription && ['ACTIVE', 'TRIALING'].includes(existingSubscription.status)) {
      throw new ValidationError('User already has an active subscription', {
        existingSubscription: existingSubscription.id
      });
    }
    
    // Get or create Stripe customer
    let stripeCustomerId;
    
    // Check if the user already has a Stripe customer ID in another subscription
    if (existingSubscription && existingSubscription.stripeCustomerId) {
      stripeCustomerId = existingSubscription.stripeCustomerId;
    } else {
      // Get user details from database to create Stripe customer
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true, fullName: true }
      });
      
      if (!user) {
        throw new NotFoundError('User not found', 'User', data.userId);
      }
      
      // Create a Stripe customer
      const customer = await createCustomer({
        email: user.email,
        name: user.fullName || user.email,
        metadata: {
          userId: data.userId,
          userType: data.userType
        }
      });
      
      stripeCustomerId = customer.id;
    }
    
    // Get price ID for the selected tier
    const priceId = getPriceIdForTier(data.tier, data.userType);
    
    // Create subscription record in database with PENDING status
    const subscription = await createSubscriptionDb({
      userId: data.userId,
      userType: data.userType,
      tier: data.tier,
      status: 'PENDING',
      stripeCustomerId: stripeCustomerId,
      metadata: data.metadata || {}
    });
    
    // Determine if we should create a checkout session or use the payment method directly
    let paymentSession = null;
    
    if (data.paymentMethodId) {
      // If payment method is provided, create subscription directly
      const stripeSubscription = await createStripeSubscription(
        stripeCustomerId,
        priceId, 
        {
          paymentMethodId: data.paymentMethodId,
          metadata: {
            subscriptionId: subscription.id,
            userId: data.userId,
            userType: data.userType
          }
        }
      );
      
      // Update subscription with Stripe details
      await updateSubscription(subscription.id, {
        stripeSubscriptionId: stripeSubscription.id,
        status: mapStripeStatusToInternal(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
      });
      
      // If subscription requires action (like 3D Secure), return payment intent details
      const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;
      
      if (paymentIntent && paymentIntent.status === 'requires_action') {
        paymentSession = {
          type: 'payment_intent',
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status
        };
      }
    } else {
      // Create a checkout session for the user to enter payment details
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2023-10-16'
      });
      
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: data.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/account/subscription?success=true`,
        cancel_url: data.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/account/subscription?canceled=true`,
        metadata: {
          subscriptionId: subscription.id,
          userId: data.userId,
          userType: data.userType
        }
      });
      
      paymentSession = {
        type: 'checkout_session',
        id: session.id,
        url: session.url
      };
      
      // Update subscription with session info
      await updateSubscription(subscription.id, {
        checkoutSessionId: session.id
      });
    }
    
    // Return subscription with payment session details
    return {
      subscription: await getSubscriptionById(subscription.id),
      paymentSession
    };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      userId: data.userId,
      userType: data.userType,
      tier: data.tier
    }, 'Failed to create subscription');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Subscription creation failed: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Retrieves a subscription by its ID with detailed information
 * 
 * @param subscriptionId The subscription ID
 * @returns Subscription details with additional metadata
 */
async function getSubscription(subscriptionId: string) {
  logger.info({ subscriptionId }, 'Retrieving subscription');
  
  try {
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required', {
        subscriptionId: 'Required parameter'
      });
    }
    
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription not found', 'Subscription', subscriptionId);
    }
    
    // If subscription has a Stripe ID and is in an active state, sync with Stripe
    if (subscription.stripeSubscriptionId && 
        ['ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID'].includes(subscription.status)) {
      await syncWithStripe(subscriptionId);
      
      // Get the updated subscription after sync
      const updatedSubscription = await getSubscriptionById(subscriptionId);
      if (!updatedSubscription) {
        throw new NotFoundError('Subscription not found after sync', 'Subscription', subscriptionId);
      }
      
      // Add feature details to the subscription
      const features = getSubscriptionFeatures(updatedSubscription.tier, updatedSubscription.userType);
      
      return {
        ...updatedSubscription,
        features
      };
    }
    
    // Add feature details to the subscription
    const features = getSubscriptionFeatures(subscription.tier, subscription.userType);
    
    return {
      ...subscription,
      features
    };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      subscriptionId
    }, 'Failed to retrieve subscription');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to retrieve subscription: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Retrieves the active subscription for a specific user
 * 
 * @param userId The user ID
 * @param userType The user type (creator or brand)
 * @returns User's active subscription or free tier details if none exists
 */
async function getUserSubscription(userId: string, userType: string) {
  logger.info({ userId, userType }, 'Getting user subscription');
  
  try {
    if (!userId || !userType) {
      throw new ValidationError('Missing required parameters', {
        userId: !userId ? 'User ID is required' : undefined,
        userType: !userType ? 'User type is required' : undefined
      });
    }
    
    // Only allow valid user types
    if (userType !== 'creator' && userType !== 'brand') {
      throw new ValidationError('Invalid user type', { 
        userType: 'Must be either "creator" or "brand"' 
      });
    }
    
    // Get user's active subscription
    const subscription = await getUserSubscription(userId, userType);
    
    // If user has an active subscription with a Stripe ID, sync it first
    if (subscription && 
        subscription.stripeSubscriptionId && 
        ['ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID'].includes(subscription.status)) {
      await syncWithStripe(subscription.id);
      
      // Get the updated subscription after sync
      const updatedSubscription = await getSubscriptionById(subscription.id);
      if (!updatedSubscription) {
        throw new NotFoundError('Subscription not found after sync', 'Subscription', subscription.id);
      }
      
      // Add feature details to the subscription
      const features = getSubscriptionFeatures(updatedSubscription.tier, updatedSubscription.userType);
      
      return {
        ...updatedSubscription,
        features,
        isActive: ['ACTIVE', 'TRIALING'].includes(updatedSubscription.status)
      };
    }
    
    // If user has a subscription (even if not active), return it with features
    if (subscription) {
      const features = getSubscriptionFeatures(subscription.tier, subscription.userType);
      
      return {
        ...subscription,
        features,
        isActive: ['ACTIVE', 'TRIALING'].includes(subscription.status)
      };
    }
    
    // If no subscription, return free tier details
    const freeTier = userType === 'creator' ? 'FREE' : 'STARTER';
    const features = getSubscriptionFeatures(freeTier, userType);
    
    return {
      userId,
      userType,
      tier: freeTier,
      status: 'FREE',
      features,
      isActive: true
    };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      userId,
      userType
    }, 'Failed to get user subscription');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to get user subscription: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Updates the status of a subscription in the system
 * 
 * @param subscriptionId The subscription ID
 * @param status New subscription status
 * @param metadata Optional metadata to update
 * @returns Updated subscription details
 */
async function updateSubscriptionStatus(
  subscriptionId: string, 
  status: string,
  metadata?: Record<string, any>
) {
  logger.info({ subscriptionId, status }, 'Updating subscription status');
  
  try {
    if (!subscriptionId || !status) {
      throw new ValidationError('Missing required parameters', {
        subscriptionId: !subscriptionId ? 'Subscription ID is required' : undefined,
        status: !status ? 'Status is required' : undefined
      });
    }
    
    // Validate status
    const validStatuses = ['ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'PENDING', 'PENDING_CANCELLATION', 'TRIALING'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid subscription status', {
        status: `Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Get existing subscription
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription not found', 'Subscription', subscriptionId);
    }
    
    // Prepare update data
    const updateData: any = { status };
    
    if (metadata) {
      updateData.metadata = {
        ...subscription.metadata,
        ...metadata
      };
    }
    
    // Update database record
    if (status === 'ACTIVE') {
      // For active subscriptions, update period dates if not already set
      if (!subscription.currentPeriodStart) {
        updateData.currentPeriodStart = new Date();
      }
      
      if (!subscription.currentPeriodEnd) {
        // Default to 30 days if we don't have actual billing data
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        updateData.currentPeriodEnd = endDate;
      }
    } else if (status === 'CANCELED' && !subscription.canceledAt) {
      updateData.canceledAt = new Date();
    }
    
    const updatedSubscription = await updateSubscription(
      subscriptionId,
      updateData
    );
    
    // Add feature details to the response
    const features = getSubscriptionFeatures(updatedSubscription.tier, updatedSubscription.userType);
    
    return {
      ...updatedSubscription,
      features
    };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      subscriptionId,
      status
    }, 'Failed to update subscription status');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to update subscription status: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Changes a subscription to a different tier with billing updates
 * 
 * @param subscriptionId The subscription ID
 * @param newTier The new subscription tier
 * @param immediateChange Whether to apply the change immediately (vs. next billing period)
 * @param options Additional options for the change
 * @returns Updated subscription with new tier details
 */
async function changeSubscriptionTier(
  subscriptionId: string,
  newTier: string,
  immediateChange: boolean = true,
  options: {
    paymentMethodId?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  logger.info({ subscriptionId, newTier, immediateChange }, 'Changing subscription tier');
  
  try {
    if (!subscriptionId || !newTier) {
      throw new ValidationError('Missing required parameters', {
        subscriptionId: !subscriptionId ? 'Subscription ID is required' : undefined,
        newTier: !newTier ? 'New tier is required' : undefined
      });
    }
    
    // Get existing subscription
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription not found', 'Subscription', subscriptionId);
    }
    
    // Verify subscription is active
    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
      throw new ValidationError('Cannot change tier of inactive subscription', {
        status: subscription.status
      });
    }
    
    // Check if new tier is valid for the user type
    const userPlans = SUBSCRIPTION_PLANS[subscription.userType.toUpperCase()];
    if (!userPlans || !userPlans[newTier]) {
      throw new ValidationError('Invalid subscription tier', { 
        tier: `"${newTier}" is not a valid tier for ${subscription.userType}` 
      });
    }
    
    // Don't need to change if already on the requested tier
    if (subscription.tier.toUpperCase() === newTier.toUpperCase()) {
      logger.info({ subscriptionId }, 'Subscription already on requested tier');
      return getSubscription(subscriptionId);
    }
    
    // Get price ID for the new tier
    const priceId = getPriceIdForTier(newTier, subscription.userType);
    
    // If subscription has a Stripe ID, update in Stripe
    if (subscription.stripeSubscriptionId) {
      await changePlan(
        subscription.stripeSubscriptionId,
        priceId,
        {
          prorationBehavior: immediateChange ? 'create_prorations' : 'none',
          effectiveDate: immediateChange ? 'now' : 'next_billing_cycle'
        }
      );
    }
    
    // Prepare update data
    const updateData: any = { 
      tier: newTier,
      updatedAt: new Date()
    };
    
    // If updating metadata
    if (options.metadata) {
      updateData.metadata = {
        ...subscription.metadata,
        ...options.metadata,
        tierChangeDate: new Date().toISOString(),
        previousTier: subscription.tier
      };
    } else {
      updateData.metadata = {
        ...subscription.metadata,
        tierChangeDate: new Date().toISOString(),
        previousTier: subscription.tier
      };
    }
    
    // Update in database
    const updatedSubscription = await updateSubscription(
      subscriptionId,
      updateData
    );
    
    // Add feature details to the response
    const features = getSubscriptionFeatures(updatedSubscription.tier, updatedSubscription.userType);
    
    return {
      ...updatedSubscription,
      features
    };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      subscriptionId,
      newTier
    }, 'Failed to change subscription tier');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to change subscription tier: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Cancels an active subscription with options for immediate or end-of-term cancellation
 * 
 * @param subscriptionId The subscription ID
 * @param immediateCancel Whether to cancel immediately (vs. at the end of the billing period)
 * @returns Updated subscription details with cancellation information
 */
async function cancelSubscription(subscriptionId: string, immediateCancel: boolean = false) {
  logger.info({ subscriptionId, immediateCancel }, 'Cancelling subscription');
  
  try {
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required', {
        subscriptionId: 'Required parameter'
      });
    }
    
    // Get existing subscription
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription not found', 'Subscription', subscriptionId);
    }
    
    // Verify subscription is active
    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
      throw new ValidationError('Cannot cancel inactive subscription', {
        status: subscription.status
      });
    }
    
    // If subscription has a Stripe ID, cancel in Stripe
    if (subscription.stripeSubscriptionId) {
      await cancelStripeSubscription(
        subscription.stripeSubscriptionId,
        !immediateCancel // cancelAtPeriodEnd = !immediateCancel
      );
    }
    
    // Prepare update data
    const updateData: any = {
      canceledAt: new Date(),
      status: immediateCancel ? 'CANCELED' : 'PENDING_CANCELLATION'
    };
    
    // For immediate cancellations, set end date to now
    if (immediateCancel) {
      updateData.currentPeriodEnd = new Date();
    }
    
    // Update metadata
    updateData.metadata = {
      ...subscription.metadata,
      cancellationDate: new Date().toISOString(),
      cancellationType: immediateCancel ? 'immediate' : 'end_of_term'
    };
    
    // Update in database
    const updatedSubscription = await updateSubscription(
      subscriptionId,
      updateData
    );
    
    // Add feature details to the response
    const features = getSubscriptionFeatures(updatedSubscription.tier, updatedSubscription.userType);
    
    return {
      ...updatedSubscription,
      features
    };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      subscriptionId,
      immediateCancel
    }, 'Failed to cancel subscription');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to cancel subscription: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Reactivates a subscription that was scheduled for cancellation
 * 
 * @param subscriptionId The subscription ID
 * @returns Updated subscription details with reactivation information
 */
async function reactivateSubscription(subscriptionId: string) {
  logger.info({ subscriptionId }, 'Reactivating subscription');
  
  try {
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required', {
        subscriptionId: 'Required parameter'
      });
    }
    
    // Get existing subscription
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription not found', 'Subscription', subscriptionId);
    }
    
    // Verify subscription is in pending cancellation status
    if (subscription.status !== 'PENDING_CANCELLATION') {
      throw new ValidationError('Only subscriptions pending cancellation can be reactivated', {
        status: subscription.status
      });
    }
    
    // If subscription has a Stripe ID, reactivate in Stripe
    if (subscription.stripeSubscriptionId) {
      await reactivateStripeSubscription(subscription.stripeSubscriptionId);
    }
    
    // Prepare update data
    const updateData: any = {
      status: 'ACTIVE',
      canceledAt: null
    };
    
    // Update metadata
    updateData.metadata = {
      ...subscription.metadata,
      reactivationDate: new Date().toISOString()
    };
    
    // Update in database
    const updatedSubscription = await updateSubscription(
      subscriptionId,
      updateData
    );
    
    // Add feature details to the response
    const features = getSubscriptionFeatures(updatedSubscription.tier, updatedSubscription.userType);
    
    return {
      ...updatedSubscription,
      features
    };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      subscriptionId
    }, 'Failed to reactivate subscription');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to reactivate subscription: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Creates a Stripe billing portal session for subscription management
 * 
 * @param userId The user ID
 * @param userType The user type (creator or brand)
 * @param returnUrl URL to return to after the portal session
 * @returns Session details with URL to billing portal
 */
async function createBillingPortalSession(
  userId: string, 
  userType: string,
  returnUrl: string
) {
  logger.info({ userId, userType }, 'Creating billing portal session');
  
  try {
    if (!userId || !userType || !returnUrl) {
      throw new ValidationError('Missing required parameters', {
        userId: !userId ? 'User ID is required' : undefined,
        userType: !userType ? 'User type is required' : undefined,
        returnUrl: !returnUrl ? 'Return URL is required' : undefined
      });
    }
    
    // Validate return URL format
    if (!returnUrl.startsWith('http')) {
      throw new ValidationError('Invalid return URL format', {
        returnUrl: 'Must be a valid URL starting with http:// or https://'
      });
    }
    
    // Get user's active subscription
    const subscription = await getUserSubscription(userId, userType);
    
    if (!subscription || !subscription.stripeCustomerId) {
      throw new ValidationError('No active subscription found with payment information', {
        userId,
        userType
      });
    }
    
    // Create billing portal session
    const session = await createPortalSession(
      subscription.stripeCustomerId,
      returnUrl
    );
    
    return {
      sessionUrl: session.url,
      sessionId: session.id
    };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      userId,
      userType
    }, 'Failed to create billing portal session');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to create billing portal session: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Synchronizes a subscription's status and details with Stripe
 * 
 * @param subscriptionId The subscription ID
 * @returns Updated subscription with synchronized data
 */
async function syncWithStripe(subscriptionId: string) {
  logger.info({ subscriptionId }, 'Syncing subscription with Stripe');
  
  try {
    if (!subscriptionId) {
      throw new ValidationError('Subscription ID is required', {
        subscriptionId: 'Required parameter'
      });
    }
    
    // Get subscription from database
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription not found', 'Subscription', subscriptionId);
    }
    
    // If no Stripe subscription ID, nothing to sync
    if (!subscription.stripeSubscriptionId) {
      logger.info({ subscriptionId }, 'No Stripe subscription ID to sync');
      return subscription;
    }
    
    // Retrieve subscription from Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });
    
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
      {
        expand: ['latest_invoice', 'latest_invoice.payment_intent']
      }
    );
    
    // Map Stripe status to internal status
    const internalStatus = mapStripeStatusToInternal(stripeSubscription.status);
    
    // Prepare update data
    const updateData: any = {
      status: internalStatus,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
    };
    
    // Handle cancellation info
    if (stripeSubscription.canceled_at) {
      updateData.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
    }
    
    // Handle trial info
    if (stripeSubscription.trial_end) {
      updateData.trialEnd = new Date(stripeSubscription.trial_end * 1000);
    }
    
    // Update subscription in database
    const updatedSubscription = await updateSubscription(
      subscriptionId,
      updateData
    );
    
    // If subscription is past_due, we might want to alert the user or take action
    if (internalStatus === 'PAST_DUE') {
      // Could trigger email notification or other alert here
      logger.warn({ subscriptionId }, 'Subscription is past due');
    }
    
    return updatedSubscription;
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      subscriptionId
    }, 'Failed to sync subscription with Stripe');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to sync subscription with Stripe: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Checks if a user has access to a specific feature based on their subscription tier
 * 
 * @param userId The user ID
 * @param userType The user type (creator or brand)
 * @param featureKey The feature key to check access for
 * @returns True if the user has access, false otherwise
 */
async function checkFeatureAccess(userId: string, userType: string, featureKey: string) {
  logger.info({ userId, userType, featureKey }, 'Checking feature access');
  
  try {
    if (!userId || !userType || !featureKey) {
      throw new ValidationError('Missing required parameters', {
        userId: !userId ? 'User ID is required' : undefined,
        userType: !userType ? 'User type is required' : undefined,
        featureKey: !featureKey ? 'Feature key is required' : undefined
      });
    }
    
    // Get user's active subscription
    const subscription = await getUserSubscription(userId, userType);
    
    // Get subscription features
    const features = getSubscriptionFeatures(subscription.tier, userType);
    
    // Check if the feature is available in the subscription
    return checkSubscriptionAccess(features, featureKey);
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      userId,
      userType,
      featureKey
    }, 'Failed to check feature access');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to check feature access: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Processes webhook events from Stripe related to subscriptions
 * 
 * @param event Stripe webhook event
 * @returns Processing result with updated subscription if applicable
 */
async function handleStripeWebhook(event: Stripe.Event) {
  logger.info({ 
    type: event.type,
    id: event.id
  }, 'Processing Stripe webhook');
  
  try {
    // Process the webhook using our Stripe integration
    const result = await processSubscriptionWebhook(event);
    
    // Handle specific events in our database
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find subscription in our database by Stripe ID
        const dbSubscription = await handleSubscriptionWebhook(
          subscription.id,
          mapStripeStatusToInternal(subscription.status),
          {
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          }
        );
        
        return {
          ...result,
          dbSubscriptionId: dbSubscription?.id,
          dbSubscriptionUpdated: !!dbSubscription
        };
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update subscription in our database
        const dbSubscription = await handleSubscriptionWebhook(
          subscription.id,
          'CANCELED',
          {
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : new Date()
          }
        );
        
        return {
          ...result,
          dbSubscriptionId: dbSubscription?.id,
          dbSubscriptionUpdated: !!dbSubscription
        };
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Find subscription in our database by Stripe ID
          const dbSubscription = await handleSubscriptionWebhook(
            invoice.subscription as string,
            'ACTIVE',
            {
              lastInvoiceDate: new Date(),
              lastPaymentDate: new Date()
            }
          );
          
          return {
            ...result,
            dbSubscriptionId: dbSubscription?.id,
            dbSubscriptionUpdated: !!dbSubscription
          };
        }
        
        return result;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          // Find subscription in our database by Stripe ID
          const dbSubscription = await handleSubscriptionWebhook(
            invoice.subscription as string,
            'PAST_DUE',
            {
              lastInvoiceDate: new Date(),
              paymentFailureCount: (invoice.attempt_count || 1)
            }
          );
          
          return {
            ...result,
            dbSubscriptionId: dbSubscription?.id,
            dbSubscriptionUpdated: !!dbSubscription
          };
        }
        
        return result;
      }
      
      default:
        return result;
    }
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      eventType: event.type,
      eventId: event.id
    }, 'Failed to process Stripe webhook');
    
    throw new ExternalServiceError(
      `Failed to process Stripe webhook: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Retrieves all subscriptions (current and historical) for a user
 * 
 * @param userId The user ID
 * @param userType The user type (creator or brand)
 * @returns Array of subscription records for the user
 */
async function getAllUserSubscriptions(userId: string, userType: string) {
  logger.info({ userId, userType }, 'Getting all user subscriptions');
  
  try {
    if (!userId || !userType) {
      throw new ValidationError('Missing required parameters', {
        userId: !userId ? 'User ID is required' : undefined,
        userType: !userType ? 'User type is required' : undefined
      });
    }
    
    // Only allow valid user types
    if (userType !== 'creator' && userType !== 'brand') {
      throw new ValidationError('Invalid user type', { 
        userType: 'Must be either "creator" or "brand"' 
      });
    }
    
    // Get all subscriptions for the user
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        userType: userType.toUpperCase()
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Add features to each subscription
    return subscriptions.map(subscription => {
      const features = getSubscriptionFeatures(subscription.tier, userType);
      
      return {
        ...subscription,
        features
      };
    });
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      userId,
      userType
    }, 'Failed to get all user subscriptions');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ExternalServiceError(
      `Failed to get all user subscriptions: ${error instanceof Error ? error.message : String(error)}`,
      'Subscription'
    );
  }
}

/**
 * Generates a comparison of features between different subscription tiers
 * 
 * @param userType The user type (creator or brand)
 * @returns Comparison data showing features across all tiers
 */
function compareTiers(userType: string) {
  try {
    if (!userType) {
      throw new ValidationError('User type is required', {
        userType: 'Required parameter'
      });
    }
    
    // Only allow valid user types
    if (userType !== 'creator' && userType !== 'brand') {
      throw new ValidationError('Invalid user type', { 
        userType: 'Must be either "creator" or "brand"' 
      });
    }
    
    const normalizedUserType = userType.toUpperCase();
    const userTypeConfig = SUBSCRIPTION_PLANS[normalizedUserType];
    
    if (!userTypeConfig) {
      throw new ValidationError('Invalid user type', {
        userType: `"${userType}" is not valid`
      });
    }
    
    // Get all tiers for this user type
    const tiers = Object.keys(userTypeConfig);
    
    // Build comparison data
    const comparison: Record<string, any> = {
      userType: userType,
      tiers: {}
    };
    
    // Get features for each tier
    for (const tier of tiers) {
      const features = getSubscriptionFeatures(tier, userType);
      comparison.tiers[tier] = {
        name: userTypeConfig[tier].name,
        price: userTypeConfig[tier].priceUSD,
        features
      };
    }
    
    return comparison;
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      userType
    }, 'Failed to compare subscription tiers');
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new ValidationError(
      `Failed to compare subscription tiers: ${error instanceof Error ? error.message : String(error)}`,
      { userType }
    );
  }
}

export {
  createSubscription,
  getSubscription,
  getUserSubscription,
  updateSubscriptionStatus,
  changeSubscriptionTier,
  cancelSubscription,
  reactivateSubscription,
  createBillingPortalSession,
  syncWithStripe,
  checkFeatureAccess,
  getSubscriptionFeatures,
  handleStripeWebhook,
  getAllUserSubscriptions,
  compareTiers
}