import React, { useState, useEffect, useMemo } from 'react'; // version: ^18.0.0
import { useRouter } from 'next/navigation'; // version: ^13.0.0
import { Users, Plus, ExternalLink, UserX, CheckCircle, Clock, AlertTriangle, MoreHorizontal } from 'lucide-react'; // version: ^0.279.0
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/Card';
import { Button } from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import ProgressBar from '../ui/ProgressBar';
import DataTable from '../shared/DataTable';
import { formatCurrency, formatPercentage } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { useCampaigns } from '../../hooks/useCampaigns';
import { ParticipantStatus } from '../../types/campaign';

// Define the properties for the CreatorParticipants component
interface CreatorParticipantsProps {
  campaignId: string;
  className?: string;
}

/**
 * Component that displays and manages creators participating in a brand campaign
 * @param {object} props - Component props including campaignId and className
 * @returns {JSX.Element} Rendered creator participants component
 */
const CreatorParticipants: React.FC<CreatorParticipantsProps> = ({ campaignId, className }) => {
  // LD1: Destructure campaignId and className from props
  // LD2: Get campaign data and participant management functions from useCampaigns hook
  const { campaignDetail, campaignDetailLoading, updateParticipantStatus, removeCreatorFromCampaign } = useCampaigns();

  // LD1: Initialize router for navigation
  const router = useRouter();

  // LD1: Set up state for managing view/edit modal for participants
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  // LD1: Create memoized table columns configuration for participants
  const columns = useMemo(
    () => [
      {
        key: 'creator.user.fullName',
        header: 'Creator',
        width: '200px',
        cell: (row: any) => (
          <div className="flex items-center space-x-2">
            <Avatar src={row.creator.profileImage} alt={row.creator.user.fullName} />
            <span>{row.creator.user.fullName}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: '150px',
        cell: (row: any) => getStatusBadge(row.participant.status),
      },
      {
        key: 'deliverablesProgress',
        header: 'Deliverables',
        width: '150px',
        cell: (row: any) => getDeliverableProgress(row.participant.completedDeliverables, row.participant.deliverableCount),
      },
      {
        key: 'budget',
        header: 'Budget',
        width: '120px',
        cell: (row: any) => formatCurrency(row.participant.budget),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '100px',
        cell: (row: any) => (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => handleViewProfile(row.creator.id)}>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(row.participant.id)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleRemoveParticipant(campaignId, row.participant.id)}>
              <UserX className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [campaignId]
  );

  // LD1: Fetch campaign details when component mounts or campaignId changes
  useEffect(() => {
    // Fetch campaign details or perform other initialization tasks
  }, [campaignId]);

  // LD1: Handle loading state with skeleton UI or empty state
  if (campaignDetailLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle className="loading-skeleton h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="loading-skeleton h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // LD1: Format participant data for table display
  const participantData = useMemo(() => {
    if (!campaignDetail?.participants) return [];
    return formatParticipantData(campaignDetail.participants);
  }, [campaignDetail?.participants]);

  // LD1: Render Card component with appropriate header
  // LD2: Render action button for adding new creator to campaign
  // LD3: Render DataTable component with participant data and column configuration
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Creator Participants</CardTitle>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Creator
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={participantData} />
      </CardContent>
    </Card>
  );

  // LD1: Define handlers for participant actions (view profile, remove, update status)
  const handleViewProfile = (creatorId: string) => {
    router.push(`/creators/${creatorId}`);
  };

  const handleRemoveParticipant = async (campaignId: string, participantId: string) => {
    try {
      await removeCreatorFromCampaign(campaignId, participantId);
    } catch (error) {
      console.error('Failed to remove participant:', error);
    }
  };

  const handleOpenEditModal = (participantId: string) => {
    setSelectedParticipantId(participantId);
  };

  // LD1: Implement modal for participant detail editing
  // Implement modal logic here

  // LD1: Return complete component structure
};

/**
 * Helper function to generate appropriate status badge for participant status
 * @param {ParticipantStatus} status - Participant status
 * @returns {JSX.Element} Badge component with appropriate variant and label
 */
const getStatusBadge = (status: ParticipantStatus) => {
  // LD1: Determine badge variant based on status (success, warning, etc.)
  let variant = 'secondary';
  let IconComponent = Clock;

  switch (status) {
    case ParticipantStatus.CONTRACTED:
      variant = 'primary';
      IconComponent = CheckCircle;
      break;
    case ParticipantStatus.IN_PROGRESS:
      variant = 'primary';
      IconComponent = Clock;
      break;
    case ParticipantStatus.COMPLETED:
      variant = 'success';
      IconComponent = CheckCircle;
      break;
    case ParticipantStatus.CANCELLED:
    case ParticipantStatus.DECLINED:
      variant = 'destructive';
      IconComponent = AlertTriangle;
      break;
    default:
      variant = 'secondary';
      IconComponent = Clock;
      break;
  }

  // LD1: Get status label text based on status enum value
  const statusLabel = status.replace(/_/g, ' ');

  // LD1: Return Badge component with determined variant, icon, and label
  return (
    <Badge variant={variant}>
      <IconComponent className="mr-1.5 h-4 w-4" />
      {statusLabel}
    </Badge>
  );
};

/**
 * Helper function to generate progress bar for deliverable completion
 * @param {number} completed - Number of completed deliverables
 * @param {number} total - Total number of deliverables
 * @returns {JSX.Element} ProgressBar component with appropriate progress and label
 */
const getDeliverableProgress = (completed: number, total: number) => {
  // LD1: Calculate completion percentage
  const progress = total > 0 ? (completed / total) * 100 : 0;

  // LD1: Determine progress bar variant based on percentage
  let variant = 'primary';
  if (progress === 100) {
    variant = 'success';
  }

  // LD1: Return ProgressBar component with calculated percentage and label showing completed/total
  return (
    <ProgressBar
      value={completed}
      max={total}
      variant={variant}
      showLabel
      labelFormat={(value, max) => `${value}/${max}`}
    />
  );
};

/**
 * Transform raw participant data into format suitable for DataTable
 * @param {CampaignParticipantDetail[]} participants - Array of campaign participant details
 * @returns {object[]} Formatted participant data for table display
 */
const formatParticipantData = (participants: CampaignParticipantDetail[]) => {
  // LD1: Map over participants array to transform each item
  return participants.map((p) => {
    // LD1: Extract relevant properties from participant, creator, and partnership objects
    const { participant, creator, partnership } = p;

    // LD1: Calculate deliverable progress and format values
    const deliverablesProgress = participant.deliverableCount > 0
      ? (participant.completedDeliverables / participant.deliverableCount) * 100
      : 0;

    // LD1: Return array of formatted participant objects with consistent structure
    return {
      creator: {
        id: creator.id,
        user: creator.user,
        profileImage: creator.profileImage,
      },
      participant: {
        id: participant.id,
        status: participant.status,
        budget: participant.budget,
        deliverableCount: participant.deliverableCount,
        completedDeliverables: participant.completedDeliverables,
      },
      partnership: {
        id: partnership.id,
      },
      deliverablesProgress: deliverablesProgress,
    };
  });
};

export default CreatorParticipants;
export interface CampaignsHookReturn {\n  campaigns: Campaign[] | undefined;\n  totalCount: number | undefined;\n  currentPage: number;\n  pageSize: number;\n  hasMorePages: boolean;\n  isLoading: boolean;\n  error: string | null;\n  dashboardData: CampaignDashboardData | undefined;\n  dashboardLoading: boolean;\n  campaignDetail: CampaignDetail | undefined;\n  campaignDetailLoading: boolean;\n  campaignDetailError: string | null;\n  campaignAnalytics: CampaignMetrics | undefined;\n  campaignAnalyticsLoading: boolean;\n  getCampaigns: (filters?: CampaignFilters, page?: number, pageSize?: number) => Promise<CampaignListResponse>;\n  getCampaignDashboardData: () => Promise<CampaignDashboardData>;\n  getCampaignById: (campaignId: string) => Promise<CampaignDetail>;\n  getCampaignAnalytics: (campaignId: string) => Promise<CampaignMetrics>;\n  createCampaign: (campaignData: CreateCampaignRequest) => Promise<Campaign>;\n  updateCampaign: (campaignId: string, campaignData: UpdateCampaignRequest) => Promise<Campaign>;\n  changeCampaignStatus: (campaignId: string, status: CampaignStatus) => Promise<Campaign>;\n  addCreatorToCampaign: (participantData: AddParticipantRequest) => Promise<CampaignParticipant>;\n  removeCreatorFromCampaign: (campaignId: string, participantId: string) => Promise<void>;\n  updateParticipantStatus: (participantId: string, status: ParticipantStatus) => Promise<CampaignParticipant>;\n  calculateCampaignProgress: (campaign: Campaign) => number;\n  getCampaignStatusLabel: (status: CampaignStatus) => string;\n  getParticipantStatusLabel: (status: ParticipantStatus) => string;\n  refreshCampaignData: () => Promise<void>;\n}