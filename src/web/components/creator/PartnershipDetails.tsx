import React, { useState, useEffect, useMemo } from 'react'; // react ^18.2.0
import {
  CalendarClock,
  Building,
  DollarSign,
  FileContract,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'; // lucide-react ^0.279.0
import { usePartnerships } from '../../hooks/usePartnerships';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import ContractViewer from '../shared/ContractViewer';
import MessagingInterface from '../shared/MessagingInterface';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import {
  Partnership,
  PartnershipStatus,
  PartnershipDetail,
} from '../../types/partnership';
import { UserType } from '../../types/user';

/**
 * Interface defining the properties for the PartnershipDetails component
 */
export interface PartnershipDetailsProps {
  /** ID of the partnership to display */
  partnershipId: string;
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * Component that displays comprehensive details about a partnership
 */
const PartnershipDetails: React.FC<PartnershipDetailsProps> = ({
  partnershipId,
  className,
}) => {
  // LD1: Destructure partnershipId and className from props
  // LD1: Initialize hooks: usePartnerships, useAuth, and useToast
  const {
    partnershipDetail,
    partnershipDetailLoading,
    partnershipDetailError,
    updatePartnershipStatus,
  } = usePartnerships();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  // LD1: Use useState to track loading state for actions
  const [isLoading, setIsLoading] = useState(false);

  // LD1: Use useEffect to fetch partnership details when partnershipId changes
  useEffect(() => {
    if (partnershipId) {
      // LD1: Call getPartnershipById to fetch partnership details
      partnershipDetail?.partnership.id;
    }
  }, [partnershipId, partnershipDetail?.partnership.id]);

  // LD1: Define handlers for contract signing, messaging, and status update actions
  // LD1: Implement conditional rendering based on partnership status
  // LD1: Display loading skeleton when partnership data is loading
  // LD1: Display error state if partnership data cannot be fetched
  // LD1: Render partnership overview card with key information
  // LD1: Show brand information with avatar and details
  // LD1: Display partnership status with appropriate badge
  // LD1: Show financial details including budget and timeline
  // LD1: Conditionally render contract viewer if contract exists
  // LD1: Render action buttons based on current status and user permissions
  // LD1: Show alerts for important status updates or required actions
  // LD1: Format all dates and currency values consistently

  /**
   * Helper function that returns the appropriate badge variant and label based on partnership status
   * @param status PartnershipStatus
   * @returns Object containing variant and label for status badge
   */
  const getStatusBadge = (status: PartnershipStatus) => {
    // LD1: Define a mapping between partnership status and badge properties
    const badgeMap: { [key in PartnershipStatus]: { variant: string; label: string } } = {
      [PartnershipStatus.PROPOSED]: { variant: 'secondary', label: 'Proposed' },
      [PartnershipStatus.NEGOTIATING]: { variant: 'warning', label: 'Negotiating' },
      [PartnershipStatus.ACCEPTED]: { variant: 'default', label: 'Accepted' },
      [PartnershipStatus.CONTRACT_PENDING]: { variant: 'warning', label: 'Contract Pending' },
      [PartnershipStatus.CONTRACT_SIGNED]: { variant: 'success', label: 'Contract Signed' },
      [PartnershipStatus.IN_PROGRESS]: { variant: 'default', label: 'In Progress' },
      [PartnershipStatus.COMPLETED]: { variant: 'success', label: 'Completed' },
      [PartnershipStatus.CANCELLED]: { variant: 'destructive', label: 'Cancelled' },
      [PartnershipStatus.DECLINED]: { variant: 'destructive', label: 'Declined' },
    };

    // LD1: Return appropriate badge variant and label for the provided status
    const badge = badgeMap[status];

    // LD1: Handle all possible PartnershipStatus enum values
    if (badge) {
      return badge;
    }

    // LD1: Provide default values for unexpected status values
    return { variant: 'secondary', label: 'Unknown' };
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>Partnership Details</CardTitle>
        <CardDescription>
          View and manage your partnership with [Brand Name]
        </CardDescription>
      </CardHeader>
      <CardContent>
        {partnershipDetailLoading ? (
          <Skeleton className="h-4 w-[200px]" />
        ) : partnershipDetailError ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load partnership details. Please try again later.
            </AlertDescription>
          </Alert>
        ) : partnershipDetail ? (
          <>
            <div className="grid gap-4">
              <div>
                <h4 className="text-sm font-medium leading-none">Brand</h4>
                <div className="flex items-center mt-2">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="Brand" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div className="ml-2">
                    <p className="text-sm font-medium">{partnershipDetail.brand.companyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {partnershipDetail.brand.industries.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium leading-none">Status</h4>
                <Badge variant={getStatusBadge(partnershipDetail.partnership.status).variant}>
                  {getStatusBadge(partnershipDetail.partnership.status).label}
                </Badge>
              </div>
              <div>
                <h4 className="text-sm font-medium leading-none">Budget</h4>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(partnershipDetail.partnership.totalBudget)}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium leading-none">Timeline</h4>
                <p className="text-sm text-muted-foreground">
                  {formatDate(partnershipDetail.partnership.startDate)} -{' '}
                  {formatDate(partnershipDetail.partnership.endDate)}
                </p>
              </div>
            </div>

            {/* Contract Viewer */}
            {partnershipDetail.contract && (
              <div className="mt-4">
                <h4 className="text-sm font-medium leading-none">Contract</h4>
                <ContractViewer contract={partnershipDetail.contract} />
              </div>
            )}

            {/* Messaging Interface */}
            <div className="mt-4">
              <h4 className="text-sm font-medium leading-none">Messages</h4>
              <MessagingInterface initialFilter={{ partnershipId: partnershipDetail.partnership.id }} />
            </div>
          </>
        ) : (
          <div>No partnership details found.</div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button>Take Action</Button>
      </CardFooter>
    </Card>
  );
};

export default PartnershipDetails;