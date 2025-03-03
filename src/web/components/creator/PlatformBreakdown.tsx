import React, { useState, useMemo } from 'react'; // react v18.2.0
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs'; // @radix-ui/react-tabs v1.0.4

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import { BarChartComponent, PieChartComponent } from '../shared/ChartComponents';
import { PlatformType } from '../../types/platform';
import { PlatformBreakdown as PlatformBreakdownType, MetricType } from '../../types/analytics';
import { useAnalytics } from '../../hooks/useAnalytics';
import { formatPlatformBreakdownData, getPlatformColor } from '../../lib/charts';
import { formatPercentage, formatNumber } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * Interface defining the props for the PlatformBreakdown component
 */
export interface PlatformBreakdownProps {
  className?: string;
  metric: MetricType;
  title?: string;
  description?: string;
  hideEmptyPlatforms?: boolean;
  defaultView?: string;
  showTabs?: boolean;
}

/**
 * Component that displays analytics breakdown by platform using different visualization methods
 */
const PlatformBreakdown: React.FC<PlatformBreakdownProps> = ({
  className,
  metric,
  title = 'Platform Breakdown',
  description = 'Distribution of metrics across different platforms',
  hideEmptyPlatforms = false,
  defaultView = 'chart',
  showTabs = true,
}) => {
  // Get platformBreakdown, isLoading, and error from useAnalytics hook
  const { platformBreakdown, isLoading, error } = useAnalytics();

  // Use useState to manage the selected visualization type (chart, pie, table)
  const [view, setView] = useState(defaultView);

  // Filter out platforms with zero metrics if hideEmptyPlatforms is true
  const filteredPlatforms = useMemo(() => {
    if (!platformBreakdown) return [];
    return hideEmptyPlatforms
      ? platformBreakdown.filter(platform => platform[metric] > 0)
      : platformBreakdown;
  }, [platformBreakdown, hideEmptyPlatforms, metric]);

  // Use useMemo to format platform data for bar chart visualization
  const barChartData = useMemo(() => {
    return formatPlatformBreakdownData(filteredPlatforms, metric, {
      sortByValue: true,
      sortDirection: 'desc',
      platformKey: 'platformType',
      labelKey: 'platformType',
      includePercentages: true,
    });
  }, [filteredPlatforms, metric]);

  // Use useMemo to format platform data for pie chart visualization
  const pieChartData = useMemo(() => {
    return formatPlatformBreakdownData(filteredPlatforms, metric, {
      sortByValue: true,
      sortDirection: 'desc',
      platformKey: 'platformType',
      labelKey: 'platformType',
      includePercentages: true,
    });
  }, [filteredPlatforms, metric]);

  // Render a Card component containing the platform breakdown visualization
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {showTabs && (
          <Tabs defaultValue={view} className="w-full">
            <TabsList>
              <TabsTrigger value="chart" onClick={() => setView('chart')}>
                Chart
              </TabsTrigger>
              <TabsTrigger value="pie" onClick={() => setView('pie')}>
                Pie
              </TabsTrigger>
              <TabsTrigger value="table" onClick={() => setView('table')}>
                Table
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chart">
              <BarChartComponent data={barChartData} />
            </TabsContent>
            <TabsContent value="pie">
              <PieChartComponent data={pieChartData} />
            </TabsContent>
            <TabsContent value="table">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="[&_th]:px-4 [&_th]:py-2 [&_th:first-child]:text-left">
                    <tr>
                      <th>Platform</th>
                      <th>Views</th>
                      <th>Engagements</th>
                      <th>Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:p-4 [&_tr:nth-child(even)]:bg-muted">
                    {filteredPlatforms.map((platform) => (
                      <tr key={platform.platformType}>
                        <td>{platform.platformType}</td>
                        <td>{formatNumber(platform.views)}</td>
                        <td>{formatNumber(platform.engagements)}</td>
                        <td>{formatPercentage(platform.engagementRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        )}
        {!showTabs && view === 'chart' && <BarChartComponent data={barChartData} />}
        {!showTabs && view === 'pie' && <PieChartComponent data={pieChartData} />}
        {!showTabs && view === 'table' && (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="[&_th]:px-4 [&_th]:py-2 [&_th:first-child]:text-left">
                <tr>
                  <th>Platform</th>
                  <th>Views</th>
                  <th>Engagements</th>
                  <th>Engagement Rate</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-4 [&_tr:nth-child(even)]:bg-muted">
                {filteredPlatforms.map((platform) => (
                  <tr key={platform.platformType}>
                    <td>{platform.platformType}</td>
                    <td>{formatNumber(platform.views)}</td>
                    <td>{formatNumber(platform.engagements)}</td>
                    <td>{formatPercentage(platform.engagementRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {/* Add any footer content here if needed */}
      </CardFooter>
    </Card>
  );
};

export default PlatformBreakdown;
export type { PlatformBreakdownProps };