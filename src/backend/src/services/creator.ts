/**
 * Service layer implementation that provides high-level business logic for creator-related operations in the Engagerr platform. Coordinates between models, other services, and controllers to manage creator profiles, content, analytics, and platform connections.
 */

import creatorModel from '../models/creator'; // src/backend/src/models/creator.ts
import platformModel from '../models/platform'; // src/backend/src/models/platform.ts
import contentModel from '../models/content'; // src/backend/src/models/content.ts
import { createContentRelationship, getContentFamily } from '../models/contentRelationship'; // src/backend/src/models/contentRelationship.ts
import { getPlatformAdapter } from '../integrations/platforms'; // src/backend/src/integrations/platforms/index.ts
import { encryptPlatformToken } from '../security/encryption'; // src/backend/src/security/encryption.ts
import analyticsService from './analytics'; // src/backend/src/services/analytics.ts
import userService from './user'; // src/backend/src/services/user.ts
import subscriptionService from './subscription'; // src/backend/src/services/subscription.ts
import { CreatorTypes, Creator, CreatorProfile, CreatorSettings, Category, AudienceDemographics, CreatorWithMetrics, CreatorSearchFilters, CreatorListResult, CreateCreatorInput, UpdateCreatorInput } from '../types/creator'; // src/backend/src/types/creator.ts
import { UserTypes, SubscriptionTier, SubscriptionStatus, VerificationStatus } from '../types/user'; // src/backend/src/types/user.ts
import { PlatformTypes, PlatformType, PlatformConnectionRequest, Platform, PlatformCredentials, SyncStatus } from '../types/platform'; // src/backend/src/types/platform.ts
import { AnalyticsTypes, MetricPeriod, Insight } from '../types/analytics'; // src/backend/src/types/analytics.ts
import { ContentTypes, Content, ContentCreateInput, ContentNode, ContentFamily, ContentFilter } from '../types/content'; // src/backend/src/types/content.ts
import { PLATFORM_CONFIG } from '../config/constants'; // src/backend/src/config/constants.ts
import { sanitizeInput } from '../utils/validation'; // src/backend/src/utils/validation.ts
import { logger, redactSensitiveInfo } from '../utils/logger'; // src/backend/src/utils/logger.ts
import { NotFoundError, ValidationError, ConflictError, UnauthorizedError, ExternalServiceError, RateLimitError } from '../utils/errors'; // src/backend/src/utils/errors.ts

const creatorService = {
  /**
   * Retrieves a creator by their unique identifier
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to the found creator
   * @throws NotFoundError if creator doesn't exist
   */
  async getCreatorById(creatorId: string): Promise<CreatorTypes.Creator> {
    logger.info({ creatorId }, 'Retrieving creator by ID');

    const creator = await creatorModel.findCreatorById(creatorId);

    if (!creator) {
      logger.warn({ creatorId }, 'Creator not found');
      throw new NotFoundError('Creator not found');
    }

    logger.info({ creatorId: creator.id }, 'Creator retrieved successfully');
    return creator;
  },

  /**
   * Retrieves a creator by their associated user ID
   * @param userId The unique identifier of the user
   * @returns Promise resolving to the found creator
   * @throws NotFoundError if creator doesn't exist
   */
  async getCreatorByUserId(userId: string): Promise<CreatorTypes.Creator> {
    logger.info({ userId }, 'Retrieving creator by user ID');

    const creator = await creatorModel.findCreatorByUserId(userId);

    if (!creator) {
      logger.warn({ userId }, 'Creator not found');
      throw new NotFoundError('Creator not found');
    }

    logger.info({ userId: creator.id }, 'Creator retrieved successfully');
    return creator;
  },

  /**
   * Creates a new creator profile for an existing user
   * @param creatorData The data for the new creator profile
   * @returns Promise resolving to the newly created creator
   */
  async createCreatorProfile(creatorData: CreatorTypes.CreateCreatorInput): Promise<CreatorTypes.Creator> {
    logger.info({ creatorData }, 'Creating new creator profile');

    const creator = await creatorModel.createCreator(creatorData);

    logger.info({ creatorId: creator.id }, 'Creator profile created successfully');
    return creator;
  },

  /**
   * Updates a creator's profile information
   * @param creatorId The unique identifier of the creator to update
   * @param updateData The data to update for the creator
   * @returns Promise resolving to the updated creator
   * @throws NotFoundError if creator doesn't exist
   */
  async updateCreatorProfile(creatorId: string, updateData: CreatorTypes.UpdateCreatorInput): Promise<CreatorTypes.Creator> {
    logger.info({ creatorId, updateData }, 'Updating creator profile');

    const creator = await creatorModel.updateCreator(creatorId, updateData);

    logger.info({ creatorId: creator.id }, 'Creator profile updated successfully');
    return creator;
  },

  /**
   * Permanently deletes a creator profile and associated data
   * @param creatorId The unique identifier of the creator to delete
   * @param userId The unique identifier of the user
   * @returns Promise resolving to true if deletion was successful
   * @throws NotFoundError if creator doesn't exist
   */
  async deleteCreatorProfile(creatorId: string, userId: string): Promise<boolean> {
    logger.info({ creatorId, userId }, 'Deleting creator profile');

    const success = await creatorModel.deleteCreator(creatorId);

    logger.info({ creatorId }, 'Creator profile deleted successfully');
    return success;
  },

  /**
   * Retrieves a creator's formatted profile for public or brand viewing
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to creator profile with public information
   * @throws NotFoundError if profile doesn't exist
   */
  async getCreatorProfile(creatorId: string): Promise<CreatorTypes.CreatorProfile> {
    logger.info({ creatorId }, 'Retrieving creator profile');

    const profile = await creatorModel.getCreatorProfile(creatorId);

    if (!profile) {
      logger.warn({ creatorId }, 'Creator profile not found');
      throw new NotFoundError('Creator profile not found');
    }

    logger.info({ creatorId: profile.creatorId }, 'Creator profile retrieved successfully');
    return profile;
  },

  /**
   * Retrieves a creator with enriched analytics metrics
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to creator with comprehensive metrics
   * @throws NotFoundError if creator doesn't exist
   */
  async getCreatorProfileWithMetrics(creatorId: string): Promise<CreatorTypes.CreatorWithMetrics> {
    logger.info({ creatorId }, 'Retrieving creator with metrics');

    const creatorWithMetrics = await creatorModel.getCreatorWithMetrics(creatorId);

    if (!creatorWithMetrics) {
      logger.warn({ creatorId }, 'Creator with metrics not found');
      throw new NotFoundError('Creator with metrics not found');
    }

    logger.info({ creatorId: creatorWithMetrics.creator.id }, 'Creator with metrics retrieved successfully');
    return creatorWithMetrics;
  },

  /**
   * Retrieves all platforms connected to a creator account
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to array of connected platforms
   * @throws NotFoundError if creator doesn't exist
   */
  async getCreatorPlatforms(creatorId: string): Promise<PlatformTypes.Platform[]> {
    logger.info({ creatorId }, 'Retrieving creator platforms');

    const platforms = await platformModel.listCreatorPlatforms(creatorId);

    logger.info({ creatorId, count: platforms.length }, 'Creator platforms retrieved successfully');
    return platforms;
  },

  /**
   * Connects a social media platform to a creator's account
   * @param connectionRequest The platform connection request
   * @returns Promise resolving to platform connection result
   * @throws NotFoundError if creator doesn't exist
   * @throws ConflictError if platform is already connected
   */
  async connectPlatform(connectionRequest: PlatformTypes.PlatformConnectionRequest): Promise<PlatformTypes.Platform> {
    logger.info({ connectionRequest }, 'Connecting platform to creator account');

    const platform = await platformModel.connectPlatform(connectionRequest);

    logger.info({ platformId: platform.id }, 'Platform connected successfully');
    return platform;
  },

  /**
   * Disconnects a social platform from a creator's account
   * @param creatorId The unique identifier of the creator
   * @param platformId The unique identifier of the platform to disconnect
   * @returns Promise resolving to true if disconnection succeeded
   * @throws NotFoundError if creator or platform doesn't exist
   */
  async disconnectPlatform(creatorId: string, platformId: string): Promise<boolean> {
    logger.info({ creatorId, platformId }, 'Disconnecting platform from creator account');

    const success = await platformModel.disconnectPlatform(platformId);

    logger.info({ creatorId, platformId }, 'Platform disconnected successfully');
    return success;
  },

  /**
   * Generates an OAuth URL for platform connection
   * @param platformType The type of platform to connect
   * @param redirectUri The redirect URI for the OAuth flow
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to OAuth redirect URL
   * @throws NotFoundError if creator doesn't exist
   */
  async getPlatformOAuthUrl(platformType: PlatformTypes.PlatformType, redirectUri: string, creatorId: string): Promise<string> {
    logger.info({ platformType, redirectUri, creatorId }, 'Generating OAuth URL for platform connection');

    const oauthUrl = await platformModel.getPlatformOAuthUrl(platformType, redirectUri, creatorId);

    logger.info({ platformType, oauthUrl }, 'OAuth URL generated successfully');
    return oauthUrl;
  },

  /**
   * Synchronizes content from connected platforms
   * @param creatorId The unique identifier of the creator
   * @param platformId The unique identifier of the platform
   * @param options Options for content synchronization
   * @returns Promise resolving to synchronization results
   * @throws NotFoundError if creator or platform doesn't exist
   */
  async syncPlatformContent(creatorId: string, platformId: string, options: object): Promise<object> {
    logger.info({ creatorId, platformId, options }, 'Synchronizing content from platform');

    const syncResults = await platformModel.syncPlatformContent(creatorId, platformId, options);

    logger.info({ creatorId, platformId, syncResults }, 'Content synchronized successfully');
    return syncResults;
  },

  /**
   * Retrieves a creator's audience demographics information
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to audience demographics data
   * @throws NotFoundError if creator doesn't exist
   */
  async getAudienceDemographics(creatorId: string): Promise<CreatorTypes.AudienceDemographics> {
    logger.info({ creatorId }, 'Retrieving audience demographics');

    const demographics = await creatorModel.getCreatorAudience(creatorId);

    logger.info({ creatorId }, 'Audience demographics retrieved successfully');
    return demographics;
  },

  /**
   * Updates a creator's audience demographics information
   * @param creatorId The unique identifier of the creator
   * @param demographicsData The new demographics data
   * @returns Promise resolving to updated audience data
   * @throws NotFoundError if creator doesn't exist
   */
  async updateAudienceDemographics(creatorId: string, demographicsData: Partial<CreatorTypes.AudienceDemographics>): Promise<CreatorTypes.AudienceDemographics> {
    logger.info({ creatorId, demographicsData }, 'Updating audience demographics');

    const updatedDemographics = await creatorModel.updateAudienceDemographics(creatorId, demographicsData);

    logger.info({ creatorId }, 'Audience demographics updated successfully');
    return updatedDemographics;
  },

  /**
   * Retrieves comprehensive analytics for a creator
   * @param creatorId The unique identifier of the creator
   * @param period The time period for analytics
   * @param startDate The start date for analytics
   * @param endDate The end date for analytics
   * @returns Promise resolving to analytics data for the specified period
   * @throws NotFoundError if creator doesn't exist
   */
  async getCreatorAnalytics(creatorId: string, period: AnalyticsTypes.MetricPeriod, startDate: Date, endDate: Date): Promise<object> {
    logger.info({ creatorId, period, startDate, endDate }, 'Retrieving creator analytics');

    const analyticsData = await analyticsService.getCreatorAnalytics(creatorId, period, startDate, endDate);

    logger.info({ creatorId }, 'Creator analytics retrieved successfully');
    return analyticsData;
  },

  /**
   * Generates data-driven insights for creator content
   * @param creatorId The unique identifier of the creator
   * @param insightTypes The types of insights to generate
   * @returns Promise resolving to generated insights
   * @throws NotFoundError if creator doesn't exist
   */
  async generateCreatorInsights(creatorId: string, insightTypes: string[]): Promise<AnalyticsTypes.Insight[]> {
    logger.info({ creatorId, insightTypes }, 'Generating creator insights');

    const insights = await analyticsService.generateInsights(creatorId, insightTypes);

    logger.info({ creatorId, count: insights.length }, 'Creator insights generated successfully');
    return insights;
  },

  /**
   * Retrieves content items for a creator with optional filtering
   * @param creatorId The unique identifier of the creator
   * @param filters Optional filters to apply to the query
   * @returns Promise resolving to content items matching filters
   * @throws NotFoundError if creator doesn't exist
   */
  async getCreatorContent(creatorId: string, filters: ContentTypes.ContentFilter): Promise<{content: ContentTypes.Content[], total: number}> {
    logger.info({ creatorId, filters }, 'Retrieving creator content');

    const content = await contentModel.listCreatorContent(creatorId, filters);

    logger.info({ creatorId, count: content.content.length }, 'Creator content retrieved successfully');
    return content;
  },

  /**
   * Retrieves all content families for a creator
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to content families with summary information
   * @throws NotFoundError if creator doesn't exist
   */
  async getCreatorContentFamilies(creatorId: string): Promise<ContentTypes.ContentFamily[]> {
    logger.info({ creatorId }, 'Retrieving creator content families');

    const contentFamilies = await contentModel.getRootContent(creatorId);

    logger.info({ creatorId, count: contentFamilies.length }, 'Creator content families retrieved successfully');
    return contentFamilies;
  },

  /**
   * Searches for creators based on various criteria
   * @param filters Search criteria
   * @param page Page number
   * @param pageSize Number of items per page
   * @returns Promise resolving to paginated creator search results
   */
  async searchCreators(filters: CreatorTypes.CreatorSearchFilters, page: number, pageSize: number): Promise<CreatorTypes.CreatorListResult> {
    logger.info({ filters, page, pageSize }, 'Searching creators');

    const searchResults = await creatorModel.searchCreators(filters, page, pageSize);

    logger.info({ count: searchResults.creators.length, total: searchResults.total }, 'Creators searched successfully');
    return searchResults;
  },

  /**
   * Updates a creator's verification status
   * @param creatorId The unique identifier of the creator to update
   * @param status The new verification status
   * @returns Promise resolving to updated creator with new verification status
   * @throws NotFoundError if creator doesn't exist
   */
  async updateCreatorVerification(creatorId: string, status: UserTypes.VerificationStatus): Promise<CreatorTypes.Creator> {
    logger.info({ creatorId, status }, 'Updating creator verification status');

    const updatedCreator = await creatorModel.updateVerificationStatus(creatorId, status);

    logger.info({ creatorId: updatedCreator.id, status }, 'Creator verification status updated successfully');
    return updatedCreator;
  },

  /**
   * Updates a creator's subscription tier and status
   * @param creatorId The unique identifier of the creator to update
   * @param tier The new subscription tier
   * @param status The new subscription status
   * @returns Promise resolving to updated creator with new subscription information
   * @throws NotFoundError if creator doesn't exist
   */
  async updateCreatorSubscription(creatorId: string, tier: UserTypes.SubscriptionTier, status: UserTypes.SubscriptionStatus): Promise<CreatorTypes.Creator> {
    logger.info({ creatorId, tier, status }, 'Updating creator subscription');

    const updatedCreator = await creatorModel.updateSubscription(creatorId, tier, status);

    logger.info({ creatorId: updatedCreator.id, tier, status }, 'Creator subscription updated successfully');
    return updatedCreator;
  },

  /**
   * Checks if a creator's subscription tier allows access to a feature
   * @param creatorId The unique identifier of the creator
   * @param featureKey The feature key to check access for
   * @returns Promise resolving to true if feature is accessible
   * @throws NotFoundError if creator doesn't exist
   */
  async validateSubscriptionFeature(creatorId: string, featureKey: string): Promise<boolean> {
    logger.info({ creatorId, featureKey }, 'Validating subscription feature access');

    const hasAccess = await subscriptionService.checkFeatureAccess(creatorId, 'creator', featureKey);

    logger.info({ creatorId, featureKey, hasAccess }, 'Subscription feature access validated');
    return hasAccess;
  },

  /**
   * Performs complete onboarding process for a new creator
   * @param userId The unique identifier of the user
   * @param profileData The profile data for the new creator
   * @param subscriptionTier The subscription tier for the new creator
   * @returns Promise resolving to fully onboarded creator
   */
  async processOnboarding(userId: string, profileData: CreatorTypes.CreateCreatorInput, subscriptionTier: UserTypes.SubscriptionTier): Promise<CreatorTypes.Creator> {
    logger.info({ userId, profileData, subscriptionTier }, 'Processing creator onboarding');

    const creator = await creatorModel.createCreator(profileData);

    logger.info({ creatorId: creator.id }, 'Creator profile created successfully');
    return creator;
  },

  /**
   * Checks if platform API operations would exceed rate limits
   * @param platformType The type of platform
   * @param operationType The type of operation
   * @returns Promise resolving to rate limit status and remaining quota
   */
  async checkPlatformRateLimit(platformType: PlatformTypes.PlatformType, operationType: string): Promise<object> {
    logger.info({ platformType, operationType }, 'Checking platform rate limit');

    const rateLimitStatus = await platformModel.checkPlatformRateLimit(platformType, operationType);

    logger.info({ platformType, operationType, rateLimitStatus }, 'Platform rate limit checked successfully');
    return rateLimitStatus;
  }
};

export default creatorService;