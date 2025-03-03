import { crypto } from 'crypto'; // built-in
import express from 'express'; // ^4.18.2
import { ApiError, BadRequestError, UnauthorizedError } from '../utils/errors';
import { logger } from '../monitoring/logs';
import { PlatformType, PlatformWebhookEvent } from '../types/platform';
import { ContentService } from '../services/content';
import analyticsService from '../services/analytics';
import contentRelationshipService from '../services/contentRelationship';
import platformAdapters from '../integrations/platforms';
import platformModel from '../models/platform';
import { QueueService } from '../queue/processor';
import { config } from '../config/constants';

/**
 * Verifies the signature of incoming webhook requests from different platforms to ensure authenticity
 * @param PlatformType platform
 * @param string signature
 * @param string payload
 * @param string webhookSecret
 * @returns boolean True if signature is valid, false otherwise
 */
export function verifyWebhookSignature(platform: PlatformType, signature: string, payload: string, webhookSecret: string): boolean {
  logger.info({ platform }, 'Verifying webhook signature');

  let isValid = false;

  switch (platform) {
    case PlatformType.YOUTUBE:
      // YouTube uses HMAC-SHA1
      const expectedSignature = crypto
        .createHmac('sha1', webhookSecret)
        .update(payload)
        .digest('hex');
      isValid = signature === expectedSignature;
      break;

    case PlatformType.INSTAGRAM:
      // Instagram uses SHA-256
      const expectedSignatureInstagram = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      isValid = signature === expectedSignatureInstagram;
      break;

    case PlatformType.TIKTOK:
      // TikTok uses a custom signature verification algorithm
      const expectedSignatureTikTok = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      isValid = signature === expectedSignatureTikTok;
      break;

    case PlatformType.TWITTER:
      // Twitter uses HMAC-SHA256
      const expectedSignatureTwitter = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('base64');
      isValid = signature === expectedSignatureTwitter;
      break;

    case PlatformType.LINKEDIN:
      // LinkedIn uses a custom signature verification protocol
      const expectedSignatureLinkedIn = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('base64');
      isValid = signature === expectedSignatureLinkedIn;
      break;

    default:
      logger.error({ platform }, 'Unsupported platform for webhook verification');
      return false;
  }

  return isValid;
}

/**
 * Parses and normalizes raw webhook payload from different platforms into a standardized format
 * @param PlatformType platform
 * @param any rawPayload
 * @returns PlatformWebhookEvent Normalized webhook event object
 */
export function parseWebhookPayload(platform: PlatformType, rawPayload: any): PlatformWebhookEvent {
  // Determine the event type based on platform-specific payload structure
  let eventType: string;

  // Extract essential fields like content ID, creator ID, timestamp, etc.
  let contentId: string;
  let creatorId: string;
  let timestamp: Date;
  let signature: string;
  let payload: any;

  // Transform platform-specific data into standardized PlatformWebhookEvent format
  switch (platform) {
    case PlatformType.YOUTUBE:
      eventType = 'video.created';
      contentId = rawPayload.feed.entry['yt:videoId'];
      creatorId = rawPayload.feed.entry['yt:channelId'];
      timestamp = new Date(rawPayload.feed.entry.published);
      signature = rawPayload['http://pubsubhubbub.googlecode.com/ns/atom']?.signature;
      payload = rawPayload;
      break;

    case PlatformType.INSTAGRAM:
      eventType = 'metrics.updated';
      contentId = rawPayload.entry[0].id;
      creatorId = rawPayload.entry[0].changed_fields[0];
      timestamp = new Date(rawPayload.entry[0].time);
      signature = rawPayload.headers['x-hub-signature'];
      payload = rawPayload;
      break;

    case PlatformType.TIKTOK:
      eventType = 'content.created';
      contentId = rawPayload.data.id;
      creatorId = rawPayload.data.creator_id;
      timestamp = new Date(rawPayload.data.timestamp);
      signature = rawPayload.headers['x-signature'];
      payload = rawPayload;
      break;

    case PlatformType.TWITTER:
      eventType = 'metrics.updated';
      contentId = rawPayload.tweet_create_events[0].id;
      creatorId = rawPayload.tweet_create_events[0].user.id;
      timestamp = new Date(rawPayload.tweet_create_events[0].created_at);
      signature = rawPayload.headers['x-twitter-webhooks-signature'];
      payload = rawPayload;
      break;

    case PlatformType.LINKEDIN:
      eventType = 'content.updated';
      contentId = rawPayload.data.values[0].urn.split(':').pop();
      creatorId = rawPayload.data.values[0].actor.split(':').pop();
      timestamp = new Date(rawPayload.data.values[0].lastModified);
      signature = rawPayload.headers['x-li-signature'];
      payload = rawPayload;
      break;

    default:
      throw new BadRequestError('Unsupported platform for webhook', { platform });
  }

  // Add proper event type classification (content.created, metrics.updated, etc.)
  const normalizedEvent: PlatformWebhookEvent = {
    platformType: platform,
    eventType,
    timestamp,
    signature,
    payload
  };

  // Validate the parsed event has all required fields
  if (!normalizedEvent.platformType || !normalizedEvent.eventType || !normalizedEvent.timestamp) {
    throw new BadRequestError('Missing required fields in webhook event', { event: normalizedEvent });
  }

  return normalizedEvent;
}

/**
 * Processes webhook events related to content updates (creation, modification, deletion)
 * @param PlatformType platform
 * @param PlatformWebhookEvent event
 * @returns Promise<object> Processing result
 */
async function processContentUpdateEvent(platform: PlatformType, event: PlatformWebhookEvent): Promise<object> {
  logger.info({ platform, eventType: event.eventType }, 'Processing content update event');

  // Extract content details from the standardized event
  const contentDetails = event.payload.data;

  // Check if content already exists by external ID
  const existingContent = await ContentService.findContentByExternalId(platform, contentDetails.id);

  if (existingContent) {
    // For updated content: Update existing content with new details
    await ContentService.updateContent({
      id: existingContent.id,
      title: contentDetails.title,
      description: contentDetails.description,
      url: contentDetails.url,
      thumbnail: contentDetails.thumbnail
    });
  } else {
    // For new content: Create new content entry using ContentService
    await ContentService.createContent({
      platformId: platform,
      externalId: contentDetails.id,
      title: contentDetails.title,
      description: contentDetails.description,
      url: contentDetails.url,
      thumbnail: contentDetails.thumbnail,
      contentType: contentDetails.contentType,
      publishedAt: contentDetails.publishedAt,
      metadata: contentDetails.metadata
    });
  }

  // Queue a job to detect potential relationships with other content
  await QueueService.addJob('relationship_detection', { contentId: contentDetails.id });

  return { status: 'success', contentId: contentDetails.id };
}

/**
 * Processes webhook events related to content metrics updates
 * @param PlatformType platform
 * @param PlatformWebhookEvent event
 * @returns Promise<object> Processing result
 */
async function processMetricsUpdateEvent(platform: PlatformType, event: PlatformWebhookEvent): Promise<object> {
  logger.info({ platform, eventType: event.eventType }, 'Processing metrics update event');

  // Extract metrics data and content identifier from the event
  const metricsData = event.payload.data;
  const contentId = event.payload.contentId;

  // Retrieve content ID from external ID if necessary
  const content = await ContentService.findContentByExternalId(platform, contentId);
  if (!content) {
    throw new NotFoundError(`Content with external ID '${contentId}' not found on platform '${platform}'`, 'Content', contentId);
  }

  // Process metrics using analyticsService.processContentMetrics
  await analyticsService.processContentMetrics(content.id, metricsData);

  // If metrics change is significant, queue insight generation
  // TODO: Implement logic to determine if metrics change is significant

  return { status: 'success', contentId: content.id, metrics: metricsData };
}

/**
 * Processes webhook events related to audience demographics updates
 * @param PlatformType platform
 * @param PlatformWebhookEvent event
 * @returns Promise<object> Processing result
 */
async function processAudienceUpdateEvent(platform: PlatformType, event: PlatformWebhookEvent): Promise<object> {
  logger.info({ platform, eventType: event.eventType }, 'Processing audience update event');

  // Extract audience data and platform/creator identifiers
  const audienceData = event.payload.data;
  const creatorId = event.payload.creatorId;

  // Update audience demographics in the database
  await analyticsService.updateAudienceDemographics(creatorId, audienceData);

  // Queue insight generation if significant changes detected
  // TODO: Implement logic to determine if audience change is significant

  return { status: 'success', creatorId, audienceData };
}

/**
 * Main handler for processing webhook events from all platforms based on event type
 * @param PlatformType platform
 * @param PlatformWebhookEvent event
 * @returns Promise<object> Processing result with status information
 */
export async function processWebhookEvent(platform: PlatformType, event: PlatformWebhookEvent): Promise<object> {
  logger.info({ platform, eventType: event.eventType }, 'Processing webhook event');

  try {
    // Route to the appropriate handler based on event type:
    switch (event.eventType) {
      case 'content.created':
      case 'content.updated':
        return await processContentUpdateEvent(platform, event);
      case 'metrics.updated':
        return await processMetricsUpdateEvent(platform, event);
      case 'audience.updated':
        return await processAudienceUpdateEvent(platform, event);
      default:
        logger.error({ eventType: event.eventType }, 'Unexpected webhook event type');
        throw new BadRequestError(`Unexpected webhook event type: ${event.eventType}`, { eventType: event.eventType });
    }
  } catch (error) {
    // Capture and log any errors during processing
    logger.error({ error: error.message, eventType: event.eventType }, 'Error processing webhook event');
    return { status: 'error', message: error.message };
  }
}

/**
 * Manages webhook registrations, verifications, and processing for all supported platforms
 */
export class WebhookManager {
  private readonly platformConfigs: Map<PlatformType, object>;
  private readonly queueService: QueueService;
  private readonly contentService: ContentService;
  private readonly eventHandlers: Map<string, Function>;

  /**
   * Initializes the WebhookManager with necessary configurations and services
   * @param object options
   */
  constructor(options: object) {
    // Initialize platform configurations map with secrets and endpoints
    this.platformConfigs = new Map<PlatformType, object>();

    // Initialize services (queue, content, analytics, etc.)
    this.queueService = new QueueService();
    this.contentService = new ContentService();

    // Set up event handlers for different webhook event types
    this.eventHandlers = new Map<string, Function>();
    this.eventHandlers.set('content.created', processContentUpdateEvent);
    this.eventHandlers.set('content.updated', processContentUpdateEvent);
    this.eventHandlers.set('metrics.updated', processMetricsUpdateEvent);
    this.eventHandlers.set('audience.updated', processAudienceUpdateEvent);

    // Load platform-specific verification settings
    // TODO: Implement loading of platform-specific verification settings
  }

  /**
   * Registers a webhook with a specific platform for a creator
   * @param string platformId
   * @param object options
   * @returns Promise<object> Registration result with webhook URL and status
   */
  async registerWebhook(platformId: string, options: object): Promise<object> {
    // Validate platform ID exists in database
    const platform = await platformModel.findPlatformById(platformId);
    if (!platform) {
      throw new NotFoundError(`Platform with ID '${platformId}' not found`, 'Platform', platformId);
    }

    // Determine callback URL for platform webhook
    const callbackUrl = `${config.BASE_URL}/api/webhooks/${platform.platformType}`;

    // Call platform-specific adapter to register webhook
    const adapter = platformAdapters.getPlatformAdapter(platform.platformType);
    const registrationResult = await adapter.registerWebhook(callbackUrl, options);

    // Update platform record with webhook registration details
    await platformModel.updatePlatformWebhookStatus(platformId, registrationResult.status, registrationResult.webhookId);

    // Return registration result with webhook URL and status
    return {
      webhookUrl: callbackUrl,
      status: registrationResult.status
    };
  }

  /**
   * Unregisters a previously registered webhook from a platform
   * @param string platformId
   * @returns Promise<boolean> True if successfully unregistered
   */
  async unregisterWebhook(platformId: string): Promise<boolean> {
    // Validate platform ID exists in database
    const platform = await platformModel.findPlatformById(platformId);
    if (!platform) {
      throw new NotFoundError(`Platform with ID '${platformId}' not found`, 'Platform', platformId);
    }

    // Call platform-specific adapter to unregister webhook
    const adapter = platformAdapters.getPlatformAdapter(platform.platformType);
    const unregistrationResult = await adapter.unregisterWebhook(platform.webhookId);

    // Update platform record to remove webhook registration details
    await platformModel.updatePlatformWebhookStatus(platformId, 'unregistered', null);

    // Return success status
    return unregistrationResult.success;
  }

  /**
   * Processes an incoming webhook request from a platform
   * @param PlatformType platform
   * @param object payload
   * @param object headers
   * @returns Promise<object> Processing result
   */
  async handleWebhook(platform: PlatformType, payload: object, headers: object): Promise<object> {
    // Extract signature from request headers based on platform
    const signature = headers['x-hub-signature'] || headers['x-twitter-webhooks-signature'];

    // Verify webhook signature using verifyWebhookSignature
    const isValidSignature = verifyWebhookSignature(platform, signature, JSON.stringify(payload), config.PLATFORM_CONFIG[platform].webhookSecret);
    if (!isValidSignature) {
      throw new UnauthorizedError('Invalid webhook signature', { platform });
    }

    // Parse webhook payload using parseWebhookPayload
    const event: PlatformWebhookEvent = parseWebhookPayload(platform, payload);

    // Determine if event should be processed synchronously or queued
    if (event.eventType === 'metrics.updated') {
      // For urgent events: Process immediately with processWebhookEvent
      return await processWebhookEvent(platform, event);
    } else {
      // For non-urgent events: Queue event for background processing
      await this.queueService.addJob('webhook_processing', { platform, event });
      return { status: 'queued' };
    }

    // Log the webhook handling completion
    logger.info({ platform, eventType: event.eventType }, 'Webhook handling completed');
  }

  /**
   * Handles verification challenges from platforms during webhook registration
   * @param PlatformType platform
   * @param object payload
   * @returns object Challenge response expected by the platform
   */
  async verifyChallenge(platform: PlatformType, payload: object): Promise<object> {
    // Identify if payload contains a platform challenge request
    // Extract challenge token/value from platform-specific payload
    // Generate appropriate challenge response based on platform requirements
    // Return challenge response in format expected by platform
    return {};
  }

  /**
   * Returns a list of supported webhook event types by platform
   * @param PlatformType platform
   * @returns string[] List of supported event types
   */
  getSupportedEventTypes(platform: PlatformType): string[] {
    // Look up platform configuration for supported events
    // Return list of event types supported for the platform
    return [];
  }
}

export default WebhookManager;