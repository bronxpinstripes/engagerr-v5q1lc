import React, { useState, useEffect } from 'react'; // version: ^18.0.0
import { useRouter, useParams } from 'next/navigation'; // version: ^14.0.0
import { CalendarDays, DollarSign, Clock, Users, Edit, Check, AlertTriangle } from 'lucide-react'; // version: ^0.279.0
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/Card'; // Container components for structured layout
import { Button } from '../ui/Button'; // Button component for actions
import { Badge } from '../ui/Badge'; // Display status badges for campaign state
import { MetricsCard } from '../shared/MetricsCard'; // Display key campaign metrics in a consistent format
import { BudgetTracker } from './BudgetTracker'; // Display budget allocation and spending visualization
import { CreatorParticipants } from './CreatorParticipants'; // Display and manage creators participating in the campaign
import { CampaignTimeline } from './CampaignTimeline'; // Display campaign timeline and milestones
import { CampaignStatus } from '../../types/campaign'; // Type definition for campaign status values
import { formatDate, formatCurrency } from '../../lib/formatters'; // Format dates and currency values consistently
import { cn } from '../../lib/utils'; // Utility for conditionally joining class names
import { useCampaigns } from '../../hooks/useCampaigns'; // Hook for campaign data fetching and management functions

/**
 * Interface defining the props for the CampaignOverview component
 */
interface CampaignOverviewProps {
  campaignId?: string;
  className?: string;
}

/**
 * Component displaying a comprehensive overview of a campaign including metrics, budget, participants, and timeline
 * @param {CampaignOverviewProps} props - Component props including campaignId and className
 * @returns {JSX.Element} Rendered campaign overview dashboard
 */
const CampaignOverview: React.FC<CampaignOverviewProps> = (props) => {
  // LD1: Destructure campaignId and className from props with defaults
  const { campaignId = '', className } = props;

  // LD1: Get campaign data and management functions from useCampaigns hook
  const { campaignDetail, campaignDetailLoading, changeCampaignStatus } = useCampaigns();

  // LD1: Initialize router for navigation
  const router = useRouter();

  // LD1: Access the campaignId from the route parameters
  const params = useParams();
  const currentCampaignId = params.campaignId as string;

  // LD1: Set up state for managing edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  // LD2: Fetch campaign detail and analytics when component mounts or campaignId changes
  useEffect(() => {
    // Fetch campaign details or perform other initialization tasks
  }, [campaignId]);

  // LD3: Handle loading state while data is being fetched
  if (campaignDetailLoading) {
    return <div>Loading campaign overview...</div>;
  }

  // LD1: Calculate campaign progress percentage based on time or deliverables
  const campaignProgress = 75; // Replace with actual calculation

  // LD1: Define handler for editing campaign details
  const handleEditCampaign = () => {
    setIsEditMode(true);
    router.push(`/campaigns/${campaignId}/edit`);
  };

  // LD1: Define handler for changing campaign status
  const handleChangeStatus = async (status: CampaignStatus) => {
    try {
      if (campaignId) {
        await changeCampaignStatus(campaignId, status);
      }
    } catch (error) {
      console.error('Failed to change campaign status:', error);
    }
  };

  // LD1: Define helper function to determine badge variant based on campaign status
  const getStatusBadgeVariant = (status: CampaignStatus): string => {
    switch (status) {
      case CampaignStatus.ACTIVE:
        return 'success';
      case CampaignStatus.PAUSED:
        return 'warning';
      case CampaignStatus.ARCHIVED:
        return 'destructive';
      case CampaignStatus.COMPLETED:
        return 'default';
      case CampaignStatus.PLANNING:
        return 'outline';
      default:
        return 'default';
    }
  };

  // LD1: Render header with campaign name, status badge, date range, and edit button
  // LD2: Render metrics section with key performance indicators using MetricsCard components
  // LD3: Render budget section with BudgetTracker component
  // LD4: Render creator participants section with CreatorParticipants component
  // LD5: Render campaign timeline with CampaignTimeline component
  // LD6: Handle responsive layout for different screen sizes
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      <Card className="col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{campaignDetail?.campaign.name}</CardTitle>
          <div className="space-x-2">
            <Badge variant={getStatusBadgeVariant(campaignDetail?.campaign.status as CampaignStatus)}>
              {campaignDetail?.campaign.status}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleEditCampaign}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p>
            {campaignDetail?.campaign.description}
          </p>
          <p>
            {formatDateRange(campaignDetail?.campaign.startDate, campaignDetail?.campaign.endDate)}
          </p>
        </CardContent>
      </Card>

      <MetricsCard
        title="Total Reach"
        value={123456}
        trend={12}
        trendDirection="up"
        tooltip="Total number of unique users reached by this campaign"
      />
      <MetricsCard
        title="Engagement Rate"
        value={3.5}
        trend={-2}
        trendDirection="down"
        isPercentage
        tooltip="Average engagement rate across all content"
      />
      <MetricsCard
        title="Budget Utilization"
        value={campaignProgress}
        isPercentage
        tooltip="Percentage of the total budget that has been spent"
      />
      <MetricsCard
        title="Estimated Value"
        value={5432}
        trend={8}
        trendDirection="up"
        isCurrency
        tooltip="Estimated monetary value generated by the campaign"
      />

      <BudgetTracker
        campaignId={campaignId}
        totalBudget={campaignDetail?.campaign.totalBudget || 0}
        spentBudget={campaignDetail?.campaign.spentBudget || 0}
      />

      <CreatorParticipants campaignId={campaignId} />

      <CampaignTimeline campaignId={campaignId} />
    </div>
  );
};

/**
 * Helper function to determine badge variant based on campaign status
 * @param {CampaignStatus} status - Campaign status
 * @returns {string} Badge variant ('success', 'warning', etc.)
 */
const getStatusBadgeVariant = (status: CampaignStatus): string => {
  switch (status) {
    case CampaignStatus.ACTIVE:
      return 'success';
    case CampaignStatus.PAUSED:
      return 'warning';
    case CampaignStatus.ARCHIVED:
      return 'destructive';
    case CampaignStatus.COMPLETED:
      return 'default';
    case CampaignStatus.PLANNING:
      return 'outline';
    default:
      return 'default';
  }
};

export default CampaignOverview;