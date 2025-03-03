/**
 * Core model implementation for creator entities in the Engagerr platform, providing database operations for creator profiles, analytics, relationship management, and subscription handling. Serves as the foundation for content creators using the platform.
 */

import { PrismaClient } from '@prisma/client'; // ^5.0.0
import { supabaseAdmin, SupabaseClient } from '../config/supabase'; // ^2.32.0
import {
  CreatorTypes,
  Creator,
  CreatorProfile,
  CreatorSettings,
  Category,
  AudienceDemographics,
  CreatorWithMetrics,
  CreateCreatorInput,
  UpdateCreatorInput
} from '../types/creator';
import {
  UserTypes,
  User,
  SubscriptionTier,
  SubscriptionStatus,
  VerificationStatus
} from '../types/user';
import { PlatformTypes, Platform } from '../types/platform';
import userModel from './user';
import { sanitizeInput } from '../utils/validation';
import { NotFoundError, ConflictError, ValidationError, DatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Creator model with data access methods for creator management, authentication, and profile operations.
 */
const creatorModel = {
  /**
   * Retrieves a creator by their unique identifier
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to the found creator or null if not found
   */
  async findCreatorById(creatorId: string): Promise<CreatorTypes.Creator | null> {
    try {
      logger.info({ creatorId }, 'Finding creator by ID');
      const creator = await prisma.creator.findUnique({
        where: { id: creatorId },
        include: {
          user: true, // Include related user information
          platforms: true // Include connected platforms
        }
      });

      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found');
        return null;
      }

      return creator;
    } catch (error) {
      logger.error({ creatorId, error }, 'Error finding creator by ID');
      throw new DatabaseError('Error finding creator', { cause: error });
    }
  },

  /**
   * Retrieves a creator by their associated user ID
   * @param userId The unique identifier of the user
   * @returns Promise resolving to the found creator or null if not found
   */
  async findCreatorByUserId(userId: string): Promise<CreatorTypes.Creator | null> {
    try {
      logger.info({ userId }, 'Finding creator by user ID');

      // Verify the user exists
      const user = await userModel.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found');
        return null;
      }

      const creator = await prisma.creator.findUnique({
        where: { userId: userId },
        include: {
          user: true, // Include related user information
          platforms: true // Include connected platforms
        }
      });

      if (!creator) {
        logger.warn({ userId }, 'Creator not found for user ID');
        return null;
      }

      return creator;
    } catch (error) {
      logger.error({ userId, error }, 'Error finding creator by user ID');
      throw new DatabaseError('Error finding creator by user ID', { cause: error });
    }
  },

  /**
   * Creates a new creator profile for an existing user
   * @param creatorData The data for the new creator profile
   * @returns Promise resolving to the newly created creator
   */
  async createCreator(creatorData: CreatorTypes.CreateCreatorInput): Promise<CreatorTypes.Creator> {
    try {
      logger.info({ creatorData }, 'Creating new creator');

      // Sanitize input data
      const sanitizedData = {
        ...creatorData,
        bio: sanitizeInput(creatorData.bio),
        categories: creatorData.categories.map(category => sanitizeInput(category))
      };

      // Verify the user exists
      const user = await userModel.findUserById(sanitizedData.userId);
      if (!user) {
        logger.warn({ userId: sanitizedData.userId }, 'User not found');
        throw new NotFoundError('User not found');
      }

      // Check if a creator profile already exists for this user
      const existingCreator = await this.findCreatorByUserId(sanitizedData.userId);
      if (existingCreator) {
        logger.warn({ userId: sanitizedData.userId }, 'Creator profile already exists for this user');
        throw new ConflictError('Creator profile already exists for this user');
      }

      // Create creator record in database
      const creator = await prisma.creator.create({
        data: {
          userId: sanitizedData.userId,
          bio: sanitizedData.bio,
          categories: sanitizedData.categories,
          profileImage: sanitizedData.profileImage || '',
          verificationStatus: UserTypes.VerificationStatus.UNVERIFIED,
          subscriptionTier: UserTypes.SubscriptionTier.FREE,
          subscriptionStatus: UserTypes.SubscriptionStatus.ACTIVE,
          settings: {
            notificationPreferences: {
              email: true,
              push: true,
              inApp: true,
              partnerRequests: true,
              analytics: true,
              contentAlerts: true
            },
            privacySettings: {
              profileVisibility: 'public',
              showFinancials: false,
              showPartnerships: true,
              allowDiscovery: true
            },
            displayPreferences: {
              defaultDashboard: 'overview',
              theme: 'light',
              defaultAnalyticsPeriod: '30d'
            },
            partnershipPreferences: {
              availableForPartnerships: true,
              minimumBudget: 500,
              preferredCategories: [],
              excludedCategories: []
            },
            dashboardLayout: {
              widgets: [],
              widgetPositions: {}
            },
            mediaKitSettings: {
              defaultTemplate: 'professional',
              autoUpdateStats: true,
              includedSections: []
            }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          user: true, // Include related user information
          platforms: true // Include connected platforms
        }
      });

      logger.info({ creatorId: creator.id }, 'Creator created successfully');
      return creator;
    } catch (error) {
      logger.error({ creatorData, error }, 'Error creating creator');
      throw new DatabaseError('Error creating creator', { cause: error });
    }
  },

  /**
   * Updates a creator's profile information
   * @param creatorId The unique identifier of the creator to update
   * @param updateData The data to update for the creator
   * @returns Promise resolving to the updated creator
   */
  async updateCreator(creatorId: string, updateData: CreatorTypes.UpdateCreatorInput): Promise<CreatorTypes.Creator> {
    try {
      logger.info({ creatorId, updateData }, 'Updating creator');

      // Sanitize and validate update data
      const sanitizedData: any = {};
      if (updateData.bio) sanitizedData.bio = sanitizeInput(updateData.bio);
      if (updateData.categories) sanitizedData.categories = updateData.categories.map(category => sanitizeInput(category));
      if (updateData.profileImage) sanitizedData.profileImage = sanitizeInput(updateData.profileImage);

      // Check if creator exists
      const creator = await this.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found during update');
        throw new NotFoundError('Creator not found');
      }

      const updatedCreator = await prisma.creator.update({
        where: { id: creatorId },
        data: {
          ...sanitizedData,
          updatedAt: new Date()
        },
        include: {
          user: true, // Include related user information
          platforms: true // Include connected platforms
        }
      });

      logger.info({ creatorId: updatedCreator.id }, 'Creator updated successfully');
      return updatedCreator;
    } catch (error) {
      logger.error({ creatorId, updateData, error }, 'Error updating creator');
      throw new DatabaseError('Error updating creator', { cause: error });
    }
  },

  /**
   * Updates a creator's verification status
   * @param creatorId The unique identifier of the creator to update
   * @param verificationStatus The new verification status
   * @returns Promise resolving to the updated creator
   */
  async updateVerificationStatus(creatorId: string, verificationStatus: UserTypes.VerificationStatus): Promise<CreatorTypes.Creator> {
    try {
      logger.info({ creatorId, verificationStatus }, 'Updating creator verification status');

      // Check if creator exists
      const creator = await this.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found during verification status update');
        throw new NotFoundError('Creator not found');
      }

      // Validate that the provided status is a valid VerificationStatus
      if (!Object.values(UserTypes.VerificationStatus).includes(verificationStatus)) {
        logger.warn({ verificationStatus }, 'Invalid verification status');
        throw new ValidationError('Invalid verification status');
      }

      const updatedCreator = await prisma.creator.update({
        where: { id: creatorId },
        data: {
          verificationStatus: verificationStatus,
          updatedAt: new Date()
        },
        include: {
          user: true, // Include related user information
          platforms: true // Include connected platforms
        }
      });

      logger.info({ creatorId: updatedCreator.id, verificationStatus }, 'Creator verification status updated successfully');
      return updatedCreator;
    } catch (error) {
      logger.error({ creatorId, verificationStatus, error }, 'Error updating creator verification status');
      throw new DatabaseError('Error updating creator verification status', { cause: error });
    }
  },

  /**
   * Updates a creator's subscription tier and status
   * @param creatorId The unique identifier of the creator to update
   * @param tier The new subscription tier
   * @param status The new subscription status
   * @returns Promise resolving to the updated creator
   */
  async updateSubscription(creatorId: string, tier: UserTypes.SubscriptionTier, status: UserTypes.SubscriptionStatus): Promise<CreatorTypes.Creator> {
    try {
      logger.info({ creatorId, tier, status }, 'Updating creator subscription');

      // Check if creator exists
      const creator = await this.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found during subscription update');
        throw new NotFoundError('Creator not found');
      }

      // Validate tier and status are valid enum values
      if (!Object.values(UserTypes.SubscriptionTier).includes(tier)) {
        logger.warn({ tier }, 'Invalid subscription tier');
        throw new ValidationError('Invalid subscription tier');
      }
      if (!Object.values(UserTypes.SubscriptionStatus).includes(status)) {
        logger.warn({ status }, 'Invalid subscription status');
        throw new ValidationError('Invalid subscription status');
      }

      const updatedCreator = await prisma.creator.update({
        where: { id: creatorId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: status,
          updatedAt: new Date()
        },
        include: {
          user: true, // Include related user information
          platforms: true // Include connected platforms
        }
      });

      logger.info({ creatorId: updatedCreator.id, tier, status }, 'Creator subscription updated successfully');
      return updatedCreator;
    } catch (error) {
      logger.error({ creatorId, tier, status, error }, 'Error updating creator subscription');
      throw new DatabaseError('Error updating creator subscription', { cause: error });
    }
  },

  /**
   * Retrieves a creator's formatted profile information for public or brand viewing
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to the creator profile or null
   */
  async getCreatorProfile(creatorId: string): Promise<CreatorTypes.CreatorProfile | null> {
    try {
      logger.info({ creatorId }, 'Getting creator profile');

      // Check if creator exists
      const creator = await this.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found while getting profile');
        throw new NotFoundError('Creator not found');
      }

      // TODO: Query database for creator's platforms, metrics, and portfolio
      // TODO: Assemble complete creator profile with aggregated statistics
      // TODO: Format profile according to CreatorProfile interface

      const profile: CreatorTypes.CreatorProfile = {
        creatorId: creator.id,
        fullName: creator.user.fullName,
        bio: creator.bio,
        categories: creator.categories,
        profileImage: creator.profileImage,
        coverImage: '', // TODO: Implement cover image
        verificationStatus: creator.verificationStatus,
        platformSummary: [], // TODO: Implement platform summary
        totalFollowers: 0, // TODO: Implement total followers
        engagementRate: 0, // TODO: Implement engagement rate
        contentCount: 0, // TODO: Implement content count
        location: '', // TODO: Implement location
        languages: [], // TODO: Implement languages
        contactEmail: creator.user.email,
        website: '', // TODO: Implement website
        featuredContent: [], // TODO: Implement featured content
        partnership: [], // TODO: Implement partnership
        isPublic: true // TODO: Implement privacy settings
      };

      logger.info({ creatorId, profile }, 'Creator profile retrieved successfully');
      return profile;
    } catch (error) {
      logger.error({ creatorId, error }, 'Error getting creator profile');
      throw new DatabaseError('Error getting creator profile', { cause: error });
    }
  },

  /**
   * Retrieves a creator with enriched analytics metrics
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to creator with metrics or null
   */
  async getCreatorWithMetrics(creatorId: string): Promise<CreatorTypes.CreatorWithMetrics | null> {
    try {
      logger.info({ creatorId }, 'Getting creator with metrics');

      // Check if creator exists
      const creator = await this.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found while getting metrics');
        throw new NotFoundError('Creator not found');
      }

      // TODO: Query database for creator's content, platforms, and analytics
      // TODO: Calculate aggregate metrics (total followers, engagement rate, etc.)
      // TODO: Get featured content samples from various platforms
      // TODO: Assemble CreatorWithMetrics object with all metric data

      const creatorWithMetrics: CreatorTypes.CreatorWithMetrics = {
        creator: creator,
        totalFollowers: 0, // TODO: Implement total followers
        engagementRate: 0, // TODO: Implement engagement rate
        totalContent: 0, // TODO: Implement total content
        contentFamilies: 0, // TODO: Implement content families
        averageContentValue: 0, // TODO: Implement average content value
        topPlatforms: [], // TODO: Implement top platforms
        contentGrowth: 0, // TODO: Implement content growth
        followerGrowth: 0, // TODO: Implement follower growth
        audienceDemographics: null, // TODO: Implement audience demographics
        featuredContent: [], // TODO: Implement featured content
      };

      logger.info({ creatorId, creatorWithMetrics }, 'Creator with metrics retrieved successfully');
      return creatorWithMetrics;
    } catch (error) {
      logger.error({ creatorId, error }, 'Error getting creator with metrics');
      throw new DatabaseError('Error getting creator with metrics', { cause: error });
    }
  },

  /**
   * Retrieves a creator's audience demographics information
   * @param creatorId The unique identifier of the creator
   * @returns Promise resolving to audience data or null
   */
  async getCreatorAudience(creatorId: string): Promise<CreatorTypes.AudienceDemographics | null> {
    try {
      logger.info({ creatorId }, 'Getting creator audience demographics');

      // Check if creator exists
      const creator = await this.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found while getting audience demographics');
        throw new NotFoundError('Creator not found');
      }

      // TODO: Query database for creator's audience demographics
      const audienceDemographics: CreatorTypes.AudienceDemographics = {
        creatorId: creatorId,
        ageRanges: { '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 },
        genderDistribution: { male: 0, female: 0, nonBinary: 0, undisclosed: 0 },
        topLocations: {},
        interests: {},
        devices: { mobile: 0, desktop: 0, tablet: 0, other: 0 },
        languages: {},
        platformBreakdown: {},
        lastUpdated: new Date()
      };

      logger.info({ creatorId, audienceDemographics }, 'Creator audience demographics retrieved successfully');
      return audienceDemographics;
    } catch (error) {
      logger.error({ creatorId, error }, 'Error getting creator audience demographics');
      throw new DatabaseError('Error getting creator audience demographics', { cause: error });
    }
  },

  /**
   * Updates a creator's audience demographics information
   * @param creatorId The unique identifier of the creator
   * @param demographicsData The new demographics data
   * @returns Promise resolving to updated audience data
   */
  async updateAudienceDemographics(creatorId: string, demographicsData: Partial<CreatorTypes.AudienceDemographics>): Promise<CreatorTypes.AudienceDemographics> {
    try {
      logger.info({ creatorId, demographicsData }, 'Updating creator audience demographics');

      // Check if creator exists
      const creator = await this.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found while updating audience demographics');
        throw new NotFoundError('Creator not found');
      }

      // TODO: Sanitize and validate demographics data

      // TODO: Update or create demographics record in database using upsert
      const audienceDemographics: CreatorTypes.AudienceDemographics = {
        creatorId: creatorId,
        ageRanges: { '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 },
        genderDistribution: { male: 0, female: 0, nonBinary: 0, undisclosed: 0 },
        topLocations: {},
        interests: {},
        devices: { mobile: 0, desktop: 0, tablet: 0, other: 0 },
        languages: {},
        platformBreakdown: {},
        lastUpdated: new Date()
      };

      logger.info({ creatorId, audienceDemographics }, 'Creator audience demographics updated successfully');
      return audienceDemographics;
    } catch (error) {
      logger.error({ creatorId, demographicsData, error }, 'Error updating creator audience demographics');
      throw new DatabaseError('Error updating creator audience demographics', { cause: error });
    }
  },

  /**
   * Searches for creators based on various criteria
   * @param filters Search criteria
   * @param page Page number
   * @param pageSize Number of items per page
   * @returns Promise resolving to paginated creator search results
   */
  async searchCreators(filters: CreatorTypes.CreatorSearchFilters, page: number, pageSize: number): Promise<CreatorTypes.CreatorListResult> {
    try {
      logger.info({ filters, page, pageSize }, 'Searching creators');

      // TODO: Sanitize and validate filter parameters
      // TODO: Build database query based on filter criteria
      // TODO: Apply pagination parameters (page, pageSize)
      // TODO: Add sorting based on specified field and direction
      // TODO: Execute query to get matching creators
      // TODO: Calculate total count for pagination
      // TODO: Enrich each creator with metrics and platform data
      // TODO: Calculate facets for filter options

      const creators: CreatorTypes.CreatorWithMetrics[] = [];
      const total = 0;
      const hasMore = false;
      const facets = {};

      const result: CreatorTypes.CreatorListResult = {
        creators: creators,
        total: total,
        page: page,
        pageSize: pageSize,
        hasMore: hasMore,
        facets: facets
      };

      logger.info({ result }, 'Creators searched successfully');
      return result;
    } catch (error) {
      logger.error({ filters, page, pageSize, error }, 'Error searching creators');
      throw new DatabaseError('Error searching creators', { cause: error });
    }
  },

  /**
   * Deletes a creator profile and associated data
   * @param creatorId The unique identifier of the creator to delete
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteCreator(creatorId: string): Promise<boolean> {
    try {
      logger.info({ creatorId }, 'Deleting creator');

      // Check if creator exists
      const creator = await this.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found during deletion');
        throw new NotFoundError('Creator not found');
      }

      // Start a transaction to ensure data consistency
      await prisma.$transaction(async (tx) => {
        // TODO: Delete associated data (platforms, content, analytics)

        // Delete creator profile from database
        await tx.creator.delete({
          where: { id: creatorId }
        });
      });

      logger.info({ creatorId }, 'Creator deleted successfully');
      return true;
    } catch (error) {
      logger.error({ creatorId, error }, 'Error deleting creator');
      throw new DatabaseError('Error deleting creator', { cause: error });
    }
  }
};

export default creatorModel;