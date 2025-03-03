import React from 'react';
import { Plus, Search, Calendar, Users, DollarSign, ExternalLink } from 'lucide-react'; // version: ^0.279.0
import { useRouter } from 'next/navigation'; // version: ^14.0.0

import DashboardLayout from '../../../components/layout/DashboardLayout'; // Layout component providing consistent dashboard structure
import MetricsCard from '../../../components/shared/MetricsCard'; // Card component for displaying key metrics
import CampaignsList from '../../../components/brand/CampaignsList'; // Component for displaying list of active campaigns
import CreatorCard from '../../../components/brand/CreatorCard'; // Card component for displaying creator profiles
import Button from '../../../components/ui/Button'; // UI button component for actions
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../components/ui/Card'; // Card container components for layout
import useBrand from '../../../hooks/useBrand'; // Custom hook for accessing brand data and operations
import useCampaigns from '../../../hooks/useCampaigns'; // Custom hook for campaign management functionality
import useDiscovery from '../../../hooks/useDiscovery'; // Custom hook for creator discovery and recommendations
import { formatDate } from '../../../lib/formatters'; // Utility for formatting dates

/**
 * Server component data fetching function for the brand dashboard
 * @returns {Promise<{ dashboardData: BrandDashboardData }>} Object containing dashboard data from API
 */
const getData = async () => {
  // Make API call to fetch brand dashboard data
  // TODO: Implement API call here
  const dashboardData = {
    activeCampaigns: 5,
    engagedCreators: 25,
    budgetUtilization: 0.65,
    recommendedCreators: [
      {
        id: 'creator1',
        name: 'Creator One',
        avatarUrl: '/path/to/avatar1.jpg',
        category: 'Tech',
        followerCount: 150000,
        engagementRate: 0.03,
        matchScore: 85,
        platforms: ['youtube', 'instagram'],
      },
      {
        id: 'creator2',
        name: 'Creator Two',
        avatarUrl: '/path/to/avatar2.jpg',
        category: 'Lifestyle',
        followerCount: 220000,
        engagementRate: 0.045,
        matchScore: 92,
        platforms: ['instagram', 'tiktok'],
      },
    ],
  };

  // Return structured data for consumption by page component
  return { dashboardData };
};

/**
 * Main page component for brand dashboard
 * @returns {JSX.Element} Rendered brand dashboard page
 */
const BrandDashboard: React.FC = () => {
  // Fetch data using getData function
  const { dashboardData } = await getData();

  // Extract dashboard metrics and statistics
  const activeCampaigns = dashboardData?.activeCampaigns || 0;
  const engagedCreators = dashboardData?.engagedCreators || 0;
  const budgetUtilization = dashboardData?.budgetUtilization || 0;
  const recommendedCreators = dashboardData?.recommendedCreators || [];

  // Use useBrand hook to access brand profile information
  const { brand } = useBrand();

  // Use useCampaigns hook to retrieve active campaigns
  const { campaigns } = useCampaigns();

  // Use useDiscovery hook to get recommended creators
  const { favoriteCreator, unfavoriteCreator, isFavorite } = useDiscovery();

  // Set up router for navigation to other pages
  const router = useRouter();

  // Create handleCreateCampaign function for quick action
  const handleCreateCampaign = () => {
    router.push('/brand/campaigns/new');
  };

  // Create handleFindCreators function for discovery navigation
  const handleFindCreators = () => {
    router.push('/brand/discovery');
  };

  // Create handleViewCreator function to view creator profiles
  const handleViewCreator = (creatorId: string) => {
    router.push(`/brand/discovery/${creatorId}`);
  };

  // Create handleFavoriteCreator function to manage favorites
  const handleFavoriteCreator = (creatorId: string, isFavorite: boolean) => {
    isFavorite ? unfavoriteCreator(creatorId) : favoriteCreator(creatorId);
  };

  // Create handleViewAllCampaigns function for campaign navigation
  const handleViewAllCampaigns = () => {
    router.push('/brand/campaigns');
  };

  // Create handleViewAllCreators function for discovery navigation
  const handleViewAllCreators = () => {
    router.push('/brand/discovery');
  };

  // Render DashboardLayout with dashboard content
  return (
    <DashboardLayout>
      {/* Dashboard overview section */}
      <div>
        {/* Greeting header */}
        <div>
          <h1>Hello, {brand?.companyName || 'Brand'}</h1>
          <p>Today is {formatDate(new Date())}</p>
        </div>

        {/* Metrics grid */}
        <div>
          <MetricsCard
            title="Active Campaigns"
            value={activeCampaigns}
            icon={Calendar}
          />
          <MetricsCard
            title="Engaged Creators"
            value={engagedCreators}
            icon={Users}
          />
          <MetricsCard
            title="Budget Utilization"
            value={budgetUtilization}
            isPercentage
            icon={DollarSign}
          />
        </div>
      </div>

      {/* Active campaigns section */}
      <div>
        {/* Section header */}
        <div>
          <h2>Active Campaigns</h2>
          <div>
            <Button variant="outline" onClick={handleViewAllCampaigns}>
              View All Campaigns
            </Button>
            <Button onClick={handleCreateCampaign}>Create Campaign</Button>
          </div>
        </div>

        {/* List of active campaigns */}
        <CampaignsList limit={3} filters={{ status: 'Active' }} />
      </div>

      {/* Creator recommendations section */}
      <div>
        {/* Section header */}
        <div>
          <h2>Creator Recommendations</h2>
          <div>
            <Button variant="outline" onClick={handleViewAllCreators}>
              Find More Creators
            </Button>
          </div>
        </div>

        {/* Grid of creator cards */}
        <div>
          {recommendedCreators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              isFavorite={isFavorite(creator.id)}
              onFavorite={handleFavoriteCreator}
              onView={handleViewCreator}
              showMatchScore
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BrandDashboard;