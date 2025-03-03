import React from 'react'; // react v18.0.0
import { AlertCircle, CheckCircle2, Clock, Calendar, User, Filter, ExternalLink } from 'lucide-react'; // lucide-react v0.279.0
import { PageHeader } from '../../../../components/layout/PageHeader';
import DataTable from '../../../../components/shared/DataTable';
import DeliverableReview from '../../../../components/brand/DeliverableReview';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Alert from '../../../../components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/Tabs';
import { getCampaignById } from '../../../../lib/api';
import { formatDate } from '../../../../lib/formatters';
import { DeliverableStatus, PlatformType, ContentType } from '../../../../types/partnership';

/**
 * @function getStatusBadge
 * @description Generates a badge component with appropriate styling based on deliverable status
 * @param {DeliverableStatus} status - The status of the deliverable
 * @returns {JSX.Element} Badge component with appropriate variant and label
 */
const getStatusBadge = (status: DeliverableStatus): JSX.Element => {
  switch (status) {
    case DeliverableStatus.NOT_STARTED:
      return <Badge variant="outline">Not Started</Badge>;
    case DeliverableStatus.IN_PROGRESS:
      return <Badge variant="warning">In Progress</Badge>;
    case DeliverableStatus.SUBMITTED:
      return <Badge variant="info">Submitted</Badge>;
    case DeliverableStatus.REVISION_REQUESTED:
      return <Badge variant="warning">Revision Requested</Badge>;
    case DeliverableStatus.APPROVED:
      return <Badge variant="success">Approved</Badge>;
    case DeliverableStatus.PUBLISHED:
      return <Badge variant="success">Published</Badge>;
    case DeliverableStatus.REJECTED:
      return <Badge variant="destructive">Rejected</Badge>;
    case DeliverableStatus.CANCELLED:
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

/**
 * @function getPlatformLabel
 * @description Converts platform type enum to a readable label
 * @param {PlatformType} platform - The platform type
 * @returns {string} Human-readable platform name
 */
const getPlatformLabel = (platform: PlatformType): string => {
  switch (platform) {
    case PlatformType.YOUTUBE:
      return 'YouTube';
    case PlatformType.INSTAGRAM:
      return 'Instagram';
    case PlatformType.TIKTOK:
      return 'TikTok';
    case PlatformType.TWITTER:
      return 'Twitter';
    case PlatformType.LINKEDIN:
      return 'LinkedIn';
    case PlatformType.PODCAST:
      return 'Podcast';
    default:
      return String(platform);
  }
};

/**
 * @function getContentTypeLabel
 * @description Converts content type enum to a readable label
 * @param {ContentType} contentType - The content type
 * @returns {string} Human-readable content type name
 */
const getContentTypeLabel = (contentType: ContentType): string => {
  switch (contentType) {
    case ContentType.VIDEO:
      return 'Video';
    case ContentType.POST:
      return 'Post';
    case ContentType.STORY:
      return 'Story';
    case ContentType.REEL:
      return 'Reel';
    case ContentType.SHORT:
      return 'Short';
    case ContentType.TWEET:
      return 'Tweet';
    case ContentType.ARTICLE:
      return 'Article';
    case ContentType.PODCAST_EPISODE:
      return 'Podcast Episode';
    default:
      return String(contentType);
  }
};

/**
 * @component CampaignDeliverablesPage
 * @description Server component that fetches and displays all deliverables for a campaign
 * @param {object} params - Route parameters
 * @param {string} params.campaignId - The ID of the campaign
 * @returns {Promise<JSX.Element>} Rendered page component
 */
const CampaignDeliverablesPage = async ({ params }: { campaignId: string }) => {
  // Extract campaignId from route parameters
  const { campaignId } = params;

  // Fetch campaign details including all participants and their deliverables
  const campaign = await getCampaignById(campaignId);

  // Organize deliverables by status for tabbed view
  const deliverablesByStatus = campaign?.deliverables.reduce((acc, deliverable) => {
    const status = deliverable.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(deliverable);
    return acc;
  }, {} as { [key in DeliverableStatus]: any[] }) || {};

  // Calculate deliverable metrics (total, pending review, completed, etc.)
  const totalDeliverables = campaign?.deliverables.length || 0;
  const pendingReviewCount = deliverablesByStatus[DeliverableStatus.SUBMITTED]?.length || 0;
  const completedCount = (deliverablesByStatus[DeliverableStatus.APPROVED]?.length || 0) +
    (deliverablesByStatus[DeliverableStatus.PUBLISHED]?.length || 0);

  // Define data table columns for deliverable display
  const columns = [
    {
      key: 'description',
      header: 'Deliverable',
      width: '30%',
      sortable: true,
    },
    {
      key: 'platformType',
      header: 'Platform',
      width: '15%',
      sortable: true,
      cell: (row) => getPlatformLabel(row.platformType),
    },
    {
      key: 'contentType',
      header: 'Content Type',
      width: '15%',
      sortable: true,
      cell: (row) => getContentTypeLabel(row.contentType),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      width: '15%',
      sortable: true,
      cell: (row) => formatDate(row.dueDate),
    },
    {
      key: 'status',
      header: 'Status',
      width: '15%',
      sortable: true,
      cell: (row) => getStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '10%',
      cell: (row) => (
        <Button size="sm">
          Review
        </Button>
      ),
    },
  ];

  // Render page header with campaign title and navigation
  return (
    <div>
      <PageHeader
        title={`${campaign?.name || 'Campaign'} - Deliverables`}
        description="Manage and review deliverables submitted by creators for this campaign."
      />

      {/* Render metrics summary cards for campaign deliverables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="text-2xl font-bold">{totalDeliverables}</div>
            <div className="text-sm text-gray-500">Total Deliverables</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="text-2xl font-bold">{pendingReviewCount}</div>
            <div className="text-sm text-gray-500">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Render tabbed interface for deliverables by status */}
      <Tabs defaultValue={DeliverableStatus.SUBMITTED}>
        <TabsList>
          <TabsTrigger value={DeliverableStatus.SUBMITTED}>Submitted</TabsTrigger>
          <TabsTrigger value={DeliverableStatus.APPROVED}>Approved</TabsTrigger>
          <TabsTrigger value={DeliverableStatus.REVISION_REQUESTED}>Revision Requested</TabsTrigger>
          <TabsTrigger value={DeliverableStatus.NOT_STARTED}>Not Started</TabsTrigger>
          <TabsTrigger value={DeliverableStatus.IN_PROGRESS}>In Progress</TabsTrigger>
          <TabsTrigger value={DeliverableStatus.PUBLISHED}>Published</TabsTrigger>
          <TabsTrigger value={DeliverableStatus.REJECTED}>Rejected</TabsTrigger>
          <TabsTrigger value={DeliverableStatus.CANCELLED}>Cancelled</TabsTrigger>
        </TabsList>
        {Object.values(DeliverableStatus).map((status) => (
          <TabsContent key={status} value={status}>
            {/* Render data table with deliverables and action buttons */}
            <DataTable
              columns={columns}
              data={deliverablesByStatus[status] || []}
              emptyMessage="No deliverables found for this status."
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CampaignDeliverablesPage;