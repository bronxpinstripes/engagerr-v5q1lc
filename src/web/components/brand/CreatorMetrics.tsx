import React, { useEffect, useState } from 'react'; // v18.2.0
import { MetricsCard } from '../shared/MetricsCard';
import { useAnalytics } from '../../hooks/useAnalytics';
import { CreatorMetrics as CreatorMetricsType } from '../../types/creator';
import { formatNumber, formatPercentage } from '../../lib/formatters';
import { MetricPeriod } from '../../types/analytics';
import { cn } from '../../lib/utils';

/**
 * Props for the CreatorMetrics component
 */
interface CreatorMetricsProps {
  /**
   * ID of the creator whose metrics will be displayed
   */
  creatorId: string;
  /**
   * Optional CSS class name for styling
   */
  className?: string;
  /**
   * Whether to display metrics in a compact layout
   */
  compact?: boolean;
  /**
   * Time period for metrics calculation
   */
  timeframe?: MetricPeriod;
}

/**
 * Determines the trend direction (up, down, neutral) based on a growth rate value
 * @param value The growth rate value
 * @returns 'up' | 'down' | 'neutral'
 */
const getTrendDirection = (value: number): 'up' | 'down' | 'neutral' => {
  if (value > 0) {
    return 'up';
  } else if (value < 0) {
    return 'down';
  } else {
    return 'neutral';
  }
};

/**
 * Displays standardized performance metrics for a creator in the brand interface
 * @param props - CreatorMetricsProps
 * @returns Rendered component with creator metrics
 */
const CreatorMetrics: React.FC<CreatorMetricsProps> = (props) => {
  // Destructure creatorId and className from props
  const { creatorId, className, compact, timeframe = MetricPeriod.MONTH } = props;

  // Set up analytics state with useAnalytics hook, using MONTH as default period
  const { 
    isLoading, 
    creatorMetrics 
  } = useAnalytics({ creatorId, period: timeframe });

  // Calculate trend directions for each metric
  const followersTrendDirection = getTrendDirection(creatorMetrics?.growthRates?.followers || 0);
  const engagementTrendDirection = getTrendDirection(creatorMetrics?.growthRates?.engagement || 0);

  // Render a grid layout with MetricsCard components
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      <MetricsCard
        title="Total Followers"
        value={creatorMetrics?.totalFollowers || 0}
        trend={creatorMetrics?.growthRates?.followers}
        trendDirection={followersTrendDirection}
        isLoading={isLoading}
        tooltip="Total number of followers across all connected platforms"
      />
      <MetricsCard
        title="Engagement Rate"
        value={creatorMetrics?.averageEngagementRate || 0}
        trend={creatorMetrics?.growthRates?.engagement}
        trendDirection={engagementTrendDirection}
        isPercentage
        isLoading={isLoading}
        tooltip="Average engagement rate across all content"
      />
      <MetricsCard
        title="Total Reach"
        value={creatorMetrics?.totalReach || 0}
        isLoading={isLoading}
        tooltip="Estimated total audience reach across all content"
      />
      <MetricsCard
        title="Content Value"
        value={creatorMetrics?.estimatedContentValue || 0}
        isCurrency
        isLoading={isLoading}
        tooltip="Estimated monetary value of the creator's content"
      />
    </div>
  );
};

export default CreatorMetrics;