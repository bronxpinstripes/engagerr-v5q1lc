import React, { useState } from 'react'; // version: ^18.2.0
import { FileText, DollarSign, Calendar, Check, X, MessageSquare } from 'lucide-react'; // version: ^0.279.0

import { useAuth } from '../../hooks/useAuth';
import { usePartnerships } from '../../hooks/usePartnerships';
import { useToast } from '../../hooks/useToast';
import {
  Proposal,
  ProposalType,
  ProposalDeliverable,
  ProposalResponse,
} from '../../types/partnership';
import { PlatformType } from '../../types/platform';
import { ContentType } from '../../types/content';
import { UserType } from '../../types/user';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * Determines the human-readable label for a proposal type
 * @param type ProposalType
 * @returns User-friendly label for the proposal type
 */
const getProposalTypeLabel = (type: ProposalType): string => {
  switch (type) {
    case ProposalType.BRAND_INITIATED:
      return 'Brand Initiated';
    case ProposalType.CREATOR_INITIATED:
      return 'Creator Initiated';
    case ProposalType.CAMPAIGN_BASED:
      return 'Campaign Based';
    case ProposalType.COUNTER_OFFER:
      return 'Counter Offer';
    default:
      return 'Unknown';
  }
};

/**
 * Returns the appropriate badge variant and label based on proposal status
 * @param status string
 * @returns Object containing variant and label for status badge
 */
const getProposalStatusBadge = (status: string) => {
  switch (status) {
    case 'proposed':
      return { variant: 'default', label: 'Proposed' };
    case 'accepted':
      return { variant: 'success', label: 'Accepted' };
    case 'declined':
      return { variant: 'destructive', label: 'Declined' };
    case 'negotiating':
      return { variant: 'warning', label: 'Negotiating' };
    default:
      return { variant: 'secondary', label: 'Unknown' };
  }
};

/**
 * Interface defining the props for the PartnershipProposal component
 */
interface PartnershipProposalProps {
  proposal: Proposal;
  onAccept?: () => void;
  onDecline?: () => void;
  onCounter?: (counterProposal: any) => void;
  className?: string;
  isPreview?: boolean;
}

/**
 * Component that displays partnership proposal details with appropriate actions based on user type and proposal status
 * @param props PartnershipProposalProps
 * @returns Rendered partnership proposal component
 */
export const PartnershipProposal: React.FC<PartnershipProposalProps> = ({
  proposal,
  onAccept,
  onDecline,
  onCounter,
  className,
  isPreview = false,
}) => {
  // Access authentication context using useAuth hook
  const { user, hasPermission } = useAuth();

  // Access partnerships functionality using usePartnerships hook
  const { respondToProposal } = usePartnerships();

  // Access toast notification system using useToast hook
  const toast = useToast();

  // Initialize loading state for action buttons
  const [loading, setLoading] = useState(false);

  // Determine if current user is creator or brand based on user type
  const isCreator = user?.userType === UserType.CREATOR;
  const isBrand = user?.userType === UserType.BRAND;

  // Determine if user can respond to the proposal based on status and user type
  const canRespond =
    proposal.status === 'proposed' &&
    ((isBrand && hasPermission('approve_contracts')) || isCreator);

  // Define handlers for accepting, declining, and countering proposals
  const handleAccept = async () => {
    setLoading(true);
    try {
      await respondToProposal({
        action: 'accept',
        proposalId: proposal.id,
        partnershipId: proposal.partnershipId,
        message: 'Proposal accepted!',
        counterProposal: null,
      });
      toast.success('Proposal accepted');
      onAccept?.();
    } catch (error: any) {
      toast.error('Failed to accept proposal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await respondToProposal({
        action: 'decline',
        proposalId: proposal.id,
        partnershipId: proposal.partnershipId,
        message: 'Proposal declined.',
        counterProposal: null,
      });
      toast.success('Proposal declined');
      onDecline?.();
    } catch (error: any) {
      toast.error('Failed to decline proposal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCounter = async (counterProposal: any) => {
    setLoading(true);
    try {
      await respondToProposal({
        action: 'counter',
        proposalId: proposal.id,
        partnershipId: proposal.partnershipId,
        message: 'Counter proposal submitted.',
        counterProposal: counterProposal,
      });
      toast.success('Counter proposal submitted');
      onCounter?.(counterProposal);
    } catch (error: any) {
      toast.error('Failed to submit counter proposal', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total budget from deliverable prices
  const totalBudget = proposal.deliverables.reduce(
    (sum, deliverable) => sum + deliverable.price,
    0
  );

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Partnership Proposal</CardTitle>
        <CardDescription>
          {getProposalTypeLabel(proposal.proposalType)} |{' '}
          {formatDate(proposal.createdAt)}
          <Badge className="ml-2" variant={getProposalStatusBadge(proposal.status).variant}>
            {getProposalStatusBadge(proposal.status).label}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-2">
            <div className="grid gap-4">
              <div>
                <div className="text-sm font-medium">Budget</div>
                <div>{formatCurrency(totalBudget)}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Timeline</div>
                <div>
                  {formatDate(proposal.timeline.startDate)} - {formatDate(proposal.timeline.endDate)}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="deliverables">
            <div className="space-y-2">
              {Object.entries(
                proposal.deliverables.reduce((acc: { [key: string]: ProposalDeliverable[] }, deliverable) => {
                  const platform = deliverable.platformType;
                  acc[platform] = acc[platform] || [];
                  acc[platform].push(deliverable);
                  return acc;
                }, {})
              ).map(([platform, deliverables]) => (
                <div key={platform} className="mb-4">
                  <h4 className="text-md font-semibold">{platform}</h4>
                  <ul className="list-disc pl-5">
                    {deliverables.map((deliverable) => (
                      <li key={deliverable.id}>
                        {deliverable.contentType}: {deliverable.description}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="terms">
            <div className="space-y-2">
              <p>{proposal.termsAndConditions}</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      {canRespond && (
        <CardFooter className="justify-between">
          <Button variant="outline" onClick={handleDecline} disabled={loading}>
            Decline
          </Button>
          <Button onClick={handleAccept} disabled={loading}>
            Accept
          </Button>
        </CardFooter>
      )}
      {isPreview && (
        <Alert>
          <AlertTitle>Preview Mode</AlertTitle>
          <AlertDescription>
            This is a preview of the proposal. Some actions may be disabled.
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
};