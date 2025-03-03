import React from 'react'; // version: ^18.0.0
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/Card'; // Container components for structured layout
import ProgressBar from '../ui/ProgressBar'; // Visual representation of budget utilization
import Badge from '../ui/Badge'; // Status indicator for budget health
import { cn } from '../../lib/utils'; // Utility for conditionally merging class names
import { formatCurrency } from '../../lib/formatters'; // Format budget amounts as currency
import { useCampaigns } from '../../hooks/useCampaigns'; // Access campaign data including budget information
import { Wallet } from 'lucide-react'; // Budget/finance icon for the component

/**
 * @description Props for the BudgetTracker component
 */
interface BudgetTrackerProps {
  campaignId: string;
  totalBudget: number;
  spentBudget: number;
  className?: string;
}

/**
 * @description Status information about budget health
 */
interface BudgetStatusInfo {
  variant: 'success' | 'warning' | 'destructive';
  label: 'Healthy' | 'Attention' | 'Critical';
}

/**
 * @description Component for visualizing campaign budget utilization
 */
const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  campaignId,
  totalBudget,
  spentBudget,
  className,
}) => {
  /**
   * @description Calculates the percentage of budget used
   */
  const budgetPercentage = (spentBudget / totalBudget) * 100;

  /**
   * @description Determines budget status information based on budget utilization percentage
   * @param percentage The percentage of budget used
   * @returns An object containing the appropriate status variant and label
   */
  const getBudgetStatusInfo = (percentage: number): BudgetStatusInfo => {
    if (percentage < 60) {
      return { variant: 'success', label: 'Healthy' };
    } else if (percentage < 85) {
      return { variant: 'warning', label: 'Attention' };
    } else {
      return { variant: 'destructive', label: 'Critical' };
    }
  };

  /**
   * @description Determines budget status information based on budget utilization percentage
   */
  const statusInfo = getBudgetStatusInfo(budgetPercentage);

  /**
   * @description Calculates the remaining budget
   * @returns The amount of budget remaining
   */
  const getRemainingBudget = (): number => {
    return Math.max(0, totalBudget - spentBudget);
  };

  const remainingBudget = getRemainingBudget();

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          <Wallet className="h-4 w-4" />
          Budget
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
        <div className="mb-2 text-sm text-muted-foreground">
          Spent: {formatCurrency(spentBudget)}
        </div>
        <ProgressBar value={budgetPercentage} variant={statusInfo.variant} />
      </CardContent>
      <CardFooter className="justify-between">
        <div className="text-sm text-muted-foreground">Remaining</div>
        <Badge variant={statusInfo.variant}>{formatCurrency(remainingBudget)}</Badge>
      </CardFooter>
    </Card>
  );
};

export default BudgetTracker;

/**
 * @description Props for the BudgetTracker component
 */
export type BudgetTrackerProps = {
  /**
   * @description ID of the campaign to display budget for
   */
  campaignId: string;
  /**
   * @description Total campaign budget amount
   */
  totalBudget: number;
  /**
   * @description Amount of budget already spent
   */
  spentBudget: number;
  /**
   * @description Optional additional CSS class names
   */
  className?: string;
};