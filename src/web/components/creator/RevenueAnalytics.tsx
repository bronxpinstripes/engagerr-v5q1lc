import React, { useMemo, useCallback } from 'react'; // React v18.2.0
import { DollarSign, TrendingUp, PieChart } from 'lucide-react'; // ^0.279.0

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Chart from '../shared/ChartComponents';
import MetricsCard from '../shared/MetricsCard';
import DataTable from '../shared/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { useAnalytics } from '../../hooks/useAnalytics';
import { MetricType, ChartTypes } from '../../types/analytics';
import { formatCurrency, formatPercentage } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * @param timeSeriesData - any[]
 * @returns - Formatted chart data for revenue trends
 */
const prepareTrendData = (timeSeriesData: any[]) => {
  // Extract content value data points from time series
  const contentValueData = timeSeriesData.map(item => ({
    date: item.date,
    value: item.contentValue,
  }));

  // Format data into series with dates and values
  const series = [{
    id: 'revenue',
    name: 'Revenue',
    data: contentValueData,
  }];

  // Return properly structured chart data for the trend chart
  return {
    series,
  };
};

/**
 * @param platformBreakdown - any[]
 * @returns - Formatted chart data for platform breakdown
 */
const preparePlatformData = (platformBreakdown: any[]) => {
  // Extract platform names and content values
  const platformData = platformBreakdown.map(item => ({
    name: item.platformType,
    value: item.contentValue,
  }));

  // Calculate percentages for each platform
  const totalValue = platformData.reduce((sum, item) => sum + item.value, 0);
  const platformPercentages = platformData.map(item => ({
    ...item,
    percentage: (item.value / totalValue) * 100,
  }));

  // Format data for pie chart visualization
  const series = [{
    id: 'platform',
    name: 'Platform',
    data: platformPercentages,
  }];

  // Return properly structured chart data
  return {
    series,
  };
};

/**
 * @param platformBreakdown - any[]
 * @returns - Array of data objects for the DataTable component
 */
const prepareRevenueTable = (platformBreakdown: any[]) => {
  // Map platform breakdown data to table format
  const tableData = platformBreakdown.map(item => ({
    platform: item.platformType,
    revenue: item.contentValue,
    engagement: item.engagements,
    engagementRate: item.engagementRate,
  }));

  // Add calculated fields like growth rate
  const enhancedTableData = tableData.map(item => ({
    ...item,
    growthRate: 0, // Placeholder for growth rate calculation
  }));

  // Sort by revenue value in descending order
  enhancedTableData.sort((a, b) => b.revenue - a.revenue);

  // Return array of formatted data objects
  return enhancedTableData;
};

interface RevenueAnalyticsProps {
  className?: string;
}

/**
 * @param className - string (optional)
 * @returns - Rendered revenue analytics component
 */
const RevenueAnalytics: React.FC<RevenueAnalyticsProps> = ({ className }) => {
  // Use useAnalytics hook to get revenue metrics
  const {
    aggregateMetrics,
    timeSeriesData,
    platformBreakdown,
    selectedPeriod,
    setPeriod,
    periodOptions,
    getTimeSeriesData,
    getPlatformBreakdown,
    isLoading,
  } = useAnalytics();

  // Prepare data for trend chart, platform breakdown, and revenue table
  const trendData = useMemo(() => {
    return prepareTrendData(timeSeriesData);
  }, [timeSeriesData]);

  const platformData = useMemo(() => {
    return preparePlatformData(platformBreakdown);
  }, [platformBreakdown]);

  const revenueTableData = useMemo(() => {
    return prepareRevenueTable(platformBreakdown);
  }, [platformBreakdown]);

  // Render time period selector and overview metrics
  return (
    <div className={cn("grid gap-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Select value={selectedPeriod} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a time period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricsCard
          title="Estimated Revenue"
          value={aggregateMetrics?.totalContentValue || 0}
          isCurrency
          isLoading={isLoading}
          tooltip="Total estimated revenue generated from your content"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricsCard
          title="Engagement Rate"
          value={aggregateMetrics?.averageEngagementRate || 0}
          isPercentage
          isLoading={isLoading}
          tooltip="Average engagement rate across all platforms"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricsCard
          title="Platform Distribution"
          value={platformBreakdown.length}
          isLoading={isLoading}
          tooltip="Number of platforms contributing to revenue"
          icon={<PieChart className="h-4 w-4" />}
        />
      </div>

      {/* Render tabs for different revenue visualizations */}
      <Tabs defaultValue="trend" className="w-full">
        <TabsList>
          <TabsTrigger value="trend">Revenue Trend</TabsTrigger>
          <TabsTrigger value="platform">Platform Breakdown</TabsTrigger>
          <TabsTrigger value="source">Revenue Source</TabsTrigger>
        </TabsList>
        <TabsContent value="trend" className="space-y-4">
          {/* Render trend chart for revenue over time */}
          <Chart
            type={ChartTypes.LINE}
            data={trendData}
            title="Revenue Over Time"
            isLoading={isLoading}
          />
        </TabsContent>
        <TabsContent value="platform" className="space-y-4">
          {/* Render platform breakdown chart */}
          <Chart
            type={ChartTypes.PIE}
            data={platformData}
            title="Revenue by Platform"
            isLoading={isLoading}
          />
        </TabsContent>
        <TabsContent value="source" className="space-y-4">
          {/* Render revenue source breakdown table */}
          <DataTable
            columns={[
              { key: 'platform', header: 'Platform' },
              { key: 'revenue', header: 'Revenue', cell: (row) => formatCurrency(row.revenue) },
              { key: 'engagement', header: 'Engagement', cell: (row) => formatNumber(row.engagement) },
              { key: 'engagementRate', header: 'Engagement Rate', cell: (row) => formatPercentage(row.engagementRate) },
            ]}
            data={revenueTableData}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RevenueAnalytics;