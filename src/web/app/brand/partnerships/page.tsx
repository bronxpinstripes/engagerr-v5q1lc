import React, { useState, useEffect, useCallback } from 'react'; // React v18.0+
import Link from 'next/link'; // Next.js v14.0.0
import { useRouter, useSearchParams } from 'next/navigation'; // Next.js v14.0.0
import { formatDistance, format } from 'date-fns'; // date-fns v2.30.0
import { Plus, Filter, Download } from 'lucide-react'; // lucide-react v0.279.0

import PageHeader from '../../../components/layout/PageHeader';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Button from '../../../components/ui/Button';
import DataTable from '../../../components/shared/DataTable';
import FilterSystem from '../../../components/shared/FilterSystem';
import { usePartnerships } from '../../../hooks/usePartnerships';
import { useBrand } from '../../../hooks/useBrand';
import { useAuth } from '../../../hooks/useAuth';
import { PartnershipStatus } from '../../../types/partnership';

/**
 * Mapping of partnership status values to human-readable labels
 */
const PARTNERSHIP_STATUS_LABELS: { [key in PartnershipStatus]: string } = {
  PROPOSED: 'Proposed',
  NEGOTIATING: 'Negotiating',
  ACCEPTED: 'Accepted',
  CONTRACT_PENDING: 'Contract Pending',
  CONTRACT_SIGNED: 'Contract Signed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DECLINED: 'Declined',
};

/**
 * Mapping of partnership status values to UI color classes
 */
const PARTNERSHIP_STATUS_COLORS: { [key in PartnershipStatus]: string } = {
  PROPOSED: 'bg-blue-100 text-blue-800',
  NEGOTIATING: 'bg-purple-100 text-purple-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  CONTRACT_PENDING: 'bg-yellow-100 text-yellow-800',
  CONTRACT_SIGNED: 'bg-indigo-100 text-indigo-800',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  DECLINED: 'bg-gray-100 text-gray-800',
};

/**
 * Filter options for the partnership list
 */
const FILTER_OPTIONS = [
  {
    id: 'status',
    label: 'Status',
    type: 'checkbox',
    isMulti: true,
    options: Object.values(PartnershipStatus).map(status => ({
      value: status,
      label: PARTNERSHIP_STATUS_LABELS[status],
    })),
  },
  {
    id: 'dateRange',
    label: 'Date Range',
    type: 'dateRange',
    placeholder: 'Select date range',
  },
  {
    id: 'budgetRange',
    label: 'Budget Range',
    type: 'range',
    min: 0,
    max: 10000,
    step: 100,
  },
  {
    id: 'search',
    label: 'Search',
    type: 'text',
    placeholder: 'Search by creator or title',
  },
];

/**
 * Column definitions for the partnerships data table
 */
const TABLE_COLUMNS = [
  {
    key: 'creator',
    header: 'Creator',
    sortable: true,
    cell: (row) => (
      <div className="flex items-center gap-2">
        <img
          src={row.creator?.profileImage || '/images/placeholder.png'}
          className="w-8 h-8 rounded-full"
        />
        <span>{row.creator?.name}</span>
      </div>
    ),
  },
  {
    key: 'title',
    header: 'Partnership',
    sortable: true,
    cell: (row) => row.title,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    cell: (row) => (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          PARTNERSHIP_STATUS_COLORS[row.status]
        }`}
      >
        {PARTNERSHIP_STATUS_LABELS[row.status]}
      </span>
    ),
  },
  {
    key: 'totalBudget',
    header: 'Budget',
    sortable: true,
    cell: (row) => `$${row.totalBudget.toLocaleString()}`,
  },
  {
    key: 'startDate',
    header: 'Start Date',
    sortable: true,
    cell: (row) => format(new Date(row.startDate), 'MMM d, yyyy'),
  },
  {
    key: 'endDate',
    header: 'End Date',
    sortable: true,
    cell: (row) => format(new Date(row.endDate), 'MMM d, yyyy'),
  },
  {
    key: 'lastUpdatedAt',
    header: 'Last Update',
    sortable: true,
    cell: (row) =>
      formatDistance(new Date(row.lastUpdatedAt), new Date(), {
        addSuffix: true,
      }),
  },
];

/**
 * Main component function that renders the partnerships page for brand users
 * @returns Rendered partnerships page component
 */
const PartnershipsPage: React.FC = () => {
  // Initialize router and searchParams hooks for navigation and URL query parameters
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state for filters, currentPage, and pageSize
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Call useAuth hook to verify authentication state
  const { isAuthenticated } = useAuth();

  // Call useBrand hook to get brand-specific data and verify brand user type
  const { brand, isBrandUser } = useBrand();

  // Call usePartnerships hook to fetch partnership data based on filters
  const {
    partnerships,
    isLoading,
    getPartnerships,
    totalCount,
  } = usePartnerships();

  // Define partners table columns for the DataTable component
  const partnersTableColumns = TABLE_COLUMNS;

  // Define filter options for the FilterSystem component
  const filterOptions = FILTER_OPTIONS;

  /**
   * Create handleFilterChange function to update filters when user changes filters
   * @param newFilters - The new filter values
   */
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  /**
   * Create handleRowClick function to navigate to partnership details page
   * @param row - The row data
   */
  const handleRowClick = (row) => {
    router.push(`/brand/partnerships/${row.id}`);
  };

  /**
   * Create handleCreatePartnership function to navigate to new partnership page
   */
  const handleCreatePartnership = () => {
    router.push('/brand/partnerships/new');
  };

  /**
   * Create handleExportData function to export partnerships data
   */
  const handleExportData = () => {
    // Implement export functionality here
    console.log('Exporting partnership data...');
  };

  /**
   * Create handlePageChange function to update current page
   * @param page - The new page number
   */
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  /**
   * Use useEffect to fetch partnerships data when filters or pagination changes
   */
  useEffect(() => {
    // Fetch partnerships data with filters and pagination
    getPartnerships(filters, currentPage, pageSize);
  }, [filters, currentPage, pageSize, getPartnerships]);

  // Render page with DashboardLayout as wrapper
  return (
    <DashboardLayout>
      {/* Render PageHeader with title and action buttons */}
      <PageHeader
        title="Partnerships"
        description="Manage and track your collaborations with creators."
        actions={
          <>
            <Button variant="secondary" onClick={handleExportData}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={handleCreatePartnership}>
              <Plus className="mr-2 h-4 w-4" />
              New Partnership
            </Button>
          </>
        }
      />

      {/* Render FilterSystem for filtering partnerships */}
      <FilterSystem filters={filterOptions} onChange={setFilters} />

      {/* Render DataTable to display partnerships with pagination */}
      <DataTable
        columns={partnersTableColumns}
        data={partnerships}
        loading={isLoading}
        totalItems={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onRowClick={handleRowClick}
      />
    </DashboardLayout>
  );
};

export default PartnershipsPage;