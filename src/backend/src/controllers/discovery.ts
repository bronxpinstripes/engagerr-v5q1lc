/**
 * Controller layer for the Discovery Marketplace that handles HTTP requests related to creator discovery, filtering, and recommendations.
 * Provides RESTful API endpoints for brands to search for creators based on various criteria, get detailed creator profiles,
 * manage saved searches, and access AI-powered creator recommendations.
 */

import { Request, Response, NextFunction } from 'express'; // Express types for handling HTTP requests and responses // ^4.18.2
import discoveryService from '../services/discovery'; // Service containing discovery business logic
import { CreatorTypes } from '../types/creator'; // Creator-related type definitions
import { BrandTypes } from '../types/brand'; // Brand-related type definitions
import { ApiTypes } from '../types/api'; // API request/response type definitions
import { PlatformTypes } from '../types/platform'; // Platform-related type definitions
import { logger } from '../utils/logger'; // Logging utility for discovery events
import { ApiError, NotFoundError, ValidationError } from '../utils/errors'; // Error handling for not found scenarios
import { validate, sanitizeInput } from '../utils/validation'; // Utility for validating request data
import { SearchCreatorsSchema, SaveSearchSchema } from '../types/api'; // Validation schema for creator search requests

/**
 * Handles search requests for creators based on multiple criteria with pagination
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends paginated search results or error response
 */
export const searchCreators = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Validate request body against SearchCreatorsSchema
    await validate(req.body, SearchCreatorsSchema);

    // LD1: Extract search criteria and pagination parameters from request
    const criteria: BrandTypes.CreatorCriteria = req.body;
    const pagination: ApiTypes.PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
    };

    // LD1: Extract brand ID from authenticated request if available
    const brandId = req.user?.id as string;

    // LD1: Sanitize search criteria for security
    const sanitizedCriteria = sanitizeInput(criteria);

    // LD1: Call discoveryService.searchCreators with criteria, pagination, and brand context
    const searchResults: ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile> = await discoveryService.searchCreators(
      sanitizedCriteria,
      pagination,
      brandId
    );

    // LD1: Return paginated response with creators matching criteria, including match scores if brand context available
    res.status(200).json(searchResults);

    // LD1: Log search operation with parameters summary
    logger.info({
      action: 'searchCreators',
      criteria: sanitizedCriteria,
      pagination,
      brandId,
      resultsCount: searchResults.data.length,
    }, 'Creator search executed successfully');
  } catch (error) {
    // LD1: Catch and forward any errors to error handling middleware
    next(error);
  }
};

/**
 * Retrieves detailed information about a specific creator with optional match scoring
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends creator details or error response
 */
export const getCreatorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters
    const creatorId: string = req.params.creatorId;

    // LD1: Extract brand ID from authenticated request if available
    const brandId: string = req.user?.id as string;

    // LD1: Call discoveryService.getCreatorDetails with creator ID and optional brand ID
    const creatorDetails: CreatorTypes.CreatorProfile = await discoveryService.getCreatorDetails(creatorId, brandId);

    // LD1: Return creator profile with detailed metrics
    res.status(200).json(creatorDetails);

    // LD1: Log creator profile request
    logger.info({
      action: 'getCreatorById',
      creatorId,
      brandId,
    }, 'Retrieved creator details successfully');
  } catch (error) {
    // LD1: Catch and forward any errors to error handling middleware
    next(error);
  }
};

/**
 * Retrieves creators filtered by category with pagination
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends paginated category-filtered results or error response
 */
export const getCreatorsByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract category from request parameters
        const category: CreatorTypes.Category = req.params.category as CreatorTypes.Category;

        // LD1: Extract pagination parameters from request query
        const pagination: ApiTypes.PaginationParams = {
            page: parseInt(req.query.page as string) || 1,
            pageSize: parseInt(req.query.pageSize as string) || 20,
        };

        // LD1: Extract additional filter options from request query
        const filterOptions: object = req.query;

        // LD1: Call discoveryService.getCreatorsByCategory with validated parameters
        const searchResults: ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile> = await discoveryService.getCreatorsByCategory(
            category,
            pagination,
            filterOptions
        );

        // LD1: Return paginated response with creators in the specified category
        res.status(200).json(searchResults);

        // LD1: Log category search operation
        logger.info({
            action: 'getCreatorsByCategory',
            category,
            pagination,
            resultsCount: searchResults.data.length,
        }, 'Category search executed successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Retrieves creators filtered by follower count range with pagination
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const getCreatorsByFollowerCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract min and max follower counts from request query
        const minFollowers: number = parseInt(req.query.minFollowers as string);
        const maxFollowers: number = parseInt(req.query.maxFollowers as string);

        // LD1: Extract pagination parameters from request query
        const pagination: ApiTypes.PaginationParams = {
            page: parseInt(req.query.page as string) || 1,
            pageSize: parseInt(req.query.pageSize as string) || 20,
        };

        // LD1: Extract additional filter options from request query
        const filterOptions: object = req.query;

        // LD1: Call discoveryService.getCreatorsByFollowerRange with validated parameters
        const searchResults: ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile> = await discoveryService.getCreatorsByFollowerRange(
            minFollowers,
            maxFollowers,
            pagination,
            filterOptions
        );

        // LD1: Return paginated response with creators matching follower criteria
        res.status(200).json(searchResults);

        // LD1: Log follower range search operation
        logger.info({
            action: 'getCreatorsByFollowerCount',
            minFollowers,
            maxFollowers,
            pagination,
            resultsCount: searchResults.data.length,
        }, 'Follower range search executed successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Retrieves creators filtered by minimum engagement rate with pagination
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const getCreatorsByEngagementRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract minimum engagement rate from request query
        const minEngagementRate: number = parseFloat(req.query.minEngagementRate as string);

        // LD1: Extract pagination parameters from request query
        const pagination: ApiTypes.PaginationParams = {
            page: parseInt(req.query.page as string) || 1,
            pageSize: parseInt(req.query.pageSize as string) || 20,
        };

        // LD1: Extract additional filter options from request query
        const filterOptions: object = req.query;

        // LD1: Call discoveryService.getCreatorsByEngagementRate with validated parameters
        const searchResults: ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile> = await discoveryService.getCreatorsByEngagementRate(
            minEngagementRate,
            pagination,
            filterOptions
        );

        // LD1: Return paginated response with creators above the engagement threshold
        res.status(200).json(searchResults);

        // LD1: Log engagement search operation
        logger.info({
            action: 'getCreatorsByEngagementRate',
            minEngagementRate,
            pagination,
            resultsCount: searchResults.data.length,
        }, 'Engagement rate search executed successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Retrieves a list of trending or popular creators
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const getPopularCreators = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract limit parameter from request query (default: 10)
        const limit: number = parseInt(req.query.limit as string) || 10;

        // LD1: Extract optional category filter from request query
        const options: object = req.query;

        // LD1: Extract brand ID from authenticated request if available
        const brandId: string = req.user?.id as string;

        // LD1: Call discoveryService.getPopularCreators with limit and options
        const popularCreators: CreatorTypes.CreatorProfile[] = await discoveryService.getPopularCreators(limit, options, brandId);

        // LD1: Return response with popular creators ordered by popularity score
        res.status(200).json(popularCreators);

        // LD1: Log popular creators request
        logger.info({
            action: 'getPopularCreators',
            limit,
            options,
            brandId,
            resultsCount: popularCreators.length,
        }, 'Popular creators retrieved successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Retrieves AI-recommended creators for an authenticated brand
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const getRecommendedCreators = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract brand ID from authenticated request (required)
        const brandId: string = req.user?.id as string;

        // LD1: Extract limit parameter from request query (default: 10)
        const limit: number = parseInt(req.query.limit as string) || 10;

        // LD1: Extract includeExplanations flag from request query (default: false)
        const includeExplanations: boolean = (req.query.includeExplanations as string)?.toLowerCase() === 'true';

        // LD1: Call discoveryService.getRecommendedCreatorsForBrand with parameters
        const recommendedCreators: any = await discoveryService.getRecommendedCreatorsForBrand(brandId, limit, includeExplanations);

        // LD1: Return response with AI-recommended creators and match explanations if requested
        res.status(200).json(recommendedCreators);

        // LD1: Log recommendation request
        logger.info({
            action: 'getRecommendedCreators',
            brandId,
            limit,
            includeExplanations,
            resultsCount: Object.keys(recommendedCreators).length,
        }, 'AI-recommended creators retrieved successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Retrieves creators similar to a specified creator
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const getSimilarCreators = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract creator ID from request parameters
        const creatorId: string = req.params.creatorId;

        // LD1: Extract limit parameter from request query (default: 10)
        const limit: number = parseInt(req.query.limit as string) || 10;

        // LD1: Extract optional filter options from request query
        const options: object = req.query;

        // LD1: Extract brand ID from authenticated request if available
        const brandId: string = req.user?.id as string;

        // LD1: Call discoveryService.getSimilarCreators with parameters
        const similarCreators: CreatorTypes.CreatorProfile[] = await discoveryService.getSimilarCreators(creatorId, limit, options, brandId);

        // LD1: Return response with similar creators and similarity scores
        res.status(200).json(similarCreators);

        // LD1: Log similar creators request
        logger.info({
            action: 'getSimilarCreators',
            creatorId,
            limit,
            options,
            brandId,
            resultsCount: similarCreators.length,
        }, 'Similar creators retrieved successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Saves a search configuration for later use by a brand
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const saveSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract brand ID from authenticated request (required)
        const brandId: string = req.user?.id as string;

        // LD1: Validate request body against SaveSearchSchema
        await validate(req.body, SaveSearchSchema);

        // LD1: Extract name, description, and search criteria from request
        const { name, description, filters } = req.body;

        // LD1: Call discoveryService.saveSearch with validated parameters
        const savedSearch: BrandTypes.SavedSearch = await discoveryService.saveSearch(brandId, name, description, filters);

        // LD1: Return response with saved search details and confirmation
        res.status(201).json({ message: 'Search saved successfully', savedSearch });

        // LD1: Log search saving operation
        logger.info({
            action: 'saveSearch',
            brandId,
            searchName: name,
        }, 'Search saved successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Retrieves a specific saved search by ID
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const getSavedSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract search ID from request parameters
        const searchId: string = req.params.searchId;

        // LD1: Extract brand ID from authenticated request (required)
        const brandId: string = req.user?.id as string;

        // LD1: Call discoveryService.getSavedSearch with search ID and brand ID
        const savedSearch: BrandTypes.SavedSearch = await discoveryService.getSavedSearch(searchId, brandId);

        // LD1: Return response with the saved search configuration
        res.status(200).json(savedSearch);

        // LD1: Log saved search retrieval
        logger.info({
            action: 'getSavedSearch',
            searchId,
            brandId,
        }, 'Saved search retrieved successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Retrieves all saved searches for the authenticated brand
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const getSavedSearches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract brand ID from authenticated request (required)
        const brandId: string = req.user?.id as string;

        // LD1: Call discoveryService.getSavedSearches with brand ID
        const savedSearches: BrandTypes.SavedSearch[] = await discoveryService.getSavedSearches(brandId);

        // LD1: Return response with the list of saved searches
        res.status(200).json(savedSearches);

        // LD1: Log saved searches retrieval
        logger.info({
            action: 'getSavedSearches',
            brandId,
            resultsCount: savedSearches.length,
        }, 'Saved searches retrieved successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Executes a search using previously saved criteria
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const executeSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract search ID from request parameters
        const searchId: string = req.params.searchId;

        // LD1: Extract brand ID from authenticated request (required)
        const brandId: string = req.user?.id as string;

        // LD1: Extract pagination parameters from request query
        const pagination: ApiTypes.PaginationParams = {
            page: parseInt(req.query.page as string) || 1,
            pageSize: parseInt(req.query.pageSize as string) || 20,
        };

        // LD1: Call discoveryService.executeSearch with search ID, brand ID, and pagination
        const searchResults: ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile> = await discoveryService.executeSearch(searchId, brandId, pagination);

        // LD1: Return paginated response with creators matching the saved criteria
        res.status(200).json(searchResults);

        // LD1: Log execution of saved search
        logger.info({
            action: 'executeSearch',
            searchId,
            brandId,
            resultsCount: searchResults.data.length,
        }, 'Saved search executed successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Deletes a saved search by ID
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const deleteSavedSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract search ID from request parameters
        const searchId: string = req.params.searchId;

        // LD1: Extract brand ID from authenticated request (required)
        const brandId: string = req.user?.id as string;

        // LD1: Call discoveryService.deleteSavedSearch with search ID and brand ID
        await discoveryService.deleteSavedSearch(searchId, brandId);

        // LD1: Return success response with deletion confirmation
        res.status(200).json({ message: 'Search deleted successfully' });

        // LD1: Log search deletion operation
        logger.info({
            action: 'deleteSavedSearch',
            searchId,
            brandId,
        }, 'Saved search deleted successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Retrieves detailed match information between a brand and creator
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const getDetailedMatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Extract creator ID from request parameters
        const creatorId: string = req.params.creatorId;

        // LD1: Extract brand ID from authenticated request (required)
        const brandId: string = req.user?.id as string;

        // LD1: Extract includeExplanation flag from request query (default: true)
        const includeExplanation: boolean = (req.query.includeExplanation as string)?.toLowerCase() === 'true';

        // LD1: Call discoveryService.calculateDetailedMatch with brand ID, creator ID, and includeExplanation
        const matchData: any = await discoveryService.calculateDetailedMatch(brandId, creatorId, includeExplanation);

        // LD1: Return response with detailed match analysis including component scores and explanations
        res.status(200).json(matchData);

        // LD1: Log detailed match calculation
        logger.info({
            action: 'getDetailedMatch',
            creatorId,
            brandId,
            includeExplanation,
        }, 'Detailed match calculated successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};

/**
 * Administrative endpoint to clear discovery caches
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const clearCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // LD1: Validate that request is from an authenticated admin user
        // TODO: Implement admin authentication check

        // LD1: Extract optional cache pattern from request query
        const pattern: string = req.query.pattern as string;

        // LD1: Call discoveryService.clearCache with pattern parameter
        const result: any = await discoveryService.clearCache(pattern);

        // LD1: Return response with cache clearing result and statistics
        res.status(200).json({ message: 'Cache cleared successfully', result });

        // LD1: Log cache clearing operation with details
        logger.info({
            action: 'clearCache',
            pattern,
        }, 'Discovery caches cleared successfully');
    } catch (error) {
        // LD1: Catch and forward any errors to error handling middleware
        next(error);
    }
};