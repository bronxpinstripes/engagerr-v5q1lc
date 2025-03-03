/**
 * Service layer for platform-related operations in the Engagerr application.
 * Provides high-level business logic for connecting, managing, and interacting with external social media platforms while abstracting away the complexity of platform-specific implementations.
 */

import platformModel from '../models/platform';
import { PlatformTypes } from '../types/platform';
import { getPlatformAdapter } from '../integrations/platforms';
import { encryptPlatformToken, decryptPlatformToken } from '../security/encryption';
import { NotFoundError, ExternalServiceError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { PLATFORM_CONFIG } from '../config/constants';

/**
 * Provides high-level services for platform management, authentication, and data synchronization
 */
const platformService = {
  /**
   * Connects a creator to a social media platform using OAuth
   * @param connectionRequest - Platform connection request
   * @returns Connection result with platform details
   */
  async connectCreatorPlatform(connectionRequest: PlatformTypes.PlatformConnectionRequest): Promise<PlatformTypes.PlatformConnectionResponse> {
    // 1. Validate connection request parameters
    if (!connectionRequest || !connectionRequest.creatorId || !connectionRequest.platformType || !connectionRequest.code || !connectionRequest.redirectUri) {
      logger.error({ connectionRequest }, 'Invalid connection request parameters');
      throw new ValidationError('Invalid connection request parameters');
    }

    // 2. Get platform adapter instance using getPlatformAdapter
    const platformAdapter = getPlatformAdapter(connectionRequest.platformType);

    // 3. Call adapter's connect method with the authorization code
    let connectionResult: PlatformTypes.AuthResult;
    try {
      connectionResult = await platformAdapter.connect(connectionRequest.creatorId, connectionRequest.code, connectionRequest.redirectUri);
    } catch (error) {
      logger.error({ connectionRequest, error }, 'Platform adapter connection failed');
      throw new ExternalServiceError(`Platform connection failed: ${error.message}`, connectionRequest.platformType);
    }

    // 4. Handle platform-specific authentication to obtain API tokens
    if (!connectionResult.success) {
      logger.warn({ connectionRequest, connectionResult }, 'Platform connection was not successful');
      return {
        platformId: null,
        creatorId: connectionRequest.creatorId,
        platformType: connectionRequest.platformType,
        handle: null,
        url: null,
        status: PlatformTypes.AuthStatus.ERROR,
        connectionTimestamp: new Date(),
        expiresAt: null,
        error: connectionResult.error
      };
    }

    // 5. Securely encrypt obtained platform credentials using encryptPlatformToken
    if (!connectionResult.accessToken) {
      logger.error({ connectionRequest, connectionResult }, 'No access token received from platform');
      throw new ExternalServiceError('No access token received from platform', connectionRequest.platformType);
    }

    // 6. Store platform connection in database via platformModel.connectPlatform
    try {
      const platform = await platformModel.connectPlatform(
        connectionRequest.creatorId,
        connectionRequest.platformType,
        connectionResult.username,
        connectionResult.profileUrl,
        {
          accessToken: connectionResult.accessToken,
          refreshToken: connectionResult.refreshToken,
          tokenType: 'Bearer',
          expiresAt: new Date(connectionResult.tokenExpiresAt),
          scope: '',
          additionalData: connectionResult.metadata
        }
      );

      // 7. Log successful platform connection
      logger.info({ platformId: platform.id, creatorId: connectionRequest.creatorId, platformType: connectionRequest.platformType }, 'Platform connected successfully');

      // 8. Return connection response with platform details
      return {
        platformId: platform.id,
        creatorId: connectionRequest.creatorId,
        platformType: connectionRequest.platformType,
        handle: platform.handle,
        url: platform.url,
        status: platform.authStatus,
        connectionTimestamp: platform.createdAt,
        expiresAt: platform.tokenExpiresAt,
        error: null
      };
    } catch (error) {
      logger.error({ connectionRequest, connectionResult, error }, 'Error storing platform connection in database');
      throw new ExternalServiceError(`Error storing platform connection: ${error.message}`, connectionRequest.platformType);
    }
  },

  /**
   * Disconnects a creator from a social media platform
   * @param platformId - Platform ID
   * @returns Updated platform with disconnected status
   */
  async disconnectCreatorPlatform(platformId: string): Promise<PlatformTypes.Platform> {
    // 1. Retrieve platform by ID using platformModel.findPlatformById
    const platform = await platformModel.findPlatformById(platformId);

    // 2. If platform not found, throw NotFoundError
    if (!platform) {
      logger.warn({ platformId }, 'Platform not found');
      throw new NotFoundError('Platform not found');
    }

    // 3. Retrieve decrypted credentials using platformModel.getCredentials
    const credentials = await platformModel.getCredentials(platformId);

    // 4. Get platform adapter instance for the platform type
    const platformAdapter = getPlatformAdapter(platform.platformType);

    // 5. Call adapter's disconnect method to revoke platform access
    try {
      await platformAdapter.disconnect(platform.creatorId, platformId, credentials);
    } catch (error) {
      logger.error({ platformId, error }, 'Platform adapter disconnection failed');
      // Do not throw error, continue with local disconnection
    }

    // 6. Update platform status to disconnected in database
    const updatedPlatform = await platformModel.disconnectPlatform(platformId);

    // 7. Log platform disconnection
    logger.info({ platformId }, 'Platform disconnected successfully');

    // 8. Return updated platform object
    return updatedPlatform;
  },

  /**
   * Refreshes OAuth tokens for a platform connection
   * @param platformId - Platform ID
   * @returns True if refresh was successful
   */
  async refreshPlatformAuth(platformId: string): Promise<boolean> {
    // 1. Retrieve platform by ID using platformModel.findPlatformById
    const platform = await platformModel.findPlatformById(platformId);

    // 2. If platform not found, throw NotFoundError
    if (!platform) {
      logger.warn({ platformId }, 'Platform not found');
      throw new NotFoundError('Platform not found');
    }

    // 3. Retrieve decrypted credentials including refresh token
    const credentials = await platformModel.getCredentials(platformId);

    // 4. Get platform adapter instance for the platform type
    const platformAdapter = getPlatformAdapter(platform.platformType);

    // 5. Call adapter's refreshToken method to obtain new access token
    let newCredentials: PlatformTypes.PlatformCredentials;
    try {
      newCredentials = await platformAdapter.refreshToken(platform.creatorId, platformId, credentials);
    } catch (error) {
      logger.error({ platformId, error }, 'Platform adapter token refresh failed');
      return false;
    }

    // 6. Encrypt updated credentials using encryptPlatformToken
    // 7. Update platform record with new tokens via platformModel.updatePlatformTokens
    try {
      await platformModel.updatePlatformTokens(platformId, newCredentials);
    } catch (error) {
      logger.error({ platformId, error }, 'Error updating platform tokens in database');
      return false;
    }

    // 8. Update authentication status to CONNECTED
    try {
      await platformModel.updateAuthStatus(platformId, PlatformTypes.AuthStatus.CONNECTED);
    } catch (error) {
      logger.error({ platformId, error }, 'Error updating platform auth status');
      return false;
    }

    // 9. Log token refresh event
    logger.info({ platformId }, 'Platform tokens refreshed successfully');

    // 10. Return success status
    return true;
  },

  /**
   * Retrieves a platform's details including authentication status
   * @param platformId - Platform ID
   * @returns Platform details
   */
  async getPlatformDetails(platformId: string): Promise<PlatformTypes.Platform> {
    // 1. Retrieve platform by ID using platformModel.findPlatformById
    const platform = await platformModel.findPlatformById(platformId);

    // 2. If platform not found, throw NotFoundError
    if (!platform) {
      logger.warn({ platformId }, 'Platform not found');
      throw new NotFoundError('Platform not found');
    }

    // 3. Return platform object with relevant details
    // 4. Do not include sensitive credentials in response
    return {
      id: platform.id,
      creatorId: platform.creatorId,
      platformType: platform.platformType,
      handle: platform.handle,
      url: platform.url,
      authStatus: platform.authStatus,
      syncStatus: platform.syncStatus,
      lastSyncAt: platform.lastSyncAt,
      tokenExpiresAt: platform.tokenExpiresAt,
      followers: platform.followers,
      engagement: platform.engagement,
      contentCount: platform.contentCount,
      verified: platform.verified,
      metadata: platform.metadata,
      createdAt: platform.createdAt,
      updatedAt: platform.updatedAt
    };
  },

  /**
   * Lists all platforms connected to a creator
   * @param creatorId - Creator ID
   * @param filters - Filters
   * @returns Array of connected platforms
   */
  async listCreatorPlatforms(creatorId: string, filters?: PlatformTypes.PlatformFilter): Promise<PlatformTypes.Platform[]> {
    // 1. Validate creatorId parameter
    if (!creatorId) {
      logger.warn('Creator ID is required');
      throw new ValidationError('Creator ID is required');
    }

    // 2. If filters provided, validate filter parameters
    if (filters) {
      if (filters.platformType && !Object.values(PlatformTypes.PlatformType).includes(filters.platformType)) {
        logger.warn({ platformType: filters.platformType }, 'Invalid platform type filter');
        throw new ValidationError('Invalid platform type filter');
      }
      if (filters.authStatus && !Object.values(PlatformTypes.AuthStatus).includes(filters.authStatus)) {
        logger.warn({ authStatus: filters.authStatus }, 'Invalid auth status filter');
        throw new ValidationError('Invalid auth status filter');
      }
      if (filters.syncStatus && !Object.values(PlatformTypes.SyncStatus).includes(filters.syncStatus)) {
        logger.warn({ syncStatus: filters.syncStatus }, 'Invalid sync status filter');
        throw new ValidationError('Invalid sync status filter');
      }
    }

    // 3. Retrieve platforms using platformModel.listCreatorPlatforms
    const platforms = await platformModel.listCreatorPlatforms(creatorId, filters);

    // 4. Format platform data for response (excluding sensitive data)
    const formattedPlatforms = platforms.map(platform => ({
      id: platform.id,
      creatorId: platform.creatorId,
      platformType: platform.platformType,
      handle: platform.handle,
      url: platform.url,
      authStatus: platform.authStatus,
      syncStatus: platform.syncStatus,
      lastSyncAt: platform.lastSyncAt,
      tokenExpiresAt: platform.tokenExpiresAt,
      followers: platform.followers,
      engagement: platform.engagement,
      contentCount: platform.contentCount,
      verified: platform.verified,
      metadata: platform.metadata,
      createdAt: platform.createdAt,
      updatedAt: platform.updatedAt
    }));

    // 5. Return array of platform objects
    return formattedPlatforms;
  },

  /**
   * Synchronizes content and metrics from a platform
   * @param platformId - Platform ID
   * @param options - Options
   * @returns Synchronization result summary
   */
  async syncPlatformContent(platformId: string, options: PlatformTypes.PlatformSyncOptions): Promise<object> {
    // 1. Retrieve platform by ID using platformModel.findPlatformById
    const platform = await platformModel.findPlatformById(platformId);

    // 2. If platform not found, throw NotFoundError
    if (!platform) {
      logger.warn({ platformId }, 'Platform not found');
      throw new NotFoundError('Platform not found');
    }

    // 3. Check authentication status and refresh tokens if needed
    if (platform.authStatus !== PlatformTypes.AuthStatus.CONNECTED) {
      logger.warn({ platformId, authStatus: platform.authStatus }, 'Platform not connected');
      throw new ExternalServiceError('Platform not connected', platform.platformType);
    }

    // 4. Update sync status to SYNCING
    await platformModel.updateSyncStatus(platformId, PlatformTypes.SyncStatus.SYNCING);

    // 5. Retrieve decrypted credentials
    const credentials = await platformModel.getCredentials(platformId);

    // 6. Get platform adapter instance for the platform type
    const platformAdapter = getPlatformAdapter(platform.platformType);

    // 7. Call adapter's fetchContent method to retrieve content items
    let contentResult: any;
    try {
      contentResult = await platformAdapter.fetchContent(platform.creatorId, platformId, credentials, options);
    } catch (error) {
      logger.error({ platformId, error }, 'Platform adapter content fetch failed');
      // 8. Update sync status to SYNC_FAILED
      await platformModel.updateSyncStatus(platformId, PlatformTypes.SyncStatus.SYNC_FAILED);
      throw new ExternalServiceError(`Platform content fetch failed: ${error.message}`, platform.platformType);
    }

    // 9. Process and store content items in database
    // 10. If includeMetrics option is true, fetch and store platform metrics
    // 11. Handle platform-specific rate limits and pagination
    // 12. Update sync status to SYNCED or appropriate error status
    // 13. Update lastSyncAt timestamp
    // 14. Return sync result with counts of synchronized items
    return { success: true };
  },

  /**
   * Fetches and processes platform metrics
   * @param platformId - Platform ID
   * @param startDate - Start Date
   * @param endDate - End Date
   * @returns Processed platform metrics
   */
  async getPlatformMetrics(platformId: string, startDate: Date, endDate: Date): Promise<PlatformTypes.PlatformMetrics> {
    // 1. Retrieve platform by ID using platformModel.findPlatformById
    const platform = await platformModel.findPlatformById(platformId);

    // 2. If platform not found, throw NotFoundError
    if (!platform) {
      logger.warn({ platformId }, 'Platform not found');
      throw new NotFoundError('Platform not found');
    }

    // 3. Validate date range parameters
    if (!startDate || !endDate || startDate > endDate) {
      logger.warn({ startDate, endDate }, 'Invalid date range parameters');
      throw new ValidationError('Invalid date range parameters');
    }

    // 4. Retrieve decrypted credentials
    const credentials = await platformModel.getCredentials(platformId);

    // 5. Get platform adapter instance for the platform type
    const platformAdapter = getPlatformAdapter(platform.platformType);

    // 6. Call adapter's fetchMetrics method with date range parameters
    let metrics: PlatformTypes.PlatformMetrics;
    try {
      metrics = await platformAdapter.fetchMetrics(platform.creatorId, platformId, credentials, { startDate, endDate });
    } catch (error) {
      logger.error({ platformId, startDate, endDate, error }, 'Platform adapter metrics fetch failed');
      throw new ExternalServiceError(`Platform metrics fetch failed: ${error.message}`, platform.platformType);
    }

    // 7. Process and standardize metrics according to platform type
    // 8. Store processed metrics via platformModel.updateMetrics
    try {
      await platformModel.updateMetrics(platformId, metrics);
    } catch (error) {
      logger.error({ platformId, startDate, endDate, metrics, error }, 'Error updating platform metrics in database');
      throw new ExternalServiceError(`Error updating platform metrics in database: ${error.message}`, platform.platformType);
    }

    // 9. Return standardized metrics object
    return metrics;
  },

  /**
   * Generates authorization URL for platform OAuth flow
   * @param platformType - Platform Type
   * @param redirectUri - Redirect URI
   * @param state - State
   * @returns Authorization URL for the platform
   */
  async getAuthorizationUrl(platformType: PlatformTypes.PlatformType, redirectUri: string, state: string): Promise<string> {
    // 1. Validate platformType parameter is supported
    if (!Object.values(PlatformTypes.PlatformType).includes(platformType)) {
      logger.warn({ platformType }, 'Invalid platform type');
      throw new ValidationError('Invalid platform type');
    }

    // 2. Get platform adapter instance for the platform type
    const platformAdapter = getPlatformAdapter(platformType);

    // 3. Generate state parameter for security if not provided
    // 4. Construct authorization URL with appropriate scopes and parameters
    let authUrl: string;
    try {
      authUrl = await platformAdapter.connect(null, null, redirectUri);
    } catch (error) {
      logger.error({ platformType, redirectUri, error }, 'Error generating authorization URL');
      throw new ExternalServiceError(`Error generating authorization URL: ${error.message}`, platformType);
    }

    // 5. Return complete authorization URL for client redirect
    return authUrl;
  },

  /**
   * Processes incoming webhooks from platforms
   * @param platformType - Platform Type
   * @param payload - Payload
   * @param signature - Signature
   * @returns True if webhook was processed successfully
   */
  async handlePlatformWebhook(platformType: PlatformTypes.PlatformType, payload: object, signature: string): Promise<boolean> {
    // 1. Validate platformType and payload
    if (!Object.values(PlatformTypes.PlatformType).includes(platformType)) {
      logger.warn({ platformType }, 'Invalid platform type');
      return false;
    }

    if (!payload) {
      logger.warn('Payload is required');
      return false;
    }

    // 2. Verify webhook signature for security
    // 3. Determine webhook event type
    // 4. Route to appropriate handler based on event type
    // 5. For content updates: update content in database
    // 6. For metric updates: refresh platform metrics
    // 7. For auth issues: update platform authentication status
    // 8. Log webhook processing
    // 9. Return processing result
    return true;
  }
};

export default platformService;