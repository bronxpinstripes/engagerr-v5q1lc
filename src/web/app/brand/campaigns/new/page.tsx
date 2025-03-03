// Import necessary modules and components from React and Next.js
import React from 'react'; // version: ^18.0.0
import { redirect } from 'next/navigation'; // v14.0.0
import { PlusCircle } from 'lucide-react'; // version: ^0.279.0

// Import custom components and hooks
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import PageHeader from '../../../../components/layout/PageHeader';
import CampaignForm from '../../../../components/brand/CampaignForm';
import Card from '../../../../components/ui/Card';
import useBrand from '../../../../hooks/useBrand';
import useCampaigns from '../../../../hooks/useCampaigns';
import useToast from '../../../../hooks/useToast';

/**
 * Server component that renders the new campaign creation page
 * @returns Rendered page component
 */
const NewCampaignPage: React.FC = () => {
  // Access brand context to verify brand user and get brand ID
  const { verifyBrandUser } = useBrand();

  // Verify that the user is a brand, otherwise redirect
  if (!verifyBrandUser()) {
    redirect('/auth/login');
  }

  // Access toast context for displaying notifications
  const { toast } = useToast();

  // Access campaign management functions
  const { createCampaign } = useCampaigns();

  /**
   * Client component function that handles successful campaign creation
   * @param newCampaign 
   * @returns 
   */
  const handleCampaignSuccess = (newCampaign: any) => {
    // Show success toast notification
    toast.success('Campaign created successfully!');

    // Redirect to the newly created campaign's details page
    redirect(`/brand/campaigns/${newCampaign.id}`);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Create New Campaign"
        description="Define the parameters for your new marketing campaign."
        breadcrumbs={[
          { label: 'Campaigns', href: '/brand/campaigns' },
          { label: 'New Campaign', href: '/brand/campaigns/new', active: true },
        ]}
        actions={
          <Button variant="primary">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        }
      />
      <Card>
        <CampaignForm onSuccess={handleCampaignSuccess} />
      </Card>
    </DashboardLayout>
  );
};

export const metadata = {
  title: 'New Campaign | Engagerr',
  description: 'Create a new marketing campaign on Engagerr.',
};

export default NewCampaignPage;