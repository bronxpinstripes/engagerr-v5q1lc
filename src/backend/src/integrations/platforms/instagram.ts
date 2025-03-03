/**
 * Instagram platform adapter for the Engagerr platform.
 * Implements the PlatformAdapter interface to integrate with the Instagram Graph API,
 * providing authentication, content retrieval, and analytics data standardization.
 */

import axios from 'axios'; // v1.5.0
import { 
  PlatformType, 
  PlatformAdapter, 
  AuthResult,
  ContentResult,
  MetricsResult,
  AudienceResult
} from '../../types/platform';
import { ContentType } from '../../types/content';
import { logger } from '../../utils/logger';
import { encryptToken, decryptToken } from '../../security/encryption';
import { RateLimiter } from '../../middlewares/rateLimit';
import { INSTAGRAM_API_CONFIG } from '../../config/constants';

/**
 * Adapter for integrating with Instagram Graph API to retrieve creator content and analytics data.
 * Implements the PlatformAdapter interface to provide a consistent API across all platform integrations.
 */
export class InstagramAdapter implements PlatformAdapter {
  private apiClient: axios.AxiosInstance;
  private rateLimiter: RateLimiter;
  private readonly API_BASE_URL: string;
  private readonly GRAPH_API_VERSION: string;
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;
  private readonly REDIRECT_URI: string;
  private readonly SCOPES: string[];

  /**
   * Initialize the Instagram adapter with API configuration from environment
   */
  constructor() {
    // Initialize API configuration from constants
    this.API_BASE_URL = INSTAGRAM_API_CONFIG.BASE_URL;
    this.GRAPH_API_VERSION = INSTAGRAM_API_CONFIG.API_VERSION;
    this.CLIENT_ID = INSTAGRAM_API_CONFIG.CLIENT_ID;
    this.CLIENT_SECRET = INSTAGRAM_API_CONFIG.CLIENT_SECRET;
    this.REDIRECT_URI = INSTAGRAM_API_CONFIG.REDIRECT_URI;
    this.SCOPES = INSTAGRAM_API_CONFIG.SCOPES;

    // Initialize axios client for API requests
    this.apiClient = axios.create({
      baseURL: this.API_BASE_URL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Initialize rate limiter for Instagram API calls
    this.rateLimiter = new RateLimiter('instagram', {
      points: INSTAGRAM_API_CONFIG.RATE_LIMIT.DEFAULT,
      duration: 60 * 60, // 1 hour in seconds
    });

    // Add response interceptor to handle rate limits
    this.apiClient.interceptors.response.use(
      response => response,
      async error => {
        if (error.response && error.response.status === 429) {
          logger.warn({
            message: 'Instagram API rate limit exceeded',
            retryAfter: error.response.headers['retry-after'] || 60
          });
          
          // Extract retry-after header if available
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
        }
        throw error;
      }
    );
  }

  /**
   * Generate OAuth URL and handle authentication flow for connecting a creator's Instagram account
   * @param userId User ID requesting the connection
   * @param code Authorization code from OAuth flow
   * @param redirectUri Redirect URI used in OAuth flow
   * @returns Authentication result with access token and refresh token
   */
  async connect(userId: string, code: string, redirectUri: string): Promise<AuthResult> {
    try {
      logger.info({
        message: 'Initiating Instagram connection',
        userId
      });

      // Use provided redirectUri or fall back to configured one
      const actualRedirectUri = redirectUri || this.REDIRECT_URI;

      // Exchange authorization code for access token
      const tokenResponse = await this.apiClient.post(
        `https://api.instagram.com/oauth/access_token`,
        {
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          grant_type: 'authorization_code',
          redirect_uri: actualRedirectUri,
          code
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (!tokenResponse.data || !tokenResponse.data.access_token) {
        throw new Error('Invalid token response from Instagram');
      }

      const shortLivedToken = tokenResponse.data.access_token;
      const userId = tokenResponse.data.user_id;

      // Exchange short-lived token for long-lived token
      const longLivedTokenResponse = await this.apiClient.get(
        `https://graph.instagram.com/access_token`,
        {
          params: {
            grant_type: 'ig_exchange_token',
            client_secret: this.CLIENT_SECRET,
            access_token: shortLivedToken
          }
        }
      );

      if (!longLivedTokenResponse.data || !longLivedTokenResponse.data.access_token) {
        throw new Error('Failed to exchange for long-lived token');
      }

      const accessToken = longLivedTokenResponse.data.access_token;
      const expiresIn = longLivedTokenResponse.data.expires_in || 5184000; // Default 60 days in seconds
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Get basic account information to verify successful connection
      const userInfoResponse = await this.apiClient.get(
        `https://graph.instagram.com/me`,
        {
          params: {
            fields: 'id,username,account_type',
            access_token: accessToken
          }
        }
      );

      if (!userInfoResponse.data || !userInfoResponse.data.id) {
        throw new Error('Failed to retrieve Instagram account information');
      }

      const handle = userInfoResponse.data.username;
      const accountType = userInfoResponse.data.account_type;

      // Encrypt tokens for secure storage
      const encryptedTokenData = await encryptToken(JSON.stringify({
        accessToken,
        expiresAt,
        instagramUserId: userId
      }), { userId });

      logger.info({
        message: 'Instagram connection successful',
        userId,
        instagramUserId: userId,
        handle,
        accountType
      });

      // Return authentication result
      return {
        platformType: PlatformType.INSTAGRAM,
        accessToken: encryptedTokenData, // Store encrypted token data
        tokenExpiresAt: expiresAt,
        refreshToken: null, // Instagram doesn't use refresh tokens in the same way
        platformUserId: userId.toString(),
        platformUserName: handle,
        platformUserUrl: `https://instagram.com/${handle}`,
        profileImageUrl: null, // Would require additional API call to get profile image
        status: 'connected',
        metadata: {
          accountType
        }
      };
    } catch (error) {
      logger.error({
        message: 'Instagram connection failed',
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to connect Instagram account: ${error.message}`);
    }
  }

  /**
   * Retrieve content items from a creator's Instagram account
   * @param userId User ID of the creator
   * @param options Options for content fetching including pagination and filters
   * @returns Standardized content data from Instagram
   */
  async fetchContent(userId: string, options: any = {}): Promise<ContentResult> {
    try {
      // Get and decrypt Instagram tokens
      const tokenData = await this.getDecryptedTokens(userId);
      const { accessToken, instagramUserId } = tokenData;

      // Apply rate limiting
      await this.handleRateLimiting(async () => true);

      logger.info({
        message: 'Fetching Instagram content',
        userId,
        instagramUserId,
        options
      });

      // Default options for content fetching
      const limit = options.limit || 25;
      const contentTypes = options.contentTypes || ['MEDIA']; // Default fetch all media
      
      // Handle pagination
      const after = options.after || null;
      
      // Build fields parameter based on what we need
      const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{id,media_type,media_url,thumbnail_url}';
      
      // Fetch media from Instagram Graph API
      const mediaResponse = await this.apiClient.get(
        `https://graph.instagram.com/${instagramUserId}/media`,
        {
          params: {
            access_token: accessToken,
            fields,
            limit,
            after
          }
        }
      );

      if (!mediaResponse.data || !mediaResponse.data.data) {
        throw new Error('Invalid response from Instagram media endpoint');
      }

      // Transform Instagram media data to our standardized format
      const transformedContent = this.transformContent(mediaResponse.data.data);
      
      // Prepare pagination info
      const paging = mediaResponse.data.paging || {};
      const nextCursor = paging.cursors?.after || null;
      const hasPrevious = !!paging.previous;
      const hasNext = !!paging.next;

      logger.info({
        message: 'Instagram content fetched successfully',
        userId,
        contentCount: transformedContent.length,
        hasNext
      });

      // Return standardized content result
      return {
        items: transformedContent,
        pagination: {
          hasNext,
          hasPrevious,
          nextCursor,
          total: null // Instagram API doesn't provide total count
        },
        platform: PlatformType.INSTAGRAM
      };
    } catch (error) {
      logger.error({
        message: 'Failed to fetch Instagram content',
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to fetch Instagram content: ${error.message}`);
    }
  }

  /**
   * Retrieve performance metrics for Instagram content
   * @param userId User ID of the creator
   * @param contentId Optional specific content ID to fetch metrics for
   * @param options Options for metrics fetching including date ranges
   * @returns Standardized metrics data from Instagram
   */
  async fetchMetrics(userId: string, contentId?: string, options: any = {}): Promise<MetricsResult> {
    try {
      // Get and decrypt Instagram tokens
      const tokenData = await this.getDecryptedTokens(userId);
      const { accessToken, instagramUserId } = tokenData;

      // Apply rate limiting
      await this.handleRateLimiting(async () => true);

      logger.info({
        message: 'Fetching Instagram metrics',
        userId,
        contentId: contentId || 'all',
        options
      });

      let metricsData;

      if (contentId) {
        // Fetch metrics for specific content
        metricsData = await this.getMediaInsights(accessToken, contentId);
      } else {
        // Fetch account-level metrics
        const accountInsights = await this.apiClient.get(
          `https://graph.instagram.com/${instagramUserId}/insights`,
          {
            params: {
              metric: 'impressions,reach,profile_views',
              period: 'day',
              access_token: accessToken
            }
          }
        );

        if (!accountInsights.data || !accountInsights.data.data) {
          throw new Error('Invalid response from Instagram insights endpoint');
        }

        metricsData = accountInsights.data.data;
      }

      // Transform Instagram metrics to standardized format
      const standardizedMetrics = this.transformMetrics(metricsData);

      logger.info({
        message: 'Instagram metrics fetched successfully',
        userId,
        contentId: contentId || 'all',
        metricsCount: standardizedMetrics ? Object.keys(standardizedMetrics).length : 0
      });

      // Return standardized metrics result
      return {
        metrics: standardizedMetrics,
        platform: PlatformType.INSTAGRAM,
        contentId,
        period: options.period || 'lifetime',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error({
        message: 'Failed to fetch Instagram metrics',
        userId,
        contentId: contentId || 'all',
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to fetch Instagram metrics: ${error.message}`);
    }
  }

  /**
   * Retrieve audience demographic data for an Instagram account
   * @param userId User ID of the creator
   * @param options Options for audience data fetching
   * @returns Standardized audience data from Instagram
   */
  async fetchAudience(userId: string, options: any = {}): Promise<AudienceResult> {
    try {
      // Get and decrypt Instagram tokens
      const tokenData = await this.getDecryptedTokens(userId);
      const { accessToken, instagramUserId } = tokenData;

      // Apply rate limiting
      await this.handleRateLimiting(async () => true);

      logger.info({
        message: 'Fetching Instagram audience data',
        userId,
        options
      });

      // Fetch audience insights - Note: Only business accounts have access to this data
      const audienceResponse = await this.apiClient.get(
        `https://graph.instagram.com/${instagramUserId}/insights`,
        {
          params: {
            metric: 'audience_gender,audience_country,audience_city,audience_age',
            period: 'lifetime',
            access_token: accessToken
          }
        }
      );

      if (!audienceResponse.data || !audienceResponse.data.data) {
        throw new Error('Invalid response from Instagram audience endpoint or insufficient permissions');
      }

      // Transform Instagram audience data to standardized format
      const transformedAudience = this.transformAudience(audienceResponse.data.data);

      logger.info({
        message: 'Instagram audience data fetched successfully',
        userId
      });

      // Return standardized audience result
      return {
        demographics: transformedAudience,
        platform: PlatformType.INSTAGRAM,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      // Special handling for audience data which might not be available
      if (error.response && error.response.status === 403) {
        logger.warn({
          message: 'Instagram audience data not available - account may not be business/creator account',
          userId
        });
        
        // Return empty demographic data with explanation
        return {
          demographics: {
            ageRanges: {},
            genderDistribution: {},
            geographicDistribution: {},
            interests: {},
            error: 'Audience data not available for this account type'
          },
          platform: PlatformType.INSTAGRAM,
          lastUpdated: new Date().toISOString()
        };
      }
      
      logger.error({
        message: 'Failed to fetch Instagram audience data',
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to fetch Instagram audience data: ${error.message}`);
    }
  }

  /**
   * Refresh the Instagram access token when approaching expiration
   * @param userId User ID of the creator
   * @returns Updated authentication result with new token
   */
  async refreshToken(userId: string): Promise<AuthResult> {
    try {
      // Get and decrypt Instagram tokens
      const tokenData = await this.getDecryptedTokens(userId);
      const { accessToken, instagramUserId } = tokenData;

      logger.info({
        message: 'Refreshing Instagram token',
        userId
      });

      // Instagram uses long-lived tokens that can be refreshed before expiry
      const refreshResponse = await this.apiClient.get(
        `https://graph.instagram.com/refresh_access_token`,
        {
          params: {
            grant_type: 'ig_refresh_token',
            access_token: accessToken
          }
        }
      );

      if (!refreshResponse.data || !refreshResponse.data.access_token) {
        throw new Error('Invalid token refresh response from Instagram');
      }

      const newAccessToken = refreshResponse.data.access_token;
      const expiresIn = refreshResponse.data.expires_in || 5184000; // Default 60 days in seconds
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Encrypt tokens for secure storage
      const encryptedTokenData = await encryptToken(JSON.stringify({
        accessToken: newAccessToken,
        expiresAt,
        instagramUserId
      }), { userId });

      logger.info({
        message: 'Instagram token refreshed successfully',
        userId,
        expiresAt
      });

      // Get account info to ensure token validity
      const userInfoResponse = await this.apiClient.get(
        `https://graph.instagram.com/me`,
        {
          params: {
            fields: 'id,username',
            access_token: newAccessToken
          }
        }
      );

      const handle = userInfoResponse.data.username;

      // Return updated auth result
      return {
        platformType: PlatformType.INSTAGRAM,
        accessToken: encryptedTokenData,
        tokenExpiresAt: expiresAt,
        refreshToken: null,
        platformUserId: instagramUserId.toString(),
        platformUserName: handle,
        platformUserUrl: `https://instagram.com/${handle}`,
        profileImageUrl: null,
        status: 'connected',
        metadata: {}
      };
    } catch (error) {
      logger.error({
        message: 'Failed to refresh Instagram token',
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to refresh Instagram token: ${error.message}`);
    }
  }

  /**
   * Disconnect Instagram integration and revoke access
   * @param userId User ID of the creator
   * @returns Success status of disconnection
   */
  async disconnect(userId: string): Promise<boolean> {
    try {
      // Get and decrypt Instagram tokens
      const tokenData = await this.getDecryptedTokens(userId);
      const { accessToken } = tokenData;

      logger.info({
        message: 'Disconnecting Instagram account',
        userId
      });

      // Delete access token by sending a DELETE request to the Graph API
      await this.apiClient.delete(
        `https://graph.instagram.com/me/permissions`,
        {
          params: {
            access_token: accessToken
          }
        }
      );

      logger.info({
        message: 'Instagram account disconnected successfully',
        userId
      });

      return true;
    } catch (error) {
      logger.error({
        message: 'Failed to disconnect Instagram account',
        userId,
        error: error.message,
        stack: error.stack
      });
      
      // Even if token revocation fails, we should signal success to remove local credentials
      return true;
    }
  }

  /**
   * Helper method to retrieve and decrypt stored Instagram tokens
   * @param userId User ID of the creator
   * @returns Decrypted token data
   */
  private async getDecryptedTokens(userId: string): Promise<any> {
    try {
      // Note: In a real implementation, this would retrieve the encrypted token from a database
      // For this example, we'll assume the token is passed in directly
      // The actual token retrieval logic would be implemented in a service layer
      
      // This is a placeholder for token retrieval
      const encryptedTokens = "placeholder_for_encrypted_tokens";
      
      // Decrypt the tokens
      const decryptedData = await decryptToken(encryptedTokens, { userId });
      const tokenData = JSON.parse(decryptedData);
      
      // Validate token data
      if (!tokenData.accessToken) {
        throw new Error('Invalid token data for Instagram');
      }
      
      // Check if token is expired
      const expiresAt = new Date(tokenData.expiresAt);
      if (expiresAt < new Date()) {
        throw new Error('Instagram token has expired');
      }
      
      return tokenData;
    } catch (error) {
      logger.error({
        message: 'Failed to decrypt Instagram tokens',
        userId,
        error: error.message
      });
      throw new Error(`Token retrieval failed: ${error.message}`);
    }
  }

  /**
   * Map Instagram content types to standardized ContentType enum
   * @param instagramMediaType Media type from Instagram API
   * @param metadata Additional metadata to help determine content type
   * @returns Standardized ContentType
   */
  private mapContentType(instagramMediaType: string, metadata: any = {}): ContentType {
    switch (instagramMediaType) {
      case 'IMAGE':
        return metadata.is_story ? ContentType.STORY : ContentType.PHOTO;
      case 'VIDEO':
        if (metadata.is_reel) {
          return ContentType.SHORT_VIDEO;
        } else if (metadata.is_story) {
          return ContentType.STORY;
        } else {
          return ContentType.VIDEO;
        }
      case 'CAROUSEL_ALBUM':
        return ContentType.CAROUSEL;
      default:
        return ContentType.OTHER;
    }
  }

  /**
   * Transform Instagram content data to standardized format
   * @param instagramData Array of media items from Instagram API
   * @returns Array of standardized content items
   */
  private transformContent(instagramData: any[]): any[] {
    if (!Array.isArray(instagramData)) {
      return [];
    }

    return instagramData.map(item => {
      // Determine content type with additional context
      const metadata = {
        is_reel: item.media_url?.includes('reels') || false,
        is_story: !!item.story_id,
        has_children: !!item.children?.data?.length
      };

      const contentType = this.mapContentType(item.media_type, metadata);

      // Create standardized content object
      const standardizedContent = {
        id: item.id,
        externalId: item.id,
        title: item.caption?.substring(0, 100) || '',
        description: item.caption || '',
        contentType,
        publishedAt: item.timestamp,
        url: item.permalink,
        thumbnail: item.thumbnail_url || item.media_url,
        mediaUrl: item.media_url,
        platform: PlatformType.INSTAGRAM,
        metrics: {
          views: null, // Not provided by default API
          likes: null, // Not provided by default API
          comments: null, // Not provided by default API
          shares: null, // Not provided by default API
          engagement: null // Not provided by default API
        },
        metadata: {
          username: item.username,
          mediaType: item.media_type,
          isReel: metadata.is_reel,
          isStory: metadata.is_story
        }
      };

      // Handle carousel children if present
      if (item.children && item.children.data && item.children.data.length) {
        standardizedContent.metadata.childrenCount = item.children.data.length;
        standardizedContent.metadata.children = item.children.data.map((child: any) => ({
          id: child.id,
          mediaType: child.media_type,
          mediaUrl: child.media_url,
          thumbnail: child.thumbnail_url || child.media_url
        }));
      }

      return standardizedContent;
    });
  }

  /**
   * Transform Instagram metrics data to standardized format
   * @param instagramMetrics Metrics data from Instagram API
   * @returns Standardized metrics object
   */
  private transformMetrics(instagramMetrics: any): any {
    if (!instagramMetrics) {
      return null;
    }

    // Initialize standard metrics object
    const standardMetrics: any = {
      views: 0,
      impressions: 0,
      reach: 0,
      engagement: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      engagementRate: 0,
      platformSpecific: {}
    };

    // Process array of metrics
    if (Array.isArray(instagramMetrics)) {
      instagramMetrics.forEach(metric => {
        const name = metric.name;
        let value = 0;

        // Extract value based on response format
        if (metric.values && metric.values.length > 0) {
          value = metric.values[0].value || 0;
        }

        // Map Instagram metrics to standard metrics
        switch (name) {
          case 'impressions':
            standardMetrics.impressions = value;
            standardMetrics.views = value; // Use impressions for views
            break;
          case 'reach':
            standardMetrics.reach = value;
            break;
          case 'engagement':
          case 'total_interactions':
            standardMetrics.engagement = value;
            break;
          case 'likes':
          case 'like_count':
            standardMetrics.likes = value;
            break;
          case 'comments':
          case 'comment_count':
            standardMetrics.comments = value;
            break;
          case 'saves':
          case 'saved':
            standardMetrics.saves = value;
            break;
          case 'shares':
          case 'shares_count':
            standardMetrics.shares = value;
            break;
          default:
            // Store other metrics in platformSpecific
            standardMetrics.platformSpecific[name] = value;
        }
      });
    }

    // Calculate engagement as sum of likes, comments, saves, and shares if not provided directly
    if (standardMetrics.engagement === 0) {
      standardMetrics.engagement = 
        standardMetrics.likes + 
        standardMetrics.comments + 
        standardMetrics.saves + 
        standardMetrics.shares;
    }

    // Calculate engagement rate
    if (standardMetrics.reach > 0) {
      standardMetrics.engagementRate = (standardMetrics.engagement / standardMetrics.reach) * 100;
    }

    return standardMetrics;
  }

  /**
   * Transform Instagram audience data to standardized format
   * @param instagramAudience Audience data from Instagram API
   * @returns Standardized audience demographics
   */
  private transformAudience(instagramAudience: any): any {
    const standardAudience = {
      ageRanges: {},
      genderDistribution: {},
      geographicDistribution: {},
      interests: {}
    };

    if (!instagramAudience || !Array.isArray(instagramAudience)) {
      return standardAudience;
    }

    instagramAudience.forEach(metric => {
      const name = metric.name;
      const values = metric.values && metric.values.length > 0 ? metric.values[0].value : null;

      if (!values) return;

      switch (name) {
        case 'audience_gender':
          // Transform gender data
          Object.entries(values).forEach(([gender, percentage]) => {
            standardAudience.genderDistribution[gender] = percentage;
          });
          break;

        case 'audience_age':
          // Transform age range data
          Object.entries(values).forEach(([ageRange, percentage]) => {
            standardAudience.ageRanges[ageRange] = percentage;
          });
          break;

        case 'audience_country':
          // Transform country data
          standardAudience.geographicDistribution.countries = {};
          Object.entries(values).forEach(([country, percentage]) => {
            standardAudience.geographicDistribution.countries[country] = percentage;
          });
          break;

        case 'audience_city':
          // Transform city data
          standardAudience.geographicDistribution.cities = {};
          Object.entries(values).forEach(([city, percentage]) => {
            standardAudience.geographicDistribution.cities[city] = percentage;
          });
          break;

        default:
          // Store any other demographics
          standardAudience[name] = values;
      }
    });

    return standardAudience;
  }

  /**
   * Handle rate limiting for Instagram API requests with exponential backoff
   * @param apiCall Function that makes the API call
   * @returns Result of the API call
   */
  private async handleRateLimiting<T>(apiCall: () => Promise<T>): Promise<T> {
    const maxRetries = 3;
    let retries = 0;
    let lastError: any;

    while (retries <= maxRetries) {
      try {
        // Check if we're within rate limits using the rate limiter
        await this.rateLimiter.consume('instagram-api', 1);
        
        // Execute the API call
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        // If this is a rate limit error, wait before retrying
        if (error.message && error.message.includes('rate limit')) {
          const retryAfter = parseInt(error.retryAfter || '60', 10);
          const backoffTime = retryAfter * 1000 * Math.pow(2, retries);
          
          logger.warn({
            message: `Instagram API rate limit exceeded, retrying after backoff`,
            retries,
            backoffTime: `${backoffTime}ms`
          });
          
          // Wait for the backoff period
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          retries++;
        } else {
          // For non-rate-limit errors, rethrow immediately
          throw error;
        }
      }
    }
    
    // If we've exhausted all retries
    logger.error({
      message: 'Instagram API request failed after maximum retries',
      retries,
      error: lastError.message
    });
    
    throw lastError;
  }

  /**
   * Fetch insights for a specific media item
   * @param accessToken Instagram access token
   * @param mediaId Media ID to get insights for
   * @returns Media insights data
   */
  private async getMediaInsights(accessToken: string, mediaId: string): Promise<any> {
    try {
      const insightsResponse = await this.apiClient.get(
        `https://graph.instagram.com/${mediaId}/insights`,
        {
          params: {
            metric: 'impressions,reach,engagement,saved',
            access_token: accessToken
          }
        }
      );

      if (!insightsResponse.data || !insightsResponse.data.data) {
        throw new Error('Invalid response from Instagram media insights endpoint');
      }

      return insightsResponse.data.data;
    } catch (error) {
      // Some content types may not support insights
      if (error.response && error.response.status === 400) {
        logger.info({
          message: 'Instagram insights not available for this media type',
          mediaId
        });
        return null;
      }
      throw error;
    }
  }
}