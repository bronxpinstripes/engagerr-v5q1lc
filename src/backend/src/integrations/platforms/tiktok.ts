/**
 * TikTok platform adapter for Engagerr
 * 
 * This module implements the TikTok API integration using the adapter pattern,
 * enabling creators to connect their TikTok accounts and synchronize their
 * content, metrics, and audience data within the Engagerr platform.
 * 
 * @module integrations/platforms/tiktok
 */

import axios from 'axios'; // ^1.3.4
import qs from 'qs'; // ^6.11.0
import dayjs from 'dayjs'; // ^1.11.7

import { 
  PlatformAdapter, 
  PlatformType, 
  PlatformConfig, 
  PlatformConnectionRequest, 
  PlatformConnectionResponse, 
  PlatformCredentials, 
  PlatformSyncOptions,
  AuthStatus
} from '../../../types/platform';

import {
  Content,
  ContentType,
  ContentMetrics
} from '../../../types/content';

import { logger } from '../../../utils/logger';
import { 
  ExternalServiceError, 
  RateLimitError 
} from '../../../utils/errors';
import { 
  encryptPlatformToken, 
  decryptPlatformToken 
} from '../../../utils/tokens';
import { supabaseAdmin } from '../../../config/supabase';

/**
 * Current TikTok API version being used
 */
const TIKTOK_API_VERSION = 'v2';

/**
 * Default configuration values for TikTok integration
 */
const TIKTOK_CONFIG: PlatformConfig = {
  clientId: process.env.TIKTOK_CLIENT_ID || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri: process.env.TIKTOK_REDIRECT_URI || 'https://engagerr.app/api/integrations/tiktok/callback',
  scopes: ['user.info.basic', 'video.list', 'video.info'],
  apiBaseUrl: 'https://open.tiktokapis.com',
  authUrl: 'https://www.tiktok.com/auth/authorize/',
  tokenUrl: 'https://open.tiktokapis.com/oauth/token/',
  webhookSecret: process.env.TIKTOK_WEBHOOK_SECRET || '',
  rateLimit: {
    'default': 10000, // 10000 calls per day
    '/user/info/': 100, // 100 calls per hour for user info
    '/video/list/': 500, // 500 calls per hour for video list
    '/video/query/': 1000, // 1000 calls per hour for video query
    '/data/external/': 200, // 200 calls per hour for metrics
    '/audience/': 100 // 100 calls per hour for audience data
  }
};

/**
 * Maps TikTok-specific metrics to standardized platform metrics
 */
const METRIC_MAPPING = {
  // TikTok key → Standard key
  'video_view_count': 'views',
  'total_play': 'views',
  'total_play_duration': 'watchTime',
  'like_count': 'likes',
  'comment_count': 'comments',
  'share_count': 'shares',
  'profile_visit_count': 'profileVisits',
  'total_engagement': 'engagements',
  'video_view_complete_count': 'completedViews',
  'follower_count': 'followers',
  'follower_gain': 'newFollowers',
  'engagement_rate': 'engagementRate',
  'impression_count': 'impressions',
  'average_watch_time': 'avgWatchTime',
  // Add more mappings as needed for comprehensive metric coverage
};

/**
 * TikTok platform adapter implementing the PlatformAdapter interface.
 * Handles all TikTok API interactions including authentication, content retrieval,
 * metrics fetching, and audience data synchronization.
 */
export class TikTokAdapter implements PlatformAdapter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scopes: string[];
  private apiBaseUrl: string;
  private authUrl: string;
  private tokenUrl: string;
  private rateLimits: Record<string, number>;
  private lastRequestTime: Record<string, number> = {};
  private requestCount: Record<string, number> = {};

  /**
   * Creates a new TikTok adapter instance
   * @param config Optional configuration to override default values
   */
  constructor(config?: Partial<PlatformConfig>) {
    this.clientId = config?.clientId || TIKTOK_CONFIG.clientId;
    this.clientSecret = config?.clientSecret || TIKTOK_CONFIG.clientSecret;
    this.redirectUri = config?.redirectUri || TIKTOK_CONFIG.redirectUri;
    this.scopes = config?.scopes || TIKTOK_CONFIG.scopes;
    this.apiBaseUrl = config?.apiBaseUrl || TIKTOK_CONFIG.apiBaseUrl;
    this.authUrl = config?.authUrl || TIKTOK_CONFIG.authUrl;
    this.tokenUrl = config?.tokenUrl || TIKTOK_CONFIG.tokenUrl;
    this.rateLimits = config?.rateLimit || TIKTOK_CONFIG.rateLimit;

    // Initialize tracking objects for rate limiting
    this.lastRequestTime = {};
    this.requestCount = {};

    logger.info({
      message: 'TikTok adapter initialized',
      apiVersion: TIKTOK_API_VERSION
    });
  }

  /**
   * Connects a creator's TikTok account using an OAuth authorization code
   * @param request Connection request with authorization code
   * @returns Promise with connection result
   */
  public async connect(request: PlatformConnectionRequest): Promise<PlatformConnectionResponse> {
    try {
      const { creatorId, code, redirectUri } = request;

      if (!code) {
        throw new Error('Authorization code is required');
      }

      logger.info({
        message: 'Initiating TikTok connection',
        creatorId
      });

      // Exchange authorization code for access token
      const tokenResponse = await axios({
        method: 'post',
        url: this.tokenUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: qs.stringify({
          client_key: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri || this.redirectUri
        })
      });

      // Check for errors in the token response
      if (tokenResponse.data?.error) {
        logger.error({
          message: 'TikTok token exchange failed',
          creatorId,
          error: tokenResponse.data.error,
          description: tokenResponse.data.error_description
        });

        throw new Error(`TikTok token exchange failed: ${tokenResponse.data.error_description || tokenResponse.data.error}`);
      }

      const {
        access_token,
        refresh_token,
        expires_in,
        open_id,
        scope
      } = tokenResponse.data;

      // Calculate token expiration timestamp
      const expiresAt = dayjs().add(expires_in, 'second').toDate();

      // Fetch user profile info using the access token
      const userInfoResponse = await this._callTikTokApi(
        `/oauth/userinfo/`, 
        'get',
        { open_id },
        { 'Authorization': `Bearer ${access_token}` }
      );

      const userInfo = userInfoResponse.data;

      // Store credentials securely
      const credentials: PlatformCredentials = {
        accessToken: encryptPlatformToken(access_token),
        refreshToken: encryptPlatformToken(refresh_token),
        tokenType: 'Bearer',
        expiresAt,
        scope,
        additionalData: {
          openId: open_id,
          displayName: userInfo.display_name,
          profileImage: userInfo.avatar_url,
          unionId: userInfo.union_id,
          followerCount: userInfo.follower_count,
          followingCount: userInfo.following_count,
          verified: userInfo.is_verified
        }
      };

      // Return standardized connection response
      return {
        platformId: open_id, // Using open_id as platform ID
        creatorId,
        platformType: PlatformType.TIKTOK,
        handle: userInfo.display_name,
        url: `https://www.tiktok.com/@${userInfo.display_name}`,
        status: AuthStatus.CONNECTED,
        connectionTimestamp: new Date(),
        expiresAt,
        error: null
      };
    } catch (error) {
      logger.error({
        message: 'TikTok connection failed',
        error: error.message,
        stack: error.stack
      });

      // Return error response
      return {
        platformId: null,
        creatorId: request.creatorId,
        platformType: PlatformType.TIKTOK,
        handle: null,
        url: null,
        status: AuthStatus.ERROR,
        connectionTimestamp: new Date(),
        expiresAt: null,
        error: error.message
      };
    }
  }

  /**
   * Refreshes an expired access token using the refresh token
   * @param creatorId Creator ID
   * @param platformId Platform ID (TikTok open_id)
   * @param credentials Encrypted platform credentials
   * @returns Updated credentials with new access token
   */
  public async refreshToken(
    creatorId: string,
    platformId: string,
    credentials: PlatformCredentials
  ): Promise<PlatformCredentials> {
    try {
      // Decrypt the refresh token
      const refreshToken = decryptPlatformToken(credentials.refreshToken);

      logger.info({
        message: 'Refreshing TikTok access token',
        creatorId,
        platformId,
      });

      // Make token refresh request
      const response = await axios({
        method: 'post',
        url: this.tokenUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: qs.stringify({
          client_key: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      // Check for errors
      if (response.data?.error) {
        logger.error({
          message: 'TikTok token refresh failed',
          creatorId,
          platformId,
          error: response.data.error,
          description: response.data.error_description
        });

        throw new Error(`Token refresh failed: ${response.data.error_description || response.data.error}`);
      }

      const {
        access_token,
        refresh_token: new_refresh_token,
        expires_in,
        open_id,
        scope
      } = response.data;

      // Calculate new expiration timestamp
      const expiresAt = dayjs().add(expires_in, 'second').toDate();

      // Create updated credentials object
      const updatedCredentials: PlatformCredentials = {
        ...credentials,
        accessToken: encryptPlatformToken(access_token),
        refreshToken: encryptPlatformToken(new_refresh_token || refreshToken), // Use new token if provided, otherwise keep existing
        expiresAt,
        scope,
        additionalData: {
          ...credentials.additionalData,
          openId: open_id
        }
      };

      logger.info({
        message: 'TikTok token refreshed successfully',
        creatorId,
        platformId,
        expiresAt
      });

      return updatedCredentials;
    } catch (error) {
      logger.error({
        message: 'Failed to refresh TikTok token',
        creatorId,
        platformId,
        error: error.message,
        stack: error.stack
      });

      throw new ExternalServiceError(
        `Failed to refresh TikTok token: ${error.message}`,
        'TikTok'
      );
    }
  }

  /**
   * Fetches TikTok content for a creator
   * @param creatorId Creator ID
   * @param platformId Platform ID (TikTok open_id)
   * @param credentials Encrypted platform credentials
   * @param options Options for content retrieval
   * @returns Array of standardized content items
   */
  public async fetchContent(
    creatorId: string,
    platformId: string,
    credentials: PlatformCredentials,
    options: PlatformSyncOptions
  ): Promise<Content[]> {
    try {
      // Decrypt access token
      let accessToken = decryptPlatformToken(credentials.accessToken);
      const openId = credentials.additionalData?.openId || platformId;

      // Check if token is expired and refresh if needed
      if (dayjs().isAfter(credentials.expiresAt)) {
        logger.info({
          message: 'TikTok access token expired, refreshing',
          creatorId,
          platformId
        });
        
        const refreshedCredentials = await this.refreshToken(creatorId, platformId, credentials);
        accessToken = decryptPlatformToken(refreshedCredentials.accessToken);
        
        // Update credentials in database
        await supabaseAdmin
          .from('platform_credentials')
          .update({
            credentials: refreshedCredentials,
            updated_at: new Date().toISOString()
          })
          .eq('platform_id', platformId);
      }

      logger.info({
        message: 'Fetching TikTok content',
        creatorId,
        platformId,
        options
      });

      // Set up pagination parameters
      let cursor = 0;
      const limit = 20; // TikTok API default/max limit per page
      let hasMore = true;
      const allVideos = [];

      // Define date filters
      const startDate = options.startDate ? dayjs(options.startDate).unix() : undefined;
      const endDate = options.endDate ? dayjs(options.endDate).unix() : undefined;

      // Fetch videos with pagination
      while (hasMore && (options.limit === undefined || allVideos.length < options.limit)) {
        // Apply rate limiting
        await this._applyRateLimiting('/video/list/');

        // Call TikTok API to get videos list
        const response = await this._callTikTokApi(
          `/vt/api/video/list/`, 
          'get',
          {
            open_id: openId,
            cursor,
            limit
          },
          { 'Authorization': `Bearer ${accessToken}` }
        );

        const { videos, has_more, cursor: nextCursor } = response.data;
        
        // Add fetched videos to our collection
        if (videos && videos.length > 0) {
          allVideos.push(...videos);
        }

        // Update pagination parameters
        hasMore = has_more && videos && videos.length > 0;
        cursor = nextCursor;

        // Stop if we've reached the requested limit
        if (options.limit && allVideos.length >= options.limit) {
          break;
        }
      }

      // Filter videos by date if needed
      let filteredVideos = allVideos;
      if (startDate || endDate) {
        filteredVideos = allVideos.filter(video => {
          const createTime = video.create_time;
          return (!startDate || createTime >= startDate) && 
                 (!endDate || createTime <= endDate);
        });
      }

      // Apply content type filter if specified
      if (options.contentTypes && options.contentTypes.length > 0) {
        const contentTypeMap = {
          'video': true,
          'short_video': true
          // Add more mappings if TikTok adds more content types
        };
        
        const requestedTypes = options.contentTypes.reduce((acc, type) => {
          acc[type.toLowerCase()] = true;
          return acc;
        }, {});
        
        filteredVideos = filteredVideos.filter(video => {
          // Map TikTok content type to our system's content type
          const mappedType = this._mapContentType(
            video.video_type || 'video',
            video.duration || 0
          );
          
          const typeString = mappedType.toLowerCase().replace('_', '');
          return requestedTypes[typeString] || false;
        });
      }

      // Transform TikTok videos to standardized content format
      const standardizedContent: Content[] = await Promise.all(
        filteredVideos.map(async video => {
          // Determine content type based on duration
          const contentType = this._mapContentType(
            video.video_type || 'video',
            video.duration || 0
          );

          // Get detailed metrics for this video if requested
          let metrics = null;
          if (options.includeMetrics) {
            try {
              metrics = await this.fetchMetrics(
                creatorId, 
                platformId, 
                credentials, 
                video.id
              );
            } catch (error) {
              logger.warn({
                message: 'Failed to fetch metrics for video',
                creatorId,
                platformId,
                videoId: video.id,
                error: error.message
              });
            }
          }

          // Create standardized content object
          return {
            id: null, // Will be set by the database
            creatorId,
            platformId,
            externalId: video.id,
            title: video.title || '',
            description: video.video_description || '',
            contentType,
            publishedAt: new Date(video.create_time * 1000),
            url: video.share_url || `https://www.tiktok.com/@${video.author?.uniqueId || credentials.additionalData?.displayName}/video/${video.id}`,
            thumbnail: video.cover_image_url || '',
            views: video.view_count || 0,
            engagements: (video.like_count || 0) + (video.comment_count || 0) + (video.share_count || 0),
            engagementRate: metrics?.engagementRate || 0,
            shares: video.share_count || 0,
            comments: video.comment_count || 0,
            estimatedValue: metrics?.estimatedValue || 0,
            path: null, // Will be set by content mapping service
            metadata: {
              duration: video.duration,
              width: video.width,
              height: video.height,
              videoType: video.video_type,
              hashTags: video.hashtag_names || [],
              soundId: video.music_id,
              soundName: video.music_title,
              soundAuthor: video.music_author,
              isOriginalSound: video.is_original_sound,
              challenges: video.challenge_ids || []
            },
            platform: PlatformType.TIKTOK,
            isRoot: false, // Default, will be determined by content mapping service
            createdAt: new Date(),
            updatedAt: new Date()
          };
        })
      );

      logger.info({
        message: 'TikTok content fetched successfully',
        creatorId,
        platformId,
        count: standardizedContent.length
      });

      return standardizedContent;
    } catch (error) {
      logger.error({
        message: 'Failed to fetch TikTok content',
        creatorId,
        platformId,
        error: error.message,
        stack: error.stack
      });

      throw new ExternalServiceError(
        `Failed to fetch TikTok content: ${error.message}`,
        'TikTok'
      );
    }
  }

  /**
   * Fetches metrics for TikTok content
   * @param creatorId Creator ID
   * @param platformId Platform ID (TikTok open_id)
   * @param credentials Encrypted platform credentials
   * @param contentId Optional specific content ID to fetch metrics for
   * @param options Additional options
   * @returns Standardized content metrics
   */
  public async fetchMetrics(
    creatorId: string,
    platformId: string,
    credentials: PlatformCredentials,
    contentId?: string,
    options?: Record<string, any>
  ): Promise<ContentMetrics> {
    try {
      // Decrypt access token
      let accessToken = decryptPlatformToken(credentials.accessToken);
      const openId = credentials.additionalData?.openId || platformId;

      // Check if token is expired and refresh if needed
      if (dayjs().isAfter(credentials.expiresAt)) {
        const refreshedCredentials = await this.refreshToken(creatorId, platformId, credentials);
        accessToken = decryptPlatformToken(refreshedCredentials.accessToken);
      }

      logger.info({
        message: 'Fetching TikTok metrics',
        creatorId,
        platformId,
        contentId
      });

      // Apply rate limiting
      await this._applyRateLimiting('/data/external/');

      // Determine if we're fetching metrics for a specific video or overall account
      if (contentId) {
        // Get metrics for specific video
        const response = await this._callTikTokApi(
          `/vt/api/data/video/stats/`, 
          'get',
          {
            open_id: openId,
            video_id: contentId
          },
          { 'Authorization': `Bearer ${accessToken}` }
        );

        const videoStats = response.data.stats;

        // Transform to standardized metrics
        const standardizedMetrics: ContentMetrics = this._standardizeMetrics(videoStats);

        return {
          id: null, // Will be set by database
          contentId: contentId,
          ...standardizedMetrics,
          lastUpdated: new Date()
        };
      } else {
        // Get overall account metrics
        const response = await this._callTikTokApi(
          `/vt/api/data/account/stats/`, 
          'get',
          { open_id: openId },
          { 'Authorization': `Bearer ${accessToken}` }
        );

        const accountStats = response.data.stats;

        // Transform to standardized metrics
        const standardizedMetrics = this._standardizeMetrics(accountStats);

        return {
          id: null, // Will be set by database
          contentId: 'account',
          ...standardizedMetrics,
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      logger.error({
        message: 'Failed to fetch TikTok metrics',
        creatorId,
        platformId,
        contentId,
        error: error.message,
        stack: error.stack
      });

      throw new ExternalServiceError(
        `Failed to fetch TikTok metrics: ${error.message}`,
        'TikTok'
      );
    }
  }

  /**
   * Fetches audience demographic data for a TikTok account
   * @param creatorId Creator ID
   * @param platformId Platform ID (TikTok open_id)
   * @param credentials Encrypted platform credentials
   * @param options Additional options
   * @returns Audience demographic data
   */
  public async fetchAudience(
    creatorId: string,
    platformId: string,
    credentials: PlatformCredentials,
    options?: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      // Decrypt access token
      let accessToken = decryptPlatformToken(credentials.accessToken);
      const openId = credentials.additionalData?.openId || platformId;

      // Check if token is expired and refresh if needed
      if (dayjs().isAfter(credentials.expiresAt)) {
        const refreshedCredentials = await this.refreshToken(creatorId, platformId, credentials);
        accessToken = decryptPlatformToken(refreshedCredentials.accessToken);
      }

      logger.info({
        message: 'Fetching TikTok audience data',
        creatorId,
        platformId
      });

      // Apply rate limiting
      await this._applyRateLimiting('/audience/');

      // Fetch gender demographics
      const genderResponse = await this._callTikTokApi(
        `/vt/api/data/audience/gender/`, 
        'get',
        { open_id: openId },
        { 'Authorization': `Bearer ${accessToken}` }
      );

      // Fetch age demographics
      const ageResponse = await this._callTikTokApi(
        `/vt/api/data/audience/age/`, 
        'get',
        { open_id: openId },
        { 'Authorization': `Bearer ${accessToken}` }
      );

      // Fetch country demographics
      const countryResponse = await this._callTikTokApi(
        `/vt/api/data/audience/country/`, 
        'get',
        { open_id: openId },
        { 'Authorization': `Bearer ${accessToken}` }
      );

      // Transform and standardize demographic data
      const genderDistribution = genderResponse.data.audience_gender || {};
      const ageDistribution = ageResponse.data.audience_age || {};
      const countryDistribution = countryResponse.data.audience_country || {};

      // Create standardized audience data object
      const audienceData = {
        demographics: {
          gender: {
            male: genderDistribution.male || 0,
            female: genderDistribution.female || 0,
            other: genderDistribution.other || 0
          },
          age: {
            '13-17': ageDistribution['13-17'] || 0,
            '18-24': ageDistribution['18-24'] || 0,
            '25-34': ageDistribution['25-34'] || 0,
            '35-44': ageDistribution['35-44'] || 0,
            '45-54': ageDistribution['45-54'] || 0,
            '55+': ageDistribution['55+'] || 0
          },
          geography: Object.entries(countryDistribution).reduce((acc, [country, value]) => {
            acc[country] = value;
            return acc;
          }, {})
        },
        // Include additional audience data if available
        engagement: {
          averageEngagementRate: credentials.additionalData?.engagementRate || 0,
          // Add more engagement metrics if available
        },
        updatedAt: new Date(),
        source: PlatformType.TIKTOK,
        // Include raw TikTok data for debugging or additional processing
        rawData: {
          gender: genderDistribution,
          age: ageDistribution,
          country: countryDistribution
        }
      };

      logger.info({
        message: 'TikTok audience data fetched successfully',
        creatorId,
        platformId
      });

      return audienceData;
    } catch (error) {
      logger.error({
        message: 'Failed to fetch TikTok audience data',
        creatorId,
        platformId,
        error: error.message,
        stack: error.stack
      });

      throw new ExternalServiceError(
        `Failed to fetch TikTok audience data: ${error.message}`,
        'TikTok'
      );
    }
  }

  /**
   * Disconnects a creator's TikTok account and revokes API access
   * @param creatorId Creator ID
   * @param platformId Platform ID (TikTok open_id)
   * @param credentials Encrypted platform credentials
   * @returns Boolean indicating success
   */
  public async disconnect(
    creatorId: string,
    platformId: string,
    credentials: PlatformCredentials
  ): Promise<boolean> {
    try {
      // Decrypt access token
      const accessToken = decryptPlatformToken(credentials.accessToken);
      const openId = credentials.additionalData?.openId || platformId;

      logger.info({
        message: 'Disconnecting TikTok account',
        creatorId,
        platformId
      });

      // Call TikTok API to revoke token
      await this._callTikTokApi(
        `/oauth/revoke/`, 
        'post',
        {
          open_id: openId,
          access_token: accessToken
        },
        { 'Content-Type': 'application/x-www-form-urlencoded' }
      );

      logger.info({
        message: 'TikTok account disconnected successfully',
        creatorId,
        platformId
      });

      return true;
    } catch (error) {
      logger.error({
        message: 'Failed to disconnect TikTok account',
        creatorId,
        platformId,
        error: error.message,
        stack: error.stack
      });

      // Return false but don't throw - allow disconnect to proceed even if revoke fails
      return false;
    }
  }

  /**
   * Makes an API call to TikTok with rate limiting and error handling
   * @param endpoint API endpoint path
   * @param method HTTP method (get, post, etc.)
   * @param params Query parameters
   * @param headers HTTP headers
   * @param data Request body data
   * @returns API response
   * @private
   */
  private async _callTikTokApi(
    endpoint: string,
    method: string = 'get',
    params: Record<string, any> = {},
    headers: Record<string, any> = {},
    data: any = null
  ): Promise<any> {
    try {
      // Apply rate limiting before making request
      await this._applyRateLimiting(endpoint);

      // Build request URL and options
      const url = `${this.apiBaseUrl}${endpoint}`;
      
      // Default headers
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Make request to TikTok API
      const response = await axios({
        method,
        url,
        params,
        headers: requestHeaders,
        data,
        timeout: 30000 // 30 seconds timeout
      });

      // Check for errors in response
      if (response.data?.error) {
        throw new Error(`TikTok API error: ${response.data.error.message || response.data.error}`);
      }

      // Update rate limit tracking from response headers if available
      if (response.headers['x-ratelimit-remaining']) {
        const remaining = parseInt(response.headers['x-ratelimit-remaining'], 10);
        const reset = parseInt(response.headers['x-ratelimit-reset'], 10);
        
        // Update tracking in memory for this endpoint
        const endpointKey = endpoint.split('?')[0]; // Remove query params
        this.requestCount[endpointKey] = this.rateLimits[endpointKey] - remaining;
        
        logger.debug({
          message: 'TikTok API rate limit update',
          endpoint: endpointKey,
          remaining,
          reset,
          requestCount: this.requestCount[endpointKey]
        });
      }

      return response;
    } catch (error) {
      // Handle rate limiting errors
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'], 10) || 60;
        
        logger.warn({
          message: 'TikTok API rate limit exceeded',
          endpoint,
          retryAfter
        });
        
        throw new RateLimitError(
          `TikTok API rate limit exceeded`,
          retryAfter,
          { endpoint }
        );
      }
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        logger.error({
          message: 'TikTok API authentication error',
          endpoint,
          error: error.message
        });
        
        throw new Error('TikTok authentication failed: token may be invalid or expired');
      }
      
      // Handle other API errors
      if (error.response?.data?.error) {
        logger.error({
          message: 'TikTok API error',
          endpoint,
          error: error.response.data.error,
          description: error.response.data.error_description
        });
        
        throw new Error(`TikTok API error: ${error.response.data.error_description || error.response.data.error}`);
      }
      
      // Handle network or other errors
      logger.error({
        message: 'TikTok API call failed',
        endpoint,
        error: error.message,
        stack: error.stack
      });
      
      throw new ExternalServiceError(
        `TikTok API call failed: ${error.message}`,
        'TikTok'
      );
    }
  }

  /**
   * Enforces rate limits for TikTok API endpoints
   * @param endpoint API endpoint being called
   * @private
   */
  private async _applyRateLimiting(endpoint: string): Promise<void> {
    // Get base endpoint path for rate limit lookup
    const endpointKey = Object.keys(this.rateLimits).find(key => endpoint.includes(key)) || 'default';
    const limit = this.rateLimits[endpointKey];
    
    // If no tracking exists for this endpoint yet, initialize it
    if (!this.requestCount[endpointKey]) {
      this.requestCount[endpointKey] = 0;
      this.lastRequestTime[endpointKey] = Date.now();
    }
    
    // Calculate time since last request
    const now = Date.now();
    const timeSinceLastRequest = now - (this.lastRequestTime[endpointKey] || 0);
    
    // Reset count if more than an hour has passed (TikTok's rate limits are typically hourly)
    if (timeSinceLastRequest > 3600000) { // 1 hour in milliseconds
      this.requestCount[endpointKey] = 0;
      this.lastRequestTime[endpointKey] = now;
      return;
    }
    
    // Check if we've exceeded the rate limit
    if (this.requestCount[endpointKey] >= limit) {
      // Calculate delay needed (until the hour resets)
      const resetTime = 3600000 - timeSinceLastRequest;
      
      logger.warn({
        message: 'TikTok rate limit reached, applying backoff',
        endpoint: endpointKey,
        limit,
        currentCount: this.requestCount[endpointKey],
        backoffMs: resetTime
      });
      
      // Wait for rate limit to reset or use a minimum backoff time
      const backoffTime = Math.max(resetTime, 1000); // At least 1 second
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      
      // Reset tracking after waiting
      this.requestCount[endpointKey] = 0;
      this.lastRequestTime[endpointKey] = Date.now();
    } else {
      // Increment request count
      this.requestCount[endpointKey]++;
      this.lastRequestTime[endpointKey] = now;
    }
  }

  /**
   * Maps TikTok content types to standardized ContentType enum
   * @param tiktokContentType Original TikTok content type
   * @param duration Content duration in seconds
   * @returns Mapped ContentType
   * @private
   */
  private _mapContentType(tiktokContentType: string, duration: number): ContentType {
    // TikTok currently only has video content, but we differentiate between
    // standard videos and short-form content based on duration
    if (tiktokContentType.toLowerCase().includes('video')) {
      // Consider videos under 60 seconds as short videos (similar to Shorts, Reels)
      return duration <= 60 ? ContentType.SHORT_VIDEO : ContentType.VIDEO;
    }
    
    // Default to VIDEO for any unknown types
    return ContentType.VIDEO;
  }

  /**
   * Standardizes TikTok-specific metrics to platform-agnostic format
   * @param tiktokMetrics Original metrics from TikTok API
   * @returns Standardized metrics
   * @private
   */
  private _standardizeMetrics(tiktokMetrics: Record<string, any>): ContentMetrics {
    // Initialize standardized metrics object
    const standardized: Partial<ContentMetrics> = {
      views: 0,
      engagements: 0,
      engagementRate: 0,
      shares: 0,
      comments: 0,
      likes: 0,
      watchTime: 0,
      estimatedValue: 0,
      platformSpecificMetrics: {},
      lastUpdated: new Date()
    };
    
    // Map TikTok metrics to standard metrics using METRIC_MAPPING
    Object.entries(tiktokMetrics).forEach(([key, value]) => {
      const standardKey = METRIC_MAPPING[key];
      if (standardKey && standardized.hasOwnProperty(standardKey)) {
        standardized[standardKey] = value;
      } else {
        // Store unmapped metrics in platformSpecificMetrics
        standardized.platformSpecificMetrics[key] = value;
      }
    });
    
    // Calculate engagement total if not provided
    if (!standardized.engagements && (standardized.likes || standardized.comments || standardized.shares)) {
      standardized.engagements = (standardized.likes || 0) + 
                               (standardized.comments || 0) + 
                               (standardized.shares || 0);
    }
    
    // Calculate engagement rate if not provided
    if (!standardized.engagementRate && standardized.engagements && standardized.views) {
      standardized.engagementRate = (standardized.engagements / standardized.views) * 100;
    }
    
    // Calculate estimated content value
    // This is a platform-specific formula based on engagement value
    const BASE_CPM = 5.0; // Base cost per thousand views
    const ENGAGEMENT_MULTIPLIER = 1.5; // Multiplier for high engagement
    
    if (standardized.views) {
      const viewValue = (standardized.views / 1000) * BASE_CPM;
      const engagementBoost = standardized.engagementRate > 5 ? ENGAGEMENT_MULTIPLIER : 1;
      standardized.estimatedValue = viewValue * engagementBoost;
    }
    
    return standardized as ContentMetrics;
  }
}