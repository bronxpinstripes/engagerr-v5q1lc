import { format, formatDistance, formatDistanceToNow, formatRelative } from 'date-fns';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { 
  PLATFORMS, 
  PARTNERSHIP_STATUS, 
  CAMPAIGN_STATUS, 
  DELIVERABLE_STATUS,
  METRIC_TYPES
} from './constants';
import { MetricType } from '../types/analytics';

// =============================================================================
// Date Formatters
// =============================================================================

/**
 * Formats a date into a human-readable string
 * @param date The date to format
 * @param formatStr The format string (e.g., 'MMM d, yyyy')
 * @returns Formatted date string or empty string if date is invalid
 */
export const formatDate = (
  date: Date | string | number | undefined,
  formatStr: string = 'MMM d, yyyy'
): string => {
  if (!date) return '';
  
  try {
    // Convert string or number dates to Date objects if needed
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Formats a date range with consistent formatting
 * @param startDate Start date
 * @param endDate End date
 * @param formatStr Format for each date
 * @returns Formatted date range string
 */
export const formatDateRange = (
  startDate: Date | string | number,
  endDate: Date | string | number,
  formatStr: string = 'MMM d, yyyy'
): string => {
  const formattedStart = formatDate(startDate, formatStr);
  const formattedEnd = formatDate(endDate, formatStr);
  
  return `${formattedStart} - ${formattedEnd}`;
};

/**
 * Formats a date relative to current time (e.g., '2 hours ago')
 * @param date The date to format
 * @param options Formatting options
 * @returns Relative time string
 */
export const formatRelativeTime = (
  date: Date | string | number,
  options: { addSuffix?: boolean } = { addSuffix: true }
): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    return formatDistanceToNow(dateObj, options);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
};

/**
 * Formats the distance between two dates as a human-readable string
 * @param startDate Start date
 * @param endDate End date
 * @param options Formatting options
 * @returns Time distance string
 */
export const formatTimeDistance = (
  startDate: Date | string | number,
  endDate: Date | string | number,
  options: { includeSeconds?: boolean; addSuffix?: boolean } = {}
): string => {
  if (!startDate || !endDate) return '';
  
  try {
    const startDateObj = typeof startDate === 'string' || typeof startDate === 'number' 
      ? new Date(startDate) 
      : startDate;
    
    const endDateObj = typeof endDate === 'string' || typeof endDate === 'number' 
      ? new Date(endDate) 
      : endDate;
    
    return formatDistance(startDateObj, endDateObj, options);
  } catch (error) {
    console.error('Error formatting time distance:', error);
    return '';
  }
};

// =============================================================================
// Number Formatters
// =============================================================================

/**
 * Formats a number with thousand separators and specified decimal places
 * @param value Number to format
 * @param decimalPlaces Number of decimal places
 * @returns Formatted number string or dash if undefined
 */
export const formatNumber = (
  value: number | undefined,
  decimalPlaces: number = 0
): string => {
  if (value === undefined || value === null) return '-';
  
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimalPlaces,
    minimumFractionDigits: decimalPlaces
  }).format(value);
};

/**
 * Formats large numbers in a compact form (e.g., 1.2K, 3.5M)
 * @param value Number to format
 * @param decimalPlaces Number of decimal places
 * @returns Compact number representation or dash if undefined
 */
export const formatCompactNumber = (
  value: number | undefined,
  decimalPlaces: number = 1
): string => {
  if (value === undefined || value === null) return '-';
  
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: decimalPlaces
  }).format(value);
};

/**
 * Formats a number as currency with appropriate symbol
 * @param value Number to format
 * @param currencyCode Currency code (e.g., 'USD')
 * @param decimalPlaces Number of decimal places
 * @returns Formatted currency string or dash if undefined
 */
export const formatCurrency = (
  value: number | undefined,
  currencyCode: string = 'USD',
  decimalPlaces: number = 2
): string => {
  if (value === undefined || value === null) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: decimalPlaces,
    minimumFractionDigits: decimalPlaces
  }).format(value);
};

/**
 * Formats a decimal number as a percentage
 * @param value Number to format (0.05 becomes 5%)
 * @param decimalPlaces Number of decimal places
 * @returns Formatted percentage string or dash if undefined
 */
export const formatPercentage = (
  value: number | undefined,
  decimalPlaces: number = 1
): string => {
  if (value === undefined || value === null) return '-';
  
  // Check if value is already in percentage form (e.g., 5.2 vs 0.052)
  // and convert if needed
  let percentValue = value;
  if (value < 1 && value > -1 && value !== 0) {
    percentValue = value * 100;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: decimalPlaces,
    minimumFractionDigits: decimalPlaces
  }).format(percentValue / 100);
};

/**
 * Formats seconds into a readable duration (e.g., '5m 30s' or '1h 15m')
 * @param seconds Duration in seconds
 * @returns Formatted duration string or dash if undefined
 */
export const formatDuration = (seconds: number | undefined): string => {
  if (seconds === undefined || seconds === null) return '-';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  
  if (hrs > 0) {
    result += `${hrs}h `;
  }
  
  if (mins > 0 || hrs > 0) {
    result += `${mins}m `;
  }
  
  if (secs > 0 || (hrs === 0 && mins === 0)) {
    result += `${secs}s`;
  }
  
  return result.trim();
};

/**
 * Formats a file size in bytes to a human-readable format
 * @param bytes File size in bytes
 * @returns Formatted file size (e.g., '2.5 MB') or dash if undefined
 */
export const formatFileSize = (bytes: number | undefined): string => {
  if (bytes === undefined || bytes === null) return '-';
  
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// =============================================================================
// Metric Formatters
// =============================================================================

/**
 * Formats a metric value based on its type (views, currency, percentage, etc.)
 * @param value The metric value
 * @param metricType Type of metric determining how it should be formatted
 * @param options Additional formatting options
 * @returns Formatted metric value based on its type
 */
export const formatMetricValue = (
  value: number | undefined,
  metricType: string,
  options: {
    decimalPlaces?: number;
    currencyCode?: string;
  } = {}
): string => {
  if (value === undefined || value === null) return '-';
  
  const { decimalPlaces, currencyCode = 'USD' } = options;
  
  switch (metricType) {
    case MetricType.VIEWS:
    case MetricType.LIKES:
    case MetricType.ENGAGEMENTS:
    case MetricType.SHARES:
    case MetricType.COMMENTS:
      return formatCompactNumber(value, decimalPlaces);
      
    case MetricType.ENGAGEMENT_RATE:
      return formatPercentage(value, decimalPlaces ?? 2);
      
    case MetricType.WATCH_TIME:
      return formatDuration(value);
      
    case MetricType.CONTENT_VALUE:
      return formatCurrency(value, currencyCode, decimalPlaces ?? 2);
      
    default:
      return formatNumber(value, decimalPlaces);
  }
};

/**
 * Formats a trend percentage with appropriate direction indicator
 * @param percentage Change percentage value
 * @param higherIsBetter Whether a higher value is better (for color indication)
 * @returns Trend indicator with arrow and formatted percentage
 */
export const formatTrendIndicator = (
  percentage: number | undefined,
  higherIsBetter: boolean = true
): JSX.Element | string => {
  if (percentage === undefined || percentage === null) return '';
  
  const formattedPercentage = formatPercentage(Math.abs(percentage));
  const isPositive = percentage > 0;
  const isNeutral = percentage === 0;
  
  // Determine if the trend is good (green) or bad (red) based on direction and context
  const isGood = (isPositive && higherIsBetter) || (!isPositive && !higherIsBetter);
  
  if (isNeutral) {
    return (
      <span className="flex items-center text-gray-500">
        <Minus className="h-4 w-4 mr-1" />
        {formattedPercentage}
      </span>
    );
  }
  
  return (
    <span className={`flex items-center ${isGood ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? (
        <ArrowUp className="h-4 w-4 mr-1" />
      ) : (
        <ArrowDown className="h-4 w-4 mr-1" />
      )}
      {formattedPercentage}
    </span>
  );
};

// =============================================================================
// Platform and Status Formatters
// =============================================================================

/**
 * Formats a platform type into a user-friendly display name
 * @param platformType Platform type identifier
 * @returns Formatted platform name or empty string if undefined
 */
export const formatPlatformName = (platformType: string | undefined): string => {
  if (!platformType) return '';
  
  // Find the platform configuration by its ID
  const platform = Object.values(PLATFORMS).find(p => p.id === platformType);
  
  // Return the display name or fallback to the original value if not found
  return platform ? platform.name : platformType;
};

/**
 * Formats a partnership status code into a user-friendly string
 * @param status Partnership status code
 * @returns Human-readable status or empty string if undefined
 */
export const formatPartnershipStatus = (status: string | undefined): string => {
  if (!status) return '';
  
  // Match the status code to a readable text
  const statusKey = Object.keys(PARTNERSHIP_STATUS).find(
    key => PARTNERSHIP_STATUS[key as keyof typeof PARTNERSHIP_STATUS] === status
  );
  
  if (!statusKey) return status;
  
  // Convert from SNAKE_CASE to Title Case
  return statusKey.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Formats a campaign status code into a user-friendly string
 * @param status Campaign status code
 * @returns Human-readable status or empty string if undefined
 */
export const formatCampaignStatus = (status: string | undefined): string => {
  if (!status) return '';
  
  // Match the status code to a readable text
  const statusKey = Object.keys(CAMPAIGN_STATUS).find(
    key => CAMPAIGN_STATUS[key as keyof typeof CAMPAIGN_STATUS] === status
  );
  
  if (!statusKey) return status;
  
  // Convert from SNAKE_CASE to Title Case
  return statusKey.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Formats a deliverable status code into a user-friendly string
 * @param status Deliverable status code
 * @returns Human-readable status or empty string if undefined
 */
export const formatDeliverableStatus = (status: string | undefined): string => {
  if (!status) return '';
  
  // Match the status code to a readable text
  const statusKey = Object.keys(DELIVERABLE_STATUS).find(
    key => DELIVERABLE_STATUS[key as keyof typeof DELIVERABLE_STATUS] === status
  );
  
  if (!statusKey) return status;
  
  // Convert from SNAKE_CASE to Title Case and replace underscores with spaces
  return statusKey.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// =============================================================================
// Text Formatters
// =============================================================================

/**
 * Capitalizes the first letter of a string or each word in a string
 * @param text Text to capitalize
 * @param eachWord Whether to capitalize each word or just the first letter
 * @returns Capitalized text or empty string if undefined
 */
export const capitalizeText = (
  text: string | undefined,
  eachWord: boolean = false
): string => {
  if (!text) return '';
  
  if (eachWord) {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};