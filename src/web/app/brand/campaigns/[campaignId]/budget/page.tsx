import React, { Suspense, useState } from 'react'; // version: ^18.0.0
import { useParams, notFound } from 'next/navigation'; // package_version: latest
import { ErrorBoundary } from 'react-error-boundary'; // package_version: ^4.0.0

import { DashboardLayout, PageHeader } from '../../../../../components/layout';
import { BudgetTracker } from '../../../../../components/brand/BudgetTracker';
import { ROICalculator } from '../../../../../components/brand/ROICalculator';
import { Card, CardContent } from '../../../../../components/ui/Card';
import { DataTable } from '../../../../../components/shared/DataTable';
import { BarChart } from '../../../../../components/shared/ChartComponents';
import { Alert, Button, DatePicker } from '../../../../../components/ui';
import { useSpecificCampaign } from '../../../../../hooks/useCampaigns';
import { useCampaignPartnerships } from '../../../../../hooks/usePartnerships';
import { formatCurrency, formatPercentage, formatDate } from '../../../../../lib/formatters';

/**
 * @description Component that renders the campaign budget page content with data fetched for the specific campaign
 */
const BudgetPageContent = () => {
  // Extract campaignId from URL parameters using useParams
  const { campaignId } = useParams();

  // Fetch campaign data using useSpecificCampaign(campaignId)
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useSpecificCampaign(campaignId as string);

  // Fetch partnership data using useCampaignPartnerships(campaignId)
  const { partnerships, isLoading: partnershipsLoading, error: partnershipsError } = useCampaignPartnerships({ campaignId: campaignId as string });

  // Handle loading and error states
  if (campaignLoading || partnershipsLoading) {
    return <div>Loading...</div>;
  }

  if (campaignError || partnershipsError) {
    return <div>Error: {campaignError?.message || partnershipsError?.message}</div>;
  }

  // Return 404 page if campaign is not found using notFound()
  if (!campaign) {
    notFound();
  }

  // Calculate budget metrics (total budget, spent amount, remaining amount)
  const totalBudget = campaign.totalBudget;
  const spentAmount = partnerships.reduce((sum, partnership) => sum + partnership.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
  const remainingAmount = totalBudget - spentAmount;

  // Calculate budget allocation across creators
  const budgetAllocationData = partnerships.map((partnership) => ({
    creator: partnership.creator.fullName,
    allocated: partnership.partnership.totalBudget,
    spent: partnership.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0),
  }));

  // Calculate actual vs planned spending for each partnership
  const actualVsPlannedSpending = budgetAllocationData.map((item) => ({
    creator: item.creator,
    allocated: item.allocated,
    spent: item.spent,
    percentage: (item.spent / item.allocated) * 100,
  }));

  // Prepare data for budget allocation chart
  const chartData = {
    series: [
      {
        id: 'allocated',
        name: 'Allocated',
        data: actualVsPlannedSpending.map((item) => ({ label: item.creator, value: item.allocated })),
      },
      {
        id: 'spent',
        name: 'Spent',
        data: actualVsPlannedSpending.map((item) => ({ label: item.creator, value: item.spent })),
      },
    ],
  };

  // Initialize date range state for transaction filtering
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: null,
    to: null,
  });

  // Render budget overview cards with key metrics
  // Render budget tracker component showing progress against total budget
  // Render budget allocation chart showing distribution among creators
  // Render transaction history table with payment details and date filters
  // Render ROI calculator component with campaign metrics
  // Provide export functionality for budget reports

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <BudgetTracker campaignId={campaignId as string} totalBudget={totalBudget} spentBudget={spentAmount} />
      </div>
      <Card>
        <CardContent>
          <BarChart data={chartData} />
        </CardContent>
      </Card>
      <ROICalculator campaignId={campaignId as string} />
    </div>
  );
};

/**
 * @description Main page component that provides layout and error boundaries
 */
const BudgetPage: React.FC = () => {
  // Set up DashboardLayout as the main container
  // Add PageHeader with title and export actions
  // Wrap content in ErrorBoundary for error handling
  // Wrap content in Suspense boundary for loading states
  // Render BudgetPageContent component

  return (
    <DashboardLayout>
      <PageHeader title="Campaign Budget" description="Track and manage your campaign budget effectively." />
      <ErrorBoundary fallback={<div>Something went wrong!</div>}>
        <Suspense fallback={<div>Loading budget data...</div>}>
          <BudgetPageContent />
        </Suspense>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default BudgetPage;