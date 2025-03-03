import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from 'react-query'; // v5.0.0
import { addDays, subDays, subWeeks, subMonths, subQuarters, subYears, format } from 'date-fns'; // v2.30.0

import { 
  MetricPeriod, 
  MetricType, 
  AnalyticsTimeframe, 
  AnalyticsQueryParams, 
  AnalyticsResponse, 
  CreatorAggregateMetrics, 
  TimeSeriesData, 
  PlatformBreakdown, 
  ContentTypeBreakdown, 
  AggregateMetrics, 
  FamilyMetrics, 
  Insight, 
  ChartTypes 
} from '../types/analytics';
import { PlatformType } from '../types/platform';
import { ContentType } from '../types/content';
import { TIMEFRAMES, API_ROUTES } from '../lib/constants';
import { api } from '../lib/api';
import { 
  calculateEngagementRate, 
  prepareTimeSeriesData, 
  preparePlatformComparisonData, 
  calculateAggregateMetrics, 
  formatAnalyticsForMediaKit 
} from '../lib/analytics';
import useAuth from './useAuth';

/**
 * Custom hook that provides access to analytics data with filtering capabilities.
 * This hook fetches cross-platform analytics data, handles caching, and provides methods
 * for filtering and formatting the data for visualization across different platforms.
 * 
 * @param initialOptions - Optional configuration including contentId, period, platforms, contentTypes
 * @returns Object containing analytics data, filters, and utility functions
 */
export function useAnalytics(initialOptions?: {
  contentId?: string;
  period?: MetricPeriod;
  platforms?: PlatformType[];
  contentTypes?: ContentType[];
}) {
  // Extract authenticated user from useAuth hook
  const { user } = useAuth();
  
  // State for filters and selections
  const [selectedPeriod, setPeriod] = useState<MetricPeriod>(
    initialOptions?.period || MetricPeriod.MONTH
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>(
    initialOptions?.platforms || []
  );
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>(
    initialOptions?.contentTypes || []
  );
  
  // Query client for caching and invalidation
  const queryClient = useQueryClient();
  
  // Calculate timeframe based on selected period
  const timeframe = useMemo(() => 
    getTimeframeFromPeriod(selectedPeriod), 
    [selectedPeriod]
  );
  
  // Construct analytics query parameters
  const queryParams: AnalyticsQueryParams = useMemo(() => ({
    creatorId: user?.id || '',
    timeframe,
    platformTypes: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
    contentTypes: selectedContentTypes.length > 0 ? selectedContentTypes : undefined,
    contentId: initialOptions?.contentId,
  }), [user?.id, timeframe, selectedPlatforms, selectedContentTypes, initialOptions?.contentId]);
  
  // Fetch creator analytics data using React Query
  const { 
    data, 
    isLoading, 
    error, 
  } = useQuery<AnalyticsResponse, Error>(
    ['analytics', queryParams], 
    () => api.get(`${API_ROUTES.ANALYTICS}`, queryParams),
    { 
      enabled: !!user?.id, // Only run query if user is authenticated
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
      onError: (err) => {
        console.error('Error fetching analytics data:', err);
      }
    }
  );
  
  // Fetch content family metrics if contentId is provided
  const { 
    data: familyData, 
    isLoading: isFamilyLoading 
  } = useQuery<{ familyMetrics: FamilyMetrics }, Error>(
    ['analytics', 'family', initialOptions?.contentId], 
    () => api.get(`${API_ROUTES.CONTENT}/${initialOptions?.contentId}/family`),
    { 
      enabled: !!initialOptions?.contentId && !!user?.id,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
      onError: (err) => {
        console.error('Error fetching family metrics:', err);
      }
    }
  );
  
  // Extract analytics data from API response
  const creatorMetrics: CreatorAggregateMetrics | null = data?.creatorMetrics || null;
  const aggregateMetrics: AggregateMetrics | null = data?.aggregateMetrics || null;
  const timeSeriesData: TimeSeriesData[] = data?.timeSeriesData || [];
  const platformBreakdown: PlatformBreakdown[] = data?.platformBreakdown || [];
  const contentTypeBreakdown: ContentTypeBreakdown[] = data?.contentTypeBreakdown || [];
  const insights: Insight[] = data?.insights || [];
  const familyMetrics: FamilyMetrics | null = familyData?.familyMetrics || null;
  
  // Prepare period options for dropdown selection
  const periodOptions = useMemo(() => formatPeriodOptions(), []);
  
  // Function to get time series data formatted for charts
  const getTimeSeriesData = useCallback((chartType: ChartTypes = ChartTypes.LINE) => {
    if (!timeSeriesData || timeSeriesData.length === 0) return [];
    
    return prepareTimeSeriesData(timeSeriesData, chartType);
  }, [timeSeriesData]);
  
  // Function to get aggregate metrics formatted for display
  const getAggregateMetrics = useCallback(() => {
    if (!aggregateMetrics) return null;
    
    return calculateAggregateMetrics(aggregateMetrics);
  }, [aggregateMetrics]);
  
  // Function to get platform breakdown formatted for visualization
  const getPlatformBreakdown = useCallback((chartType: ChartTypes = ChartTypes.PIE) => {
    if (!platformBreakdown || platformBreakdown.length === 0) return [];
    
    return preparePlatformComparisonData(platformBreakdown, chartType);
  }, [platformBreakdown]);
  
  // Function to get content type breakdown formatted for visualization
  const getContentTypeBreakdown = useCallback((chartType: ChartTypes = ChartTypes.BAR) => {
    if (!contentTypeBreakdown || contentTypeBreakdown.length === 0) return [];
    
    // Process content type data for visualization
    // Using a similar structure to platform data for consistency
    return contentTypeBreakdown.map(item => ({
      name: item.contentType,
      value: item.viewsPercentage,
      engagementValue: item.engagementPercentage,
      contentCount: item.contentCount,
      contentValue: item.contentValue,
      engagementRate: item.engagementRate,
    }));
  }, [contentTypeBreakdown]);
  
  // Function to get insights sorted by priority
  const getInsights = useCallback(() => {
    if (!insights.length) return [];
    return [...insights].sort((a, b) => b.priority - a.priority);
  }, [insights]);
  
  // Function to export analytics data in different formats
  const exportAnalytics = useCallback((format: string = 'csv') => {
    if (!creatorMetrics) return null;
    
    return formatAnalyticsForMediaKit(creatorMetrics, format);
  }, [creatorMetrics]);
  
  // Function to refresh analytics data
  const refreshAnalytics = useCallback(() => {
    // Invalidate all analytics queries to fetch fresh data
    queryClient.invalidateQueries(['analytics']);
    if (initialOptions?.contentId) {
      queryClient.invalidateQueries(['analytics', 'family', initialOptions.contentId]);
    }
  }, [queryClient, initialOptions?.contentId]);
  
  return {
    // Data states
    isLoading: isLoading || isFamilyLoading,
    error,
    creatorMetrics,
    aggregateMetrics,
    timeSeriesData,
    platformBreakdown,
    contentTypeBreakdown,
    insights,
    familyMetrics,
    
    // Filter states
    selectedPeriod,
    timeframe,
    selectedPlatforms,
    selectedContentTypes,
    periodOptions,
    
    // Filter setters
    setPeriod,
    setSelectedPlatforms,
    setSelectedContentTypes,
    
    // Data formatters for visualization
    getTimeSeriesData,
    getAggregateMetrics,
    getPlatformBreakdown,
    getContentTypeBreakdown,
    getInsights,
    
    // Actions
    exportAnalytics,
    refreshAnalytics,
  };
}

/**
 * Calculates start and end dates based on the selected period
 * @param period - The metric period to calculate timeframe for
 * @returns Timeframe with start date, end date, and period
 */
function getTimeframeFromPeriod(period: MetricPeriod): AnalyticsTimeframe {
  const endDate = new Date();
  let startDate: Date;

  switch (period) {
    case MetricPeriod.DAY:
      startDate = subDays(endDate, 1);
      break;
    case MetricPeriod.WEEK:
      startDate = subWeeks(endDate, 1);
      break;
    case MetricPeriod.MONTH:
      startDate = subMonths(endDate, 1);
      break;
    case MetricPeriod.QUARTER:
      startDate = subQuarters(endDate, 1);
      break;
    case MetricPeriod.YEAR:
      startDate = subYears(endDate, 1);
      break;
    case MetricPeriod.CUSTOM:
    default:
      // Default to last 30 days if custom or unknown
      startDate = subDays(endDate, 30);
      break;
  }

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    period,
  };
}

/**
 * Formats period options for dropdown selection
 * @returns Array of period option objects with label and value
 */
function formatPeriodOptions() {
  return Object.keys(TIMEFRAMES).map(key => ({
    label: TIMEFRAMES[key as keyof typeof TIMEFRAMES].name,
    value: TIMEFRAMES[key as keyof typeof TIMEFRAMES].id as MetricPeriod,
  }));
}