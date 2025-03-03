import axios from 'axios'; // ^1.6.0
import querystring from 'querystring'; // ^0.2.1
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
import { LINKEDIN_API_CONFIG } from '../../config/constants';
import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/errors';

/**
 * Securely stores LinkedIn OAuth tokens in the database
 * @param userId User ID to associate tokens with
 * @param accessToken OAuth access token
 * @param refreshToken OAuth refresh token
 * @param expiresAt Token expiration date
 */
async function storeTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<void> {
  try {
    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(accessToken, { userId });
    const encryptedRefreshToken = await encryptToken(refreshToken, { userId });

    // Store in database
    const { error } = await supabase
      .from('platforms')
      .upsert({
        creator_id: userId,
        platform_type: PlatformType.LINKEDIN,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        auth_status: 'connected',
        last_sync_at: new Date()
      }, {
        onConflict: 'creator_id, platform_type'
      });

    if (error) {
      throw new ApiError('Failed to store LinkedIn tokens', 500, error);
    }

    logger.info({ userId, platform: PlatformType.LINKEDIN }, 'LinkedIn tokens stored successfully');
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      userId,
      platform: PlatformType.LINKEDIN 
    }, 'Failed to store LinkedIn tokens');
    throw error;
  }
}

/**
 * Retrieves and decrypts LinkedIn OAuth tokens from the database
 * @param userId User ID to retrieve tokens for
 * @returns Object containing access token, refresh token, and expiration date
 */
async function getTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  try {
    // Retrieve tokens from database
    const { data, error } = await supabase
      .from('platforms')
      .select('access_token, refresh_token, token_expires_at')
      .eq('creator_id', userId)
      .eq('platform_type', PlatformType.LINKEDIN)
      .single();

    if (error || !data) {
      throw new ApiError(
        'LinkedIn platform not connected for this user',
        404,
        { userId }
      );
    }

    // Decrypt tokens
    const accessToken = await decryptToken(data.access_token, { userId });
    const refreshToken = await decryptToken(data.refresh_token, { userId });

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(data.token_expires_at)
    };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      userId,
      platform: PlatformType.LINKEDIN 
    }, 'Failed to retrieve LinkedIn tokens');
    throw error;
  }
}

/**
 * Transforms a LinkedIn API post object into the standardized content format
 * @param post LinkedIn post object
 * @returns Standardized content object
 */
function transformPostToContent(post: any): any {
  // Map LinkedIn content type to our standardized ContentType
  let contentType = ContentType.POST;
  if (post.specificContent?.share?.shareMediaCategory === 'IMAGE') {
    contentType = ContentType.PHOTO;
  } else if (post.specificContent?.share?.shareMediaCategory === 'VIDEO') {
    contentType = ContentType.VIDEO;
  } else if (post.specificContent?.article) {
    contentType = ContentType.ARTICLE;
  }

  // Extract thumbnail if available
  let thumbnail = '';
  if (post.specificContent?.share?.media?.[0]?.thumbnails?.[0]?.url) {
    thumbnail = post.specificContent.share.media[0].thumbnails[0].url;
  }

  // Format publish date
  const publishedAt = post.created?.time 
    ? new Date(post.created.time) 
    : new Date();

  // Extract engagement metrics if available
  const views = post.totalShareStatistics?.impressionCount || 0;
  const likes = post.totalShareStatistics?.likeCount || 0;
  const comments = post.totalShareStatistics?.commentCount || 0;
  const shares = post.totalShareStatistics?.shareCount || 0;
  const engagements = likes + comments + shares;
  const engagementRate = views > 0 ? (engagements / views) * 100 : 0;

  return {
    externalId: post.id,
    title: post.specificContent?.share?.subject || post.specificContent?.article?.title || '',
    description: post.specificContent?.share?.text || post.specificContent?.article?.description || '',
    contentType,
    publishedAt,
    url: post.specificContent?.share?.shareUrl || post.permaLink || '',
    thumbnail,
    views,
    likes,
    comments,
    shares,
    engagements,
    engagementRate,
    platform: PlatformType.LINKEDIN,
    metadata: {
      authorId: post.author,
      visibility: post.visibility?.status || 'PUBLIC',
      originalPost: post.specificContent?.share?.content?.contentEntities?.[0]?.id || null,
      lastModified: post.lastModified?.time ? new Date(post.lastModified.time) : null
    }
  };
}

/**
 * Transforms LinkedIn API metrics into standardized platform metrics
 * @param metrics LinkedIn metrics object
 * @returns Standardized metrics object
 */
function transformMetricsToStandard(metrics: any): any {
  // Map LinkedIn metrics to standard format
  return {
    views: metrics.impressionCount || 0,
    uniqueViews: metrics.uniqueImpressionCount || 0,
    likes: metrics.likeCount || 0,
    comments: metrics.commentCount || 0,
    shares: metrics.shareCount || 0,
    clicks: metrics.clickCount || 0,
    engagements: (metrics.likeCount || 0) + (metrics.commentCount || 0) + (metrics.shareCount || 0),
    engagementRate: metrics.engagementRate || 
      (metrics.impressionCount > 0 
        ? ((metrics.likeCount || 0) + (metrics.commentCount || 0) + (metrics.shareCount || 0)) / metrics.impressionCount * 100 
        : 0),
    platformSpecificMetrics: {
      shareMentions: metrics.shareMentionsCount || 0,
      viralImpressions: metrics.viralImpressionCount || 0,
      viralClicks: metrics.viralClickCount || 0,
      viralEngagements: metrics.viralEngagementCount || 0,
      viralLikes: metrics.viralLikeCount || 0,
      viralComments: metrics.viralCommentCount || 0,
      viralShares: metrics.viralShareCount || 0
    }
  };
}

/**
 * Adapter for LinkedIn platform integration implementing the PlatformAdapter interface
 */
export class LinkedInAdapter implements PlatformAdapter {
  private apiClient: typeof axios;
  private rateLimiter: RateLimiter;
  private readonly API_VERSION: string;
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;
  private readonly REDIRECT_URI: string;
  private readonly SCOPES: string[];

  /**
   * Initializes the LinkedIn adapter with API configuration
   */
  constructor() {
    // Initialize from config constants
    this.API_VERSION = LINKEDIN_API_CONFIG.API_VERSION;
    this.CLIENT_ID = LINKEDIN_API_CONFIG.clientId;
    this.CLIENT_SECRET = LINKEDIN_API_CONFIG.clientSecret;
    this.REDIRECT_URI = LINKEDIN_API_CONFIG.redirectUri;
    this.SCOPES = LINKEDIN_API_CONFIG.scopes;

    // Set up rate limiter for LinkedIn API (100 requests per minute)
    this.rateLimiter = new RateLimiter(60, 100);

    // Initialize API client
    this.apiClient = axios.create({
      baseURL: `https://api.linkedin.com/${this.API_VERSION}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
  }

  /**
   * Initiates OAuth flow to connect a user's LinkedIn account
   * @param userId User ID to associate the LinkedIn connection with
   * @returns Authentication result with authorization URL
   */
  async connect(userId: string): Promise<AuthResult> {
    try {
      logger.info({ userId }, 'Initiating LinkedIn OAuth flow');

      // Generate state parameter for CSRF protection
      const state = `linkedin_${userId}_${Date.now()}`;

      // Generate OAuth URL
      const authUrl = 'https://www.linkedin.com/oauth/v2/authorization?' + 
        querystring.stringify({
          response_type: 'code',
          client_id: this.CLIENT_ID,
          redirect_uri: this.REDIRECT_URI,
          state,
          scope: this.SCOPES.join(' ')
        });

      // Store state parameter for verification during callback
      // This would typically be stored in a database or cache
      // For simplicity, we'll just log it here
      logger.debug({ userId, state }, 'LinkedIn OAuth state generated');

      return {
        platform: PlatformType.LINKEDIN,
        authUrl,
        state,
        success: true
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform: PlatformType.LINKEDIN 
      }, 'Failed to initiate LinkedIn OAuth flow');

      return {
        platform: PlatformType.LINKEDIN,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate LinkedIn authorization',
      };
    }
  }

  /**
   * Processes OAuth callback and exchanges code for access tokens
   * @param userId User ID associated with the connection request
   * @param code Authorization code from LinkedIn OAuth
   * @param state State parameter for CSRF protection
   * @returns Authentication result with success status
   */
  async handleCallback(userId: string, code: string, state: string): Promise<AuthResult> {
    try {
      logger.info({ userId }, 'Processing LinkedIn OAuth callback');

      // Verify state parameter to prevent CSRF attacks
      // In a real implementation, we would compare with the stored state
      if (!state.startsWith(`linkedin_${userId}_`)) {
        throw new ApiError('Invalid state parameter', 400);
      }

      // Exchange authorization code for access token
      const tokenResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        querystring.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.REDIRECT_URI,
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Extract tokens from response
      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

      // Store tokens securely
      await storeTokens(userId, access_token, refresh_token, expiresAt);

      // Fetch basic profile information to verify connection
      const profileResponse = await this.apiClient.get('me', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });

      // Return successful result
      return {
        platform: PlatformType.LINKEDIN,
        success: true,
        userId,
        platformUserId: profileResponse.data.id,
        expiresAt,
        metadata: {
          profileId: profileResponse.data.id,
          name: `${profileResponse.data.localizedFirstName} ${profileResponse.data.localizedLastName}`
        }
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform: PlatformType.LINKEDIN 
      }, 'Failed to process LinkedIn OAuth callback');

      return {
        platform: PlatformType.LINKEDIN,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete LinkedIn authorization',
      };
    }
  }

  /**
   * Fetches posts from the user's LinkedIn account
   * @param userId User ID to fetch content for
   * @param options Options for content fetching
   * @returns Content result with LinkedIn posts
   */
  async fetchContent(userId: string, options: any = {}): Promise<ContentResult> {
    try {
      logger.info({ userId, options }, 'Fetching LinkedIn content');

      // Retrieve user's LinkedIn tokens
      const { accessToken, refreshToken, expiresAt } = await getTokens(userId);

      // Check if token is expired and refresh if needed
      if (expiresAt <= new Date()) {
        logger.debug({ userId }, 'LinkedIn token expired, refreshing');
        const refreshResult = await this.refreshToken(userId);
        if (!refreshResult.success) {
          throw new ApiError('Failed to refresh LinkedIn token', 401);
        }
      }

      // Prepare request options
      const limit = options.limit || 10;
      const offset = options.offset || 0;
      const startDate = options.startDate ? new Date(options.startDate).getTime() : undefined;
      const endDate = options.endDate ? new Date(options.endDate).getTime() : undefined;

      // Apply rate limiting
      await this.rateLimiter.consume(userId);

      // Fetch posts from LinkedIn (using UGC API for creator's content)
      const response = await this.makeApiRequest(
        'ugcPosts',
        'GET',
        accessToken,
        null,
        {
          q: 'authors',
          authors: `urn:li:person:{me}`,
          count: limit,
          start: offset,
          sortBy: 'CREATED',
          sortDirection: 'DESCENDING'
        }
      );

      // Transform posts to standardized format
      const posts = response.elements || [];
      const standardizedPosts = await Promise.all(posts
        .filter(post => {
          // Filter by date if specified
          if (startDate && post.created?.time < startDate) return false;
          if (endDate && post.created?.time > endDate) return false;
          return true;
        })
        .map(async post => {
          // Get metrics for each post
          try {
            const metrics = await this.fetchMetrics(userId, post.id);
            return {
              ...transformPostToContent(post),
              ...metrics.metrics
            };
          } catch (error) {
            logger.warn({ 
              error: error instanceof Error ? error.message : String(error),
              postId: post.id 
            }, 'Failed to fetch metrics for LinkedIn post');
            
            return transformPostToContent(post);
          }
        }));

      // Return content results
      return {
        success: true,
        platform: PlatformType.LINKEDIN,
        content: standardizedPosts,
        pagination: {
          total: response.paging?.total || standardizedPosts.length,
          count: standardizedPosts.length,
          offset,
          limit,
          hasMore: standardizedPosts.length >= limit
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform: PlatformType.LINKEDIN 
      }, 'Failed to fetch LinkedIn content');

      return {
        success: false,
        platform: PlatformType.LINKEDIN,
        error: error instanceof Error ? error.message : 'Failed to fetch LinkedIn content',
        content: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * Fetches metrics for a specific LinkedIn post
   * @param userId User ID to fetch metrics for
   * @param contentId LinkedIn post ID
   * @param options Options for metrics fetching
   * @returns Metrics result with engagement data
   */
  async fetchMetrics(userId: string, contentId?: string, options?: any): Promise<MetricsResult> {
    try {
      if (!contentId) {
        throw new ApiError('Content ID is required for fetching LinkedIn metrics', 400);
      }

      logger.info({ userId, contentId }, 'Fetching LinkedIn post metrics');

      // Retrieve user's LinkedIn tokens
      const { accessToken, refreshToken, expiresAt } = await getTokens(userId);

      // Check if token is expired and refresh if needed
      if (expiresAt <= new Date()) {
        logger.debug({ userId }, 'LinkedIn token expired, refreshing');
        const refreshResult = await this.refreshToken(userId);
        if (!refreshResult.success) {
          throw new ApiError('Failed to refresh LinkedIn token', 401);
        }
      }

      // Apply rate limiting
      await this.rateLimiter.consume(userId);

      // Fetch metrics for the specific post
      const response = await this.makeApiRequest(
        `organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:ugcPost:${contentId}`,
        'GET',
        accessToken
      );

      // Extract and transform metrics
      const linkedInMetrics = response.elements?.[0]?.shareStatistics || {};
      const standardizedMetrics = transformMetricsToStandard(linkedInMetrics);

      return {
        success: true,
        platform: PlatformType.LINKEDIN,
        contentId,
        metrics: standardizedMetrics,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        userId,
        contentId,
        platform: PlatformType.LINKEDIN 
      }, 'Failed to fetch LinkedIn metrics');

      return {
        success: false,
        platform: PlatformType.LINKEDIN,
        contentId,
        error: error instanceof Error ? error.message : 'Failed to fetch LinkedIn metrics',
        metrics: {},
        timestamp: new Date()
      };
    }
  }

  /**
   * Fetches audience demographics data for the LinkedIn account
   * @param userId User ID to fetch audience data for
   * @param options Options for audience data fetching
   * @returns Audience result with demographic data
   */
  async fetchAudience(userId: string, options?: any): Promise<AudienceResult> {
    try {
      logger.info({ userId }, 'Fetching LinkedIn audience demographics');

      // Retrieve user's LinkedIn tokens
      const { accessToken, refreshToken, expiresAt } = await getTokens(userId);

      // Check if token is expired and refresh if needed
      if (expiresAt <= new Date()) {
        logger.debug({ userId }, 'LinkedIn token expired, refreshing');
        const refreshResult = await this.refreshToken(userId);
        if (!refreshResult.success) {
          throw new ApiError('Failed to refresh LinkedIn token', 401);
        }
      }

      // Apply rate limiting
      await this.rateLimiter.consume(userId);

      // Fetch follower demographics
      // Note: This requires Company Admin or Showcase Page Admin access
      // Attempt to get the company ID from user metadata or use a fallback method
      const { data: platformData } = await supabase
        .from('platforms')
        .select('metadata')
        .eq('creator_id', userId)
        .eq('platform_type', PlatformType.LINKEDIN)
        .single();
      
      const companyId = platformData?.metadata?.companyId || 'me';
      
      const response = await this.makeApiRequest(
        `organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${companyId}`,
        'GET',
        accessToken
      );

      // Process and standardize demographics
      const followerStats = response.elements?.[0] || {};
      
      // Extract all available demographic data
      const demographics = {
        followerCount: followerStats.followerCounts?.totalCount || 0,
        followerGains: followerStats.followerGainsByTimePeriod || {},
        ageRanges: followerStats.followerCountsByAge || {},
        genderDistribution: followerStats.followerCountsByGender || {},
        industries: followerStats.followerCountsByIndustry || {},
        regions: followerStats.followerCountsByRegion || {},
        seniorities: followerStats.followerCountsBySeniority || {},
        companySize: followerStats.followerCountsByCompanySize || {},
        jobFunctions: followerStats.followerCountsByFunction || {},
        staffCounts: followerStats.followerCountsByStaffCountRange || {}
      };

      // Transform to standardized format
      const standardizedDemographics = {
        totalFollowers: demographics.followerCount,
        ageDistribution: Object.entries(demographics.ageRanges).reduce((acc: any, [range, count]) => {
          acc[range] = (count as any).followerCounts?.organicFollowerCount || 0;
          return acc;
        }, {}),
        genderDistribution: Object.entries(demographics.genderDistribution).reduce((acc: any, [gender, count]) => {
          acc[gender] = (count as any).followerCounts?.organicFollowerCount || 0;
          return acc;
        }, {}),
        geographicDistribution: Object.entries(demographics.regions).reduce((acc: any, [region, count]) => {
          acc[region] = (count as any).followerCounts?.organicFollowerCount || 0;
          return acc;
        }, {}),
        industries: Object.entries(demographics.industries).reduce((acc: any, [industry, count]) => {
          acc[industry] = (count as any).followerCounts?.organicFollowerCount || 0;
          return acc;
        }, {}),
        jobFunctions: Object.entries(demographics.jobFunctions).reduce((acc: any, [func, count]) => {
          acc[func] = (count as any).followerCounts?.organicFollowerCount || 0;
          return acc;
        }, {}),
        companySizes: Object.entries(demographics.companySize).reduce((acc: any, [size, count]) => {
          acc[size] = (count as any).followerCounts?.organicFollowerCount || 0;
          return acc;
        }, {}),
        seniorities: Object.entries(demographics.seniorities).reduce((acc: any, [seniority, count]) => {
          acc[seniority] = (count as any).followerCounts?.organicFollowerCount || 0;
          return acc;
        }, {})
      };

      return {
        success: true,
        platform: PlatformType.LINKEDIN,
        audience: standardizedDemographics,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform: PlatformType.LINKEDIN 
      }, 'Failed to fetch LinkedIn audience data');

      // Attempt fallback for personal profiles that don't have company admin access
      try {
        // If user doesn't have company admin access, try to get basic profile data
        const { accessToken } = await getTokens(userId);
        
        const profileResponse = await this.makeApiRequest(
          'me',
          'GET',
          accessToken,
          null,
          { projection: '(id,localizedFirstName,localizedLastName,profilePicture,publicProfileUrl)' }
        );
        
        // Get basic connections count if available
        let totalConnections = 0;
        try {
          const connectionResponse = await this.makeApiRequest(
            'connections',
            'GET',
            accessToken
          );
          totalConnections = connectionResponse._total || 0;
        } catch (connError) {
          logger.warn('Could not fetch LinkedIn connections count');
        }
        
        // Return minimal audience data
        return {
          success: true,
          platform: PlatformType.LINKEDIN,
          audience: {
            totalFollowers: totalConnections,
            note: 'Limited audience data available for personal profiles'
          },
          timestamp: new Date()
        };
      } catch (fallbackError) {
        // If fallback also fails, return the original error
        return {
          success: false,
          platform: PlatformType.LINKEDIN,
          error: error instanceof Error ? error.message : 'Failed to fetch LinkedIn audience data',
          audience: {
            totalFollowers: 0
          },
          timestamp: new Date()
        };
      }
    }
  }

  /**
   * Refreshes the OAuth access token using the refresh token
   * @param userId User ID to refresh token for
   * @returns Authentication result with new token status
   */
  async refreshToken(userId: string): Promise<AuthResult> {
    try {
      logger.info({ userId }, 'Refreshing LinkedIn access token');

      // Retrieve current tokens
      const { refreshToken: currentRefreshToken } = await getTokens(userId);

      if (!currentRefreshToken) {
        throw new ApiError('No refresh token available for LinkedIn', 400);
      }

      // Request new access token
      const tokenResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: currentRefreshToken,
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Extract new tokens
      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Calculate new expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

      // Store updated tokens
      await storeTokens(userId, access_token, refresh_token || currentRefreshToken, expiresAt);

      return {
        platform: PlatformType.LINKEDIN,
        success: true,
        expiresAt
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform: PlatformType.LINKEDIN 
      }, 'Failed to refresh LinkedIn token');

      // Update platform status to indicate token refresh failure
      try {
        await supabase
          .from('platforms')
          .update({ auth_status: 'refresh_failed' })
          .eq('creator_id', userId)
          .eq('platform_type', PlatformType.LINKEDIN);
      } catch (dbError) {
        logger.error({ error: dbError }, 'Failed to update platform status');
      }

      return {
        platform: PlatformType.LINKEDIN,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh LinkedIn token',
      };
    }
  }

  /**
   * Revokes LinkedIn API access and disconnects the platform
   * @param userId User ID to disconnect
   * @returns Success status of disconnection
   */
  async disconnect(userId: string): Promise<boolean> {
    try {
      logger.info({ userId }, 'Disconnecting LinkedIn platform');

      // Retrieve tokens
      const { accessToken } = await getTokens(userId);

      // Revoke access token
      await axios.post(
        'https://www.linkedin.com/oauth/v2/revoke',
        querystring.stringify({
          token: accessToken,
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Delete tokens from database
      const { error } = await supabase
        .from('platforms')
        .update({ 
          auth_status: 'disconnected',
          access_token: null,
          refresh_token: null
        })
        .eq('creator_id', userId)
        .eq('platform_type', PlatformType.LINKEDIN);

      if (error) {
        throw new ApiError('Failed to update LinkedIn connection status', 500, error);
      }

      return true;
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform: PlatformType.LINKEDIN 
      }, 'Failed to disconnect LinkedIn platform');

      return false;
    }
  }

  /**
   * Makes an authenticated request to the LinkedIn API
   * @param endpoint API endpoint to call
   * @param method HTTP method
   * @param accessToken OAuth access token
   * @param data Optional request body data
   * @param params Optional URL parameters
   * @returns API response data
   */
  private async makeApiRequest(
    endpoint: string,
    method: string = 'GET',
    accessToken: string,
    data: any = null,
    params: any = null
  ): Promise<any> {
    try {
      // Apply rate limiting before making request
      await this.handleRateLimiting(() => true);

      // Make the API request
      const response = await this.apiClient.request({
        url: endpoint,
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        data: data ? JSON.stringify(data) : undefined,
        params
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle LinkedIn API-specific errors
        const status = error.response?.status;
        const errorData = error.response?.data;

        if (status === 401) {
          throw new ApiError('LinkedIn authentication failed', 401);
        } else if (status === 403) {
          throw new ApiError('LinkedIn API permission denied', 403);
        } else if (status === 429) {
          // Rate limit exceeded
          const retryAfter = parseInt(error.response?.headers['retry-after'] || '60', 10);
          throw new ApiError(`LinkedIn rate limit exceeded. Retry after ${retryAfter} seconds.`, 429);
        } else {
          throw new ApiError(
            `LinkedIn API error: ${errorData?.message || error.message}`,
            error.response?.status || 500
          );
        }
      }
      
      throw error;
    }
  }

  /**
   * Handle LinkedIn API rate limits with exponential backoff
   * @param apiCall Function that makes the API call
   * @returns API response after handling rate limits
   */
  private async handleRateLimiting(apiCall: Function): Promise<any> {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Wait for rate limiter to allow the request
        await this.rateLimiter.wait();
        
        // Execute the API call
        return await apiCall();
      } catch (error) {
        // If rate limit error, wait and retry
        if (error instanceof ApiError && error.statusCode === 429) {
          // Parse retry-after header if available
          const retryAfter = parseInt((error as any).retryAfter || '60', 10);
          
          // Calculate exponential backoff with jitter
          const backoffTime = retryAfter * 1000 * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          
          logger.warn({
            attempt: attempt + 1,
            maxRetries,
            backoffMs: backoffTime,
            platform: PlatformType.LINKEDIN
          }, 'LinkedIn rate limit exceeded, retrying after backoff');
          
          // Wait for the backoff period
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          
          // Continue to next retry
          continue;
        }
        
        // For other errors, rethrow
        throw error;
      }
    }
    
    // If we've exhausted retries
    throw new ApiError(
      `LinkedIn API request failed after ${maxRetries} retries due to rate limiting`,
      429
    );
  }
}