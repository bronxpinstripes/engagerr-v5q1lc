import React, { useState, useEffect, useMemo, useCallback } from 'react'; // react v18.2.0
import { Download, BarChart3, LineChart, PieChart, Filter, RefreshCw } from 'lucide-react'; // lucide-react v0.279.0
import { useAnalytics } from '../../hooks/useAnalytics';
import Chart from '../shared/ChartComponents';
import { ChartContainer } from '../shared/ChartComponents';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption
} from '../ui/Table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/Select';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from '../ui/Card';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '../ui/Tabs';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import {
  MetricType, ChartTypes, PlatformBreakdown, ContentTypeBreakdown
} from '../../types/analytics';
import { PlatformType } from '../../types/platform';
import { ContentType } from '../../types/content';
import {
  formatMetricValue, formatPercentage, formatCompactNumber, formatPlatformName
} from '../../lib/formatters';
import { METRIC_DISPLAY_NAMES } from '../../lib/constants';

/**
 * Main component for displaying detailed content performance analytics
 * @param props 
 * @returns Rendered component with analytics visualizations and controls
 */
const ContentPerformance: React.FC = () => {
  // Initialize useAnalytics hook to fetch and manage analytics data
  const {
    isLoading,
    error,
    timeSeriesData,
    platformBreakdown,
    contentTypeBreakdown,
    selectedPeriod,
    selectedPlatforms,
    selectedContentTypes,
    periodOptions,
    setPeriod,
    setSelectedPlatforms,
    setSelectedContentTypes,
    getTimeSeriesData,
    getPlatformBreakdown,
    getContentTypeBreakdown,
    refreshAnalytics,
  } = useAnalytics();

  // Set up state for selected metrics, chart type, and active tab
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>([
    MetricType.VIEWS,
    MetricType.ENGAGEMENTS,
  ]);
  const [chartType, setChartType] = useState<ChartTypes>(ChartTypes.LINE);
  const [activeTab, setActiveTab] = useState('overview');

  // Create filter handlers for time period, platform, and content type selection
  const handlePeriodChange = (period: string) => {
    setPeriod(period as MetricType);
  };

  const handlePlatformChange = (platform: PlatformType) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleContentTypeChange = (contentType: ContentType) => {
    setSelectedContentTypes((prev) =>
      prev.includes(contentType)
        ? prev.filter((ct) => ct !== contentType)
        : [...prev, contentType]
    );
  };

  // Format and prepare data for different chart visualizations
  const timeSeriesChartData = useMemo(() => {
    return getTimeSeriesData(chartType);
  }, [getTimeSeriesData, chartType]);

  const platformBreakdownChartData = useMemo(() => {
    return getPlatformBreakdown(ChartTypes.PIE);
  }, [getPlatformBreakdown]);

  const contentTypeBreakdownChartData = useMemo(() => {
    return getContentTypeBreakdown(ChartTypes.BAR);
  }, [getContentTypeBreakdown]);

  // Create memoized chart data for performance optimization
  const memoizedTimeSeriesChart = useMemo(() => (
    <TimeSeriesChart
      data={timeSeriesChartData}
      metrics={selectedMetrics}
      isLoading={isLoading}
      chartType={chartType}
    />
  ), [timeSeriesChartData, selectedMetrics, isLoading, chartType]);

  const memoizedPlatformBreakdownChart = useMemo(() => (
    <PlatformBreakdownChart
      data={platformBreakdownChartData}
      selectedMetric={MetricType.VIEWS}
      isLoading={isLoading}
    />
  ), [platformBreakdownChartData, isLoading]);

  const memoizedPlatformBreakdownTable = useMemo(() => (
    <PlatformBreakdownTable
      data={platformBreakdownChartData}
      isLoading={isLoading}
    />
  ), [platformBreakdownChartData, isLoading]);

  const memoizedContentTypeBreakdownChart = useMemo(() => (
    <ContentTypeBreakdownChart
      data={contentTypeBreakdownChartData}
      selectedMetric={MetricType.VIEWS}
      isLoading={isLoading}
    />
  ), [contentTypeBreakdownChartData, isLoading]);

  const memoizedContentTypeBreakdownTable = useMemo(() => (
    <ContentTypeBreakdownTable
      data={contentTypeBreakdownChartData}
      isLoading={isLoading}
    />
  ), [contentTypeBreakdownChartData, isLoading]);

  return (
    <div>
      {/* Render container with filter controls at the top */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Performance Filters</CardTitle>
          <CardDescription>
            Customize the data displayed in the charts below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <PeriodFilter
            selectedPeriod={selectedPeriod}
            periods={periodOptions}
            onChange={handlePeriodChange}
          />
          <PlatformFilter
            selectedPlatforms={selectedPlatforms}
            availablePlatforms={[]}
            onChange={handlePlatformChange}
          />
          <ContentTypeFilter
            selectedContentTypes={selectedContentTypes}
            availableContentTypes={[]}
            onChange={handleContentTypeChange}
          />
          <MetricFilter
            selectedMetrics={selectedMetrics}
            onChange={setSelectedMetrics}
          />
          <Button variant="outline" size="sm" onClick={refreshAnalytics}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </CardContent>
      </Card>

      {/* Render tabs for switching between different metric views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="contentTypes">Content Types</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {/* Render time series charts for selected metrics */}
          <ChartContainer
            title="Performance Trends"
            subtitle="Views and engagements over time"
            isLoading={isLoading}
            error={error?.message}
          >
            {memoizedTimeSeriesChart}
          </ChartContainer>
        </TabsContent>
        <TabsContent value="platforms" className="space-y-4">
          {/* Render platform breakdown charts and tables */}
          <ChartContainer
            title="Platform Breakdown"
            subtitle="Distribution of views across platforms"
            isLoading={isLoading}
            error={error?.message}
          >
            {memoizedPlatformBreakdownChart}
          </ChartContainer>
          <ChartContainer
            title="Platform Metrics Table"
            subtitle="Detailed metrics for each platform"
            isLoading={isLoading}
            error={error?.message}
          >
            {memoizedPlatformBreakdownTable}
          </ChartContainer>
        </TabsContent>
        <TabsContent value="contentTypes" className="space-y-4">
          {/* Render content type breakdown charts and tables */}
          <ChartContainer
            title="Content Type Breakdown"
            subtitle="Distribution of views across content types"
            isLoading={isLoading}
            error={error?.message}
          >
            {memoizedContentTypeBreakdownChart}
          </ChartContainer>
          <ChartContainer
            title="Content Type Metrics Table"
            subtitle="Detailed metrics for each content type"
            isLoading={isLoading}
            error={error?.message}
          >
            {memoizedContentTypeBreakdownTable}
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/**
 * Component for selecting which metrics to display in charts
 * @param param0 
 * @returns Metric selection controls
 */
const MetricFilter: React.FC<{
  selectedMetrics: MetricType[];
  onChange: (metrics: MetricType[]) => void;
}> = ({ selectedMetrics, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.values(MetricType).map((metric) => (
        <Button
          key={metric}
          variant={selectedMetrics.includes(metric) ? 'primary' : 'outline'}
          size="sm"
          onClick={() => {
            onChange(
              selectedMetrics.includes(metric)
                ? selectedMetrics.filter((m) => m !== metric)
                : [...selectedMetrics, metric]
            );
          }}
        >
          {METRIC_DISPLAY_NAMES[metric]}
        </Button>
      ))}
    </div>
  );
};

/**
 * Component for selecting the time period for analytics
 * @param param0 
 * @returns Time period dropdown selector
 */
const PeriodFilter: React.FC<{
  selectedPeriod: string;
  periods: { label: string; value: string }[];
  onChange: (period: string) => void;
}> = ({ selectedPeriod, periods, onChange }) => {
  return (
    <Select value={selectedPeriod} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a time period" />
      </SelectTrigger>
      <SelectContent>
        {periods.map((period) => (
          <SelectItem key={period.value} value={period.value}>
            {period.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/**
 * Component for filtering content by platform
 * @param param0 
 * @returns Platform filter controls with badges
 */
const PlatformFilter: React.FC<{
  selectedPlatforms: PlatformType[];
  availablePlatforms: PlatformType[];
  onChange: (platform: PlatformType) => void;
}> = ({ selectedPlatforms, availablePlatforms, onChange }) => {
  const allPlatformsSelected = selectedPlatforms.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={allPlatformsSelected ? 'primary' : 'outline'}
        onClick={() => onChange('all')}
        className="cursor-pointer"
      >
        All Platforms
      </Badge>
      {availablePlatforms.map((platform) => (
        <Badge
          key={platform}
          variant={selectedPlatforms.includes(platform) ? 'primary' : 'outline'}
          onClick={() => onChange(platform)}
          className="cursor-pointer"
        >
          {formatPlatformName(platform)}
        </Badge>
      ))}
    </div>
  );
};

/**
 * Component for filtering by content type
 * @param param0 
 * @returns Content type filter controls
 */
const ContentTypeFilter: React.FC<{
  selectedContentTypes: ContentType[];
  availableContentTypes: ContentType[];
  onChange: (contentType: ContentType) => void;
}> = ({ selectedContentTypes, availableContentTypes, onChange }) => {
  const allTypesSelected = selectedContentTypes.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={allTypesSelected ? 'primary' : 'outline'}
        onClick={() => onChange('all')}
        className="cursor-pointer"
      >
        All Types
      </Badge>
      {availableContentTypes.map((contentType) => (
        <Badge
          key={contentType}
          variant={selectedContentTypes.includes(contentType) ? 'primary' : 'outline'}
          onClick={() => onChange(contentType)}
          className="cursor-pointer"
        >
          {contentType}
        </Badge>
      ))}
    </div>
  );
};

/**
 * Component for rendering time series performance charts
 * @param param0 
 * @returns Time series visualization chart
 */
const TimeSeriesChart: React.FC<{
  data: any;
  metrics: MetricType[];
  isLoading: boolean;
  chartType: ChartTypes;
}> = ({ data, metrics, isLoading, chartType }) => {
  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!data || data.series.length === 0) {
    return <Alert>No data available for the selected time period.</Alert>;
  }

  return (
    <Chart
      type={chartType}
      data={data}
      options={{
        xAxis: {
          label: 'Date',
        },
        yAxis: {
          label: 'Value',
        },
      }}
    />
  );
};

/**
 * Component for visualizing metrics breakdown by platform
 * @param param0 
 * @returns Platform breakdown visualization
 */
const PlatformBreakdownChart: React.FC<{
  data: any;
  selectedMetric: MetricType;
  isLoading: boolean;
}> = ({ data, selectedMetric, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!data || data.series.length === 0) {
    return <Alert>No platform data available.</Alert>;
  }

  return (
    <Chart
      type={ChartTypes.PIE}
      data={data}
      options={{
        title: 'Platform Breakdown',
        tooltip: {
          formatter: (value: any, name: string) => {
            return `${name}: ${formatCompactNumber(value)}`;
          },
        },
      }}
    />
  );
};

/**
 * Component for displaying tabular platform breakdown data
 * @param param0 
 * @returns Tabular display of platform metrics
 */
const PlatformBreakdownTable: React.FC<{
  data: any;
  isLoading: boolean;
}> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Engagements</TableHead>
            <TableHead>Engagement Rate</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (!data || data.series.length === 0) {
    return <Alert>No platform data available.</Alert>;
  }

  return (
    <Table>
      <TableCaption>Detailed metrics for each platform</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Platform</TableHead>
          <TableHead>Views</TableHead>
          <TableHead>Engagements</TableHead>
          <TableHead>Engagement Rate</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.series[0].data.map((platform, index) => (
          <TableRow key={index}>
            <TableCell>{formatPlatformName(platform.platformType)}</TableCell>
            <TableCell>{formatCompactNumber(platform.value)}</TableCell>
            <TableCell>{formatCompactNumber(platform.metadata.engagements)}</TableCell>
            <TableCell>{formatPercentage(platform.metadata.engagementRate)}</TableCell>
            <TableCell>{formatMetricValue(platform.metadata.contentValue, MetricType.CONTENT_VALUE)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * Component for visualizing metrics breakdown by content type
 * @param param0 
 * @returns Content type breakdown visualization
 */
const ContentTypeBreakdownChart: React.FC<{
  data: any;
  selectedMetric: MetricType;
  isLoading: boolean;
}> = ({ data, selectedMetric, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!data || data.series.length === 0) {
    return <Alert>No content type data available.</Alert>;
  }

  return (
    <Chart
      type={ChartTypes.BAR}
      data={data}
      options={{
        title: 'Content Type Breakdown',
        xAxis: {
          label: 'Content Type',
        },
        yAxis: {
          label: 'Views',
        },
        tooltip: {
          formatter: (value: any, name: string) => {
            return `${name}: ${formatCompactNumber(value)}`;
          },
        },
      }}
    />
  );
};

/**
 * Component for displaying tabular content type breakdown data
 * @param param0 
 * @returns Tabular display of content type metrics
 */
const ContentTypeBreakdownTable: React.FC<{
  data: any;
  isLoading: boolean;
}> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Content Type</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Engagements</TableHead>
            <TableHead>Engagement Rate</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (!data || data.series.length === 0) {
    return <Alert>No content type data available.</Alert>;
  }

  return (
    <Table>
      <TableCaption>Detailed metrics for each content type</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Content Type</TableHead>
          <TableHead>Views</TableHead>
          <TableHead>Engagements</TableHead>
          <TableHead>Engagement Rate</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.series[0].data.map((contentType, index) => (
          <TableRow key={index}>
            <TableCell>{contentType.label}</TableCell>
            <TableCell>{formatCompactNumber(contentType.value)}</TableCell>
            <TableCell>{formatCompactNumber(contentType.metadata.engagements)}</TableCell>
            <TableCell>{formatPercentage(contentType.metadata.engagementRate)}</TableCell>
            <TableCell>{formatMetricValue(contentType.metadata.contentValue, MetricType.CONTENT_VALUE)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ContentPerformance;