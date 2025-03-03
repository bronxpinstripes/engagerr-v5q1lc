import React from 'react';
import { ArrowUp, ArrowDown, ArrowRight, HelpCircle } from 'lucide-react'; // v0.279.0
import { Card, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/Tooltip';
import { formatNumber, formatCurrency, formatPercentage } from '../../lib/formatters';
import { cn } from '../../lib/utils';

// Define types for the component
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface MetricsCardFormatOptions {
  isCurrency?: boolean;
  isPercentage?: boolean;
  decimalPlaces?: number;
}

export interface MetricsCardProps {
  title: string;
  value: number;
  trend?: number;
  trendDirection?: TrendDirection;
  isCurrency?: boolean;
  isPercentage?: boolean;
  decimalPlaces?: number;
  tooltip?: string;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
}

// Helper function to get the appropriate trend icon
const getTrendIcon = (direction: TrendDirection) => {
  switch (direction) {
    case 'up':
      return <ArrowUp className="h-3.5 w-3.5" />;
    case 'down':
      return <ArrowDown className="h-3.5 w-3.5" />;
    case 'neutral':
    default:
      return <ArrowRight className="h-3.5 w-3.5" />;
  }
};

// Helper function to get the appropriate badge variant
const getTrendBadgeVariant = (direction: TrendDirection): string => {
  switch (direction) {
    case 'up':
      return 'success';
    case 'down':
      return 'destructive';
    case 'neutral':
    default:
      return 'outline';
  }
};

// Helper function to format the value based on the options
const formatValue = (value: number, options: MetricsCardFormatOptions): string => {
  const { isCurrency, isPercentage, decimalPlaces = 0 } = options;
  if (isCurrency) {
    return formatCurrency(value, 'USD', decimalPlaces);
  }
  if (isPercentage) {
    return formatPercentage(value, decimalPlaces);
  }
  return formatNumber(value, decimalPlaces);
};

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  trend,
  trendDirection = 'neutral',
  isCurrency = false,
  isPercentage = false,
  decimalPlaces = 0,
  tooltip,
  isLoading = false,
  className,
  valueClassName,
}) => {
  const formattedValue = formatValue(value, { isCurrency, isPercentage, decimalPlaces });
  const trendIcon = getTrendIcon(trendDirection);
  const badgeVariant = getTrendBadgeVariant(trendDirection);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            {title}
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      className="ml-1 inline-flex items-center"
                      aria-label="Show more information"
                    >
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className={cn("text-2xl font-bold leading-none", valueClassName)}>
              {formattedValue}
            </div>
            {trend !== undefined && (
              <Badge 
                variant={badgeVariant} 
                className="ml-1 flex items-center gap-0.5 text-xs"
              >
                {trendIcon}
                <span>{formatPercentage(Math.abs(trend))}</span>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricsCard;