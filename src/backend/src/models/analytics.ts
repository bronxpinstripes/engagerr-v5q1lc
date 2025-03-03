/**
 * Core analytics model for managing and processing metrics across platforms
 * 
 * Provides functions for storing, retrieving, standardizing, and calculating metrics
 * across different platforms, content families, and time periods.
 */

import { Prisma } from '@prisma/client';
import dayjs from 'dayjs'; // ^1.11.9

import { prisma, prismaRead } from '../config/database';
import { logger } from '../utils/logger';
import { AnalyticsTypes } from '../types/analytics';
import { ContentTypes } from '../types/content';
import { PlatformTypes } from '../types/platform';
import { standardizeMetrics } from '../analytics/standardization';
import contentRelationshipModel from './contentRelationship';
import { ApiError } from '../utils/errors';

/**
 * Stores daily metrics for a specific content item
 * 
 * @param contentId ID of the content item
 * @param metrics Metrics data to store
 * @returns Promise resolving to the stored daily metrics
 */
async function storeDailyMetrics(
  contentId: string,
  metrics: AnalyticsTypes.DailyMetrics
): Promise<AnalyticsTypes.DailyMetrics> {
  try {
    logger.info({ contentId }, 'Storing daily metrics for content');
    
    // Check if metrics already exist for this date and content
    const existingMetrics = await prisma.dailyMetrics.findFirst({
      where: {
        contentId,
        date: metrics.date
      }
    });
    
    // If metrics exist, update them
    if (existingMetrics) {
      logger.info({ contentId, date: metrics.date }, 'Updating existing daily metrics');
      
      const updatedMetrics = await prisma.dailyMetrics.update({
        where: { id: existingMetrics.id },
        data: {
          views: metrics.views,
          engagements: metrics.engagements,
          engagementRate: metrics.engagementRate,
          shares: metrics.shares,
          comments: metrics.comments,
          likes: metrics.likes,
          watchTime: metrics.watchTime,
          estimatedValue: metrics.estimatedValue,
          platformSpecificMetrics: metrics.platformSpecificMetrics as Prisma.JsonObject,
          lastUpdated: new Date()
        }
      });
      
      return updatedMetrics as unknown as AnalyticsTypes.DailyMetrics;
    } 
    // Otherwise, create new metrics
    else {
      logger.info({ contentId, date: metrics.date }, 'Creating new daily metrics');
      
      const newMetrics = await prisma.dailyMetrics.create({
        data: {
          contentId,
          date: metrics.date,
          views: metrics.views,
          engagements: metrics.engagements,
          engagementRate: metrics.engagementRate,
          shares: metrics.shares,
          comments: metrics.comments,
          likes: metrics.likes,
          watchTime: metrics.watchTime,
          estimatedValue: metrics.estimatedValue,
          platformSpecificMetrics: metrics.platformSpecificMetrics as Prisma.JsonObject,
          lastUpdated: new Date()
        }
      });
      
      return newMetrics as unknown as AnalyticsTypes.DailyMetrics;
    }
  } catch (error) {
    logger.error({
      contentId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to store daily metrics');
    
    throw error;
  }
}

/**
 * Retrieves daily metrics for a specific content item within a date range
 * 
 * @param contentId ID of the content item
 * @param startDate Start date for the metrics range
 * @param endDate End date for the metrics range
 * @returns Promise resolving to an array of daily metrics
 */
async function getDailyMetricsForContent(
  contentId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsTypes.DailyMetrics[]> {
  try {
    // Validate date range
    if (startDate > endDate) {
      throw new ApiError('Start date cannot be after end date', 400);
    }
    
    logger.info({ contentId, startDate, endDate }, 'Retrieving daily metrics for content');
    
    // Query metrics for the content within the date range
    const metrics = await prismaRead.dailyMetrics.findMany({
      where: {
        contentId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    return metrics as unknown as AnalyticsTypes.DailyMetrics[];
  } catch (error) {
    logger.error({
      contentId,
      startDate,
      endDate,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to retrieve daily metrics for content');
    
    throw error;
  }
}

/**
 * Aggregates daily metrics into period-specific metrics for a content item
 * 
 * @param contentId ID of the content item
 * @param period Type of period to aggregate metrics for
 * @param startDate Optional custom start date for custom periods
 * @param endDate Optional custom end date for custom periods
 * @returns Promise resolving to aggregated content metrics
 */
async function getContentMetricsForPeriod(
  contentId: string,
  period: AnalyticsTypes.MetricPeriod,
  startDate?: Date,
  endDate?: Date
): Promise<ContentTypes.ContentMetrics> {
  try {
    logger.info({ contentId, period, startDate, endDate }, 'Getting content metrics for period');
    
    // Calculate date range based on period
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (period === AnalyticsTypes.MetricPeriod.CUSTOM && startDate && endDate) {
      rangeStart = startDate;
      rangeEnd = endDate;
    } else {
      const now = dayjs();
      
      switch (period) {
        case AnalyticsTypes.MetricPeriod.DAY:
          rangeStart = now.startOf('day').toDate();
          rangeEnd = now.endOf('day').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.WEEK:
          rangeStart = now.startOf('week').toDate();
          rangeEnd = now.endOf('week').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.MONTH:
          rangeStart = now.startOf('month').toDate();
          rangeEnd = now.endOf('month').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.QUARTER:
          rangeStart = now.startOf('quarter').toDate();
          rangeEnd = now.endOf('quarter').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.YEAR:
          rangeStart = now.startOf('year').toDate();
          rangeEnd = now.endOf('year').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.ALL_TIME:
          rangeStart = new Date(0); // Beginning of time
          rangeEnd = now.toDate();
          break;
        default:
          rangeStart = now.subtract(30, 'day').toDate(); // Default to last 30 days
          rangeEnd = now.toDate();
      }
    }
    
    // Fetch daily metrics for the content in the date range
    const dailyMetrics = await getDailyMetricsForContent(contentId, rangeStart, rangeEnd);
    
    if (dailyMetrics.length === 0) {
      logger.info({ contentId, period }, 'No metrics found for the specified period');
      
      // Return empty metrics structure
      return {
        id: '',
        contentId,
        views: 0,
        engagements: 0,
        engagementRate: 0,
        shares: 0,
        comments: 0,
        likes: 0,
        watchTime: 0,
        estimatedValue: 0,
        platformSpecificMetrics: {},
        lastUpdated: new Date()
      };
    }
    
    // Aggregate metrics
    const aggregateMetrics: ContentTypes.ContentMetrics = {
      id: `${contentId}-${period}`,
      contentId,
      views: 0,
      engagements: 0,
      shares: 0,
      comments: 0,
      likes: 0,
      watchTime: 0,
      engagementRate: 0,
      estimatedValue: 0,
      platformSpecificMetrics: {},
      lastUpdated: new Date()
    };
    
    // Sum up metrics across all days
    dailyMetrics.forEach(metrics => {
      aggregateMetrics.views += metrics.views || 0;
      aggregateMetrics.engagements += metrics.engagements || 0;
      aggregateMetrics.shares += metrics.shares || 0;
      aggregateMetrics.comments += metrics.comments || 0;
      aggregateMetrics.likes += metrics.likes || 0;
      aggregateMetrics.watchTime += metrics.watchTime || 0;
      aggregateMetrics.estimatedValue += metrics.estimatedValue || 0;
      
      // Track the latest update timestamp
      if (metrics.lastUpdated > aggregateMetrics.lastUpdated) {
        aggregateMetrics.lastUpdated = metrics.lastUpdated;
      }
    });
    
    // Calculate engagement rate based on aggregated metrics
    if (aggregateMetrics.views > 0) {
      aggregateMetrics.engagementRate = (aggregateMetrics.engagements / aggregateMetrics.views) * 100;
    }
    
    logger.info({ 
      contentId, 
      period, 
      views: aggregateMetrics.views,
      engagements: aggregateMetrics.engagements
    }, 'Aggregated content metrics for period');
    
    return aggregateMetrics;
  } catch (error) {
    logger.error({
      contentId,
      period,
      startDate,
      endDate,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to get content metrics for period');
    
    throw error;
  }
}

/**
 * Retrieves time-series data for specified metrics
 * 
 * @param contentId ID of the content item
 * @param metricNames Array of metric names to retrieve time series data for
 * @param startDate Start date for the time series
 * @param endDate End date for the time series
 * @param granularity Time granularity (daily, weekly, etc.)
 * @returns Promise resolving to time series data for each requested metric
 */
async function getTimeSeriesMetrics(
  contentId: string,
  metricNames: string[],
  startDate: Date,
  endDate: Date,
  granularity: string = 'daily'
): Promise<Record<string, AnalyticsTypes.TimeSeriesData>> {
  try {
    // Validate inputs
    if (!contentId) {
      throw new ApiError('Content ID is required', 400);
    }
    
    if (!metricNames || metricNames.length === 0) {
      throw new ApiError('At least one metric name is required', 400);
    }
    
    if (startDate > endDate) {
      throw new ApiError('Start date cannot be after end date', 400);
    }
    
    logger.info({ contentId, metricNames, startDate, endDate, granularity }, 'Retrieving time series metrics');
    
    // Get all daily metrics within the date range
    const dailyMetrics = await getDailyMetricsForContent(contentId, startDate, endDate);
    
    // Validate supported metrics
    const supportedMetrics = ['views', 'engagements', 'shares', 'comments', 'likes', 'watchTime', 'engagementRate', 'estimatedValue'];
    const validMetrics = metricNames.filter(name => supportedMetrics.includes(name));
    
    if (validMetrics.length === 0) {
      throw new ApiError(`No valid metrics specified. Supported metrics are: ${supportedMetrics.join(', ')}`, 400);
    }
    
    // Prepare result object with time series data for each metric
    const result: Record<string, AnalyticsTypes.TimeSeriesData> = {};
    
    // Group data points by granularity
    const groupedData: Record<string, AnalyticsTypes.DailyMetrics[]> = {};
    
    dailyMetrics.forEach(metric => {
      let key: string;
      
      switch (granularity.toLowerCase()) {
        case 'hourly':
          key = dayjs(metric.date).format('YYYY-MM-DD HH:00');
          break;
        case 'weekly':
          key = dayjs(metric.date).startOf('week').format('YYYY-MM-DD');
          break;
        case 'monthly':
          key = dayjs(metric.date).format('YYYY-MM');
          break;
        case 'daily':
        default:
          key = dayjs(metric.date).format('YYYY-MM-DD');
      }
      
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      
      groupedData[key].push(metric);
    });
    
    // Create time series data for each requested metric
    validMetrics.forEach(metricName => {
      const dataPoints: { date: Date; value: number }[] = [];
      let granularityEnum: AnalyticsTypes.MetricGranularity;
      
      switch (granularity.toLowerCase()) {
        case 'hourly':
          granularityEnum = AnalyticsTypes.MetricGranularity.HOURLY;
          break;
        case 'weekly':
          granularityEnum = AnalyticsTypes.MetricGranularity.WEEKLY;
          break;
        case 'monthly':
          granularityEnum = AnalyticsTypes.MetricGranularity.MONTHLY;
          break;
        case 'daily':
        default:
          granularityEnum = AnalyticsTypes.MetricGranularity.DAILY;
      }
      
      // Convert grouped data to data points
      Object.entries(groupedData).forEach(([dateKey, metrics]) => {
        // Aggregate values for this time period
        let aggregatedValue = 0;
        
        metrics.forEach(metric => {
          aggregatedValue += metric[metricName] || 0;
        });
        
        // For rate metrics (like engagement rate), calculate the average
        if (metricName.includes('Rate')) {
          aggregatedValue = aggregatedValue / metrics.length;
        }
        
        dataPoints.push({
          date: dayjs(dateKey).toDate(),
          value: aggregatedValue
        });
      });
      
      // Sort data points by date
      dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Calculate trend (percentage change from first to last point)
      let trend = 'stable';
      let percentChange = 0;
      
      if (dataPoints.length >= 2) {
        const firstValue = dataPoints[0].value;
        const lastValue = dataPoints[dataPoints.length - 1].value;
        
        if (firstValue > 0) {
          percentChange = ((lastValue - firstValue) / firstValue) * 100;
          
          if (percentChange > 5) {
            trend = 'increasing';
          } else if (percentChange < -5) {
            trend = 'decreasing';
          }
        }
      }
      
      // Add time series to result
      result[metricName] = {
        metricName,
        granularity: granularityEnum,
        startDate,
        endDate,
        dataPoints,
        trend,
        percentChange
      };
    });
    
    logger.info({
      contentId,
      metrics: Object.keys(result),
      pointCount: Object.values(result).reduce((sum, series) => sum + series.dataPoints.length, 0)
    }, 'Generated time series data');
    
    return result;
  } catch (error) {
    logger.error({
      contentId,
      metricNames,
      startDate,
      endDate,
      granularity,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to get time series metrics');
    
    throw error;
  }
}

/**
 * Retrieves aggregated metrics for a content family
 * 
 * @param rootContentId ID of the root content item
 * @param period Type of period to aggregate metrics for
 * @param startDate Optional custom start date for custom periods
 * @param endDate Optional custom end date for custom periods
 * @returns Promise resolving to family metrics
 */
async function getContentFamilyMetrics(
  rootContentId: string,
  period: AnalyticsTypes.MetricPeriod,
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsTypes.FamilyMetrics> {
  try {
    logger.info({ rootContentId, period, startDate, endDate }, 'Getting content family metrics');
    
    // Get the content family hierarchy
    const contentFamily = await contentRelationshipModel.getContentFamily(rootContentId);
    
    if (!contentFamily || contentFamily.nodes.length === 0) {
      throw new ApiError(`No content family found for root content ID: ${rootContentId}`, 404);
    }
    
    // Generate date range based on period
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (period === AnalyticsTypes.MetricPeriod.CUSTOM && startDate && endDate) {
      rangeStart = startDate;
      rangeEnd = endDate;
    } else {
      const now = dayjs();
      
      switch (period) {
        case AnalyticsTypes.MetricPeriod.DAY:
          rangeStart = now.startOf('day').toDate();
          rangeEnd = now.endOf('day').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.WEEK:
          rangeStart = now.startOf('week').toDate();
          rangeEnd = now.endOf('week').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.MONTH:
          rangeStart = now.startOf('month').toDate();
          rangeEnd = now.endOf('month').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.QUARTER:
          rangeStart = now.startOf('quarter').toDate();
          rangeEnd = now.endOf('quarter').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.YEAR:
          rangeStart = now.startOf('year').toDate();
          rangeEnd = now.endOf('year').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.ALL_TIME:
          rangeStart = new Date(0); // Beginning of time
          rangeEnd = now.toDate();
          break;
        default:
          rangeStart = now.subtract(30, 'day').toDate(); // Default to last 30 days
          rangeEnd = now.toDate();
      }
    }
    
    // Fetch metrics for each content item in the family
    const contentIds = contentFamily.nodes.map(node => node.id);
    const contentMetrics: Record<string, ContentTypes.ContentMetrics> = {};
    const contentPlatformMap: Record<string, PlatformTypes.PlatformType> = {};
    const contentTypeMap: Record<string, ContentTypes.ContentType> = {};
    
    // Build maps of platform and content type for each content item
    contentFamily.nodes.forEach(node => {
      contentPlatformMap[node.id] = node.platformType as PlatformTypes.PlatformType;
      contentTypeMap[node.id] = node.contentType as ContentTypes.ContentType;
    });
    
    // Fetch metrics for each content item in parallel
    await Promise.all(contentIds.map(async (contentId) => {
      try {
        const metrics = await getContentMetricsForPeriod(
          contentId,
          period,
          rangeStart,
          rangeEnd
        );
        
        // Standardize metrics based on platform
        const platformType = contentPlatformMap[contentId];
        const contentType = contentTypeMap[contentId];
        
        if (platformType && contentType) {
          const standardizedMetrics = standardizeMetrics(
            metrics,
            platformType,
            contentType
          );
          
          contentMetrics[contentId] = standardizedMetrics;
        } else {
          contentMetrics[contentId] = metrics;
        }
      } catch (error) {
        logger.warn({
          contentId,
          error: error instanceof Error ? error.message : String(error)
        }, 'Failed to get metrics for content item in family');
        
        // Continue with other content items
      }
    }));
    
    // Calculate platform breakdown
    const platformBreakdown = await calculatePlatformBreakdown(
      Object.values(contentMetrics),
      contentPlatformMap
    );
    
    // Calculate content type breakdown
    const contentTypeBreakdown = await calculateContentTypeBreakdown(
      Object.values(contentMetrics),
      contentTypeMap
    );
    
    // Calculate audience overlap estimation
    const audienceOverlap: AnalyticsTypes.AudienceOverlap = calculateAudienceOverlap(
      Object.values(contentMetrics),
      contentPlatformMap,
      contentFamily.edges
    );
    
    // Calculate aggregate metrics with audience deduplication
    const aggregateMetrics: AnalyticsTypes.AggregateMetrics = {
      totalViews: 0,
      totalEngagements: 0,
      totalShares: 0,
      totalComments: 0,
      totalLikes: 0,
      totalWatchTime: 0,
      engagementRate: 0,
      viewThroughRate: 0,
      estimatedTotalValue: 0,
      growthRates: {},
      periodStart: rangeStart,
      periodEnd: rangeEnd,
      period
    };
    
    // Sum up metrics from all content items, adjusting for audience overlap
    let totalRawViews = 0;
    
    Object.values(contentMetrics).forEach(metrics => {
      totalRawViews += metrics.views || 0;
      aggregateMetrics.totalEngagements += metrics.engagements || 0;
      aggregateMetrics.totalShares += metrics.shares || 0;
      aggregateMetrics.totalComments += metrics.comments || 0;
      aggregateMetrics.totalLikes += metrics.likes || 0;
      aggregateMetrics.totalWatchTime += metrics.watchTime || 0;
      aggregateMetrics.estimatedTotalValue += metrics.estimatedValue || 0;
    });
    
    // Apply audience deduplication factor to views
    const deduplicationFactor = audienceOverlap.estimatedDuplication / 100;
    aggregateMetrics.totalViews = Math.round(totalRawViews * (1 - deduplicationFactor));
    
    // Calculate overall engagement rate
    if (aggregateMetrics.totalViews > 0) {
      aggregateMetrics.engagementRate = (aggregateMetrics.totalEngagements / aggregateMetrics.totalViews) * 100;
    }
    
    // Calculate view-through rate for video content
    const videoContentCount = Object.values(contentTypeMap)
      .filter(type => type === ContentTypes.ContentType.VIDEO || type === ContentTypes.ContentType.SHORT_VIDEO)
      .length;
    
    if (videoContentCount > 0 && aggregateMetrics.totalViews > 0) {
      aggregateMetrics.viewThroughRate = (aggregateMetrics.totalWatchTime / (aggregateMetrics.totalViews * videoContentCount * 10)) * 100;
    }
    
    // Prepare content items list for the response
    const contentItems = contentFamily.nodes.map(node => ({
      id: node.id,
      title: node.title,
      platform: contentPlatformMap[node.id],
      contentType: contentTypeMap[node.id],
      metrics: contentMetrics[node.id] ? {
        views: contentMetrics[node.id].views || 0,
        engagements: contentMetrics[node.id].engagements || 0,
        engagementRate: contentMetrics[node.id].engagementRate || 0,
        estimatedValue: contentMetrics[node.id].estimatedValue || 0
      } : {}
    }));
    
    // Assemble and return the family metrics
    const familyMetrics: AnalyticsTypes.FamilyMetrics = {
      rootContentId,
      aggregateMetrics,
      platformBreakdown,
      contentTypeBreakdown,
      audienceOverlap,
      uniqueReachEstimate: audienceOverlap.estimatedUniqueReach,
      contentCount: contentFamily.nodes.length,
      platformCount: new Set(Object.values(contentPlatformMap)).size,
      contentItems
    };
    
    logger.info({
      rootContentId,
      contentCount: familyMetrics.contentCount,
      platformCount: familyMetrics.platformCount,
      totalViews: familyMetrics.aggregateMetrics.totalViews
    }, 'Generated content family metrics');
    
    return familyMetrics;
  } catch (error) {
    logger.error({
      rootContentId,
      period,
      startDate,
      endDate,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to get content family metrics');
    
    throw error;
  }
}

/**
 * Calculates estimated audience overlap between content items
 * 
 * @param contentMetrics Array of content metrics
 * @param platformMap Mapping of content IDs to platform types
 * @param edges Relationship edges between content items
 * @returns Audience overlap estimation
 */
function calculateAudienceOverlap(
  contentMetrics: ContentTypes.ContentMetrics[],
  platformMap: Record<string, PlatformTypes.PlatformType>,
  edges: any[]
): AnalyticsTypes.AudienceOverlap {
  const platformPairs: { platforms: [PlatformTypes.PlatformType, PlatformTypes.PlatformType]; overlapPercentage: number }[] = [];
  const contentPairs: { contentIds: [string, string]; overlapPercentage: number }[] = [];
  const totalUniqueViewers: Record<string, number> = {};
  
  // Define baseline platform overlap percentages based on industry research
  const baselinePlatformOverlap: Record<string, Record<string, number>> = {
    [PlatformTypes.PlatformType.YOUTUBE]: {
      [PlatformTypes.PlatformType.INSTAGRAM]: 42,
      [PlatformTypes.PlatformType.TIKTOK]: 35,
      [PlatformTypes.PlatformType.TWITTER]: 28,
      [PlatformTypes.PlatformType.LINKEDIN]: 15
    },
    [PlatformTypes.PlatformType.INSTAGRAM]: {
      [PlatformTypes.PlatformType.YOUTUBE]: 42,
      [PlatformTypes.PlatformType.TIKTOK]: 45,
      [PlatformTypes.PlatformType.TWITTER]: 30,
      [PlatformTypes.PlatformType.LINKEDIN]: 18
    },
    [PlatformTypes.PlatformType.TIKTOK]: {
      [PlatformTypes.PlatformType.YOUTUBE]: 35,
      [PlatformTypes.PlatformType.INSTAGRAM]: 45,
      [PlatformTypes.PlatformType.TWITTER]: 25,
      [PlatformTypes.PlatformType.LINKEDIN]: 12
    },
    [PlatformTypes.PlatformType.TWITTER]: {
      [PlatformTypes.PlatformType.YOUTUBE]: 28,
      [PlatformTypes.PlatformType.INSTAGRAM]: 30,
      [PlatformTypes.PlatformType.TIKTOK]: 25,
      [PlatformTypes.PlatformType.LINKEDIN]: 22
    },
    [PlatformTypes.PlatformType.LINKEDIN]: {
      [PlatformTypes.PlatformType.YOUTUBE]: 15,
      [PlatformTypes.PlatformType.INSTAGRAM]: 18,
      [PlatformTypes.PlatformType.TIKTOK]: 12,
      [PlatformTypes.PlatformType.TWITTER]: 22
    }
  };
  
  // Calculate platform pairs overlap
  const platforms = new Set<PlatformTypes.PlatformType>();
  contentMetrics.forEach(metrics => {
    const platform = platformMap[metrics.contentId];
    if (platform) {
      platforms.add(platform);
    }
  });
  
  const platformArray = Array.from(platforms);
  
  // Generate platform pair overlaps
  for (let i = 0; i < platformArray.length; i++) {
    for (let j = i + 1; j < platformArray.length; j++) {
      const platform1 = platformArray[i];
      const platform2 = platformArray[j];
      
      // Get baseline overlap from industry data or default to 20%
      const overlapPercentage = baselinePlatformOverlap[platform1]?.[platform2] || 20;
      
      platformPairs.push({
        platforms: [platform1, platform2],
        overlapPercentage
      });
    }
  }
  
  // Calculate content pairs overlap based on relationship edges
  if (edges && edges.length > 0) {
    edges.forEach(edge => {
      const sourceId = edge.source;
      const targetId = edge.target;
      
      // Get metrics for both content items
      const sourceMetrics = contentMetrics.find(m => m.contentId === sourceId);
      const targetMetrics = contentMetrics.find(m => m.contentId === targetId);
      
      if (sourceMetrics && targetMetrics) {
        // Calculate overlap based on relationship type and confidence
        let overlapPercentage = 30; // Base overlap
        
        // Adjust based on relationship type
        switch (edge.type) {
          case ContentTypes.RelationshipType.PARENT:
            overlapPercentage = 50;
            break;
          case ContentTypes.RelationshipType.DERIVATIVE:
            overlapPercentage = 60;
            break;
          case ContentTypes.RelationshipType.REPURPOSED:
            overlapPercentage = 45;
            break;
          case ContentTypes.RelationshipType.REACTION:
            overlapPercentage = 35;
            break;
          case ContentTypes.RelationshipType.REFERENCE:
            overlapPercentage = 25;
            break;
        }
        
        // Adjust based on confidence
        if (edge.confidence) {
          overlapPercentage = overlapPercentage * edge.confidence;
        }
        
        contentPairs.push({
          contentIds: [sourceId, targetId],
          overlapPercentage
        });
      }
    });
  }
  
  // Calculate total views and estimated duplication
  let totalViews = 0;
  contentMetrics.forEach(metrics => {
    totalViews += metrics.views || 0;
    const platformViews = totalUniqueViewers[platformMap[metrics.contentId]] || 0;
    totalUniqueViewers[platformMap[metrics.contentId]] = platformViews + (metrics.views || 0);
  });
  
  // Calculate estimated duplication based on platform and content overlaps
  // This is a simplified model - in production, more sophisticated statistical
  // models would be used to estimate audience overlap
  
  let totalDuplication = 0;
  let duplicatedViewsSum = 0;
  
  // Calculate platform-level duplication
  Object.entries(totalUniqueViewers).forEach(([platform, views]) => {
    platformPairs.forEach(pair => {
      if (pair.platforms[0] === platform || pair.platforms[1] === platform) {
        const otherPlatform = pair.platforms[0] === platform ? pair.platforms[1] : pair.platforms[0];
        const otherViews = totalUniqueViewers[otherPlatform] || 0;
        
        const smallerViewCount = Math.min(views, otherViews);
        const duplicatedViews = smallerViewCount * (pair.overlapPercentage / 100) * 0.5; // Scale factor to avoid over-counting
        
        duplicatedViewsSum += duplicatedViews;
      }
    });
  });
  
  // Add content-specific duplications
  contentPairs.forEach(pair => {
    const content1 = contentMetrics.find(m => m.contentId === pair.contentIds[0]);
    const content2 = contentMetrics.find(m => m.contentId === pair.contentIds[1]);
    
    if (content1 && content2) {
      const smallerViewCount = Math.min(content1.views || 0, content2.views || 0);
      const duplicatedViews = smallerViewCount * (pair.overlapPercentage / 100) * 0.2; // Lower weight for content pairs
      
      duplicatedViewsSum += duplicatedViews;
    }
  });
  
  // Calculate overall duplication percentage
  if (totalViews > 0) {
    totalDuplication = (duplicatedViewsSum / totalViews) * 100;
  }
  
  // Cap the duplication percentage at reasonable bounds
  totalDuplication = Math.min(Math.max(totalDuplication, 5), 75);
  
  // Calculate estimated unique reach
  const estimatedUniqueReach = Math.round(totalViews * (1 - (totalDuplication / 100)));
  
  return {
    platformPairs,
    contentPairs,
    estimatedDuplication: totalDuplication,
    estimatedUniqueReach
  };
}

/**
 * Retrieves aggregated metrics across all content for a creator
 * 
 * @param creatorId ID of the creator
 * @param period Type of period to aggregate metrics for
 * @param startDate Optional custom start date for custom periods
 * @param endDate Optional custom end date for custom periods
 * @returns Promise resolving to creator aggregate metrics
 */
async function getCreatorMetrics(
  creatorId: string,
  period: AnalyticsTypes.MetricPeriod,
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsTypes.CreatorAggregateMetrics> {
  try {
    logger.info({ creatorId, period, startDate, endDate }, 'Getting creator metrics');
    
    // Calculate date range based on period
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (period === AnalyticsTypes.MetricPeriod.CUSTOM && startDate && endDate) {
      rangeStart = startDate;
      rangeEnd = endDate;
    } else {
      const now = dayjs();
      
      switch (period) {
        case AnalyticsTypes.MetricPeriod.DAY:
          rangeStart = now.startOf('day').toDate();
          rangeEnd = now.endOf('day').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.WEEK:
          rangeStart = now.startOf('week').toDate();
          rangeEnd = now.endOf('week').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.MONTH:
          rangeStart = now.startOf('month').toDate();
          rangeEnd = now.endOf('month').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.QUARTER:
          rangeStart = now.startOf('quarter').toDate();
          rangeEnd = now.endOf('quarter').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.YEAR:
          rangeStart = now.startOf('year').toDate();
          rangeEnd = now.endOf('year').toDate();
          break;
        case AnalyticsTypes.MetricPeriod.ALL_TIME:
          rangeStart = new Date(0); // Beginning of time
          rangeEnd = now.toDate();
          break;
        default:
          rangeStart = now.subtract(30, 'day').toDate(); // Default to last 30 days
          rangeEnd = now.toDate();
      }
    }
    
    // Check if we have pre-calculated metrics for this period
    const cachedMetrics = await getAggregateMetrics(
      creatorId,
      'creator',
      period,
      rangeStart,
      rangeEnd
    );
    
    if (cachedMetrics) {
      logger.info({
        creatorId,
        period
      }, 'Using cached creator metrics');
      
      // Return cached metrics with minimal structure
      // In a real implementation, this would return the full structure
      return {
        creatorId,
        aggregateMetrics: cachedMetrics,
        platformBreakdown: cachedMetrics.platformBreakdown || [],
        contentTypeBreakdown: cachedMetrics.contentTypeBreakdown || [],
        audienceDemographics: cachedMetrics.audienceDemographics || {},
        growthMetrics: cachedMetrics.growthRates || {},
        benchmarks: [],
        topPerformingContent: [],
        contentFamilyCount: 0,
        totalContentCount: 0
      };
    }
    
    // Fetch all content items for the creator
    const contentItems = await prismaRead.content.findMany({
      where: {
        creatorId,
        publishedAt: {
          gte: rangeStart,
          lte: rangeEnd
        }
      },
      include: {
        platform: true
      }
    });
    
    if (contentItems.length === 0) {
      logger.info({ creatorId }, 'No content items found for creator');
      
      // Return empty metrics
      return {
        creatorId,
        aggregateMetrics: {
          totalViews: 0,
          totalEngagements: 0,
          totalShares: 0,
          totalComments: 0,
          totalLikes: 0,
          totalWatchTime: 0,
          engagementRate: 0,
          viewThroughRate: 0,
          estimatedTotalValue: 0,
          growthRates: {},
          periodStart: rangeStart,
          periodEnd: rangeEnd,
          period
        },
        platformBreakdown: [],
        contentTypeBreakdown: [],
        audienceDemographics: {},
        growthMetrics: {},
        benchmarks: [],
        topPerformingContent: [],
        contentFamilyCount: 0,
        totalContentCount: 0
      };
    }
    
    // Identify root content items (content families)
    const rootContentItems = contentItems.filter(item => item.isRoot);
    
    // Create maps for platform and content types
    const contentPlatformMap: Record<string, PlatformTypes.PlatformType> = {};
    const contentTypeMap: Record<string, ContentTypes.ContentType> = {};
    
    contentItems.forEach(item => {
      contentPlatformMap[item.id] = item.platform.platformType as PlatformTypes.PlatformType;
      contentTypeMap[item.id] = item.contentType as ContentTypes.ContentType;
    });
    
    // Get family metrics for each root content
    const familyMetrics: AnalyticsTypes.FamilyMetrics[] = [];
    
    await Promise.all(rootContentItems.map(async (rootItem) => {
      try {
        const metrics = await getContentFamilyMetrics(
          rootItem.id,
          period,
          rangeStart,
          rangeEnd
        );
        
        familyMetrics.push(metrics);
      } catch (error) {
        logger.warn({
          contentId: rootItem.id,
          error: error instanceof Error ? error.message : String(error)
        }, 'Failed to get family metrics for root content');
        
        // Continue with other root content
      }
    }));
    
    // Get metrics for non-family content
    const nonFamilyContentIds = new Set(contentItems.map(item => item.id));
    
    // Remove content IDs that are part of families
    familyMetrics.forEach(family => {
      family.contentItems.forEach(item => {
        nonFamilyContentIds.delete(item.id);
      });
    });
    
    // Get individual metrics for non-family content
    const nonFamilyMetrics: ContentTypes.ContentMetrics[] = [];
    
    await Promise.all(Array.from(nonFamilyContentIds).map(async (contentId) => {
      try {
        const metrics = await getContentMetricsForPeriod(
          contentId,
          period,
          rangeStart,
          rangeEnd
        );
        
        // Standardize metrics based on platform
        const platformType = contentPlatformMap[contentId];
        const contentType = contentTypeMap[contentId];
        
        if (platformType && contentType) {
          const standardizedMetrics = standardizeMetrics(
            metrics,
            platformType,
            contentType
          );
          
          nonFamilyMetrics.push(standardizedMetrics);
        } else {
          nonFamilyMetrics.push(metrics);
        }
      } catch (error) {
        logger.warn({
          contentId,
          error: error instanceof Error ? error.message : String(error)
        }, 'Failed to get metrics for non-family content');
        
        // Continue with other content
      }
    }));
    
    // Aggregate metrics across all content (families + non-family)
    const aggregateMetrics: AnalyticsTypes.AggregateMetrics = {
      totalViews: 0,
      totalEngagements: 0,
      totalShares: 0,
      totalComments: 0,
      totalLikes: 0,
      totalWatchTime: 0,
      engagementRate: 0,
      viewThroughRate: 0,
      estimatedTotalValue: 0,
      growthRates: {},
      periodStart: rangeStart,
      periodEnd: rangeEnd,
      period
    };
    
    // Aggregate family metrics
    familyMetrics.forEach(family => {
      // Use family's adjusted metrics (with audience deduplication)
      aggregateMetrics.totalViews += family.aggregateMetrics.totalViews;
      aggregateMetrics.totalEngagements += family.aggregateMetrics.totalEngagements;
      aggregateMetrics.totalShares += family.aggregateMetrics.totalShares;
      aggregateMetrics.totalComments += family.aggregateMetrics.totalComments;
      aggregateMetrics.totalLikes += family.aggregateMetrics.totalLikes;
      aggregateMetrics.totalWatchTime += family.aggregateMetrics.totalWatchTime;
      aggregateMetrics.estimatedTotalValue += family.aggregateMetrics.estimatedTotalValue;
    });
    
    // Add non-family metrics
    nonFamilyMetrics.forEach(metrics => {
      aggregateMetrics.totalViews += metrics.views || 0;
      aggregateMetrics.totalEngagements += metrics.engagements || 0;
      aggregateMetrics.totalShares += metrics.shares || 0;
      aggregateMetrics.totalComments += metrics.comments || 0;
      aggregateMetrics.totalLikes += metrics.likes || 0;
      aggregateMetrics.totalWatchTime += metrics.watchTime || 0;
      aggregateMetrics.estimatedTotalValue += metrics.estimatedValue || 0;
    });
    
    // Calculate overall engagement rate
    if (aggregateMetrics.totalViews > 0) {
      aggregateMetrics.engagementRate = (aggregateMetrics.totalEngagements / aggregateMetrics.totalViews) * 100;
    }
    
    // Calculate view-through rate for video content
    const videoContentCount = Object.values(contentTypeMap)
      .filter(type => type === ContentTypes.ContentType.VIDEO || type === ContentTypes.ContentType.SHORT_VIDEO)
      .length;
    
    if (videoContentCount > 0 && aggregateMetrics.totalViews > 0) {
      aggregateMetrics.viewThroughRate = (aggregateMetrics.totalWatchTime / (aggregateMetrics.totalViews * videoContentCount * 10)) * 100;
    }
    
    // Calculate platform breakdown across all content
    const allContentMetrics: ContentTypes.ContentMetrics[] = [];
    
    // Add metrics from all content families
    familyMetrics.forEach(family => {
      family.contentItems.forEach(item => {
        if (item.metrics && Object.keys(item.metrics).length > 0) {
          allContentMetrics.push({
            id: `${item.id}-aggregate`,
            contentId: item.id,
            views: item.metrics.views || 0,
            engagements: item.metrics.engagements || 0,
            engagementRate: item.metrics.engagementRate || 0,
            shares: 0,
            comments: 0,
            likes: 0,
            watchTime: 0,
            estimatedValue: item.metrics.estimatedValue || 0,
            platformSpecificMetrics: {},
            lastUpdated: new Date()
          });
        }
      });
    });
    
    // Add non-family metrics
    allContentMetrics.push(...nonFamilyMetrics);
    
    const platformBreakdown = await calculatePlatformBreakdown(
      allContentMetrics,
      contentPlatformMap
    );
    
    const contentTypeBreakdown = await calculateContentTypeBreakdown(
      allContentMetrics,
      contentTypeMap
    );
    
    // Calculate growth metrics by comparing to previous period
    const growthMetrics: Record<string, number> = {};
    
    // If not a custom period, we can calculate growth
    if (period !== AnalyticsTypes.MetricPeriod.CUSTOM) {
      try {
        // Calculate previous period date range
        let prevRangeStart: Date;
        let prevRangeEnd: Date;
        
        switch (period) {
          case AnalyticsTypes.MetricPeriod.DAY:
            prevRangeStart = dayjs(rangeStart).subtract(1, 'day').toDate();
            prevRangeEnd = dayjs(rangeEnd).subtract(1, 'day').toDate();
            break;
          case AnalyticsTypes.MetricPeriod.WEEK:
            prevRangeStart = dayjs(rangeStart).subtract(1, 'week').toDate();
            prevRangeEnd = dayjs(rangeEnd).subtract(1, 'week').toDate();
            break;
          case AnalyticsTypes.MetricPeriod.MONTH:
            prevRangeStart = dayjs(rangeStart).subtract(1, 'month').toDate();
            prevRangeEnd = dayjs(rangeEnd).subtract(1, 'month').toDate();
            break;
          case AnalyticsTypes.MetricPeriod.QUARTER:
            prevRangeStart = dayjs(rangeStart).subtract(3, 'month').toDate();
            prevRangeEnd = dayjs(rangeEnd).subtract(3, 'month').toDate();
            break;
          case AnalyticsTypes.MetricPeriod.YEAR:
            prevRangeStart = dayjs(rangeStart).subtract(1, 'year').toDate();
            prevRangeEnd = dayjs(rangeEnd).subtract(1, 'year').toDate();
            break;
          default:
            // For other periods, use same length as current period
            const currentDuration = rangeEnd.getTime() - rangeStart.getTime();
            prevRangeStart = new Date(rangeStart.getTime() - currentDuration);
            prevRangeEnd = new Date(rangeStart.getTime() - 1);
        }
        
        // Get previous period metrics
        const prevPeriodMetrics = await getAggregateMetrics(
          creatorId,
          'creator',
          AnalyticsTypes.MetricPeriod.CUSTOM,
          prevRangeStart,
          prevRangeEnd
        );
        
        if (prevPeriodMetrics) {
          // Calculate growth rates
          if (prevPeriodMetrics.totalViews > 0) {
            growthMetrics.views = ((aggregateMetrics.totalViews - prevPeriodMetrics.totalViews) / prevPeriodMetrics.totalViews) * 100;
          }
          
          if (prevPeriodMetrics.totalEngagements > 0) {
            growthMetrics.engagements = ((aggregateMetrics.totalEngagements - prevPeriodMetrics.totalEngagements) / prevPeriodMetrics.totalEngagements) * 100;
          }
          
          if (prevPeriodMetrics.estimatedTotalValue > 0) {
            growthMetrics.value = ((aggregateMetrics.estimatedTotalValue - prevPeriodMetrics.estimatedTotalValue) / prevPeriodMetrics.estimatedTotalValue) * 100;
          }
          
          // Calculate engagement rate change
          growthMetrics.engagementRate = aggregateMetrics.engagementRate - prevPeriodMetrics.engagementRate;
        }
      } catch (error) {
        logger.warn({
          creatorId,
          period,
          error: error instanceof Error ? error.message : String(error)
        }, 'Failed to calculate growth metrics');
        
        // Continue without growth metrics
      }
    }
    
    // Store aggregate metrics for future use
    aggregateMetrics.growthRates = growthMetrics;
    
    try {
      await storeAggregateMetrics(
        creatorId,
        'creator',
        period,
        {
          ...aggregateMetrics,
          platformBreakdown,
          contentTypeBreakdown,
          audienceDemographics: {} // Placeholder for audience demographics
        },
        rangeStart,
        rangeEnd
      );
    } catch (error) {
      logger.warn({
        creatorId,
        period,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to store aggregate metrics');
      
      // Continue without storing metrics
    }
    
    // Get top performing content items
    const topContentItems = allContentMetrics
      .sort((a, b) => (b.engagements || 0) - (a.engagements || 0))
      .slice(0, 10)
      .map(metrics => {
        const contentId = metrics.contentId;
        const content = contentItems.find(item => item.id === contentId);
        
        if (!content) {
          return null;
        }
        
        return {
          id: content.id,
          title: content.title,
          platform: contentPlatformMap[content.id],
          contentType: contentTypeMap[content.id],
          metrics: {
            views: metrics.views || 0,
            engagements: metrics.engagements || 0,
            engagementRate: metrics.engagementRate || 0,
            estimatedValue: metrics.estimatedValue || 0
          }
        };
      })
      .filter(item => item !== null) as any[];
    
    // Assemble final creator metrics
    const creatorMetrics: AnalyticsTypes.CreatorAggregateMetrics = {
      creatorId,
      aggregateMetrics,
      platformBreakdown,
      contentTypeBreakdown,
      audienceDemographics: {}, // Placeholder for audience demographics
      growthMetrics,
      benchmarks: [], // Placeholder for benchmarks
      topPerformingContent: topContentItems,
      contentFamilyCount: familyMetrics.length,
      totalContentCount: contentItems.length
    };
    
    logger.info({
      creatorId,
      totalContentCount: creatorMetrics.totalContentCount,
      familyCount: creatorMetrics.contentFamilyCount,
      totalViews: creatorMetrics.aggregateMetrics.totalViews
    }, 'Generated creator metrics');
    
    return creatorMetrics;
  } catch (error) {
    logger.error({
      creatorId,
      period,
      startDate,
      endDate,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to get creator metrics');
    
    throw error;
  }
}

/**
 * Calculates performance breakdown by platform
 * 
 * @param contentMetrics Array of content metrics
 * @param contentPlatformMap Mapping of content IDs to platform types
 * @returns Performance breakdown by platform
 */
async function calculatePlatformBreakdown(
  contentMetrics: ContentTypes.ContentMetrics[],
  contentPlatformMap: Record<string, PlatformTypes.PlatformType>
): Promise<AnalyticsTypes.PlatformBreakdown[]> {
  try {
    // Group content metrics by platform
    const platformMetrics: Record<string, ContentTypes.ContentMetrics[]> = {};
    
    contentMetrics.forEach(metrics => {
      const platform = contentPlatformMap[metrics.contentId];
      
      if (platform) {
        if (!platformMetrics[platform]) {
          platformMetrics[platform] = [];
        }
        
        platformMetrics[platform].push(metrics);
      }
    });
    
    // Calculate aggregates for each platform
    const platformBreakdown: AnalyticsTypes.PlatformBreakdown[] = [];
    
    Object.entries(platformMetrics).forEach(([platform, metrics]) => {
      // Initialize platform metrics
      const breakdown: AnalyticsTypes.PlatformBreakdown = {
        platform: platform as PlatformTypes.PlatformType,
        metrics: {
          views: 0,
          engagements: 0,
          shares: 0,
          comments: 0,
          likes: 0,
          watchTime: 0
        },
        percentage: 0,
        engagementRate: 0,
        contentCount: metrics.length,
        estimatedValue: 0
      };
      
      // Sum up metrics for this platform
      metrics.forEach(item => {
        breakdown.metrics.views += item.views || 0;
        breakdown.metrics.engagements += item.engagements || 0;
        breakdown.metrics.shares += item.shares || 0;
        breakdown.metrics.comments += item.comments || 0;
        breakdown.metrics.likes += item.likes || 0;
        breakdown.metrics.watchTime += item.watchTime || 0;
        breakdown.estimatedValue += item.estimatedValue || 0;
      });
      
      // Calculate engagement rate for this platform
      if (breakdown.metrics.views > 0) {
        breakdown.engagementRate = (breakdown.metrics.engagements / breakdown.metrics.views) * 100;
      }
      
      platformBreakdown.push(breakdown);
    });
    
    // Calculate total metrics to determine percentages
    const totalViews = platformBreakdown.reduce((sum, platform) => sum + platform.metrics.views, 0);
    const totalEngagements = platformBreakdown.reduce((sum, platform) => sum + platform.metrics.engagements, 0);
    
    // Set percentage based on engagement, defaulting to views if no engagements
    platformBreakdown.forEach(platform => {
      if (totalEngagements > 0) {
        platform.percentage = (platform.metrics.engagements / totalEngagements) * 100;
      } else if (totalViews > 0) {
        platform.percentage = (platform.metrics.views / totalViews) * 100;
      } else {
        platform.percentage = 0;
      }
    });
    
    // Sort by percentage (contribution) in descending order
    return platformBreakdown.sort((a, b) => b.percentage - a.percentage);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to calculate platform breakdown');
    
    throw error;
  }
}

/**
 * Calculates performance breakdown by content type
 * 
 * @param contentMetrics Array of content metrics
 * @param contentTypeMap Mapping of content IDs to content types
 * @returns Performance breakdown by content type
 */
async function calculateContentTypeBreakdown(
  contentMetrics: ContentTypes.ContentMetrics[],
  contentTypeMap: Record<string, ContentTypes.ContentType>
): Promise<AnalyticsTypes.ContentTypeBreakdown[]> {
  try {
    // Group content metrics by content type
    const typeMetrics: Record<string, ContentTypes.ContentMetrics[]> = {};
    
    contentMetrics.forEach(metrics => {
      const contentType = contentTypeMap[metrics.contentId];
      
      if (contentType) {
        if (!typeMetrics[contentType]) {
          typeMetrics[contentType] = [];
        }
        
        typeMetrics[contentType].push(metrics);
      }
    });
    
    // Calculate aggregates for each content type
    const contentTypeBreakdown: AnalyticsTypes.ContentTypeBreakdown[] = [];
    
    Object.entries(typeMetrics).forEach(([type, metrics]) => {
      // Initialize content type metrics
      const breakdown: AnalyticsTypes.ContentTypeBreakdown = {
        contentType: type as ContentTypes.ContentType,
        metrics: {
          views: 0,
          engagements: 0,
          shares: 0,
          comments: 0,
          likes: 0,
          watchTime: 0
        },
        percentage: 0,
        engagementRate: 0,
        contentCount: metrics.length,
        estimatedValue: 0
      };
      
      // Sum up metrics for this content type
      metrics.forEach(item => {
        breakdown.metrics.views += item.views || 0;
        breakdown.metrics.engagements += item.engagements || 0;
        breakdown.metrics.shares += item.shares || 0;
        breakdown.metrics.comments += item.comments || 0;
        breakdown.metrics.likes += item.likes || 0;
        breakdown.metrics.watchTime += item.watchTime || 0;
        breakdown.estimatedValue += item.estimatedValue || 0;
      });
      
      // Calculate engagement rate for this content type
      if (breakdown.metrics.views > 0) {
        breakdown.engagementRate = (breakdown.metrics.engagements / breakdown.metrics.views) * 100;
      }
      
      contentTypeBreakdown.push(breakdown);
    });
    
    // Calculate total metrics to determine percentages
    const totalViews = contentTypeBreakdown.reduce((sum, type) => sum + type.metrics.views, 0);
    const totalEngagements = contentTypeBreakdown.reduce((sum, type) => sum + type.metrics.engagements, 0);
    
    // Set percentage based on engagement, defaulting to views if no engagements
    contentTypeBreakdown.forEach(type => {
      if (totalEngagements > 0) {
        type.percentage = (type.metrics.engagements / totalEngagements) * 100;
      } else if (totalViews > 0) {
        type.percentage = (type.metrics.views / totalViews) * 100;
      } else {
        type.percentage = 0;
      }
    });
    
    // Sort by percentage (contribution) in descending order
    return contentTypeBreakdown.sort((a, b) => b.percentage - a.percentage);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to calculate content type breakdown');
    
    throw error;
  }
}

/**
 * Stores pre-calculated aggregate metrics for faster retrieval
 * 
 * @param entityId ID of the entity (creator, content, etc.)
 * @param entityType Type of entity
 * @param period Type of period the metrics represent
 * @param metrics The aggregate metrics to store
 * @param startDate Start date of the period
 * @param endDate End date of the period
 * @returns Promise resolving to the stored aggregate metrics
 */
async function storeAggregateMetrics(
  entityId: string,
  entityType: string,
  period: AnalyticsTypes.MetricPeriod,
  metrics: AnalyticsTypes.AggregateMetrics,
  startDate: Date,
  endDate: Date
): Promise<any> {
  try {
    logger.info({ entityId, entityType, period }, 'Storing aggregate metrics');
    
    // Check if aggregate metrics already exist
    const existingMetrics = await prisma.aggregateMetrics.findFirst({
      where: {
        entityId,
        entityType,
        period: period.toString(),
        startDate,
        endDate
      }
    });
    
    // If metrics exist, update them
    if (existingMetrics) {
      logger.info({ entityId, entityType, period }, 'Updating existing aggregate metrics');
      
      const updatedMetrics = await prisma.aggregateMetrics.update({
        where: { id: existingMetrics.id },
        data: {
          metrics: metrics as unknown as Prisma.JsonObject,
          updatedAt: new Date()
        }
      });
      
      return updatedMetrics;
    } 
    // Otherwise, create new metrics
    else {
      logger.info({ entityId, entityType, period }, 'Creating new aggregate metrics');
      
      const newMetrics = await prisma.aggregateMetrics.create({
        data: {
          entityId,
          entityType,
          period: period.toString(),
          startDate,
          endDate,
          metrics: metrics as unknown as Prisma.JsonObject,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      return newMetrics;
    }
  } catch (error) {
    logger.error({
      entityId,
      entityType,
      period,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to store aggregate metrics');
    
    throw error;
  }
}

/**
 * Retrieves pre-calculated aggregate metrics if available
 * 
 * @param entityId ID of the entity (creator, content, etc.)
 * @param entityType Type of entity
 * @param period Type of period the metrics represent
 * @param startDate Start date of the period
 * @param endDate End date of the period
 * @returns Promise resolving to the aggregate metrics or null if not found
 */
async function getAggregateMetrics(
  entityId: string,
  entityType: string,
  period: AnalyticsTypes.MetricPeriod,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsTypes.AggregateMetrics | null> {
  try {
    logger.info({ entityId, entityType, period }, 'Retrieving aggregate metrics');
    
    // Query for pre-calculated metrics
    const metrics = await prismaRead.aggregateMetrics.findFirst({
      where: {
        entityId,
        entityType,
        period: period.toString(),
        startDate,
        endDate
      }
    });
    
    if (!metrics) {
      logger.info({ entityId, entityType, period }, 'No pre-calculated aggregate metrics found');
      return null;
    }
    
    logger.info({ entityId, entityType, period }, 'Found pre-calculated aggregate metrics');
    
    // Cast the JSON metrics to the appropriate type
    return metrics.metrics as unknown as AnalyticsTypes.AggregateMetrics;
  } catch (error) {
    logger.error({
      entityId,
      entityType,
      period,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to retrieve aggregate metrics');
    
    return null;
  }
}

/**
 * Main entry point for retrieving comprehensive analytics with configurable options
 * 
 * @param params Query parameters specifying the analytics to retrieve
 * @returns Promise resolving to the requested analytics
 */
async function getAnalytics(
  params: AnalyticsTypes.AnalyticsQueryParams
): Promise<any> {
  try {
    logger.info({ params }, 'Getting analytics');
    
    const { 
      entityId, 
      entityType, 
      period, 
      startDate, 
      endDate,
      metrics = [],
      platforms = [],
      contentTypes = [],
      includeTimeSeries = false,
      includeInsights = false,
      includeBenchmarks = false,
      filters = {},
      granularity = AnalyticsTypes.MetricGranularity.DAILY
    } = params;
    
    // Handle different entity types
    switch (entityType) {
      case 'creator':
        return getCreatorMetrics(entityId, period, startDate, endDate);
        
      case 'content':
        const contentMetrics = await getContentMetricsForPeriod(entityId, period, startDate, endDate);
        
        // If time series is requested, add it to the result
        let result: any = { metrics: contentMetrics };
        
        if (includeTimeSeries && metrics.length > 0) {
          result.timeSeries = await getTimeSeriesMetrics(
            entityId,
            metrics,
            startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
            endDate || new Date(),
            granularity.toString()
          );
        }
        
        return result;
        
      case 'contentFamily':
        return getContentFamilyMetrics(entityId, period, startDate, endDate);
        
      default:
        throw new ApiError(`Unsupported entity type: ${entityType}`, 400);
    }
  } catch (error) {
    logger.error({
      params,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to get analytics');
    
    throw error;
  }
}

export default {
  storeDailyMetrics,
  getDailyMetricsForContent,
  getContentMetricsForPeriod,
  getTimeSeriesMetrics,
  getContentFamilyMetrics,
  getCreatorMetrics,
  calculatePlatformBreakdown,
  calculateContentTypeBreakdown,
  storeAggregateMetrics,
  getAggregateMetrics,
  getAnalytics
};