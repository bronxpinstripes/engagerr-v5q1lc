import { CreatorProfile, AudienceDemographics, PerformanceMetrics, ConnectedPlatform, PricingModel } from '../types/creator'; // Import creator profile type for filtering operations
import { PlatformType } from '../types/platform'; // Import platform type enum for platform filtering
import { validateFilters } from '../utils/validation'; // Import validation utility for filter validation
import { logger } from '../utils/logger'; // Import logger for logging filter operations
import prisma from '../config/database'; // Import Prisma client for database queries

/**
 * Interface defining the structure for audience-based filters.
 */
export interface AudienceFilter {
  ageRange?: { min: number; max: number };
  gender?: string[];
  locations?: string[];
  interests?: string[];
}

/**
 * Interface defining the structure for metrics-based filters.
 */
export interface MetricsFilter {
  followerRange?: { min: number; max?: number };
  engagementRate?: { min: number; max?: number };
  growthRate?: { min: number };
  contentValue?: { min: number; max?: number };
}

/**
 * Interface defining the structure for pricing-based filters.
 */
export interface PricingFilter {
  minBudget?: number;
  maxBudget?: number;
}

/**
 * Interface defining the structure for pagination options.
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

/**
 * Interface defining the structure for paginated results.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface defining the structure for filter options.
 */
export interface FilterOptions {
  categories?: string[];
  platforms?: PlatformType[];
  audience?: AudienceFilter;
  metrics?: MetricsFilter;
  pricing?: PricingFilter;
}

/**
 * Applies a set of filters to a list of creator profiles and returns the filtered results
 * @param creators - List of creator profiles to filter
 * @param filters - Filter options to apply
 * @returns Filtered list of creators matching the specified criteria
 */
export const applyFilters = (creators: CreatorProfile[], filters: FilterOptions): CreatorProfile[] => {
  // Validate the filter options using validateFilters
  validateFilters(filters);

  // Log the filtering operation with creator count and filter criteria
  logger.debug(`Filtering ${creators.length} creators with filters: ${JSON.stringify(filters)}`);

  let filteredCreators = creators;

  // Apply category filters if specified
  if (filters.categories && filters.categories.length > 0) {
    filteredCreators = filterByCategories(filteredCreators, filters.categories);
  }

  // Apply platform filters if specified
  if (filters.platforms && filters.platforms.length > 0) {
    filteredCreators = filterByPlatforms(filteredCreators, filters.platforms);
  }

  // Apply audience demographic filters if specified
  if (filters.audience) {
    filteredCreators = filterByAudience(filteredCreators, filters.audience);
  }

  // Apply performance metric filters if specified
  if (filters.metrics) {
    filteredCreators = filterByMetrics(filteredCreators, filters.metrics);
  }

  // Apply pricing filters if specified
  if (filters.pricing) {
    filteredCreators = filterByPricing(filteredCreators, filters.pricing);
  }

  // Log the result count after filtering
  logger.debug(`Filtered creators count: ${filteredCreators.length}`);

  // Return the filtered list of creators
  return filteredCreators;
};

/**
 * Filters creators by their content categories
 * @param creators - List of creator profiles to filter
 * @param categories - Array of categories to filter by
 * @returns Creators matching the specified categories
 */
export const filterByCategories = (creators: CreatorProfile[], categories: string[]): CreatorProfile[] => {
  // If categories array is empty, return all creators
  if (!categories || categories.length === 0) {
    return creators;
  }

  // Filter creators where their categories array includes at least one of the specified categories
  const filteredCreators = creators.filter(creator =>
    creator.categories.some(category => categories.includes(category))
  );

  // Return the filtered creators
  return filteredCreators;
};

/**
 * Filters creators by their connected platforms
 * @param creators - List of creator profiles to filter
 * @param platforms - Array of platforms to filter by
 * @returns Creators with the specified connected platforms
 */
export const filterByPlatforms = (creators: CreatorProfile[], platforms: PlatformType[]): CreatorProfile[] => {
  // If platforms array is empty, return all creators
  if (!platforms || platforms.length === 0) {
    return creators;
  }

  // Filter creators where they have at least one connected platform matching the specified platforms
  const filteredCreators = creators.filter(creator =>
    creator.platformSummary.some(platform => platforms.includes(platform.platformType))
  );

  // Return the filtered creators
  return filteredCreators;
};

/**
 * Filters creators by audience demographics
 * @param creators - List of creator profiles to filter
 * @param audienceFilter - Audience filter options
 * @returns Creators matching the audience demographic criteria
 */
export const filterByAudience = (creators: CreatorProfile[], audienceFilter: AudienceFilter): CreatorProfile[] => {
  let filteredCreators = creators;

  // Apply age range filter if specified
  if (audienceFilter.ageRange) {
    filteredCreators = filteredCreators.filter(creator =>
      creator.demographics.ageRanges['18-24'] >= audienceFilter.ageRange.min &&
      creator.demographics.ageRanges['55+'] <= audienceFilter.ageRange.max
    );
  }

  // Apply gender distribution filter if specified
  if (audienceFilter.gender && audienceFilter.gender.length > 0) {
    filteredCreators = filteredCreators.filter(creator =>
      audienceFilter.gender.some(gender => creator.demographics.genderDistribution[gender] > 0)
    );
  }

  // Apply location filter if specified
  if (audienceFilter.locations && audienceFilter.locations.length > 0) {
    filteredCreators = filteredCreators.filter(creator =>
      audienceFilter.locations.some(location => creator.demographics.topLocations[location] > 0)
    );
  }

  // Apply interests filter if specified
  if (audienceFilter.interests && audienceFilter.interests.length > 0) {
    filteredCreators = filteredCreators.filter(creator =>
      audienceFilter.interests.some(interest => creator.demographics.interests[interest] > 0)
    );
  }

  // Return creators that match all applied audience filters
  return filteredCreators;
};

/**
 * Filters creators by performance metrics
 * @param creators - List of creator profiles to filter
 * @param metricsFilter - Metrics filter options
 * @returns Creators matching the performance metric criteria
 */
export const filterByMetrics = (creators: CreatorProfile[], metricsFilter: MetricsFilter): CreatorProfile[] => {
  let filteredCreators = creators;

  // Apply follower range filter if specified
  if (metricsFilter.followerRange) {
    filteredCreators = filteredCreators.filter(creator =>
      creator.totalFollowers >= metricsFilter.followerRange.min &&
      (metricsFilter.followerRange.max === undefined || creator.totalFollowers <= metricsFilter.followerRange.max)
    );
  }

  // Apply engagement rate filter if specified
  if (metricsFilter.engagementRate) {
    filteredCreators = filteredCreators.filter(creator =>
      creator.engagementRate >= metricsFilter.engagementRate.min &&
      (metricsFilter.engagementRate.max === undefined || creator.engagementRate <= metricsFilter.engagementRate.max)
    );
  }

  // Apply growth rate filter if specified
  if (metricsFilter.growthRate) {
    filteredCreators = filteredCreators.filter(creator =>
      creator.performanceMetrics.growthRate >= metricsFilter.growthRate.min
    );
  }

  // Apply content value filter if specified
  if (metricsFilter.contentValue) {
    filteredCreators = filteredCreators.filter(creator =>
      creator.performanceMetrics.contentValue >= metricsFilter.contentValue.min &&
      (metricsFilter.contentValue.max === undefined || creator.performanceMetrics.contentValue <= metricsFilter.contentValue.max)
    );
  }

  // Return creators that match all applied metric filters
  return filteredCreators;
};

/**
 * Filters creators by their pricing and budget requirements
 * @param creators - List of creator profiles to filter
 * @param pricingFilter - Pricing filter options
 * @returns Creators matching the pricing criteria
 */
export const filterByPricing = (creators: CreatorProfile[], pricingFilter: PricingFilter): CreatorProfile[] => {
  let filteredCreators = creators;

  // Apply minimum budget filter if specified
  if (pricingFilter.minBudget) {
    filteredCreators = filteredCreators.filter(creator =>
      creator.pricing.baseRate >= pricingFilter.minBudget
    );
  }

  // Apply maximum budget filter if specified
  if (pricingFilter.maxBudget) {
    filteredCreators = filteredCreators.filter(creator =>
      creator.pricing.baseRate <= pricingFilter.maxBudget
    );
  }

  // Filter creators where base rate or average platform rate falls within budget range
  filteredCreators = filteredCreators.filter(creator => {
    const baseRateWithinBudget =
      (!pricingFilter.minBudget || creator.pricing.baseRate >= pricingFilter.minBudget) &&
      (!pricingFilter.maxBudget || creator.pricing.baseRate <= pricingFilter.maxBudget);

    const platformRateWithinBudget = creator.pricing.platformRates.some(rate =>
      (!pricingFilter.minBudget || rate.rate >= pricingFilter.minBudget) &&
      (!pricingFilter.maxBudget || rate.rate <= pricingFilter.maxBudget)
    );

    return baseRateWithinBudget || platformRateWithinBudget;
  });

  // Return creators with pricing within the specified budget range
  return filteredCreators;
};

/**
 * Converts filter options into a database-friendly query object for use with ORM
 * @param filters - Filter options to convert
 * @returns Query object that can be used with Prisma ORM to filter creators
 */
export const createFilterQuery = (filters: FilterOptions): object => {
  // Validate the filter options
  validateFilters(filters);

  // Initialize empty query object with WHERE clause
  const query: any = {
    where: {}
  };

  // Build query conditions for categories using array contains
  if (filters.categories && filters.categories.length > 0) {
    query.where.categories = {
      hasSome: filters.categories
    };
  }

  // Build query conditions for platforms using array contains
  if (filters.platforms && filters.platforms.length > 0) {
    query.where.platforms = {
      some: {
        platform: {
          in: filters.platforms
        }
      }
    };
  }

  // Build query conditions for audience demographics
  if (filters.audience) {
    if (filters.audience.ageRange) {
      query.where.ageRanges = {
        gte: filters.audience.ageRange.min,
        lte: filters.audience.ageRange.max
      };
    }

    if (filters.audience.gender && filters.audience.gender.length > 0) {
      query.where.gender = {
        in: filters.audience.gender
      };
    }

    if (filters.audience.locations && filters.audience.locations.length > 0) {
      query.where.locations = {
        hasSome: filters.audience.locations
      };
    }

    if (filters.audience.interests && filters.audience.interests.length > 0) {
      query.where.interests = {
        hasSome: filters.audience.interests
      };
    }
  }

  // Build query conditions for performance metrics using range operators
  if (filters.metrics) {
    if (filters.metrics.followerRange) {
      query.where.followers = {
        gte: filters.metrics.followerRange.min,
        lte: filters.metrics.followerRange.max
      };
    }

    if (filters.metrics.engagementRate) {
      query.where.engagementRate = {
        gte: filters.metrics.engagementRate.min,
        lte: filters.metrics.engagementRate.max
      };
    }

    if (filters.metrics.growthRate) {
      query.where.growthRate = {
        gte: filters.metrics.growthRate.min
      };
    }

    if (filters.metrics.contentValue) {
      query.where.contentValue = {
        gte: filters.metrics.contentValue.min,
        lte: filters.metrics.contentValue.max
      };
    }
  }

  // Build query conditions for pricing using range operators
  if (filters.pricing) {
    query.where.pricing = {
      gte: filters.pricing.minBudget,
      lte: filters.pricing.maxBudget
    };
  }

  // Return the complete query object for ORM use
  return query;
};

/**
 * Retrieves a paginated list of creators based on filter criteria
 * @param filters - Filter options to apply
 * @param pagination - Pagination options
 * @returns Paginated result containing filtered creators and count
 */
export const getPaginatedFilteredCreators = async (
  filters: FilterOptions,
  pagination: PaginationOptions
): Promise<PaginatedResult<CreatorProfile>> => {
  // Create filter query from filter options
  const filterQuery = createFilterQuery(filters);

  // Add pagination parameters (skip, take) to query
  const skip = (pagination.page - 1) * pagination.limit;
  const take = pagination.limit;

  // Add sorting parameters based on pagination options
  const orderBy: any = {};
  if (pagination.sortBy) {
    orderBy[pagination.sortBy] = pagination.sortDirection;
  }

  // Execute query against database to get creators
  const creators = await prisma.creator.findMany({
    where: filterQuery.where,
    skip,
    take,
    orderBy
  });

  // Execute count query to get total matching creators
  const total = await prisma.creator.count({
    where: filterQuery.where
  });

  // Calculate total pages
  const totalPages = Math.ceil(total / pagination.limit);

  // Return paginated result with creators, total count, and pagination info
  return {
    data: creators,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages
  };
};

/**
 * Class responsible for processing and applying filters to creator data
 */
export class FilterProcessor {
  private filterHandlers: Map<string, Function>;
  private filterCache: object;

  /**
   * Initializes the filter processor with standard filter handlers
   */
  constructor() {
    // Initialize the filterHandlers map with standard filter functions
    this.filterHandlers = new Map([
      ['categories', filterByCategories],
      ['platforms', filterByPlatforms],
      ['audience', filterByAudience],
      ['metrics', filterByMetrics],
      ['pricing', filterByPricing]
    ]);

    // Initialize the empty filterCache object for optimizing repeated filter operations
    this.filterCache = {};
  }

  /**
   * Processes a set of filters against a collection of creators
   * @param creators - List of creator profiles to filter
   * @param filters - Filter options to apply
   * @returns Filtered creators matching all criteria
   */
  public process(creators: CreatorProfile[], filters: FilterOptions): CreatorProfile[] {
    // Generate cache key based on filter options and creator ids
    const cacheKey = this.generateCacheKey(creators, filters);

    // Check if result exists in cache for these filters
    if (this.filterCache[cacheKey]) {
      return this.filterCache[cacheKey];
    }

    // Validate the provided filters
    validateFilters(filters);

    let filteredCreators = creators;

    // Apply each filter type using corresponding handler from filterHandlers
    this.filterHandlers.forEach((handler, filterType) => {
      if (filters[filterType]) {
        filteredCreators = handler(filteredCreators, filters[filterType]);
      }
    });

    // Store result in cache with filter signature as key
    this.filterCache[cacheKey] = filteredCreators;

    // Return the filtered creators
    return filteredCreators;
  }

  /**
   * Registers a custom filter handler for specialized filtering needs
   * @param filterType - Name of the filter type
   * @param filterHandler - Function to handle the filter
   */
  public registerCustomFilter(filterType: string, filterHandler: Function): void {
    // Add the custom filter handler to the filterHandlers map
    this.filterHandlers.set(filterType, filterHandler);

    // Clear any cached results that might be affected by this new handler
    this.clearCache();
  }

  /**
   * Clears the filter cache to ensure fresh results
   */
  public clearCache(): void {
    // Reset the filterCache to an empty object
    this.filterCache = {};
  }

  /**
   * Generates a unique cache key based on filters and creator set
   * @param creators - List of creator profiles
   * @param filters - Filter options
   * @returns Unique cache key for the filter operation
   */
  private generateCacheKey(creators: CreatorProfile[], filters: FilterOptions): string {
    // Create hash from filter options serialized to JSON
    const filterHash = JSON.stringify(filters);

    // Create hash from creator IDs array
    const creatorIdsHash = creators.map(creator => creator.id).sort().join(',');

    // Combine both hashes to form unique cache key
    const cacheKey = `${filterHash}-${creatorIdsHash}`;

    // Return the cache key string
    return cacheKey;
  }
}

// Export main filtering function for use by discovery service
export { applyFilters };

// Export function to create database queries from filter options
export { createFilterQuery };

// Export function to get paginated creator results with filters
export { getPaginatedFilteredCreators };

// Export filter processor class for advanced filtering operations
export { FilterProcessor };

// Export filter options interface for type checking
export type { FilterOptions };

// Export audience filter interface for demographic filtering
export type { AudienceFilter };

// Export metrics filter interface for performance-based filtering
export type { MetricsFilter };

// Export pricing filter interface for budget-based filtering
export type { PricingFilter };

// Export pagination options for paginated filter results
export type { PaginationOptions };

// Export paginated result interface for filtered creator results
export type { PaginatedResult };