import React from 'react'; // react 18.0+
import { PlusCircle } from 'lucide-react'; // v0.279.0
import { useRouter } from 'next/navigation'; // ^14.0.0

import PageHeader from '../../../components/layout/PageHeader';
import CampaignsList from '../../../components/brand/CampaignsList';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/ui/Button';
import { useCampaigns } from '../../../hooks/useCampaigns';
import { useAuth } from '../../../hooks/useAuth';

/**
 * The main function component for the campaigns page
 * @returns {JSX.Element} The rendered campaigns page
 */
const CampaignsPage: React.FC = () => {
  // Use the useAuth hook to ensure the user is authenticated
  const { isAuthenticated } = useAuth();

  // Use the useCampaigns hook to access campaign data and operations
  const { isLoading } = useCampaigns();

  // Use the Next.js router for navigation to campaign detail views
  const router = useRouter();

  // Set up a function for handling the create new campaign action
  const handleCreateCampaign = () => {
    router.push('/brand/campaigns/create');
  };

  // Render the DashboardLayout component as the page container
  return (
    <DashboardLayout>
      {/* Render the PageHeader with title and Create Campaign button */}
      <PageHeader
        title="Campaigns"
        description="Manage your marketing campaigns and creator partnerships."
        actions={
          <Button onClick={handleCreateCampaign} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Create Campaign
          </Button>
        }
      />

      {/* Render the CampaignsList component to display campaigns */}
      <CampaignsList />
    </DashboardLayout>
  );
};

export default CampaignsPage;