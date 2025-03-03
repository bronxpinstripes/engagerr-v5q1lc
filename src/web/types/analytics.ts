/**
 * Analytics Types
 * 
 * This file contains TypeScript definitions for analytics data structures used
 * throughout the Engagerr web application. It defines standardized metrics,
 * time-series data, and visualization types for cross-platform analytics.
 */

import { PlatformType } from './platform';
import { ContentType } from './content';

/**
 * Time periods for analytics aggregation
 */
export enum MetricPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom'
}

/**
 * Granularity of time series data points
 */
export enum MetricGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

/**
 * Types of metrics tracked across platforms
 */
export enum MetricType {
  VIEWS = 'views',
  ENGAGEMENTS = 'engagements',
  SHARES = 'shares',
  COMMENTS = 'comments',
  LIKES = 'likes',
  WATCH_TIME = 'watch_time',
  CONTENT_VALUE = 'content_value',
  ENGAGEMENT_RATE = 'engagement_rate'
}

/**
 * Chart visualization types for analytics data
 */
export enum ChartTypes {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter'
}

/**
 * Categories of AI-generated analytics insights
 */
export enum InsightType {
  GROWTH = 'growth',
  PERFORMANCE = 'performance',
  CONTENT = 'content',
  AUDIENCE = 'audience',
  PLATFORM = 'platform',
  RECOMMENDATION = 'recommendation'
}

/**
 * Defines a timeframe for analytics queries
 */
export interface AnalyticsTimeframe {
  /** Start date of the timeframe (ISO string) */
  startDate: string;
  /** End date of the timeframe (ISO string) */
  endDate: string;
  /** Period type */
  period: MetricPeriod;
}

/**
 * Daily metrics data point for time series analytics
 */
export interface DailyMetrics {
  /** Date of the metrics (ISO string) */
  date: string;
  /** Number of views/impressions */
  views: number;
  /** Number of engagements (likes, comments, shares) */
  engagements: number;
  /** Number of shares/reposts */
  shares: number;
  /** Number of comments */
  comments: number;
  /** Number of likes/reactions */
  likes: number;
  /** Watch time in minutes (for video content) */
  watchTime: number;
  /** Engagement as percentage of views */
  engagementRate: number;
  /** Estimated monetary value of the content */
  contentValue: number;
}

/**
 * Aggregated metrics across a time period
 */
export interface AggregateMetrics {
  /** Total views/impressions */
  totalViews: number;
  /** Total engagements (likes, comments, shares) */
  totalEngagements: number;
  /** Total shares/reposts */
  totalShares: number;
  /** Total comments */
  totalComments: number;
  /** Total likes/reactions */
  totalLikes: number;
  /** Total watch time in minutes (for video content) */
  totalWatchTime: number;
  /** Average engagement rate as percentage */
  averageEngagementRate: number;
  /** Total estimated monetary value of the content */
  totalContentValue: number;
  /** Total views from previous period for comparison */
  previousPeriodViews: number;
  /** Total engagements from previous period for comparison */
  previousPeriodEngagements: number;
  /** View growth rate compared to previous period */
  viewsGrowthRate: number;
  /** Engagement growth rate compared to previous period */
  engagementGrowthRate: number;
  /** Value growth rate compared to previous period */
  valueGrowthRate: number;
}

/**
 * Time series data for analytics visualizations
 */
export interface TimeSeriesData {
  /** Timeframe for the data */
  timeframe: AnalyticsTimeframe;
  /** Granularity of data points */
  granularity: MetricGranularity;
  /** Metrics included in this time series */
  metrics: MetricType;
  /** Array of data points */
  dataPoints: DailyMetrics[];
}

/**
 * Metrics for a content family showing parent and derivative performance
 */
export interface FamilyMetrics {
  /** ID of the root content */
  rootContentId: string;
  /** Title of the root content */
  rootContentTitle: string;
  /** Number of child content pieces */
  childCount: number;
  /** Distribution of content across platforms */
  platformDistribution: Record<PlatformType, number>;
  /** Aggregated metrics across all content in the family */
  aggregateMetrics: AggregateMetrics;
  /** Metrics for the root content only */
  rootContentMetrics: AggregateMetrics;
  /** Aggregated metrics for child content only */
  childContentMetrics: AggregateMetrics;
}

/**
 * Breakdown of metrics by platform for comparative analysis
 */
export interface PlatformBreakdown {
  /** Platform type */
  platformType: PlatformType;
  /** Views from this platform */
  views: number;
  /** Engagements from this platform */
  engagements: number;
  /** Number of content pieces on this platform */
  contentCount: number;
  /** Percentage of total views */
  viewsPercentage: number;
  /** Percentage of total engagements */
  engagementPercentage: number;
  /** Estimated content value on this platform */
  contentValue: number;
  /** Average engagement rate on this platform */
  engagementRate: number;
}

/**
 * Breakdown of metrics by content type for comparative analysis
 */
export interface ContentTypeBreakdown {
  /** Content type */
  contentType: ContentType;
  /** Views for this content type */
  views: number;
  /** Engagements for this content type */
  engagements: number;
  /** Number of content pieces of this type */
  contentCount: number;
  /** Percentage of total views */
  viewsPercentage: number;
  /** Percentage of total engagements */
  engagementPercentage: number;
  /** Estimated content value for this type */
  contentValue: number;
  /** Average engagement rate for this type */
  engagementRate: number;
}

/**
 * Comprehensive creator metrics across all platforms and content
 */
export interface CreatorAggregateMetrics {
  /** ID of the creator */
  creatorId: string;
  /** Timeframe for the metrics */
  timeframe: AnalyticsTimeframe;
  /** Aggregated metrics across all platforms */
  aggregateMetrics: AggregateMetrics;
  /** Breakdown of metrics by platform */
  platformBreakdown: PlatformBreakdown[];
  /** Breakdown of metrics by content type */
  contentTypeBreakdown: ContentTypeBreakdown[];
  /** Total number of content pieces */
  contentCount: number;
  /** Audience demographic metrics */
  audienceMetrics: AudienceMetrics;
}

/**
 * Audience demographic and behavioral metrics
 */
export interface AudienceMetrics {
  /** Distribution of audience by age ranges */
  ageDistribution: Record<string, number>;
  /** Distribution of audience by gender */
  genderDistribution: Record<string, number>;
  /** Distribution of audience by geography */
  geographicDistribution: Record<string, number>;
  /** Distribution of audience by interest categories */
  interestCategories: Record<string, number>;
  /** Distribution of audience by device types */
  deviceDistribution: Record<string, number>;
  /** Total audience size */
  totalAudience: number;
  /** Estimated total reach (may be larger than audience) */
  estimatedReach: number;
  /** Audience growth rate compared to previous period */
  audienceGrowthRate: number;
}

/**
 * AI-generated insights about analytics data
 */
export interface Insight {
  /** Unique identifier for the insight */
  id: string;
  /** Type of insight */
  type: InsightType;
  /** Short title describing the insight */
  title: string;
  /** Detailed description of the insight */
  description: string;
  /** Supporting metrics for the insight */
  metrics: Record<string, any>;
  /** Priority/importance ranking (1-10) */
  priority: number;
  /** When the insight was generated (ISO string) */
  createdAt: string;
  /** IDs of content related to this insight */
  relatedContentIds: string[];
  /** Whether the insight has an actionable recommendation */
  actionable: boolean;
  /** Optional link to take action on the insight */
  actionLink: string;
}

/**
 * Parameters for analytics API queries
 */
export interface AnalyticsQueryParams {
  /** ID of the creator */
  creatorId: string;
  /** Timeframe for the query */
  timeframe: AnalyticsTimeframe;
  /** Optional filter for specific platforms */
  platformTypes?: PlatformType[];
  /** Optional filter for specific content types */
  contentTypes?: ContentType[];
  /** Types of metrics to include */
  metrics?: MetricType[];
  /** Granularity for time series data */
  granularity?: MetricGranularity;
  /** Whether to include root content in results */
  includeRootContent?: boolean;
  /** Whether to include child content in results */
  includeChildContent?: boolean;
  /** Optional specific content ID to focus on */
  contentId?: string;
}

/**
 * Response structure for analytics API queries
 */
export interface AnalyticsResponse {
  /** Timeframe of the query */
  timeframe: AnalyticsTimeframe;
  /** Aggregated metrics */
  aggregateMetrics: AggregateMetrics;
  /** Time series data */
  timeSeriesData: TimeSeriesData[];
  /** Breakdown by platform */
  platformBreakdown: PlatformBreakdown[];
  /** Breakdown by content type */
  contentTypeBreakdown: ContentTypeBreakdown[];
  /** AI-generated insights */
  insights: Insight[];
  /** Family metrics (if contentId was specified) */
  familyMetrics?: FamilyMetrics;
}

/**
 * Maps platform-specific metrics to standardized metrics
 */
export interface StandardizedMetric {
  /** Original metric name from the platform */
  originalMetric: string;
  /** Platform this metric comes from */
  platformType: PlatformType;
  /** Standardized metric name */
  standardizedName: MetricType;
  /** Conversion factor for standardization */
  conversionFactor: number;
  /** Original value before standardization */
  originalValue: number;
  /** Standardized value after conversion */
  standardizedValue: number;
}

/**
 * Configuration for a dashboard analytics widget
 */
export interface AnalyticsDashboardWidget {
  /** Unique identifier for the widget */
  id: string;
  /** Widget type */
  type: string;
  /** Widget title */
  title: string;
  /** Primary metric to display */
  metric: MetricType;
  /** Chart type for visualization */
  chartType: ChartTypes;
  /** Widget position and size */
  position: { x: number; y: number; w: number; h: number };
  /** Widget-specific filter settings */
  filterSettings?: {
    platforms?: PlatformType[];
    contentTypes?: ContentType[];
  };
}

/**
 * Configuration for a customizable analytics dashboard
 */
export interface AnalyticsDashboardConfig {
  /** Dashboard ID */
  id: string;
  /** Creator ID */
  creatorId: string;
  /** Dashboard name */
  name: string;
  /** Widget configurations */
  widgets: AnalyticsDashboardWidget[];
  /** Default timeframe */
  defaultTimeframe: AnalyticsTimeframe;
  /** Default platform filters */
  defaultPlatforms: PlatformType[];
  /** Default content type filters */
  defaultContentTypes: ContentType[];
  /** Last updated timestamp (ISO string) */
  lastUpdated: string;
}

/**
 * Represents growth metrics for analyzing trends over time
 */
export interface GrowthMetric {
  /** Type of metric being tracked */
  metricType: MetricType;
  /** Current period value */
  currentValue: number;
  /** Previous period value */
  previousValue: number;
  /** Growth rate as percentage */
  growthRate: number;
  /** Trend direction ('up', 'down', 'stable') */
  trend: string;
}

/**
 * Defines available export formats for analytics data
 */
export enum AnalyticsExportFormat {
  CSV = 'csv',
  JSON = 'json',
  PDF = 'pdf'
}

/**
 * Request parameters for exporting analytics data
 */
export interface AnalyticsExportRequest {
  /** Query parameters for the data to export */
  queryParams: AnalyticsQueryParams;
  /** Export format */
  format: AnalyticsExportFormat;
  /** Whether to include chart visualizations in exports (PDF) */
  includeCharts: boolean;
  /** Whether to include AI insights in exports */
  includeInsights: boolean;
}