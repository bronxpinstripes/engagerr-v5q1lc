import React, { useEffect } from 'react'; // version: ^18.0.0
import { useParams, useRouter } from 'next/navigation'; // version: ^14.0.0
import { Pencil, Users, CalendarDays, BarChart4, DollarSign } from 'lucide-react'; // version: ^0.279.0
import Link from 'next/link'; // version: ^14.0.0

import {
  PageHeader,
} from '../../../../components/layout/PageHeader';
import {
  CampaignOverview,
} from '../../../../components/brand/CampaignOverview';
import {
  CreatorParticipants,
} from '../../../../components/brand/CreatorParticipants';
import {
  CampaignTimeline,
} from '../../../../components/brand/CampaignTimeline';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../../../components/ui/Tabs';
import { Button } from '../../../../components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/Card';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Alert, AlertTitle, AlertDescription } from '../../../../components/ui/Alert';
import { CampaignDetail, CampaignStatus } from '../../../../types/campaign';
import { Metadata } from 'next';

/**
 * Server function that generates metadata for the campaign page including dynamic title and description
 * @param {object} { params }: { params: { campaignId: string } } - Object containing URL parameters
 * @returns {Promise<Metadata>} Page metadata including title and description
 */
export async function generateMetadata({ params }: { params: { campaignId: string } }): Promise<Metadata> {
  // LD1: Extract campaignId from params
  const campaignId = params.campaignId;

  // LD1: Return metadata object with dynamic title
  return {
    title: `Campaign Details - ${campaignId}`, // Dynamic title
    description: `Detailed view of campaign ${campaignId} on Engagerr.`, // Include appropriate description for SEO
  };
}

/**
 * Server component that displays a campaign detail page with overview metrics and navigation
 * @param {object} { params }: { params: { campaignId: string } } - Object containing URL parameters
 * @returns {JSX.Element} The rendered campaign detail page
 */
const CampaignPage: React.FC<{ params: { campaignId: string } }> = ({ params }) => {
  // LD1: Extract campaignId from the URL parameters using params
  const { campaignId } = params;

  // LD1: Initialize useCampaigns hook for campaign data and operations
  const { campaignDetail, campaignDetailLoading, campaignDetailError } = useCampaigns();

  // LD1: Initialize useRouter for navigation
  const router = useRouter();

  // LD3: Handle loading state with skeleton components
  if (campaignDetailLoading) {
    return (
      <div>
        <PageHeader title={<Skeleton className="h-8 w-1/2" />} />
        <Card>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // LD3: Handle error state with alert component
  if (campaignDetailError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{campaignDetailError}</AlertDescription>
      </Alert>
    );
  }

  // LD5: Create breadcrumb navigation for the page header
  const breadcrumbs = [
    { label: 'Campaigns', href: '/brand/campaigns' },
    { label: campaignId, href: `/brand/campaigns/${campaignId}`, active: true },
  ];

  // LD6: Render page header with campaign name and actions
  return (
    <div>
      <PageHeader
        title={campaignDetail?.campaign.name || 'Campaign Details'}
        description="Manage and track your campaign's performance and partnerships."
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={() => router.push(`/brand/campaigns/${campaignId}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Campaign
          </Button>
        }
      />

      {/* LD7: Render tab navigation for campaign sections (Overview, Creators, Content, Deliverables, Performance, Budget) */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {/* LD8: Display the campaign overview with key metrics and status */}
          <CampaignOverview campaignId={campaignId} />
        </TabsContent>
        <TabsContent value="creators">
          {/* LD9: Link to sub-pages for detailed management of specific aspects */}
          <CreatorParticipants campaignId={campaignId} />
        </TabsContent>
        <TabsContent value="content">
          <div>Content Management</div>
        </TabsContent>
        <TabsContent value="deliverables">
          <div>Deliverables Tracking</div>
        </TabsContent>
        <TabsContent value="performance">
          <div>Performance Analytics</div>
        </TabsContent>
        <TabsContent value="budget">
          <div>Budget Details</div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignPage;