import { BREAKPOINTS } from './constants';
import clsx from 'clsx'; // v1.2.1
import { twMerge } from 'tailwind-merge'; // v1.14.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

/**
 * Combines multiple class values using clsx and merges them with tailwind-merge
 * to handle Tailwind CSS class conflicts properly
 */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a unique identifier using UUID v4
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Checks if code is running on the client-side (browser) or server-side
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Creates a promise that resolves after a specified delay
 * Useful for controlled timing in async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncates text to a specified length and adds ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Regular expressions for different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=|youtube\.com\/watch\?.*&v=)([^#\&\?]*).*/,
    /youtube\.com\/shorts\/([^#\&\?]*).*/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extracts Instagram post ID from an Instagram post URL
 */
export function extractInstagramPostId(url: string): string | null {
  if (!url) return null;
  
  // Regular expression for Instagram post URLs
  const pattern = /instagram\.com\/p\/([^\/\?#]+).*$/;
  const match = url.match(pattern);
  
  return match && match[1] ? match[1] : null;
}

/**
 * Extracts TikTok video ID from a TikTok video URL
 */
export function extractTikTokVideoId(url: string): string | null {
  if (!url) return null;
  
  // Regular expression for TikTok video URLs
  const pattern = /tiktok\.com\/@[^\/]+\/video\/(\d+).*$/;
  const match = url.match(pattern);
  
  return match && match[1] ? match[1] : null;
}

/**
 * Formats a number in a compact form (K, M, B) for display in UI
 */
export function formatCompactNumber(num: number): string {
  if (num == null || isNaN(num)) return '0';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 1_000_000_000) {
    // Billions
    return sign + (absNum / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  } else if (absNum >= 1_000_000) {
    // Millions
    return sign + (absNum / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (absNum >= 1_000) {
    // Thousands
    return sign + (absNum / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    return sign + absNum.toString();
  }
}

/**
 * Gets the initials from a name (first letter of first and last name)
 */
export function getInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '';
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Clamps a number between a minimum and maximum value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generates a random integer between min (inclusive) and max (inclusive)
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Creates a deep clone of an object or array
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  
  // Handle Array objects
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }
  
  // Handle regular objects
  const clonedObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone((obj as any)[key]);
    }
  }
  
  return clonedObj;
}

/**
 * Detects device type based on screen width using predefined breakpoints
 */
export function detectDeviceType(): string {
  if (!isClient()) {
    return 'desktop'; // Default to desktop on server side
  }
  
  const width = window.innerWidth;
  
  if (width < BREAKPOINTS.SM) {
    return 'mobile';
  } else if (width < BREAKPOINTS.LG) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Groups an array of objects by a specific key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result: Record<string, T[]>, item: T) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, or empty object)
 */
export function isEmpty(value: any): boolean {
  if (value == null) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.length === 0;
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Converts an array of objects to an object using a specified key as the object property
 */
export function arrayToObject<T>(array: T[], key: keyof T): Record<string, T> {
  return array.reduce((result: Record<string, T>, item: T) => {
    const itemKey = String(item[key]);
    result[itemKey] = item;
    return result;
  }, {});
}

/**
 * Removes duplicate items from an array based on a key for objects or direct comparison for primitives
 */
export function removeDuplicates<T>(array: T[], key?: keyof T): T[] {
  if (!array.length) return [];
  
  if (key) {
    // For array of objects, use a key to identify duplicates
    const seen = new Map();
    return array.filter(item => {
      const itemKey = item[key];
      if (!seen.has(itemKey)) {
        seen.set(itemKey, true);
        return true;
      }
      return false;
    });
  } else {
    // For array of primitives
    return [...new Set(array)];
  }
}

/**
 * Determines whether to use white or black text on a background color for optimal contrast
 */
export function getContrastColor(hexColor: string): string {
  // Default to black if no color provided
  if (!hexColor) return '#000000';
  
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  
  // Calculate luminance (perceived brightness)
  // Formula: (0.299*R + 0.587*G + 0.114*B)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  
  // Use white text on dark backgrounds, black text on light backgrounds
  return luminance < 186 ? '#FFFFFF' : '#000000';
}