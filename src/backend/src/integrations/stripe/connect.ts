import Stripe from 'stripe'; // v12.0.0
import { stripeConfig, getStripeInstance, PLATFORM_FEE_PERCENTAGE } from '../../config/stripe';
import { PaymentTypes } from '../../types/payment';
import { ExternalServiceError } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * Creates a Stripe Connect Express account for a creator to receive payments
 * 
 * @param creatorData Object containing creator details for account creation
 * @returns Promise with account ID and onboarding URL
 */
export async function createConnectAccount(creatorData: {
  email: string;
  name: string;
  businessType?: 'individual' | 'company';
  country?: string;
  metadata?: Record<string, any>;
}): Promise<{ accountId: string; accountLinkUrl: string }> {
  try {
    const stripe = getStripeInstance();
    
    // Set default country if not provided
    const country = creatorData.country || 'US';
    
    // Create a Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email: creatorData.email,
      business_type: creatorData.businessType || 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: stripeConfig.connect.payoutSchedule.interval,
          },
        },
      },
      metadata: {
        ...creatorData.metadata,
        createdBy: 'Engagerr'
      },
      business_profile: {
        name: creatorData.name,
        product_description: 'Content creator services',
      },
    });

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/creator/connect/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/creator/connect/complete`,
      type: 'account_onboarding',
    });

    logger.info({
      message: 'Stripe Connect account created',
      accountId: account.id,
      email: creatorData.email
    });

    return {
      accountId: account.id,
      accountLinkUrl: accountLink.url,
    };
  } catch (error) {
    logger.error({
      message: 'Failed to create Stripe Connect account',
      error,
      creatorData: { email: creatorData.email, name: creatorData.name }
    });
    
    throw new ExternalServiceError(
      'Failed to create payment account',
      'Stripe',
      { originalError: error.message }
    );
  }
}

/**
 * Retrieves the current status of a creator's Stripe Connect account
 * 
 * @param accountId Stripe Connect account ID
 * @returns Promise with account status details
 */
export async function getConnectAccountStatus(accountId: string): Promise<{
  accountId: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: object;
}> {
  try {
    const stripe = getStripeInstance();
    
    const account = await stripe.accounts.retrieve(accountId);
    
    return {
      accountId: account.id,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements || {},
    };
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve Stripe Connect account status',
      error,
      accountId
    });
    
    throw new ExternalServiceError(
      'Failed to retrieve payment account status',
      'Stripe',
      { originalError: error.message, accountId }
    );
  }
}

/**
 * Creates an account link for onboarding or updating a Stripe Connect account
 * 
 * @param accountId Stripe Connect account ID
 * @param refreshUrl URL to redirect if link expires
 * @param returnUrl URL to redirect after completion
 * @param type Type of account link ('account_onboarding' or 'account_update')
 * @returns Promise with account link URL
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
  type: 'account_onboarding' | 'account_update' = 'account_onboarding'
): Promise<{ url: string }> {
  try {
    const stripe = getStripeInstance();
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type,
    });
    
    return { url: accountLink.url };
  } catch (error) {
    logger.error({
      message: 'Failed to create Stripe account link',
      error,
      accountId,
      type
    });
    
    throw new ExternalServiceError(
      'Failed to create account link',
      'Stripe',
      { originalError: error.message, accountId }
    );
  }
}

/**
 * Creates a login link for a creator to access their Stripe Express dashboard
 * 
 * @param accountId Stripe Connect account ID
 * @returns Promise with login link URL
 */
export async function createLoginLink(accountId: string): Promise<{ url: string }> {
  try {
    const stripe = getStripeInstance();
    
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    
    return { url: loginLink.url };
  } catch (error) {
    logger.error({
      message: 'Failed to create Stripe login link',
      error,
      accountId
    });
    
    throw new ExternalServiceError(
      'Failed to create dashboard login link',
      'Stripe',
      { originalError: error.message, accountId }
    );
  }
}

/**
 * Calculates the platform fee for a marketplace transaction
 * 
 * @param amount Transaction amount in smallest currency unit (e.g., cents)
 * @param feePercentage Optional custom fee percentage (defaults to platform standard)
 * @returns Payment breakdown with fee calculations
 */
export function calculatePlatformFee(
  amount: number,
  feePercentage: number = PLATFORM_FEE_PERCENTAGE
): PaymentTypes.PaymentBreakdown {
  // Calculate platform fee
  const platformFee = Math.round(amount * (feePercentage / 100));
  
  // Estimate Stripe processing fee (2.9% + $0.30)
  // This is an estimate and actual fee may vary
  const processingFee = Math.round(amount * 0.029 + 30);
  
  // Calculate net amount for creator
  const netAmount = amount - platformFee - processingFee;
  
  return {
    subtotal: amount,
    platformFee,
    platformFeePercentage: feePercentage,
    processingFee,
    total: amount, // Total is the same as subtotal since platform fee is deducted from the amount
    netAmount,
    currency: 'usd', // Default currency
  };
}

/**
 * Transfers funds from platform to a creator's Stripe Connect account
 * 
 * @param accountId Stripe Connect account ID
 * @param amount Amount to transfer in smallest currency unit (e.g., cents)
 * @param currency Currency code (default: 'usd')
 * @param description Transfer description
 * @param metadata Additional metadata for the transfer
 * @returns Promise with Stripe transfer ID
 */
export async function transferToConnectedAccount(
  accountId: string,
  amount: number,
  currency: string = 'usd',
  description: string = 'Marketplace payment',
  metadata: Record<string, any> = {}
): Promise<{ transferId: string }> {
  try {
    if (!accountId) {
      throw new Error('Account ID is required');
    }
    
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    const stripe = getStripeInstance();
    
    // Get account status to verify it's ready for transfers
    const accountStatus = await getConnectAccountStatus(accountId);
    
    if (!accountStatus.payoutsEnabled) {
      throw new Error('Account payouts are not enabled yet');
    }
    
    // Calculate platform fee
    const feeBreakdown = calculatePlatformFee(amount);
    
    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: feeBreakdown.netAmount,
      currency: currency.toLowerCase(),
      destination: accountId,
      transfer_group: metadata.partnershipId || undefined,
      description,
      metadata: {
        ...metadata,
        originalAmount: amount.toString(),
        platformFee: feeBreakdown.platformFee.toString(),
        processingFee: feeBreakdown.processingFee.toString(),
        netAmount: feeBreakdown.netAmount.toString(),
      },
    });
    
    logger.info({
      message: 'Transfer to connected account created',
      transferId: transfer.id,
      accountId,
      amount: feeBreakdown.netAmount,
      originalAmount: amount,
      platformFee: feeBreakdown.platformFee
    });
    
    return { transferId: transfer.id };
  } catch (error) {
    logger.error({
      message: 'Failed to transfer to connected account',
      error,
      accountId,
      amount
    });
    
    throw new ExternalServiceError(
      'Failed to process payment transfer',
      'Stripe',
      { originalError: error.message, accountId }
    );
  }
}

/**
 * Creates a payment intent for marketplace transactions with destination charge
 * 
 * @param amount Amount in smallest currency unit (e.g., cents)
 * @param currency Currency code (default: 'usd')
 * @param paymentMethodId Optional payment method ID to use
 * @param description Payment description
 * @param connectAccountId Stripe Connect account ID of the creator
 * @param metadata Additional metadata for the payment intent
 * @returns Promise with payment intent details
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  paymentMethodId?: string,
  description: string = 'Marketplace payment',
  connectAccountId?: string,
  metadata: Record<string, any> = {}
): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  applicationFee: number;
}> {
  try {
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    const stripe = getStripeInstance();
    
    // Calculate platform fee
    const feeBreakdown = calculatePlatformFee(amount);
    
    // Payment intent parameters
    const params: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: currency.toLowerCase(),
      description,
      metadata: {
        ...metadata,
        platformFee: feeBreakdown.platformFee.toString(),
      },
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: !!paymentMethodId,
    };
    
    // If we have a connected account, set it as the transfer destination
    if (connectAccountId) {
      // Check account status
      const accountStatus = await getConnectAccountStatus(connectAccountId);
      
      if (!accountStatus.chargesEnabled) {
        throw new Error('Connected account is not fully onboarded to receive payments');
      }
      
      // Configure payment intent for destination charge
      params.transfer_data = {
        destination: connectAccountId,
      };
      
      // Set application fee for platform
      params.application_fee_amount = feeBreakdown.platformFee;
    }
    
    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create(params);
    
    logger.info({
      message: 'Payment intent created',
      paymentIntentId: paymentIntent.id,
      amount,
      connectAccountId: connectAccountId || 'N/A',
      applicationFee: feeBreakdown.platformFee
    });
    
    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount,
      applicationFee: feeBreakdown.platformFee,
    };
  } catch (error) {
    logger.error({
      message: 'Failed to create payment intent',
      error,
      amount,
      connectAccountId: connectAccountId || 'N/A'
    });
    
    throw new ExternalServiceError(
      'Failed to create payment',
      'Stripe',
      { originalError: error.message }
    );
  }
}

/**
 * Retrieves details of a payment intent
 * 
 * @param paymentIntentId Stripe payment intent ID
 * @returns Promise with payment intent details
 */
export async function retrievePaymentIntent(paymentIntentId: string): Promise<object> {
  try {
    const stripe = getStripeInstance();
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      description: paymentIntent.description,
      applicationFeeAmount: paymentIntent.application_fee_amount,
      metadata: paymentIntent.metadata,
      transferData: paymentIntent.transfer_data,
      created: paymentIntent.created,
      paymentMethod: paymentIntent.payment_method,
    };
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve payment intent',
      error,
      paymentIntentId
    });
    
    throw new ExternalServiceError(
      'Failed to retrieve payment details',
      'Stripe',
      { originalError: error.message, paymentIntentId }
    );
  }
}

/**
 * Retrieves balance transactions for a connected account
 * 
 * @param accountId Stripe Connect account ID
 * @param options Pagination and filtering options
 * @returns Promise with transaction list and pagination details
 */
export async function getBalanceTransactions(
  accountId: string,
  options: {
    limit?: number;
    startingAfter?: string;
    endingBefore?: string;
    type?: string;
    created?: { gt?: number; gte?: number; lt?: number; lte?: number };
  } = {}
): Promise<{
  transactions: Array<object>;
  hasMore: boolean;
  lastId: string;
}> {
  try {
    const stripe = getStripeInstance();
    
    // Set up parameters for listing transactions
    const params: Stripe.BalanceTransactionListParams = {
      limit: options.limit || 20,
    };
    
    if (options.startingAfter) {
      params.starting_after = options.startingAfter;
    }
    
    if (options.endingBefore) {
      params.ending_before = options.endingBefore;
    }
    
    if (options.type) {
      params.type = options.type as Stripe.BalanceTransactionListParams.Type;
    }
    
    if (options.created) {
      params.created = options.created;
    }
    
    // Get transactions for the connected account
    const balanceTransactions = await stripe.balance.listTransactions(
      params,
      { stripeAccount: accountId }
    );
    
    // Format the transactions for our API
    const transactions = balanceTransactions.data.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      netAmount: transaction.net,
      fee: transaction.fee,
      currency: transaction.currency,
      type: transaction.type,
      description: transaction.description,
      status: transaction.status,
      created: transaction.created,
      source: transaction.source,
      availableOn: transaction.available_on,
    }));
    
    return {
      transactions,
      hasMore: balanceTransactions.has_more,
      lastId: transactions.length > 0 ? transactions[transactions.length - 1].id : '',
    };
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve balance transactions',
      error,
      accountId
    });
    
    throw new ExternalServiceError(
      'Failed to retrieve transaction history',
      'Stripe',
      { originalError: error.message, accountId }
    );
  }
}

/**
 * Retrieves the payout schedule for a connected account
 * 
 * @param accountId Stripe Connect account ID
 * @returns Promise with payout schedule details
 */
export async function getPayoutSchedule(accountId: string): Promise<object> {
  try {
    const stripe = getStripeInstance();
    
    const account = await stripe.accounts.retrieve(accountId);
    
    if (!account.settings?.payouts?.schedule) {
      throw new Error('Payout schedule not found for account');
    }
    
    return {
      interval: account.settings.payouts.schedule.interval,
      monthlyAnchor: account.settings.payouts.schedule.monthly_anchor,
      weeklyAnchor: account.settings.payouts.schedule.weekly_anchor,
      delayDays: account.settings.payouts.schedule.delay_days,
    };
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve payout schedule',
      error,
      accountId
    });
    
    throw new ExternalServiceError(
      'Failed to retrieve payout schedule',
      'Stripe',
      { originalError: error.message, accountId }
    );
  }
}

/**
 * Updates the payout schedule for a connected account
 * 
 * @param accountId Stripe Connect account ID
 * @param scheduleParams Payout schedule parameters
 * @returns Promise with updated payout schedule
 */
export async function updatePayoutSchedule(
  accountId: string,
  scheduleParams: {
    interval?: 'manual' | 'daily' | 'weekly' | 'monthly';
    weeklyAnchor?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    monthlyAnchor?: number;
    delayDays?: number;
  }
): Promise<object> {
  try {
    const stripe = getStripeInstance();
    
    // Validate schedule parameters
    if (scheduleParams.interval === 'weekly' && !scheduleParams.weeklyAnchor) {
      throw new Error('Weekly anchor is required for weekly interval');
    }
    
    if (scheduleParams.interval === 'monthly' && !scheduleParams.monthlyAnchor) {
      throw new Error('Monthly anchor is required for monthly interval');
    }
    
    // Prepare update parameters
    const updateParams: Stripe.AccountUpdateParams = {
      settings: {
        payouts: {
          schedule: {
            interval: scheduleParams.interval,
            weekly_anchor: scheduleParams.weeklyAnchor,
            monthly_anchor: scheduleParams.monthlyAnchor,
            delay_days: scheduleParams.delayDays,
          },
        },
      },
    };
    
    // Remove undefined values
    if (!scheduleParams.weeklyAnchor) {
      delete updateParams.settings!.payouts!.schedule!.weekly_anchor;
    }
    
    if (!scheduleParams.monthlyAnchor) {
      delete updateParams.settings!.payouts!.schedule!.monthly_anchor;
    }
    
    if (scheduleParams.delayDays === undefined) {
      delete updateParams.settings!.payouts!.schedule!.delay_days;
    }
    
    // Update the account
    const account = await stripe.accounts.update(accountId, updateParams);
    
    logger.info({
      message: 'Payout schedule updated',
      accountId,
      schedule: account.settings?.payouts?.schedule
    });
    
    return {
      interval: account.settings?.payouts?.schedule?.interval,
      monthlyAnchor: account.settings?.payouts?.schedule?.monthly_anchor,
      weeklyAnchor: account.settings?.payouts?.schedule?.weekly_anchor,
      delayDays: account.settings?.payouts?.schedule?.delay_days,
    };
  } catch (error) {
    logger.error({
      message: 'Failed to update payout schedule',
      error,
      accountId,
      scheduleParams
    });
    
    throw new ExternalServiceError(
      'Failed to update payout schedule',
      'Stripe',
      { originalError: error.message, accountId }
    );
  }
}

/**
 * Processes webhook events for Connect account updates
 * 
 * @param event Stripe webhook event object
 * @returns Promise resolving once processing completes
 */
export async function handleConnectAccountUpdated(event: Stripe.Event): Promise<void> {
  try {
    const account = event.data.object as Stripe.Account;
    
    logger.info({
      message: 'Processing Connect account update webhook',
      accountId: account.id,
      eventType: event.type
    });
    
    // Process different Connect account events
    switch (event.type) {
      case 'account.updated':
        // Handle account updates
        // If the account is now able to process payments, we may want to update our database
        if (account.charges_enabled && account.payouts_enabled) {
          // Update database to mark account as fully onboarded
          // This would be implemented in your database service
          logger.info({
            message: 'Connect account fully onboarded',
            accountId: account.id
          });
        }
        
        // Check if requirements have changed
        if (account.requirements?.currently_due?.length > 0) {
          logger.info({
            message: 'Connect account has pending requirements',
            accountId: account.id,
            requirements: account.requirements.currently_due
          });
          
          // You might want to notify the user about pending requirements
        }
        break;
        
      case 'account.application.deauthorized':
        // Handle when a user deauthorizes your application
        logger.info({
          message: 'Connect account deauthorized application',
          accountId: account.id
        });
        
        // Update database to reflect disconnected status
        break;
        
      case 'account.external_account.created':
      case 'account.external_account.updated':
      case 'account.external_account.deleted':
        // Handle bank account or card changes
        logger.info({
          message: 'Connect account external account changed',
          accountId: account.id,
          eventType: event.type
        });
        break;
    }
  } catch (error) {
    logger.error({
      message: 'Error processing Connect account webhook',
      error,
      eventType: event.type
    });
    
    // Rethrow the error for the webhook handler to manage
    throw error;
  }
}