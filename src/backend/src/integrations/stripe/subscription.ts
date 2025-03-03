/**
 * Stripe Subscription Management
 * 
 * Handles all Stripe subscription operations for the Engagerr platform including:
 * - Customer creation and management
 * - Subscription creation, updates, and cancellations
 * - Plan changes and upgrades
 * - Payment method setup
 * - Billing portal access
 * - Webhook event processing
 */

import Stripe from 'stripe'; // v12.0.0
import { getStripeInstance, stripeConfig, SUBSCRIPTION_PLANS } from '../../config/stripe';
import { ApiError, ExternalServiceError } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * Creates a new Stripe customer for subscription billing
 * 
 * @param customerData Object containing customer information
 * @returns Created Stripe customer
 */
export async function createCustomer(customerData: {
  name: string;
  email: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  const stripe = getStripeInstance();
  
  try {
    const customer = await stripe.customers.create({
      name: customerData.name,
      email: customerData.email,
      metadata: customerData.metadata || {},
    });
    
    logger.info({ 
      message: 'Created Stripe customer', 
      customerId: customer.id,
      email: customerData.email
    });
    
    return customer;
  } catch (error) {
    logger.error({
      message: 'Failed to create Stripe customer',
      error,
      customerData
    });
    
    throw new ExternalServiceError(
      `Failed to create customer: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Retrieves a Stripe customer by their ID
 * 
 * @param customerId Stripe customer ID
 * @returns Retrieved Stripe customer
 */
export async function retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
  const stripe = getStripeInstance();
  
  try {
    const customer = await stripe.customers.retrieve(customerId);
    
    // Handle deleted customers
    if (customer.deleted) {
      throw new ApiError('Customer has been deleted', 404);
    }
    
    return customer as Stripe.Customer;
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve Stripe customer',
      error,
      customerId
    });
    
    if ((error as any).statusCode === 404) {
      throw new ApiError(`Customer not found: ${customerId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to retrieve customer: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Updates an existing Stripe customer
 * 
 * @param customerId Stripe customer ID
 * @param updateData Data to update on the customer
 * @returns Updated Stripe customer
 */
export async function updateCustomer(
  customerId: string,
  updateData: Partial<Stripe.CustomerUpdateParams>
): Promise<Stripe.Customer> {
  const stripe = getStripeInstance();
  
  try {
    const customer = await stripe.customers.update(
      customerId,
      updateData
    );
    
    logger.info({
      message: 'Updated Stripe customer',
      customerId: customer.id,
      updatedFields: Object.keys(updateData)
    });
    
    return customer;
  } catch (error) {
    logger.error({
      message: 'Failed to update Stripe customer',
      error,
      customerId,
      updateData
    });
    
    if ((error as any).statusCode === 404) {
      throw new ApiError(`Customer not found: ${customerId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to update customer: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Creates a new subscription for a customer with specified plan
 * 
 * @param customerId Stripe customer ID
 * @param priceId Stripe price ID for the subscription plan
 * @param subscriptionData Additional subscription options
 * @returns Created Stripe subscription
 */
export async function createSubscription(
  customerId: string,
  priceId: string,
  subscriptionData: {
    trialPeriodDays?: number;
    paymentMethodId?: string;
    metadata?: Record<string, string>;
    couponId?: string;
    promotionCode?: string;
  } = {}
): Promise<Stripe.Subscription> {
  const stripe = getStripeInstance();
  
  try {
    // Prepare subscription parameters
    const params: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      metadata: subscriptionData.metadata || {},
    };
    
    // Add optional parameters if provided
    if (subscriptionData.trialPeriodDays) {
      params.trial_period_days = subscriptionData.trialPeriodDays;
    }
    
    if (subscriptionData.paymentMethodId) {
      params.default_payment_method = subscriptionData.paymentMethodId;
    }
    
    if (subscriptionData.couponId) {
      params.coupon = subscriptionData.couponId;
    }
    
    if (subscriptionData.promotionCode) {
      params.promotion_code = subscriptionData.promotionCode;
    }
    
    const subscription = await stripe.subscriptions.create(params);
    
    logger.info({
      message: 'Created Stripe subscription',
      subscriptionId: subscription.id,
      customerId,
      priceId,
      status: subscription.status
    });
    
    return subscription;
  } catch (error) {
    logger.error({
      message: 'Failed to create Stripe subscription',
      error,
      customerId,
      priceId,
      subscriptionData
    });
    
    if ((error as any).code === 'resource_missing' && (error as any).param === 'customer') {
      throw new ApiError(`Customer not found: ${customerId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to create subscription: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Retrieves a subscription by its ID
 * 
 * @param subscriptionId Stripe subscription ID
 * @returns Retrieved Stripe subscription
 */
export async function retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripeInstance();
  
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer', 'default_payment_method', 'latest_invoice']
    });
    
    return subscription;
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve Stripe subscription',
      error,
      subscriptionId
    });
    
    if ((error as any).statusCode === 404) {
      throw new ApiError(`Subscription not found: ${subscriptionId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to retrieve subscription: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Updates an existing subscription
 * 
 * @param subscriptionId Stripe subscription ID
 * @param updateData Data to update on the subscription
 * @returns Updated Stripe subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  updateData: Partial<Stripe.SubscriptionUpdateParams>
): Promise<Stripe.Subscription> {
  const stripe = getStripeInstance();
  
  try {
    const subscription = await stripe.subscriptions.update(
      subscriptionId,
      updateData
    );
    
    logger.info({
      message: 'Updated Stripe subscription',
      subscriptionId: subscription.id,
      updatedFields: Object.keys(updateData)
    });
    
    return subscription;
  } catch (error) {
    logger.error({
      message: 'Failed to update Stripe subscription',
      error,
      subscriptionId,
      updateData
    });
    
    if ((error as any).statusCode === 404) {
      throw new ApiError(`Subscription not found: ${subscriptionId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to update subscription: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Cancels an active subscription immediately or at period end
 * 
 * @param subscriptionId Stripe subscription ID
 * @param cancelAtPeriodEnd Whether to cancel at the end of the billing period
 * @returns Cancelled Stripe subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  const stripe = getStripeInstance();
  
  try {
    let subscription: Stripe.Subscription;
    
    if (cancelAtPeriodEnd) {
      // Schedule cancellation at period end
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      
      logger.info({
        message: 'Scheduled subscription cancellation at period end',
        subscriptionId
      });
    } else {
      // Cancel immediately
      subscription = await stripe.subscriptions.cancel(subscriptionId);
      
      logger.info({
        message: 'Cancelled subscription immediately',
        subscriptionId
      });
    }
    
    return subscription;
  } catch (error) {
    logger.error({
      message: 'Failed to cancel Stripe subscription',
      error,
      subscriptionId,
      cancelAtPeriodEnd
    });
    
    if ((error as any).statusCode === 404) {
      throw new ApiError(`Subscription not found: ${subscriptionId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to cancel subscription: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Reactivates a subscription scheduled to cancel at period end
 * 
 * @param subscriptionId Stripe subscription ID
 * @returns Reactivated Stripe subscription
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripeInstance();
  
  try {
    // Reactivate by setting cancel_at_period_end to false
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });
    
    logger.info({
      message: 'Reactivated subscription',
      subscriptionId
    });
    
    return subscription;
  } catch (error) {
    logger.error({
      message: 'Failed to reactivate Stripe subscription',
      error,
      subscriptionId
    });
    
    if ((error as any).statusCode === 404) {
      throw new ApiError(`Subscription not found: ${subscriptionId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to reactivate subscription: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Changes a subscription to a different price plan
 * 
 * @param subscriptionId Stripe subscription ID
 * @param newPriceId New Stripe price ID to change to
 * @param changeOptions Options for the plan change
 * @returns Updated Stripe subscription
 */
export async function changePlan(
  subscriptionId: string,
  newPriceId: string,
  changeOptions: {
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    effectiveDate?: 'now' | 'next_billing_cycle';
    quantity?: number;
  } = {}
): Promise<Stripe.Subscription> {
  const stripe = getStripeInstance();
  
  try {
    // First get the current subscription to access the subscription item ID
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // The first (and usually only) subscription item
    const subscriptionItemId = currentSubscription.items.data[0]?.id;
    
    if (!subscriptionItemId) {
      throw new ApiError('No subscription items found', 400);
    }
    
    // Prepare the update parameters
    let updateParams: Stripe.SubscriptionUpdateParams = {
      proration_behavior: changeOptions.prorationBehavior || 'create_prorations'
    };
    
    // Handle immediate vs. next billing cycle changes
    if (changeOptions.effectiveDate === 'next_billing_cycle') {
      // For next billing cycle, we use a special parameter
      updateParams.cancel_at_period_end = false;
      updateParams.proration_behavior = 'none';
      updateParams.items = [
        {
          id: subscriptionItemId,
          price: newPriceId,
          quantity: changeOptions.quantity || 1
        }
      ];
    } else {
      // For immediate changes
      updateParams.items = [
        {
          id: subscriptionItemId,
          price: newPriceId,
          quantity: changeOptions.quantity || 1
        }
      ];
    }
    
    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      updateParams
    );
    
    logger.info({
      message: 'Changed subscription plan',
      subscriptionId,
      oldPriceId: currentSubscription.items.data[0]?.price.id,
      newPriceId,
      effectiveDate: changeOptions.effectiveDate || 'now',
      prorationBehavior: updateParams.proration_behavior
    });
    
    return updatedSubscription;
  } catch (error) {
    logger.error({
      message: 'Failed to change subscription plan',
      error,
      subscriptionId,
      newPriceId,
      changeOptions
    });
    
    if ((error as any).statusCode === 404) {
      throw new ApiError(`Subscription not found: ${subscriptionId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to change subscription plan: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Creates a setup intent for adding payment methods
 * 
 * @param customerId Stripe customer ID
 * @param setupData Additional setup intent options
 * @returns Created Stripe setup intent
 */
export async function createSetupIntent(
  customerId: string,
  setupData: {
    paymentMethodTypes?: string[];
    metadata?: Record<string, string>;
  } = {}
): Promise<Stripe.SetupIntent> {
  const stripe = getStripeInstance();
  
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: setupData.paymentMethodTypes || ['card'],
      metadata: setupData.metadata || {},
    });
    
    logger.info({
      message: 'Created setup intent',
      setupIntentId: setupIntent.id,
      customerId
    });
    
    return setupIntent;
  } catch (error) {
    logger.error({
      message: 'Failed to create setup intent',
      error,
      customerId,
      setupData
    });
    
    if ((error as any).code === 'resource_missing' && (error as any).param === 'customer') {
      throw new ApiError(`Customer not found: ${customerId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to create setup intent: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Lists subscriptions for a customer
 * 
 * @param customerId Stripe customer ID
 * @param options List options like limit and status
 * @returns List of subscriptions
 */
export async function listSubscriptions(
  customerId: string,
  options: {
    limit?: number;
    status?: Stripe.SubscriptionListParams.Status;
    startingAfter?: string;
  } = {}
): Promise<Stripe.ApiList<Stripe.Subscription>> {
  const stripe = getStripeInstance();
  
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: options.limit || 10,
      status: options.status,
      starting_after: options.startingAfter,
      expand: ['data.latest_invoice', 'data.default_payment_method']
    });
    
    return subscriptions;
  } catch (error) {
    logger.error({
      message: 'Failed to list customer subscriptions',
      error,
      customerId,
      options
    });
    
    throw new ExternalServiceError(
      `Failed to list subscriptions: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Retrieves invoices for a specific subscription
 * 
 * @param subscriptionId Stripe subscription ID
 * @param options List options like limit and starting position
 * @returns List of invoices
 */
export async function getSubscriptionInvoices(
  subscriptionId: string,
  options: {
    limit?: number;
    startingAfter?: string;
  } = {}
): Promise<Stripe.ApiList<Stripe.Invoice>> {
  const stripe = getStripeInstance();
  
  try {
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: options.limit || 10,
      starting_after: options.startingAfter
    });
    
    return invoices;
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve subscription invoices',
      error,
      subscriptionId,
      options
    });
    
    throw new ExternalServiceError(
      `Failed to retrieve invoices: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Creates a billing portal session for customer self-service
 * 
 * @param customerId Stripe customer ID
 * @param returnUrl URL to return to after the portal session
 * @returns Created portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripeInstance();
  
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
    
    logger.info({
      message: 'Created billing portal session',
      sessionId: session.id,
      customerId,
      url: session.url
    });
    
    return session;
  } catch (error) {
    logger.error({
      message: 'Failed to create billing portal session',
      error,
      customerId
    });
    
    if ((error as any).code === 'resource_missing' && (error as any).param === 'customer') {
      throw new ApiError(`Customer not found: ${customerId}`, 404);
    }
    
    throw new ExternalServiceError(
      `Failed to create billing portal session: ${(error as Error).message}`,
      'Stripe'
    );
  }
}

/**
 * Maps Stripe subscription status to internal application status
 * 
 * @param stripeStatus Stripe subscription status
 * @returns Internal subscription status
 */
export function mapStripeStatusToInternal(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'ACTIVE',
    'trialing': 'TRIALING',
    'canceled': 'CANCELED',
    'past_due': 'PAST_DUE',
    'unpaid': 'UNPAID',
    'incomplete': 'PENDING',
    'incomplete_expired': 'FAILED'
  };
  
  return statusMap[stripeStatus] || 'UNKNOWN';
}

/**
 * Gets the appropriate Stripe price ID for a subscription tier and user type
 * 
 * @param tier Subscription tier name (e.g., 'free', 'growth', 'professional')
 * @param userType Type of user ('creator' or 'brand')
 * @returns Stripe price ID for the tier
 */
export function getPriceIdForTier(tier: string, userType: string): string {
  const userTypeConfig = SUBSCRIPTION_PLANS[userType.toLowerCase() as keyof typeof SUBSCRIPTION_PLANS];
  
  if (!userTypeConfig) {
    throw new ApiError(`Invalid user type: ${userType}`, 400);
  }
  
  const tierConfig = userTypeConfig[tier.toLowerCase() as keyof typeof userTypeConfig];
  
  if (!tierConfig) {
    throw new ApiError(`Invalid subscription tier: ${tier}`, 400);
  }
  
  return tierConfig.id;
}

/**
 * Processes Stripe webhook events related to subscriptions
 * 
 * @param event Stripe webhook event
 * @returns Processed event result
 */
export async function processSubscriptionWebhook(event: Stripe.Event): Promise<object> {
  logger.info({
    message: 'Processing Stripe subscription webhook',
    event: event.type
  });
  
  try {
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        
        return {
          success: true,
          event: event.type,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          internalStatus: mapStripeStatusToInternal(subscription.status),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
        };
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const previousAttributes = event.data.previous_attributes as Partial<Stripe.Subscription>;
        
        return {
          success: true,
          event: event.type,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          internalStatus: mapStripeStatusToInternal(subscription.status),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          changes: Object.keys(previousAttributes),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        };
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        return {
          success: true,
          event: event.type,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          internalStatus: mapStripeStatusToInternal(subscription.status),
          canceledAt: subscription.canceled_at 
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null
        };
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          return {
            success: true,
            event: event.type,
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription,
            customerId: invoice.customer,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: invoice.status,
            billingReason: invoice.billing_reason,
            nextPaymentAttempt: invoice.next_payment_attempt
              ? new Date(invoice.next_payment_attempt * 1000).toISOString()
              : null
          };
        }
        
        // Non-subscription invoice
        return {
          success: true,
          event: event.type,
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status
        };
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        return {
          success: true,
          event: event.type,
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: invoice.status,
          attemptCount: invoice.attempt_count,
          nextPaymentAttempt: invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000).toISOString()
            : null
        };
      }
      
      default:
        // For other event types
        return {
          success: true,
          event: event.type,
          message: 'Event processed but no specific handler',
          data: event.data.object
        };
    }
  } catch (error) {
    logger.error({
      message: 'Error processing subscription webhook',
      error,
      eventType: event.type
    });
    
    throw new ExternalServiceError(
      `Failed to process subscription webhook: ${(error as Error).message}`,
      'Stripe'
    );
  }
}