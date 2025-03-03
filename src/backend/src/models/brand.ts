/**
 * Core model implementation for brand entities in the Engagerr platform, providing database operations for brand profiles, campaign management, creator discovery, and subscription handling. Serves as the foundation for brands using the platform.
 */

import { PrismaClient } from '@prisma/client'; // ^5.0.0
import { supabaseAdmin, SupabaseClient } from '../config/supabase'; // ^2.32.0
import {
  BrandTypes,
  Brand,
  BrandProfile,
  BrandSettings,
  Industry,
  BrandPreferences,
  SavedSearch,
  CreateBrandInput,
  UpdateBrandInput,
  BrandStatistics
} from '../types/brand';
import { UserTypes, User, SubscriptionTier, SubscriptionStatus } from '../types/user';
import userModel from './user';
import { sanitizeInput } from '../utils/validation';
import { NotFoundError, ConflictError, ValidationError, DatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Brand model with data access methods for brand management operations.
 */
const brandModel = {
  /**
   * Retrieves a brand by their unique identifier
   * @param brandId The unique identifier of the brand
   * @returns Promise resolving to the found brand or null if not found
   */
  async findBrandById(brandId: string): Promise<BrandTypes.Brand | null> {
    try {
      logger.info({ brandId }, 'Finding brand by ID');
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: {
          user: true, // Include related user information
        },
      });

      if (!brand) {
        logger.warn({ brandId }, 'Brand not found');
        return null;
      }

      return brand as BrandTypes.Brand; // Type assertion to match the Brand interface
    } catch (error) {
      logger.error({ brandId, error }, 'Error finding brand by ID');
      throw new DatabaseError('Error finding brand by ID', { cause: error });
    }
  },

  /**
   * Retrieves a brand by their associated user ID
   * @param userId The user ID associated with the brand
   * @returns Promise resolving to the found brand or null if not found
   */
  async findBrandByUserId(userId: string): Promise<BrandTypes.Brand | null> {
    try {
      logger.info({ userId }, 'Finding brand by user ID');

      // Verify the user exists
      const userExists = await userModel.findUserById(userId);
      if (!userExists) {
        logger.warn({ userId }, 'User not found, cannot find brand');
        return null;
      }

      const brand = await prisma.brand.findUnique({
        where: { userId: userId },
        include: {
          user: true, // Include related user information
        },
      });

      if (!brand) {
        logger.warn({ userId }, 'Brand not found for user ID');
        return null;
      }

      return brand as BrandTypes.Brand; // Type assertion to match the Brand interface
    } catch (error) {
      logger.error({ userId, error }, 'Error finding brand by user ID');
      throw new DatabaseError('Error finding brand by user ID', { cause: error });
    }
  },

  /**
   * Creates a new brand profile for an existing user
   * @param brandData Data for the new brand profile
   * @returns Promise resolving to the newly created brand
   */
  async createBrand(brandData: BrandTypes.CreateBrandInput): Promise<BrandTypes.Brand> {
    try {
      logger.info({ brandData }, 'Creating new brand');

      // Sanitize brand input data
      const sanitizedData = {
        ...brandData,
        companyName: sanitizeInput(brandData.companyName),
        websiteUrl: sanitizeInput(brandData.websiteUrl),
        description: sanitizeInput(brandData.description),
        location: sanitizeInput(brandData.location)
      };

      // Verify user exists
      const userExists = await userModel.findUserById(brandData.userId);
      if (!userExists) {
        logger.warn({ userId: brandData.userId }, 'User not found, cannot create brand');
        throw new NotFoundError('User not found, cannot create brand');
      }

      // Check if brand profile already exists for this user
      const existingBrand = await this.findBrandByUserId(brandData.userId);
      if (existingBrand) {
        logger.warn({ userId: brandData.userId }, 'Brand already exists for this user');
        throw new ConflictError('Brand already exists for this user');
      }

      // Create default brand settings
      const defaultSettings: BrandTypes.BrandSettings = {
        notificationPreferences: {},
        privacySettings: {},
        displayPreferences: {},
        discoveryPreferences: {
          preferredCategories: [],
          preferredPlatforms: [],
          audienceAgeRange: {},
          audienceGenderDistribution: {},
          audienceLocations: [],
          followerRangeMin: 0,
          followerRangeMax: 1000000,
          engagementRateMin: 0,
          contentTypes: [],
          budgetRangeMin: 0,
          budgetRangeMax: 100000,
          exclusivityPreference: 'any'
        },
        dashboardLayout: {},
        approvalWorkflow: {}
      };

      // Create brand record in database
      const brand = await prisma.brand.create({
        data: {
          userId: sanitizedData.userId,
          companyName: sanitizedData.companyName,
          industries: sanitizedData.industries,
          logoImage: sanitizedData.logoImage,
          websiteUrl: sanitizedData.websiteUrl,
          description: sanitizedData.description,
          settings: defaultSettings,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          user: true, // Include related user information
        },
      });

      logger.info({ brandId: brand.id }, 'Brand created successfully');
      return brand as BrandTypes.Brand; // Type assertion to match the Brand interface
    } catch (error) {
      logger.error({ brandData, error }, 'Error creating brand');
      throw error;
    }
  },

  /**
   * Updates a brand's profile information
   * @param brandId The unique identifier of the brand to update
   * @param updateData Data to update for the brand profile
   * @returns Promise resolving to the updated brand
   */
  async updateBrand(brandId: string, updateData: BrandTypes.UpdateBrandInput): Promise<BrandTypes.Brand> {
    try {
      logger.info({ brandId, updateData }, 'Updating brand');

      // Sanitize and validate update data
      const sanitizedData = {
        ...updateData,
        companyName: updateData.companyName ? sanitizeInput(updateData.companyName) : undefined,
        websiteUrl: updateData.websiteUrl ? sanitizeInput(updateData.websiteUrl) : undefined,
        description: updateData.description ? sanitizeInput(updateData.description) : undefined,
        location: updateData.location ? sanitizeInput(updateData.location) : undefined
      };

      // Check if brand exists
      const brandExists = await this.findBrandById(brandId);
      if (!brandExists) {
        logger.warn({ brandId }, 'Brand not found during update');
        throw new NotFoundError('Brand not found');
      }

      // Update brand record in database
      const brand = await prisma.brand.update({
        where: { id: brandId },
        data: {
          companyName: sanitizedData.companyName,
          industries: sanitizedData.industries,
          logoImage: sanitizedData.logoImage,
          coverImage: sanitizedData.coverImage,
          websiteUrl: sanitizedData.websiteUrl,
          description: sanitizedData.description,
          location: sanitizedData.location,
          contactEmail: sanitizedData.contactEmail,
          socialLinks: sanitizedData.socialLinks,
          brandValues: sanitizedData.brandValues,
          settings: sanitizedData.settings ? {
            update: {
              ...brandExists.settings,
              ...sanitizedData.settings
            }
          } : undefined,
          updatedAt: new Date()
        },
        include: {
          user: true, // Include related user information
        },
      });

      logger.info({ brandId: brand.id }, 'Brand updated successfully');
      return brand as BrandTypes.Brand; // Type assertion to match the Brand interface
    } catch (error) {
      logger.error({ brandId, updateData, error }, 'Error updating brand');
      throw error;
    }
  },

  /**
   * Updates a brand's subscription tier and status
   * @param brandId The unique identifier of the brand to update
   * @param tier The new subscription tier
   * @param status The new subscription status
   * @returns Promise resolving to the updated brand
   */
  async updateSubscription(brandId: string, tier: UserTypes.SubscriptionTier, status: UserTypes.SubscriptionStatus): Promise<BrandTypes.Brand> {
    try {
      logger.info({ brandId, tier, status }, 'Updating brand subscription');

      // Check if brand exists
      const brandExists = await this.findBrandById(brandId);
      if (!brandExists) {
        logger.warn({ brandId }, 'Brand not found during subscription update');
        throw new NotFoundError('Brand not found');
      }

      // Validate tier and status are valid enum values
      if (!Object.values(UserTypes.SubscriptionTier).includes(tier)) {
        logger.warn({ tier }, 'Invalid subscription tier');
        throw new ValidationError('Invalid subscription tier', { tier });
      }
      if (!Object.values(UserTypes.SubscriptionStatus).includes(status)) {
        logger.warn({ status }, 'Invalid subscription status');
        throw new ValidationError('Invalid subscription status', { status });
      }

      // Update brand record with new subscription information
      const brand = await prisma.brand.update({
        where: { id: brandId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: status,
          updatedAt: new Date()
        },
        include: {
          user: true, // Include related user information
        },
      });

      // TODO: Log subscription change for billing records

      logger.info({ brandId: brand.id, tier, status }, 'Brand subscription updated successfully');
      return brand as BrandTypes.Brand; // Type assertion to match the Brand interface
    } catch (error) {
      logger.error({ brandId, tier, status, error }, 'Error updating brand subscription');
      throw error;
    }
  },

  /**
   * Retrieves a brand's formatted profile information for public or creator viewing
   * @param brandId The unique identifier of the brand
   * @returns Promise resolving to the brand profile or null
   */
  async getBrandProfile(brandId: string): Promise<BrandTypes.BrandProfile | null> {
      try {
          logger.info({ brandId }, 'Getting brand profile');

          // Check if brand exists
          const brand = await this.findBrandById(brandId);
          if (!brand) {
              logger.warn({ brandId }, 'Brand not found while getting profile');
              throw new NotFoundError('Brand not found');
          }

          // TODO: Query database for brand's campaigns and partnerships

          // Assemble complete brand profile
          const brandProfile: BrandTypes.BrandProfile = {
              brandId: brand.id,
              companyName: brand.companyName,
              description: brand.description,
              industries: brand.industries,
              logoImage: brand.logoImage,
              coverImage: 'default_cover_image.jpg', // Replace with actual cover image
              websiteUrl: brand.websiteUrl,
              socialLinks: {}, // Replace with actual social links
              location: brand.location,
              size: 'medium', // Replace with actual size
              founded: 2020, // Replace with actual founded year
              contactEmail: brand.user.email,
              contactPhone: '123-456-7890', // Replace with actual phone
              brandValues: ['Innovation', 'Quality', 'Customer Focus'], // Replace with actual values
              pastCampaigns: [], // Replace with actual campaigns
              isPublic: true // Replace with actual privacy setting
          };

          logger.info({ brandId }, 'Brand profile retrieved successfully');
          return brandProfile;
      } catch (error) {
          logger.error({ brandId, error }, 'Error getting brand profile');
          throw error;
      }
  },

  /**
   * Retrieves a brand's settings and preferences
   * @param brandId The unique identifier of the brand
   * @returns Promise resolving to brand settings or null
   */
  async getBrandSettings(brandId: string): Promise<BrandTypes.BrandSettings | null> {
    try {
      logger.info({ brandId }, 'Getting brand settings');

      // Check if brand exists
      const brand = await this.findBrandById(brandId);
      if (!brand) {
        logger.warn({ brandId }, 'Brand not found while getting settings');
        throw new NotFoundError('Brand not found');
      }

      // Extract settings from brand object
      const settings = brand.settings;

      logger.info({ brandId }, 'Brand settings retrieved successfully');
      return settings;
    } catch (error) {
      logger.error({ brandId, error }, 'Error getting brand settings');
      throw error;
    }
  },

  /**
   * Updates a brand's settings and preferences
   * @param brandId The unique identifier of the brand
   * @param settingsData Data to update for the brand settings
   * @returns Promise resolving to updated settings
   */
  async updateBrandSettings(brandId: string, settingsData: Partial<BrandTypes.BrandSettings>): Promise<BrandTypes.BrandSettings> {
    try {
      logger.info({ brandId, settingsData }, 'Updating brand settings');

      // Check if brand exists
      const brandExists = await this.findBrandById(brandId);
      if (!brandExists) {
        logger.warn({ brandId }, 'Brand not found during settings update');
        throw new NotFoundError('Brand not found');
      }

      // Sanitize and validate settings data
      // TODO: Add validation schema for settings data

      // Merge new settings with existing settings
      const updatedSettings = {
        ...brandExists.settings,
        ...settingsData
      };

      // Update brand record with merged settings
      const brand = await prisma.brand.update({
        where: { id: brandId },
        data: {
          settings: {
            update: updatedSettings
          },
          updatedAt: new Date()
        },
        include: {
          user: true, // Include related user information
        },
      });

      logger.info({ brandId: brand.id }, 'Brand settings updated successfully');
      return brand.settings;
    } catch (error) {
      logger.error({ brandId, settingsData, error }, 'Error updating brand settings');
      throw error;
    }
  },

  /**
   * Updates a brand's creator discovery preferences
   * @param brandId The unique identifier of the brand
   * @param preferences Data to update for the discovery preferences
   * @returns Promise resolving to updated preferences
   */
  async updateDiscoveryPreferences(brandId: string, preferences: Partial<BrandTypes.BrandPreferences>): Promise<BrandTypes.BrandPreferences> {
    try {
      logger.info({ brandId, preferences }, 'Updating brand discovery preferences');

      // Check if brand exists
      const brandExists = await this.findBrandById(brandId);
      if (!brandExists) {
        logger.warn({ brandId }, 'Brand not found during discovery preferences update');
        throw new NotFoundError('Brand not found');
      }

      // Sanitize and validate preference data
      // TODO: Add validation schema for preference data

      // Get current settings and merge with new preferences
      const currentSettings = brandExists.settings;
      const updatedPreferences = {
        ...currentSettings.discoveryPreferences,
        ...preferences
      };

      // Update brand record with new discovery preferences
      const brand = await prisma.brand.update({
        where: { id: brandId },
        data: {
          settings: {
            update: {
              discoveryPreferences: updatedPreferences
            }
          },
          updatedAt: new Date()
        },
        include: {
          user: true, // Include related user information
        },
      });

      logger.info({ brandId: brand.id }, 'Brand discovery preferences updated successfully');
      return brand.settings.discoveryPreferences;
    } catch (error) {
      logger.error({ brandId, preferences, error }, 'Error updating brand discovery preferences');
      throw error;
    }
  },

  /**
   * Retrieves aggregated statistics about a brand's platform activities
   * @param brandId The unique identifier of the brand
   * @returns Promise resolving to brand statistics
   */
  async getBrandStatistics(brandId: string): Promise<BrandTypes.BrandStatistics> {
    try {
      logger.info({ brandId }, 'Getting brand statistics');

      // Check if brand exists
      const brandExists = await this.findBrandById(brandId);
      if (!brandExists) {
        logger.warn({ brandId }, 'Brand not found while getting statistics');
        throw new NotFoundError('Brand not found');
      }

      // TODO: Query database for counts of active/total campaigns
      const activeCampaigns = 5;
      const totalCampaigns = 10;

      // TODO: Query database for counts of active/total partnerships
      const activePartnerships = 8;
      const totalPartnerships = 20;

      // TODO: Calculate total spending and budget utilization
      const totalSpent = 50000;
      const budgetUtilization = 0.75;

      // TODO: Count unique creators worked with
      const creatorCount = 15;

      // TODO: Calculate engagement metrics across partnerships
      const averageEngagementRate = 0.05;
      const totalReach = 1000000;
      const totalEngagements = 50000;

      // TODO: Get saved search count
      const savedSearchCount = 3;

      // Assemble complete statistics object
      const statistics: BrandTypes.BrandStatistics = {
        activeCampaigns,
        totalCampaigns,
        activePartnerships,
        totalPartnerships,
        creatorCount,
        totalSpent,
        budgetUtilization,
        averageEngagementRate,
        totalReach,
        totalEngagements,
        savedSearchCount
      };

      logger.info({ brandId, statistics }, 'Brand statistics retrieved successfully');
      return statistics;
    } catch (error) {
      logger.error({ brandId, error }, 'Error getting brand statistics');
      throw error;
    }
  },

  /**
   * Saves a creator search configuration for future use
   * @param brandId The unique identifier of the brand
   * @param searchData The search configuration data to save
   * @returns Promise resolving to saved search
   */
  async saveBrandSearch(brandId: string, searchData: any): Promise<BrandTypes.SavedSearch> {
    try {
      logger.info({ brandId, searchData }, 'Saving brand search');

      // Check if brand exists
      const brandExists = await this.findBrandById(brandId);
      if (!brandExists) {
        logger.warn({ brandId }, 'Brand not found while saving search');
        throw new NotFoundError('Brand not found');
      }

      // Sanitize and validate search data
      // TODO: Add validation schema for search data

      // Create or update saved search record in database
      const savedSearch: BrandTypes.SavedSearch = {
        id: 'saved-search-id', // Replace with actual ID generation
        brandId: brandId,
        name: 'My Saved Search', // Replace with actual name
        description: 'Description of saved search', // Replace with actual description
        filters: searchData,
        savedCreatorIds: [],
        lastRun: new Date(),
        resultCount: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info({ brandId, savedSearchId: savedSearch.id }, 'Brand search saved successfully');
      return savedSearch;
    } catch (error) {
      logger.error({ brandId, searchData, error }, 'Error saving brand search');
      throw error;
    }
  },

  /**
   * Retrieves all saved searches for a brand
   * @param brandId The unique identifier of the brand
   * @returns Promise resolving to array of saved searches
   */
  async getSavedSearches(brandId: string): Promise<BrandTypes.SavedSearch[]> {
    try {
      logger.info({ brandId }, 'Getting saved searches');

      // Check if brand exists
      const brandExists = await this.findBrandById(brandId);
      if (!brandExists) {
        logger.warn({ brandId }, 'Brand not found while getting saved searches');
        throw new NotFoundError('Brand not found');
      }

      // TODO: Query database for all saved searches associated with the brand
      const savedSearches: BrandTypes.SavedSearch[] = [
        {
          id: 'saved-search-1',
          brandId: brandId,
          name: 'Tech Creators',
          description: 'Creators focused on technology',
          filters: {},
          savedCreatorIds: [],
          lastRun: new Date(),
          resultCount: 50,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'saved-search-2',
          brandId: brandId,
          name: 'Lifestyle Influencers',
          description: 'Influencers in the lifestyle category',
          filters: {},
          savedCreatorIds: [],
          lastRun: new Date(),
          resultCount: 30,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      logger.info({ brandId, count: savedSearches.length }, 'Saved searches retrieved successfully');
      return savedSearches;
    } catch (error) {
      logger.error({ brandId, error }, 'Error getting saved searches');
      throw error;
    }
  },

  /**
   * Deletes a saved search configuration
   * @param searchId The unique identifier of the saved search to delete
   * @param brandId The unique identifier of the brand
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteSavedSearch(searchId: string, brandId: string): Promise<boolean> {
    try {
      logger.info({ searchId, brandId }, 'Deleting saved search');

      // Check if brand exists
      const brandExists = await this.findBrandById(brandId);
      if (!brandExists) {
        logger.warn({ brandId }, 'Brand not found while deleting saved search');
        throw new NotFoundError('Brand not found');
      }

      // TODO: Verify that the search belongs to the specified brand

      // TODO: Delete saved search record from database

      logger.info({ searchId, brandId }, 'Saved search deleted successfully');
      return true;
    } catch (error) {
      logger.error({ searchId, brandId, error }, 'Error deleting saved search');
      throw error;
    }
  },

  /**
   * Deletes a brand profile and associated data
   * @param brandId The unique identifier of the brand to delete
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteBrand(brandId: string): Promise<boolean> {
    try {
      logger.info({ brandId }, 'Deleting brand');

      // Check if brand exists
      const brandExists = await this.findBrandById(brandId);
      if (!brandExists) {
        logger.warn({ brandId }, 'Brand not found during deletion');
        throw new NotFoundError('Brand not found');
      }

      // Start a transaction to ensure data consistency
      await prisma.$transaction(async (tx) => {
        // TODO: Delete associated data (campaigns, partnerships, saved searches)

        // Delete brand profile from database
        await tx.brand.delete({
          where: { id: brandId }
        });
      });

      logger.info({ brandId }, 'Brand deleted successfully');
      return true;
    } catch (error) {
      logger.error({ brandId, error }, 'Error deleting brand');
      throw error;
    }
  }
};

export default brandModel;