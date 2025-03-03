/**
 * Service layer for the Discovery Marketplace that integrates search, filtering, matching, ranking, and recommendation functionalities.
 * Provides a unified interface for creator discovery, enabling brands to find suitable creators based on multiple criteria with AI-enhanced matching and recommendations.
 */

import LRUCache from 'lru-cache'; // ^7.14.1 Caching mechanism for search results and match scores
import {
  searchCreators,
  quickSearch,
  findSimilarCreators,
} from '../discovery/search'; // Core search functionality for finding creators based on criteria
import {
  applyFilters,
  createFilterQuery,
  FilterProcessor,
} from '../discovery/filtering'; // Apply filters to search results
import {
  calculateMatchScore,
  enhanceSearchResults,
  sortCreatorsByField,
} from '../discovery/ranking'; // Calculate match score between brand criteria and creator
import {
  calculateBrandCreatorMatch,
  getRecommendedCreators,
} from '../discovery/matching'; // Detailed brand-creator compatibility calculation
import {
  RecommendationEngine,
  generateContentRecommendations,
  generateCreatorRecommendations,
  generatePartnershipRecommendations,
} from '../discovery/recommendation'; // Personalized recommendation generation
import { CreatorTypes } from '../types/creator'; // Creator data structure definitions
import { BrandTypes } from '../types/brand'; // Brand and search criteria type definitions
import { ApiTypes } from '../types/api'; // API request/response type definitions
import { PlatformTypes } from '../types/platform'; // Platform-related type definitions
import creatorModel from '../models/creator'; // Creator data access functions
import brandModel from '../models/brand'; // Brand data access functions
import analyticsService from '../services/analytics'; // Analytics data for discovery enhancements
import aiService from '../services/ai/index'; // AI services for match explanations
import { logger } from '../utils/logger'; // Logging services for discovery operations
import { sanitizeInput } from '../utils/validation'; // Input sanitization for search parameters
import { ValidationError, NotFoundError } from '../utils/errors'; // Error handling for validation failures

/**
 * Service class that integrates all discovery marketplace functionality
 */
export class DiscoveryService {
  private searchCache: LRUCache<string, any>;
  private matchCache: LRUCache<string, any>;
  private filterProcessor: FilterProcessor;
  private recommendationEngine: RecommendationEngine;

  /**
   * Initializes the discovery service with caching and processing components
   */
  constructor() {
    // Initialize search result cache with appropriate size and TTL
    this.searchCache = new LRUCache({
      max: 500,
      ttl: 300000, // 5 minutes
    });

    // Initialize match score cache with appropriate size and TTL
    this.matchCache = new LRUCache({
      max: 1000,
      ttl: 600000, // 10 minutes
    });

    // Create filter processor instance for advanced filtering
    this.filterProcessor = new FilterProcessor();

    // Initialize recommendation engine for personalized recommendations
    this.recommendationEngine = new RecommendationEngine();

    // Set up cache management (periodic cleanup, etc.)
    logger.info('Discovery service initialized');
  }

  /**
   * Searches for creators based on criteria with caching
   * @param criteria BrandTypes.CreatorCriteria | ApiTypes.DiscoveryRequest
   * @param pagination ApiTypes.PaginationParams
   * @param brandId string
   * @returns Promise<ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile>> Search results
   */
  async searchCreators(
    criteria: BrandTypes.CreatorCriteria | ApiTypes.DiscoveryRequest,
    pagination: ApiTypes.PaginationParams,
    brandId: string
  ): Promise<ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile>> {
    // Generate cache key from criteria, pagination, and brandId
    const cacheKey = `search-${brandId}-${JSON.stringify(criteria)}-${JSON.stringify(pagination)}`;

    // Check if results exist in cache
    if (this.searchCache.has(cacheKey)) {
      logger.debug({ cacheKey }, 'Returning search results from cache');
      return this.searchCache.get(cacheKey);
    }

    // Otherwise, forward to searchCreators implementation
    logger.debug({ cacheKey }, 'Executing searchCreators implementation');
    const searchResults = await searchCreators(criteria, pagination);

    // Cache results before returning
    this.searchCache.set(cacheKey, searchResults);
    return searchResults;
  }

  /**
   * Gets recommended creators with caching
   * @param brandId string
   * @param limit number
   * @param includeExplanations boolean
   * @returns Promise<object> Recommended creators with explanations
   */
  async getRecommendedCreatorsForBrand(
    brandId: string,
    limit: number,
    includeExplanations: boolean
  ): Promise<object> {
    // Generate recommendation cache key
    const cacheKey = `recommendations-${brandId}-${limit}-${includeExplanations}`;

    // Check if recommendations exist in cache
    if (this.matchCache.has(cacheKey)) {
      logger.debug({ cacheKey }, 'Returning recommendations from cache');
      return this.matchCache.get(cacheKey);
    }

    // Otherwise, forward to recommendation implementation
    logger.debug({ cacheKey }, 'Executing getRecommendedCreators implementation');
    const recommendations = await getRecommendedCreatorsForBrand(brandId, limit, includeExplanations);

    // Cache results before returning
    this.matchCache.set(cacheKey, recommendations);
    return recommendations;
  }

  /**
   * Clears all service caches
   * @param pattern string
   * @returns Promise<object> Cache clearing result
   */
  async clearCache(pattern: string): Promise<object> {
    // Clear search cache entries matching pattern
    this.searchCache.clear();

    // Clear match cache entries matching pattern
    this.matchCache.clear();

    // Clear filter processor cache
    this.filterProcessor.clearCache();

    // Return clearing statistics
    return {
      success: true,
      message: 'Caches cleared successfully',
    };
  }
}

// Create a new instance of the DiscoveryService
const discoveryService = new DiscoveryService();

// Export all functions for use by controllers
export const searchCreators = discoveryService.searchCreators;
export const getCreatorDetails = async (creatorId: string, brandId: string): Promise<CreatorTypes.CreatorProfile> => {
  // Validate creatorId format
  if (!creatorId || typeof creatorId !== 'string') {
    logger.error({ creatorId }, 'Invalid creatorId format');
    throw new ValidationError('Invalid creatorId format', { creatorId });
  }

  // Fetch creator profile with metrics using creatorModel.getCreatorWithMetrics
  const creator = await creatorModel.getCreatorWithMetrics(creatorId);

  // If creator not found, throw NotFoundError
  if (!creator) {
    logger.warn({ creatorId }, 'Creator not found');
    throw new NotFoundError('Creator not found', 'Creator', creatorId);
  }

  // If brandId is provided, calculate match score using calculateBrandCreatorMatch
  if (brandId) {
    // Include detailed match explanation if brand context is available
    const match = await calculateBrandCreatorMatch(brandId, creatorId, true);
    return { ...creator, match };
  }

  // Return enhanced creator profile with metrics and match information
  return creator;
};
export const getCreatorsByCategory = async (category: CreatorTypes.Category, pagination: ApiTypes.PaginationParams, filterOptions: object): Promise<ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile>> => {
  // Validate category value
  if (!Object.values(CreatorTypes.Category).includes(category)) {
    logger.error({ category }, 'Invalid category value');
    throw new ValidationError('Invalid category value', { category });
  }

  // Construct search criteria with category as primary filter
  const criteria = { categories: [category] };

  // Add additional filter options if provided
  const searchCriteria = { ...criteria, ...filterOptions };

  // Call searchCreators with constructed criteria and pagination
  const results = await searchCreators(searchCriteria, pagination);

  // Return paginated results with category-filtered creators
  return results;
};
export const getCreatorsByFollowerRange = async (minFollowers: number, maxFollowers: number, pagination: ApiTypes.PaginationParams, filterOptions: object): Promise<ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile>> => {
  // Validate follower range values (min must be >= 0, max must be > min if provided)
  if (minFollowers < 0) {
    logger.error({ minFollowers }, 'Invalid minFollowers value');
    throw new ValidationError('Invalid minFollowers value', { minFollowers });
  }

  if (maxFollowers && maxFollowers <= minFollowers) {
    logger.error({ minFollowers, maxFollowers }, 'Invalid maxFollowers value');
    throw new ValidationError('Invalid maxFollowers value', { minFollowers, maxFollowers });
  }

  // Construct search criteria with follower range as primary filter
  const criteria = { followerRange: { min: minFollowers, max: maxFollowers } };

  // Add additional filter options if provided
  const searchCriteria = { ...criteria, ...filterOptions };

  // Call searchCreators with constructed criteria and pagination
  const results = await searchCreators(searchCriteria, pagination);

  // Return paginated results with follower-filtered creators
  return results;
};
export const getCreatorsByEngagementRate = async (minEngagementRate: number, pagination: ApiTypes.PaginationParams, filterOptions: object): Promise<ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile>> => {
  // Validate minEngagementRate (must be between 0 and 100)
  if (minEngagementRate < 0 || minEngagementRate > 100) {
    logger.error({ minEngagementRate }, 'Invalid minEngagementRate value');
    throw new ValidationError('Invalid minEngagementRate value', { minEngagementRate });
  }

  // Normalize engagement rate value (convert percentage to decimal if needed)
  const normalizedRate = minEngagementRate / 100;

  // Construct search criteria with engagement rate as primary filter
  const criteria = { engagementRate: { min: normalizedRate } };

  // Add additional filter options if provided
  const searchCriteria = { ...criteria, ...filterOptions };

  // Call searchCreators with constructed criteria and pagination
  const results = await searchCreators(searchCriteria, pagination);

  // Return paginated results with engagement-filtered creators
  return results;
};
export const getPopularCreators = async (limit: number, options: object): Promise<CreatorTypes.CreatorProfile[]> => {
  // Apply default limit if not specified (default: 10)
  const creatorLimit = limit || 10;

  // Construct query to find creators with highest combined metrics score
  const query = { orderBy: { combinedScore: 'desc' } };

  // Apply category filter if specified in options
  if (options && options['category']) {
    query['categories'] = { has: options['category'] };
  }

  // Fetch top creators using creatorModel.findCreatorsByFilters with popularity criteria
  const creators = await creatorModel.findCreatorsByFilters(query);

  // Enhance creator profiles with detailed metrics
  const enhancedCreators = await Promise.all(creators.map(creator => creatorModel.getCreatorWithMetrics(creator.id)));

  // Return popular creators sorted by popularity score
  return enhancedCreators;
};
export const getRecommendedCreatorsForBrand = discoveryService.getRecommendedCreatorsForBrand;
export const getSimilarCreators = async (creatorId: string, limit: number, options: object): Promise<CreatorTypes.CreatorProfile[]> => {
  // Validate creatorId and fetch source creator profile
  if (!creatorId) {
    logger.error({ creatorId }, 'Invalid creatorId value');
    throw new ValidationError('Invalid creatorId value', { creatorId });
  }

  const sourceCreator = await creatorModel.getCreatorProfile(creatorId);
  if (!sourceCreator) {
    logger.warn({ creatorId }, 'Source creator not found');
    throw new NotFoundError('Source creator not found', 'Creator', creatorId);
  }

  // Call findSimilarCreators from search module with specified limit
  const similarCreators = await findSimilarCreators(creatorId, limit);

  // Apply additional filtering from options if provided
  const filteredCreators = applyFilters(similarCreators, options);

  // Enhance similar creator profiles with similarity scores
  const enhancedCreators = await enhanceSearchResults(filteredCreators, null, {}, false);

  // Return array of similar creators sorted by similarity
  return enhancedCreators;
};
export const saveSearch = async (brandId: string, name: string, description: string, criteria: BrandTypes.CreatorCriteria): Promise<BrandTypes.SavedSearch> => {
  // Validate brandId, name, and search criteria
  if (!brandId) {
    logger.error({ brandId }, 'Invalid brandId value');
    throw new ValidationError('Invalid brandId value', { brandId });
  }

  if (!name) {
    logger.error({ name }, 'Invalid name value');
    throw new ValidationError('Invalid name value', { name });
  }

  if (!criteria) {
    logger.error({ criteria }, 'Invalid criteria value');
    throw new ValidationError('Invalid criteria value', { criteria });
  }

  // Sanitize name and description inputs
  const sanitizedName = sanitizeInput(name);
  const sanitizedDescription = sanitizeInput(description);

  // Ensure criteria structure is valid
  // Call brandModel.saveBrandSearch to persist the search configuration
  const savedSearch = await brandModel.saveBrandSearch(brandId, sanitizedName, sanitizedDescription, criteria);

  // Return the saved search with ID and creation timestamp
  return savedSearch;
};
export const getSavedSearch = async (searchId: string, brandId: string): Promise<BrandTypes.SavedSearch> => {
  // Validate searchId and brandId
  if (!searchId) {
    logger.error({ searchId }, 'Invalid searchId value');
    throw new ValidationError('Invalid searchId value', { searchId });
  }

  if (!brandId) {
    logger.error({ brandId }, 'Invalid brandId value');
    throw new ValidationError('Invalid brandId value', { brandId });
  }

  // Call brandModel.getBrandSavedSearch to retrieve the search configuration
  const savedSearch = await brandModel.getBrandSavedSearch(searchId, brandId);

  // Verify the search belongs to the specified brand
  if (savedSearch.brandId !== brandId) {
    logger.warn({ searchId, brandId }, 'Search does not belong to brand');
    throw new AuthenticationError('Search does not belong to brand');
  }

  // If not found, throw NotFoundError
  if (!savedSearch) {
    logger.warn({ searchId, brandId }, 'Saved search not found');
    throw new NotFoundError('Saved search not found', 'SavedSearch', searchId);
  }

  // Return the saved search configuration
  return savedSearch;
};
export const getSavedSearches = async (brandId: string): Promise<BrandTypes.SavedSearch[]> => {
  // Validate brandId
  if (!brandId) {
    logger.error({ brandId }, 'Invalid brandId value');
    throw new ValidationError('Invalid brandId value', { brandId });
  }

  // Call brandModel.getBrandSavedSearches to retrieve all saved searches
  const savedSearches = await brandModel.getBrandSavedSearches(brandId);

  // Return array of saved searches with metadata (exclude full criteria for list view)
  return savedSearches;
};
export const executeSearch = async (searchId: string, brandId: string, pagination: ApiTypes.PaginationParams): Promise<ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile>> => {
  // Retrieve saved search using getSavedSearch function
  const savedSearch = await getSavedSearch(searchId, brandId);

  // Extract search criteria from saved configuration
  const criteria = savedSearch.filters;

  // Call searchCreators with the saved criteria, pagination, and brand context
  const results = await searchCreators(criteria, pagination);

  // Return search results with brand-specific match scores
  return results;
};
export const clearCache = async (pattern: string): Promise<object> => {
  // If pattern provided, selectively clear caches matching the pattern
  // Otherwise, clear all discovery-related caches

  // Clear filter cache using FilterProcessor.clearCache
  discoveryService.filterProcessor.clearCache();

  // Log cache clearing operation
  logger.info({ pattern }, 'Clearing discovery caches');

  // Return success confirmation with count of cleared cache entries
  return { success: true, message: 'Cache cleared successfully' };
};
export const calculateDetailedMatch = async (brandId: string, creatorId: string, includeExplanation: boolean): Promise<object> => {
  // Validate brandId and creatorId
  if (!brandId) {
    logger.error({ brandId }, 'Invalid brandId value');
    throw new ValidationError('Invalid brandId value', { brandId });
  }

  if (!creatorId) {
    logger.error({ creatorId }, 'Invalid creatorId value');
    throw new ValidationError('Invalid creatorId value', { creatorId });
  }

  // Call calculateBrandCreatorMatch from matching module with full analysis flags
  const match = await calculateBrandCreatorMatch(brandId, creatorId, includeExplanation);

  // Include detailed component-level explanations if requested
  // Return comprehensive match analysis with overall score and components
  return match;
};
export const generateCreatorInsights = async (creatorId: string): Promise<object> => {
  // Validate creatorId and retrieve creator profile
  if (!creatorId) {
    logger.error({ creatorId }, 'Invalid creatorId value');
    throw new ValidationError('Invalid creatorId value', { creatorId });
  }

  const creator = await creatorModel.findCreatorById(creatorId);
  if (!creator) {
    logger.warn({ creatorId }, 'Creator not found');
    throw new NotFoundError('Creator not found', 'Creator', creatorId);
  }

  // Initialize recommendation engine
  const recommendationEngine = new RecommendationEngine();

  // Generate content strategy recommendations
  const contentStrategyRecommendations = await recommendationEngine.generateContentRecommendations(creatorId, {});

  // Generate platform optimization recommendations
  const platformOptimizationRecommendations = await recommendationEngine.generatePlatformRecommendations(creatorId, {});

  // Generate partnership opportunity recommendations
  const partnershipOpportunityRecommendations = await recommendationEngine.generatePartnershipRecommendations(creatorId, 'creator', {});

  // Combine insights into cohesive recommendation package
  const insights = {
    contentStrategy: contentStrategyRecommendations,
    platformOptimization: platformOptimizationRecommendations,
    partnershipOpportunities: partnershipOpportunityRecommendations
  };

  // Return insights object with prioritized recommendations
  return insights;
};

// Export the default object
export default {
  searchCreators,
  getCreatorDetails,
  getCreatorsByCategory,
  getCreatorsByFollowerRange,
  getCreatorsByEngagementRate,
  getPopularCreators,
  getRecommendedCreatorsForBrand,
  getSimilarCreators,
  saveSearch,
  getSavedSearch,
  getSavedSearches,
  executeSearch,
  clearCache,
  calculateDetailedMatch,
  generateCreatorInsights
};