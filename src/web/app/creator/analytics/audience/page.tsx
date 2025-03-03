import React, { useState, useMemo, useCallback } from 'react'; // React v18.2.0
import { RefreshCw, Users } from 'lucide-react'; // lucide-react v0.258.0
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../../../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/Tabs';
import { Chart, PieChartComponent, VennDiagramComponent } from '../../../../components/shared/ChartComponents';
import { cn } from '../../../../lib/utils';
import useAnalytics from '../../../../hooks/useAnalytics';
import { AudienceMetrics, ChartTypes, PlatformType } from '../../../../types/analytics';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import PageHeader from '../../../../components/layout/PageHeader';
import AudienceInsights from '../../../../components/creator/AudienceInsights';
import { Button } from '../../../../components/ui/Button';

/**
 * @function AudiencePage
 * @returns {JSX.Element} - Rendered audience analytics page
 * @description Page component displaying comprehensive audience demographics and insights
 */
const AudiencePage: React.FC = () => {
  // LD1: Initialize the useAnalytics hook to fetch creator analytics data
  const {
    creatorMetrics,
    refreshAnalytics,
    isLoading,
  } = useAnalytics();

  // LD1: Use useState to track refresh state for loading indicators
  const [isRefreshing, setIsRefreshing] = useState(false);

  // LD1: Implement a refresh function to update audience data
  const handleRefresh = async () => {
    // LD1: Set isRefreshing state to true
    setIsRefreshing(true);
    // LD1: Call refreshAnalytics function from useAnalytics hook
    await refreshAnalytics();
    // LD1: Set isRefreshing state to false when complete
    setIsRefreshing(false);
  };

  // LD1: Create action buttons for page header with refresh option
  const actions = (
    <Button
      variant="outline"
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
      <RefreshCw className="ml-2 h-4 w-4" />
    </Button>
  );

  // LD1: Render the page with DashboardLayout as wrapper
  return (
    <DashboardLayout>
      {/* LD1: Include PageHeader with title and actions */}
      <PageHeader
        title="Audience Analytics"
        description="Understand your audience demographics and behavior patterns."
        actions={actions}
      />

      {/* LD1: Render overview card with total audience and growth metrics */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Audience Overview</CardTitle>
          <CardDescription>
            Total Audience: {creatorMetrics?.audienceMetrics?.totalAudience || 'Loading...'}
            <br />
            Growth Rate: {creatorMetrics?.audienceMetrics?.audienceGrowthRate || 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* LD1: Render AudienceInsights component as main content */}
          <AudienceInsights />
        </CardContent>
      </Card>

      {/* LD1: Handle loading states with appropriate loading indicators */}
      {isLoading && <p>Loading audience data...</p>}

      {/* LD1: Display error state if analytics data couldn't be loaded */}
      {error && <p>Error loading audience data: {error.message}</p>}
    </DashboardLayout>
  );
};

export default AudiencePage;