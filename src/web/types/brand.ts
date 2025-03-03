/**
 * Type definitions for brand-related entities in the Engagerr platform.
 * These types support brand onboarding, creator discovery, and campaign management.
 */

import { UserType, SubscriptionTier, SubscriptionStatus, User } from './user';

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
  OTHER = 'other',
}

/**
 * Core brand entity representing a business account in the system
 */
export interface Brand {
  id: string;
  userId: string;
  user: User;
  companyName: string;
  industries: Industry[];
  logoImage: string;
  websiteUrl: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  settings: BrandSettings;
  createdAt: Date;
  updatedAt: Date;
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
  socialLinks: { [platform: string]: string };
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
  notificationPreferences: {
    email: boolean;
    inApp: boolean;
    partnerships: boolean;
    campaigns: boolean;
  };
  privacySettings: {
    profileVisibility: string;
    contactInfoVisibility: string;
  };
  displayPreferences: {
    dashboardLayout: string;
    theme: string;
  };
  discoveryPreferences: BrandPreferences;
  approvalWorkflow: {
    requireApproval: boolean;
    approverIds: string[];
  };
}

/**
 * Brand preferences for creator discovery and partnerships
 */
export interface BrandPreferences {
  preferredCategories: string[];
  preferredPlatforms: string[];
  audienceAgeRange: {
    min: number;
    max: number;
  };
  audienceGenderDistribution: {
    male: boolean;
    female: boolean;
    other: boolean;
  };
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
  filters: SearchFilters;
  savedCreatorIds: string[];
  lastRun: Date;
  resultCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search criteria for finding creators
 */
export interface SearchFilters {
  categories: string[];
  platforms: string[];
  audienceAgeRange: {
    min: number;
    max: number;
  };
  audienceGender: string[];
  audienceLocations: string[];
  followerRange: {
    min: number;
    max: number;
  };
  engagementRate: {
    min: number;
    max: number;
  };
  contentTypes: string[];
  budgetRange: {
    min: number;
    max: number;
  };
  keywords: string[];
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
  companyName: string;
  industries: Industry[];
  logoImage: string;
  coverImage: string;
  websiteUrl: string;
  description: string;
  location: string;
  contactEmail: string;
  socialLinks: { [platform: string]: string };
  brandValues: string[];
  settings: Partial<BrandSettings>;
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

/**
 * Response format for listing brands with pagination
 */
export interface BrandListResponse {
  brands: Brand[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Comprehensive data for the brand dashboard view
 */
export interface BrandDashboardData {
  brand: Brand;
  statistics: BrandStatistics;
  activeCampaigns: BrandCampaign[];
  recommendedCreators: RecommendedCreator[];
  recentActivity: ActivityItem[];
}

/**
 * Status options for campaign lifecycle stages defined within brand.ts to avoid circular dependency
 */
export enum BrandCampaignStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * Campaign representation for brand interfaces to avoid circular dependency with campaign.ts
 */
export interface BrandCampaign {
  id: string;
  brandId: string;
  name: string;
  description: string;
  status: BrandCampaignStatus;
  startDate: Date;
  endDate: Date;
  totalBudget: number;
  spentBudget: number;
  targetCreatorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creator recommended to a brand based on preferences
 */
export interface RecommendedCreator {
  id: string;
  name: string;
  avatarUrl: string;
  category: string;
  followerCount: number;
  engagementRate: number;
  matchScore: number;
  platforms: string[];
}

/**
 * Activity or notification item for brand dashboard
 */
export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  relatedId: string;
  relatedType: string;
  status: string;
}