import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { handleStripeWebhook } from '../webhooks/stripe';
import WebhookManager from '../webhooks/platforms';
import { PlatformTypes } from '../types/platform';
import platformService from '../services/platform';
import { logger } from '../utils/logger';
import { ApiError, BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors';

/**
 * Controller function for handling incoming Stripe webhook events
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns {Promise<void>} Resolves when webhook is processed
 */
export const handleStripeWebhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 1. Extract Stripe signature from request headers
  const signature = req.headers['stripe-signature'] as string;

  // 2. Call handleStripeWebhook from webhooks/stripe.ts to process the event
  try {
    await handleStripeWebhook(req, res, next, signature);
  } catch (error) {
    // 3. Handle errors with appropriate error responses
    logger.error({
      message: 'Error handling Stripe webhook',
      error: error.message,
      signature: signature,
    });
    next(error);
  }
};

/**
 * Controller function for handling incoming webhooks from social platforms
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns {Promise<void>} Resolves when webhook is processed
 */
export const handlePlatformWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract platform type from request parameters
    const platformType = req.params.platform as PlatformTypes.PlatformType;

    // 2. Validate platform type is supported
    if (!Object.values(PlatformTypes.PlatformType).includes(platformType)) {
      throw new BadRequestError('Unsupported platform type', { platformType });
    }

    // 3. Extract signature from request headers
    const signature = req.headers['x-hub-signature'] as string || req.headers['x-twitter-webhooks-signature'] as string;

    // 4. Initialize WebhookManager instance
    const webhookManager = new WebhookManager({});

    // 5. Handle potential challenge response during webhook registration
    if (req.method === 'GET' && req.query['hub.challenge']) {
      const challenge = req.query['hub.challenge'];
      logger.info({ platformType, challenge }, 'Responding to webhook challenge');
      return res.status(200).send(challenge);
    }

    // 6. Call webhookManager.handleWebhook to process the webhook
    await webhookManager.handleWebhook(platformType, req.body, req.headers);

    // 7. Return 200 status code with appropriate response
    res.status(200).send('Webhook received and processing');
  } catch (error) {
    // 8. Handle errors with appropriate error responses
    logger.error({
      message: 'Error handling platform webhook',
      error: error.message,
      platformType: req.params.platform,
    });
    next(error);
  }
};

/**
 * Controller function to register webhooks with social platforms
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns {Promise<void>} Resolves with registration result
 */
export const registerPlatformWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract platform ID and registration options from request body
    const { platformId, options } = req.body;

    // 2. Validate required parameters
    if (!platformId) {
      throw new BadRequestError('Platform ID is required', { platformId });
    }

    // 3. Initialize WebhookManager instance
    const webhookManager = new WebhookManager({});

    // 4. Call webhookManager.registerWebhook to register with platform
    const registrationResult = await webhookManager.registerWebhook(platformId, options);

    // 5. Return 200 status code with registration result
    res.status(200).json(registrationResult);
  } catch (error) {
    // 6. Handle errors with appropriate error responses
    logger.error({
      message: 'Error registering platform webhook',
      error: error.message,
      platformId: req.body.platformId,
    });
    next(error);
  }
};

/**
 * Controller function to unregister webhooks from social platforms
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns {Promise<void>} Resolves with unregistration result
 */
export const unregisterPlatformWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract platform ID from request parameters
    const { platformId } = req.params;

    // 2. Validate platform ID exists
    if (!platformId) {
      throw new BadRequestError('Platform ID is required', { platformId });
    }

    // 3. Initialize WebhookManager instance
    const webhookManager = new WebhookManager({});

    // 4. Call webhookManager.unregisterWebhook to unregister from platform
    const unregistrationResult = await webhookManager.unregisterWebhook(platformId);

    // 5. Return 200 status code with unregistration result
    res.status(200).json({ success: unregistrationResult });
  } catch (error) {
    // 6. Handle errors with appropriate error responses
    logger.error({
      message: 'Error unregistering platform webhook',
      error: error.message,
      platformId: req.params.platformId,
    });
    next(error);
  }
};

/**
 * Controller function to check webhook status for a platform
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns {Promise<void>} Resolves with webhook status information
 */
export const getWebhookStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract platform ID from request parameters
    const { platformId } = req.params;

    // 2. Validate platform ID exists
    if (!platformId) {
      throw new BadRequestError('Platform ID is required', { platformId });
    }

    // 3. Retrieve platform details including webhook status
    const platformDetails = await platformService.getPlatformDetails(platformId);

    // 4. Return 200 status code with webhook status information
    res.status(200).json({
      platformId: platformDetails.id,
      webhookStatus: platformDetails.authStatus, // Assuming authStatus reflects webhook status
    });
  } catch (error) {
    // 5. Handle errors with appropriate error responses
    logger.error({
      message: 'Error getting webhook status',
      error: error.message,
      platformId: req.params.platformId,
    });
    next(error);
  }
};

/**
 * Controller function to get supported webhook event types for a platform
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns {Promise<void>} Resolves with list of supported event types
 */
export const getSupportedWebhookEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract platform type from request parameters
    const { platform } = req.params;
    const platformType = platform as PlatformTypes.PlatformType;

    // 2. Validate platform type is supported
    if (!Object.values(PlatformTypes.PlatformType).includes(platformType)) {
      throw new BadRequestError('Unsupported platform type', { platformType });
    }

    // 3. Initialize WebhookManager instance
    const webhookManager = new WebhookManager({});

    // 4. Call webhookManager.getSupportedEventTypes to get supported events
    const supportedEvents = webhookManager.getSupportedEventTypes(platformType);

    // 5. Return 200 status code with list of supported event types
    res.status(200).json({
      platformType: platformType,
      supportedEvents: supportedEvents,
    });
  } catch (error) {
    // 6. Handle errors with appropriate error responses
    logger.error({
      message: 'Error getting supported webhook events',
      error: error.message,
      platformType: req.params.platform,
    });
    next(error);
  }
};