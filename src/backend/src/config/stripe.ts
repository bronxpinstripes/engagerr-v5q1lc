/**
 * Stripe Payment Configuration
 * 
 * Provides configuration for all Stripe-related functionality including:
 * - API keys and webhook secrets
 * - Subscription plan definitions
 * - Marketplace transaction settings
 * - Escrow configuration
 * 
 * This file is used across the application for consistent payment processing.
 */

import Stripe from 'stripe'; // v12.0.0

// Environment detection for configuration
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Singleton instance of the Stripe client
let stripeInstance: Stripe | null = null;

/**
 * Configuration object for Stripe API access and features
 */
export const stripeConfig = {
  // API keys based on environment
  apiKey: ENVIRONMENT === 'production' 
    ? process.env.STRIPE_SECRET_KEY! 
    : process.env.STRIPE_TEST_SECRET_KEY!,
  
  publishableKey: ENVIRONMENT === 'production'
    ? process.env.STRIPE_PUBLISHABLE_KEY!
    : process.env.STRIPE_TEST_PUBLISHABLE_KEY!,
  
  // API version locked for compatibility
  apiVersion: '2023-10-16',
  
  // Webhook secret for signature verification
  webhookSecret: ENVIRONMENT === 'production'
    ? process.env.STRIPE_WEBHOOK_SECRET!
    : process.env.STRIPE_TEST_WEBHOOK_SECRET!,
  
  // Connect platform settings for marketplace
  connect: {
    clientId: process.env.STRIPE_CONNECT_CLIENT_ID!,
    
    // Settings for connected accounts (creators)
    accountSettings: {
      debitNegativeBalances: true,
      payoutsEnabled: true,
      requestedCapabilities: ['transfers', 'card_payments'],
    },
    
    // Automatic payout schedule for creators
    payoutSchedule: {
      interval: 'manual' as const, // Changed to manual to align with escrow
    }
  }
};

/**
 * Platform fee percentage applied to marketplace transactions
 */
export const PLATFORM_FEE_PERCENTAGE = 8;

/**
 * Subscription plans and pricing for creators and brands
 */
export const SUBSCRIPTION_PLANS = {
  creator: {
    free: {
      id: ENVIRONMENT === 'production' ? 'price_free_creator_prod' : 'price_free_creator_test',
      name: 'Free',
      price: 0,
      interval: 'month',
      features: {
        platformsLimit: 1,
        contentItems: 100,
        teamMembers: 1,
      }
    },
    growth: {
      id: ENVIRONMENT === 'production' ? 'price_growth_creator_prod' : 'price_growth_creator_test',
      name: 'Growth',
      price: 29,
      interval: 'month',
      features: {
        platformsLimit: 3,
        contentItems: 500,
        teamMembers: 2,
        historicalData: true,
      }
    },
    professional: {
      id: ENVIRONMENT === 'production' ? 'price_pro_creator_prod' : 'price_pro_creator_test',
      name: 'Professional',
      price: 79,
      interval: 'month',
      features: {
        platformsLimit: 5,
        contentItems: 2000,
        teamMembers: 5,
        historicalData: true,
        advancedAnalytics: true,
        prioritySupport: true,
      }
    },
    business: {
      id: ENVIRONMENT === 'production' ? 'price_business_creator_prod' : 'price_business_creator_test',
      name: 'Business',
      price: 199,
      interval: 'month',
      features: {
        platformsLimit: 10,
        contentItems: 10000,
        teamMembers: 15,
        historicalData: true,
        advancedAnalytics: true,
        prioritySupport: true,
        customReporting: true,
        apiAccess: true,
      }
    }
  },
  
  brand: {
    starter: {
      id: ENVIRONMENT === 'production' ? 'price_starter_brand_prod' : 'price_starter_brand_test',
      name: 'Starter',
      price: 99,
      interval: 'month',
      features: {
        creatorDiscovery: true,
        partnershipsLimit: 5,
        teamMembers: 2,
      }
    },
    growth: {
      id: ENVIRONMENT === 'production' ? 'price_growth_brand_prod' : 'price_growth_brand_test',
      name: 'Growth',
      price: 249,
      interval: 'month',
      features: {
        creatorDiscovery: true,
        partnershipsLimit: 15,
        teamMembers: 5,
        advancedFiltering: true,
        campaignManagement: true,
      }
    },
    enterprise: {
      id: ENVIRONMENT === 'production' ? 'price_enterprise_brand_prod' : 'price_enterprise_brand_test',
      name: 'Enterprise',
      price: 599,
      interval: 'month',
      features: {
        creatorDiscovery: true,
        partnershipsLimit: 50,
        teamMembers: 25,
        advancedFiltering: true,
        campaignManagement: true,
        customReporting: true,
        prioritySupport: true,
        apiAccess: true,
      }
    }
  }
};

/**
 * Settings for payment processing including escrow and transaction limits
 */
export const PAYMENT_SETTINGS = {
  currency: 'usd',
  minimumTransactionAmount: 100, // $100 minimum transaction value
  
  // Escrow configuration for marketplace transactions
  escrow: {
    defaultSplit: {
      initialPayment: 50, // 50% upfront
      finalPayment: 50    // 50% upon completion
    },
    
    // Timeouts for automatic dispute resolution (in days)
    timeouts: {
      deliverableReview: 5,    // Days for brand to review deliverables
      escrowExpiration: 30,    // Days until unused escrow expires
      disputeResolution: 14,   // Days to resolve a dispute
    },
    
    // Dispute resolution settings
    dispute: {
      maxAttachments: 10,          // Maximum number of evidence attachments
      maxAttachmentSizeMB: 15,     // Maximum size for each attachment
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    }
  },
  
  // Fee collection config
  feeCollection: {
    method: 'direct_from_transaction', // Alternatives: separate_charge, subscription_included
    calculationTime: 'transaction_creation', // When fees are calculated
  }
};

/**
 * Creates and returns a singleton instance of the Stripe client
 * 
 * @returns Configured Stripe instance
 */
export const getStripeInstance = (): Stripe => {
  if (stripeInstance) {
    return stripeInstance;
  }

  stripeInstance = new Stripe(stripeConfig.apiKey, {
    apiVersion: stripeConfig.apiVersion,
    typescript: true,
    appInfo: {
      name: 'Engagerr',
      version: '1.0.0',
      url: 'https://engagerr.io'
    },
    telemetry: ENVIRONMENT === 'production', // Only enable telemetry in production
    maxNetworkRetries: 3, // Retry failed API requests for reliability
  });

  return stripeInstance;
};