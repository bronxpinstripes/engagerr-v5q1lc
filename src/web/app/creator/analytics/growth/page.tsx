'use client';

import React, { Suspense } from 'react'; // react ^18.0.0
import { Download, TrendingUp } from 'lucide-react'; // lucide-react ^0.279.0

import PageHeader from '../../../../components/layout/PageHeader';
import GrowthTrends from '../../../../components/creator/GrowthTrends';
import Button from '../../../../components/ui/Button';
import { useAnalytics } from '../../../../hooks/useAnalytics';

/**
 * Component that renders the page header with actions for the growth analytics page
 * @returns The rendered page header with export and refresh buttons
 */
const GrowthPageHeader = (): JSX.Element => {
  // Get analytics functions from useAnalytics hook
  const { exportAnalytics, refreshAnalytics } = useAnalytics();

  return (
    <PageHeader
      title="Growth Analytics"
      description="Track your performance improvements over time and identify key growth drivers."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={refreshAnalytics}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportAnalytics('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </>
      }
    />
  );
};

/**
 * The main growth analytics page component that visualizes creator performance growth over time
 * @returns The rendered growth analytics page with header and visualizations
 */
const GrowthPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <GrowthPageHeader />
      <Suspense fallback={<p>Loading growth trends...</p>}>
        <GrowthTrends className="col-span-2" />
      </Suspense>
    </div>
  );
};

export default GrowthPage;