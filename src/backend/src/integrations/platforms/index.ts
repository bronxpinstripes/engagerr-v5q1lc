/**
 * @file Aggregates and exports all social platform adapters, providing a unified access point for platform integrations.
 * @module integrations/platforms
 * @description This file serves as the central hub for accessing platform-specific implementations that handle authentication, content retrieval, and analytics data fetching from various social media platforms.
 */

import { YouTubeAdapter } from './youtube';
import { InstagramAdapter } from './instagram';
import { TikTokAdapter } from './tiktok';
import { TwitterAdapter } from './twitter';
import { LinkedInAdapter } from './linkedin';
import { PlatformType, PlatformAdapter, PlatformConfig } from '../../types/platform';
import { logger } from '../../utils/logger';
import { PLATFORM_CONFIGS } from '../../config/constants';

/**
 * @function getPlatformAdapter
 * @description Factory function that returns the appropriate platform adapter instance based on the platform type.
 * @param {PlatformType} platformType - The type of the platform for which to retrieve the adapter.
 * @param {PlatformConfig} customConfig - Optional custom configuration for the platform adapter.
 * @returns {PlatformAdapter} The appropriate platform adapter instance.
 * @throws {Error} If an unsupported platform type is provided.
 */
function getPlatformAdapter(platformType: PlatformType, customConfig?: PlatformConfig): PlatformAdapter {
  // 1. Get default configuration for platform from PLATFORM_CONFIGS
  const defaultConfig = PLATFORM_CONFIGS[platformType];

  // 2. Merge default config with any custom configuration provided
  const config = { ...defaultConfig, ...customConfig };

  // 3. Log the initialization of the platform adapter
  logger.info({ platformType }, `Initializing platform adapter for ${platformType}`);

  // 4. Switch on platformType to create appropriate adapter instance
  switch (platformType) {
    // 5. For YOUTUBE: return new YouTubeAdapter instance
    case PlatformType.YOUTUBE:
      return new YouTubeAdapter();

    // 6. For INSTAGRAM: return new InstagramAdapter instance
    case PlatformType.INSTAGRAM:
      return new InstagramAdapter();

    // 7. For TIKTOK: return new TikTokAdapter instance
    case PlatformType.TIKTOK:
      return new TikTokAdapter();

    // 8. For TWITTER: return new TwitterAdapter instance
    case PlatformType.TWITTER:
      return new TwitterAdapter();

    // 9. For LINKEDIN: return new LinkedInAdapter instance
    case PlatformType.LINKEDIN:
      return new LinkedInAdapter();

    // 10. Throw error for unsupported platform types
    default:
      const errorMessage = `Unsupported platform type: ${platformType}`;
      logger.error({ platformType }, errorMessage);
      throw new Error(errorMessage);
  }
}

// Export all platform adapters and the factory function
export {
  YouTubeAdapter,
  InstagramAdapter,
  TikTokAdapter,
  TwitterAdapter,
  LinkedInAdapter,
  getPlatformAdapter
};