/**
 * Content-related type definitions for the Engagerr application.
 * 
 * This file defines the TypeScript interfaces, types, and enums used for content 
 * relationship mapping, which is a core feature that tracks hierarchical parent/child 
 * content relationships across different platforms.
 */

import { PlatformType } from './platform';

/**
 * Enum representing different types of content across platforms.
 */
export enum ContentType {
  VIDEO = 'video',
  SHORT_VIDEO = 'short_video',
  PHOTO = 'photo',
  CAROUSEL = 'carousel',
  STORY = 'story',
  POST = 'post',
  ARTICLE = 'article',
  PODCAST = 'podcast',
  OTHER = 'other'
}

/**
 * Enum representing types of relationships between content items.
 */
export enum RelationshipType {
  PARENT = 'parent',
  DERIVATIVE = 'derivative',
  REPURPOSED = 'repurposed',
  REACTION = 'reaction',
  REFERENCE = 'reference'
}

/**
 * Enum representing how a relationship between content was created.
 */
export enum CreationMethod {
  SYSTEM_DETECTED = 'system_detected',
  AI_SUGGESTED = 'ai_suggested',
  USER_DEFINED = 'user_defined',
  PLATFORM_LINKED = 'platform_linked'
}

/**
 * Main interface representing a content item from any platform.
 */
export interface Content {
  /** Unique identifier */
  id: string;
  
  /** Reference to the creator who owns this content */
  creatorId: string;
  
  /** Reference to the platform where this content is published */
  platformId: string;
  
  /** Platform-specific identifier for the content */
  externalId: string;
  
  /** Content title */
  title: string;
  
  /** Content description */
  description: string;
  
  /** Type of content */
  contentType: ContentType;
  
  /** When the content was published */
  publishedAt: Date;
  
  /** URL to the content */
  url: string;
  
  /** URL to the content thumbnail */
  thumbnail: string;
  
  /** Number of views/impressions */
  views: number;
  
  /** Number of engagements (likes, comments, shares combined) */
  engagements: number;
  
  /** Engagement rate (engagements/views) */
  engagementRate: number;
  
  /** Number of shares/reposts */
  shares: number;
  
  /** Number of comments */
  comments: number;
  
  /** Estimated monetary value of the content */
  estimatedValue: number;
  
  /** LTREE path for hierarchical relationships */
  path: string;
  
  /** Additional content-specific metadata */
  metadata: Record<string, any>;
  
  /** Platform type for easy reference */
  platform: PlatformType;
  
  /** Whether this content is a root node (original content) */
  isRoot: boolean;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Interface for standardized content performance metrics.
 */
export interface ContentMetrics {
  /** Unique identifier */
  id: string;
  
  /** Reference to the content item */
  contentId: string;
  
  /** Number of views/impressions */
  views: number;
  
  /** Number of engagements (combined interactions) */
  engagements: number;
  
  /** Engagement rate (engagements/views) */
  engagementRate: number;
  
  /** Number of shares/reposts */
  shares: number;
  
  /** Number of comments */
  comments: number;
  
  /** Number of likes/reactions */
  likes: number;
  
  /** Watch time in minutes (for video content) */
  watchTime: number;
  
  /** Estimated monetary value */
  estimatedValue: number;
  
  /** Platform-specific metrics that don't map to standard categories */
  platformSpecificMetrics: Record<string, any>;
  
  /** When these metrics were last updated */
  lastUpdated: Date;
}

/**
 * Interface representing a relationship between two content items.
 */
export interface ContentRelationship {
  /** Unique identifier */
  id: string;
  
  /** Source content ID (parent or original content) */
  sourceContentId: string;
  
  /** Target content ID (child or derivative content) */
  targetContentId: string;
  
  /** Type of relationship */
  relationshipType: RelationshipType;
  
  /** Confidence score for the relationship (0.0-1.0) */
  confidence: number;
  
  /** How this relationship was created */
  creationMethod: CreationMethod;
  
  /** Additional relationship metadata */
  metadata: Record<string, any>;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Interface representing a node in the content relationship graph, used with PostgreSQL LTREE.
 */
export interface ContentNode {
  /** Unique identifier */
  id: string;
  
  /** Reference to the content item */
  contentId: string;
  
  /** LTREE path representing the hierarchical position */
  path: string;
  
  /** Depth in the relationship tree (0 for root) */
  depth: number;
  
  /** ID of the root content for this family */
  rootId: string;
  
  /** Reference to the content data */
  content: Content;
  
  /** Reference to the content metrics */
  metrics: ContentMetrics;
}

/**
 * Interface representing a complete family of related content items.
 */
export interface ContentFamily {
  /** Unique identifier */
  id: string;
  
  /** ID of the root content */
  rootContentId: string;
  
  /** Reference to the root content */
  rootContent: Content;
  
  /** All nodes in the content family */
  nodes: ContentNode[];
  
  /** All relationships between nodes */
  edges: ContentRelationship[];
  
  /** Aggregate metrics for the entire family */
  aggregateMetrics: AggregateMetrics;
  
  /** Maximum depth of the relationship tree */
  depth: number;
  
  /** Distribution of content across platforms */
  platformDistribution: Record<PlatformType, number>;
}

/**
 * Interface for aggregate metrics across a family of content.
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
  
  /** Total watch time in minutes (for video content) */
  totalWatchTime: number;
  
  /** Average engagement rate across all content */
  engagementRate: number;
  
  /** Total estimated monetary value */
  estimatedTotalValue: number;
  
  /** Estimated unique reach (accounting for audience overlap) */
  uniqueReachEstimate: number;
  
  /** Total number of content items in the family */
  contentCount: number;
  
  /** Number of different platforms in the content family */
  platformCount: number;
}

/**
 * Interface for visualization-ready content family data.
 */
export interface ContentVisualization {
  /** Nodes in the visualization graph */
  nodes: VisualizationNode[];
  
  /** Edges in the visualization graph */
  edges: VisualizationEdge[];
  
  /** Aggregate metrics for the entire content family */
  metrics: AggregateMetrics;
}

/**
 * Interface for a node in the visualization graph.
 */
export interface VisualizationNode {
  /** Node identifier (matches content ID) */
  id: string;
  
  /** Node display label */
  label: string;
  
  /** Content type */
  contentType: ContentType;
  
  /** Platform */
  platform: PlatformType;
  
  /** Key metrics for the node */
  metrics: Record<string, number>;
  
  /** Size of the node (based on views/importance) */
  size: number;
  
  /** Depth in the relationship tree */
  depth: number;
  
  /** Thumbnail image URL */
  thumbnail: string;
  
  /** Content URL */
  url: string;
  
  /** Whether this is a root node */
  isRoot: boolean;
}

/**
 * Interface for an edge in the visualization graph.
 */
export interface VisualizationEdge {
  /** Edge identifier */
  id: string;
  
  /** Source node ID */
  source: string;
  
  /** Target node ID */
  target: string;
  
  /** Relationship type */
  type: RelationshipType;
  
  /** Confidence score (affects visualization) */
  confidence: number;
}

/**
 * Interface for filtering content in queries.
 */
export interface ContentFilter {
  /** Filter by creator */
  creatorId: string;
  
  /** Filter by platform */
  platformId: string;
  
  /** Filter by content type */
  contentType: ContentType;
  
  /** Filter by start date */
  startDate: Date;
  
  /** Filter by end date */
  endDate: Date;
  
  /** Filter by root status */
  isRoot: boolean;
  
  /** Search term for text search */
  searchTerm: string;
  
  /** Limit the number of results */
  limit: number;
  
  /** Offset for pagination */
  offset: number;
}

/**
 * Interface for creating a new content item.
 */
export interface ContentCreateInput {
  /** Creator ID */
  creatorId: string;
  
  /** Platform ID */
  platformId: string;
  
  /** External ID from the platform */
  externalId: string;
  
  /** Content title */
  title: string;
  
  /** Content description */
  description: string;
  
  /** Content type */
  contentType: ContentType;
  
  /** Publication date */
  publishedAt: Date;
  
  /** Content URL */
  url: string;
  
  /** Thumbnail URL */
  thumbnail: string;
  
  /** Additional metadata */
  metadata: Record<string, any>;
  
  /** Optional parent content ID */
  parentContentId: string;
  
  /** Whether this is a root content item */
  isRoot: boolean;
}

/**
 * Interface for updating an existing content item.
 */
export interface ContentUpdateInput {
  /** Content ID to update */
  id: string;
  
  /** Updated title */
  title: string;
  
  /** Updated description */
  description: string;
  
  /** Updated content type */
  contentType: ContentType;
  
  /** Updated publication date */
  publishedAt: Date;
  
  /** Updated URL */
  url: string;
  
  /** Updated thumbnail */
  thumbnail: string;
  
  /** Updated metadata */
  metadata: Record<string, any>;
  
  /** Updated root status */
  isRoot: boolean;
}

/**
 * Interface for creating a new relationship between content items.
 */
export interface RelationshipCreateInput {
  /** Source content ID */
  sourceContentId: string;
  
  /** Target content ID */
  targetContentId: string;
  
  /** Relationship type */
  relationshipType: RelationshipType;
  
  /** Confidence score */
  confidence: number;
  
  /** Creation method */
  creationMethod: CreationMethod;
  
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Interface for updating an existing relationship.
 */
export interface RelationshipUpdateInput {
  /** Relationship ID to update */
  id: string;
  
  /** Updated relationship type */
  relationshipType: RelationshipType;
  
  /** Updated confidence score */
  confidence: number;
  
  /** Updated metadata */
  metadata: Record<string, any>;
}

/**
 * Interface for AI-generated content insights and recommendations.
 */
export interface ContentInsight {
  /** Content ID this insight relates to */
  contentId: string;
  
  /** Type of insight */
  insightType: string;
  
  /** Insight title/summary */
  title: string;
  
  /** Detailed explanation */
  description: string;
  
  /** Supporting metrics */
  metrics: Record<string, any>;
  
  /** Actionable recommendations */
  recommendations: string[];
  
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Interface for AI-suggested content relationships.
 */
export interface RelationshipSuggestion {
  /** Source content ID */
  sourceContentId: string;
  
  /** Target content ID */
  targetContentId: string;
  
  /** Suggested relationship type */
  suggestedRelationshipType: RelationshipType;
  
  /** Confidence score (0.0-1.0) */
  confidence: number;
  
  /** Explanation of why this relationship was suggested */
  reasoningExplanation: string;
  
  /** Reference to the target content */
  targetContent: Content;
}