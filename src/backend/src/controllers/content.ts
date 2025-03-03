/**
 * Controller for handling content-related HTTP requests in the Engagerr platform, including content CRUD operations, content relationship management, and content family visualizations. This controller implements the platform's core content relationship mapping technology.
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import contentService from '../services/content'; // Service layer for content operations that provides business logic
import { logger } from '../utils/logger'; // Logging utility for tracking controller operations
import { ApiResponse } from '../types/api'; // Interface for standardized API responses
import { ContentTypes } from '../types/content'; // Type definitions for content-related data structures
import { 
    ValidationError, 
    NotFoundError, 
    ConflictError, 
    AuthorizationError 
} from '../utils/errors'; // Error classes for handling various error scenarios
import { handleAsyncError } from '../utils/errors'; // Wrapper for async controller functions to handle errors consistently

/**
 * Controller object that encapsulates all content-related controller functions
 */
const contentController = {
    /**
     * Retrieves a single content item by ID
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    getContent: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // LD1: Extract includeMetrics query parameter with default of true
        const includeMetrics: boolean = req.query.includeMetrics === 'false' ? false : true;

        // S1: Log the request with contentId and includeMetrics
        logger.info({ contentId, includeMetrics }, 'Getting content by ID');

        // LD1: Call contentService.getContentById with the contentId and includeMetrics flag
        const content: ContentTypes.Content = await contentService.getContentById(contentId, includeMetrics, req['user']?.id);

        // LD1: Return 200 response with the content data if found
        const response: ApiResponse<ContentTypes.Content> = {
            data: content,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Retrieves a paginated list of content items for a specific creator with optional filtering
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    listCreatorContent: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract creatorId from request parameters
        const creatorId: string = req.params.creatorId;

        // LD1: Extract filtering and pagination parameters from query (platform, contentType, dateRange, page, limit)
        const platform: string = req.query.platform as string;
        const contentType: string = req.query.contentType as string;
        const startDate: Date = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate: Date = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const page: number = parseInt(req.query.page as string, 10) || 1;
        const limit: number = parseInt(req.query.limit as string, 10) || 20;

        // S1: Log the request with creatorId and filters
        logger.info({ creatorId, platform, contentType, startDate, endDate, page, limit }, 'Listing creator content');

        // LD1: Construct ContentFilter object from query parameters
        const filters: ContentTypes.ContentFilter = {
            creatorId: creatorId,
            platformId: platform,
            contentType: contentType as ContentTypes.ContentType,
            startDate: startDate,
            endDate: endDate,
            limit: limit,
            offset: (page - 1) * limit
        }

        // LD1: Call contentService.getCreatorContent with creatorId and filters
        const { content, total } = await contentService.getCreatorContent(creatorId, filters, req['user']?.id);

        // LD1: Return 200 response with content array and pagination metadata
        const response: ApiResponse<{ content: ContentTypes.Content[], total: number }> = {
            data: { content, total },
            meta: {
                timestamp: new Date().toISOString(),
                page: page,
                limit: limit,
                total: total
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Creates a new content item
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    createContent: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract content creation data from request body (title, description, contentType, platformId, externalId, url, etc.)
        const contentData: ContentTypes.ContentCreateInput = req.body;

        // S1: Log the request with contentData
        logger.info({ contentData }, 'Creating new content');

        // LD1: Call contentService.createNewContent with the content data and user ID
        const content: ContentTypes.Content = await contentService.createNewContent(contentData, req['user']?.id);

        // LD1: Return 201 response with the created content data
        const response: ApiResponse<ContentTypes.Content> = {
            data: content,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(201).json(response);
    }),

    /**
     * Updates an existing content item
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    updateContent: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // LD1: Extract update data from request body
        const updateData: ContentTypes.ContentUpdateInput = {
            id: contentId,
            ...req.body
        };

        // S1: Log the request with contentId and updateData
        logger.info({ contentId, updateData }, 'Updating content');

        // LD1: Call contentService.updateExistingContent with update data and user ID
        const content: ContentTypes.Content = await contentService.updateExistingContent(updateData, req['user']?.id);

        // LD1: Return 200 response with updated content data
        const response: ApiResponse<ContentTypes.Content> = {
            data: content,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Deletes a content item and its relationships
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    deleteContent: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // S1: Log the request with contentId
        logger.info({ contentId }, 'Deleting content');

        // LD1: Call contentService.removeContent with contentId and user ID
        const success: boolean = await contentService.removeContent(contentId, req['user']?.id);

        // LD1: Return 200 response with success message
        const response: ApiResponse<string> = {
            data: 'Content deleted successfully',
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Retrieves relationships for a specific content item (both as source and target)
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    getContentRelationships: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // LD1: Extract type query parameter (source, target, or both)
        const type: string = req.query.type as string;

        // S1: Log the request with contentId and type
        logger.info({ contentId, type }, 'Getting content relationships');

        // LD1: Call appropriate service methods based on type parameter
        let relationships: any[];
        if (type === 'source') {
            relationships = await contentService.getContentRelationship(contentId, req['user']?.id);
        } else if (type === 'target') {
            relationships = await contentService.getContentRelationship(contentId, req['user']?.id);
        } else {
            relationships = await contentService.getContentRelationship(contentId, req['user']?.id);
        }

        // LD1: Return 200 response with relationships array
        const response: ApiResponse<any[]> = {
            data: relationships,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Creates a relationship between two content items
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    createRelationship: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract relationship data from request body (sourceId, targetId, relationshipType)
        const relationshipData: ContentTypes.RelationshipCreateInput = req.body;

        // S1: Log the request with relationshipData
        logger.info({ relationshipData }, 'Creating content relationship');

        // LD1: Call contentService.createContentRelationship with relationship data and user ID
        const relationship: any = await contentService.createContentRelationship(relationshipData, req['user']?.id);

        // LD1: Return 201 response with created relationship data
        const response: ApiResponse<any> = {
            data: relationship,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(201).json(response);
    }),

    /**
     * Updates an existing content relationship
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    updateRelationship: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract relationshipId from request parameters
        const relationshipId: string = req.params.relationshipId;

        // LD1: Extract update data from request body
        const updateData: any = req.body;

        // S1: Log the request with relationshipId and updateData
        logger.info({ relationshipId, updateData }, 'Updating content relationship');

        // LD1: Call contentService.updateContentRelationshipData with relationshipId, update data, and user ID
        const relationship: any = await contentService.updateContentRelationshipData(relationshipId, updateData, req['user']?.id);

        // LD1: Return 200 response with updated relationship data
        const response: ApiResponse<any> = {
            data: relationship,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Deletes a content relationship
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    deleteRelationship: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract relationshipId from request parameters
        const relationshipId: string = req.params.relationshipId;

        // S1: Log the request with relationshipId
        logger.info({ relationshipId }, 'Deleting content relationship');

        // LD1: Call contentService.removeContentRelationship with relationshipId and user ID
        const success: boolean = await contentService.removeContentRelationship(relationshipId, req['user']?.id);

        // LD1: Return 200 response with success message
        const response: ApiResponse<string> = {
            data: 'Content relationship deleted successfully',
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Retrieves the content family (hierarchical structure) for a specific root content item
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    getContentFamily: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // LD1: Extract options from query parameters (maxDepth, includeMetrics)
        const maxDepth: number = parseInt(req.query.maxDepth as string, 10);
        const includeMetrics: boolean = req.query.includeMetrics === 'true';

        // S1: Log the request with contentId and options
        logger.info({ contentId, maxDepth, includeMetrics }, 'Getting content family');

        // LD1: Call contentService.getContentFamily with contentId, options, and user ID
        const contentFamily: ContentTypes.ContentFamily = await contentService.getContentFamily(contentId, { maxDepth, includeMetrics }, req['user']?.id);

        // LD1: Return 200 response with content family data (hierarchical structure)
        const response: ApiResponse<ContentTypes.ContentFamily> = {
            data: contentFamily,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Generates visualization-ready data for a content family graph
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    getContentFamilyVisualization: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // LD1: Extract visualization options from query parameters (layout, style)
        const layout: string = req.query.layout as string;
        const style: string = req.query.style as string;

        // S1: Log the request with contentId and options
        logger.info({ contentId, layout, style }, 'Getting content family visualization');

        // LD1: Call contentService.getContentFamilyVisualization with contentId, options, and user ID
        const visualizationData: ContentTypes.ContentVisualization = await contentService.getContentFamilyVisualization(contentId, { layout, style }, req['user']?.id);

        // LD1: Return 200 response with visualization-ready data (nodes and edges with visual properties)
        const response: ApiResponse<ContentTypes.ContentVisualization> = {
            data: visualizationData,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Retrieves all content families for a specific creator
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    getCreatorContentFamilies: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract creatorId from request parameters
        const creatorId: string = req.params.creatorId;

        // S1: Log the request with creatorId
        logger.info({ creatorId }, 'Getting creator content families');

        // LD1: Call contentService.getCreatorContentFamilies with creatorId and user ID
        const contentFamilies: ContentTypes.ContentFamily[] = await contentService.getCreatorContentFamilies(creatorId, req['user']?.id);

        // LD1: Return 200 response with array of content families
        const response: ApiResponse<ContentTypes.ContentFamily[]> = {
            data: contentFamilies,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Synchronizes content from a connected platform for a creator
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    syncContentFromPlatform: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract platformId and creatorId from request parameters
        const platformId: string = req.params.platformId;
        const creatorId: string = req.params.creatorId;

        // LD1: Extract sync options from request body (dateRange, contentTypes)
        const syncOptions: any = req.body;

        // S1: Log the request with platformId, creatorId, and syncOptions
        logger.info({ platformId, creatorId, syncOptions }, 'Syncing content from platform');

        // LD1: Call contentService.syncContentFromPlatform with platformId, creatorId, and options
        const syncResults: any = await contentService.syncContentFromPlatform(platformId, creatorId, syncOptions);

        // LD1: Return 200 response with sync results (added, updated, failed, total counts)
        const response: ApiResponse<any> = {
            data: syncResults,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Updates performance metrics for a content item from its platform
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    updateContentMetrics: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // LD1: Extract forceRefresh query parameter with default false
        const forceRefresh: boolean = req.query.forceRefresh === 'true';

        // S1: Log the request with contentId and forceRefresh
        logger.info({ contentId, forceRefresh }, 'Updating content metrics');

        // LD1: Call contentService.updateContentMetrics with contentId and forceRefresh flag
        const updatedMetrics: ContentTypes.ContentMetrics = await contentService.updateContentMetrics(contentId, forceRefresh);

        // LD1: Return 200 response with updated metrics data
        const response: ApiResponse<ContentTypes.ContentMetrics> = {
            data: updatedMetrics,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Performs AI analysis on content to extract insights
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    analyzeContent: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // LD1: Extract analysisType from query parameters (e.g., 'sentiment', 'topics', 'keywords')
        const analysisType: string = req.query.analysisType as string;

        // S1: Log the request with contentId and analysisType
        logger.info({ contentId, analysisType }, 'Analyzing content');

        // LD1: Call contentService.analyzeContent with contentId and analysisType
        const analysisResults: object = await contentService.analyzeContent(contentId, analysisType);

        // LD1: Return 200 response with analysis results
        const response: ApiResponse<object> = {
            data: analysisResults,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Uses AI to suggest potential relationships for a content item
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    suggestContentRelationships: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // LD1: Extract options from query parameters (confidenceThreshold, limit)
        const confidenceThreshold: number = parseFloat(req.query.confidenceThreshold as string);
        const limit: number = parseInt(req.query.limit as string, 10);

        // S1: Log the request with contentId and options
        logger.info({ contentId, confidenceThreshold, limit }, 'Suggesting content relationships');

        // LD1: Call contentService.suggestContentRelationships with contentId and options
        const relationshipSuggestions: ContentTypes.RelationshipSuggestion[] = await contentService.suggestContentRelationships(contentId, { confidenceThreshold, limit });

        // LD1: Return 200 response with array of relationship suggestions, each with confidence score
        const response: ApiResponse<ContentTypes.RelationshipSuggestion[]> = {
            data: relationshipSuggestions,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    }),

    /**
     * Generates performance insights and recommendations for content
     * @param req Express Request object
     * @param res Express Response object
     * @param next Express NextFunction object
     * @returns Promise that resolves when the response is sent
     */
    generateContentInsights: handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // LD1: Extract contentId from request parameters
        const contentId: string = req.params.contentId;

        // S1: Log the request with contentId
        logger.info({ contentId }, 'Generating content insights');

        // LD1: Call contentService.generateContentInsights with contentId
        const contentInsights: ContentTypes.ContentInsight[] = await contentService.generateContentInsights(contentId);

        // LD1: Return 200 response with array of insights and recommendations
        const response: ApiResponse<ContentTypes.ContentInsight[]> = {
            data: contentInsights,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.status(200).json(response);
    })
};

// IE3: Export the contentController object
export default contentController;