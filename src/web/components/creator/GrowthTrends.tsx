import React, { useMemo } from 'react'; // v18.2.0
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // latest
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // latest
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'; // latest
import { LineChart, BarChart, TrendingUp, Calendar } from 'lucide-react'; // ^0.279.0
import { Skeleton } from '@/components/ui/skeleton'; // latest

import { useAnalytics } from '../../hooks/useAnalytics';
import { Chart } from '../shared/ChartComponents';
import MetricsCard from '../shared/MetricsCard';
import { formatPercentage } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { MetricType, ChartTypes, GrowthMetric } from '../../types/analytics';

/**
 * Calculates growth metrics based on current and previous period data
 * @param aggregateMetrics 
 * @returns Array of growth metrics with current values, previous values, and growth rates
 */
function calculateGrowthMetrics(aggregateMetrics: any): GrowthMetric[] {
  if (!aggregateMetrics) return [];

  const growthMetrics: GrowthMetric[] = [];

  // Calculate views growth metrics using current and previous values
  const viewsGrowth: GrowthMetric = {
    metricType: MetricType.VIEWS,
    currentValue: aggregateMetrics.totalViews,
    previousValue: aggregateMetrics.previousPeriodViews,
    growthRate: aggregateMetrics.viewsGrowthRate,
    trend: 'up',
  };
  growthMetrics.push(viewsGrowth);

  // Calculate engagement growth metrics
  const engagementGrowth: GrowthMetric = {
    metricType: MetricType.ENGAGEMENTS,
    currentValue: aggregateMetrics.totalEngagements,
    previousValue: aggregateMetrics.previousPeriodEngagements,
    growthRate: aggregateMetrics.engagementGrowthRate,
    trend: 'up',
  };
  growthMetrics.push(engagementGrowth);

  // Calculate content value growth metrics
  const contentValueGrowth: GrowthMetric = {
    metricType: MetricType.CONTENT_VALUE,
    currentValue: aggregateMetrics.totalContentValue,
    previousValue: 0,
    growthRate: aggregateMetrics.valueGrowthRate,
    trend: 'up',
  };
  growthMetrics.push(contentValueGrowth);

  // Calculate engagement rate growth metrics
  const engagementRateGrowth: GrowthMetric = {
    metricType: MetricType.ENGAGEMENT_RATE,
    currentValue: aggregateMetrics.averageEngagementRate,
    previousValue: 0,
    growthRate: 0,
    trend: 'up',
  };
  growthMetrics.push(engagementRateGrowth);

  // Return array of growth metrics with type, values, and growth rates
  return growthMetrics;
}

/**
 * Formats date strings for chart display based on period type
 * @param data 
 * @param period 
 * @returns Formatted data with readable date labels
 */
function formatTimeLabels(data: any[], period: string): any[] {
  // Map through the data array
  return data.map(item => {
    let formattedDate = item.label;

    // Format date string based on period (day, week, month)
    if (period === 'day') {
      formattedDate = new Date(item.label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (period === 'week') {
      formattedDate = `Week of ${new Date(item.label).toLocaleDateString()}`;
    } else if (period === 'month') {
      formattedDate = new Date(item.label).toLocaleDateString([], { month: 'short', year: 'numeric' });
    }

    return {
      ...item,
      label: formattedDate
    };
  });
}

/**
 * Determines trend direction based on growth rate
 * @param growthRate 
 * @returns 'up', 'down', or 'neutral' based on growth rate
 */
function getTrendDirection(growthRate: number): string {
  // If growth rate is greater than 0, return 'up'
  if (growthRate > 0) {
    return 'up';
  }
  // If growth rate is less than 0, return 'down'
  if (growthRate < 0) {
    return 'down';
  }
  // Otherwise return 'neutral'
  return 'neutral';
}

interface GrowthTrendsProps {
  className?: string;
  contentId?: string;
}

/**
 * Component for displaying growth trends for creators
 * @param props 
 * @returns Rendered component with growth metrics and visualizations
 */
export function GrowthTrends({ className, contentId }: GrowthTrendsProps): JSX.Element {
  // Destructure className and contentId from props
  // Initialize state for selected metric type and time period
  // Use useAnalytics hook to get analytics data
  const {
    isLoading,
    aggregateMetrics,
    timeSeriesData,
    selectedPeriod,
    setPeriod,
    getTimeSeriesData,
  } = useAnalytics({ contentId });

  // Calculate growth metrics from aggregate data
  const growthMetrics = useMemo(() => {
    return calculateGrowthMetrics(aggregateMetrics);
  }, [aggregateMetrics]);

  // Generate chart data for time series visualization
  const chartData = useMemo(() => {
    const formattedData = getTimeSeriesData(ChartTypes.LINE);
    return formatTimeLabels(formattedData[0]?.data || [], selectedPeriod);
  }, [timeSeriesData, selectedPeriod]);

  // Render loading state when data is being fetched
  if (isLoading) {
    return (
      <Card className={cn('col-span-2', className)}>
        <CardHeader>
          <CardTitle>Growth Trends</CardTitle>
        </CardHeader>
        <CardContent className="pl-6">
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Render metrics cards for key growth indicators
  // Render tabs for switching between metric types
  // Render line chart for visualizing trends over time
  // Add period selector for time range filtering
  return (
    <Card className={cn('col-span-2', className)}>
      <CardHeader>
        <CardTitle>Growth Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 pb-4">
          <Calendar className="h-4 w-4" />
          <Select value={selectedPeriod} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Time Period</SelectLabel>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MetricsCard
            title="Views"
            value={aggregateMetrics?.totalViews || 0}
            trend={aggregateMetrics?.viewsGrowthRate}
            trendDirection={getTrendDirection(aggregateMetrics?.viewsGrowthRate || 0)}
          />
          <MetricsCard
            title="Engagements"
            value={aggregateMetrics?.totalEngagements || 0}
            trend={aggregateMetrics?.engagementGrowthRate}
            trendDirection={getTrendDirection(aggregateMetrics?.engagementGrowthRate || 0)}
          />
        </div>
        <div className="mt-6">
          <Chart
            type="line"
            data={{
              series: [
                {
                  id: 'views',
                  name: 'Views',
                  data: chartData,
                },
              ],
            }}
            options={{
              xAxis: {
                label: 'Date',
              },
              yAxis: {
                label: 'Views',
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default GrowthTrends;