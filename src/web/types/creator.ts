/**
 * Creator Types
 * 
 * This file contains TypeScript definitions for creator entities in the Engagerr platform.
 * It defines interfaces, enums, and types for creator profiles, metrics, onboarding states,
 * and related entities needed to support the platform's core functionality of content creator
 * management and analytics.
 */

import { 
  User, 
  UserWithSubscription, 
  SubscriptionTier, 
  SubscriptionStatus, 
  VerificationStatus,
  TeamRole,
  Permission
} from './user';

import {
  PlatformType,
  Platform,
  AuthStatus
} from './platform';

/**
 * Content categories that creators specialize in
 */
export enum Category {
  TECH = 'tech',
  LIFESTYLE = 'lifestyle',
  BEAUTY = 'beauty',
  FASHION = 'fashion',
  FITNESS = 'fitness',
  GAMING = 'gaming',
  FOOD = 'food',
  TRAVEL = 'travel',
  BUSINESS = 'business',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  SPORTS = 'sports',
  OTHER = 'other'
}

/**
 * Tracks the creator's progress through the onboarding process
 */
export enum OnboardingState {
  NOT_STARTED = 'not_started',
  ACCOUNT_CREATED = 'account_created',
  PROFILE_COMPLETED = 'profile_completed',
  PLATFORM_CONNECTED = 'platform_connected',
  CONTENT_ANALYZED = 'content_analyzed',
  SUBSCRIPTION_SELECTED = 'subscription_selected',
  COMPLETED = 'completed'
}

/**
 * Age brackets for audience demographics
 */
export enum AudienceAgeBracket {
  UNDER_18 = 'under_18',
  AGE_18_24 = 'age_18_24',
  AGE_25_34 = 'age_25_34',
  AGE_35_44 = 'age_35_44',
  AGE_45_54 = 'age_45_54',
  AGE_55_PLUS = 'age_55_plus'
}

/**
 * Core creator entity with profile and subscription information
 */
export interface Creator {
  /** Unique identifier for the creator */
  id: string;
  /** Reference to the associated user account */
  userId: string;
  /** User account information */
  user: User;
  /** Creator's biography */
  bio: string;
  /** Content categories the creator specializes in */
  categories: Category[];
  /** URL to the creator's profile image */
  profileImage: string | null;
  /** URL to the creator's cover/banner image */
  coverImage: string | null;
  /** Current verification status */
  verificationStatus: VerificationStatus;
  /** Current subscription tier */
  subscriptionTier: SubscriptionTier;
  /** Current subscription status */
  subscriptionStatus: SubscriptionStatus;
  /** Current state in the onboarding flow */
  onboardingState: OnboardingState;
  /** When the creator account was created */
  createdAt: Date;
  /** When the creator account was last updated */
  updatedAt: Date;
}

/**
 * Public-facing creator profile information
 */
export interface CreatorProfile {
  /** Reference to the creator entity */
  creatorId: string;
  /** Public display name */
  displayName: string;
  /** Creator's biography */
  bio: string;
  /** Content categories the creator specializes in */
  categories: Category[];
  /** Geographic location of the creator */
  location: string | null;
  /** URL to the creator's website */
  websiteUrl: string | null;
  /** URL to the creator's profile image */
  profileImage: string | null;
  /** URL to the creator's cover/banner image */
  coverImage: string | null;
  /** Short, concise biography for previews */
  shortBio: string | null;
  /** Whether the profile is publicly discoverable */
  isPublic: boolean;
  /** Business contact email (may differ from login email) */
  contactEmail: string | null;
}

/**
 * Creator-specific settings and preferences
 */
export interface CreatorSettings {
  /** Reference to the creator entity */
  creatorId: string;
  /** Notification preferences */
  notifications: {
    /** Whether to receive email notifications */
    email: boolean;
    /** Whether to receive in-app notifications */
    inApp: boolean;
    /** Whether to receive partnership notifications */
    partnerships: boolean;
    /** Whether to receive platform update notifications */
    platform: boolean;
  };
  /** Privacy settings */
  privacySettings: {
    /** Who can see the creator's profile */
    profileVisibility: 'public' | 'private' | 'verified';
    /** Who can see the creator's metrics */
    metricsVisibility: 'public' | 'private' | 'verified';
  };
  /** Partnership preferences */
  partnershipPreferences: {
    /** Minimum budget for partnerships, null if not specified */
    minBudget: number | null;
    /** Whether the creator is currently accepting partnerships */
    openToPartnerships: boolean;
    /** Categories to automatically decline */
    autoDeclineCategories: Category[];
  };
  /** Analytics display preferences */
  analyticsPreferences: {
    /** Default timeframe for analytics displays */
    defaultTimeframe: string;
    /** Default platforms to show in analytics */
    defaultPlatforms: PlatformType[];
  };
}

/**
 * Audience demographic information across platforms
 */
export interface AudienceDemographics {
  /** Reference to the creator entity */
  creatorId: string;
  /** Age distribution of audience */
  ageDistribution: Record<AudienceAgeBracket, number>;
  /** Gender distribution of audience */
  genderDistribution: {
    /** Percentage of male audience members */
    male: number;
    /** Percentage of female audience members */
    female: number;
    /** Percentage of audience identifying as other genders */
    other: number;
    /** Percentage of audience with unknown gender */
    unknown: number;
  };
  /** Top geographic locations of audience */
  topLocations: {
    /** Country or region name */
    country: string;
    /** Percentage of audience from this location */
    percentage: number;
  }[];
  /** Audience interest categories */
  interests: {
    /** Interest category name */
    interest: string;
    /** Percentage of audience with this interest */
    percentage: number;
  }[];
  /** Device usage of audience */
  devices: {
    /** Device type (mobile, desktop, etc.) */
    device: string;
    /** Percentage of audience using this device */
    percentage: number;
  }[];
  /** When demographics were last updated */
  lastUpdated: Date;
}

/**
 * Aggregated performance metrics for a creator
 */
export interface CreatorMetrics {
  /** Reference to the creator entity */
  creatorId: string;
  /** Total followers/subscribers across all platforms */
  totalFollowers: number;
  /** Average engagement rate across all content */
  averageEngagementRate: number;
  /** Total audience reach across all content */
  totalReach: number;
  /** Total number of content items across all platforms */
  contentCount: number;
  /** Number of content families (related content groups) */
  contentFamilyCount: number;
  /** Metrics broken down by platform */
  platformMetrics: Record<PlatformType, {
    /** Followers on this platform */
    followers: number;
    /** Engagement rate on this platform */
    engagement: number;
    /** Content count on this platform */
    contentCount: number;
  }>;
  /** Estimated monetary value of creator's content */
  estimatedContentValue: number;
  /** Growth rates for key metrics */
  growthRates: {
    /** Follower growth rate (percentage) */
    followers: number;
    /** Engagement growth rate (percentage) */
    engagement: number;
  };
  /** When metrics were last updated */
  lastUpdated: Date;
}

/**
 * Team members associated with a creator account
 */
export interface CreatorTeam {
  /** Reference to the creator entity */
  creatorId: string;
  /** Active team members */
  members: CreatorTeamMember[];
  /** Pending team invitations */
  pendingInvites: CreatorTeamInvite[];
}

/**
 * Individual team member on a creator account
 */
export interface CreatorTeamMember {
  /** Unique identifier for the team membership */
  id: string;
  /** Reference to the creator entity */
  creatorId: string;
  /** Reference to the user account */
  userId: string;
  /** Email address of the team member */
  email: string;
  /** Display name of the team member */
  name: string;
  /** Role of the team member */
  role: TeamRole;
  /** Specific permissions granted to the team member */
  permissions: Permission[];
  /** When the member joined the team */
  joinedAt: Date;
  /** When the member was last active, null if never active */
  lastActiveAt: Date | null;
}

/**
 * Pending team invitation for a creator account
 */
export interface CreatorTeamInvite {
  /** Unique identifier for the invitation */
  id: string;
  /** Reference to the creator entity */
  creatorId: string;
  /** Email address the invitation was sent to */
  email: string;
  /** Role being offered to the invitee */
  role: TeamRole;
  /** Specific permissions being offered */
  permissions: Permission[];
  /** Reference to the user who sent the invitation */
  invitedById: string;
  /** Unique token for invitation validation */
  token: string;
  /** When the invitation expires */
  expiresAt: Date;
  /** Current status of the invitation */
  status: string;
}

/**
 * Creator's pricing information for partnerships
 */
export interface RateCard {
  /** Reference to the creator entity */
  creatorId: string;
  /** Platform-specific pricing */
  platformRates: PlatformRate[];
  /** Bundle deals offered */
  packageDeals: PackageDeal[];
  /** Additional services offered */
  customServices: CustomService[];
  /** Currency code for all pricing (USD, EUR, etc.) */
  currency: string;
  /** Additional notes about pricing */
  notes: string | null;
  /** Whether the rate card is publicly visible */
  isPublic: boolean;
}

/**
 * Platform-specific pricing for creator content
 */
export interface PlatformRate {
  /** Platform this rate applies to */
  platformType: PlatformType;
  /** Type of content (post, video, story, etc.) */
  contentType: string;
  /** Description of the deliverable */
  description: string;
  /** Base price for this content type */
  baseRate: number;
  /** Additional notes or terms */
  additionalDetails: string | null;
}

/**
 * Bundle deal containing multiple content deliverables
 */
export interface PackageDeal {
  /** Name of the package */
  name: string;
  /** Description of what's included */
  description: string;
  /** List of included items */
  items: string[];
  /** Total price for the package */
  totalPrice: number;
}

/**
 * Custom additional services offered by a creator
 */
export interface CustomService {
  /** Name of the service */
  name: string;
  /** Description of the service */
  description: string;
  /** Price for the service */
  price: number;
}

/**
 * Request parameters for retrieving creator data
 */
export interface GetCreatorRequest {
  /** ID of the creator to retrieve */
  creatorId: string;
  /** Whether to include metrics data */
  includeMetrics: boolean;
  /** Whether to include audience demographics */
  includeAudience: boolean;
  /** Whether to include team information */
  includeTeam: boolean;
  /** Whether to include rate card */
  includeRateCard: boolean;
}

/**
 * Response data from creator retrieval API
 */
export interface GetCreatorResponse {
  /** Core creator entity */
  creator: Creator;
  /** Creator profile information */
  profile: CreatorProfile;
  /** Creator metrics, null if not requested */
  metrics: CreatorMetrics | null;
  /** Audience demographics, null if not requested */
  audience: AudienceDemographics | null;
  /** Creator settings, null if not requested */
  settings: CreatorSettings | null;
  /** Team information, null if not requested */
  team: CreatorTeam | null;
  /** Rate card, null if not requested */
  rateCard: RateCard | null;
}

/**
 * Request data for updating creator information
 */
export interface UpdateCreatorRequest {
  /** ID of the creator to update */
  creatorId: string;
  /** Profile information to update */
  profile: Partial<CreatorProfile>;
  /** Settings to update */
  settings: Partial<CreatorSettings>;
  /** Updated onboarding state, if changing */
  onboardingState: OnboardingState;
}

/**
 * Response data after creator update
 */
export interface UpdateCreatorResponse {
  /** Updated creator entity */
  creator: Creator;
  /** Updated creator profile */
  profile: CreatorProfile;
  /** Updated creator settings */
  settings: CreatorSettings;
}

/**
 * Search filters for discovering creators
 */
export interface CreatorSearchFilter {
  /** Filter by creator categories */
  categories: Category[];
  /** Filter by platforms they're active on */
  platformTypes: PlatformType[];
  /** Filter by follower count range */
  followerRange: {
    /** Minimum followers, undefined for no minimum */
    min?: number;
    /** Maximum followers, undefined for no maximum */
    max?: number;
  };
  /** Filter by engagement rate range */
  engagementRange: {
    /** Minimum engagement rate, undefined for no minimum */
    min?: number;
    /** Maximum engagement rate, undefined for no maximum */
    max?: number;
  };
  /** Filter by audience age brackets */
  audienceAge: AudienceAgeBracket[];
  /** Filter by audience gender distribution */
  audienceGender: {
    /** Whether to include creators with male audience */
    male?: boolean;
    /** Whether to include creators with female audience */
    female?: boolean;
    /** Whether to include creators with other gender audience */
    other?: boolean;
  };
  /** Filter by creator or audience location */
  location: string[];
  /** Filter by price range */
  priceRange: {
    /** Minimum price, undefined for no minimum */
    min?: number;
    /** Maximum price, undefined for no maximum */
    max?: number;
  };
  /** Filter by verification status */
  verificationStatus: VerificationStatus[];
}