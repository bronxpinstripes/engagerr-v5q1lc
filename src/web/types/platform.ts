/**
 * Platform Types
 * 
 * This file contains TypeScript definitions for platform-related types used in the Engagerr application.
 * It defines interfaces for social media platforms, connection states, metrics, and authentication.
 */

/**
 * Enumeration of supported social media platforms
 */
export enum PlatformType {
  YOUTUBE = 'youtube',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  PODCAST = 'podcast'
}

/**
 * Types of content that can be created on different platforms
 */
export enum ContentType {
  VIDEO = 'video',
  POST = 'post',
  STORY = 'story',
  REEL = 'reel',
  SHORT = 'short',
  TWEET = 'tweet',
  ARTICLE = 'article',
  PODCAST_EPISODE = 'podcast_episode'
}

/**
 * Status of platform authentication connection
 */
export enum AuthStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  EXPIRED = 'expired',
  ERROR = 'error',
  PENDING = 'pending'
}

/**
 * Status of platform content synchronization process
 */
export enum PlatformSyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Platform-specific reach and value metrics
 */
export interface PlatformReachMetrics {
  /** Total number of users reached across all content */
  totalReach: number;
  /** Average reach per content piece */
  averageReach: number;
  /** Percentage of viewers who watch through the entire content */
  viewThroughRate: number;
  /** Estimated monetary value of the content based on engagement and reach */
  contentValue: number;
}

/**
 * Standard metrics for a platform
 */
export interface PlatformMetrics {
  /** Total number of followers/subscribers */
  followers: number;
  /** Total engagement (likes, comments, shares) */
  engagement: number;
  /** Average engagement as a percentage of followers */
  engagementRate: number;
  /** Total number of content items on the platform */
  contentCount: number;
  /** Average views per content item */
  averageViews: number;
  /** Detailed reach metrics */
  reachMetrics: PlatformReachMetrics;
}

/**
 * Interface defining a connected platform for a creator
 */
export interface Platform {
  /** Unique identifier for the platform connection */
  id: string;
  /** Type of platform (YouTube, Instagram, etc.) */
  platformType: PlatformType;
  /** Username or handle on the platform */
  handle: string;
  /** URL to the creator's profile on the platform */
  url: string;
  /** Current authentication status */
  authStatus: AuthStatus;
  /** Timestamp of last data synchronization */
  lastSyncAt: Date;
  /** Aggregated platform metrics */
  metrics: PlatformMetrics;
  /** ID of the creator who owns this platform connection */
  creatorId: string;
  /** Whether the account is verified on the platform */
  verified: boolean;
}

/**
 * Error information for platform connection failures
 */
export interface PlatformConnectionError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Platform type where the error occurred */
  platformType: PlatformType;
}

/**
 * State of platform connection process
 */
export interface PlatformConnection {
  /** Platform data */
  platform: Platform;
  /** Whether the connection process is currently in progress */
  isConnecting: boolean;
  /** Error information if connection failed, null otherwise */
  error: PlatformConnectionError | null;
}

/**
 * Parameters for initiating platform connection
 */
export interface ConnectPlatformParams {
  /** Platform to connect */
  platformType: PlatformType;
  /** ID of the creator connecting the platform */
  creatorId: string;
  /** URL to redirect after OAuth flow completes */
  redirectUrl: string;
}

/**
 * Parameters for disconnecting a platform
 */
export interface DisconnectPlatformParams {
  /** ID of the platform connection to disconnect */
  platformId: string;
  /** ID of the creator who owns the platform */
  creatorId: string;
}

/**
 * Result of OAuth connection process
 */
export interface PlatformOAuthResult {
  /** Whether the OAuth process completed successfully */
  success: boolean;
  /** ID of the connected platform (if successful) */
  platformId: string;
  /** Type of platform that was connected */
  platformType: PlatformType;
  /** Error information if connection failed, null otherwise */
  error: PlatformConnectionError | null;
}

/**
 * Props for platform icon components
 */
export interface PlatformIconProps {
  /** Platform type to display icon for */
  platformType: PlatformType;
  /** Size of the icon in pixels */
  size: number;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Mapping of platforms to their supported content types
 */
export interface PlatformContentTypeMap {
  [PlatformType.YOUTUBE]: ContentType[];
  [PlatformType.INSTAGRAM]: ContentType[];
  [PlatformType.TIKTOK]: ContentType[];
  [PlatformType.TWITTER]: ContentType[];
  [PlatformType.LINKEDIN]: ContentType[];
  [PlatformType.PODCAST]: ContentType[];
}

/**
 * Result of platform content synchronization process
 */
export interface PlatformSyncResult {
  /** ID of the platform that was synchronized */
  platformId: string;
  /** Total number of content items after synchronization */
  contentCount: number;
  /** Number of new content items discovered */
  newContentCount: number;
  /** Number of existing content items that were updated */
  updatedContentCount: number;
  /** Current status of the synchronization process */
  status: PlatformSyncStatus;
  /** Error message if synchronization failed, null otherwise */
  error: string | null;
  /** Timestamp when synchronization completed, null if not completed */
  completedAt: Date | null;
}