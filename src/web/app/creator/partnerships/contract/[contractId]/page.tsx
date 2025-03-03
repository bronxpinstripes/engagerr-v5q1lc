import React from 'react'; // v18.0+
import { ArrowLeft, FileContract, Download, FileSignature } from 'lucide-react'; // v0.279.0
import Link from 'next/link'; // ^14.0.0
import { notFound } from 'next/navigation'; // ^14.0.0

import PageHeader from '../../../../../components/layout/PageHeader';
import ContractViewer from '../../../../../components/shared/ContractViewer';
import { usePartnerships } from '../../../../../hooks/usePartnerships';
import { useToast } from '../../../../../hooks/useToast';
import { Card, CardContent } from '../../../../../components/ui/Card';
import { Skeleton } from '../../../../../components/ui/Skeleton';
import { Alert, AlertTitle, AlertDescription } from '../../../../../components/ui/Alert';
import { Contract, ContractStatus } from '../../../../../types/partnership';

/**
 * Server component that renders the contract details page for a specific partnership contract
 * @param params: { contractId: string }
 * @returns Rendered contract page with contract viewer component
 */
const ContractPage: React.FC<{ params: { contractId: string } }> = async ({ params }) => {
  // LD1: Extract contractId from the route parameters
  const { contractId } = params;

  // LD1: Set up breadcrumbs for navigation context
  const breadcrumbs = [
    { label: 'Partnerships', href: '/creator/partnerships' },
    { label: 'Contract Details', href: `/creator/partnerships/contract/${contractId}`, active: true },
  ];

  // LD1: Create header actions including back button and download button
  const headerActions = (
    <>
      <Link href="/creator/partnerships">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Partnerships
        </Button>
      </Link>
    </>
  );

  // LD1: Use usePartnerships hook to get contract details using getContractById function
  const { getPartnershipById, signContract, refreshPartnershipData } = usePartnerships();
  const { data: contract, isLoading, error, refreshPartnershipData: refreshContract } = useQuery(
    ['contract', contractId],
    () => getPartnershipById(contractId),
    {
      retry: 3,
      onError: (err: any) => {
        console.error('Failed to load contract:', err);
      },
    }
  );

  // LD1: Use useToast hook for notification messages
  const { toast } = useToast();

  // LD1: Define handler for contract signing
  const handleSignContract = async () => {
    try {
      if (!contractId) {
        throw new Error('Contract ID is missing.');
      }
      await signContract(contractId);
      toast.success('Contract signed successfully!');
      await refreshContract(); // Refresh the contract data after signing
    } catch (err: any) {
      toast.error('Failed to sign contract', err?.message);
    }
  };

  // LD1: Define handler for contract downloading
  const handleDownloadContract = async () => {
    // Placeholder for download functionality
    toast.info('Download functionality is not yet implemented.');
  };

  // LD1: Determine if contract can be signed based on status
  const canSign =
    contract?.partnership?.status === ContractStatus.PENDING_BRAND_SIGNATURE ||
    contract?.partnership?.status === ContractStatus.PENDING_CREATOR_SIGNATURE;

  // LD1: Render PageHeader with title and actions
  return (
    <div>
      <PageHeader title="Contract Details" breadcrumbs={breadcrumbs} actions={headerActions} />

      {/* LD1: Handle loading state with skeleton UI */}
      {isLoading ? (
        <Card>
          <CardContent>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-4 w-3/4 mt-4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardContent>
        </Card>
      ) : error ? (
        // LD1: Handle error state if contract cannot be found or retrieved
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load contract details. Please try again later.</AlertDescription>
        </Alert>
      ) : contract ? (
        // LD1: Render Card component containing ContractViewer
        <Card>
          <CardContent>
            {/* LD1: Show appropriate alerts based on contract status */}
            {contract.status === ContractStatus.PENDING_BRAND_SIGNATURE && (
              <Alert variant="warning">
                <AlertTitle>Pending Brand Signature</AlertTitle>
                <AlertDescription>This contract is awaiting the brand's signature.</AlertDescription>
              </Alert>
            )}
            {contract.status === ContractStatus.PENDING_CREATOR_SIGNATURE && (
              <Alert variant="warning">
                <AlertTitle>Pending Your Signature</AlertTitle>
                <AlertDescription>Please review and sign the contract to proceed.</AlertDescription>
              </Alert>
            )}
            {contract.status === ContractStatus.SIGNED && (
              <Alert variant="success">
                <AlertTitle>Contract Signed</AlertTitle>
                <AlertDescription>This contract has been signed by both parties.</AlertDescription>
              </Alert>
            )}

            {/* LD1: Pass contract data to ContractViewer component */}
            <ContractViewer
              contract={contract}
              // LD1: Provide sign and download handlers to ContractViewer
              onSign={handleSignContract}
              onDownload={handleDownloadContract}
            />
          </CardContent>
        </Card>
      ) : (
        // LD1: If contract not found, return 404 page using notFound() utility
        notFound()
      )}
    </div>
  );
};

export default ContractPage;