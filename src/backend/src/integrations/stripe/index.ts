/**
 * Main entry point for the Stripe integration module in the Engagerr platform,
 * providing a unified interface to access payment processing, subscription management,
 * marketplace transactions, and webhook handling functionality.
 */

import * as payment from './payment'; // v12.0.0 - Import payment processing functionality
import * as subscription from './subscription'; // v12.0.0 - Import subscription management functionality
import * as connect from './connect'; // v12.0.0 - Import Stripe Connect functionality for marketplace
import * as webhooks from './webhooks'; // v12.0.0 - Import webhook handling functionality

// Export payment processing functions for direct payment handling
export { payment };

// Export subscription management functions for creator and brand subscriptions
export { subscription };

// Export Stripe Connect functions for marketplace payment transfers to creators
export { connect };

// Export webhook handling functions for processing Stripe events
export { webhooks };