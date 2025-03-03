import { Request, Response } from '../types/api'; // Import Express request and response type definitions
import analyticsService from '../services/analytics'; // Import analytics service functions
import { AnalyticsTypes } from '../types/analytics'; // Import analytics type definitions
import { validateRequest } from '../utils/validation'; // Import request validation utility
import { handleAsyncError, ValidationError, NotFoundError } from '../utils/errors'; // Import error handling utilities
import * as yup from 'yup'; // Schema validation for request parameters // v1.2.0

/**
 * Controller function to retrieve analytics for a specific content item
 * @param req Express Request object
 * @param res Express Response object
 * @returns Promise<void> Sends HTTP response with content analytics data
 */
export const getContentAnalytics = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  // Extract contentId from request parameters
  const contentId = req.params.contentId;

  // Validate and extract startDate, endDate, and period from query parameters
  const { startDate, endDate, period } = await validateRequest(req, 'query', yup.object({
    startDate: yup.date().optional(),
    endDate: yup.date().optional(),
    period: yup.string().oneOf(Object.values(AnalyticsTypes.MetricPeriod)).optional()
  }));

  // Extract optional parameters (includeTimeSeriesData, includeInsights) from query
  const includeTimeSeriesData = req.query.includeTimeSeriesData === 'true';
  const includeInsights = req.query.includeInsights === 'true';

  // Call analyticsService.getContentAnalytics with validated parameters
  const analyticsData = await analyticsService.getContentAnalytics(
    contentId,
    period as AnalyticsTypes.MetricPeriod,
    startDate,
    endDate,
    { includeTimeSeriesData, includeInsights }
  );

  // Format and send standardized API response with content analytics data
  res.status(200).json({
    data: analyticsData,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Controller function to retrieve analytics for a content family (parent + all derivatives)
 * @param req Express Request object
 * @param res Express Response object
 * @returns Promise<void> Sends HTTP response with content family analytics data
 */
export const getContentFamilyAnalytics = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  // Extract contentId from request parameters (representing root content)
  const contentId = req.params.contentId;

  // Validate and extract startDate, endDate, and period from query parameters
  const { startDate, endDate, period } = await validateRequest(req, 'query', yup.object({
    startDate: yup.date().optional(),
    endDate: yup.date().optional(),
    period: yup.string().oneOf(Object.values(AnalyticsTypes.MetricPeriod)).optional()
  }));

  // Extract optional parameters (includeTimeSeriesData, includeInsights) from query
  const includeTimeSeriesData = req.query.includeTimeSeriesData === 'true';
  const includeInsights = req.query.includeInsights === 'true';

  // Call analyticsService.getContentFamilyAnalytics with validated parameters
  const familyAnalyticsData = await analyticsService.getContentFamilyAnalytics(
    contentId,
    period as AnalyticsTypes.MetricPeriod,
    startDate,
    endDate,
    { includeTimeSeriesData, includeInsights }
  );

  // Format and send standardized API response with family analytics data
  res.status(200).json({
    data: familyAnalyticsData,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Controller function to retrieve aggregated analytics for a creator across all content
 * @param req Express Request object
 * @param res Express Response object
 * @returns Promise<void> Sends HTTP response with creator analytics data
 */
export const getCreatorAnalytics = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  // Extract creatorId from request parameters
  const creatorId = req.params.creatorId;

  // Validate and extract startDate, endDate, and period from query parameters
  const { startDate, endDate, period } = await validateRequest(req, 'query', yup.object({
    startDate: yup.date().optional(),
    endDate: yup.date().optional(),
    period: yup.string().oneOf(Object.values(AnalyticsTypes.MetricPeriod)).optional()
  }));

  // Extract optional parameters (includeTimeSeriesData, includeInsights, platforms) from query
  const includeTimeSeriesData = req.query.includeTimeSeriesData === 'true';
  const includeInsights = req.query.includeInsights === 'true';
  const platforms = req.query.platforms ? (req.query.platforms as string).split(',') : undefined;

  // Call analyticsService.getCreatorAnalytics with validated parameters
  const creatorAnalyticsData = await analyticsService.getCreatorAnalytics(
    creatorId,
    period as AnalyticsTypes.MetricPeriod,
    startDate,
    endDate,
    { includeTimeSeriesData, includeInsights, platforms }
  );

  // Format and send standardized API response with creator analytics data
  res.status(200).json({
    data: creatorAnalyticsData,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Controller function to retrieve time series data for specified metrics
 * @param req Express Request object
 * @param res Express Response object
 * @returns Promise<void> Sends HTTP response with time series data
 */
export const getMetricsTimeSeries = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  // Extract entityId, entityType from request parameters
  const { entityId, entityType } = req.params;

  // Validate and extract startDate, endDate, granularity from query parameters
  const { startDate, endDate, granularity, metrics } = await validateRequest(req, 'query', yup.object({
    startDate: yup.date().required('Start date is required'),
    endDate: yup.date().required('End date is required'),
    granularity: yup.string().oneOf(Object.values(AnalyticsTypes.MetricGranularity)).required('Granularity is required'),
    metrics: yup.string().required('Metrics are required')
  }));

  // Extract metrics array from query parameters (comma-separated list)
  const metricNames = (metrics as string).split(',');

  // Call analyticsService.getMetricsTimeSeries with validated parameters
  const timeSeriesData = await analyticsService.getMetricsTimeSeries(
    entityId,
    entityType,
    metricNames,
    startDate,
    endDate,
    granularity as AnalyticsTypes.MetricGranularity
  );

  // Format and send standardized API response with time series data
  res.status(200).json({
    data: timeSeriesData,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Controller function to handle complex analytics queries with multiple parameters
 * @param req Express Request object
 * @param res Express Response object
 * @returns Promise<void> Sends HTTP response with query results
 */
export const queryAnalytics = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  // Extract and validate complex query parameters from request body
  const queryParams = await validateRequest(req, 'body', yup.object({
    entityId: yup.string().required('Entity ID is required'),
    entityType: yup.string().required('Entity type is required'),
    period: yup.string().oneOf(Object.values(AnalyticsTypes.MetricPeriod)).optional(),
    startDate: yup.date().optional(),
    endDate: yup.date().optional(),
    metrics: yup.array().of(yup.string()).optional(),
    platforms: yup.array().of(yup.string()).optional(),
    contentTypes: yup.array().of(yup.string()).optional(),
    includeTimeSeries: yup.boolean().optional(),
    includeInsights: yup.boolean().optional(),
    includeBenchmarks: yup.boolean().optional(),
    filters: yup.object().optional(),
    granularity: yup.string().oneOf(Object.values(AnalyticsTypes.MetricGranularity)).optional()
  }));

  // Call analyticsService.queryAnalytics with validated parameters
  const queryResults = await analyticsService.queryAnalytics(queryParams);

  // Format and send standardized API response with query results
  res.status(200).json({
    data: queryResults,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Controller function to generate or retrieve analytics-based insights
 * @param req Express Request object
 * @param res Express Response object
 * @returns Promise<void> Sends HTTP response with insights data
 */
export const getInsights = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  // Extract entityId and entityType from request parameters
  const { entityId, entityType } = req.params;

  // Extract optional parameters (insightTypes, refresh) from query
  const insightTypes = req.query.insightTypes ? (req.query.insightTypes as string).split(',') : undefined;
  const refresh = req.query.refresh === 'true';

  // Call analyticsService.generateInsights with parameters
  const insightsData = await analyticsService.generateInsights(
    entityId,
    entityType,
    insightTypes as AnalyticsTypes.InsightType[],
    { refresh }
  );

  // Format and send standardized API response with insights
  res.status(200).json({
    data: insightsData,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Controller function to retrieve insights for a specific content item
 * @param req Express Request object
 * @param res Express Response object
 * @returns Promise<void> Sends HTTP response with content insights
 */
export const getContentInsights = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  // Extract contentId from request parameters
  const contentId = req.params.contentId;

  // Extract includeFamily (boolean) from query parameters
  const includeFamily = req.query.includeFamily === 'true';

  // Call analyticsService.getContentInsights with parameters
  const contentInsightsData = await analyticsService.getContentInsights(
    contentId,
    includeFamily
  );

  // Format and send standardized API response with content insights
  res.status(200).json({
    data: contentInsightsData,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Controller function to get AI-generated content repurposing recommendations
 * @param req Express Request object
 * @param res Express Response object
 * @returns Promise<void> Sends HTTP response with repurposing recommendations
 */
export const getRepurposingRecommendations = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  // Extract contentId from request parameters
  const contentId = req.params.contentId;

  // Extract targetPlatforms (comma-separated list) from query parameters
  const targetPlatforms = req.query.targetPlatforms ? (req.query.targetPlatforms as string).split(',') : undefined;

  // Call analyticsService.getRepurposingRecommendations with parameters
  const recommendationsData = await analyticsService.getRepurposingRecommendations(
    contentId,
    targetPlatforms as PlatformTypes.PlatformType[],
    {}
  );

  // Format and send standardized API response with recommendations
  res.status(200).json({
    data: recommendationsData,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});