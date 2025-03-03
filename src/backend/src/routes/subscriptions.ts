import { Router } from 'express'; // version ^4.18.2
import {
  createSubscriptionController,
  getSubscriptionController,
  getUserSubscriptionController,
  updateSubscriptionStatusController,
  changeSubscriptionTierController,
  cancelSubscriptionController,
  reactivateSubscriptionController,
  createBillingPortalSessionController,
  checkFeatureAccessController,
  getSubscriptionFeaturesController,
  getAllUserSubscriptionsController,
  compareTiersController,
} from '../controllers/subscriptions';
import { authenticate, requireRole } from '../middlewares/auth';
import { validateBody, validateQuery, validateParams } from '../middlewares/validation';
import { UserRole, UserType } from '../types';
import * as yup from 'yup'; // version ^1.2.0

const router = Router();

/**
 * Creates and exports validation schemas for subscription-related requests
 */
function createSubscriptionValidationSchemas() {
  // Define createSubscriptionSchema for new subscription requests
  const createSubscriptionSchema = yup.object({
    tier: yup.string().required('Subscription tier is required'),
    userType: yup.string().oneOf(['creator', 'brand']).required('User type is required'),
    paymentMethodId: yup.string().uuid('Payment method ID must be a valid UUID'),
    metadata: yup.object().optional(),
    returnUrl: yup.string().url('Return URL must be a valid URL').optional()
  });

  // Define updateSubscriptionSchema for subscription status updates
  const updateSubscriptionSchema = yup.object({
    status: yup.string().required('Status is required'),
    metadata: yup.object().optional()
  });

  // Define changeSubscriptionTierSchema for tier change requests
  const changeSubscriptionTierSchema = yup.object({
    newTier: yup.string().required('New tier is required'),
    immediateChange: yup.boolean().optional(),
    metadata: yup.object().optional()
  });

  // Define cancelSubscriptionSchema for cancellation requests
  const cancelSubscriptionSchema = yup.object({
    immediateCancel: yup.boolean().optional()
  });

  // Define billingPortalSchema for billing portal creation requests
  const billingPortalSchema = yup.object({
    returnUrl: yup.string().url('Return URL must be a valid URL').required('Return URL is required')
  });

  // Define featureAccessSchema for feature access check requests
  const featureAccessSchema = yup.object({
    featureKey: yup.string().required('Feature key is required')
  });

  // Define getSubscriptionFeaturesSchema for retrieving subscription features
  const getSubscriptionFeaturesSchema = yup.object({
    tier: yup.string().required('Tier is required'),
    userType: yup.string().oneOf(['creator', 'brand']).required('User type is required')
  });

  // Define compareTiersSchema for comparing subscription tiers
  const compareTiersSchema = yup.object({
    userType: yup.string().oneOf(['creator', 'brand']).required('User type is required')
  });

  // Return object containing all defined schemas
  return {
    createSubscriptionSchema,
    updateSubscriptionSchema,
    changeSubscriptionTierSchema,
    cancelSubscriptionSchema,
    billingPortalSchema,
    featureAccessSchema,
    getSubscriptionFeaturesSchema,
    compareTiersSchema
  };
}

const {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  changeSubscriptionTierSchema,
  cancelSubscriptionSchema,
  billingPortalSchema,
  featureAccessSchema,
  getSubscriptionFeaturesSchema,
  compareTiersSchema
} = createSubscriptionValidationSchemas();

// Configure routes for subscription management
router.post('/', authenticate, validateBody(createSubscriptionSchema), createSubscriptionController);
router.get('/:subscriptionId', authenticate, validateParams(yup.object({ subscriptionId: yup.string().uuid().required() })), getSubscriptionController);
router.get('/user/me', authenticate, getUserSubscriptionController);
router.put('/:subscriptionId', authenticate, requireRole([UserRole.SYSTEM_ADMIN]), validateParams(yup.object({ subscriptionId: yup.string().uuid().required() })), validateBody(updateSubscriptionSchema), updateSubscriptionStatusController);
router.put('/:subscriptionId/tier', authenticate, requireRole([UserRole.SYSTEM_ADMIN]), validateParams(yup.object({ subscriptionId: yup.string().uuid().required() })), validateBody(changeSubscriptionTierSchema), changeSubscriptionTierController);
router.post('/:subscriptionId/cancel', authenticate, validateParams(yup.object({ subscriptionId: yup.string().uuid().required() })), validateBody(cancelSubscriptionSchema), cancelSubscriptionController);
router.post('/:subscriptionId/reactivate', authenticate, requireRole([UserRole.SYSTEM_ADMIN]), validateParams(yup.object({ subscriptionId: yup.string().uuid().required() })), reactivateSubscriptionController);
router.post('/billing-portal', authenticate, validateBody(billingPortalSchema), createBillingPortalSessionController);
router.get('/feature/access', authenticate, validateQuery(featureAccessSchema), checkFeatureAccessController);
router.get('/features/list', authenticate, validateQuery(getSubscriptionFeaturesSchema), getSubscriptionFeaturesController);
router.get('/user/all', authenticate, requireRole([UserRole.SYSTEM_ADMIN]), getAllUserSubscriptionsController);
router.get('/tiers/compare', authenticate, validateQuery(compareTiersSchema), compareTiersController);

export default router;