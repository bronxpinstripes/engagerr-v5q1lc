import express, { Router } from 'express'; // ^4.18.2
const router = express.Router();

import { authenticate, requirePermission } from '../middlewares/auth';
import { validateBody, validateQuery, validateParams } from '../middlewares/validation';
import rateLimit from '../middlewares/rateLimit';
import contentController from '../controllers/content';

/**
 * Configures all content-related routes and returns the Express router
 * @returns {Router} Configured Express router for content endpoints
 */
export default function setupContentRoutes(): Router {
  // Create a new Express router instance
  const router = express.Router();

  // Set up route for retrieving individual content by ID
  router.get('/:contentId',
    rateLimit('CONTENT'),
    authenticate,
    validateParams({ contentId: 'string' }),
    contentController.getContent
  );

  // Set up route for listing creator content with filters
  router.get('/creator/:creatorId',
    rateLimit('CONTENT'),
    authenticate,
    validateParams({ creatorId: 'string' }),
    validateQuery({
      platform: 'string',
      contentType: 'string',
      startDate: 'string',
      endDate: 'string',
      page: 'number',
      limit: 'number'
    }),
    contentController.listCreatorContent
  );

  // Set up route for creating new content
  router.post('/',
    rateLimit('CONTENT'),
    authenticate,
    requirePermission('create', 'content'),
    validateBody({
      title: 'string',
      description: 'string',
      contentType: 'string',
      platformId: 'string',
      externalId: 'string',
      url: 'string'
    }),
    contentController.createContent
  );

  // Set up route for updating existing content
  router.put('/:contentId',
    rateLimit('CONTENT'),
    authenticate,
    requirePermission('edit', 'content'),
    validateParams({ contentId: 'string' }),
    validateBody({
      title: 'string',
      description: 'string',
      contentType: 'string',
      platformId: 'string',
      externalId: 'string',
      url: 'string'
    }),
    contentController.updateContent
  );

  // Set up route for deleting content
  router.delete('/:contentId',
    rateLimit('CONTENT'),
    authenticate,
    requirePermission('delete', 'content'),
    validateParams({ contentId: 'string' }),
    contentController.deleteContent
  );

  // Set up routes for managing content relationships
  router.get('/:contentId/relationships',
    rateLimit('CONTENT'),
    authenticate,
    validateParams({ contentId: 'string' }),
    validateQuery({ type: 'string' }),
    contentController.getContentRelationships
  );

  router.post('/:contentId/relationships',
    rateLimit('CONTENT'),
    authenticate,
    requirePermission('create', 'content'),
    validateParams({ contentId: 'string' }),
    validateBody({
      targetContentId: 'string',
      relationshipType: 'string'
    }),
    contentController.createRelationship
  );

  router.put('/:contentId/relationships/:relationshipId',
    rateLimit('CONTENT'),
    authenticate,
    requirePermission('edit', 'content'),
    validateParams({ contentId: 'string', relationshipId: 'string' }),
    validateBody({ relationshipType: 'string' }),
    contentController.updateRelationship
  );

  router.delete('/:contentId/relationships/:relationshipId',
    rateLimit('CONTENT'),
    authenticate,
    requirePermission('delete', 'content'),
    validateParams({ contentId: 'string', relationshipId: 'string' }),
    contentController.deleteRelationship
  );

  // Set up route for retrieving a content's family structure
  router.get('/:contentId/family',
    rateLimit('CONTENT'),
    authenticate,
    validateParams({ contentId: 'string' }),
    validateQuery({ maxDepth: 'number', includeMetrics: 'boolean' }),
    contentController.getContentFamily
  );

  // Set up route for getting visualization-ready content family data
  router.get('/:contentId/visualization',
    rateLimit('CONTENT'),
    authenticate,
    validateParams({ contentId: 'string' }),
    validateQuery({ layout: 'string', style: 'string' }),
    contentController.getContentFamilyVisualization
  );

  // Set up route for listing all content families for a creator
  router.get('/creator/:creatorId/families',
    rateLimit('CONTENT'),
    authenticate,
    validateParams({ creatorId: 'string' }),
    contentController.getCreatorContentFamilies
  );

  // Set up route for synchronizing content from a platform
  router.post('/:platformId/sync',
    rateLimit('CONTENT'),
    authenticate,
    requirePermission('create', 'content'),
    validateParams({ platformId: 'string' }),
    validateBody({ dateRange: 'object', contentTypes: 'array' }),
    contentController.syncContentFromPlatform
  );

  // Set up route for updating content metrics
  router.post('/:contentId/metrics',
    rateLimit('CONTENT'),
    authenticate,
    requirePermission('edit', 'content'),
    validateParams({ contentId: 'string' }),
    validateQuery({ forceRefresh: 'boolean' }),
    contentController.updateContentMetrics
  );

  // Set up route for analyzing content with AI
  router.post('/:contentId/analyze',
    rateLimit('CONTENT'),
    authenticate,
    requirePermission('edit', 'content'),
    validateParams({ contentId: 'string' }),
    validateQuery({ analysisType: 'string' }),
    contentController.analyzeContent
  );

  // Set up route for suggesting content relationships
  router.get('/:contentId/suggest-relationships',
    rateLimit('CONTENT'),
    authenticate,
    validateParams({ contentId: 'string' }),
    validateQuery({ confidenceThreshold: 'number', limit: 'number' }),
    contentController.suggestContentRelationships
  );

  // Set up route for generating content insights
  router.get('/:contentId/insights',
    rateLimit('CONTENT'),
    authenticate,
    validateParams({ contentId: 'string' }),
    contentController.generateContentInsights
  );

  // Return the configured router
  return router;
}