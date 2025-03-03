/**
 * Defines API routes for the Creator Discovery marketplace feature, enabling brands to search for creators using various filtering criteria, access AI-powered recommendations, and manage saved searches.
 */

import express from 'express'; // Express framework for creating and configuring the router // ^4.18.2
import discoveryController from '../controllers/discovery'; // Controller functions for discovery operations
import { authenticate, requireRole, optionalAuth } from '../middlewares/auth'; // Authentication middleware for protecting routes
import { validateBody, validateQuery, validateParams } from '../middlewares/validation'; // Request body validation middleware
import { UserTypes } from '../types/user'; // User type definitions for role-based access control
import {
    SearchCreatorsSchema,
    SaveSearchSchema,
    PaginationQuerySchema,
    CategoryParamSchema,
    FollowerRangeSchema,
    EngagementRateSchema
} from '../types/api'; // Validation schema for creator search requests

// Create a new Express Router instance
const router = express.Router();

/**
 * Configures the discovery router with all discovery-related routes and middleware
 * @returns Configured Express router with discovery routes
 */
export function configureRouter(): express.Router {
    // Apply route-specific middleware where needed

    // Define routes for discovery operations with appropriate HTTP methods
    router.post('/search',
        authenticate,
        requireRole(UserTypes.UserType.BRAND),
        validateBody(SearchCreatorsSchema),
        discoveryController.searchCreators);

    router.get('/creators/:creatorId',
        optionalAuth,
        discoveryController.getCreatorById);

    router.get('/category/:category',
        optionalAuth,
        validateParams(CategoryParamSchema),
        discoveryController.getCreatorsByCategory);

    router.get('/followers',
        optionalAuth,
        validateQuery(FollowerRangeSchema),
        discoveryController.getCreatorsByFollowerCount);

    router.get('/engagement',
        optionalAuth,
        validateQuery(EngagementRateSchema),
        discoveryController.getCreatorsByEngagementRate);

    router.get('/popular',
        optionalAuth,
        discoveryController.getPopularCreators);

    router.get('/recommend',
        authenticate,
        requireRole(UserTypes.UserType.BRAND),
        discoveryController.getRecommendedCreators);

    router.get('/similar/:creatorId',
        optionalAuth,
        discoveryController.getSimilarCreators);

    router.get('/saved-searches',
        authenticate,
        requireRole(UserTypes.UserType.BRAND),
        discoveryController.getSavedSearches);

    router.get('/saved-searches/:searchId',
        authenticate,
        requireRole(UserTypes.UserType.BRAND),
        discoveryController.getSavedSearch);

    router.post('/save-search',
        authenticate,
        requireRole(UserTypes.UserType.BRAND),
        validateBody(SaveSearchSchema),
        discoveryController.saveSearch);

    router.get('/execute-search/:searchId',
        authenticate,
        requireRole(UserTypes.UserType.BRAND),
        discoveryController.executeSearch);

    router.delete('/saved-searches/:searchId',
        authenticate,
        requireRole(UserTypes.UserType.BRAND),
        discoveryController.deleteSavedSearch);

    router.get('/detailed-match/:creatorId',
        authenticate,
        requireRole(UserTypes.UserType.BRAND),
        discoveryController.getDetailedMatch);

    // Return the configured router
    return router;
}

// Configure the router
const router = configureRouter();

// Export the configured router
export default router;