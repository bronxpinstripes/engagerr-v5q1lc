/**
 * Creator Types Definition
 * 
 * This module defines TypeScript interfaces, types, and enums for creator-related
 * data structures used throughout the Engagerr platform. It includes definitions for
 * creator profiles, content categories, audience demographics, and analytics metrics.
 */

import { UserTypes } from './user';
import { PlatformTypes } from './platform';

// Define all creator-related types within a namespace
export namespace CreatorTypes {
  /**
   * Content categories that creators can identify with
   */
  export enum Category {
    TECHNOLOGY = 'technology',
    GAMING = 'gaming',
    BEAUTY = 'beauty',
    FASHION = 'fashion',
    FITNESS = 'fitness',
    HEALTH = 'health',
    FOOD = 'food',
    TRAVEL = 'travel',
    LIFESTYLE = 'lifestyle',
    BUSINESS = 'business',
    EDUCATION = 'education',
    ENTERTAINMENT = 'entertainment',
    MUSIC = 'music',
    SPORTS = 'sports',
    ARTS = 'arts',
    PARENTING = 'parenting',
    OTHER = 'other'
  }

  /**
   * Core creator entity representing a content creator account in the system
   */
  export interface Creator {
    /** Unique identifier for the creator */
    id: string;
    
    /** Reference to the user account */
    userId: string;
    
    /** Associated user object */
    user: UserTypes.User;
    
    /** Creator's biography or description */
    bio: string;
    
    /** Content categories the creator identifies with */
    categories: Category[];
    
    /** URL to the creator's profile image */
    profileImage: string;
    
    /** Creator's verification status */
    verificationStatus: UserTypes.VerificationStatus;
    
    /** Creator's subscription tier */
    subscriptionTier: UserTypes.SubscriptionTier;
    
    /** Current status of the creator's subscription */
    subscriptionStatus: UserTypes.SubscriptionStatus;
    
    /** Creator-specific settings and preferences */
    settings: CreatorSettings;
    
    /** Connected social media platforms */
    platforms: PlatformTypes.Platform[];
    
    /** Creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
  }

  /**
   * Public-facing profile information for a creator that can be viewed by brands
   */
  export interface CreatorProfile {
    /** Reference to the creator */
    creatorId: string;
    
    /** Creator's full name */
    fullName: string;
    
    /** Creator's biography or description */
    bio: string;
    
    /** Content categories the creator identifies with */
    categories: Category[];
    
    /** URL to the creator's profile image */
    profileImage: string;
    
    /** URL to the creator's cover image */
    coverImage: string;
    
    /** Creator's verification status */
    verificationStatus: UserTypes.VerificationStatus;
    
    /** Summary of the creator's presence on each platform */
    platformSummary: PlatformSummary[];
    
    /** Total followers/subscribers across all platforms */
    totalFollowers: number;
    
    /** Average engagement rate across all platforms */
    engagementRate: number;
    
    /** Total number of content items */
    contentCount: number;
    
    /** Creator's location */
    location: string;
    
    /** Languages the creator speaks/creates content in */
    languages: string[];
    
    /** Contact email for business inquiries */
    contactEmail: string;
    
    /** Creator's website URL */
    website: string;
    
    /** Featured content showcased on the profile */
    featuredContent: FeaturedContent[];
    
    /** Summary of past brand partnerships */
    partnership: PartnershipSummary[];
    
    /** Whether the profile is publicly discoverable */
    isPublic: boolean;
  }

  /**
   * Creator-specific application settings and preferences
   */
  export interface CreatorSettings {
    /** Notification preferences */
    notificationPreferences: {
      email: boolean;
      push: boolean;
      inApp: boolean;
      partnerRequests: boolean;
      analytics: boolean;
      contentAlerts: boolean;
    };
    
    /** Privacy settings */
    privacySettings: {
      profileVisibility: 'public' | 'private' | 'limited';
      showFinancials: boolean;
      showPartnerships: boolean;
      allowDiscovery: boolean;
    };
    
    /** Display preferences */
    displayPreferences: {
      defaultDashboard: string;
      theme: 'light' | 'dark' | 'system';
      defaultAnalyticsPeriod: string;
    };
    
    /** Partnership preferences */
    partnershipPreferences: {
      availableForPartnerships: boolean;
      minimumBudget: number;
      preferredCategories: Category[];
      excludedCategories: Category[];
    };
    
    /** Dashboard layout configuration */
    dashboardLayout: {
      widgets: string[];
      widgetPositions: Record<string, { x: number; y: number; w: number; h: number }>;
    };
    
    /** Media kit generation settings */
    mediaKitSettings: {
      defaultTemplate: string;
      autoUpdateStats: boolean;
      includedSections: string[];
    };
  }

  /**
   * Summary of a creator's presence on a specific platform
   */
  export interface PlatformSummary {
    /** Platform type */
    platformType: PlatformTypes.PlatformType;
    
    /** Username/handle on the platform */
    handle: string;
    
    /** Profile URL on the platform */
    url: string;
    
    /** Number of followers/subscribers */
    followers: number;
    
    /** Average engagement rate */
    engagementRate: number;
    
    /** Total number of content items */
    contentCount: number;
    
    /** Whether the account is verified on the platform */
    verified: boolean;
  }

  /**
   * Featured content item for a creator's profile or media kit
   */
  export interface FeaturedContent {
    /** Reference to the content item */
    contentId: string;
    
    /** Content title */
    title: string;
    
    /** Content description */
    description: string;
    
    /** Platform where the content is published */
    platformType: PlatformTypes.PlatformType;
    
    /** URL to the content */
    url: string;
    
    /** URL to the content thumbnail */
    thumbnail: string;
    
    /** Summary of content performance metrics */
    metrics: ContentMetricsSummary;
  }

  /**
   * Summary of content performance metrics
   */
  export interface ContentMetricsSummary {
    /** Number of views/impressions */
    views: number;
    
    /** Total engagements (likes, comments, shares) */
    engagements: number;
    
    /** Engagement rate (engagements/views) */
    engagementRate: number;
    
    /** Number of shares/reposts */
    shares: number;
    
    /** Estimated monetary value */
    estimatedValue: number;
  }

  /**
   * Summary of a creator's partnership with a brand
   */
  export interface PartnershipSummary {
    /** Reference to the partnership */
    partnershipId: string;
    
    /** Reference to the brand */
    brandId: string;
    
    /** Brand name */
    brandName: string;
    
    /** URL to the brand's logo */
    brandLogo: string;
    
    /** Title of the campaign */
    campaignTitle: string;
    
    /** Date of the partnership */
    date: Date;
    
    /** Types of content created for the partnership */
    contentType: string[];
    
    /** Platforms where content was published */
    platformType: PlatformTypes.PlatformType[];
    
    /** Whether the partnership is publicly visible */
    isPublic: boolean;
  }

  /**
   * Audience demographic information for a creator across platforms
   */
  export interface AudienceDemographics {
    /** Reference to the creator */
    creatorId: string;
    
    /** Age distribution of the audience */
    ageRanges: {
      '13-17': number;
      '18-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55+': number;
    };
    
    /** Gender distribution of the audience */
    genderDistribution: {
      male: number;
      female: number;
      nonBinary: number;
      undisclosed: number;
    };
    
    /** Top geographic locations of the audience */
    topLocations: {
      [country: string]: number;
    };
    
    /** Interest categories of the audience */
    interests: {
      [interest: string]: number;
    };
    
    /** Device usage of the audience */
    devices: {
      mobile: number;
      desktop: number;
      tablet: number;
      other: number;
    };
    
    /** Languages spoken by the audience */
    languages: {
      [language: string]: number;
    };
    
    /** Audience distribution across platforms */
    platformBreakdown: {
      [platform in PlatformTypes.PlatformType]?: number;
    };
    
    /** When the demographics were last updated */
    lastUpdated: Date;
  }

  /**
   * Creator data enriched with calculated analytics metrics
   */
  export interface CreatorWithMetrics {
    /** Base creator data */
    creator: Creator;
    
    /** Total followers/subscribers across all platforms */
    totalFollowers: number;
    
    /** Average engagement rate across all platforms */
    engagementRate: number;
    
    /** Total number of content items */
    totalContent: number;
    
    /** Number of content families (parent-child relationships) */
    contentFamilies: number;
    
    /** Average monetary value per content piece */
    averageContentValue: number;
    
    /** Top performing platforms */
    topPlatforms: PlatformSummary[];
    
    /** Content growth rate (percentage) */
    contentGrowth: number;
    
    /** Follower growth rate (percentage) */
    followerGrowth: number;
    
    /** Audience demographic information */
    audienceDemographics: AudienceDemographics;
    
    /** Featured content samples */
    featuredContent: FeaturedContent[];
    
    /** Match score for brand discovery (0-100) */
    matchScore?: number;
  }

  /**
   * Search criteria for discovering creators
   */
  export interface CreatorSearchFilters {
    /** Filter by content categories */
    categories?: Category[];
    
    /** Filter by platforms */
    platforms?: PlatformTypes.PlatformType[];
    
    /** Filter by follower count range */
    followerRange?: {
      min?: number;
      max?: number;
    };
    
    /** Filter by engagement rate range */
    engagementRange?: {
      min?: number;
      max?: number;
    };
    
    /** Filter by verification status */
    verificationStatus?: UserTypes.VerificationStatus;
    
    /** Filter by creator location */
    location?: string[];
    
    /** Filter by audience age ranges */
    audienceAgeRange?: {
      [range: string]: boolean;
    };
    
    /** Filter by audience gender distribution */
    audienceGenderDistribution?: {
      [gender: string]: boolean;
    };
    
    /** Filter by audience locations */
    audienceLocations?: string[];
    
    /** Filter by content types */
    contentTypes?: string[];
    
    /** Filter by keywords in creator bio or content */
    keywords?: string[];
    
    /** Filter by creator's budget expectations */
    budgetRange?: {
      min?: number;
      max?: number;
    };
    
    /** Field to sort results by */
    sortBy?: string;
    
    /** Sort direction */
    sortDirection?: 'asc' | 'desc';
  }

  /**
   * Paginated list of creators with search result metadata
   */
  export interface CreatorListResult {
    /** Array of creators with metrics */
    creators: CreatorWithMetrics[];
    
    /** Total number of matching creators */
    total: number;
    
    /** Current page number */
    page: number;
    
    /** Number of items per page */
    pageSize: number;
    
    /** Whether there are more pages of results */
    hasMore: boolean;
    
    /** Facet counts for filtering options */
    facets?: {
      categories?: { [category in Category]?: number };
      platforms?: { [platform in PlatformTypes.PlatformType]?: number };
      locations?: { [location: string]: number };
      followerRanges?: { [range: string]: number };
      engagementRanges?: { [range: string]: number };
    };
  }

  /**
   * Template for generating creator media kits
   */
  export interface MediaKitTemplate {
    /** Unique identifier for the template */
    id: string;
    
    /** Reference to the creator who owns the template */
    creatorId: string;
    
    /** Template name */
    name: string;
    
    /** Template description */
    description: string;
    
    /** URL to the cover image */
    coverImage: string;
    
    /** Sections that make up the media kit */
    sections: {
      id: string;
      type: string;
      title: string;
      content: any;
      order: number;
    }[];
    
    /** Platforms to include in the media kit */
    includedPlatforms: PlatformTypes.PlatformType[];
    
    /** Content items to feature in the media kit */
    featuredContent: string[]; // Content IDs
    
    /** Whether to include demographic information */
    showDemographics: boolean;
    
    /** Whether to include rate card information */
    showRateCard: boolean;
    
    /** Visual theme */
    theme: string;
    
    /** Whether this is the default template */
    isDefault: boolean;
    
    /** Creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
  }

  /**
   * Input data for creating a new creator account
   */
  export interface CreateCreatorInput {
    /** Reference to the user account */
    userId: string;
    
    /** Creator's biography or description */
    bio: string;
    
    /** Content categories the creator identifies with */
    categories: Category[];
    
    /** URL to the creator's profile image */
    profileImage?: string;
    
    /** Creator's location */
    location?: string;
    
    /** Languages the creator speaks/creates content in */
    languages?: string[];
    
    /** Creator's website URL */
    website?: string;
  }

  /**
   * Input data for updating an existing creator account
   */
  export interface UpdateCreatorInput {
    /** Creator's biography or description */
    bio?: string;
    
    /** Content categories the creator identifies with */
    categories?: Category[];
    
    /** URL to the creator's profile image */
    profileImage?: string;
    
    /** URL to the creator's cover image */
    coverImage?: string;
    
    /** Creator's location */
    location?: string;
    
    /** Languages the creator speaks/creates content in */
    languages?: string[];
    
    /** Creator's website URL */
    website?: string;
    
    /** Contact email for business inquiries */
    contactEmail?: string;
    
    /** Creator-specific settings and preferences */
    settings?: Partial<CreatorSettings>;
  }
}

// Re-export individual types for direct import
export type Creator = CreatorTypes.Creator;
export type CreatorProfile = CreatorTypes.CreatorProfile;
export type CreatorSettings = CreatorTypes.CreatorSettings;
export type PlatformSummary = CreatorTypes.PlatformSummary;
export type FeaturedContent = CreatorTypes.FeaturedContent;
export type ContentMetricsSummary = CreatorTypes.ContentMetricsSummary;
export type PartnershipSummary = CreatorTypes.PartnershipSummary;
export type AudienceDemographics = CreatorTypes.AudienceDemographics;
export type CreatorWithMetrics = CreatorTypes.CreatorWithMetrics;
export type CreatorSearchFilters = CreatorTypes.CreatorSearchFilters;
export type CreatorListResult = CreatorTypes.CreatorListResult;
export type MediaKitTemplate = CreatorTypes.MediaKitTemplate;
export type CreateCreatorInput = CreatorTypes.CreateCreatorInput;
export type UpdateCreatorInput = CreatorTypes.UpdateCreatorInput;

// Re-export enums (these can be exported directly as values)
export import Category = CreatorTypes.Category;