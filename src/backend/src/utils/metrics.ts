import { cloneDeep } from 'lodash'; // v4.17.21
import { 
  AnalyticsTypes 
} from '../types/analytics';
import {
  ContentTypes
} from '../types/content';
import {
  PlatformTypes
} from '../types/platform';
import {
  ANALYTICS_CONFIG
} from '../config/constants';
import {
  getDateRangeForPeriod,
  getDaysBetween
} from './dateTime';

// Default values for calculations
export const DEFAULT_ENGAGEMENT_RATE = 0.05; // 5% engagement rate as a fallback
export const DEFAULT_CONTENT_VALUE_MULTIPLIER = 0.01; // Multiplier for content value calculation
export const MIN_SAMPLE_SIZE = 5; // Minimum sample size for statistical calculations

/**
 * Calculates the engagement rate based on engagement counts and views/impressions
 * Applies platform-specific normalization factors from configuration
 * 
 * @param engagements - Number of engagements (likes, comments, shares, etc.)
 * @param views - Number of views or impressions
 * @param platformType - The type of platform the metrics are from
 * @returns Calculated engagement rate as a percentage
 */
export function calculateEngagementRate(
  engagements: number,
  views: number,
  platformType: PlatformTypes.PlatformType
): number {
  // Validate inputs to ensure non-negative values
  const safeEngagements = Math.max(0, engagements || 0);
  const safeViews = Math.max(0, views || 0);
  
  // Handle edge case where views is zero to prevent division by zero
  if (safeViews === 0) {
    return DEFAULT_ENGAGEMENT_RATE * 100; // Return default as percentage
  }
  
  // Get platform-specific engagement factor from configuration
  const platformFactor = ANALYTICS_CONFIG.PLATFORM_ENGAGEMENT_FACTORS[platformType] || 1;
  
  // Calculate raw engagement rate and apply platform-specific factor
  const rawEngagementRate = safeEngagements / safeViews;
  const normalizedRate = rawEngagementRate * platformFactor;
  
  // Return as percentage (multiply by 100)
  return normalizedRate * 100;
}

/**
 * Estimates the monetary value of content based on engagement metrics
 * Takes into account platform-specific and content-type-specific factors
 * 
 * @param metrics - Content metrics with views, engagement, etc.
 * @param platformType - The platform the content is from
 * @param contentType - The type of content
 * @returns Estimated content value in USD
 */
export function calculateEstimatedValue(
  metrics: ContentTypes.ContentMetrics,
  platformType: PlatformTypes.PlatformType,
  contentType: ContentTypes.ContentType
): number {
  // Get platform and content type value factors from configuration
  const platformFactor = ANALYTICS_CONFIG.CONTENT_VALUE_FACTORS[platformType] || 1;
  const contentTypeFactor = ANALYTICS_CONFIG.CONTENT_VALUE_FACTORS[contentType] || 1;
  
  // Extract metrics with safe defaults
  const views = Math.max(0, metrics.views || 0);
  const engagementRate = Math.max(0, metrics.engagementRate || 0) / 100; // Convert from percentage
  const comments = Math.max(0, metrics.comments || 0);
  const shares = Math.max(0, metrics.shares || 0);
  
  // Base calculation
  let estimatedValue = views * engagementRate * DEFAULT_CONTENT_VALUE_MULTIPLIER;
  
  // Apply platform and content type multipliers
  estimatedValue *= platformFactor;
  estimatedValue *= contentTypeFactor;
  
  // Apply additional value for high-quality engagement signals (comments and shares)
  const commentBonus = comments * 0.02; // Each comment adds more value
  const shareBonus = shares * 0.05; // Shares are valuable for reach expansion
  
  estimatedValue += commentBonus + shareBonus;
  
  // Round to 2 decimal places for currency value
  return Math.round(estimatedValue * 100) / 100;
}

/**
 * Calculates total unique reach across multiple content items with audience overlap deduplication
 * Uses platform combinations to estimate audience overlap between platforms
 * 
 * @param metricsArray - Array of content metrics objects
 * @param contentPlatformMap - Map of content IDs to their platform types
 * @returns Deduplicated total reach estimate
 */
export function calculateTotalReachWithDeduplication(
  metricsArray: ContentTypes.ContentMetrics[],
  contentPlatformMap: Record<string, PlatformTypes.PlatformType>
): number {
  if (!metricsArray || metricsArray.length === 0) {
    return 0;
  }
  
  // Calculate raw total views by summing views across all content items
  const rawTotalViews = metricsArray.reduce((sum, metrics) => {
    return sum + (metrics.views || 0);
  }, 0);
  
  // If only one content item, no deduplication needed
  if (metricsArray.length === 1) {
    return rawTotalViews;
  }
  
  // Group content by platform for overlap calculation
  const platformGroups: Record<string, number> = {};
  
  metricsArray.forEach(metrics => {
    const contentId = metrics.contentId;
    const platform = contentPlatformMap[contentId];
    
    if (platform) {
      if (!platformGroups[platform]) {
        platformGroups[platform] = 0;
      }
      platformGroups[platform] += (metrics.views || 0);
    }
  });
  
  // Calculate overlap between platforms
  let totalOverlap = 0;
  const platforms = Object.keys(platformGroups);
  
  // For each pair of platforms, calculate estimated overlap
  for (let i = 0; i < platforms.length; i++) {
    for (let j = i + 1; j < platforms.length; j++) {
      const platform1 = platforms[i] as PlatformTypes.PlatformType;
      const platform2 = platforms[j] as PlatformTypes.PlatformType;
      
      const views1 = platformGroups[platform1];
      const views2 = platformGroups[platform2];
      
      // Get overlap factor from configuration or use default
      const overlapFactor = ANALYTICS_CONFIG.AUDIENCE_OVERLAP_FACTORS[`${platform1}_${platform2}`] || 
                            ANALYTICS_CONFIG.AUDIENCE_OVERLAP_FACTORS[`${platform2}_${platform1}`] || 
                            0.2; // Default 20% overlap if not specified
      
      // Calculate overlap between these two platforms
      const platformOverlap = Math.min(views1, views2) * overlapFactor;
      totalOverlap += platformOverlap;
    }
  }
  
  // Calculate deduplicated reach
  const deduplicatedReach = rawTotalViews - totalOverlap;
  
  // Ensure result is not negative or unreasonably low due to overlap estimation
  const minReach = rawTotalViews * 0.5; // Minimum is 50% of raw views
  
  return Math.max(deduplicatedReach, minReach);
}

/**
 * Normalizes metrics to enable fair comparison between different platforms and content types
 * Applies platform-specific and content-type-specific normalization factors
 * 
 * @param metrics - Original content metrics to normalize
 * @param platformType - The platform type the metrics are from
 * @param contentType - The type of content the metrics are for
 * @returns Normalized metrics object
 */
export function normalizeMetricsForComparison(
  metrics: ContentTypes.ContentMetrics,
  platformType: PlatformTypes.PlatformType,
  contentType: ContentTypes.ContentType
): ContentTypes.ContentMetrics {
  // Create a deep copy to avoid mutating the original metrics
  const normalizedMetrics = cloneDeep(metrics);
  
  // Get standardization configuration for the platform
  const standardization: AnalyticsTypes.MetricsStandardization = {
    platform: platformType,
    engagementWeight: ANALYTICS_CONFIG.METRIC_WEIGHTS[platformType]?.engagement || 1,
    viewWeight: ANALYTICS_CONFIG.METRIC_WEIGHTS[platformType]?.views || 1,
    shareWeight: ANALYTICS_CONFIG.METRIC_WEIGHTS[platformType]?.shares || 1,
    commentWeight: ANALYTICS_CONFIG.METRIC_WEIGHTS[platformType]?.comments || 1,
    likeWeight: ANALYTICS_CONFIG.METRIC_WEIGHTS[platformType]?.likes || 1,
    platformEngagementFactor: ANALYTICS_CONFIG.PLATFORM_ENGAGEMENT_FACTORS[platformType] || 1,
    platformValueFactor: ANALYTICS_CONFIG.CONTENT_VALUE_FACTORS[platformType] || 1,
    metricMappings: {}
  };
  
  // Apply platform-specific normalization
  normalizedMetrics.views = normalizedMetrics.views * standardization.viewWeight;
  normalizedMetrics.engagements = normalizedMetrics.engagements * standardization.engagementWeight;
  normalizedMetrics.shares = normalizedMetrics.shares * standardization.shareWeight;
  normalizedMetrics.comments = normalizedMetrics.comments * standardization.commentWeight;
  normalizedMetrics.likes = normalizedMetrics.likes * standardization.likeWeight;
  
  // Apply content type adjustments (e.g., short-form content typically has higher engagement)
  const contentTypeViewFactor = ANALYTICS_CONFIG.METRIC_WEIGHTS[contentType]?.views || 1;
  const contentTypeEngagementFactor = ANALYTICS_CONFIG.METRIC_WEIGHTS[contentType]?.engagement || 1;
  
  normalizedMetrics.views = normalizedMetrics.views * contentTypeViewFactor;
  normalizedMetrics.engagements = normalizedMetrics.engagements * contentTypeEngagementFactor;
  
  // Recalculate the engagement rate based on normalized metrics
  normalizedMetrics.engagementRate = calculateEngagementRate(
    normalizedMetrics.engagements,
    normalizedMetrics.views,
    platformType
  );
  
  // Recalculate estimated value based on normalized metrics
  normalizedMetrics.estimatedValue = calculateEstimatedValue(
    normalizedMetrics,
    platformType,
    contentType
  );
  
  return normalizedMetrics;
}

/**
 * Calculates growth rate between current and previous metric values
 * 
 * @param currentValue - Current metric value
 * @param previousValue - Previous metric value
 * @returns Growth rate as a decimal (e.g., 0.25 for 25% growth)
 */
export function getGrowthRate(currentValue: number, previousValue: number): number {
  // Handle edge case for zero or negative previous value
  if (previousValue <= 0) {
    return currentValue > 0 ? 1 : 0; // 100% growth if previous was zero/negative and current is positive
  }
  
  const growthRate = (currentValue - previousValue) / previousValue;
  
  // Cap extremely large growth rates (e.g., if previous was near zero)
  const maxGrowthRate = 10; // 1000% maximum growth rate
  
  return Math.min(Math.max(growthRate, -1), maxGrowthRate);
}

/**
 * Calculates overall performance score based on multiple metrics
 * Weighted combination of various metrics normalized to a 0-100 scale
 * 
 * @param metrics - Content metrics to score
 * @param platformType - The platform the content is from
 * @param contentType - The type of content
 * @returns Performance score from 0-100
 */
export function calculatePerformanceScore(
  metrics: ContentTypes.ContentMetrics,
  platformType: PlatformTypes.PlatformType,
  contentType: ContentTypes.ContentType
): number {
  // Get platform and content specific weights
  const weights = ANALYTICS_CONFIG.METRIC_WEIGHTS[platformType] || {
    views: 0.25,
    engagement: 0.3,
    engagementRate: 0.2,
    shares: 0.15,
    comments: 0.1
  };
  
  // Extract metrics with safe defaults
  const views = Math.max(0, metrics.views || 0);
  const engagements = Math.max(0, metrics.engagements || 0);
  const engagementRate = Math.max(0, metrics.engagementRate || 0);
  const shares = Math.max(0, metrics.shares || 0);
  const comments = Math.max(0, metrics.comments || 0);
  
  // Define benchmark values for each metric based on platform and content type
  // These would ideally come from a benchmark database
  const viewsBenchmark = 10000; // Example benchmark
  const engagementsBenchmark = 1000;
  const engagementRateBenchmark = 5; // 5%
  const sharesBenchmark = 100;
  const commentsBenchmark = 50;
  
  // Calculate score components as percentage of benchmark (capped at 100%)
  const viewsScore = Math.min(views / viewsBenchmark, 1) * 100;
  const engagementsScore = Math.min(engagements / engagementsBenchmark, 1) * 100;
  const engagementRateScore = Math.min(engagementRate / engagementRateBenchmark, 1) * 100;
  const sharesScore = Math.min(shares / sharesBenchmark, 1) * 100;
  const commentsScore = Math.min(comments / commentsBenchmark, 1) * 100;
  
  // Apply weights to each component
  const weightedScore = 
    (viewsScore * weights.views) +
    (engagementsScore * weights.engagement) +
    (engagementRateScore * weights.engagementRate) +
    (sharesScore * weights.shares) +
    (commentsScore * weights.comments);
  
  // Ensure score is within 0-100 range
  return Math.min(Math.max(weightedScore, 0), 100);
}

/**
 * Determines if a metric difference is statistically significant
 * Uses sample size and value difference to assess significance
 * 
 * @param value1 - First metric value
 * @param value2 - Second metric value
 * @param sampleSize1 - Sample size for first value
 * @param sampleSize2 - Sample size for second value
 * @returns True if difference is statistically significant
 */
export function calculateStatisticalSignificance(
  value1: number,
  value2: number,
  sampleSize1: number,
  sampleSize2: number
): boolean {
  // Require minimum sample sizes
  if (sampleSize1 < MIN_SAMPLE_SIZE || sampleSize2 < MIN_SAMPLE_SIZE) {
    return false;
  }
  
  // Calculate percentage difference
  const avgValue = (value1 + value2) / 2;
  if (avgValue === 0) {
    return false; // Can't calculate percentage difference with zero average
  }
  
  const percentDiff = Math.abs((value1 - value2) / avgValue);
  
  // Calculate confidence threshold based on sample sizes
  // Smaller sample sizes require larger differences to be significant
  const confidenceThreshold = (
    0.1 + // Base threshold
    (0.5 / Math.sqrt(sampleSize1)) + // Adjustment for first sample
    (0.5 / Math.sqrt(sampleSize2))   // Adjustment for second sample
  );
  
  return percentDiff > confidenceThreshold;
}

/**
 * Aggregates metrics over specific time periods
 * 
 * @param metricsArray - Array of content metrics objects
 * @param period - Time period for aggregation ('day', 'week', 'month', etc.)
 * @param startDate - Start date for filtering metrics
 * @param endDate - End date for filtering metrics
 * @returns Aggregated metrics for the specified period
 */
export function aggregateMetricsByPeriod(
  metricsArray: ContentTypes.ContentMetrics[],
  period: string,
  startDate: Date,
  endDate: Date
): AnalyticsTypes.AggregateMetrics {
  if (!metricsArray || metricsArray.length === 0) {
    // Return empty aggregate metrics if no data
    return {
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
      periodStart: startDate,
      periodEnd: endDate,
      period: period as any
    };
  }
  
  // Filter metrics to only include those within the date range
  const filteredMetrics = metricsArray.filter(metrics => {
    const metricDate = metrics.lastUpdated || new Date();
    return metricDate >= startDate && metricDate <= endDate;
  });
  
  // Group metrics by the specified period
  const periodGroups: Record<string, ContentTypes.ContentMetrics[]> = {};
  
  filteredMetrics.forEach(metrics => {
    const metricDate = metrics.lastUpdated || new Date();
    // Get period key based on date
    let periodKey;
    
    switch (period.toLowerCase()) {
      case 'day':
        periodKey = metricDate.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        const weekStart = getDateRangeForPeriod('week', metricDate).startDate;
        periodKey = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        periodKey = `${metricDate.getFullYear()}-${(metricDate.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      default:
        periodKey = 'all'; // Default to single group if period not recognized
    }
    
    if (!periodGroups[periodKey]) {
      periodGroups[periodKey] = [];
    }
    
    periodGroups[periodKey].push(metrics);
  });
  
  // Calculate sums for each direct metric
  let totalViews = 0;
  let totalEngagements = 0;
  let totalShares = 0;
  let totalComments = 0;
  let totalLikes = 0;
  let totalWatchTime = 0;
  let totalEstimatedValue = 0;
  let totalEngagementRate = 0;
  let totalViewThroughRate = 0;
  let periodCount = 0;
  
  // Process each period
  Object.values(periodGroups).forEach(periodMetrics => {
    // Skip empty periods
    if (periodMetrics.length === 0) return;
    
    // Sum metrics for this period
    const periodTotalViews = periodMetrics.reduce((sum, m) => sum + (m.views || 0), 0);
    const periodTotalEngagements = periodMetrics.reduce((sum, m) => sum + (m.engagements || 0), 0);
    const periodTotalShares = periodMetrics.reduce((sum, m) => sum + (m.shares || 0), 0);
    const periodTotalComments = periodMetrics.reduce((sum, m) => sum + (m.comments || 0), 0);
    const periodTotalLikes = periodMetrics.reduce((sum, m) => sum + (m.likes || 0), 0);
    const periodTotalWatchTime = periodMetrics.reduce((sum, m) => sum + (m.watchTime || 0), 0);
    const periodTotalEstimatedValue = periodMetrics.reduce((sum, m) => sum + (m.estimatedValue || 0), 0);
    
    // Calculate period engagement rate
    const periodEngagementRate = periodTotalViews > 0 
      ? (periodTotalEngagements / periodTotalViews) * 100 
      : 0;
    
    // Calculate period view through rate (for video content)
    const periodViewThroughRate = periodMetrics.reduce((sum, m) => {
      // This would be more complex in reality, based on video duration vs. watch time
      return sum + ((m.watchTime || 0) > 0 ? 1 : 0);
    }, 0) / periodMetrics.length * 100;
    
    // Add to totals
    totalViews += periodTotalViews;
    totalEngagements += periodTotalEngagements;
    totalShares += periodTotalShares;
    totalComments += periodTotalComments;
    totalLikes += periodTotalLikes;
    totalWatchTime += periodTotalWatchTime;
    totalEstimatedValue += periodTotalEstimatedValue;
    totalEngagementRate += periodEngagementRate;
    totalViewThroughRate += periodViewThroughRate;
    periodCount++;
  });
  
  // Calculate average rates
  const avgEngagementRate = periodCount > 0 ? totalEngagementRate / periodCount : 0;
  const avgViewThroughRate = periodCount > 0 ? totalViewThroughRate / periodCount : 0;
  
  // Calculate overall engagement rate directly as well for verification
  const overallEngagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;
  
  // Use the more accurate overall rate if it differs significantly from the average
  const finalEngagementRate = Math.abs(overallEngagementRate - avgEngagementRate) > 5 
    ? overallEngagementRate 
    : avgEngagementRate;
  
  // Calculate the number of days in the period for daily averaging
  const daysBetween = getDaysBetween(startDate, endDate) + 1;
  
  return {
    totalViews,
    totalEngagements,
    totalShares,
    totalComments,
    totalLikes,
    totalWatchTime,
    engagementRate: finalEngagementRate,
    viewThroughRate: avgViewThroughRate,
    estimatedTotalValue: totalEstimatedValue,
    growthRates: {}, // Would be populated in a more complex implementation
    periodStart: startDate,
    periodEnd: endDate,
    period: period as any // Cast to expected enum
  };
}

/**
 * Compares metrics against benchmarks for the platform and content type
 * 
 * @param metrics - Content metrics to compare
 * @param platformType - The platform the content is from
 * @param contentType - The type of content
 * @returns Comparison with benchmarks including percentile
 */
export function calculateBenchmarkComparison(
  metrics: ContentTypes.ContentMetrics,
  platformType: PlatformTypes.PlatformType,
  contentType: ContentTypes.ContentType
): Record<string, { value: number; benchmark: number; percentile: number }> {
  // This would typically come from a benchmark database
  // For this implementation, we'll use static benchmarks as an example
  const benchmarks = {
    views: {
      [platformType]: {
        [contentType]: 5000, // Example benchmark value
        percentiles: [100, 500, 1000, 5000, 10000, 50000, 100000] // Example percentile distribution
      }
    },
    engagementRate: {
      [platformType]: {
        [contentType]: 3.5, // Example benchmark
        percentiles: [0.5, 1, 2, 3.5, 5, 7.5, 10] // Example percentile distribution
      }
    },
    shares: {
      [platformType]: {
        [contentType]: 50, // Example benchmark
        percentiles: [5, 10, 25, 50, 100, 250, 500] // Example percentile distribution
      }
    },
    comments: {
      [platformType]: {
        [contentType]: 30, // Example benchmark
        percentiles: [3, 5, 10, 30, 50, 100, 200] // Example percentile distribution
      }
    }
  };
  
  const result: Record<string, { value: number; benchmark: number; percentile: number }> = {};
  
  // Compare views
  const views = metrics.views || 0;
  const viewsBenchmark = benchmarks.views[platformType]?.[contentType] || 5000;
  const viewsPercentile = calculatePercentile(views, benchmarks.views[platformType]?.percentiles || []);
  result.views = { value: views, benchmark: viewsBenchmark, percentile: viewsPercentile };
  
  // Compare engagement rate
  const engagementRate = metrics.engagementRate || 0;
  const engagementRateBenchmark = benchmarks.engagementRate[platformType]?.[contentType] || 3.5;
  const engagementRatePercentile = calculatePercentile(engagementRate, benchmarks.engagementRate[platformType]?.percentiles || []);
  result.engagementRate = { value: engagementRate, benchmark: engagementRateBenchmark, percentile: engagementRatePercentile };
  
  // Compare shares
  const shares = metrics.shares || 0;
  const sharesBenchmark = benchmarks.shares[platformType]?.[contentType] || 50;
  const sharesPercentile = calculatePercentile(shares, benchmarks.shares[platformType]?.percentiles || []);
  result.shares = { value: shares, benchmark: sharesBenchmark, percentile: sharesPercentile };
  
  // Compare comments
  const comments = metrics.comments || 0;
  const commentsBenchmark = benchmarks.comments[platformType]?.[contentType] || 30;
  const commentsPercentile = calculatePercentile(comments, benchmarks.comments[platformType]?.percentiles || []);
  result.comments = { value: comments, benchmark: commentsBenchmark, percentile: commentsPercentile };
  
  return result;
}

/**
 * Helper function to calculate percentile rank based on distribution
 * @param value - Value to find percentile for
 * @param distribution - Ordered array of values representing percentile distribution
 * @returns Percentile rank from 0-100
 */
function calculatePercentile(value: number, distribution: number[]): number {
  if (!distribution || distribution.length === 0) {
    return 50; // Default to median if no distribution provided
  }
  
  // Find position in distribution
  let position = 0;
  while (position < distribution.length && value > distribution[position]) {
    position++;
  }
  
  // Calculate percentile based on position
  return position * (100 / distribution.length);
}

/**
 * Creates a breakdown of metrics by platform
 * 
 * @param platformMetrics - Record of platform types to arrays of content metrics
 * @returns Array of platform breakdown objects with aggregated metrics
 */
export function buildPlatformBreakdown(
  platformMetrics: Record<PlatformTypes.PlatformType, ContentTypes.ContentMetrics[]>
): AnalyticsTypes.PlatformBreakdown[] {
  const platforms = Object.keys(platformMetrics) as PlatformTypes.PlatformType[];
  
  // Calculate totals across all platforms for percentage calculations
  let totalViews = 0;
  let totalEngagements = 0;
  
  platforms.forEach(platform => {
    const metrics = platformMetrics[platform] || [];
    metrics.forEach(metric => {
      totalViews += (metric.views || 0);
      totalEngagements += (metric.engagements || 0);
    });
  });
  
  // Build the breakdown for each platform
  const breakdown: AnalyticsTypes.PlatformBreakdown[] = platforms.map(platform => {
    const metrics = platformMetrics[platform] || [];
    
    // Skip if no metrics for this platform
    if (metrics.length === 0) {
      return {
        platform,
        metrics: {
          views: 0,
          engagements: 0,
          shares: 0,
          comments: 0,
          likes: 0
        },
        percentage: 0,
        engagementRate: 0,
        contentCount: 0,
        estimatedValue: 0
      };
    }
    
    // Aggregate metrics for this platform
    const platformViews = metrics.reduce((sum, m) => sum + (m.views || 0), 0);
    const platformEngagements = metrics.reduce((sum, m) => sum + (m.engagements || 0), 0);
    const platformShares = metrics.reduce((sum, m) => sum + (m.shares || 0), 0);
    const platformComments = metrics.reduce((sum, m) => sum + (m.comments || 0), 0);
    const platformLikes = metrics.reduce((sum, m) => sum + (m.likes || 0), 0);
    const platformEstimatedValue = metrics.reduce((sum, m) => sum + (m.estimatedValue || 0), 0);
    
    // Calculate platform-specific engagement rate
    const platformEngagementRate = platformViews > 0 
      ? (platformEngagements / platformViews) * 100 
      : 0;
    
    // Calculate this platform's percentage of total
    const platformPercentage = totalViews > 0 
      ? (platformViews / totalViews) * 100 
      : 0;
    
    return {
      platform,
      metrics: {
        views: platformViews,
        engagements: platformEngagements,
        shares: platformShares,
        comments: platformComments,
        likes: platformLikes
      },
      percentage: platformPercentage,
      engagementRate: platformEngagementRate,
      contentCount: metrics.length,
      estimatedValue: platformEstimatedValue
    };
  });
  
  // Sort by percentage contribution (descending)
  return breakdown.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Creates a breakdown of metrics by content type
 * 
 * @param contentTypeMetrics - Record of content types to arrays of content metrics
 * @returns Array of content type breakdown objects with aggregated metrics
 */
export function buildContentTypeBreakdown(
  contentTypeMetrics: Record<ContentTypes.ContentType, ContentTypes.ContentMetrics[]>
): AnalyticsTypes.ContentTypeBreakdown[] {
  const contentTypes = Object.keys(contentTypeMetrics) as ContentTypes.ContentType[];
  
  // Calculate totals across all content types for percentage calculations
  let totalViews = 0;
  let totalEngagements = 0;
  
  contentTypes.forEach(contentType => {
    const metrics = contentTypeMetrics[contentType] || [];
    metrics.forEach(metric => {
      totalViews += (metric.views || 0);
      totalEngagements += (metric.engagements || 0);
    });
  });
  
  // Build the breakdown for each content type
  const breakdown: AnalyticsTypes.ContentTypeBreakdown[] = contentTypes.map(contentType => {
    const metrics = contentTypeMetrics[contentType] || [];
    
    // Skip if no metrics for this content type
    if (metrics.length === 0) {
      return {
        contentType,
        metrics: {
          views: 0,
          engagements: 0,
          shares: 0,
          comments: 0,
          likes: 0
        },
        percentage: 0,
        engagementRate: 0,
        contentCount: 0,
        estimatedValue: 0
      };
    }
    
    // Aggregate metrics for this content type
    const typeViews = metrics.reduce((sum, m) => sum + (m.views || 0), 0);
    const typeEngagements = metrics.reduce((sum, m) => sum + (m.engagements || 0), 0);
    const typeShares = metrics.reduce((sum, m) => sum + (m.shares || 0), 0);
    const typeComments = metrics.reduce((sum, m) => sum + (m.comments || 0), 0);
    const typeLikes = metrics.reduce((sum, m) => sum + (m.likes || 0), 0);
    const typeEstimatedValue = metrics.reduce((sum, m) => sum + (m.estimatedValue || 0), 0);
    
    // Calculate content type-specific engagement rate
    const typeEngagementRate = typeViews > 0 
      ? (typeEngagements / typeViews) * 100 
      : 0;
    
    // Calculate this content type's percentage of total
    const typePercentage = totalViews > 0 
      ? (typeViews / totalViews) * 100 
      : 0;
    
    return {
      contentType,
      metrics: {
        views: typeViews,
        engagements: typeEngagements,
        shares: typeShares,
        comments: typeComments,
        likes: typeLikes
      },
      percentage: typePercentage,
      engagementRate: typeEngagementRate,
      contentCount: metrics.length,
      estimatedValue: typeEstimatedValue
    };
  });
  
  // Sort by percentage contribution (descending)
  return breakdown.sort((a, b) => b.percentage - a.percentage);
}