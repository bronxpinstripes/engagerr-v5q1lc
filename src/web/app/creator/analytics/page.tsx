'use client';

import React, { Suspense } from 'react'; // react v18.0+
import { Download, RefreshCcw } from 'lucide-react'; // lucide-react v0.279.0
import PageHeader from '../../../components/layout/PageHeader';
import AnalyticsOverview from '../../../components/creator/AnalyticsOverview';
import { Button } from '../../../components/ui/Button';
import { useAnalytics } from '../../../hooks/useAnalytics';

/**
 * Component that renders the page header with actions for the analytics page
 * @returns {JSX.Element} The rendered page header with export and refresh buttons
 */
const AnalyticsPageHeader = (): JSX.Element => {
  // Get analytics functions from useAnalytics hook
  const { exportAnalytics, refreshAnalytics, isLoading } = useAnalytics();

  return (
    <PageHeader
      title="Analytics Dashboard"
      description="Unified cross-platform analytics to understand your content performance holistically."
      actions={
        <>
          <Button variant="outline" disabled={isLoading} onClick={() => exportAnalytics('csv')}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export Data
          </Button>
          <Button variant="primary" disabled={isLoading} onClick={refreshAnalytics}>
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </>
      }
    />
  );
};

/**
 * The main analytics page component that serves as the entry point for the creator analytics section
 * @returns {JSX.Element} The rendered analytics page with header and dashboard
 */
const AnalyticsPage: React.FC = () => {
  return (
    <div>
      <AnalyticsPageHeader />
      <Suspense fallback={<p>Loading analytics dashboard...</p>}>
        <AnalyticsOverview defaultTab="overview" />
      </Suspense>
    </div>
  );
};

export default AnalyticsPage;