/**
 * Core model implementation for platform entities in the Engagerr application, providing database operations for platform connections, credential management, and platform-specific metrics. Handles the creation, retrieval, update, and deletion of social media platform connections for creators.
 */

import { PrismaClient } from '@prisma/client'; // ^5.0.0
import { PlatformTypes } from '../types/platform';
import { creatorModel } from './creator';
import { encryptCredentials, decryptCredentials } from '../security/encryption';
import { sanitizeInput } from '../utils/validation';
import { NotFoundError, ConflictError, DatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

/**
 * Platform model with data access methods for platform management, authentication, and profile operations.
 */
const platformModel = {
  /**
   * Retrieves a platform by its unique identifier
   * @param platformId The unique identifier of the platform
   * @returns Promise resolving to the found platform or null if not found
   */
  async findPlatformById(platformId: string): Promise<PlatformTypes.Platform | null> {
    try {
      logger.info({ platformId }, 'Finding platform by ID');
      const platform = await prisma.platform.findUnique({
        where: { id: platformId }
      });

      if (!platform) {
        logger.warn({ platformId }, 'Platform not found');
        return null;
      }

      return platform;
    } catch (error) {
      logger.error({ platformId, error }, 'Error finding platform by ID');
      throw new DatabaseError('Error finding platform', { cause: error });
    }
  },

  /**
   * Connects a new platform to a creator's account
   * @param creatorId The unique identifier of the creator
   * @param platformType The type of platform to connect (e.g., 'youtube', 'instagram')
   * @param handle The username or handle on the platform
   * @param url The URL of the platform profile
   * @param credentials The OAuth credentials for the platform
   * @returns Promise resolving to the newly connected platform
   */
  async connectPlatform(
    creatorId: string,
    platformType: PlatformTypes.PlatformType,
    handle: string,
    url: string,
    credentials: PlatformTypes.PlatformCredentials
  ): Promise<PlatformTypes.Platform> {
    try {
      logger.info({ creatorId, platformType, handle, url }, 'Connecting new platform');

      // Sanitize input data
      const sanitizedHandle = sanitizeInput(handle);
      const sanitizedUrl = sanitizeInput(url);

      // Verify creator exists
      const creator = await creatorModel.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found');
        throw new NotFoundError('Creator not found');
      }

      // Check if platform connection already exists for this creator and platform type
      const existingPlatform = await prisma.platform.findFirst({
        where: {
          creatorId: creatorId,
          platformType: platformType
        }
      });

      if (existingPlatform) {
        logger.warn({ creatorId, platformType }, 'Platform connection already exists');
        throw new ConflictError('Platform connection already exists');
      }

      // Encrypt sensitive credentials
      const encryptedCreds = await encryptCredentials(credentials);

      // Create platform record in database
      const platform = await prisma.platform.create({
        data: {
          creatorId: creatorId,
          platformType: platformType,
          handle: sanitizedHandle,
          url: sanitizedUrl,
          authStatus: PlatformTypes.AuthStatus.CONNECTED,
          syncStatus: PlatformTypes.SyncStatus.NEVER_SYNCED,
          tokenExpiresAt: credentials.expiresAt,
          accessToken: encryptedCreds.accessToken,
          refreshToken: encryptedCreds.refreshToken,
          tokenType: credentials.tokenType,
          scope: credentials.scope,
          followers: 0,
          engagement: 0,
          contentCount: 0,
          verified: false,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info({ platformId: platform.id }, 'Platform connected successfully');
      return platform;
    } catch (error) {
      logger.error({ creatorId, platformType, handle, url, error }, 'Error connecting platform');
      throw new DatabaseError('Error connecting platform', { cause: error });
    }
  },

  /**
   * Disconnects a platform from a creator's account
   * @param platformId The unique identifier of the platform to disconnect
   * @returns Promise resolving to the updated platform with disconnected status
   */
  async disconnectPlatform(platformId: string): Promise<PlatformTypes.Platform> {
    try {
      logger.info({ platformId }, 'Disconnecting platform');

      // Verify platform exists
      const platform = await this.findPlatformById(platformId);
      if (!platform) {
        logger.warn({ platformId }, 'Platform not found');
        throw new NotFoundError('Platform not found');
      }

      // Update platform record setting authStatus to DISCONNECTED
      const updatedPlatform = await prisma.platform.update({
        where: { id: platformId },
        data: {
          authStatus: PlatformTypes.AuthStatus.DISCONNECTED,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          updatedAt: new Date()
        }
      });

      logger.info({ platformId }, 'Platform disconnected successfully');
      return updatedPlatform;
    } catch (error) {
      logger.error({ platformId, error }, 'Error disconnecting platform');
      throw new DatabaseError('Error disconnecting platform', { cause: error });
    }
  },

  /**
   * Updates the OAuth tokens for a platform connection
   * @param platformId The unique identifier of the platform to update
   * @param credentials The new OAuth credentials for the platform
   * @returns Promise resolving to the updated platform
   */
  async updatePlatformTokens(
    platformId: string,
    credentials: PlatformTypes.PlatformCredentials
  ): Promise<PlatformTypes.Platform> {
    try {
      logger.info({ platformId }, 'Updating platform tokens');

      // Verify platform exists
      const platform = await this.findPlatformById(platformId);
      if (!platform) {
        logger.warn({ platformId }, 'Platform not found');
        throw new NotFoundError('Platform not found');
      }

      // Encrypt new credentials
      const encryptedCreds = await encryptCredentials(credentials);

      // Update platform record with new encrypted credentials
      const updatedPlatform = await prisma.platform.update({
        where: { id: platformId },
        data: {
          accessToken: encryptedCreds.accessToken,
          refreshToken: encryptedCreds.refreshToken,
          tokenType: credentials.tokenType,
          tokenExpiresAt: credentials.expiresAt,
          authStatus: PlatformTypes.AuthStatus.CONNECTED,
          updatedAt: new Date()
        }
      });

      logger.info({ platformId }, 'Platform tokens updated successfully');
      return updatedPlatform;
    } catch (error) {
      logger.error({ platformId, error }, 'Error updating platform tokens');
      throw new DatabaseError('Error updating platform tokens', { cause: error });
    }
  },

  /**
   * Retrieves decrypted credentials for a platform
   * @param platformId The unique identifier of the platform
   * @returns Promise resolving to the decrypted platform credentials
   */
  async getCredentials(platformId: string): Promise<PlatformTypes.PlatformCredentials> {
    try {
      logger.info({ platformId }, 'Retrieving platform credentials');

      // Verify platform exists
      const platform = await this.findPlatformById(platformId);
      if (!platform) {
        logger.warn({ platformId }, 'Platform not found');
        throw new NotFoundError('Platform not found');
      }

      // Decrypt credentials
      const decryptedCreds = await decryptCredentials({
        accessToken: platform.accessToken,
        refreshToken: platform.refreshToken,
        tokenType: platform.tokenType,
        expiresAt: platform.tokenExpiresAt,
        scope: platform.scope,
        additionalData: platform.metadata
      });

      logger.info({ platformId }, 'Platform credentials retrieved successfully');
      return decryptedCreds;
    } catch (error) {
      logger.error({ platformId, error }, 'Error retrieving platform credentials');
      throw new DatabaseError('Error retrieving platform credentials', { cause: error });
    }
  },

  /**
   * Updates the synchronization status of a platform
   * @param platformId The unique identifier of the platform to update
   * @param syncStatus The new synchronization status
   * @param lastSyncAt The last time the platform was synced
   * @returns Promise resolving to the updated platform
   */
  async updateSyncStatus(
    platformId: string,
    syncStatus: PlatformTypes.SyncStatus,
    lastSyncAt?: Date
  ): Promise<PlatformTypes.Platform> {
    try {
      logger.info({ platformId, syncStatus }, 'Updating platform sync status');

      // Verify platform exists
      const platform = await this.findPlatformById(platformId);
      if (!platform) {
        logger.warn({ platformId }, 'Platform not found');
        throw new NotFoundError('Platform not found');
      }

      // Update platform record with new sync status
      const updatedPlatform = await prisma.platform.update({
        where: { id: platformId },
        data: {
          syncStatus: syncStatus,
          lastSyncAt: lastSyncAt || new Date(),
          updatedAt: new Date()
        }
      });

      logger.info({ platformId }, 'Platform sync status updated successfully');
      return updatedPlatform;
    } catch (error) {
      logger.error({ platformId, syncStatus, error }, 'Error updating platform sync status');
      throw new DatabaseError('Error updating platform sync status', { cause: error });
    }
  },

  /**
   * Updates the authentication status of a platform
   * @param platformId The unique identifier of the platform to update
   * @param authStatus The new authentication status
   * @returns Promise resolving to the updated platform
   */
  async updateAuthStatus(platformId: string, authStatus: PlatformTypes.AuthStatus): Promise<PlatformTypes.Platform> {
    try {
      logger.info({ platformId, authStatus }, 'Updating platform auth status');

      // Verify platform exists
      const platform = await this.findPlatformById(platformId);
      if (!platform) {
        logger.warn({ platformId }, 'Platform not found');
        throw new NotFoundError('Platform not found');
      }

      // Update platform record with new auth status
      const updatedPlatform = await prisma.platform.update({
        where: { id: platformId },
        data: {
          authStatus: authStatus,
          updatedAt: new Date()
        }
      });

      logger.info({ platformId }, 'Platform auth status updated successfully');
      return updatedPlatform;
    } catch (error) {
      logger.error({ platformId, authStatus, error }, 'Error updating platform auth status');
      throw new DatabaseError('Error updating platform auth status', { cause: error });
    }
  },

  /**
   * Updates the performance metrics for a platform
   * @param platformId The unique identifier of the platform to update
   * @param metrics The new performance metrics for the platform
   * @returns Promise resolving to the stored platform metrics
   */
  async updateMetrics(platformId: string, metrics: PlatformTypes.PlatformMetrics): Promise<PlatformTypes.PlatformMetrics> {
    try {
      logger.info({ platformId, metrics }, 'Updating platform metrics');

      // Verify platform exists
      const platform = await this.findPlatformById(platformId);
      if (!platform) {
        logger.warn({ platformId }, 'Platform not found');
        throw new NotFoundError('Platform not found');
      }

      // TODO: Validate metrics structure and values

      // Upsert metrics in database (create or update)
      const updatedPlatform = await prisma.platform.update({
        where: { id: platformId },
        data: {
          followers: metrics.followers,
          engagement: metrics.engagement,
          updatedAt: new Date()
        }
      });

      logger.info({ platformId }, 'Platform metrics updated successfully');
      return metrics;
    } catch (error) {
      logger.error({ platformId, metrics, error }, 'Error updating platform metrics');
      throw new DatabaseError('Error updating platform metrics', { cause: error });
    }
  },

  /**
   * Lists all platforms connected to a creator
   * @param creatorId The unique identifier of the creator
   * @param filters Optional filters to apply to the query
   * @returns Promise resolving to array of platforms
   */
  async listCreatorPlatforms(creatorId: string, filters?: PlatformTypes.PlatformFilter): Promise<PlatformTypes.Platform[]> {
    try {
      logger.info({ creatorId, filters }, 'Listing creator platforms');

      // Verify creator exists
      const creator = await creatorModel.findCreatorById(creatorId);
      if (!creator) {
        logger.warn({ creatorId }, 'Creator not found');
        throw new NotFoundError('Creator not found');
      }

      // Build database query based on creatorId and optional filters
      const whereClause: any = {
        creatorId: creatorId
      };

      if (filters) {
        if (filters.platformType) {
          whereClause.platformType = filters.platformType;
        }
        if (filters.authStatus) {
          whereClause.authStatus = filters.authStatus;
        }
        if (filters.syncStatus) {
          whereClause.syncStatus = filters.syncStatus;
        }
      }

      // Execute query to retrieve platform records
      const platforms = await prisma.platform.findMany({
        where: whereClause
      });

      logger.info({ creatorId, count: platforms.length }, 'Creator platforms listed successfully');
      return platforms;
    } catch (error) {
      logger.error({ creatorId, filters, error }, 'Error listing creator platforms');
      throw new DatabaseError('Error listing creator platforms', { cause: error });
    }
  },

  /**
   * Deletes a platform connection and related data
   * @param platformId The unique identifier of the platform to delete
   * @returns Promise resolving to true if deletion was successful
   */
  async deletePlatform(platformId: string): Promise<boolean> {
    try {
      logger.info({ platformId }, 'Deleting platform');

      // Verify platform exists
      const platform = await this.findPlatformById(platformId);
      if (!platform) {
        logger.warn({ platformId }, 'Platform not found');
        throw new NotFoundError('Platform not found');
      }

      // Start a transaction to ensure data consistency
      await prisma.$transaction(async (tx) => {
        // TODO: Delete associated data (metrics, audience data, credentials)

        // Delete platform record from database
        await tx.platform.delete({
          where: { id: platformId }
        });
      });

      logger.info({ platformId }, 'Platform deleted successfully');
      return true;
    } catch (error) {
      logger.error({ platformId, error }, 'Error deleting platform');
      throw new DatabaseError('Error deleting platform', { cause: error });
    }
  },

  /**
   * Retrieves stored metrics for a platform
   * @param platformId The unique identifier of the platform
   * @param startDate Optional start date to filter metrics
   * @param endDate Optional end date to filter metrics
   * @returns Promise resolving to array of platform metrics
   */
  async getPlatformMetrics(platformId: string, startDate?: Date, endDate?: Date): Promise<PlatformTypes.PlatformMetrics[]> {
    try {
      logger.info({ platformId, startDate, endDate }, 'Getting platform metrics');

      // Verify platform exists
      const platform = await this.findPlatformById(platformId);
      if (!platform) {
        logger.warn({ platformId }, 'Platform not found');
        throw new NotFoundError('Platform not found');
      }

      // TODO: Build query with date range filters if provided

      // TODO: Retrieve metrics records from database

      // TODO: Transform database results to match PlatformMetrics interface

      const metrics: PlatformTypes.PlatformMetrics[] = [];

      logger.info({ platformId, count: metrics.length }, 'Platform metrics retrieved successfully');
      return metrics;
    } catch (error) {
      logger.error({ platformId, startDate, endDate, error }, 'Error getting platform metrics');
      throw new DatabaseError('Error getting platform metrics', { cause: error });
    }
  }
};

export default platformModel;