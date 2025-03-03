import { Router } from 'express'; // express ^4.18.2
import multer from 'multer'; // multer ^1.4.5-lts.1
import brandController from '../controllers/brands';
import { authenticate, requireRole, requirePermission } from '../middlewares/auth';
import { validateBody, validateQuery, validateParams } from '../middlewares/validation';
import { schemas } from '../utils/validation';
import { UserRole } from '../types/user';
import { BrandTypes } from '../types/brand';
import { rateLimiter } from '../middlewares/rateLimit';

// Create a new Express router instance
const brandsRouter = Router();

/**
 * Configures and returns an Express router with all brand-related routes
 * @returns Configured Express router with brand routes
 */
export default function configureBrandRoutes(): Router {
  // Define routes for brand profile management
  brandsRouter.get('/:brandId',
    authenticate,
    rateLimiter('CONTENT'),
    requirePermission('read', 'brand'),
    brandController.getBrand
  );

  brandsRouter.get('/user',
    authenticate,
    rateLimiter('CONTENT'),
    brandController.getBrandByUser
  );

  brandsRouter.post('/',
    authenticate,
    rateLimiter('CONTENT'),
    validateBody(schemas.brandSchema.create),
    brandController.createBrand
  );

  brandsRouter.put('/:brandId',
    authenticate,
    rateLimiter('CONTENT'),
    requirePermission('update', 'brand'),
    validateBody(schemas.brandSchema.create),
    brandController.updateBrand
  );

  brandsRouter.post('/:brandId/logo',
    authenticate,
    rateLimiter('CONTENT'),
    requirePermission('update', 'brand'),
    brandController.uploadBrandLogo
  );

  brandsRouter.get('/:brandId/profile',
    rateLimiter('CONTENT'),
    brandController.getBrandProfile
  );

  // Define routes for brand settings management
  brandsRouter.get('/:brandId/settings',
    authenticate,
    rateLimiter('CONTENT'),
    requirePermission('read', 'brand'),
    brandController.getBrandSettings
  );

  brandsRouter.put('/:brandId/settings',
    authenticate,
    rateLimiter('CONTENT'),
    requirePermission('update', 'brand'),
    validateBody(schemas.brandSchema.create),
    brandController.updateBrandSettings
  );

  // Define routes for creator discovery
  brandsRouter.put('/:brandId/discovery-preferences',
    authenticate,
    rateLimiter('CONTENT'),
    requirePermission('update', 'brand'),
    validateBody(schemas.brandSchema.create),
    brandController.updateDiscoveryPreferences
  );

  brandsRouter.get('/:brandId/discover',
    authenticate,
    rateLimiter('DISCOVERY'),
    requirePermission('read', 'brand'),
    validateQuery(schemas.brandSchema.create),
    brandController.discoverCreators
  );

  brandsRouter.get('/:brandId/recommended',
    authenticate,
    rateLimiter('DISCOVERY'),
    requirePermission('read', 'brand'),
    brandController.getRecommendedCreators
  );

  // Define routes for saved searches
  brandsRouter.post('/:brandId/searches',
    authenticate,
    rateLimiter('CONTENT'),
    requirePermission('create', 'brand-search'),
    validateBody(schemas.brandSchema.create),
    brandController.saveSearch
  );

  brandsRouter.get('/:brandId/searches',
    authenticate,
    rateLimiter('CONTENT'),
    requirePermission('read', 'brand'),
    brandController.getSavedSearches
  );

  // Define routes for brand analytics
  brandsRouter.get('/:brandId/statistics',
    authenticate,
    rateLimiter('ANALYTICS'),
    requirePermission('read', 'brand'),
    brandController.getBrandStatistics
  );

  // Define routes for deleting a brand profile
  brandsRouter.delete('/:brandId',
    authenticate,
    rateLimiter('CONTENT'),
    requirePermission('delete', 'brand'),
    brandController.deleteBrand
  );

  // Return the configured router
  return brandsRouter;
}