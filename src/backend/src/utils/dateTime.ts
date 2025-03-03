import {
  format, 
  parse, 
  parseISO, 
  formatISO, 
  addDays, 
  addWeeks, 
  addMonths, 
  subDays, 
  subWeeks, 
  subMonths, 
  differenceInDays, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isValid, 
  compareAsc 
} from 'date-fns'; // v2.30.0

/**
 * Standard date format patterns used throughout the application
 */
export const DATE_FORMATS = {
  API: 'yyyy-MM-dd',
  DISPLAY: 'MMM d, yyyy',
  DATETIME_DISPLAY: 'MMM d, yyyy h:mm a',
  ISO_WITH_TZ: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  DATABASE: 'yyyy-MM-dd HH:mm:ss',
  TIME: 'h:mm a'
};

/**
 * Formats a date according to the specified format string or predefined format
 * 
 * @param date - The date to format
 * @param formatString - The format string or predefined format key
 * @returns Formatted date string
 */
export function formatDate(date: Date, formatString: string = DATE_FORMATS.DISPLAY): string {
  if (!isValid(date)) {
    return '';
  }

  // Check if formatString is a key in DATE_FORMATS
  const formatPattern = DATE_FORMATS[formatString as keyof typeof DATE_FORMATS] || formatString;
  
  return format(date, formatPattern);
}

/**
 * Parses a date string into a Date object using the specified format
 * 
 * @param dateString - The string to parse
 * @param formatString - The format string or predefined format key
 * @returns Parsed Date object
 */
export function parseDate(dateString: string, formatString: string = DATE_FORMATS.API): Date {
  // Check if formatString is a key in DATE_FORMATS
  const formatPattern = DATE_FORMATS[formatString as keyof typeof DATE_FORMATS] || formatString;
  
  return parse(dateString, formatPattern, new Date());
}

/**
 * Converts a Date object to an ISO string with timezone information
 * 
 * @param date - The date to convert
 * @returns ISO formatted date string
 */
export function toISOString(date: Date): string {
  if (!isValid(date)) {
    return '';
  }
  
  return formatISO(date);
}

/**
 * Parses an ISO format date string into a Date object
 * 
 * @param isoString - The ISO string to parse
 * @returns Parsed Date object
 */
export function fromISOString(isoString: string): Date {
  return parseISO(isoString);
}

/**
 * Returns the start and end dates for a specified period type relative to a reference date
 * 
 * @param period - Type of period (day, week, month, quarter, year, last7days, etc.)
 * @param referenceDate - The reference date to calculate from (defaults to current date)
 * @returns Object containing startDate and endDate
 */
export function getDateRangeForPeriod(
  period: string, 
  referenceDate: Date = new Date()
): { startDate: Date; endDate: Date } {
  const date = isValid(referenceDate) ? referenceDate : new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period.toLowerCase()) {
    case 'day':
      startDate = startOfDay(date);
      endDate = endOfDay(date);
      break;
    
    case 'week':
      startDate = startOfWeek(date);
      endDate = endOfWeek(date);
      break;
    
    case 'month':
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
      break;
    
    case 'quarter': {
      const currentMonth = date.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      startDate = startOfMonth(new Date(date.getFullYear(), quarterStartMonth, 1));
      endDate = endOfMonth(new Date(date.getFullYear(), quarterStartMonth + 2, 1));
      break;
    }
    
    case 'year': {
      startDate = new Date(date.getFullYear(), 0, 1);
      endDate = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    }
    
    case 'last7days':
      startDate = startOfDay(subDays(date, 6));
      endDate = endOfDay(date);
      break;
    
    case 'last30days':
      startDate = startOfDay(subDays(date, 29));
      endDate = endOfDay(date);
      break;
    
    case 'last90days':
      startDate = startOfDay(subDays(date, 89));
      endDate = endOfDay(date);
      break;
    
    default:
      // Default to current day if period is not recognized
      startDate = startOfDay(date);
      endDate = endOfDay(date);
  }

  return { startDate, endDate };
}

/**
 * Returns the date range for the period immediately before the provided period
 * 
 * @param startDate - Start date of the current period
 * @param endDate - End date of the current period
 * @returns Object containing startDate and endDate for the previous period
 */
export function getPreviousPeriodRange(
  startDate: Date, 
  endDate: Date
): { startDate: Date; endDate: Date } {
  if (!isValid(startDate) || !isValid(endDate)) {
    throw new Error('Invalid date range provided');
  }

  // Calculate the duration of the current period
  const durationInDays = Math.abs(differenceInDays(endDate, startDate)) + 1;
  
  // Calculate the previous period by shifting back by the duration
  const previousEndDate = subDays(startDate, 1);
  const previousStartDate = subDays(previousEndDate, durationInDays - 1);
  
  return { 
    startDate: previousStartDate, 
    endDate: previousEndDate 
  };
}

/**
 * Formats a date as a human-readable relative time (e.g., '2 hours ago')
 * 
 * @param date - The date to format
 * @returns Human-readable relative time string
 */
export function formatTimeAgo(date: Date): string {
  if (!isValid(date)) {
    return '';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * Checks if a date falls within a specified date range (inclusive)
 * 
 * @param date - The date to check
 * @param startDate - The start of the date range
 * @param endDate - The end of the date range
 * @returns True if date is within range, false otherwise
 */
export function isDateBetween(date: Date, startDate: Date, endDate: Date): boolean {
  if (!isValid(date) || !isValid(startDate) || !isValid(endDate)) {
    return false;
  }
  
  return compareAsc(date, startDate) >= 0 && compareAsc(date, endDate) <= 0;
}

/**
 * Calculates the number of days between two dates
 * 
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Number of days between dates
 */
export function getDaysBetween(startDate: Date, endDate: Date): number {
  if (!isValid(startDate) || !isValid(endDate)) {
    return 0;
  }
  
  return Math.abs(differenceInDays(endDate, startDate));
}

/**
 * Generates an array of dates between start and end dates with specified interval
 * 
 * @param startDate - The start date
 * @param endDate - The end date
 * @param interval - The interval between dates ('day', 'week', 'month')
 * @returns Array of dates at specified intervals
 */
export function generateDateArray(
  startDate: Date, 
  endDate: Date, 
  interval: 'day' | 'week' | 'month' = 'day'
): Date[] {
  if (!isValid(startDate) || !isValid(endDate) || compareAsc(startDate, endDate) > 0) {
    return [];
  }

  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  
  while (compareAsc(currentDate, endDate) <= 0) {
    dates.push(new Date(currentDate));
    
    switch (interval) {
      case 'day':
        currentDate = addDays(currentDate, 1);
        break;
      case 'week':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'month':
        currentDate = addMonths(currentDate, 1);
        break;
    }
  }
  
  return dates;
}

/**
 * Formats a date for database storage in the standard database format
 * 
 * @param date - The date to format
 * @returns Date formatted for database storage
 */
export function formatDateForDatabase(date: Date): string {
  if (!isValid(date)) {
    return '';
  }
  
  return format(date, DATE_FORMATS.DATABASE);
}

/**
 * Returns the current date and time
 * 
 * @returns Current date and time
 */
export function getCurrentDateTime(): Date {
  return new Date();
}

// Re-export useful date-fns functions
export {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  parseISO,
  formatISO,
  isValid,
  compareAsc,
};