/**
 * Central export point for all external service integrations used by the Engagerr platform.
 * Implements the Integration Framework that provides a unified interface for connecting with social media platforms, payment processing services, and email delivery systems.
 */

import * as platformIntegrations from './platforms';
import * as stripeIntegrations from './stripe';
import * as resendIntegrations from './resend';
import { PlatformAdapter } from '../types/platform';
import createRateLimiter from '../middlewares/rateLimit';
import { IntegrationError } from '../utils/errors';

// Re-export platform integrations
export { platformIntegrations };

// Re-export Stripe integrations
export { stripeIntegrations };

// Re-export Resend integrations
export { resendIntegrations };

// Re-export PlatformAdapter interface
export type { PlatformAdapter };

// Re-export RateLimiter class
export { createRateLimiter as RateLimiter };

// Re-export IntegrationError class
export { IntegrationError };

// Default export combining all integration modules, shared interfaces, and utility classes
export default {
  platformIntegrations,
  stripeIntegrations,
  resendIntegrations,
  PlatformAdapter,
  RateLimiter: createRateLimiter,
  IntegrationError
};