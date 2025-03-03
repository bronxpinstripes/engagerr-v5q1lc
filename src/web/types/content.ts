/**
 * Content Types
 * 
 * This file contains TypeScript definitions for content-related entities in the Engagerr platform.
 * It defines the core data structures needed for the platform's proprietary content relationship mapping technology.
 */

import { PlatformType } from './platform';

/**
 * Types of content across different platforms
 */
export enum ContentType {
  VIDEO = 'video',
  POST = 'post',
  STORY = 'story',
  REEL = 'reel',
  SHORT = 'short',
  TWEET = 'tweet',
  ARTICLE = 'article',
  PODCAST_EPISODE = 'podcast_episode',
  BLOG_POST = 'blog_post',
  LIVESTREAM = 'livestream'
}

/**
 * Types of relationships between content items
 */
export enum RelationshipType {
  PARENT = 'parent',
  CHILD = 'child',
  DERIVATIVE = 'derivative',
  REPURPOSED = 'repurposed',
  REACTION = 'reaction',
  REFERENCE = 'reference'
}

/**
 * Method by which a content relationship was created
 */
export enum CreationMethod {
  SYSTEM_DETECTED = 'system_detected',
  AI_SUGGESTED = 'ai_suggested',
  USER_DEFINED = 'user_defined',
  PLATFORM_LINKED = 'platform_linked'
}

/**
 * Minimal creator information required for content association
 * without circular dependencies
 */
export interface CreatorBasicInfo {
  /** Unique identifier for the creator */
  id: string;
  /** Creator's display name */
  name: string;
  /** Creator's profile image URL */
  profileImage?: string;
  /** Whether the creator is verified on the platform */
  verified: boolean;
}

/**
 * Core content item interface
 */
export interface Content {
  /** Unique identifier for the content */
  id: string;
  /** Platform-specific external ID */
  externalId: string;
  /** Type of platform where content is published */
  platformType: PlatformType;
  /** ID of the platform connection */
  platformId: string;
  /** Type of content */
  contentType: ContentType;
  /** Content title */
  title: string;
  /** Content description or caption */
  description?: string;
  /** URL to the content on its platform */
  url: string;
  /** Thumbnail or preview image URL */
  thumbnail?: string;
  /** Date when content was published */
  publishedAt: Date;
  /** Date when content was last updated */
  updatedAt: Date;
  /** Duration in seconds (for video/audio content) */
  duration?: number;
  /** Creator who owns the content */
  creator: CreatorBasicInfo;
  /** ID of the creator who owns the content */
  creatorId: string;
  /** Performance metrics for the content */
  metrics?: ContentMetrics;
  /** Hierarchical path representation for content relationship (LTREE) */
  path?: string;
  /** Whether this is a root/parent content */
  isRootContent: boolean;
  /** ID of the root content if this is a child content */
  rootContentId?: string;
  /** Tags or keywords associated with the content */
  tags?: string[];
  /** Additional metadata specific to the content type */
  metadata?: Record<string, any>;
}

/**
 * Simplified content information for listing and preview contexts
 */
export interface ContentSummary {
  /** Unique identifier for the content */
  id: string;
  /** Content title */
  title: string;
  /** Type of platform where content is published */
  platformType: PlatformType;
  /** Type of content */
  contentType: ContentType;
  /** Thumbnail or preview image URL */
  thumbnail?: string;
  /** URL to the content on its platform */
  url: string;
  /** Date when content was published */
  publishedAt: Date;
  /** Duration in seconds (for video/audio content) */
  duration?: number;
  /** Creator basic information */
  creator: CreatorBasicInfo;
  /** Simplified metrics for the content */
  metrics?: ContentMetricsSummary;
}

/**
 * Relationship between content items
 */
export interface ContentRelationship {
  /** Unique identifier for the relationship */
  id: string;
  /** ID of the source/parent content */
  sourceContentId: string;
  /** ID of the target/child content */
  targetContentId: string;
  /** Type of relationship */
  relationshipType: RelationshipType;
  /** Confidence score for the relationship (0-1) */
  confidence: number;
  /** Method by which the relationship was created */
  creationMethod: CreationMethod;
  /** Date when the relationship was created */
  createdAt: Date;
  /** Optional source content details */
  sourceContent?: ContentSummary;
  /** Optional target content details */
  targetContent?: ContentSummary;
}

/**
 * Performance metrics for content
 */
export interface ContentMetrics {
  /** Unique identifier for the metrics record */
  id: string;
  /** ID of the content these metrics belong to */
  contentId: string;
  /** Total views/impressions */
  views: number;
  /** Total likes/reactions */
  likes: number;
  /** Total comments */
  comments: number;
  /** Total shares/reposts */
  shares: number;
  /** Total clicks on links */
  clicks?: number;
  /** Average watch time in seconds (for video content) */
  averageWatchTime?: number;
  /** Percentage of viewers who watched through the entire content */
  completionRate?: number;
  /** Overall engagement rate as percentage */
  engagementRate: number;
  /** Estimated monetary value of the content */
  estimatedValue?: number;
  /** Date when metrics were last updated */
  updatedAt: Date;
  /** Historical time-series data for trending analysis */
  timeSeriesData?: {
    /** Date of the metrics snapshot */
    date: Date;
    /** Views on that date */
    views: number;
    /** Engagements on that date */
    engagements: number;
  }[];
}

/**
 * Simplified metrics for preview contexts
 */
export interface ContentMetricsSummary {
  /** Total views/impressions */
  views: number;
  /** Total engagements (likes + comments + shares) */
  engagements: number;
  /** Overall engagement rate as percentage */
  engagementRate: number;
}

/**
 * Group of related content items
 */
export interface ContentFamily {
  /** Unique identifier for the content family */
  id: string;
  /** ID of the root/parent content */
  rootContentId: string;
  /** Optional name for the content family */
  name?: string;
  /** Root/parent content details */
  rootContent: Content;
  /** Child content items in this family */
  childContent: ContentSummary[];
  /** Relationships within this family */
  relationships: ContentRelationship[];
  /** Aggregate metrics across all content in the family */
  aggregateMetrics: AggregateMetrics;
  /** Date when the family was created/first detected */
  createdAt: Date;
  /** Date when the family was last updated */
  updatedAt: Date;
}

/**
 * Structure for visualizing content relationships
 */
export interface ContentGraph {
  /** Nodes representing content items */
  nodes: ContentNode[];
  /** Edges representing relationships between content */
  edges: RelationshipEdge[];
}

/**
 * Node in the content relationship graph
 */
export interface ContentNode {
  /** Unique identifier for the node */
  id: string;
  /** Content item represented by this node */
  content: ContentSummary;
  /** Label for the node (typically content title) */
  label: string;
  /** Platform type for visual differentiation */
  platformType: PlatformType;
  /** Content type for visual differentiation */
  contentType: ContentType;
  /** Optional group/cluster identifier */
  group?: string;
  /** Whether this is the root node */
  isRoot: boolean;
  /** Node size based on metrics (for visualization) */
  size?: number;
  /** Additional data for visualization */
  data?: Record<string, any>;
}

/**
 * Edge in the content relationship graph
 */
export interface RelationshipEdge {
  /** Unique identifier for the edge */
  id: string;
  /** ID of the source node */
  source: string;
  /** ID of the target node */
  target: string;
  /** Type of relationship */
  relationshipType: RelationshipType;
  /** Confidence score for the relationship */
  confidence: number;
  /** Label for the edge */
  label?: string;
  /** Edge weight/thickness based on relationship strength */
  weight?: number;
  /** Whether the edge was auto-detected or manually created */
  isAutoDetected: boolean;
}

/**
 * Aggregate metrics for a content family
 */
export interface AggregateMetrics {
  /** Total views across all content */
  totalViews: number;
  /** Total engagements across all content */
  totalEngagements: number;
  /** Total shares across all content */
  totalShares: number;
  /** Total comments across all content */
  totalComments: number;
  /** Total estimated watch time in minutes */
  totalWatchTime?: number;
  /** Overall engagement rate across all content */
  overallEngagementRate: number;
  /** Estimated total content value */
  estimatedTotalValue?: number;
  /** Metrics breakdown by platform */
  platformBreakdown: {
    /** Platform type */
    platformType: PlatformType;
    /** Views from this platform */
    views: number;
    /** Engagements from this platform */
    engagements: number;
    /** Percentage of total views */
    viewsPercentage: number;
    /** Percentage of total engagements */
    engagementsPercentage: number;
  }[];
}

/**
 * Data structure for visualizing content family relationships
 */
export interface ContentFamilyVisualizationData {
  /** Graph data for visualization */
  graph: ContentGraph;
  /** Root content summary */
  rootContent: ContentSummary;
  /** Aggregate metrics for the entire family */
  aggregateMetrics: AggregateMetrics;
  /** Statistics about the family structure */
  statistics: {
    /** Total number of content items */
    totalContent: number;
    /** Number of platforms represented */
    platformCount: number;
    /** Content count by platform */
    contentByPlatform: Record<PlatformType, number>;
    /** Content count by type */
    contentByType: Record<ContentType, number>;
  };
}

/**
 * Request payload for creating content relationships
 */
export interface CreateRelationshipRequest {
  /** ID of the source/parent content */
  sourceContentId: string;
  /** ID of the target/child content */
  targetContentId: string;
  /** Type of relationship */
  relationshipType: RelationshipType;
  /** Optional creator ID for authorization */
  creatorId: string;
}

/**
 * Response payload after creating content relationships
 */
export interface CreateRelationshipResponse {
  /** The created relationship */
  relationship: ContentRelationship;
  /** Updated content family information */
  contentFamily: ContentFamily;
}

/**
 * Request parameters for retrieving AI-suggested content relationships
 */
export interface GetContentSuggestionsRequest {
  /** ID of the content to find suggestions for */
  contentId: string;
  /** Optional minimum confidence threshold (0-1) */
  confidenceThreshold?: number;
  /** Maximum number of suggestions to return */
  limit?: number;
  /** Optional creator ID for authorization */
  creatorId: string;
}

/**
 * AI-suggested potential content relationship
 */
export interface ContentSuggestion {
  /** ID of the source content */
  sourceContentId: string;
  /** ID of the suggested related content */
  suggestedContentId: string;
  /** Suggested relationship type */
  relationshipType: RelationshipType;
  /** Confidence score for the suggestion (0-1) */
  confidence: number;
  /** Reason for the suggestion */
  reason: string;
  /** Suggested content details */
  suggestedContent: ContentSummary;
}