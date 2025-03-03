import React from 'react'; // v18.2.0
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/Card'; // src/web/components/ui/Card.tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../ui/Select'; // src/web/components/ui/Select.tsx
import { cn } from '../../lib/utils'; // src/web/lib/utils.ts
import MetricsCard from '../shared/MetricsCard'; // src/web/components/shared/MetricsCard.tsx
import { Chart } from '../shared/ChartComponents'; // src/web/components/shared/ChartComponents.tsx
import { useAnalytics } from '../../hooks/useAnalytics'; // src/web/hooks/useAnalytics.ts
import { MetricType, ChartTypes } from '../../types/analytics'; // src/web/types/analytics.ts

/**
 * Props for the PerformanceMetrics component
 */
interface PerformanceMetricsProps {
  className?: string;
  showChart?: boolean;
  chartHeight?: number;
  compactView?: boolean;
}

/**
 * Component that displays key performance metrics for creators with period filtering
 */
const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  className,
  showChart = true,
  chartHeight = 300,
  compactView = false,
}) => {
  // Destructure className and other props from component props
  // Use the useAnalytics hook to get metrics data and filter controls
  const {
    aggregateMetrics,
    timeSeriesData,
    selectedPeriod,
    setPeriod,
    periodOptions,
    getTimeSeriesData,
    isLoading,
  } = useAnalytics();

  // Set up chart data configuration for the time series visualization
  const chartData = getTimeSeriesData(ChartTypes.LINE);

  // Render a Card component with header containing title and period selector
  return (
    <Card className={cn('col-span-2', className)}>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <Select value={selectedPeriod} onValueChange={setPeriod}>
          <SelectTrigger>
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
      </CardHeader>
      <CardContent className={cn('grid gap-4', {
        'grid-cols-2': !compactView,
        'grid-cols-1': compactView,
      })}>
        {/* Render the metrics grid with MetricsCard components for each key metric */}
        <MetricsCard
          title="Views"
          value={aggregateMetrics?.totalViews || 0}
          trend={aggregateMetrics?.viewsGrowthRate}
          isLoading={isLoading}
          tooltip="Total number of views across all platforms"
        />
        <MetricsCard
          title="Engagements"
          value={aggregateMetrics?.totalEngagements || 0}
          trend={aggregateMetrics?.engagementGrowthRate}
          isLoading={isLoading}
          tooltip="Total number of likes, comments, and shares"
        />
        <MetricsCard
          title="Est. Value"
          value={aggregateMetrics?.totalContentValue || 0}
          trend={aggregateMetrics?.valueGrowthRate}
          isLoading={isLoading}
          isCurrency
          tooltip="Estimated monetary value of your content"
        />
        <MetricsCard
          title="Engagement Rate"
          value={aggregateMetrics?.averageEngagementRate || 0}
          trend={aggregateMetrics?.engagementGrowthRate}
          isLoading={isLoading}
          isPercentage
          tooltip="Percentage of audience who engaged with your content"
        />
      </CardContent>
      {/* Include trend visualization chart below the metrics grid */}
      {showChart && (
        <Chart
          type={ChartTypes.LINE}
          data={chartData}
          height={chartHeight}
          isLoading={isLoading}
        />
      )}
    </Card>
  );
};

export default PerformanceMetrics;