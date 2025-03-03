/**
 * Centralized index file that aggregates and re-exports all controllers from the Engagerr platform.
 * This file simplifies importing multiple controllers by providing a single import point for route definitions and other components that need access to controller functions.
 */

// Import authentication-related controller functions
import * as authController from './auth';

// Import user management controller functions
import userController from './users';

// Import creator profile management controller functions
import creatorController from './creators';

// Import brand profile management controller functions
import brandController from './brands';

// Import content management controller functions
import contentController from './content';

// Import analytics and metrics controller functions
import analyticsController from './analytics';

// Import social platform integration controller functions
import platformController from './platforms';

// Import creator discovery and matching controller functions
import discoveryController from './discovery';

// Import partnership management controller functions
import partnershipController from './partnerships';

// Import payment processing controller functions
import paymentController from './payments';

// Import subscription management controller functions
import subscriptionController from './subscriptions';

// Import AI processing controller functions
import aiController from './ai';

// Import webhook handler controller functions
import webhookController from './webhooks';

// Export authentication controller functions
export { authController };

// Export user management controller functions
export { userController };

// Export creator profile management controller functions
export { creatorController };

// Export brand profile management controller functions
export { brandController };

// Export content management controller functions
export { contentController };

// Export analytics controller functions
export { analyticsController };

// Export platform integration controller functions
export { platformController };

// Export creator discovery controller functions
export { discoveryController };

// Export partnership management controller functions
export { partnershipController };

// Export payment processing controller functions
export { paymentController };

// Export subscription management controller functions
export { subscriptionController };

// Export AI processing controller functions
export { aiController };

// Export webhook handler controller functions
export { webhookController };