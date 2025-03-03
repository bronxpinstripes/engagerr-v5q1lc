/**
 * Barrel file that aggregates and re-exports all models from the models directory,
 * providing a centralized access point for database operations across the Engagerr platform.
 */

// Import user model for re-export
import userModel from './user';

// Import creator model for re-export
import creatorModel from './creator';

// Import brand model for re-export
import brandModel from './brand';

// Import platform model for re-export
import platformModel from './platform';

// Import content model for re-export
import contentModel from './content';

// Import content relationship model for re-export
import contentRelationshipModel from './contentRelationship';

// Import analytics model for re-export
import analyticsModel from './analytics';

// Import audience model for re-export
import audienceModel from './audience';

// Import partnership model for re-export
import partnershipModel from './partnership';

// Import contract model for re-export
import contractModel from './contract';

// Import payment model for re-export
import paymentModel from './payment';

// Import subscription model for re-export
import subscriptionModel from './subscription';

/**
 * Re-export user model for user management operations
 */
export { userModel };

/**
 * Re-export creator model for creator profile operations
 */
export { creatorModel };

/**
 * Re-export brand model for brand profile operations
 */
export { brandModel };

/**
 * Re-export platform model for platform connection operations
 */
export { platformModel };

/**
 * Re-export content model for content management operations
 */
export { contentModel };

/**
 * Re-export content relationship model for managing content hierarchies
 */
export { contentRelationshipModel };

/**
 * Re-export analytics model for performance metrics operations
 */
export { analyticsModel };

/**
 * Re-export audience model for demographic data operations
 */
export { audienceModel };

/**
 * Re-export partnership model for creator-brand collaboration operations
 */
export { partnershipModel };

/**
 * Re-export contract model for legal agreement operations
 */
export { contractModel };

/**
 * Re-export payment model for financial transaction operations
 */
export { paymentModel };

/**
 * Re-export subscription model for subscription management operations
 */
export { subscriptionModel };