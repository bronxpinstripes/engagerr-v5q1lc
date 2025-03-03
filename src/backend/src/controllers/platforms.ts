import { Request, Response, NextFunction } from 'express'; //  ^4.18.2
import platformService from '../services/platform';
import { getPlatformAdapter } from '../integrations/platforms';
import { PlatformTypes, ApiTypes } from '../types';
import { handleAsyncError, ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Generates OAuth URL for platform connection
 */
const getOAuthUrl = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract platform type from request parameters
  const { platformType } = req.params as { platformType: PlatformTypes.PlatformType };

  // Extract redirectUri from query parameters
  const { redirectUri } = req.query as { redirectUri: string };

  // Generate a state parameter for CSRF protection
  const state = `engagerr_${platformType}_${Date.now()}`;

  // Call platformService.getAuthorizationUrl to generate the OAuth URL
  const authUrl = await platformService.getAuthorizationUrl(platformType, redirectUri, state);

  // Return the URL in a standardized API response format
  res.status(200).json({
    data: { authUrl },
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Connects a creator to a social media platform using OAuth flow
 */
const connectPlatform = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract connection request data from request body
  const connectionRequest = req.body as PlatformTypes.PlatformConnectionRequest;

  // Set creatorId from authenticated user (req.user.id)
  const creatorId = (req as any).user.id;
  connectionRequest.creatorId = creatorId;

  // Validate the connection request parameters
  if (!connectionRequest.platformType || !connectionRequest.code || !connectionRequest.redirectUri) {
    throw new ValidationError('Missing required parameters for platform connection');
  }

  // Call platformService.connectCreatorPlatform with the connection request
  const connectionResult = await platformService.connectCreatorPlatform(connectionRequest);

  // Log successful platform connection
  logger.info({ creatorId, platformType: connectionRequest.platformType }, 'Platform connected successfully');

  // Return connection result in a standardized API response format
  res.status(200).json({
    data: connectionResult,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Disconnects a creator from a social media platform
 */
const disconnectPlatform = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract platformId from request parameters
  const { platformId } = req.params;

  // Call platformService.disconnectCreatorPlatform with the platformId
  const disconnectionResult = await platformService.disconnectCreatorPlatform(platformId);

  // Log platform disconnection
  logger.info({ platformId }, 'Platform disconnected successfully');

  // Return disconnection result in a standardized API response format
  res.status(200).json({
    data: disconnectionResult,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Retrieves details for a specific platform connection
 */
const getPlatformDetails = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract platformId from request parameters
  const { platformId } = req.params;

  // Call platformService.getPlatformDetails with the platformId
  const platformDetails = await platformService.getPlatformDetails(platformId);

  // Return platform details in a standardized API response format
  res.status(200).json({
    data: platformDetails,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Retrieves all platform connections for a creator
 */
const getCreatorPlatforms = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract creatorId from request parameters or use authenticated user ID if not provided
  const creatorId = req.params.creatorId || (req as any).user.id;

  // Extract filter parameters from query string
  const filters: PlatformTypes.PlatformFilter = req.query as any;

  // Call platformService.listCreatorPlatforms with creatorId and filters
  const platforms = await platformService.listCreatorPlatforms(creatorId, filters);

  // Return list of platforms in a standardized API response format
  res.status(200).json({
    data: platforms,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Fetches content items from a connected platform
 */
const fetchPlatformContent = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract platformId from request parameters
  const { platformId } = req.params;

  // Extract content filter parameters from query string
  const contentFilters: PlatformTypes.PlatformSyncOptions = req.query as any;

  // Create platform adapter instance for the platform type
  const platformDetails = await platformService.getPlatformDetails(platformId);
  const platformAdapter = getPlatformAdapter(platformDetails.platformType);

  // Fetch platform credentials from service
  const credentials = await platformService.getPlatformDetails(platformId);

  // Call adapter's fetchContent method with appropriate parameters
  const contentItems = await platformAdapter.fetchContent(platformDetails.creatorId, platformId, credentials, contentFilters);

  // Return content items in a standardized API response format
  res.status(200).json({
    data: contentItems,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Fetches performance metrics from a connected platform
 */
const fetchPlatformMetrics = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract platformId from request parameters
  const { platformId } = req.params;

  // Extract date range parameters from query string
  const { startDate, endDate } = req.query as ApiTypes.DateRangeParams;

  // Validate date range parameters
  if (!startDate || !endDate) {
    throw new ValidationError('Start date and end date are required');
  }

  // Call platformService.getPlatformMetrics with platformId and date range
  const metrics = await platformService.getPlatformMetrics(platformId, new Date(startDate), new Date(endDate));

  // Return metrics in a standardized API response format
  res.status(200).json({
    data: metrics,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Fetches audience demographics from a connected platform
 */
const fetchPlatformAudience = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract platformId from request parameters
  const { platformId } = req.params;

  // Create platform adapter instance for the platform type
  const platformDetails = await platformService.getPlatformDetails(platformId);
  const platformAdapter = getPlatformAdapter(platformDetails.platformType);

  // Fetch platform credentials from service
  const credentials = await platformService.getPlatformDetails(platformId);

  // Call adapter's fetchAudience method
  const audienceData = await platformAdapter.fetchAudience(platformDetails.creatorId, platformId, credentials);

  // Return audience data in a standardized API response format
  res.status(200).json({
    data: audienceData,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Triggers synchronization of content and metrics from a platform
 */
const syncPlatformData = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract platformId from request parameters
  const { platformId } = req.params;

  // Extract sync options from request body
  const syncOptions = req.body as PlatformTypes.PlatformSyncOptions;

  // Call platformService.syncPlatformContent with platformId and options
  const syncResult = await platformService.syncPlatformContent(platformId, syncOptions);

  // Return sync result in a standardized API response format
  res.status(200).json({
    data: syncResult,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Refreshes OAuth tokens for a platform connection
 */
const refreshPlatformTokens = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract platformId from request parameters
  const { platformId } = req.params;

  // Call platformService.refreshPlatformAuth with platformId
  const refreshResult = await platformService.refreshPlatformAuth(platformId);

  // Return refresh result in a standardized API response format
  res.status(200).json({
    data: { success: refreshResult },
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * Processes webhook events from social platforms
 */
const handlePlatformWebhook = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract platform type from request parameters
  const { platformType } = req.params as { platformType: PlatformTypes.PlatformType };

  // Extract webhook payload from request body
  const payload = req.body;

  // Extract signature from request headers
  const signature = req.headers['x-hub-signature'] as string;

  // Call platformService.handlePlatformWebhook with platform type, payload, and signature
  const processingResult = await platformService.handlePlatformWebhook(platformType, payload, signature);

  // Log webhook processing
  logger.info({ platformType, signature }, 'Platform webhook processed');

  // Return success acknowledgment response
  res.status(200).send('OK');
});

// Export controller functions for platform-related API endpoints
export default {
  getOAuthUrl,
  connectPlatform,
  disconnectPlatform,
  getPlatformDetails,
  getCreatorPlatforms,
  fetchPlatformContent,
  fetchPlatformMetrics,
  fetchPlatformAudience,
  syncPlatformData,
  refreshPlatformTokens,
  handlePlatformWebhook
};