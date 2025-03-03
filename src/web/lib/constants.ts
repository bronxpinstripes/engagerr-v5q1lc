/**
 * Engagerr Constants
 * 
 * This file serves as a centralized source of truth for various constants,
 * enumerations, and configuration values used throughout the Engagerr application.
 */

// Type definitions for constants

/**
 * Configuration for a social media platform
 */
export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  contentTypes: string[];
  metricMapping?: Record<string, string>;
  oauthUrl?: string;
}

/**
 * Configuration for a predefined timeframe
 */
export interface TimeframeConfig {
  id: string;
  name: string;
  days: number;
  display: string;
}

/**
 * Configuration for a metric type
 */
export interface MetricConfig {
  id: string;
  name: string;
  description: string;
  format: string;
  aggregation: string;
  icon?: string;
}

//=========================================================================
// Platform-related constants
//=========================================================================

/**
 * Configuration for supported social media platforms
 */
export const PLATFORMS = {
  YOUTUBE: {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    contentTypes: ['VIDEO', 'SHORT'],
    metricMapping: {
      views: 'views',
      engagements: 'likes',
      shares: 'shares',
      comments: 'commentCount',
      likes: 'likes',
      watchTime: 'estimatedMinutesWatched'
    }
  } as PlatformConfig,
  
  INSTAGRAM: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E1306C',
    contentTypes: ['POST', 'STORY', 'REEL'],
    metricMapping: {
      views: 'impressions',
      engagements: 'engagement',
      shares: 'saves',
      comments: 'comments',
      likes: 'likes'
    }
  } as PlatformConfig,
  
  TIKTOK: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    contentTypes: ['VIDEO'],
    metricMapping: {
      views: 'video_views',
      engagements: 'total_engagement',
      shares: 'shares',
      comments: 'comments',
      likes: 'likes'
    }
  } as PlatformConfig,
  
  TWITTER: {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    contentTypes: ['TWEET'],
    metricMapping: {
      views: 'impressions',
      engagements: 'engagements',
      shares: 'retweets',
      comments: 'replies',
      likes: 'likes'
    }
  } as PlatformConfig,
  
  LINKEDIN: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    contentTypes: ['POST', 'ARTICLE'],
    metricMapping: {
      views: 'impressions',
      engagements: 'engagement',
      shares: 'shares',
      comments: 'comments',
      likes: 'likes'
    }
  } as PlatformConfig,
  
  PODCAST: {
    id: 'podcast',
    name: 'Podcast',
    icon: 'podcast',
    color: '#8940FA',
    contentTypes: ['PODCAST_EPISODE'],
    metricMapping: {
      views: 'listens',
      engagements: 'engagement',
      shares: 'shares',
      comments: 'comments',
      likes: 'likes'
    }
  } as PlatformConfig
};

/**
 * Array of supported platform types for iteration and validation
 */
export const PLATFORM_TYPES = Object.keys(PLATFORMS).map(key => PLATFORMS[key as keyof typeof PLATFORMS].id);

/**
 * Content types supported across different platforms
 */
export const CONTENT_TYPES = {
  VIDEO: 'video',
  POST: 'post',
  STORY: 'story',
  REEL: 'reel',
  SHORT: 'short',
  TWEET: 'tweet',
  ARTICLE: 'article',
  PODCAST_EPISODE: 'podcast_episode'
};

/**
 * Types of relationships between content items in the content mapping
 */
export const RELATIONSHIP_TYPES = {
  PARENT: 'parent',
  CHILD: 'child',
  DERIVATIVE: 'derivative',
  REPURPOSED: 'repurposed',
  REFERENCE: 'reference'
};

/**
 * Status values for platform authentication connections
 */
export const PLATFORM_AUTH_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  EXPIRED: 'expired',
  ERROR: 'error',
  PENDING: 'pending'
};

//=========================================================================
// User-related constants
//=========================================================================

/**
 * Types of users in the system
 */
export const USER_TYPES = {
  CREATOR: 'creator',
  BRAND: 'brand',
  ADMIN: 'admin'
};

/**
 * Specific roles for users within the system
 */
export const USER_ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  CREATOR_OWNER: 'creator_owner',
  CREATOR_MANAGER: 'creator_manager',
  CREATOR_ANALYST: 'creator_analyst',
  BRAND_OWNER: 'brand_owner',
  BRAND_MANAGER: 'brand_manager',
  BRAND_VIEWER: 'brand_viewer'
};

/**
 * Permission types that can be assigned to user roles
 */
export const PERMISSIONS = {
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_CONTENT: 'manage_content',
  MANAGE_PARTNERSHIPS: 'manage_partnerships',
  MANAGE_PLATFORMS: 'manage_platforms',
  MANAGE_TEAM: 'manage_team',
  MANAGE_BILLING: 'manage_billing',
  VIEW_CAMPAIGNS: 'view_campaigns',
  MANAGE_CAMPAIGNS: 'manage_campaigns',
  APPROVE_CONTRACTS: 'approve_contracts'
};

/**
 * Supported authentication providers
 */
export const AUTH_PROVIDERS = {
  EMAIL: 'email',
  GOOGLE: 'google',
  APPLE: 'apple'
};

//=========================================================================
// Subscription-related constants
//=========================================================================

/**
 * Available subscription tiers for creators and brands
 */
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

/**
 * Possible states for a user's subscription
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIAL: 'trial',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  EXPIRED: 'expired'
};

//=========================================================================
// Analytics-related constants
//=========================================================================

/**
 * Predefined timeframe options for analytics
 */
export const TIMEFRAMES = {
  DAY: {
    id: 'day',
    name: 'Day',
    days: 1,
    display: '24 hours'
  } as TimeframeConfig,
  
  WEEK: {
    id: 'week',
    name: 'Week',
    days: 7,
    display: '7 days'
  } as TimeframeConfig,
  
  MONTH: {
    id: 'month',
    name: 'Month',
    days: 30,
    display: '30 days'
  } as TimeframeConfig,
  
  QUARTER: {
    id: 'quarter',
    name: 'Quarter',
    days: 90,
    display: '90 days'
  } as TimeframeConfig,
  
  YEAR: {
    id: 'year',
    name: 'Year',
    days: 365,
    display: '365 days'
  } as TimeframeConfig,
  
  CUSTOM: {
    id: 'custom',
    name: 'Custom',
    days: 0,
    display: 'Custom range'
  } as TimeframeConfig
};

/**
 * Metric types tracked across different platforms
 */
export const METRIC_TYPES = {
  VIEWS: {
    id: 'views',
    name: 'Views',
    description: 'Number of content views/impressions',
    format: 'number',
    aggregation: 'sum',
    icon: 'eye'
  } as MetricConfig,
  
  ENGAGEMENTS: {
    id: 'engagements',
    name: 'Engagements',
    description: 'Total engagement actions (likes, comments, shares)',
    format: 'number',
    aggregation: 'sum',
    icon: 'activity'
  } as MetricConfig,
  
  SHARES: {
    id: 'shares',
    name: 'Shares',
    description: 'Number of shares/retweets/reposts',
    format: 'number',
    aggregation: 'sum',
    icon: 'share'
  } as MetricConfig,
  
  COMMENTS: {
    id: 'comments',
    name: 'Comments',
    description: 'Number of comments/replies',
    format: 'number',
    aggregation: 'sum',
    icon: 'messageCircle'
  } as MetricConfig,
  
  LIKES: {
    id: 'likes',
    name: 'Likes',
    description: 'Number of likes/favorites',
    format: 'number',
    aggregation: 'sum',
    icon: 'heart'
  } as MetricConfig,
  
  WATCH_TIME: {
    id: 'watch_time',
    name: 'Watch Time',
    description: 'Total minutes watched for video content',
    format: 'duration',
    aggregation: 'sum',
    icon: 'clock'
  } as MetricConfig,
  
  CONTENT_VALUE: {
    id: 'content_value',
    name: 'Content Value',
    description: 'Estimated monetary value of content',
    format: 'currency',
    aggregation: 'sum',
    icon: 'dollarSign'
  } as MetricConfig,
  
  ENGAGEMENT_RATE: {
    id: 'engagement_rate',
    name: 'Engagement Rate',
    description: 'Percentage of audience who engaged with content',
    format: 'percentage',
    aggregation: 'average',
    icon: 'pieChart'
  } as MetricConfig
};

/**
 * Chart visualization types for analytics data
 */
export const CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  PIE: 'pie',
  AREA: 'area',
  SCATTER: 'scatter'
};

//=========================================================================
// Partnership-related constants
//=========================================================================

/**
 * Status values for brand-creator partnerships
 */
export const PARTNERSHIP_STATUS = {
  PROPOSED: 'proposed',
  NEGOTIATING: 'negotiating',
  ACCEPTED: 'accepted',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Status values for brand campaigns
 */
export const CAMPAIGN_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

/**
 * Status values for content deliverables in partnerships
 */
export const DELIVERABLE_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  REVISION_REQUESTED: 'revision_requested',
  COMPLETED: 'completed'
};

//=========================================================================
// UI and system constants
//=========================================================================

/**
 * API endpoint routes used throughout the application
 */
export const API_ROUTES = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  CREATORS: '/api/creators',
  BRANDS: '/api/brands',
  CONTENT: '/api/content',
  PLATFORMS: '/api/platforms',
  ANALYTICS: '/api/analytics',
  DISCOVERY: '/api/discovery',
  PARTNERSHIPS: '/api/partnerships',
  PAYMENTS: '/api/payments',
  SUBSCRIPTIONS: '/api/subscriptions',
  AI: '/api/ai',
  WEBHOOKS: '/api/webhooks'
};

/**
 * Core color palette for the application theme
 */
export const COLORS = {
  PRIMARY: '#2563EB', // Deep Blue
  SECONDARY: '#0D9488', // Teal
  ACCENT: '#8B5CF6', // Purple
  BACKGROUND: '#F9FAFB',
  TEXT: '#1F2937',
  ERROR: '#EF4444',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B'
};

/**
 * Responsive design breakpoints
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
};

/**
 * Common validation constants used for form validation
 */
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 10,
  EMAIL_REGEX: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  URL_REGEX: /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i
};

/**
 * Feature flags for enabling/disabling features, especially for different subscription tiers
 */
export const FEATURE_FLAGS = {
  ENABLE_AI_SUGGESTIONS: true,
  ENABLE_MEDIA_KIT: true,
  ENABLE_ADVANCED_ANALYTICS: true
};