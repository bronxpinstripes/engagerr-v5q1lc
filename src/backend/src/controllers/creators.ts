import { Request, Response, NextFunction } from 'express'; // express ^4.18.2: Express HTTP handling types
import CreatorService from '../services/creator'; // Creator service for creator-related operations
import PlatformService from '../services/platform'; // Platform service for platform connection operations
import ContentRelationshipService from '../services/contentRelationship'; // Content relationship service for managing content relationships
import AnalyticsService from '../services/analytics'; // Analytics service for retrieving analytics data
import { HttpError } from '../utils/errors'; // HttpError class for handling HTTP errors
import { Creator } from '../types/creator'; // Creator interface for creator data
import { Platform } from '../types/platform'; // Platform interface for platform data
import { ContentRelationship } from '../types/content'; // ContentRelationship interface for content relationship data
import { Analytics } from '../types/analytics'; // Analytics interface for analytics data
import { Partnership } from '../types/partnership'; // Partnership interface for partnership data
import { validateRequest } from '../utils/validation'; // Function to validate request data against schemas

/**
 * Retrieves a creator's profile by ID
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with creator profile or error
 */
export const getCreatorProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Validate the creator ID
    if (!creatorId) {
      throw new HttpError('Creator ID is required', 400);
    }

    // LD1: Call CreatorService.getCreatorById to retrieve creator profile
    const creator = await CreatorService.getCreatorById(creatorId);

    // LD1: If creator not found, throw HttpError with 404 status
    if (!creator) {
      throw new HttpError('Creator not found', 404);
    }

    // LD1: Return creator profile in response
    res.json(creator);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a creator's profile information
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with updated creator profile or error
 */
export const updateCreatorProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract profile update data from request body
    const updateData = req.body;

    // LD1: Validate the update data against schema
    // TODO: Implement validation schema for creator profile update
    // await validateRequest(req, 'body', creatorUpdateSchema);

    // LD1: Call CreatorService.updateCreator to update the profile
    const updatedCreator = await CreatorService.updateCreatorProfile(creatorId, updateData);

    // LD1: Return updated creator profile in response
    res.json(updatedCreator);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all platforms connected to a creator
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with creator's platforms or error
 */
export const getCreatorPlatforms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Call CreatorService.getCreatorPlatforms to retrieve connected platforms
    const platforms = await CreatorService.getCreatorPlatforms(creatorId);

    // LD1: Return platforms list in response
    res.json(platforms);
  } catch (error) {
    next(error);
  }
};

/**
 * Connects a social media platform to a creator's account
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with connection result or error
 */
export const connectPlatform = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract platform connection details from request body
    const platformData = req.body;

    // LD1: Validate platform connection data against schema
    // TODO: Implement validation schema for platform connection
    // await validateRequest(req, 'body', platformConnectionSchema);

    // LD1: Call PlatformService.connectPlatform to establish connection
    const connectedPlatform = await PlatformService.connectPlatform(creatorId, platformData);

    // LD1: Return success response with connected platform details
    res.json(connectedPlatform);
  } catch (error) {
    next(error);
  }
};

/**
 * Disconnects a platform from a creator's account
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with disconnection result or error
 */
export const disconnectPlatform = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract platform ID from request parameters
    const platformId = req.params.platformId;

    // LD1: Call PlatformService.disconnectPlatform to remove connection
    const success = await PlatformService.disconnectPlatform(creatorId, platformId);

    // LD1: Return success response with disconnection confirmation
    res.json({ success });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves content associated with a creator
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with creator's content or error
 */
export const getCreatorContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract optional filter parameters from query string
    const filters = req.query;

    // LD1: Call CreatorService.getCreatorContent to retrieve content items
    const content = await CreatorService.getCreatorContent(creatorId, filters);

    // LD1: Return content list in response
    res.json(content);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves analytics data for a creator's content across platforms
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with analytics data or error
 */
export const getCreatorAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract date range and platform filters from query string
    const { startDate, endDate, platforms } = req.query;

    // LD1: Validate filter parameters against schema
    // TODO: Implement validation schema for analytics filters
    // await validateRequest(req, 'query', analyticsFiltersSchema);

    // LD1: Call AnalyticsService.getCreatorAnalytics to retrieve analytics data
    const analyticsData = await AnalyticsService.getCreatorAnalytics(creatorId, startDate, endDate, platforms);

    // LD1: Return formatted analytics data in response
    res.json(analyticsData);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves content relationship mappings for a creator's content
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with content relationships or error
 */
export const getContentRelationships = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract optional content ID filter from query string
    const { contentId } = req.query;

    // LD1: Call ContentRelationshipService.getContentRelationships to retrieve relationships
    const relationships = await ContentRelationshipService.getContentRelationships(creatorId, contentId);

    // LD1: Return relationships data in response
    res.json(relationships);
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new relationship between content items
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with created relationship or error
 */
export const createContentRelationship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract relationship data from request body
    const relationshipData = req.body;

    // LD1: Validate relationship data against schema
    // TODO: Implement validation schema for content relationship creation
    // await validateRequest(req, 'body', contentRelationshipSchema);

    // LD1: Call ContentRelationshipService.createContentRelationship to create relationship
    const newRelationship = await ContentRelationshipService.createContentRelationship(creatorId, relationshipData);

    // LD1: Return created relationship in response
    res.status(201).json(newRelationship);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing content relationship
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with updated relationship or error
 */
export const updateContentRelationship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract relationship ID from request parameters
    const relationshipId = req.params.relationshipId;

    // LD1: Extract update data from request body
    const updateData = req.body;

    // LD1: Validate update data against schema
    // TODO: Implement validation schema for content relationship update
    // await validateRequest(req, 'body', contentRelationshipUpdateSchema);

    // LD1: Call ContentRelationshipService.updateContentRelationship to update relationship
    const updatedRelationship = await ContentRelationshipService.updateContentRelationship(creatorId, relationshipId, updateData);

    // LD1: Return updated relationship in response
    res.json(updatedRelationship);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a content relationship
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with deletion confirmation or error
 */
export const deleteContentRelationship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract relationship ID from request parameters
    const relationshipId = req.params.relationshipId;

    // LD1: Call ContentRelationshipService.deleteContentRelationship to delete relationship
    const success = await ContentRelationshipService.deleteContentRelationship(creatorId, relationshipId);

    // LD1: Return success response with deletion confirmation
    res.json({ success });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves partnerships associated with a creator
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with creator's partnerships or error
 */
export const getCreatorPartnerships = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract optional status filter from query string
    const { status } = req.query;

    // LD1: Call CreatorService.getCreatorPartnerships to retrieve partnerships
    const partnerships = await CreatorService.getCreatorPartnerships(creatorId, status);

    // LD1: Return partnerships list in response
    res.json(partnerships);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a creator's settings
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 * @returns Promise<void> Sends JSON response with updated settings or error
 */
export const updateCreatorSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // LD1: Extract creator ID from request parameters or authenticated user
    const creatorId = req.params.creatorId || req.user?.id;

    // LD1: Extract settings data from request body
    const settingsData = req.body;

    // LD1: Validate settings data against schema
    // TODO: Implement validation schema for creator settings
    // await validateRequest(req, 'body', creatorSettingsSchema);

    // LD1: Call CreatorService.updateCreatorSettings to update settings
    const updatedSettings = await CreatorService.updateCreatorSettings(creatorId, settingsData);

    // LD1: Return updated settings in response
    res.json(updatedSettings);
  } catch (error) {
    next(error);
  }
};