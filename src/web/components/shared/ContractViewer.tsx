import React, { useState } from 'react'; // version: ^18.2.0
import {
  FileText,
  DollarSign,
  Calendar,
  Check,
  X,
  Download,
  Pen,
  FileSignature,
} from 'lucide-react'; // version: ^0.279.0
import { useAuth } from '../../hooks/useAuth';
import { usePartnerships } from '../../hooks/usePartnerships';
import { useToast } from '../../hooks/useToast';
import {
  Contract,
  ContractStatus,
  ContractTerms,
  PaymentSchedule,
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
import Badge from '../ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * Interface defining the properties for the ContractViewer component.
 * It includes the contract data, optional callbacks for actions, and styling options.
 */
export interface ContractViewerProps {
  contract: Contract;
  onSign?: () => void;
  onDownload?: () => void;
  className?: string;
  isPreview?: boolean;
}

/**
 * Component that displays contract details with appropriate actions based on user type and contract status
 */
const ContractViewer: React.FC<ContractViewerProps> = ({
  contract,
  onSign,
  onDownload,
  className,
  isPreview = false,
}) => {
  // Access authentication context to determine user type and permissions
  const { user, hasPermission, getUserType } = useAuth();

  // Access partnership management functions
  const { signContract } = usePartnerships();

  // Access toast notification system for user feedback
  const toast = useToast();

  // Initialize loading state for action buttons
  const [isLoading, setIsLoading] = useState(false);

  // Determine if the current user is the creator or the brand
  const userType = getUserType(user);
  const isCreator = userType === UserType.CREATOR;
  const isBrand = userType === UserType.BRAND;

  // Determine if the user can sign the contract based on the contract status and user type
  const canSign =
    contract.status === ContractStatus.PENDING_BRAND_SIGNATURE && isBrand ||
    contract.status === ContractStatus.PENDING_CREATOR_SIGNATURE && isCreator;

  /**
   * Handles the contract signing action.
   * It calls the signContract function from the usePartnerships hook and displays a toast notification.
   */
  const handleSignContract = async () => {
    setIsLoading(true);
    try {
      if (!contract?.id) {
        throw new Error('Contract ID is missing.');
      }
      await signContract(contract.id);
      toast.success('Contract signed successfully!');
      if (onSign) {
        onSign();
      }
    } catch (error: any) {
      toast.error('Failed to sign contract', error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the contract download action.
   * It calls the onDownload callback function if it is provided.
   */
  const handleDownloadContract = () => {
    if (onDownload) {
      onDownload();
    }
  };

  /**
   * Returns the appropriate badge variant and label based on contract status
   * @param status ContractStatus
   * @returns Object containing variant and label for status badge
   */
  const getContractStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.DRAFT:
        return { variant: 'outline', label: 'Draft' };
      case ContractStatus.PENDING_BRAND_SIGNATURE:
        return { variant: 'warning', label: 'Pending Brand Signature' };
      case ContractStatus.PENDING_CREATOR_SIGNATURE:
        return { variant: 'warning', label: 'Pending Creator Signature' };
      case ContractStatus.SIGNED:
        return { variant: 'success', label: 'Signed' };
      case ContractStatus.AMENDED:
        return { variant: 'warning', label: 'Amended' };
      case ContractStatus.TERMINATED:
        return { variant: 'destructive', label: 'Terminated' };
      case ContractStatus.EXPIRED:
        return { variant: 'destructive', label: 'Expired' };
      default:
        return { variant: 'secondary', label: 'Unknown' };
    }
  };

  /**
   * Returns a user-friendly label for payment schedule types
   * @param schedule PaymentSchedule
   * @returns Human-readable payment schedule description
   */
  const getPaymentScheduleLabel = (schedule: PaymentSchedule) => {
    switch (schedule) {
      case PaymentSchedule.UPFRONT:
        return 'Upfront';
      case PaymentSchedule.ON_COMPLETION:
        return 'On Completion';
      case PaymentSchedule.SPLIT:
        return '50/50 Split';
      case PaymentSchedule.MILESTONE_BASED:
        return 'Milestone-Based';
      default:
        return 'Custom Schedule';
    }
  };

  // Get badge details based on contract status
  const badge = getContractStatusBadge(contract.status);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>
          Contract: {contract.title}
        </CardTitle>
        <CardDescription>
          Contract ID: {contract.id} | Created: {formatDate(contract.createdAt)}
        </CardDescription>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <div className="grid gap-4">
              <div>
                <h4 className="text-sm font-medium leading-none">Payment Schedule</h4>
                <p className="text-sm text-muted-foreground">
                  {getPaymentScheduleLabel(contract.terms.paymentSchedule)}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium leading-none">Total Compensation</h4>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(contract.terms.totalCompensation)}
                </p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="deliverables">
            <div className="grid gap-4">
              {contract.terms.deliverables.map((deliverable) => (
                <div key={deliverable.id} className="border rounded-md p-4">
                  <h4 className="text-sm font-medium leading-none">{deliverable.description}</h4>
                  <p className="text-sm text-muted-foreground">
                    Platform: {deliverable.platformType} | Content Type: {deliverable.contentType}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Due Date: {formatDate(deliverable.dueDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Price: {formatCurrency(deliverable.price)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Requirements: {deliverable.requirements}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="terms">
            <div className="grid gap-4">
              <h4 className="text-sm font-medium leading-none">Terms and Conditions</h4>
              <p className="text-sm text-muted-foreground">
                {contract.terms.additionalTerms}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          {contract.brandSignedAt && (
            <p className="text-sm text-muted-foreground">
              Brand Signed: {formatDate(contract.brandSignedAt)}
            </p>
          )}
          {contract.creatorSignedAt && (
            <p className="text-sm text-muted-foreground">
              Creator Signed: {formatDate(contract.creatorSignedAt)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!isPreview && canSign && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSignContract}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FileSignature className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing...
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign Contract
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadContract}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ContractViewer;