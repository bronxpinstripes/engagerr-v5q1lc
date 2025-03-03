/**
 * Platform-related type definitions for the Engagerr application.
 * 
 * This file defines the TypeScript interfaces, types, and enums used for platform
 * integrations, representing the connection to various social media platforms,
 * standardization of metrics across platforms, and content mapping functionality.
 */

/**
 * Enum representing the supported social media platforms in the system.
 */
export enum PlatformType {
  YOUTUBE = 'youtube',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin'
}

/**
 * Enum representing the authentication status of a platform connection.
 */
export enum AuthStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  EXPIRED = 'expired',
  REFRESH_FAILED = 'refresh_failed',
  ERROR = 'error',
  PENDING = 'pending'
}

/**
 * Enum representing the synchronization status of content and metrics from a platform.
 */
export enum SyncStatus {
  NEVER_SYNCED = 'never_synced',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  SYNC_FAILED = 'sync_failed',
  SYNC_PARTIAL = 'sync_partial'
}

/**
 * Interface representing a connected social media platform for a creator.
 */
export interface Platform {
  /** Unique identifier for the platform connection */
  id: string;
  
  /** Reference to the creator who owns this platform connection */
  creatorId: string;
  
  /** Type of platform (YouTube, Instagram, etc.) */
  platformType: PlatformType;
  
  /** Username/handle on the platform */
  handle: string;
  
  /** Profile URL on the platform */
  url: string;
  
  /** Current authentication status */
  authStatus: AuthStatus;
  
  /** Current synchronization status */
  syncStatus: SyncStatus;
  
  /** Timestamp of the last successful content/metrics sync */
  lastSyncAt: Date;
  
  /** Timestamp when the current access token expires */
  tokenExpiresAt: Date;
  
  /** Number of followers/subscribers on the platform */
  followers: number;
  
  /** Average engagement rate on the platform */
  engagement: number;
  
  /** Total number of content items on the platform */
  contentCount: number;
  
  /** Whether the account is verified on the platform */
  verified: boolean;
  
  /** Additional platform-specific metadata */
  metadata: Record<string, any>;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Interface representing the OAuth credentials for a platform connection.
 * These credentials are stored securely and not exposed to clients directly.
 */
export interface PlatformCredentials {
  /** OAuth access token */
  accessToken: string;
  
  /** OAuth refresh token */
  refreshToken: string;
  
  /** Token type (typically "Bearer") */
  tokenType: string;
  
  /** Timestamp when the access token expires */
  expiresAt: Date;
  
  /** OAuth scopes granted */
  scope: string;
  
  /** Additional platform-specific data */
  additionalData: Record<string, any>;
}

/**
 * Interface representing aggregated performance metrics for a platform.
 */
export interface PlatformMetrics {
  /** Reference to the platform connection */
  platformId: string;
  
  /** Number of followers/subscribers */
  followers: number;
  
  /** Overall engagement rate */
  engagement: number;
  
  /** Total views/impressions */
  views: number;
  
  /** Total likes/reactions */
  likes: number;
  
  /** Total comments */
  comments: number;
  
  /** Total shares/reposts */
  shares: number;
  
  /** Platform-specific metrics that don't map to standard categories */
  platformSpecificMetrics: Record<string, any>;
  
  /** Start of the period these metrics cover */
  periodStart: Date;
  
  /** End of the period these metrics cover */
  periodEnd: Date;
  
  /** When these metrics were last updated */
  lastUpdated: Date;
}

/**
 * Interface representing a request to connect a new platform for a creator.
 */
export interface PlatformConnectionRequest {
  /** Creator ID requesting the connection */
  creatorId: string;
  
  /** Platform to connect */
  platformType: PlatformType;
  
  /** Authorization code from OAuth flow */
  code: string;
  
  /** Redirect URI used in OAuth flow */
  redirectUri: string;
  
  /** Whether to force reconnection if platform is already connected */
  forceReconnect: boolean;
}

/**
 * Interface representing the response after attempting to connect a platform.
 */
export interface PlatformConnectionResponse {
  /** ID of the created platform connection (if successful) */
  platformId: string;
  
  /** Creator ID */
  creatorId: string;
  
  /** Platform type */
  platformType: PlatformType;
  
  /** Platform handle/username */
  handle: string;
  
  /** Platform profile URL */
  url: string;
  
  /** Connection status */
  status: AuthStatus;
  
  /** When the connection was established */
  connectionTimestamp: Date;
  
  /** When the access token expires */
  expiresAt: Date;
  
  /** Error message if connection failed */
  error: string;
}

/**
 * Interface for options when synchronizing content and metrics from a platform.
 */
export interface PlatformSyncOptions {
  /** Types of content to sync (e.g., "video", "post", "story") */
  contentTypes: string[];
  
  /** Start date for content to sync */
  startDate: Date;
  
  /** End date for content to sync */
  endDate: Date;
  
  /** Maximum number of items to sync */
  limit: number;
  
  /** Whether to include metrics in the sync */
  includeMetrics: boolean;
  
  /** Whether to force a refresh of already synced content */
  forceRefresh: boolean;
}

/**
 * Interface for filtering platform connections in queries.
 */
export interface PlatformFilter {
  /** Filter by platform type */
  platformType: PlatformType;
  
  /** Filter by authentication status */
  authStatus: AuthStatus;
  
  /** Filter by synchronization status */
  syncStatus: SyncStatus;
  
  /** Filter by verification status */
  verified: boolean;
}

/**
 * Interface defining the common adapter methods for all platform integrations.
 * Each supported platform implements this interface to provide a consistent API.
 */
export interface PlatformAdapter {
  /**
   * Connect to the platform using an OAuth authorization code.
   * @param userId The ID of the user connecting their platform account
   * @param code The authorization code from the OAuth flow
   * @param redirectUri The redirect URI used in the OAuth flow
   * @returns Promise resolving to connection result
   */
  connect(userId: string, code: string, redirectUri: string): Promise<PlatformConnectionResponse>;
  
  /**
   * Fetch content items from the platform.
   * @param userId The ID of the user
   * @param options Options for the content fetch
   * @returns Promise resolving to content items
   */
  fetchContent(userId: string, options: PlatformSyncOptions): Promise<any>;
  
  /**
   * Fetch performance metrics from the platform.
   * @param userId The ID of the user
   * @param contentId Optional content ID to fetch metrics for specific content
   * @param options Options for the metrics fetch
   * @returns Promise resolving to metrics data
   */
  fetchMetrics(userId: string, contentId?: string, options?: any): Promise<any>;
  
  /**
   * Fetch audience demographics data from the platform.
   * @param userId The ID of the user
   * @param options Options for the audience data fetch
   * @returns Promise resolving to audience data
   */
  fetchAudience(userId: string, options?: any): Promise<any>;
  
  /**
   * Refresh an expired access token using the refresh token.
   * @param userId The ID of the user
   * @returns Promise resolving to the refreshed credentials
   */
  refreshToken(userId: string): Promise<any>;
  
  /**
   * Disconnect the platform integration.
   * @param userId The ID of the user
   * @returns Promise resolving when disconnection is complete
   */
  disconnect(userId: string): Promise<any>;
}

/**
 * Interface for platform-specific configuration settings.
 */
export interface PlatformConfig {
  /** OAuth client ID */
  clientId: string;
  
  /** OAuth client secret */
  clientSecret: string;
  
  /** OAuth redirect URI */
  redirectUri: string;
  
  /** OAuth scopes to request */
  scopes: string[];
  
  /** Base URL for API requests */
  apiBaseUrl: string;
  
  /** OAuth authorization URL */
  authUrl: string;
  
  /** OAuth token URL */
  tokenUrl: string;
  
  /** Secret for validating webhook signatures */
  webhookSecret: string;
  
  /** Rate limits for different endpoints */
  rateLimit: Record<string, number>;
}

/**
 * Interface for standardization factors used when normalizing metrics across platforms.
 * These factors allow fair comparison of engagement and value across different platforms.
 */
export interface MetricStandardization {
  /** Platform type */
  platform: PlatformType;
  
  /** Weighting factor for engagement metrics */
  engagementWeight: number;
  
  /** Weighting factor for view metrics */
  viewWeight: number;
  
  /** Weighting factor for share metrics */
  shareWeight: number;
  
  /** Weighting factor for comment metrics */
  commentWeight: number;
  
  /** Weighting factor for like metrics */
  likeWeight: number;
  
  /** Platform-specific factor for normalizing engagement rates */
  platformEngagementFactor: number;
  
  /** Platform-specific factor for calculating content value */
  platformValueFactor: number;
  
  /** Mapping of platform-specific metric names to standard metric names */
  metricMappings: Record<string, string>;
}

/**
 * Interface for webhook events received from platforms.
 */
export interface PlatformWebhookEvent {
  /** Platform that sent the webhook */
  platformType: PlatformType;
  
  /** Type of event (e.g., "content.created", "metrics.updated") */
  eventType: string;
  
  /** When the event occurred */
  timestamp: Date;
  
  /** Signature for verifying the webhook */
  signature: string;
  
  /** Event payload data */
  payload: Record<string, any>;
}