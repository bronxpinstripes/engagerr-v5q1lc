import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { ApiTypes, ValidationError, NotFoundError, ExternalServiceError } from '../utils/errors';
import AIRouter from '../services/ai'; // Import the AI Router for routing requests to appropriate AI models
import contentService from '../services/content'; // For retrieving content data when performing AI operations on specific content
import creatorService from '../services/creator'; // For retrieving creator data when generating personalized recommendations
import brandService from '../services/brand'; // For retrieving brand data when performing matching operations
import { logger } from '../utils/logger'; // Logging utility for tracking controller operations
import { TASK_TYPES } from '../config/ai'; // Constants defining different AI task types

// Initialize AI router for handling AI requests
const aiRouter = new AIRouter();

/**
 * Analyzes content using the appropriate AI model based on content type and analysis parameters
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns Promise that resolves when the response is sent
 */
export async function analyzeContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract content data and analysis parameters from request body
    const { content, contentId, analysisType } = req.body;

    // If contentId is provided, fetch content data from database
    let contentData = content;
    if (contentId) {
      contentData = await contentService.getContentById(contentId);
    }

    // Validate content data is available either from direct input or fetched from database
    if (!contentData) {
      throw new ValidationError('Content data is required for analysis');
    }

    // Determine the analysis type based on request (sentiment, topics, keywords, etc.)
    const analysisTypeToUse = analysisType || TASK_TYPES.CONTENT_ANALYSIS;

    // Call aiRouter.analyzeContent with content data and analysis type
    const analysisResults = await aiRouter.analyzeContent(contentData, analysisTypeToUse);

    // Return 200 response with analysis results
    res.status(200).json({
      success: true,
      data: analysisResults,
      message: 'Content analysis completed successfully'
    });
  } catch (error) {
    // Handle errors: ValidationError for invalid content data, NotFoundError if content doesn't exist, ExternalServiceError for AI service failures
    next(error);
  }
}

/**
 * Generates creative content based on provided parameters using AI
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns Promise that resolves when the response is sent
 */
export async function generateCreativeContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract generation parameters from request body (prompt, format, style, length, etc.)
    const { prompt, referenceContentId, format, style, length } = req.body;

    // If referenceContentId is provided, fetch content data for context
    let referenceContent = null;
    if (referenceContentId) {
      referenceContent = await contentService.getContentById(referenceContentId);
    }

    // Call aiRouter.generateCreativeContent with parameters and reference content if available
    const generationResults = await aiRouter.generateCreativeContent({
      prompt,
      referenceContent,
      format,
      style,
      length
    });

    // Return 200 response with generated content
    res.status(200).json({
      success: true,
      data: generationResults,
      message: 'Creative content generated successfully'
    });
  } catch (error) {
    // Handle errors: ValidationError for invalid parameters, NotFoundError if reference content doesn't exist, ExternalServiceError for AI service failures
    next(error);
  }
}

/**
 * Detects relationships between content items using AI analysis
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns Promise that resolves when the response is sent
 */
export async function detectContentRelationships(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract sourceContentId and potentialRelatedContentIds from request body
    const { sourceContentId, potentialRelatedContentIds } = req.body;

    // Fetch source content and potential related content data
    const sourceContent = await contentService.getContentById(sourceContentId);
    if (!sourceContent) {
      throw new NotFoundError(`Source content with ID '${sourceContentId}' not found`, 'Content', sourceContentId);
    }

    const potentialRelatedContent = await Promise.all(
      potentialRelatedContentIds.map(async (contentId: string) => {
        const content = await contentService.getContentById(contentId);
        if (!content) {
          throw new NotFoundError(`Potential related content with ID '${contentId}' not found`, 'Content', contentId);
        }
        return content;
      })
    );

    // Call aiRouter.detectRelationships with source content and potential related content
    const relationshipResults = await aiRouter.detectRelationships(sourceContent, potentialRelatedContent);

    // Return 200 response with detected relationships and confidence scores
    res.status(200).json({
      success: true,
      data: relationshipResults,
      message: 'Content relationships detected successfully'
    });
  } catch (error) {
    // Handle errors: ValidationError for invalid content IDs, NotFoundError if content doesn't exist, ExternalServiceError for AI service failures
    next(error);
  }
}

/**
 * Classifies content into predefined categories using AI
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns Promise that resolves when the response is sent
 */
export async function classifyContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract content data and classification parameters from request body
    const { content, contentId, classificationType } = req.body;

    // If contentId is provided, fetch content data from database
    let contentData = content;
    if (contentId) {
      contentData = await contentService.getContentById(contentId);
    }

    // Validate content data is available either from direct input or fetched from database
    if (!contentData) {
      throw new ValidationError('Content data is required for classification');
    }

    // Determine the classification type (category, topic, sentiment, etc.)
    const classificationTypeToUse = classificationType || TASK_TYPES.CLASSIFICATION;

    // Call aiRouter.classifyContent with content data and classification type
    const classificationResults = await aiRouter.classifyContent(contentData, classificationTypeToUse);

    // Return 200 response with classification results
    res.status(200).json({
      success: true,
      data: classificationResults,
      message: 'Content classification completed successfully'
    });
  } catch (error) {
    // Handle errors: ValidationError for invalid content data, NotFoundError if content doesn't exist, ExternalServiceError for AI service failures
    next(error);
  }
}

/**
 * Generates AI suggestions for repurposing content across different platforms
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns Promise that resolves when the response is sent
 */
export async function suggestContentRepurposing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract contentId and target platforms from request body
    const { contentId, targetPlatforms } = req.body;

    // Fetch content data from database
    const contentData = await contentService.getContentById(contentId);
    if (!contentData) {
      throw new NotFoundError(`Content with ID '${contentId}' not found`, 'Content', contentId);
    }

    // Prepare request parameters including content data and target platforms
    const repurposingParams = {
      content: contentData,
      targetPlatforms
    };

    // Call aiRouter.generateCreativeContent with specialized repurposing parameters
    const repurposingSuggestions = await aiRouter.generateCreativeContent(repurposingParams, { taskType: TASK_TYPES.CREATIVE_GENERATION });

    // Return 200 response with repurposing suggestions for each target platform
    res.status(200).json({
      success: true,
      data: repurposingSuggestions,
      message: 'Content repurposing suggestions generated successfully'
    });
  } catch (error) {
    // Handle errors: ValidationError for invalid parameters, NotFoundError if content doesn't exist, ExternalServiceError for AI service failures
    next(error);
  }
}

/**
 * Performs AI-based matching between creator profiles and brand requirements
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns Promise that resolves when the response is sent
 */
export async function matchCreatorToBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract brandId and creatorId from request body
    const { brandId, creatorId } = req.body;

    // Fetch brand and creator data from database
    const brand = await brandService.getBrandById(brandId);
    if (!brand) {
      throw new NotFoundError(`Brand with ID '${brandId}' not found`, 'Brand', brandId);
    }

    const creator = await creatorService.getCreatorById(creatorId);
    if (!creator) {
      throw new NotFoundError(`Creator with ID '${creatorId}' not found`, 'Creator', creatorId);
    }

    // Prepare matching parameters including brand requirements and creator profile data
    const matchingParams = {
      brand: brand,
      creator: creator
    };

    // Use aiRouter.analyzeContent with specialized matching parameters
    const matchResults = await aiRouter.analyzeContent(matchingParams, { taskType: TASK_TYPES.CREATOR_BRAND_MATCHING });

    // Process results to generate compatibility score and matching details
    // TODO: Implement result processing and structuring

    // Return 200 response with match score and detailed compatibility breakdown
    res.status(200).json({
      success: true,
      data: matchResults,
      message: 'Creator-brand matching completed successfully'
    });
  } catch (error) {
    // Handle errors: ValidationError for invalid IDs, NotFoundError if brand or creator doesn't exist, ExternalServiceError for AI service failures
    next(error);
  }
}

/**
 * Generates content ideas for creators based on their profile and analytics
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns Promise that resolves when the response is sent
 */
export async function generateContentIdeas(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract creatorId and idea generation parameters from request body
    const { creatorId, topic, style, platform } = req.body;

    // Fetch creator data and recent content performance data
    const creator = await creatorService.getCreatorById(creatorId);
    if (!creator) {
      throw new NotFoundError(`Creator with ID '${creatorId}' not found`, 'Creator', creatorId);
    }

    // Prepare generation parameters including creator profile, content history, and performance trends
    const ideaGenerationParams = {
      creator: creator,
      topic,
      style,
      platform
    };

    // Call aiRouter.generateCreativeContent with specialized idea generation parameters
    const contentIdeas = await aiRouter.generateCreativeContent(ideaGenerationParams, { taskType: TASK_TYPES.CREATIVE_GENERATION });

    // Return 200 response with content ideas organized by platform and content type
    res.status(200).json({
      success: true,
      data: contentIdeas,
      message: 'Content ideas generated successfully'
    });
  } catch (error) {
    // Handle errors: ValidationError for invalid parameters, NotFoundError if creator doesn't exist, ExternalServiceError for AI service failures
    next(error);
  }
}

/**
 * Checks the health status of AI services (admin only)
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns Promise that resolves when the response is sent
 */
export async function checkAiHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get model metrics from aiRouter.getModelMetrics()
    const modelMetrics = aiRouter.getModelMetrics();

    // Get model availability status from aiRouter.getModelAvailability()
    const modelAvailability = await aiRouter.getModelAvailability();

    // Combine metrics and availability into a comprehensive health report
    const aiSystemHealth = {
      metrics: modelMetrics,
      availability: modelAvailability
    };

    // Return 200 response with AI system health status
    res.status(200).json({
      success: true,
      data: aiSystemHealth,
      message: 'AI system health check completed successfully'
    });
  } catch (error) {
    // Handle errors: ExternalServiceError for failures in health check process
    next(error);
  }
}

export default {
  analyzeContent,
  generateCreativeContent,
  detectContentRelationships,
  classifyContent,
  suggestContentRepurposing,
  matchCreatorToBrand,
  generateContentIdeas,
  checkAiHealth
};