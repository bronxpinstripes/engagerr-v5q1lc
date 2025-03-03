// Revenue Analytics Page
'use client';

import React, { Suspense } from 'react'; // React v18.0+
import { Download, RefreshCcw, DollarSign } from 'lucide-react'; // v0.279.0
import {
  PageHeader,
  Button,
} from '../../../../components/ui';
import RevenueAnalytics from '../../../../components/creator/RevenueAnalytics';
import { useAnalytics } from '../../../../hooks/useAnalytics';

/**
 * Component that renders the page header with actions for the revenue analytics page
 * @returns The rendered page header with export and refresh buttons
 */
const RevenuePageHeader = () => {
  // Get analytics functions from useAnalytics hook
  const { exportAnalytics, refreshAnalytics } = useAnalytics();

  // Render PageHeader component with title 'Revenue Analytics'
  return (
    <PageHeader
      title="Revenue Analytics"
      description="Comprehensive revenue metrics, trends, and insights across platforms."
      actions={
        <>
          {/* Include action buttons for exporting data and refreshing */}
          <Button
            variant="outline"
            onClick={() => exportAnalytics('csv')}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button
            variant="secondary"
            onClick={refreshAnalytics}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </>
      }
    />
  );
};

/**
 * Main revenue analytics page component
 * @param object searchParams
 * @returns Rendered revenue analytics page
 */
const RevenueAnalyticsPage = ({ searchParams }) => {
  // Extract query parameters for date range if provided
  const startDate = searchParams?.startDate;
  const endDate = searchParams?.endDate;

  // Render the RevenuePageHeader component
  return (
    <div>
      <RevenuePageHeader />

      {/* Wrap main content in Suspense for handling loading states */}
      <Suspense fallback={<div>Loading revenue analytics...</div>}>
        {/* Render RevenueAnalytics component as the main content */}
        {/* Pass any search parameters to the RevenueAnalytics component */}
        <RevenueAnalytics />
      </Suspense>
    </div>
  );
};

export default RevenueAnalyticsPage;