import React, { useState, useMemo, useCallback } from 'react'; // version: ^18.0.0
import { FileUp, Eye, CheckCircle, AlertCircle, Clock } from 'lucide-react'; // version: ^0.279.0
import { usePartnerships } from '../../hooks/usePartnerships';
import { useToast } from '../../hooks/useToast';
import DataTable from '../shared/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Deliverable, DeliverableStatus } from '../../types/partnership';
import { formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * Configuration for status badge appearance
 */
interface StatusBadgeConfig {
  variant: string;
  label: string;
}

/**
 * Props for the DeliverablesList component
 */
interface DeliverablesListProps {
  /** ID of the partnership whose deliverables should be displayed */
  partnershipId: string;
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * Helper function that returns the appropriate badge variant and label based on deliverable status
 * @param status DeliverableStatus
 * @returns { variant: string, label: string }
 */
const getStatusBadge = (status: DeliverableStatus): { variant: string; label: string } => {
  // Define a mapping between deliverable status and badge properties
  const statusMap: Record<DeliverableStatus, StatusBadgeConfig> = {
    [DeliverableStatus.NOT_STARTED]: { variant: 'outline', label: 'Not Started' },
    [DeliverableStatus.IN_PROGRESS]: { variant: 'primary', label: 'In Progress' },
    [DeliverableStatus.SUBMITTED]: { variant: 'warning', label: 'Submitted' },
    [DeliverableStatus.REVISION_REQUESTED]: { variant: 'warning', label: 'Revision Requested' },
    [DeliverableStatus.APPROVED]: { variant: 'success', label: 'Approved' },
    [DeliverableStatus.PUBLISHED]: { variant: 'success', label: 'Published' },
    [DeliverableStatus.REJECTED]: { variant: 'destructive', label: 'Rejected' },
    [DeliverableStatus.CANCELLED]: { variant: 'outline', label: 'Cancelled' },
  };

  // Return appropriate badge variant and label for the provided status
  return statusMap[status] || { variant: 'outline', label: 'Unknown' };
};

/**
 * Helper function that returns a numeric priority for a deliverable based on its status and due date
 * @param deliverable Deliverable
 * @returns number Priority value for sorting
 */
const getStatusPriority = (deliverable: Deliverable): number => {
  // Define priority mapping for different statuses
  const statusPriority: Record<DeliverableStatus, number> = {
    [DeliverableStatus.REVISION_REQUESTED]: 5, // Items with REVISION_REQUESTED status get highest priority
    [DeliverableStatus.NOT_STARTED]: 4,
    [DeliverableStatus.IN_PROGRESS]: 3,
    [DeliverableStatus.SUBMITTED]: 2,
    [DeliverableStatus.APPROVED]: 1,
    [DeliverableStatus.PUBLISHED]: 1, // Completed items (APPROVED, PUBLISHED) get lower priority
    [DeliverableStatus.REJECTED]: 0,
    [DeliverableStatus.CANCELLED]: -1, // CANCELLED items always get lowest priority
  };

  // Calculate days remaining until due date
  const daysRemaining = (deliverable.dueDate.getTime() - Date.now()) / (1000 * 3600 * 24);

  let priority = statusPriority[deliverable.status];

  // Assign higher priority to items approaching their deadline
  if ((deliverable.status === DeliverableStatus.NOT_STARTED || deliverable.status === DeliverableStatus.IN_PROGRESS) && daysRemaining <= 7) {
    priority += 2; // Items with NOT_STARTED or IN_PROGRESS with close deadlines get high priority
  }

  // Return a numeric value representing the deliverable's priority
  return priority;
};

/**
 * Component that displays a list of deliverables for a partnership
 * @param props DeliverablesListProps
 * @returns JSX.Element Rendered deliverables list component
 */
const DeliverablesList: React.FC<DeliverablesListProps> = ({ partnershipId, className }) => {
  // Destructure partnershipId and className from props
  // Initialize partnershipDetail with usePartnerships hook
  const { partnershipDetail, partnershipDetailLoading, partnershipDetailError } = usePartnerships();
  // Set up toast notifications with useToast hook
  const toast = useToast();
  // Define loading state for actions with useState
  const [loading, setLoading] = useState(false);

  // Create a sorted and filtered list of deliverables with useMemo
  const deliverables = useMemo(() => {
    if (!partnershipDetail?.deliverables) return [];
    return [...partnershipDetail.deliverables].sort((a, b) => getStatusPriority(b) - getStatusPriority(a));
  }, [partnershipDetail?.deliverables]);

  // Define column configuration for DataTable with useMemo
  const columns = useMemo(() => [
    {
      key: 'description',
      header: 'Deliverable',
      sortable: false,
      filterable: false,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      filterable: false,
      cell: (row: Deliverable) => formatDate(row.dueDate),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: false,
      cell: (row: Deliverable) => {
        const { variant, label } = getStatusBadge(row.status);
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      cell: (row: Deliverable) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => handleSubmission(row)}>
            <FileUp className="h-4 w-4 mr-2" />
            Submit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(row)}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </div>
      ),
    },
  ], [partnershipDetail]);

  // Create function for handling submission action with useCallback
  const handleSubmission = useCallback((deliverable: Deliverable) => {
    // Implement submission logic here
    toast.info(`Submitting deliverable: ${deliverable.description}`);
  }, [toast]);

  // Create function for viewing deliverable details with useCallback
  const handleViewDetails = useCallback((deliverable: Deliverable) => {
    // Implement view details logic here
    toast.info(`Viewing details for: ${deliverable.description}`);
  }, [toast]);

  // Render the component with proper loading states
  return (
    <div className={cn("space-y-4", className)}>
      {partnershipDetailLoading ? (
        // If loading, display a skeleton loader
        <p>Loading deliverables...</p>
      ) : partnershipDetailError ? (
        // If error, display an error message
        <p>Error: {partnershipDetailError}</p>
      ) : !deliverables || deliverables.length === 0 ? (
        // If no deliverables, display an empty state message
        <p>No deliverables found for this partnership.</p>
      ) : (
        // Render DataTable with deliverables data and column configuration
        <DataTable
          columns={columns}
          data={deliverables.map(deliverable => ({
            ...deliverable,
            dueDate: deliverable.dueDate,
            status: deliverable.status,
          }))}
          emptyMessage="No deliverables found."
        />
      )}
    </div>
  );
};

export default DeliverablesList;