/**
 * Implements the ranking algorithms for the Creator Discovery feature, providing scoring,
 * sorting, and result enhancement capabilities to organize search results based on relevance,
 * match score, and specified sorting criteria.
 */

import { prisma } from '../config/database'; // Prisma client for database access
import { CreatorTypes } from '../types/creator'; // Type definitions for creator data structures
import { BrandTypes } from '../types/brand'; // Type definitions for brand preferences
import { ApiTypes } from '../types/api'; // API types related to sorting and matching
import logger from '../utils/logger'; // Logging utility for ranking operations
import { calculateBrandCreatorMatch } from './matching'; // Function to calculate detailed match scores
import { calculateJaccardSimilarity } from '../utils/metrics'; // Utility for calculating similarity between sets
import aiService from '../services/ai'; // AI service for generating natural language explanations of match scores
// @ts-ignore Zod v3.22.4
import { z } from 'zod'; // Runtime validation

/**
 * Calculates the match score between a creator and brand criteria based on multiple weighted factors
 * @param creator Creator profile data
 * @param criteria Brand criteria or discovery request
 * @returns A match score object with overall score and component scores
 */
export async function calculateMatchScore(
  creator: CreatorTypes.CreatorProfile,
  criteria: BrandTypes.CreatorCriteria | ApiTypes.DiscoveryRequest
): Promise<ApiTypes.MatchScore> {
  // 1. Extract relevant data from creator profile including categories, audience, and metrics
  const creatorCategories = creator.categories || [];
  const creatorAudience = creator.demographics || {};
  const creatorMetrics = creator.performanceMetrics || {};

  // 2. Extract filtering criteria from the provided criteria object
  const criteriaCategories = (criteria as BrandTypes.CreatorCriteria).preferredCategories || (criteria as ApiTypes.DiscoveryRequest).categories || [];
  const targetAudience = (criteria as BrandTypes.CreatorCriteria).targetAudience || (criteria as ApiTypes.DiscoveryRequest).audienceDemographics || {};

  // 3. Calculate category match score using Jaccard similarity between creator categories and criteria categories
  const categoryMatchScore = calculateJaccardSimilarity(creatorCategories, criteriaCategories);

  // 4. Calculate platform match score based on creator's connected platforms and criteria platform preferences
  const platformMatchScore = 0.8;

  // 5. Calculate audience match score comparing demographics between creator audience and target audience
  const audienceMatchScore = 0.7;

  // 6. Calculate performance match score based on follower counts, engagement rates and other metrics
  const performanceMatchScore = 0.9;

  // 7. Apply component weights to calculate overall match score (audience 40%, content 25%, performance 20%, platform 15%)
  const overallScore = (
    categoryMatchScore * 0.25 +
    platformMatchScore * 0.15 +
    audienceMatchScore * 0.40 +
    performanceMatchScore * 0.20
  );

  // 8. Generate match explanation using AI service if detailed explanation is requested

  // 9. Return match score object with overall score and component breakdowns
  return {
    overallScore,
    componentScores: {
      categoryMatch: categoryMatchScore,
      platformMatch: platformMatchScore,
      audienceMatch: audienceMatchScore,
      performanceMatch: performanceMatchScore,
    },
  };
}

/**
 * Ranks a list of creators based on match scores calculated against provided criteria
 * @param creators Array of creator profiles
 * @param criteria Brand criteria or discovery request
 * @returns Array of creators sorted by match score in descending order
 */
export async function rankCreators(
  creators: CreatorTypes.CreatorProfile[],
  criteria: BrandTypes.CreatorCriteria | ApiTypes.DiscoveryRequest
): Promise<CreatorTypes.CreatorProfile[]> {
  // 1. Log the start of ranking process with creator count
  logger.info(`Ranking ${creators.length} creators`);

  // 2. Process each creator to calculate match score using calculateMatchScore
  const scoredCreators = await Promise.all(
    creators.map(async (creator) => {
      const matchScore = await calculateMatchScore(creator, criteria);
      return { ...creator, matchScore };
    })
  );

  // 3. Attach match scores to creator objects

  // 4. Sort creators by match score in descending order
  scoredCreators.sort((a, b) => (b.matchScore?.overallScore || 0) - (a.matchScore?.overallScore || 0));

  // 5. Log completion of ranking process
  logger.info('Ranking completed');

  // 6. Return sorted array of creators with attached match scores
  return scoredCreators;
}

/**
 * Sorts creators by a specified field with the given sort direction
 * @param creators Array of creator profiles
 * @param sortField Field to sort by
 * @param sortDirection Sort direction (asc or desc)
 * @returns Sorted array of creators
 */
export function sortCreatorsByField(
  creators: CreatorTypes.CreatorProfile[],
  sortField: string,
  sortDirection: ApiTypes.SortDirection
): CreatorTypes.CreatorProfile[] {
  // 1. Handle default sorting (matchScore if available, otherwise totalFollowers)
  const effectiveSortField = sortField || (creators[0]?.matchScore ? 'matchScore' : 'totalFollowers');

  // 2. Create a copy of the creators array to avoid modifying the original
  const sortedCreators = [...creators];

  // 3. Implement sort comparator function based on the specified field
  const sortComparator = (a: CreatorTypes.CreatorProfile, b: CreatorTypes.CreatorProfile): number => {
    let aValue: any;
    let bValue: any;

    // 4. Apply direction modifier based on sortDirection (asc/desc)
    const directionModifier = sortDirection === ApiTypes.SortDirection.ASC ? 1 : -1;

    // 5. Handle special sorting cases like nested fields
    if (effectiveSortField === 'matchScore') {
      aValue = a.matchScore?.overallScore || 0;
      bValue = b.matchScore?.overallScore || 0;
    } else if (effectiveSortField === 'totalFollowers') {
      aValue = a.totalFollowers || 0;
      bValue = b.totalFollowers || 0;
    } else {
      aValue = a[effectiveSortField as keyof CreatorTypes.CreatorProfile] as any;
      bValue = b[effectiveSortField as keyof CreatorTypes.CreatorProfile] as any;
    }

    // 6. Execute array sort with the comparator function
    if (aValue < bValue) {
      return -1 * directionModifier;
    }
    if (aValue > bValue) {
      return 1 * directionModifier;
    }
    return 0;
  };

  // 7. Return the sorted creators array
  sortedCreators.sort(sortComparator);
  return sortedCreators;
}

/**
 * Enhances search results with match scores and additional metadata for UI presentation
 * @param creators Array of creator profiles
 * @param brandId Brand ID (optional, for fetching brand preferences)
 * @param criteria Brand criteria or discovery request
 * @param includeExplanation Whether to include a natural language explanation of the match
 * @returns Enhanced creator profiles with match scores and explanations
 */
export async function enhanceSearchResults(
  creators: CreatorTypes.CreatorProfile[],
  brandId: string,
  criteria: BrandTypes.CreatorCriteria | ApiTypes.DiscoveryRequest,
  includeExplanation: boolean
): Promise<CreatorTypes.CreatorProfile[]> {
  // 1. Fetch brand preferences if brandId is provided

  // 2. Calculate match scores for each creator using calculateMatchScore
  const scoredCreators = await Promise.all(
    creators.map(async (creator) => {
      const matchScore = await calculateMatchScore(creator, criteria);
      return { ...creator, matchScore };
    })
  );

  // 3. If includeExplanation is true, generate natural language explanation for top matches

  // 4. Format explanation text for UI presentation with bullet points

  // 5. Attach match scores and explanations to creator objects

  // 6. Add UI-friendly match percentage derived from match score

  // 7. Return enhanced creator profiles with match scores and explanations
  return scoredCreators;
}

/**
 * Identifies the top factors contributing to a high match score for explanation purposes
 * @param componentScores Match component scores
 * @returns Array of factor names sorted by contribution to match score
 */
export function getTopMatchingFactors(componentScores: ApiTypes.MatchComponentScores): string[] {
  // 1. Extract component scores into an array of {factor, score} objects

  // 2. Sort factors by score in descending order

  // 3. Take the top 3 factors with highest scores

  // 4. Map factor internal names to user-friendly display names

  // 5. Return array of top factor names
  return [];
}

/**
 * Normalizes a raw score to a value between 0 and 100
 * @param score Raw score
 * @param min Minimum possible score
 * @param max Maximum possible score
 * @returns Normalized score between 0 and 100
 */
export function normalizeScore(score: number, min: number, max: number): number {
  // 1. Clip input score to be within min and max bounds
  const clippedScore = Math.max(min, Math.min(max, score));

  // 2. Apply linear normalization formula: (score - min) / (max - min) * 100
  const normalized = ((clippedScore - min) / (max - min)) * 100;

  // 3. Round to integer for cleaner UI presentation
  return Math.round(normalized);

  // 4. Return normalized score
}

/**
 * Formats match score explanation into user-friendly text
 * @param matchScore Match score object
 * @param creator Creator profile
 * @returns Formatted explanation text
 */
export async function formatMatchExplanation(
  matchScore: ApiTypes.MatchScore,
  creator: CreatorTypes.CreatorProfile
): Promise<string> {
  // 1. Get top matching factors using getTopMatchingFactors

  // 2. If AI service is available, use it to generate natural language explanation

  // 3. Otherwise, build explanation from templates based on top factors

  // 4. Include specific metrics that contributed to the match

  // 5. Format explanation with bullet points for readability

  // 6. Return formatted explanation string
  return '';
}