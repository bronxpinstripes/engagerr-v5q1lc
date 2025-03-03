import express, { Router } from 'express'; // ^4.18.2
import { authenticate, requireRole } from '../middlewares/auth';
import { validateSchema } from '../middlewares/validation';
import analyticsController from '../controllers/analytics';
import { UserTypes } from '../types/user';
import { analyticsValidationSchemas } from '../utils/validation';

/**
 * Creates and configures the Express router for analytics API endpoints
 * @returns Configured Express router with analytics routes
 */
function createAnalyticsRouter(): Router {
  // Create a new Express router instance
  const router = express.Router();

  // Configure content analytics routes
  // Route for retrieving analytics for a specific content item
  router.get('/content/:contentId',
    authenticate, // Authentication middleware to secure the route
    validateSchema(analyticsValidationSchemas.timePeriodSchema), // Validation middleware for query parameters
    analyticsController.getContentAnalytics // Controller function to handle the request
  );

  // Route for retrieving analytics for a content family
  router.get('/content/:contentId/family',
    authenticate, // Authentication middleware to secure the route
    validateSchema(analyticsValidationSchemas.timePeriodSchema), // Validation middleware for query parameters
    analyticsController.getContentFamilyAnalytics // Controller function to handle the request
  );

  // Configure creator analytics routes
  // Route for retrieving aggregated analytics for a creator
  router.get('/creator/:creatorId',
    authenticate, // Authentication middleware to secure the route
    validateSchema(analyticsValidationSchemas.timePeriodSchema), // Validation middleware for query parameters
    analyticsController.getCreatorAnalytics // Controller function to handle the request
  );

  // Configure insights and recommendations routes
  // Route for generating or retrieving analytics-based insights
  router.get('/insights/:entityType/:entityId',
    authenticate, // Authentication middleware to secure the route
    analyticsController.getInsights // Controller function to handle the request
  );

  // Route for retrieving insights for a specific content item
  router.get('/content/:contentId/insights',
    authenticate, // Authentication middleware to secure the route
    analyticsController.getContentInsights // Controller function to handle the request
  );

  // Route for getting content repurposing recommendations
  router.get('/content/:contentId/repurposing',
    authenticate, // Authentication middleware to secure the route
    analyticsController.getRepurposingRecommendations // Controller function to handle the request
  );

  // Configure advanced analytics query routes
  // Route for querying analytics with multiple parameters
  router.post('/query',
    authenticate, // Authentication middleware to secure the route
    validateSchema(analyticsValidationSchemas.analyticsQuerySchema), // Validation middleware for request body
    analyticsController.queryAnalytics // Controller function to handle the request
  );

  // Route for querying time series data for specific metrics
  router.get('/metrics/:entityType/:entityId/timeseries',
    authenticate, // Authentication middleware to secure the route
    validateSchema(analyticsValidationSchemas.metricsQuerySchema), // Validation middleware for query parameters
    analyticsController.getMetricsTimeSeries // Controller function to handle the request
  );

  // Return the configured router
  return router;
}

// Export configured analytics router for use in the main application router
export default createAnalyticsRouter();