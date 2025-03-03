/**
 * Application-wide constants and configuration
 * Defines environment settings, API endpoints, rate limits, feature flags, and other constants
 */

import * as dotenv from 'dotenv'; // v16.3.1

// Load environment variables from .env file
dotenv.config();

/**
 * Enum for different deployment environments
 */
export enum ENVIRONMENTS {
  DEVELOPMENT = 'development',
  TEST = 'test',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

/**
 * Determines the current runtime environment based on environment variables
 * @returns The current environment (development, test, staging, production)
 */
export function getEnvironment(): string {
  const env = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
  
  if (Object.values(ENVIRONMENTS).includes(env as ENVIRONMENTS)) {
    return env;
  }
  
  console.warn(`Unknown environment: ${env}. Defaulting to ${ENVIRONMENTS.DEVELOPMENT}`);
  return ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Application configuration for different environments
 */
export const APP_CONFIG = {
  [ENVIRONMENTS.DEVELOPMENT]: {
    ENVIRONMENT: ENVIRONMENTS.DEVELOPMENT,
    IS_PRODUCTION: false,
    IS_DEVELOPMENT: true,
    IS_TEST: false,
    IS_STAGING: false,
    BASE_URL: 'http://localhost:3000',
    API_VERSION: 'v1',
    FEATURE_FLAGS: {
      ENABLE_AI_CONTENT_MAPPING: true,
      ENABLE_ADVANCED_ANALYTICS: true,
      ENABLE_PARTNERSHIP_WORKFLOWS: true,
      ENABLE_MULTI_MODEL_AI: true,
      ENABLE_MEDIA_KIT_GENERATION: true,
      ENABLE_SOCIAL_PLATFORM_WEBHOOKS: true
    }
  },
  [ENVIRONMENTS.TEST]: {
    ENVIRONMENT: ENVIRONMENTS.TEST,
    IS_PRODUCTION: false,
    IS_DEVELOPMENT: false,
    IS_TEST: true,
    IS_STAGING: false,
    BASE_URL: 'http://localhost:3000',
    API_VERSION: 'v1',
    FEATURE_FLAGS: {
      ENABLE_AI_CONTENT_MAPPING: true,
      ENABLE_ADVANCED_ANALYTICS: true,
      ENABLE_PARTNERSHIP_WORKFLOWS: true,
      ENABLE_MULTI_MODEL_AI: true,
      ENABLE_MEDIA_KIT_GENERATION: true,
      ENABLE_SOCIAL_PLATFORM_WEBHOOKS: false // Disabled for tests
    }
  },
  [ENVIRONMENTS.STAGING]: {
    ENVIRONMENT: ENVIRONMENTS.STAGING,
    IS_PRODUCTION: false,
    IS_DEVELOPMENT: false,
    IS_TEST: false,
    IS_STAGING: true,
    BASE_URL: 'https://staging.engagerr.app',
    API_VERSION: 'v1',
    FEATURE_FLAGS: {
      ENABLE_AI_CONTENT_MAPPING: true,
      ENABLE_ADVANCED_ANALYTICS: true,
      ENABLE_PARTNERSHIP_WORKFLOWS: true,
      ENABLE_MULTI_MODEL_AI: true,
      ENABLE_MEDIA_KIT_GENERATION: true,
      ENABLE_SOCIAL_PLATFORM_WEBHOOKS: true
    }
  },
  [ENVIRONMENTS.PRODUCTION]: {
    ENVIRONMENT: ENVIRONMENTS.PRODUCTION,
    IS_PRODUCTION: true,
    IS_DEVELOPMENT: false,
    IS_TEST: false,
    IS_STAGING: false,
    BASE_URL: 'https://engagerr.app',
    API_VERSION: 'v1',
    FEATURE_FLAGS: {
      ENABLE_AI_CONTENT_MAPPING: true,
      ENABLE_ADVANCED_ANALYTICS: true,
      ENABLE_PARTNERSHIP_WORKFLOWS: true,
      ENABLE_MULTI_MODEL_AI: true,
      ENABLE_MEDIA_KIT_GENERATION: true,
      ENABLE_SOCIAL_PLATFORM_WEBHOOKS: true
    }
  }
};

/**
 * Returns the appropriate configuration for the current environment
 * @returns Environment-specific configuration object
 */
export function getConfig(): typeof APP_CONFIG[keyof typeof APP_CONFIG] {
  const env = getEnvironment();
  const config = { ...APP_CONFIG[env as keyof typeof APP_CONFIG] };
  
  // Apply any dynamic overrides from environment variables
  if (process.env.BASE_URL) {
    config.BASE_URL = process.env.BASE_URL;
  }
  
  if (process.env.API_VERSION) {
    config.API_VERSION = process.env.API_VERSION;
  }
  
  // Feature flag overrides
  const featureFlagPrefix = 'FEATURE_FLAG_';
  Object.keys(process.env).forEach(key => {
    if (key.startsWith(featureFlagPrefix)) {
      const flagName = key.replace(featureFlagPrefix, '');
      const flagValue = process.env[key]?.toLowerCase() === 'true';
      
      if (config.FEATURE_FLAGS.hasOwnProperty(flagName)) {
        config.FEATURE_FLAGS[flagName] = flagValue;
      }
    }
  });
  
  return config;
}

/**
 * Authentication and security related constants
 */
export const AUTH_CONSTANTS = {
  // JWT token expiry in seconds (4 hours)
  ACCESS_TOKEN_EXPIRY: 14400,
  // Refresh token expiry in seconds (30 days)
  REFRESH_TOKEN_EXPIRY: 2592000,
  // Minimum password length requirement
  PASSWORD_MIN_LENGTH: 10,
  // Number of previous passwords to prevent reuse
  PASSWORD_HISTORY_COUNT: 5,
  // Maximum failed login attempts before cooldown
  MAX_LOGIN_ATTEMPTS: 5,
  // Cooldown period in minutes after max login attempts
  LOGIN_COOLDOWN_MINUTES: 15,
  // MFA requirement level (none, optional, required)
  MFA_REQUIREMENT: 'optional',
  // Session inactivity timeout in seconds (1 hour)
  SESSION_INACTIVITY_TIMEOUT: 3600
};

/**
 * Storage bucket names for different types of assets
 */
export const STORAGE_BUCKETS = {
  MEDIA_KIT_ASSETS: 'media-kit-assets',
  PROFILE_IMAGES: 'profile-images',
  CONTENT_THUMBNAILS: 'content-thumbnails',
  CONTRACT_DOCUMENTS: 'contract-documents',
  PARTNERSHIP_ASSETS: 'partnership-assets',
  TEMP_UPLOADS: 'temp-uploads'
};

/**
 * Rate limiting configurations for different API endpoints
 */
export const API_RATE_LIMITS = {
  DEFAULT: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false
  },
  CONTENT: {
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute
    standardHeaders: true,
    legacyHeaders: false
  },
  ANALYTICS: {
    windowMs: 60 * 1000, // 1 minute
    max: 40, // 40 requests per minute
    standardHeaders: true,
    legacyHeaders: false
  },
  DISCOVERY: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    standardHeaders: true,
    legacyHeaders: false
  },
  AI: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    standardHeaders: true,
    legacyHeaders: false
  },
  WEBHOOKS: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    standardHeaders: true,
    legacyHeaders: false
  }
};

/**
 * Supported currency codes
 */
export const CURRENCY_CODES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  CAD: 'CAD',
  AUD: 'AUD',
  DEFAULT: 'USD'
};

/**
 * Platform fee structure for marketplace transactions
 */
export const PLATFORM_FEES = {
  BASE_PERCENTAGE: 8.0, // 8% standard fee
  MINIMUM_FEE: 1.00, // $1.00 minimum fee
  ENTERPRISE_PERCENTAGE: 5.0, // 5% enterprise fee
  ESCROW_FEE_PERCENTAGE: 1.0 // 1% additional fee for escrow services
};

/**
 * Subscription plan configurations and feature limits
 */
export const SUBSCRIPTION_PLANS = {
  CREATOR: {
    FREE: {
      name: 'Free',
      maxPlatforms: 1,
      maxContentItems: 100,
      maxHistoricalDataMonths: 3,
      priceUSD: 0,
      allowAdvancedAnalytics: false,
      allowContentMapping: true,
      allowMediaKitGeneration: false,
      allowTeamMembers: 0
    },
    GROWTH: {
      name: 'Growth',
      maxPlatforms: 3,
      maxContentItems: 500,
      maxHistoricalDataMonths: 12,
      priceUSD: 19.99,
      allowAdvancedAnalytics: true,
      allowContentMapping: true,
      allowMediaKitGeneration: true,
      allowTeamMembers: 1
    },
    PRO: {
      name: 'Pro',
      maxPlatforms: 5,
      maxContentItems: 2000,
      maxHistoricalDataMonths: 24,
      priceUSD: 49.99,
      allowAdvancedAnalytics: true,
      allowContentMapping: true,
      allowMediaKitGeneration: true,
      allowTeamMembers: 3
    },
    ENTERPRISE: {
      name: 'Enterprise',
      maxPlatforms: -1, // Unlimited
      maxContentItems: -1, // Unlimited
      maxHistoricalDataMonths: 36,
      priceUSD: 199.99,
      allowAdvancedAnalytics: true,
      allowContentMapping: true,
      allowMediaKitGeneration: true,
      allowTeamMembers: 10
    }
  },
  BRAND: {
    STARTER: {
      name: 'Starter',
      maxActivePartnerships: 3,
      maxDiscoveryResults: 100,
      maxSavedCreators: 50,
      priceUSD: 99.99,
      allowAdvancedFiltering: false,
      allowTeamMembers: 1
    },
    GROWTH: {
      name: 'Growth',
      maxActivePartnerships: 10,
      maxDiscoveryResults: 500,
      maxSavedCreators: 250,
      priceUSD: 299.99,
      allowAdvancedFiltering: true,
      allowTeamMembers: 5
    },
    ENTERPRISE: {
      name: 'Enterprise',
      maxActivePartnerships: -1, // Unlimited
      maxDiscoveryResults: -1, // Unlimited
      maxSavedCreators: -1, // Unlimited
      priceUSD: 999.99,
      allowAdvancedFiltering: true,
      allowTeamMembers: 20
    }
  }
};

/**
 * Cache duration settings for different types of data (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  ANALYTICS: 1800, // 30 minutes
  CONTENT: 600, // 10 minutes
  DISCOVERY: 300, // 5 minutes
  PROFILE: 900, // 15 minutes
  PUBLIC: 1800 // 30 minutes
};

/**
 * Standardized error codes used throughout the application
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PLATFORM_CONNECTION_ERROR: 'PLATFORM_CONNECTION_ERROR',
  PAYMENT_PROCESSING_ERROR: 'PAYMENT_PROCESSING_ERROR',
  CONTENT_MAPPING_ERROR: 'CONTENT_MAPPING_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  SUBSCRIPTION_ERROR: 'SUBSCRIPTION_ERROR',
  MEDIA_KIT_GENERATION_ERROR: 'MEDIA_KIT_GENERATION_ERROR',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED'
};

/**
 * Default pagination settings for API endpoints
 */
export const DEFAULT_PAGINATION = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  OFFSET: 0
};

/**
 * External platform API configurations
 */
export const PLATFORM_APIS = {
  YOUTUBE: {
    API_VERSION: 'v3',
    BASE_URL: 'https://www.googleapis.com/youtube',
    SCOPES: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ],
    METRICS_REFRESH_INTERVAL: 3600, // 1 hour in seconds
    WEBHOOK_ENABLED: true
  },
  INSTAGRAM: {
    API_VERSION: 'v18.0',
    BASE_URL: 'https://graph.instagram.com',
    SCOPES: [
      'user_profile',
      'user_media'
    ],
    METRICS_REFRESH_INTERVAL: 3600, // 1 hour in seconds
    WEBHOOK_ENABLED: true
  },
  TIKTOK: {
    API_VERSION: 'v2',
    BASE_URL: 'https://open.tiktokapis.com',
    SCOPES: [
      'user.info.basic',
      'video.list',
      'video.info'
    ],
    METRICS_REFRESH_INTERVAL: 3600, // 1 hour in seconds
    WEBHOOK_ENABLED: true
  },
  TWITTER: {
    API_VERSION: 'v2',
    BASE_URL: 'https://api.twitter.com',
    SCOPES: [
      'tweet.read',
      'users.read',
      'offline.access'
    ],
    METRICS_REFRESH_INTERVAL: 3600, // 1 hour in seconds
    WEBHOOK_ENABLED: true
  },
  LINKEDIN: {
    API_VERSION: 'v2',
    BASE_URL: 'https://api.linkedin.com',
    SCOPES: [
      'r_liteprofile',
      'r_organization_social'
    ],
    METRICS_REFRESH_INTERVAL: 3600, // 1 hour in seconds
    WEBHOOK_ENABLED: false
  }
};

/**
 * AI model configurations
 */
export const AI_MODELS = {
  DEEPSEEK: {
    API_URL: 'https://api.deepseek.com',
    API_VERSION: 'v1',
    DEFAULT_MODEL: 'deepseek-chat',
    TIMEOUT_MS: 30000,
    MAX_TOKENS: 4096,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000
  },
  LLAMA: {
    SERVICE_URL: process.env.LLAMA_SERVICE_URL || 'http://localhost:8000',
    DEFAULT_MODEL: 'llama-3-8b',
    TIMEOUT_MS: 60000,
    MAX_TOKENS: 4096,
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY_MS: 2000
  },
  MISTRAL: {
    SERVICE_URL: process.env.MISTRAL_SERVICE_URL || 'http://localhost:8001',
    DEFAULT_MODEL: 'mistral-7b',
    TIMEOUT_MS: 30000,
    MAX_TOKENS: 4096,
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY_MS: 2000
  },
  CLIP_BLIP: {
    API_URL: 'https://api.hf.space',
    API_VERSION: 'v1',
    DEFAULT_MODEL: 'clip-vit-base',
    TIMEOUT_MS: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000
  }
};

/**
 * Partnership workflow constants
 */
export const PARTNERSHIP_CONSTANTS = {
  MINIMUM_CONTRACT_VALUE: 100.00, // Minimum $100 for contracts
  DEFAULT_ESCROW_PERCENTAGE: 50, // 50% held in escrow by default
  REVISION_REQUEST_LIMIT: 3, // Maximum number of revision requests
  CONTRACT_ACCEPTANCE_WINDOW_DAYS: 7, // 7 days to accept a contract
  DELIVERABLE_REVIEW_WINDOW_HOURS: 48, // 48 hours to review deliverables
  AUTOMATED_PAYMENT_RELEASE_DAYS: 7 // Auto-release payment after 7 days if no review
};

/**
 * Export environment-specific configuration
 */
export const ENVIRONMENT = getEnvironment();
export const IS_PRODUCTION = APP_CONFIG[ENVIRONMENT as keyof typeof APP_CONFIG].IS_PRODUCTION;
export const IS_DEVELOPMENT = APP_CONFIG[ENVIRONMENT as keyof typeof APP_CONFIG].IS_DEVELOPMENT;
export const IS_TEST = APP_CONFIG[ENVIRONMENT as keyof typeof APP_CONFIG].IS_TEST;
export const IS_STAGING = APP_CONFIG[ENVIRONMENT as keyof typeof APP_CONFIG].IS_STAGING;
export const BASE_URL = APP_CONFIG[ENVIRONMENT as keyof typeof APP_CONFIG].BASE_URL;
export const API_VERSION = APP_CONFIG[ENVIRONMENT as keyof typeof APP_CONFIG].API_VERSION;
export const FEATURE_FLAGS = APP_CONFIG[ENVIRONMENT as keyof typeof APP_CONFIG].FEATURE_FLAGS;