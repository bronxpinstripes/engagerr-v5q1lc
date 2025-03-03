/**
 * Brand Types Definition
 * 
 * This module defines TypeScript interfaces, types, and enums for brand-related data structures
 * used throughout the Engagerr platform. It includes definitions for brand profiles, industry
 * categorization, creator discovery preferences, and campaign management.
 */

import { UserTypes } from './user';

// Define all brand-related types within a namespace
export namespace BrandTypes {
  /**
   * Core brand entity representing a business account in the system
   */
  export interface Brand {
    id: string;
    userId: string;
    user: UserTypes.User;
    companyName: string;
    industries: Industry[];
    logoImage: string;
    websiteUrl: string;
    subscriptionTier: UserTypes.SubscriptionTier;
    subscriptionStatus: UserTypes.SubscriptionStatus;
    settings: BrandSettings;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * Industry categories that brands can identify with
   */
  export enum Industry {
    TECHNOLOGY = 'technology',
    FASHION = 'fashion',
    BEAUTY = 'beauty',
    HEALTH = 'health',
    FITNESS = 'fitness',
    FOOD_BEVERAGE = 'food_beverage',
    TRAVEL = 'travel',
    GAMING = 'gaming',
    ENTERTAINMENT = 'entertainment',
    FINANCE = 'finance',
    EDUCATION = 'education',
    RETAIL = 'retail',
    AUTOMOTIVE = 'automotive',
    HOME_DECOR = 'home_decor',
    LUXURY = 'luxury',
    B2B = 'b2b',
    OTHER = 'other'
  }

  /**
   * Public-facing profile information for a brand that can be viewed by creators
   */
  export interface BrandProfile {
    brandId: string;
    companyName: string;
    description: string;
    industries: Industry[];
    logoImage: string;
    coverImage: string;
    websiteUrl: string;
    socialLinks: object;
    location: string;
    size: string;
    founded: number;
    contactEmail: string;
    contactPhone: string;
    brandValues: string[];
    pastCampaigns: CampaignSummary[];
    isPublic: boolean;
  }

  /**
   * Summary of a brand's campaign for public profiles
   */
  export interface CampaignSummary {
    campaignId: string;
    title: string;
    description: string;
    coverImage: string;
    creatorCount: number;
    date: Date;
    isPublic: boolean;
  }

  /**
   * Brand-specific application settings and preferences
   */
  export interface BrandSettings {
    notificationPreferences: object;
    privacySettings: object;
    displayPreferences: object;
    discoveryPreferences: BrandPreferences;
    dashboardLayout: object;
    approvalWorkflow: object;
  }

  /**
   * Brand preferences for creator discovery and partnerships
   */
  export interface BrandPreferences {
    preferredCategories: string[];
    preferredPlatforms: string[];
    audienceAgeRange: object;
    audienceGenderDistribution: object;
    audienceLocations: string[];
    followerRangeMin: number;
    followerRangeMax: number;
    engagementRateMin: number;
    contentTypes: string[];
    budgetRangeMin: number;
    budgetRangeMax: number;
    exclusivityPreference: string;
  }

  /**
   * Saved creator search criteria for brands
   */
  export interface SavedSearch {
    id: string;
    brandId: string;
    name: string;
    description: string;
    filters: object;
    savedCreatorIds: string[];
    lastRun: Date;
    resultCount: number;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * Input data for creating a new brand account
   */
  export interface CreateBrandInput {
    userId: string;
    companyName: string;
    industries: Industry[];
    logoImage: string;
    websiteUrl: string;
    description: string;
    location: string;
  }

  /**
   * Input data for updating an existing brand account
   */
  export interface UpdateBrandInput {
    companyName?: string;
    industries?: Industry[];
    logoImage?: string;
    coverImage?: string;
    websiteUrl?: string;
    description?: string;
    location?: string;
    contactEmail?: string;
    socialLinks?: object;
    brandValues?: string[];
    settings?: Partial<BrandSettings>;
  }

  /**
   * Aggregated statistics about a brand's platform activities
   */
  export interface BrandStatistics {
    activeCampaigns: number;
    totalCampaigns: number;
    activePartnerships: number;
    totalPartnerships: number;
    creatorCount: number;
    totalSpent: number;
    budgetUtilization: number;
    averageEngagementRate: number;
    totalReach: number;
    totalEngagements: number;
    savedSearchCount: number;
  }
}

// Re-export individual types for direct import
export type Brand = BrandTypes.Brand;
export type BrandProfile = BrandTypes.BrandProfile;
export type CampaignSummary = BrandTypes.CampaignSummary;
export type BrandSettings = BrandTypes.BrandSettings;
export type BrandPreferences = BrandTypes.BrandPreferences;
export type SavedSearch = BrandTypes.SavedSearch;
export type CreateBrandInput = BrandTypes.CreateBrandInput;
export type UpdateBrandInput = BrandTypes.UpdateBrandInput;
export type BrandStatistics = BrandTypes.BrandStatistics;

// Re-export enum
export import Industry = BrandTypes.Industry;