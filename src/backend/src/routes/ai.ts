import express from 'express'; // ^4.18.2
import * as yup from 'yup'; // ^1.2+
import aiController from '../controllers/ai';
import { authenticate, requireRole } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import createRateLimiter from '../middlewares/rateLimit';
import { UserType } from '../types/user';
import { TASK_TYPES } from '../config/ai';

const router = express.Router();

function createAnalysisSchema(): yup.Schema {
  // Define schema with required and optional fields
  const schema = yup.object({
    content: yup.string(),
    contentId: yup.string().uuid(),
    analysisType: yup.string().oneOf(Object.values(TASK_TYPES)),
  }).test(
    'either-content-or-contentId',
    'Either content or contentId must be provided',
    (obj) => !!obj.content || !!obj.contentId
  );

  // Validate content field is present or contentId is provided
  // Validate analysis type is one of the supported types
  // Add conditional validation based on content type (text, image, video)
  // Return the completed schema
  return schema;
}

function createGenerationSchema(): yup.Schema {
  // Define schema with prompt, format, style, and length parameters
  const schema = yup.object({
    prompt: yup.string().required('Prompt is required').min(10, 'Prompt must be at least 10 characters'),
    referenceContentId: yup.string().uuid(),
    format: yup.string(),
    style: yup.string(),
    length: yup.string(),
  });

  // Validate prompt field is required and has minimum length
  // Validate format is one of the supported content formats
  // Add optional referenceContentId field for context
  // Return the completed schema
  return schema;
}

function createRelationshipSchema(): yup.Schema {
  // Define schema requiring sourceContentId field
  const schema = yup.object({
    sourceContentId: yup.string().uuid().required('sourceContentId is required'),
    potentialRelatedContentIds: yup.array().of(yup.string().uuid()).min(1, 'At least one potentialRelatedContentId is required'),
    confidenceThreshold: yup.number(),
  });

  // Add potentialRelatedContentIds as an array of valid IDs
  // Validate at least one potential related content ID is provided
  // Add optional confidence threshold parameter
  // Return the completed schema
  return schema;
}

function createClassificationSchema(): yup.Schema {
  // Define schema with required and optional fields
  const schema = yup.object({
    content: yup.string(),
    contentId: yup.string().uuid(),
    classificationType: yup.string().oneOf(Object.values(TASK_TYPES)),
  }).test(
    'either-content-or-contentId',
    'Either content or contentId must be provided',
    (obj) => !!obj.content || !!obj.contentId
  );

  // Validate content field is present or contentId is provided
  // Validate classificationType is one of the supported types
  // Add conditional validation based on classification type
  // Return the completed schema
  return schema;
}

function createRepurposingSchema(): yup.Schema {
  // Define schema requiring contentId field
  const schema = yup.object({
    contentId: yup.string().uuid().required('contentId is required'),
    targetPlatforms: yup.array().of(yup.string()).min(1, 'At least one targetPlatform is required'),
  });

  // Add targetPlatforms as an array of valid platform types
  // Validate at least one target platform is provided
  // Add optional parameters for customizing suggestions
  // Return the completed schema
  return schema;
}

function createMatchingSchema(): yup.Schema {
  // Define schema requiring both brandId and creatorId fields
  const schema = yup.object({
    brandId: yup.string().uuid().required('brandId is required'),
    creatorId: yup.string().uuid().required('creatorId is required'),
  });

  // Validate both IDs are in valid UUID format
  // Add optional parameters for customizing matching criteria
  // Return the completed schema
  return schema;
}

function createContentIdeasSchema(): yup.Schema {
  // Define schema requiring creatorId field
  const schema = yup.object({
    creatorId: yup.string().uuid().required('creatorId is required'),
    topic: yup.string(),
    style: yup.string(),
    platform: yup.string(),
  });

  // Add optional parameters for topic, tone, platform focus
  // Add optional count parameter for number of ideas to generate
  // Return the completed schema
  return schema;
}

// AI-related routes
router.post('/analyze', authenticate, createRateLimiter('AI'), validateBody(createAnalysisSchema()), aiController.analyzeContent);
router.post('/generate', authenticate, createRateLimiter('AI'), validateBody(createGenerationSchema()), aiController.generateCreativeContent);
router.post('/relationships', authenticate, createRateLimiter('AI'), validateBody(createRelationshipSchema()), aiController.detectContentRelationships);
router.post('/classify', authenticate, createRateLimiter('AI'), validateBody(createClassificationSchema()), aiController.classifyContent);
router.post('/repurpose', authenticate, createRateLimiter('AI'), validateBody(createRepurposingSchema()), aiController.suggestContentRepurposing);
router.post('/match', authenticate, createRateLimiter('AI'), validateBody(createMatchingSchema()), aiController.matchCreatorToBrand);
router.post('/ideas', authenticate, createRateLimiter('AI'), validateBody(createContentIdeasSchema()), aiController.generateContentIdeas);

// Health check route (admin only)
router.get('/health', authenticate, requireRole([UserType.ADMIN]), aiController.checkAiHealth);

export default router;