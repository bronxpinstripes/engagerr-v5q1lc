import React, { useState, useEffect, useCallback } from 'react'; // version: ^18.0.0
import { useRouter } from 'next/navigation'; // version: ^14.0.0
import { Calendar, Users, DollarSign, BarChart, Search, Filter, ChevronRight } from 'lucide-react'; // version: ^0.279.0
import { useCampaigns } from '../../hooks/useCampaigns';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { Campaign, CampaignStatus, CampaignFilters } from '../../types/campaign';
import { formatDate, formatCurrency } from '../../lib/formatters';

interface CampaignsListProps {
  // Additional props can be defined here if needed
}

/**
 * Main component for displaying a list of campaigns with filtering and pagination
 * @param {CampaignsListProps} props - Component props (currently empty)
 * @returns {JSX.Element} Rendered campaigns list component
 */
const CampaignsList: React.FC<CampaignsListProps> = () => {
  // Initialize state for filters (status, search, dateRange)
  const [statusFilter, setStatusFilter] = useState<CampaignStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Set up pagination state (currentPage, pageSize)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6; // Fixed page size for now

  // Get campaign data and functions using the useCampaigns hook
  const {
    campaigns,
    totalCount,
    isLoading,
    error,
    getCampaignStatusLabel,
    calculateCampaignProgress,
    getCampaigns,
    refreshCampaignData,
    hasMorePages
  } = useCampaigns();

  // NextJS router for navigation
  const router = useRouter();

  // Create a filtered campaigns list based on current filters
  const filteredCampaigns = React.useMemo(() => {
    if (!campaigns) return [];

    return campaigns.filter(campaign => {
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(campaign.status);
      const searchMatch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [campaigns, statusFilter, searchQuery]);

  // Implement useEffect to load campaigns data on mount and when filters change
  useEffect(() => {
    // Load campaigns data on mount and when filters change
    refreshCampaignData();
  }, [statusFilter, searchQuery, currentPage, pageSize, refreshCampaignData]);

  // Handle status filter change with updateStatusFilter function
  const updateStatusFilter = (status: CampaignStatus[]) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle search input change with handleSearchChange function
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search change
  };

  // Handle pagination with handlePageChange function
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Create getCampaignStatusBadge function to render appropriate badge for each status
  const getCampaignStatusBadge = (status: CampaignStatus) => {
    const label = getCampaignStatusLabel(status);
    let badgeVariant = 'primary';

    switch (status) {
      case CampaignStatus.PLANNING:
        badgeVariant = 'secondary';
        break;
      case CampaignStatus.ACTIVE:
        badgeVariant = 'success';
        break;
      case CampaignStatus.COMPLETED:
        badgeVariant = 'outline';
        break;
      case CampaignStatus.ARCHIVED:
        badgeVariant = 'outline';
        break;
      default:
        badgeVariant = 'primary';
        break;
    }

    return <Badge variant={badgeVariant}>{label}</Badge>;
  };

  // Render filter section with status dropdown and search input
  const renderFilterSection = () => (
    <div className="flex items-center justify-between mb-4">
      <Select
        placeholder="Filter by Status"
        options={Object.values(CampaignStatus)}
        onChange={(selectedStatuses: CampaignStatus[]) => updateStatusFilter(selectedStatuses)}
      />
      <div className="relative">
        <Input
          type="search"
          placeholder="Search campaigns..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
      </div>
    </div>
  );

  // Render campaigns in a grid layout using Card components
  const renderCampaigns = () => {
    if (isLoading) {
      return <p>Loading campaigns...</p>;
    }

    if (error) {
      return <p>Error: {error}</p>;
    }

    if (!campaigns || campaigns.length === 0) {
      return <p>No campaigns found.</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.map(campaign => (
          <Card key={campaign.id}>
            <CardHeader>
              <CardTitle>{campaign.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {getCampaignStatusBadge(campaign.status)}
              <p className="text-sm text-gray-500 mt-2">
                {formatDateRange(campaign.startDate, campaign.endDate)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Budget: {formatCurrency(campaign.totalBudget)}
              </p>
              <ProgressBar value={calculateCampaignProgress(campaign)} />
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="secondary" size="sm" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                View Details <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  // Display pagination controls if there are multiple pages
  const renderPagination = () => {
    if (!totalCount || totalCount <= pageSize) return null;

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
      <div className="flex items-center justify-center mt-4">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <Button
            key={page}
            variant={currentPage === page ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handlePageChange(page)}
          >
            {page}
          </Button>
        ))}
      </div>
    );
  };

  // Show empty state when no campaigns match filters
  const renderEmptyState = () => {
    if (isLoading) return <p>Loading campaigns...</p>;
    return <p>No campaigns match the current filters.</p>;
  };

  return (
    <div>
      {renderFilterSection()}
      {filteredCampaigns.length > 0 ? renderCampaigns() : renderEmptyState()}
      {renderPagination()}
    </div>
  );
};

export default CampaignsList;