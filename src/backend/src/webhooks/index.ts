import { handleStripeWebhook, processStripeEvent, verifyWebhookSignature } from './stripe'; // Import Stripe webhook handling functions
import WebhookManager from './platforms'; // Import WebhookManager class for platform-specific webhooks
import { logger } from '../utils/logger'; // Import structured logging utility

// Create a singleton instance of WebhookManager for direct access
const platformWebhookManager = new WebhookManager({});

/**
 * Central registry class that manages webhook handling across all supported services
 */
export default class WebhookRegistry {
  private readonly platformWebhookManager: WebhookManager;
  private readonly logger: object;

  /**
   * Initializes the webhook registry with necessary managers
   */
  constructor() {
    // Initialize the platform webhook manager
    this.platformWebhookManager = platformWebhookManager;

    // Configure logger for webhook events
    this.logger = logger;
  }

  /**
   * Registers a webhook for a specific platform
   * @param platformId 
   * @param options 
   * @returns Registration result with webhook URL and status
   */
  async registerPlatformWebhook(platformId: string, options: object): Promise<object> {
    // Log webhook registration attempt
    (this.logger as any).info({ platformId, options }, 'Registering platform webhook');

    // Delegate to platformWebhookManager.registerWebhook
    const registrationResult = await this.platformWebhookManager.registerWebhook(platformId, options);

    // Return registration result
    return registrationResult;
  }

  /**
   * Unregisters a webhook from a specific platform
   * @param platformId 
   * @returns Success status of unregistration
   */
  async unregisterPlatformWebhook(platformId: string): Promise<boolean> {
    // Log webhook unregistration attempt
    (this.logger as any).info({ platformId }, 'Unregistering platform webhook');

    // Delegate to platformWebhookManager.unregisterWebhook
    const unregistrationResult = await this.platformWebhookManager.unregisterWebhook(platformId);

    // Return success status
    return unregistrationResult;
  }

  /**
   * Handles an incoming webhook from a platform
   * @param platform 
   * @param payload 
   * @param headers 
   * @returns Processing result
   */
  async handlePlatformWebhook(platform: string, payload: object, headers: object): Promise<object> {
    // Log incoming platform webhook
    (this.logger as any).info({ platform, payload, headers }, 'Handling platform webhook');

    // Delegate to platformWebhookManager.handleWebhook
    const processingResult = await this.platformWebhookManager.handleWebhook(platform, payload, headers);

    // Return processing result
    return processingResult;
  }

  /**
   * Gets supported event types for a specific platform
   * @param platform 
   * @returns List of supported event types
   */
  getSupportedPlatformEvents(platform: string): string[] {
    // Delegate to platformWebhookManager.getSupportedEventTypes
    const supportedEvents = this.platformWebhookManager.getSupportedEventTypes(platform);

    // Return list of supported event types
    return supportedEvents;
  }
}

// Re-export Stripe webhook handling middleware
export { handleStripeWebhook };

// Re-export webhook signature verification utility
export { verifyWebhookSignature };

// Export the singleton instance of WebhookManager for direct access
export { platformWebhookManager };