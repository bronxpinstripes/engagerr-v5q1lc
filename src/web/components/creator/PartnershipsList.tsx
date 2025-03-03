import React, { useState, useEffect, useMemo } from 'react'; // version: ^18.0.0
import { useRouter } from 'next/navigation'; // version: ^14.0.0
import { Eye, Search, Filter } from 'lucide-react'; // version: ^0.279.0
import { usePartnerships } from '../../hooks/usePartnerships';
import DataTable from '../shared/DataTable';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Input } from '../ui/Input';
import { formatCurrency, formatDate, formatPartnershipStatus } from '../../lib/formatters';
import { PartnershipStatus } from '../../types/partnership';

/**
 * Determines the appropriate badge variant based on partnership status
 * @param {PartnershipStatus} status - Partnership status
 * @returns {string} Badge variant name (primary, secondary, success, warning, destructive, etc.)
 */
const getStatusBadgeVariant = (status: PartnershipStatus): string => {
  switch (status) {
    case PartnershipStatus.PROPOSED:
      return 'secondary';
    case PartnershipStatus.NEGOTIATING:
      return 'warning';
    case PartnershipStatus.ACCEPTED:
    case PartnershipStatus.CONTRACT_PENDING:
      return 'primary';
    case PartnershipStatus.CONTRACT_SIGNED:
    case PartnershipStatus.IN_PROGRESS:
      return 'success';
    case PartnershipStatus.COMPLETED:
      return 'secondary';
    case PartnershipStatus.CANCELLED:
    case PartnershipStatus.DECLINED:
      return 'destructive';
    default:
      return 'outline';
  }
};

/**
 * Main component for displaying and filtering a list of creator partnerships
 * @param {object} props - props (containing limit and className)
 * @returns {JSX.Element} The rendered partnerships list component
 */
const PartnershipsList: React.FC<{ limit?: number; className?: string }> = ({ limit = 10, className }) => {
  // LD1: Initialize router for navigation
  const router = useRouter();

  // LD1: Access partnership data and functions with usePartnerships hook
  const {
    partnerships,
    totalCount,
    currentPage,
    pageSize,
    hasMorePages,
    isLoading,
    error,
    getPartnerships,
  } = usePartnerships();

  // LD1: Set up state for status filter, search query, and pagination
  const [statusFilter, setStatusFilter] = useState<PartnershipStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPageState, setCurrentPageState] = useState(1);

  // LD1: Define column configuration for the data table with appropriate formatters
  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        sortable: true,
      },
      {
        key: 'brandName',
        header: 'Brand',
        sortable: true,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row: any) => (
          <Badge variant={getStatusBadgeVariant(row.status)}>
            {formatPartnershipStatus(row.status)}
          </Badge>
        ),
      },
      {
        key: 'totalBudget',
        header: 'Budget',
        cell: (row: any) => formatCurrency(row.totalBudget),
      },
      {
        key: 'startDate',
        header: 'Start Date',
        cell: (row: any) => formatDate(row.startDate),
      },
      {
        key: 'endDate',
        header: 'End Date',
        cell: (row: any) => formatDate(row.endDate),
      },
      {
        key: 'actions',
        header: '',
        cell: (row: any) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.id)}
            aria-label={`View details for partnership ${row.title}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  );

  // LD1: Create status filter options using the PartnershipStatus enum
  const statusOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Statuses' },
      ...Object.values(PartnershipStatus).map((status) => ({
        value: status,
        label: formatPartnershipStatus(status),
      })),
    ];
  }, []);

  // LD1: Set up effect to fetch partnerships when component mounts or filters change
  useEffect(() => {
    const fetchData = async () => {
      await getPartnerships({ status: statusFilter === 'ALL' ? undefined : statusFilter }, currentPageState, limit);
    };

    fetchData();
  }, [statusFilter, currentPageState, limit, getPartnerships]);

  // LD1: Define handler for viewing partnership details (navigates to details page)
  const handleViewDetails = (partnershipId: string) => {
    router.push(`/creator/partnerships/${partnershipId}`);
  };

  // LD1: Create function to filter partnerships based on selected status and search query
  const filteredPartnerships = useMemo(() => {
    let result = partnerships;

    if (statusFilter !== 'ALL') {
      result = result.filter((partnership) => partnership.status === statusFilter);
    }

    if (searchQuery) {
      result = result.filter((partnership) =>
        partnership.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [partnerships, statusFilter, searchQuery]);

  // LD1: Render the card container with header and content
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Partnerships</CardTitle>
        <CardDescription>Manage your brand collaborations.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* LD1: Render the filter controls (status dropdown and search) */}
        <div className="flex items-center justify-between pb-4">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PartnershipStatus | 'ALL')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="search"
            placeholder="Search partnerships..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* LD1: Render the DataTable component with columns, filtered data, and handlers */}
        <DataTable
          columns={columns}
          data={filteredPartnerships}
          pageSize={limit}
          pageSizeOptions={[5, 10, 20, 50]}
          onRowClick={(row) => handleViewDetails(row.id)}
          loading={isLoading}
          emptyMessage={error ? 'Failed to load partnerships.' : 'No partnerships found.'}
        />
      </CardContent>
    </Card>
  );
};

export default PartnershipsList;