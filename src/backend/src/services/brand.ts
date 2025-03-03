/**
 * Service layer implementation for brand functionality in the Engagerr platform. Handles business logic for brand accounts, discovery preferences, campaign management, and partnerships with creators.
 */

import z from 'zod'; // ^3.22.0 Runtime validation
import sharp from 'sharp'; // ^0.32.5 Image processing for brand logos and images
import {
  brandModel,
} from '../models/brand';
import userService from './user';
import discoveryService from './discovery';
import {
  BrandTypes,
  Brand,
  BrandProfile,
  BrandSettings,
  BrandPreferences,
  BrandStatistics,
  CreateBrandInput,
  UpdateBrandInput,
} from '../types/brand';
import {
  UserTypes,
  SubscriptionTier,
  SubscriptionStatus,
  UserRole,
} from '../types/user';
import { supabaseStorage } from '../config/supabase';
import { sanitizeInput, validateInput } from '../utils/validation';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Service object encapsulating brand-related business logic.
 */
const brandService = {
  /**
   * Retrieves a brand by their unique identifier
   * @param brandId The unique identifier of the brand
   * @returns Promise resolving to the found brand
   * @throws NotFoundError if brand doesn't exist
   */
  async getBrandById(brandId: string): Promise<BrandTypes.Brand> {
    logger.info({ brandId }, 'Retrieving brand by ID');

    const brand = await brandModel.findBrandById(brandId);

    if (!brand) {
      logger.warn({ brandId }, 'Brand not found');
      throw new NotFoundError('Brand not found', 'Brand', brandId);
    }

    return brand;
  },

  /**
   * Retrieves a brand by their associated user ID
   * @param userId The user ID associated with the brand
   * @returns Promise resolving to the found brand
   * @throws NotFoundError if brand doesn't exist
   */
  async getBrandByUserId(userId: string): Promise<BrandTypes.Brand> {
    logger.info({ userId }, 'Retrieving brand by user ID');

    const brand = await brandModel.findBrandByUserId(userId);

    if (!brand) {
      logger.warn({ userId }, 'Brand not found');
      throw new NotFoundError('Brand not found', 'User', userId);
    }

    return brand;
  },

  /**
   * Creates a new brand profile for an existing user
   * @param brandData Data for the new brand profile
   * @returns Promise resolving to the newly created brand
   * @throws ValidationError if input data is invalid
   * @throws ConflictError if a brand already exists for the user
   * @throws NotFoundError if the user does not exist
   */
  async createBrand(brandData: BrandTypes.CreateBrandInput): Promise<BrandTypes.Brand> {
    logger.info({ brandData }, 'Creating new brand');

    // Validate input data
    // TODO: Implement input validation using Zod schema
    // const validatedData = await validateInput(brandData, createBrandSchema);

    // Verify user exists
    await userService.getUserById(brandData.userId);

    // Check if brand profile already exists for this user
    try {
      await this.getBrandByUserId(brandData.userId);
      throw new ConflictError('Brand already exists for this user');
    } catch (error: any) {
      if (!(error instanceof NotFoundError)) {
        throw error; // Re-throw if it's not a NotFoundError
      }
    }

    const brand = await brandModel.createBrand(brandData);

    return brand;
  },

  /**
   * Updates a brand's profile information
   * @param brandId The unique identifier of the brand to update
   * @param updateData Data to update for the brand profile
   * @returns Promise resolving to the updated brand
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   */
  async updateBrand(brandId: string, updateData: BrandTypes.UpdateBrandInput): Promise<BrandTypes.Brand> {
    logger.info({ brandId, updateData }, 'Updating brand');

    // Validate brandId and updateData
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    // TODO: Implement input validation using Zod schema
    // const validatedData = await validateInput(updateData, updateBrandSchema);

    // Get existing brand to ensure it exists
    await this.getBrandById(brandId);

    const brand = await brandModel.updateBrand(brandId, updateData);

    return brand;
  },

  /**
   * Retrieves a brand's public profile information
   * @param brandId The unique identifier of the brand
   * @returns Promise resolving to the brand's public profile
   * @throws NotFoundError if the brand does not exist
   */
  async getBrandProfile(brandId: string): Promise<BrandTypes.BrandProfile> {
    logger.info({ brandId }, 'Retrieving brand profile');

    // Validate brandId parameter
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    const brandProfile = await brandModel.getBrandProfile(brandId);

    if (!brandProfile) {
      throw new NotFoundError('Brand profile not found', 'Brand', brandId);
    }

    return brandProfile;
  },

  /**
   * Uploads and processes a brand's logo image
   * @param brandId The unique identifier of the brand
   * @param imageBuffer The image data as a Buffer
   * @param filename The original filename of the image
   * @returns Promise resolving to the public URL of the uploaded logo
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   */
  async uploadBrandLogo(brandId: string, imageBuffer: Buffer, filename: string): Promise<string> {
    logger.info({ brandId, filename }, 'Uploading brand logo');

    // Validate brandId and image data
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    if (!imageBuffer) {
      throw new ValidationError('Image buffer is required');
    }

    if (!filename) {
      throw new ValidationError('Filename is required');
    }

    // Get brand to ensure it exists
    await this.getBrandById(brandId);

    // Process image using sharp (resize, optimize)
    const processedImageBuffer = await sharp(imageBuffer)
      .resize(200, 200)
      .toFormat('jpeg')
      .jpeg({ quality: 80 })
      .toBuffer();

    // Generate unique filename based on brandId and timestamp
    const timestamp = Date.now();
    const imagePath = `brand-logos/${brandId}/${timestamp}-${filename}`;

    // Upload processed image to Supabase Storage
    const { data, error } = await supabaseStorage.uploadFile(imagePath, processedImageBuffer, { contentType: 'image/jpeg' });

    if (error) {
      logger.error({ brandId, filename, error }, 'Error uploading brand logo to Supabase Storage');
      throw new Error('Error uploading brand logo to Supabase Storage');
    }

    // Get public URL for the uploaded image
    const publicUrl = supabaseStorage.getPublicUrl(data.path);

    // Update brand profile with new logo URL
    await brandModel.updateBrand(brandId, { logoImage: publicUrl });

    return publicUrl;
  },

  /**
   * Retrieves a brand's settings and preferences
   * @param brandId The unique identifier of the brand
   * @returns Promise resolving to brand settings
   * @throws NotFoundError if the brand does not exist
   */
  async getBrandSettings(brandId: string): Promise<BrandTypes.BrandSettings> {
    logger.info({ brandId }, 'Retrieving brand settings');

    // Validate brandId parameter
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    const brand = await this.getBrandById(brandId);

    return brand.settings;
  },

  /**
   * Updates a brand's settings and preferences
   * @param brandId The unique identifier of the brand
   * @param settingsData Data to update for the brand settings
   * @returns Promise resolving to updated settings
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   */
  async updateBrandSettings(brandId: string, settingsData: Partial<BrandTypes.BrandSettings>): Promise<BrandTypes.BrandSettings> {
    logger.info({ brandId, settingsData }, 'Updating brand settings');

    // Validate brandId and settings data
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    // TODO: Add validation schema for settings data
    // const validatedData = await validateInput(settingsData, brandSettingsSchema);

    // Get brand to ensure it exists
    await this.getBrandById(brandId);

    const updatedSettings = await brandModel.updateBrandSettings(brandId, settingsData);

    return updatedSettings;
  },

  /**
   * Updates a brand's creator discovery preferences
   * @param brandId The unique identifier of the brand
   * @param preferences Data to update for the discovery preferences
   * @returns Promise resolving to updated preferences
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   */
  async updateDiscoveryPreferences(brandId: string, preferences: Partial<BrandTypes.BrandPreferences>): Promise<BrandTypes.BrandPreferences> {
    logger.info({ brandId, preferences }, 'Updating brand discovery preferences');

    // Validate brandId and preferences data
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    // TODO: Add validation schema for preference data
    // const validatedData = await validateInput(preferences, brandPreferencesSchema);

    // Get brand to ensure it exists
    await this.getBrandById(brandId);

    const updatedPreferences = await brandModel.updateDiscoveryPreferences(brandId, preferences);

    return updatedPreferences;
  },

  /**
   * Searches for creators based on brand preferences and criteria
   * @param brandId The unique identifier of the brand
   * @param searchParams Search parameters
   * @returns Search results with pagination metadata
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   */
  async discoverCreators(brandId: string, searchParams: any): Promise<{ creators: Array<object>; total: number; page: number; pageSize: number }> {
    logger.info({ brandId, searchParams }, 'Discovering creators');

    // Validate brandId and search parameters
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    // TODO: Add validation schema for search parameters
    // const validatedData = await validateInput(searchParams, creatorSearchSchema);

    // Get brand to ensure it exists and retrieve preferences
    await this.getBrandById(brandId);

    // Merge explicit search parameters with brand preferences
    // TODO: Implement merging logic

    // Call discoveryService.searchCreators with combined criteria
    const searchResults = await discoveryService.searchCreators(searchParams, { page: 1, pageSize: 20 }, brandId);

    return searchResults;
  },

  /**
   * Gets AI-recommended creators for a brand based on their profile and preferences
   * @param brandId The unique identifier of the brand
   * @param limit The number of recommended creators to return
   * @param options Additional options
   * @returns Recommended creators with match explanations
   * @throws ValidationError if input data is invalid
   */
  async getRecommendedCreators(brandId: string, limit: number, options: any): Promise<{ creators: Array<object>; matchExplanations?: Array<object> }> {
    logger.info({ brandId, limit, options }, 'Getting recommended creators');

    // Validate brandId and limit parameters
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    if (!limit || typeof limit !== 'number' || limit <= 0) {
      throw new ValidationError('Limit must be a positive number');
    }

    // Call discoveryService.getRecommendedCreatorsForBrand
    const recommendations = await discoveryService.getRecommendedCreatorsForBrand(brandId, limit, options.includeExplanations);

    return recommendations;
  },

  /**
   * Saves a creator search configuration for future use
   * @param brandId The unique identifier of the brand
   * @param name The name of the saved search
   * @param searchCriteria The search criteria to save
   * @returns ID of the saved search
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   */
  async saveSearch(brandId: string, name: string, searchCriteria: any): Promise<{ id: string }> {
    logger.info({ brandId, name, searchCriteria }, 'Saving creator search');

    // Validate brandId, name, and search criteria
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    if (!name) {
      throw new ValidationError('Search name is required');
    }

    if (!searchCriteria) {
      throw new ValidationError('Search criteria is required');
    }

    // Get brand to ensure it exists
    await this.getBrandById(brandId);

    // Call discoveryService.saveSearch to save the search configuration
    const savedSearch = await discoveryService.saveSearch(brandId, name, searchCriteria);

    return savedSearch;
  },

  /**
   * Retrieves all saved searches for a brand
   * @param brandId The unique identifier of the brand
   * @returns List of saved searches
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   */
  async getSavedSearches(brandId: string): Promise<Array<object>> {
    logger.info({ brandId }, 'Getting saved searches');

    // Validate brandId parameter
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    // Get brand to ensure it exists
    await this.getBrandById(brandId);

    // Call discoveryService.getSavedSearches to retrieve saved searches
    const savedSearches = await discoveryService.getSavedSearches(brandId);

    return savedSearches;
  },

  /**
   * Retrieves aggregated statistics about a brand's platform activities
   * @param brandId The unique identifier of the brand
   * @returns Brand statistics
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   */
  async getBrandStatistics(brandId: string): Promise<BrandTypes.BrandStatistics> {
    logger.info({ brandId }, 'Getting brand statistics');

    // Validate brandId parameter
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    // Get brand to ensure it exists
    await this.getBrandById(brandId);

    const brandStatistics = await brandModel.getBrandStatistics(brandId);

    return brandStatistics;
  },

  /**
   * Updates a brand's subscription tier and status
   * @param brandId The unique identifier of the brand
   * @param tier The new subscription tier
   * @param status The new subscription status
   * @returns The updated brand object
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   */
  async updateSubscription(brandId: string, tier: UserTypes.SubscriptionTier, status: UserTypes.SubscriptionStatus): Promise<BrandTypes.Brand> {
    logger.info({ brandId, tier, status }, 'Updating brand subscription');

    // Validate brandId, tier, and status parameters
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    if (!tier) {
      throw new ValidationError('Subscription tier is required');
    }

    if (!status) {
      throw new ValidationError('Subscription status is required');
    }

    // Get brand to ensure it exists
    await this.getBrandById(brandId);

    const updatedBrand = await brandModel.updateSubscription(brandId, tier, status);

    return updatedBrand;
  },
  
    /**
   * Validates if a user has access to a specific brand
   * @param userId The unique identifier of the user
   * @param brandId The unique identifier of the brand
   * @returns Whether the user has access
   * @throws ForbiddenError if the user does not have access
   */
    async validateBrandAccess(userId: string, brandId: string): Promise<boolean> {
      logger.info({ userId, brandId }, 'Validating brand access');
  
      // Validate userId and brandId parameters
      if (!userId) {
        throw new ValidationError('User ID is required');
      }
  
      if (!brandId) {
        throw new ValidationError('Brand ID is required');
      }
  
      // Get brand by ID to ensure it exists
      const brand = await this.getBrandById(brandId);
  
      // Check if userId matches brand's userId
      if (userId !== brand.userId) {
        logger.warn({ userId, brandId }, 'User does not have access to this brand');
        throw new ForbiddenError('You do not have access to this brand');
      }
  
      // Check if user has team member access to brand
      // TODO: Implement team member access check
  
      return true;
    },

  /**
   * Deletes a brand profile and associated data
   * @param brandId The unique identifier of the brand to delete
   * @param userId The unique identifier of the user requesting the deletion
   * @returns Whether the deletion was successful
   * @throws ValidationError if input data is invalid
   * @throws NotFoundError if the brand does not exist
   * @throws ForbiddenError if the user does not have permission to delete the brand
   */
  async deleteBrand(brandId: string, userId: string): Promise<boolean> {
    logger.info({ brandId, userId }, 'Deleting brand');

    // Validate brandId and userId parameters
    if (!brandId) {
      throw new ValidationError('Brand ID is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Validate user has permission to delete this brand
    await this.validateBrandAccess(userId, brandId);

    const success = await brandModel.deleteBrand(brandId);

    return success;
  },
};

export default brandService;