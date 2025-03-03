/**
 * Campaign Types
 * 
 * This file contains TypeScript definitions for campaign-related entities in the Engagerr platform.
 * These types support the campaign management system, allowing brands to organize creator partnerships,
 * track deliverables, and measure campaign performance.
 */

import { Brand } from './brand';
import { Creator } from './creator';
import { Partnership, Deliverable, Payment } from './partnership';

/**
 * Status values for tracking the lifecycle of a campaign
 */
export enum CampaignStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

/**
 * Core campaign entity representing a brand's organized set of creator partnerships
 */
export interface Campaign {
  /** Unique identifier for the campaign */
  id: string;
  /** Reference to the brand that owns this campaign */
  brandId: string;
  /** Name of the campaign */
  name: string;
  /** Detailed description of the campaign */
  description: string;
  /** Current status in the campaign lifecycle */
  status: CampaignStatus;
  /** Date when the campaign is scheduled to begin */
  startDate: Date;
  /** Date when the campaign is scheduled to end */
  endDate: Date;
  /** Total budget allocated to the campaign */
  totalBudget: number;
  /** Amount of budget that has been spent */
  spentBudget: number;
  /** Target number of creators to involve in the campaign */
  targetCreatorCount: number;
  /** URL to the campaign cover image */
  coverImage: string;
  /** URLs to campaign brief materials */
  briefMaterials: string[];
  /** Campaign timeline milestones */
  milestones: CampaignMilestone[];
  /** Key messaging points for the campaign */
  keyMessages: string[];
  /** Categorical tags for the campaign */
  tags: string[];
  /** Whether the campaign is publicly visible to creators */
  isPublic: boolean;
  /** When the campaign was created */
  createdAt: Date;
  /** When the campaign was last updated */
  updatedAt: Date;
}

/**
 * Timeline milestone for a campaign
 */
export interface CampaignMilestone {
  /** Unique identifier for the milestone */
  id: string;
  /** Reference to the campaign this milestone belongs to */
  campaignId: string;
  /** Name of the milestone */
  name: string;
  /** Detailed description of the milestone */
  description: string;
  /** Date when the milestone is scheduled to occur */
  date: Date;
  /** Whether the milestone has been completed */
  completed: boolean;
  /** When the milestone was completed, null if not completed */
  completedAt: Date | null;
}

/**
 * Creator participant in a campaign with partnership details
 */
export interface CampaignParticipant {
  /** Unique identifier for the participant record */
  id: string;
  /** Reference to the campaign */
  campaignId: string;
  /** Reference to the creator */
  creatorId: string;
  /** Reference to the partnership */
  partnershipId: string;
  /** Current status of the creator's participation */
  status: ParticipantStatus;
  /** Budget allocated to this creator within the campaign */
  budget: number;
  /** Total number of deliverables expected from this creator */
  deliverableCount: number;
  /** Number of deliverables completed by this creator */
  completedDeliverables: number;
  /** When the creator joined the campaign */
  joinedAt: Date;
  /** When the creator completed all deliverables, null if not completed */
  completedAt: Date | null;
}

/**
 * Status values for tracking a creator's participation status in a campaign
 */
export enum ParticipantStatus {
  INVITED = 'invited',
  NEGOTIATING = 'negotiating',
  CONTRACTED = 'contracted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DECLINED = 'declined'
}

/**
 * Detailed campaign information including related entities for UI display
 */
export interface CampaignDetail {
  /** Core campaign data */
  campaign: Campaign;
  /** Brand that owns the campaign */
  brand: Brand;
  /** Detailed information about campaign participants */
  participants: CampaignParticipantDetail[];
  /** Performance metrics for the campaign */
  metrics: CampaignMetrics;
}

/**
 * Detailed information about a campaign participant including creator and partnership details
 */
export interface CampaignParticipantDetail {
  /** Participant record with status and budget information */
  participant: CampaignParticipant;
  /** Creator information */
  creator: Creator;
  /** Partnership details */
  partnership: Partnership;
  /** Deliverables assigned to this creator */
  deliverables: Deliverable[];
}

/**
 * Performance metrics for a campaign across all participants and deliverables
 */
export interface CampaignMetrics {
  /** Reference to the campaign */
  campaignId: string;
  /** Total audience reach across all content */
  totalReach: number;
  /** Total engagement actions across all content */
  totalEngagements: number;
  /** Average engagement rate as a percentage */
  engagementRate: number;
  /** Total impressions across all content */
  totalImpressions: number;
  /** Number of clicks to brand destination */
  clickThroughs: number;
  /** Conversion rate from impressions to actions */
  conversionRate: number;
  /** Return on investment calculation */
  roi: number;
  /** Average cost per engagement */
  costPerEngagement: number;
  /** Average cost per impression */
  costPerImpression: number;
  /** Performance breakdown by platform */
  platformBreakdown: Record<string, number>;
  /** Performance breakdown by content type */
  contentTypeBreakdown: Record<string, number>;
  /** Demographic information about the audience reached */
  audienceReached: AudienceMetrics;
  /** When metrics were last updated */
  lastUpdated: Date;
}

/**
 * Audience demographic information for campaign analytics
 */
export interface AudienceMetrics {
  /** Age distribution of audience reached */
  ageRanges: Record<string, number>;
  /** Gender distribution of audience reached */
  genderDistribution: Record<string, number>;
  /** Geographic distribution of audience reached */
  topLocations: Record<string, number>;
  /** Interest categories of audience reached */
  interests: Record<string, number>;
}

/**
 * Request data for creating a new campaign
 */
export interface CreateCampaignRequest {
  /** ID of the brand creating the campaign */
  brandId: string;
  /** Name of the campaign */
  name: string;
  /** Description of the campaign */
  description: string;
  /** When the campaign should start */
  startDate: Date;
  /** When the campaign should end */
  endDate: Date;
  /** Total budget allocated to the campaign */
  totalBudget: number;
  /** Target number of creators to involve */
  targetCreatorCount: number;
  /** URL to the campaign cover image */
  coverImage: string;
  /** Key messaging points for the campaign */
  keyMessages: string[];
  /** Whether the campaign should be publicly visible to creators */
  isPublic: boolean;
}

/**
 * Request data for updating an existing campaign
 */
export interface UpdateCampaignRequest {
  /** Updated name of the campaign */
  name: string;
  /** Updated description of the campaign */
  description: string;
  /** Updated status of the campaign */
  status: CampaignStatus;
  /** Updated start date */
  startDate: Date;
  /** Updated end date */
  endDate: Date;
  /** Updated total budget */
  totalBudget: number;
  /** Updated target creator count */
  targetCreatorCount: number;
  /** Updated cover image URL */
  coverImage: string;
  /** Updated key messaging points */
  keyMessages: string[];
  /** Updated visibility setting */
  isPublic: boolean;
  /** Updated campaign milestones */
  milestones: CampaignMilestone[];
}

/**
 * Request data for adding a creator participant to a campaign
 */
export interface AddParticipantRequest {
  /** ID of the campaign to add the participant to */
  campaignId: string;
  /** ID of the creator to add as a participant */
  creatorId: string;
  /** Budget allocated to this creator */
  budget: number;
  /** Deliverables expected from this creator */
  deliverables: DeliverableInput[];
  /** When the creator's involvement should start */
  startDate: Date;
  /** When the creator's involvement should end */
  endDate: Date;
}

/**
 * Filtering options for campaign list queries
 */
export interface CampaignFilters {
  /** Filter by campaign status */
  status: CampaignStatus[];
  /** Filter by date range */
  dateRange: { startDate?: Date; endDate?: Date };
  /** Filter by budget range */
  budgetRange: { min?: number; max?: number };
  /** Filter by creator participation */
  creatorId: string;
  /** Text search terms */
  search: string;
  /** Filter by tags */
  tags: string[];
}

/**
 * Response format for listing campaigns with pagination
 */
export interface CampaignListResponse {
  /** List of campaigns matching the query */
  campaigns: Campaign[];
  /** Total number of campaigns matching the query */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Whether there are more items available */
  hasMore: boolean;
}

/**
 * Aggregated dashboard data for campaigns overview
 */
export interface CampaignDashboardData {
  /** Number of currently active campaigns */
  activeCampaigns: number;
  /** Total number of campaigns */
  totalCampaigns: number;
  /** Total number of creator participants across all campaigns */
  totalParticipants: number;
  /** Total budget allocated across all campaigns */
  totalBudget: number;
  /** Total amount spent across all campaigns */
  spentBudget: number;
  /** Percentage of total budget that has been spent */
  budgetUtilization: number;
  /** Total audience reach across all campaigns */
  totalReach: number;
  /** Total engagement actions across all campaigns */
  totalEngagements: number;
  /** Recent campaigns for quick access */
  recentCampaigns: Campaign[];
}

/**
 * Timeline event for campaign history tracking
 */
export interface CampaignTimelineEvent {
  /** Unique identifier for the event */
  id: string;
  /** Reference to the campaign */
  campaignId: string;
  /** Title of the event */
  title: string;
  /** Description of the event */
  description: string;
  /** When the event occurred */
  date: Date;
  /** Type of event (milestone, participant_added, etc.) */
  eventType: string;
  /** ID of the related entity (participant, deliverable, etc.) */
  relatedEntityId: string;
  /** Type of the related entity */
  relatedEntityType: string;
}