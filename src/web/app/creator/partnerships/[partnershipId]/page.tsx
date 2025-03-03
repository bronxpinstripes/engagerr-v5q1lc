import React from 'react'; // react 18.0+
import { ArrowLeft, MessageSquare, FileContract, DollarSign, CheckSquare } from 'lucide-react'; // v0.279.0
import Link from 'next/link'; // ^14.0.0
import { Metadata } from 'next'; // next 13+

import PageHeader from '../../../../components/layout/PageHeader';
import PartnershipDetails from '../../../../components/creator/PartnershipDetails';
import DeliverablesList from '../../../../components/creator/DeliverablesList';
import PaymentStatus from '../../../../components/creator/PaymentStatus';
import { usePartnerships } from '../../../../hooks/usePartnerships';
import { Tabs, Card, CardContent } from '../../../../components/ui/Tabs';
import { Button } from '../../../../components/ui/Button';

/**
 * Generates metadata for the partnership details page, including title and description.
 * @returns Metadata object for the page
 */
export const metadata: Metadata = {
  title: 'Partnership Details | Engagerr',
  description: 'View and manage your partnership details, deliverables, and payment status.',
};

/**
 * Server component that renders the partnership details page for creators
 * @param params Object containing the partnershipId from the dynamic route
 * @returns Rendered partnership page with tabbed interface
 */
const PartnershipPage: React.FC<{ params: { partnershipId: string } }> = async ({ params }) => {
  // LD1: Extract partnershipId from the route parameters
  const { partnershipId } = params;

  // IE1: Import and use the usePartnerships hook to fetch partnership details
  const { partnershipDetail } = usePartnerships();

  // LD1: Set up breadcrumbs for navigation context
  const breadcrumbs = [
    { label: 'Partnerships', href: '/creator/partnerships' },
    { label: 'Partnership Details', href: `/creator/partnerships/${partnershipId}`, active: true },
  ];

  // LD1: Create header actions including back button and message button
  const headerActions = (
    <>
      <Link href="/creator/partnerships">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Partnerships
        </Button>
      </Link>
      <Button variant="secondary" size="sm">
        <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
        Message Brand
      </Button>
    </>
  );

  // LD1: Render PageHeader with title and actions
  return (
    <div>
      <PageHeader
        title="Partnership Details"
        description="View and manage your partnership details, deliverables, and payment status."
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />

      {/* LD1: Render Card component to contain the partnership information */}
      <Card>
        <CardContent>
          {/* LD1: Implement Tabs component with Overview, Deliverables, and Payments tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <Tabs.List>
              <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
              <Tabs.Trigger value="deliverables">Deliverables</Tabs.Trigger>
              <Tabs.Trigger value="payments">Payments</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="overview">
              {/* LD1: Render PartnershipDetails component in the Overview tab */}
              {/* IE1: Pass the partnershipId to the PartnershipDetails component */}
              <PartnershipDetails partnershipId={partnershipId} />
            </Tabs.Content>
            <Tabs.Content value="deliverables">
              {/* LD1: Render DeliverablesList component in the Deliverables tab */}
              {/* IE1: Pass the partnershipId to the DeliverablesList component */}
              <DeliverablesList partnershipId={partnershipId} />
            </Tabs.Content>
            <Tabs.Content value="payments">
              {/* LD1: Render PaymentStatus component in the Payments tab */}
              {/* IE1: Pass the payments data to the PaymentStatus component */}
              <PaymentStatus payments={partnershipDetail?.payments || []} />
            </Tabs.Content>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// IE3: Export the PartnershipPage component as the default export for this route
export default PartnershipPage;