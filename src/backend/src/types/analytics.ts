/**
 * Analytics-related type definitions for the Engagerr platform.
 * 
 * This file defines interfaces, types, and enums related to metrics processing and analytics
 * functionality. These types support standardizing and aggregating metrics across different 
 * platforms, enabling unified performance tracking for content creators.
 */

import { ContentType, Content } from './content';
import { PlatformType } from './platform';

/**
 * Enum defining time periods for analytics aggregation.
 */
export enum MetricPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom',
  ALL_TIME = 'all_time'
}

/**
 * Enum defining granularity levels for time series data.
 */
export enum MetricGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

/**
 * Enum defining types of insights that can be generated from analytics data.
 */
export enum InsightType {
  PERFORMANCE = 'performance',
  CONTENT_STRATEGY = 'content_strategy',
  AUDIENCE = 'audience',
  PLATFORM = 'platform',
  GROWTH = 'growth',
  MONETIZATION = 'monetization'
}

/**
 * Interface for daily metrics of a specific content item.
 */
export interface DailyMetrics {
  /** Unique identifier */
  id: string;
  
  /** Reference to the content item */
  contentId: string;
  
  /** The date these metrics represent */
  date: Date;
  
  /** Number of views/impressions */
  views: number;
  
  /** Number of engagements (combined interactions) */
  engagements: number;
  
  /** Engagement rate (engagements/views) */
  engagementRate: number;
  
  /** Number of shares/reposts */
  shares: number;
  
  /** Number of comments */
  comments: number;
  
  /** Number of likes/reactions */
  likes: number;
  
  /** Watch time in minutes (for video content) */
  watchTime: number;
  
  /** Estimated monetary value of the content for this day */
  estimatedValue: number;
  
  /** Platform-specific metrics that don't map to standard categories */
  platformSpecificMetrics: Record<string, any>;
  
  /** When these metrics were last updated */
  lastUpdated: Date;
}

/**
 * Interface for aggregate metrics over a time period.
 */
export interface AggregateMetrics {
  /** Total views/impressions */
  totalViews: number;
  
  /** Total engagements */
  totalEngagements: number;
  
  /** Total shares/reposts */
  totalShares: number;
  
  /** Total comments */
  totalComments: number;
  
  /** Total likes/reactions */
  totalLikes: number;
  
  /** Total watch time in minutes (for video content) */
  totalWatchTime: number;
  
  /** Overall engagement rate (totalEngagements/totalViews) */
  engagementRate: number;
  
  /** View-through rate (for video content) */
  viewThroughRate: number;
  
  /** Estimated total monetary value */
  estimatedTotalValue: number;
  
  /** Growth rates compared to previous period */
  growthRates: Record<string, number>;
  
  /** Start of the period these metrics cover */
  periodStart: Date;
  
  /** End of the period these metrics cover */
  periodEnd: Date;
  
  /** The type of period these metrics represent */
  period: MetricPeriod;
}

/**
 * Interface for metrics across an entire content family.
 */
export interface FamilyMetrics {
  /** ID of the root content */
  rootContentId: string;
  
  /** Aggregate metrics for the entire family */
  aggregateMetrics: AggregateMetrics;
  
  /** Breakdown of metrics by platform */
  platformBreakdown: PlatformBreakdown[];
  
  /** Breakdown of metrics by content type */
  contentTypeBreakdown: ContentTypeBreakdown[];
  
  /** Audience overlap estimation */
  audienceOverlap: AudienceOverlap;
  
  /** Estimated unique reach (accounting for audience overlap) */
  uniqueReachEstimate: number;
  
  /** Total number of content items in the family */
  contentCount: number;
  
  /** Number of different platforms in the content family */
  platformCount: number;
  
  /** Content items in the family with key metrics */
  contentItems: {
    id: string;
    title: string;
    platform: PlatformType;
    contentType: ContentType;
    metrics: Record<string, number>;
  }[];
}

/**
 * Interface for aggregate metrics across all creator content.
 */
export interface CreatorAggregateMetrics {
  /** Creator ID */
  creatorId: string;
  
  /** Aggregate metrics across all content */
  aggregateMetrics: AggregateMetrics;
  
  /** Breakdown of metrics by platform */
  platformBreakdown: PlatformBreakdown[];
  
  /** Breakdown of metrics by content type */
  contentTypeBreakdown: ContentTypeBreakdown[];
  
  /** Audience demographics data */
  audienceDemographics: Record<string, any>;
  
  /** Growth-related metrics */
  growthMetrics: Record<string, number>;
  
  /** Benchmark comparisons */
  benchmarks: BenchmarkData[];
  
  /** Top performing content items with key metrics */
  topPerformingContent: {
    id: string;
    title: string;
    platform: PlatformType;
    contentType: ContentType;
    metrics: Record<string, number>;
  }[];
  
  /** Total number of content families */
  contentFamilyCount: number;
  
  /** Total number of content items */
  totalContentCount: number;
}

/**
 * Interface for time series data for a specific metric.
 */
export interface TimeSeriesData {
  /** Name of the metric */
  metricName: string;
  
  /** Granularity of the data points */
  granularity: MetricGranularity;
  
  /** Start date of the time series */
  startDate: Date;
  
  /** End date of the time series */
  endDate: Date;
  
  /** The data points in the series */
  dataPoints: { date: Date; value: number }[];
  
  /** Trend direction (increasing, decreasing, stable) */
  trend: string;
  
  /** Percentage change over the period */
  percentChange: number;
}

/**
 * Interface for metrics breakdown by platform.
 */
export interface PlatformBreakdown {
  /** Platform type */
  platform: PlatformType;
  
  /** Key metrics for this platform */
  metrics: Record<string, number>;
  
  /** Percentage of total engagement/views this platform represents */
  percentage: number;
  
  /** Engagement rate for this platform */
  engagementRate: number;
  
  /** Number of content items on this platform */
  contentCount: number;
  
  /** Estimated monetary value from this platform */
  estimatedValue: number;
}

/**
 * Interface for metrics breakdown by content type.
 */
export interface ContentTypeBreakdown {
  /** Content type */
  contentType: ContentType;
  
  /** Key metrics for this content type */
  metrics: Record<string, number>;
  
  /** Percentage of total engagement/views this content type represents */
  percentage: number;
  
  /** Engagement rate for this content type */
  engagementRate: number;
  
  /** Number of content items of this type */
  contentCount: number;
  
  /** Estimated monetary value from this content type */
  estimatedValue: number;
}

/**
 * Interface for audience overlap estimation across platforms and content.
 */
export interface AudienceOverlap {
  /** Overlap between platform pairs */
  platformPairs: {
    platforms: [PlatformType, PlatformType];
    overlapPercentage: number;
  }[];
  
  /** Overlap between content pairs */
  contentPairs: {
    contentIds: [string, string];
    overlapPercentage: number;
  }[];
  
  /** Estimated audience duplication percentage */
  estimatedDuplication: number;
  
  /** Estimated unique reach (accounting for overlap) */
  estimatedUniqueReach: number;
}

/**
 * Interface for AI-generated insights from analytics data.
 */
export interface Insight {
  /** Unique identifier */
  id: string;
  
  /** ID of the entity this insight relates to (creator, content, etc.) */
  entityId: string;
  
  /** Type of entity this insight relates to */
  entityType: string;
  
  /** Type of insight */
  insightType: InsightType;
  
  /** Insight title/summary */
  title: string;
  
  /** Detailed explanation */
  description: string;
  
  /** Supporting metrics */
  metrics: Record<string, any>;
  
  /** Actionable recommendations */
  recommendationActions: string[];
  
  /** Priority level (higher = more important) */
  priority: number;
  
  /** When this insight was generated */
  createdAt: Date;
}

/**
 * Interface for benchmark comparison data.
 */
export interface BenchmarkData {
  /** Type of benchmark (industry, category, platform) */
  benchmarkType: string;
  
  /** Specific group being compared against */
  benchmarkGroup: string;
  
  /** Creator's metrics */
  metrics: Record<string, number>;
  
  /** Benchmark metrics for comparison */
  comparison: Record<string, number>;
  
  /** Percentile rank compared to benchmark group */
  percentileRank: number;
}

/**
 * Interface for platform-specific metric standardization configuration.
 */
export interface MetricsStandardization {
  /** Platform type */
  platform: PlatformType;
  
  /** Weighting factor for engagement metrics */
  engagementWeight: number;
  
  /** Weighting factor for view metrics */
  viewWeight: number;
  
  /** Weighting factor for share metrics */
  shareWeight: number;
  
  /** Weighting factor for comment metrics */
  commentWeight: number;
  
  /** Weighting factor for like metrics */
  likeWeight: number;
  
  /** Platform-specific factor for normalizing engagement rates */
  platformEngagementFactor: number;
  
  /** Platform-specific factor for calculating content value */
  platformValueFactor: number;
  
  /** Mapping of platform-specific metric names to standard metric names */
  metricMappings: Record<string, string>;
}

/**
 * Interface for AI-generated content repurposing recommendations.
 */
export interface RepurposingRecommendation {
  /** ID of the source content to repurpose */
  sourceContentId: string;
  
  /** Recommended target platform */
  targetPlatform: PlatformType;
  
  /** Recommended content type for the target platform */
  targetContentType: ContentType;
  
  /** Suggested title */
  title: string;
  
  /** Suggested description */
  description: string;
  
  /** Key points to include */
  keyPoints: string[];
  
  /** Format suggestions */
  formatSuggestions: string[];
  
  /** Expected performance metrics */
  expectedPerformance: Record<string, number>;
  
  /** Confidence score for this recommendation (0.0-1.0) */
  confidence: number;
}

/**
 * Interface for complex analytics query parameters.
 */
export interface AnalyticsQueryParams {
  /** ID of the entity to analyze (creator, content, etc.) */
  entityId: string;
  
  /** Type of entity to analyze */
  entityType: string;
  
  /** Time period to analyze */
  period: MetricPeriod;
  
  /** Custom start date (if period is CUSTOM) */
  startDate: Date;
  
  /** Custom end date (if period is CUSTOM) */
  endDate: Date;
  
  /** Specific metrics to include */
  metrics: string[];
  
  /** Platforms to include */
  platforms: PlatformType[];
  
  /** Content types to include */
  contentTypes: ContentType[];
  
  /** Whether to include time series data */
  includeTimeSeries: boolean;
  
  /** Whether to include AI-generated insights */
  includeInsights: boolean;
  
  /** Whether to include benchmark comparisons */
  includeBenchmarks: boolean;
  
  /** Additional filters to apply */
  filters: Record<string, any>;
  
  /** Granularity for time series data */
  granularity: MetricGranularity;
}

/**
 * Type for mapping metric names to time series data.
 */
export type MetricToTimeSeriesData = Record<string, TimeSeriesData>;

/**
 * Interface for comprehensive analytics query results.
 */
export interface EntityAnalyticsResult {
  /** ID of the analyzed entity */
  entityId: string;
  
  /** Type of analyzed entity */
  entityType: string;
  
  /** Metrics data for the entity */
  metrics: AggregateMetrics | FamilyMetrics | CreatorAggregateMetrics;
  
  /** Time series data by metric name */
  timeSeries: MetricToTimeSeriesData;
  
  /** AI-generated insights */
  insights: Insight[];
  
  /** Benchmark comparisons */
  benchmarks: BenchmarkData[];
}