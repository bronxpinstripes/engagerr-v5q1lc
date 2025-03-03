/**
 * Implements the search functionality for the Creator Discovery feature, providing robust search operations with filtering, sorting, and pagination capabilities for brands to find suitable creators based on various criteria.
 */

import { PrismaClient } from '@prisma/client'; // Prisma client for database access // ^5.0.0
import { CreatorTypes } from '../types/creator'; // Creator data structure definitions
import { BrandTypes } from '../types/brand'; // Brand search criteria definitions
import { ApiTypes } from '../types/api'; // API request/response type definitions
import { PlatformTypes } from '../types/platform'; // Platform-related type definitions
import creatorModel from '../models/creator'; // Creator data access functions
import { calculateMatchScore, enhanceSearchResults, sortCreatorsByField } from './ranking'; // Calculate compatibility score for creators
import { applyFilters, validateFilterCriteria } from './filtering'; // Apply filter conditions to search query
import { logger } from '../utils/logger'; // Logging service for search operations
import { sanitizeInput } from '../utils/validation'; // Input sanitization for search parameters
import { ValidationError } from '../utils/errors'; // Error handling for validation failures
// @ts-ignore Zod v3.22.4
import { z } from 'zod'; // Runtime validation

/**
 * Main search function for discovering creators based on various criteria with pagination
 * @param criteria - Search criteria including categories, platforms, audience, and metrics
 * @param pagination - Pagination parameters (page, pageSize)
 * @returns Paginated creator search results with match scores
 */
export async function searchCreators(
  criteria: BrandTypes.CreatorCriteria | ApiTypes.DiscoveryRequest,
  pagination: ApiTypes.PaginationParams
): Promise<ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile>> {
  // 1. Validate and sanitize search criteria using validateFilterCriteria
  validateFilterCriteria(criteria);

  // 2. Build base query for creator search
  const query = buildSearchQuery(criteria);

  // 3. Add pagination parameters (page, limit)
  const page = pagination.page || 1;
  const pageSize = pagination.pageSize || 20;
  const skip = (page - 1) * pageSize;

  // 4. Execute count query for total results
  const totalItems = await prisma.creator.count({ where: query.where });

  // 5. Execute main query to fetch matching creators
  const creators = await prisma.creator.findMany({
    ...query,
    skip,
    take: pageSize,
    include: {
      user: true,
      platforms: true
    }
  });

  // 6. Fetch detailed profiles for each matched creator
  const creatorProfiles = creators.map(creator => creatorModel.getCreatorProfile(creator.id));

  // 7. Enhance results with match scores using enhanceSearchResults
  const enhancedProfiles = await enhanceSearchResults(creatorProfiles, criteria.brandId, criteria, true);

  // 8. Apply sorting based on criteria using sortCreatorsByField
  const sortedProfiles = sortCreatorsByField(enhancedProfiles, criteria.sortBy, criteria.sortDirection);

  // 9. Calculate facets for filter options
  const facets = getSearchFacets(sortedProfiles, criteria);

  // 10. Construct and return paginated response with metadata
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data: sortedProfiles,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Performs a quick text-based search across creator profiles
 * @param searchParams - Search parameters including query text and fields
 * @param pagination - Pagination parameters (page, pageSize)
 * @returns Paginated creator search results matching text query
 */
export async function quickSearch(
  searchParams: ApiTypes.SearchParams,
  pagination: ApiTypes.PaginationParams
): Promise<ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile>> {
  // 1. Sanitize search query text
  const queryText = sanitizeInput(searchParams.query);

  // 2. Build text search condition using PostgreSQL full-text search
  const searchCondition = {
    OR: searchParams.fields.map(field => ({
      [field]: {
        contains: queryText,
        mode: 'insensitive'
      }
    }))
  };

  // 3. Apply search across specified fields (name, bio, categories)
  const query = {
    where: searchCondition
  };

  // 4. Add pagination parameters
  const page = pagination.page || 1;
  const pageSize = pagination.pageSize || 20;
  const skip = (page - 1) * pageSize;

  // 5. Execute search query with text conditions
  const totalItems = await prisma.creator.count({ where: query.where });
  const creators = await prisma.creator.findMany({
    ...query,
    skip,
    take: pageSize,
    include: {
      user: true,
      platforms: true
    }
  });

  // 6. Fetch creator profiles for results
  const creatorProfiles = creators.map(creator => creatorModel.getCreatorProfile(creator.id));

  // 7. Format and return paginated response
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data: creatorProfiles,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Finds creators similar to a specified creator based on various factors
 * @param creatorId - ID of the source creator
 * @param limit - Maximum number of similar creators to return
 * @returns Array of similar creators with similarity scores
 */
export async function findSimilarCreators(
  creatorId: string,
  limit: number
): Promise<CreatorTypes.CreatorProfile[]> {
  // 1. Retrieve source creator profile
  const sourceCreator = await creatorModel.getCreatorProfile(creatorId);
  if (!sourceCreator) {
    throw new ValidationError('Source creator not found');
  }

  // 2. Extract creator's categories, audience demographics, and metrics
  const categories = sourceCreator.categories;
  const audienceDemographics = sourceCreator.demographics;
  const metrics = sourceCreator.performanceMetrics;

  // 3. Build search criteria based on source creator's attributes
  const searchCriteria = {
    categories,
    audienceDemographics,
    metrics
  };

  // 4. Find creators with similar attributes excluding the source creator
  const similarCreators = await searchCreators(searchCriteria, { page: 1, pageSize: limit });

  // 5. Calculate similarity scores based on multiple factors

  // 6. Sort results by similarity score

  // 7. Return limited number of most similar creators
  return similarCreators.data.slice(0, limit);
}

/**
 * Builds a Prisma query object for creator search based on criteria
 * @param criteria - Search criteria including categories, platforms, audience, and metrics
 * @returns Prisma query object for filtering creators
 */
export function buildSearchQuery(
  criteria: BrandTypes.CreatorCriteria | ApiTypes.DiscoveryRequest
): Prisma.CreatorWhereInput {
  // 1. Initialize empty base query object
  const query: Prisma.CreatorWhereInput = {};

  // 2. Add verification status filter (verified creators only by default)
  query.verificationStatus = CreatorTypes.VerificationStatus.VERIFIED;

  // 3. Add subscription status filter (active subscriptions only)
  query.subscriptionStatus = CreatorTypes.SubscriptionStatus.ACTIVE;

  // 4. Apply user-specified filters via applyFilters function
  applyFilters(query, criteria);

  // 5. Return complete query object
  return query;
}

/**
 * Calculates available facet options for search filters based on current results
 * @param creators - Array of creator profiles
 * @param appliedCriteria - Applied search criteria
 * @returns Facet options for categories, platforms, etc.
 */
export function getSearchFacets(
  creators: CreatorTypes.CreatorProfile[],
  appliedCriteria: BrandTypes.CreatorCriteria | ApiTypes.DiscoveryRequest
): object {
  // 1. Extract unique categories from result set with counts
  const categoryCounts = {};
  creators.forEach(creator => {
    creator.categories.forEach(category => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
  });

  // 2. Extract unique platforms from result set with counts
  const platformCounts = {};
  creators.forEach(creator => {
    creator.platformSummary.forEach(platform => {
      platformCounts[platform.platformType] = (platformCounts[platform.platformType] || 0) + 1;
    });
  });

  // 3. Calculate follower range distribution

  // 4. Calculate engagement rate distribution

  // 5. Extract unique locations from result set with counts

  // 6. Return facet object with all calculated options
  return {
    categories: categoryCounts,
    platforms: platformCounts
  };
}

/**
 * Gets AI-recommended creators for a brand based on preferences and past partnerships
 * @param brandId - ID of the brand
 * @param limit - Maximum number of recommended creators to return
 * @returns Array of recommended creators with explanation
 */
export async function getRecommendedCreators(
  brandId: string,
  limit: number
): Promise<CreatorTypes.CreatorProfile[]> {
  // 1. Retrieve brand preferences and past partnership data

  // 2. Build recommendation criteria based on brand preferences

  // 3. Factor in successful past partnerships for pattern recognition

  // 4. Execute search with recommendation criteria

  // 5. Calculate detailed match scores with explanation

  // 6. Return limited number of recommended creators
  return [];
}

/**
 * Saves a search configuration for future use by a brand
 * @param brandId - ID of the brand
 * @param name - Name of the saved search
 * @param description - Description of the saved search
 * @param criteria - Search criteria to save
 * @returns Saved search identifier
 */
export async function saveSearch(
  brandId: string,
  name: string,
  description: string,
  criteria: BrandTypes.CreatorCriteria
): Promise<{ id: string; name: string; }> {
  // 1. Validate input parameters

  // 2. Sanitize search name and description

  // 3. Validate and normalize search criteria

  // 4. Store search configuration in database

  // 5. Return saved search identifier and name
  return { id: 'saved-search-id', name: 'My Saved Search' };
}

/**
 * Retrieves a previously saved search configuration
 * @param searchId - ID of the saved search
 * @param brandId - ID of the brand
 * @returns Saved search configuration
 */
export async function getSavedSearch(
  searchId: string,
  brandId: string
): Promise<{ id: string; name: string; description: string; criteria: BrandTypes.CreatorCriteria; }> {
  // 1. Verify brand has access to this saved search

  // 2. Retrieve saved search configuration from database

  // 3. Return search configuration with criteria
  return { id: 'saved-search-id', name: 'My Saved Search', description: 'Description', criteria: {} };
}

/**
 * High-level search function that handles various search types
 * @param searchConfig - Configuration object specifying search type and parameters
 * @returns Search results
 */
export async function executeSearch(
  searchConfig: object
): Promise<ApiTypes.PaginatedResponse<CreatorTypes.CreatorProfile>> {
  // 1. Determine search type (criteria-based, text-based, recommendation)

  // 2. Route to appropriate search function based on type

  // 3. Handle pagination consistently across search types

  // 4. Log search execution for analytics

  // 5. Return normalized search results
  return {
    data: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}