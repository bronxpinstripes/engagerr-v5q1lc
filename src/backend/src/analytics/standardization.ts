/**
 * Metrics standardization module for the Engagerr analytics engine.
 * 
 * Provides functions to standardize metrics across different social media platforms,
 * enabling fair comparison and aggregation of performance data.
 */

import { get, isEmpty, isNil } from 'lodash'; // v4.17.21
import { AnalyticsTypes } from '../types/analytics';
import { ContentTypes } from '../types/content';
import { PlatformTypes } from '../types/platform';
import { ANALYTICS_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

// Platform-specific standardization configuration
export const PLATFORM_STANDARDIZATION_CONFIG = {
  YOUTUBE: {
    engagementWeight: 1.0,
    viewWeight: 1.0,
    shareWeight: 1.5,
    commentWeight: 1.2,
    likeWeight: 0.8,
    platformEngagementFactor: 1.0,
    platformValueFactor: 1.2,
    metricMappings: {
      likes: 'likes',
      comments: 'comments',
      shares: 'shares',
      views: 'views',
      watchTime: 'minutes_watched'
    }
  },
  INSTAGRAM: {
    engagementWeight: 1.2,
    viewWeight: 0.9,
    shareWeight: 1.8,
    commentWeight: 1.5,
    likeWeight: 1.0,
    platformEngagementFactor: 1.2,
    platformValueFactor: 1.4,
    metricMappings: {
      likes: 'likes',
      comments: 'comments',
      shares: 'shares',
      saves: 'bookmarks',
      views: 'impressions'
    }
  },
  TIKTOK: {
    engagementWeight: 1.3,
    viewWeight: 0.8,
    shareWeight: 2.0,
    commentWeight: 1.4,
    likeWeight: 1.0,
    platformEngagementFactor: 1.3,
    platformValueFactor: 1.1,
    metricMappings: {
      likes: 'likes',
      comments: 'comments',
      shares: 'shares',
      views: 'views',
      watchTime: 'total_time_watched'
    }
  },
  TWITTER: {
    engagementWeight: 0.9,
    viewWeight: 0.7,
    shareWeight: 1.6,
    commentWeight: 1.5,
    likeWeight: 0.7,
    platformEngagementFactor: 0.9,
    platformValueFactor: 0.8,
    metricMappings: {
      likes: 'favorites',
      comments: 'replies',
      shares: 'retweets',
      views: 'impressions'
    }
  },
  LINKEDIN: {
    engagementWeight: 1.1,
    viewWeight: 0.8,
    shareWeight: 2.0,
    commentWeight: 1.7,
    likeWeight: 0.9,
    platformEngagementFactor: 0.9,
    platformValueFactor: 1.5,
    metricMappings: {
      likes: 'likes',
      comments: 'comments',
      shares: 'shares',
      views: 'impressions'
    }
  }
};

// Content type value multipliers
export const CONTENT_TYPE_VALUE_MULTIPLIERS = {
  VIDEO: 1.5,
  SHORT_VIDEO: 1.2,
  PHOTO: 1.0,
  CAROUSEL: 1.3,
  STORY: 0.7,
  POST: 1.0,
  ARTICLE: 1.4,
  PODCAST: 1.8,
  OTHER: 1.0
};

// Default value multiplier
export const DEFAULT_VALUE_MULTIPLIER = 0.01;

/**
 * Standardizes platform-specific metrics into a unified format for comparison
 * @param rawMetrics Raw metrics from a specific platform
 * @param platformType Platform type
 * @param contentType Content type
 * @returns Standardized metrics object
 */
export function standardizeMetrics(
  rawMetrics: Record<string, any>,
  platformType: PlatformTypes.PlatformType,
  contentType: ContentTypes.ContentType
): ContentTypes.ContentMetrics {
  const config = getPlatformStandardizationConfig(platformType);
  const standardizedMetrics: Partial<ContentTypes.ContentMetrics> = {
    id: get(rawMetrics, 'id', ''),
    contentId: get(rawMetrics, 'contentId', get(rawMetrics, 'id', '')),
    lastUpdated: new Date(),
    platformSpecificMetrics: {}
  };
  
  logger.debug(`Standardizing metrics for ${platformType} content: ${standardizedMetrics.contentId}`);
  
  // Map platform-specific metric names to standard names
  Object.entries(config.metricMappings).forEach(([standardKey, platformKey]) => {
    if (!isNil(get(rawMetrics, platformKey))) {
      standardizedMetrics[standardKey] = rawMetrics[platformKey];
    }
  });
  
  // Store any non-mapped metrics in platformSpecificMetrics
  Object.entries(rawMetrics).forEach(([key, value]) => {
    const isStandardMetric = Object.values(config.metricMappings).includes(key);
    const isBasicField = ['id', 'contentId', 'lastUpdated'].includes(key);
    
    if (!isStandardMetric && !isBasicField) {
      standardizedMetrics.platformSpecificMetrics[key] = value;
    }
  });
  
  // Ensure we have the required metrics with fallbacks to 0
  standardizedMetrics.views = get(standardizedMetrics, 'views', 0);
  standardizedMetrics.likes = get(standardizedMetrics, 'likes', 0);
  standardizedMetrics.comments = get(standardizedMetrics, 'comments', 0);
  standardizedMetrics.shares = get(standardizedMetrics, 'shares', 0);
  standardizedMetrics.watchTime = get(standardizedMetrics, 'watchTime', 0);
  
  // Calculate total engagements (likes + comments + shares + other engagements)
  const interactions = {
    likes: standardizedMetrics.likes,
    comments: standardizedMetrics.comments,
    shares: standardizedMetrics.shares
  };
  standardizedMetrics.engagements = calculateStandardizedEngagement(interactions, platformType);
  
  // Calculate standardized engagement rate
  standardizedMetrics.engagementRate = calculateEngagementRate(
    standardizedMetrics.engagements,
    standardizedMetrics.views,
    platformType
  );
  
  // Calculate estimated content value
  standardizedMetrics.estimatedValue = calculateContentValue(
    standardizedMetrics as ContentTypes.ContentMetrics,
    platformType,
    contentType
  );
  
  logger.debug(`Standardized metrics for ${platformType}: Engagements=${standardizedMetrics.engagements}, ER=${standardizedMetrics.engagementRate.toFixed(2)}%, Value=$${standardizedMetrics.estimatedValue.toFixed(2)}`);
  
  return standardizedMetrics as ContentTypes.ContentMetrics;
}

/**
 * Standardizes all metrics from a specific platform by applying platform-specific rules
 * @param metricsArray Array of raw metrics from a platform
 * @param platformType Platform type
 * @returns Array of standardized metrics
 */
export function standardizePlatformMetrics(
  metricsArray: ContentTypes.ContentMetrics[],
  platformType: PlatformTypes.PlatformType
): ContentTypes.ContentMetrics[] {
  if (!Array.isArray(metricsArray) || isEmpty(metricsArray)) {
    logger.debug(`No metrics to standardize for platform: ${platformType}`);
    return [];
  }
  
  logger.debug(`Standardizing ${metricsArray.length} metrics for platform: ${platformType}`);
  
  // Apply standardization to each metrics object
  const standardizedMetrics = metricsArray.map(metrics => {
    try {
      // Determine content type or use a default
      const contentType = get(metrics, 'contentType', ContentTypes.ContentType.OTHER);
      
      return standardizeMetrics(metrics, platformType, contentType);
    } catch (error) {
      logger.error(`Error standardizing metrics for content ID ${get(metrics, 'contentId', 'unknown')}: ${error.message}`);
      return metrics; // Return original metrics on error
    }
  });
  
  return standardizedMetrics;
}

/**
 * Standardizes time series metrics data for consistent comparison across platforms
 * @param timeSeriesData Array of time series data points
 * @param platformType Platform type
 * @param contentType Content type
 * @returns Standardized daily metrics
 */
export function standardizeTimeSeriesMetrics(
  timeSeriesData: Record<string, any>[],
  platformType: PlatformTypes.PlatformType,
  contentType: ContentTypes.ContentType
): AnalyticsTypes.DailyMetrics[] {
  // Validate time series data
  if (!Array.isArray(timeSeriesData) || isEmpty(timeSeriesData)) {
    logger.debug('Empty or invalid time series data provided');
    return [];
  }
  
  logger.debug(`Standardizing time series data with ${timeSeriesData.length} points for ${platformType}`);
  
  // Group time series data by date
  const groupedByDate = timeSeriesData.reduce((acc, dataPoint) => {
    const date = get(dataPoint, 'date') ? new Date(dataPoint.date) : new Date();
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!acc[dateString]) {
      acc[dateString] = [];
    }
    
    acc[dateString].push(dataPoint);
    return acc;
  }, {} as Record<string, Record<string, any>[]>);
  
  // Process each date's data
  const result: AnalyticsTypes.DailyMetrics[] = [];
  
  Object.entries(groupedByDate).forEach(([dateString, dataPoints]) => {
    try {
      // Aggregate data points for the same date
      const aggregatedData = dataPoints.reduce((acc, dataPoint) => {
        Object.entries(dataPoint).forEach(([key, value]) => {
          if (key !== 'date' && typeof value === 'number') {
            acc[key] = (acc[key] || 0) + value;
          } else if (key !== 'date') {
            acc[key] = value;
          }
        });
        return acc;
      }, {} as Record<string, any>);
      
      // Standardize the aggregated data
      const standardized = standardizeMetrics(aggregatedData, platformType, contentType);
      
      // Create daily metrics object
      const dailyMetrics: AnalyticsTypes.DailyMetrics = {
        id: `${standardized.contentId}-${dateString}`,
        contentId: standardized.contentId,
        date: new Date(dateString),
        views: standardized.views,
        engagements: standardized.engagements,
        engagementRate: standardized.engagementRate,
        shares: standardized.shares,
        comments: standardized.comments,
        likes: standardized.likes,
        watchTime: standardized.watchTime,
        estimatedValue: standardized.estimatedValue,
        platformSpecificMetrics: standardized.platformSpecificMetrics,
        lastUpdated: new Date()
      };
      
      result.push(dailyMetrics);
    } catch (error) {
      logger.error(`Error standardizing time series data for date ${dateString}: ${error.message}`);
    }
  });
  
  // Ensure results are sorted by date
  result.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  logger.debug(`Standardized ${result.length} days of time series data`);
  
  return result;
}

/**
 * Calculates standardized engagement rate from raw metrics and platform type
 * @param engagements Number of engagements
 * @param views Number of views
 * @param platformType Platform type
 * @returns Standardized engagement rate as a percentage
 */
export function calculateEngagementRate(
  engagements: number,
  views: number,
  platformType: PlatformTypes.PlatformType
): number {
  const config = getPlatformStandardizationConfig(platformType);
  
  // Prevent division by zero
  if (!views || views <= 0) {
    return 0;
  }
  
  // Calculate raw engagement rate
  const rawEngagementRate = (engagements / views) * 100;
  
  // Apply platform-specific normalization factor
  return rawEngagementRate * config.platformEngagementFactor;
}

/**
 * Calculates total standardized engagement by applying weighted factors to different interaction types
 * @param interactions Record of interaction counts (likes, comments, shares, etc.)
 * @param platformType Platform type
 * @returns Standardized total engagement value
 */
export function calculateStandardizedEngagement(
  interactions: Record<string, number>,
  platformType: PlatformTypes.PlatformType
): number {
  const config = getPlatformStandardizationConfig(platformType);
  let totalEngagement = 0;
  
  // Apply weights to each interaction type
  if (interactions.likes) {
    totalEngagement += interactions.likes * config.likeWeight;
  }
  
  if (interactions.comments) {
    totalEngagement += interactions.comments * config.commentWeight;
  }
  
  if (interactions.shares) {
    totalEngagement += interactions.shares * config.shareWeight;
  }
  
  // For other interactions, use a default weight
  Object.entries(interactions).forEach(([key, value]) => {
    if (!['likes', 'comments', 'shares', 'views'].includes(key) && typeof value === 'number') {
      totalEngagement += value * config.engagementWeight;
    }
  });
  
  return totalEngagement;
}

/**
 * Estimates monetary value of content based on engagement metrics and platform characteristics
 * @param metrics Standardized content metrics
 * @param platformType Platform type
 * @param contentType Content type
 * @returns Estimated content value in USD
 */
export function calculateContentValue(
  metrics: ContentTypes.ContentMetrics,
  platformType: PlatformTypes.PlatformType,
  contentType: ContentTypes.ContentType
): number {
  const config = getPlatformStandardizationConfig(platformType);
  
  // Get content type multiplier
  const contentTypeKey = contentType.toUpperCase();
  const contentMultiplier = CONTENT_TYPE_VALUE_MULTIPLIERS[contentTypeKey] || CONTENT_TYPE_VALUE_MULTIPLIERS.OTHER;
  
  // Calculate base value based on views and engagement rate
  const baseValue = metrics.views * (metrics.engagementRate / 100) * DEFAULT_VALUE_MULTIPLIER;
  
  // Apply platform value factor
  const platformValue = baseValue * config.platformValueFactor;
  
  // Apply content type multiplier
  const contentValue = platformValue * contentMultiplier;
  
  // Add premium for high-value engagement (comments, shares)
  const premiumEngagement = 
    (metrics.comments || 0) * 0.02 + 
    (metrics.shares || 0) * 0.05;
  
  // Calculate final value and round to 2 decimal places
  return Math.round((contentValue + premiumEngagement) * 100) / 100;
}

/**
 * Retrieves standardization configuration for a specific platform
 * @param platformType The platform type to get configuration for
 * @returns Platform standardization configuration
 */
export function getPlatformStandardizationConfig(
  platformType: PlatformTypes.PlatformType
): AnalyticsTypes.MetricsStandardization {
  const platformKey = platformType.toUpperCase();
  
  if (PLATFORM_STANDARDIZATION_CONFIG[platformKey]) {
    return {
      platform: platformType,
      ...PLATFORM_STANDARDIZATION_CONFIG[platformKey]
    };
  }
  
  // Fallback to default configuration
  logger.warn(`No standardization configuration found for platform ${platformType}. Using default.`);
  return {
    platform: platformType,
    engagementWeight: 1.0,
    viewWeight: 1.0,
    shareWeight: 1.0,
    commentWeight: 1.0,
    likeWeight: 1.0,
    platformEngagementFactor: 1.0,
    platformValueFactor: 1.0,
    metricMappings: {
      likes: 'likes',
      comments: 'comments',
      shares: 'shares',
      views: 'views'
    }
  };
}