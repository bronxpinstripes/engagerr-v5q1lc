import React from 'react'; // React library for UI components // v18.2.0
import { Metadata } from 'next/server'; // Next.js API for setting page metadata // ^14.0.0

import PageHeader from '../../../../components/layout/PageHeader'; // Consistent page header with breadcrumb navigation and actions
import CampaignPerformance from '../../../../components/brand/CampaignPerformance'; // Main component for displaying campaign performance analytics
import ROICalculator from '../../../../components/brand/ROICalculator'; // Component for ROI calculation and analysis visualization
import { Card } from '../../../../components/ui/Card'; // Container component for page sections
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/Tabs'; // Tabbed navigation between different performance views
import { LineChart, BarChart, PieChart } from '../../../../components/shared/ChartComponents'; // Line chart visualization for time-series metrics // Bar chart visualization for comparative metrics // Pie chart for distribution visualization
import { MetricsCard } from '../../../../components/shared/MetricsCard'; // Display key performance indicators
import { useCampaigns } from '../../../../hooks/useCampaigns'; // Access campaign data and analytics metrics
import { LineChart as LineChartIcon, BarChart as BarChartIcon, PieChart as PieChartIcon, Calculator, DollarSign } from 'lucide-react'; // Icons for various sections and tabs // v0.279.0

/**
 * Generates metadata for the page including the title based on campaign name
 * @param { params }
 * @returns {Promise<Metadata>} Page metadata object
 */
export async function generateMetadata({ params }: { params: { campaignId: string } }): Promise<Metadata> {
  // Extract campaignId from params
  const { campaignId } = params;

  // Use useCampaigns hook to fetch campaign details
  const { getCampaignById } = useCampaigns();
  const campaignDetail = await getCampaignById(campaignId);

  // Return metadata object with dynamic title including campaign name
  return {
    title: `${campaignDetail?.campaign.name || 'Campaign'} Performance`,
    description: `Detailed performance analytics for campaign: ${campaignDetail?.campaign.name || 'Campaign'}`,
    // Include appropriate description and other metadata properties
  };
}

/**
 * Server component that renders the campaign performance page
 * @param { params }
 * @returns {JSX.Element} Rendered page component
 */
const CampaignPerformancePage: React.FC<{ params: { campaignId: string } }> = ({ params }) => {
  // Extract campaignId from params
  const { campaignId } = params;

  // Render page with header and main content sections
  return (
    <div>
      {/* Include breadcrumb navigation to campaigns list */}
      <PageHeader
        title="Campaign Performance"
        breadcrumbs={[
          { label: 'Dashboard', href: '/brand/dashboard' },
          { label: 'Campaigns', href: '/brand/campaigns' },
          { label: 'Performance', href: `/brand/campaigns/${campaignId}/performance`, active: true },
        ]}
      />

      {/* Render tabbed interface for different performance views */}
      <Tabs.Root className="mt-4">
        <Tabs.List>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="performance">Performance</Tabs.Trigger>
          <Tabs.Trigger value="roi">ROI Analysis</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="mt-4">
          {/* Summary dashboard with key metrics and visualizations */}
          <Card>
            <CardContent>
              <p>Overview content for campaign performance.</p>
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="performance" className="mt-4">
          {/* Include CampaignPerformance component for main analytics */}
          <CampaignPerformance campaignId={campaignId} />
        </Tabs.Content>

        <Tabs.Content value="roi" className="mt-4">
          {/* Include ROICalculator for financial performance analysis */}
          <ROICalculator campaignId={campaignId} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default CampaignPerformancePage;