import React, { useEffect } from 'react'; // React library and hooks for component functionality // v18.0.0
import { useParams, useRouter } from 'next/navigation'; // Access URL parameters and handle navigation // ^14.0.0
import { Users, UserPlus } from 'lucide-react'; // Icon components for participants and actions // v0.279.0
import Link from 'next/link'; // Navigation to related pages // ^14.0.0
import { Metadata } from 'next'; // Type for page metadata configuration // ^14.0.0

import PageHeader from '../../../../../components/layout/PageHeader'; // Display page title, breadcrumbs, and actions
import CreatorParticipants from '../../../../../components/brand/CreatorParticipants'; // Display and manage creator participants in the campaign
import { useCampaigns } from '../../../../../hooks/useCampaigns'; // Hook for fetching campaign data and managing participants
import { Button } from '../../../../../components/ui/Button'; // UI component for actions like adding creators
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertTitle,
  AlertDescription,
} from '../../../../../components/ui/Card'; // Structured container components for content display
import Skeleton from '../../../../../components/ui/Skeleton'; // Loading placeholder during data fetching

/**
 * Server function that generates metadata for the creators page including dynamic title based on campaign
 * @param {object} { params }: { params: { campaignId: string } } - Object containing URL parameters
 * @returns {Promise<Metadata>} Page metadata including title and description
 */
export async function generateMetadata({ params }: { params: { campaignId: string } }): Promise<Metadata> {
  // Extract campaignId from params
  const { campaignId } = params;

  // Return metadata object with dynamic title for SEO
  return {
    title: `Campaign Creators - ${campaignId}`,
    description: `Manage creator participants for campaign ${campaignId}`,
  };
}

/**
 * Server component that displays and manages creator participants for a specific campaign
 * @param {object} { params }: { params: { campaignId: string } } - Object containing URL parameters
 * @returns {JSX.Element} The rendered creators management page
 */
const CreatorsPage: React.FC = ({ params }: { params: { campaignId: string } }) => {
  // Extract campaignId from the URL parameters
  const { campaignId } = params;

  // Initialize useCampaigns hook for campaign data and participant management
  const { campaignDetail, campaignDetailLoading, campaignDetailError } = useCampaigns();

  // Initialize useRouter for navigation
  const router = useRouter();

  // Use useEffect to fetch campaign details when component mounts
  useEffect(() => {
    if (campaignId) {
      campaignDetail?.campaign?.id !== campaignId && campaignDetail?.campaign?.id !== undefined ? campaignDetail?.campaign?.id : campaignDetail?.campaign?.id === undefined
      useCampaigns().getCampaignById(campaignId);
    }
  }, [campaignId, campaignDetail?.campaign?.id, router]);

  // Handle loading state with skeleton UI
  if (campaignDetailLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-80" /></CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Handle error state with alert component
  if (campaignDetailError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{campaignDetailError}</AlertDescription>
      </Alert>
    );
  }

  // Handle empty state when no campaign is found
  if (!campaignDetail?.campaign) {
    return (
      <Alert>
        <AlertTitle>No Campaign Found</AlertTitle>
        <AlertDescription>No campaign found with the ID {campaignId}.</AlertDescription>
      </Alert>
    );
  }

  // Create breadcrumb navigation path for the page header
  const breadcrumbs = [
    { label: 'Campaigns', href: '/brand/campaigns' },
    { label: campaignDetail.campaign.name, href: `/brand/campaigns/${campaignId}` },
    { label: 'Creators', href: `/brand/campaigns/${campaignId}/creators`, active: true },
  ];

  // Render page header with title and actions (add creator button)
  // Render CreatorParticipants component with campaign data
  // Include detailed functions for adding/managing creators
  // Allow navigation to creator details, deliverables review, and partnership management
  return (
    <>
      <PageHeader
        title="Creator Participants"
        description="Manage creators participating in this campaign."
        breadcrumbs={breadcrumbs}
        actions={
          <Link href={`/brand/campaigns/${campaignId}/creators/add`}>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Creator
            </Button>
          </Link>
        }
      />
      <CreatorParticipants campaignId={campaignId} />
    </>
  );
};

export default CreatorsPage;