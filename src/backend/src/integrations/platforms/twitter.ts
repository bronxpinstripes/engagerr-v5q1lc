import { TwitterApi } from 'twitter-api-v2'; // ^2.2.0
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
import { TWITTER_API_CONFIG } from '../../config/constants';
import { supabase } from '../../config/supabase';
import { ApiError } from '../../utils/errors';

/**
 * Securely stores Twitter OAuth tokens in the database
 * @param userId User ID of the token owner
 * @param accessToken Access token from Twitter
 * @param refreshToken Refresh token from Twitter
 * @param expiresAt Expiration date of the access token
 */
async function storeTokens(userId: string, accessToken: string, refreshToken: string, expiresAt: Date): Promise<void> {
  try {
    // Encrypt the tokens for secure storage
    const encryptedAccessToken = await encryptToken(accessToken, { userId, platformType: PlatformType.TWITTER });
    const encryptedRefreshToken = await encryptToken(refreshToken, { userId, platformType: PlatformType.TWITTER });
    
    // Check if platform entry already exists
    const { data: existingPlatform } = await supabase
      .from('platforms')
      .select('id')
      .eq('creator_id', userId)
      .eq('platform_type', PlatformType.TWITTER)
      .single();
    
    if (existingPlatform) {
      // Update existing platform entry
      await supabase
        .from('platforms')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: expiresAt,
          auth_status: 'connected',
          updated_at: new Date()
        })
        .eq('id', existingPlatform.id);
    } else {
      // Create new platform entry
      await supabase
        .from('platforms')
        .insert({
          creator_id: userId,
          platform_type: PlatformType.TWITTER,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: expiresAt,
          auth_status: 'connected',
          sync_status: 'never_synced'
        });
    }
    
    logger.info({ userId, platformType: PlatformType.TWITTER }, 'Twitter tokens stored successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      userId,
      platformType: PlatformType.TWITTER
    }, 'Failed to store Twitter tokens');
    
    throw new ApiError('Failed to store Twitter tokens', { cause: error });
  }
}

/**
 * Retrieves and decrypts Twitter OAuth tokens from the database
 * @param userId User ID of the token owner
 * @returns Object containing decrypted access token, refresh token, and expiration date
 */
async function getTokens(userId: string): Promise<{ accessToken: string, refreshToken: string, expiresAt: Date }> {
  try {
    // Query the platforms table for Twitter tokens
    const { data: platform, error } = await supabase
      .from('platforms')
      .select('access_token, refresh_token, token_expires_at')
      .eq('creator_id', userId)
      .eq('platform_type', PlatformType.TWITTER)
      .single();
    
    if (error || !platform) {
      logger.error({
        error: error?.message || 'Platform not found',
        userId,
        platformType: PlatformType.TWITTER
      }, 'Failed to retrieve Twitter tokens');
      
      throw new ApiError('Twitter platform not connected', { statusCode: 404 });
    }
    
    // Decrypt the tokens
    const accessToken = await decryptToken(platform.access_token, { userId, platformType: PlatformType.TWITTER });
    const refreshToken = await decryptToken(platform.refresh_token, { userId, platformType: PlatformType.TWITTER });
    
    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(platform.token_expires_at)
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      userId,
      platformType: PlatformType.TWITTER
    }, 'Failed to retrieve Twitter tokens');
    
    throw new ApiError('Failed to retrieve Twitter tokens', { cause: error });
  }
}

/**
 * Transforms a Twitter API tweet object into the standardized content format
 * @param tweet Twitter API tweet object
 * @returns Standardized content object for the Engagerr platform
 */
function transformTweetToContent(tweet: any): any {
  try {
    // Extract media if present in the tweet
    const media = tweet.includes?.media || [];
    const mediaUrls = media.map((m: any) => m.url || m.preview_image_url).filter(Boolean);
    
    // Determine content type based on the tweet
    let contentType = ContentType.POST;
    if (media.length > 0) {
      // Check if it has videos
      if (media.some((m: any) => m.type === 'video')) {
        contentType = ContentType.VIDEO;
      } 
      // Check if it has photos
      else if (media.some((m: any) => m.type === 'photo')) {
        contentType = ContentType.PHOTO;
      }
    }
    
    // Extract metrics if available
    const metrics = tweet.public_metrics || {
      retweet_count: 0,
      reply_count: 0,
      like_count: 0,
      quote_count: 0,
      impression_count: 0
    };
    
    // Extract user if available
    const user = tweet.includes?.users?.[0] || {};
    
    // Calculate engagement rate
    const engagementRate = calculateEngagementRate(metrics);
    
    // Build the standardized content object
    return {
      externalId: tweet.id,
      title: tweet.text.substring(0, 100), // First 100 chars as title
      description: tweet.text,
      contentType,
      publishedAt: new Date(tweet.created_at),
      url: `https://twitter.com/${user.username}/status/${tweet.id}`,
      thumbnail: mediaUrls[0] || user.profile_image_url || '',
      views: metrics.impression_count || 0,
      engagements: 
        (metrics.retweet_count || 0) + 
        (metrics.reply_count || 0) + 
        (metrics.like_count || 0) + 
        (metrics.quote_count || 0),
      engagementRate,
      shares: (metrics.retweet_count || 0) + (metrics.quote_count || 0),
      comments: metrics.reply_count || 0,
      likes: metrics.like_count || 0,
      platform: PlatformType.TWITTER,
      metadata: {
        mediaUrls,
        mediaCount: media.length,
        hashtags: extractHashtags(tweet.text),
        mentions: extractMentions(tweet.text),
        isRetweet: !!tweet.referenced_tweets?.some((rt: any) => rt.type === 'retweeted'),
        isReply: !!tweet.referenced_tweets?.some((rt: any) => rt.type === 'replied_to'),
        isQuote: !!tweet.referenced_tweets?.some((rt: any) => rt.type === 'quoted')
      }
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet?.id
    }, 'Failed to transform tweet to content');
    
    // Return a minimal object if transformation fails
    return {
      externalId: tweet?.id || 'unknown',
      title: 'Error processing tweet',
      description: tweet?.text || 'No content available',
      contentType: ContentType.POST,
      publishedAt: tweet?.created_at ? new Date(tweet.created_at) : new Date(),
      url: tweet?.id ? `https://twitter.com/status/${tweet.id}` : '',
      platform: PlatformType.TWITTER,
      isError: true
    };
  }
}

/**
 * Transforms Twitter API metrics into standardized platform metrics
 * @param metrics Twitter-specific metrics object
 * @returns Standardized metrics object
 */
function transformMetricsToStandard(metrics: any): any {
  // Map Twitter metrics to standard format
  return {
    views: metrics.impression_count || 0,
    engagements: 
      (metrics.retweet_count || 0) + 
      (metrics.reply_count || 0) + 
      (metrics.like_count || 0) + 
      (metrics.quote_count || 0),
    engagementRate: calculateEngagementRate(metrics),
    shares: (metrics.retweet_count || 0) + (metrics.quote_count || 0),
    comments: metrics.reply_count || 0,
    likes: metrics.like_count || 0,
    platformSpecificMetrics: {
      retweets: metrics.retweet_count || 0,
      quotes: metrics.quote_count || 0,
      replies: metrics.reply_count || 0,
      likes: metrics.like_count || 0,
      impressions: metrics.impression_count || 0,
      // Include any additional Twitter-specific metrics
      urlClicks: metrics.url_link_clicks || 0,
      userProfileClicks: metrics.user_profile_clicks || 0,
      appOpens: metrics.app_opens || 0,
      appInstalls: metrics.app_installs || 0
    },
    lastUpdated: new Date()
  };
}

// Helper functions
function calculateEngagementRate(metrics: any): number {
  const impressions = metrics.impression_count || 0;
  if (impressions === 0) return 0;
  
  const engagements = 
    (metrics.retweet_count || 0) + 
    (metrics.reply_count || 0) + 
    (metrics.like_count || 0) + 
    (metrics.quote_count || 0);
  
  return (engagements / impressions) * 100;
}

function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
  return (text.match(hashtagRegex) || []).map(tag => tag.substring(1));
}

function extractMentions(text: string): string[] {
  const mentionRegex = /@[\w\u0590-\u05ff]+/g;
  return (text.match(mentionRegex) || []).map(mention => mention.substring(1));
}

/**
 * Twitter platform adapter implementing the PlatformAdapter interface
 * Handles authentication, content retrieval, metrics collection, and audience data from Twitter API v2
 */
export class TwitterAdapter implements PlatformAdapter {
  private apiClient: TwitterApi;
  private rateLimiter: RateLimiter;
  private readonly API_VERSION: string;
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;
  private readonly REDIRECT_URI: string;
  private readonly SCOPES: string[];

  /**
   * Initializes the Twitter adapter with API configuration
   */
  constructor() {
    // Get configuration from environment/constants
    const {
      API_VERSION,
      SCOPES
    } = TWITTER_API_CONFIG;
    
    this.API_VERSION = API_VERSION;
    this.CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
    this.CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
    this.REDIRECT_URI = process.env.TWITTER_REDIRECT_URI || '';
    this.SCOPES = SCOPES;
    
    // Initialize rate limiter for Twitter API calls
    this.rateLimiter = new RateLimiter('twitter-api', {
      points: 300,              // Twitter typically allows 300 requests
      duration: 15 * 60         // per 15-minute window
    });
    
    // Validate required configuration
    if (!this.CLIENT_ID || !this.CLIENT_SECRET || !this.REDIRECT_URI) {
      logger.error('Twitter API configuration is incomplete. Please check environment variables.');
    }
  }

  /**
   * Initiates OAuth flow to connect a user's Twitter account
   * @param userId User ID initiating the connection
   * @returns Authentication result with authorization URL
   */
  async connect(userId: string): Promise<AuthResult> {
    try {
      logger.info({ userId }, 'Initiating Twitter connection flow');
      
      // Create an OAuth client
      const client = new TwitterApi({
        clientId: this.CLIENT_ID,
        clientSecret: this.CLIENT_SECRET
      });
      
      // Generate PKCE code verifier and challenge
      const { codeVerifier, codeChallenge } = client.generateOAuth2PKCE();
      
      // Store code verifier in the database for later use in the callback
      await supabase
        .from('oauth_states')
        .insert({
          user_id: userId,
          platform: PlatformType.TWITTER,
          code_verifier: codeVerifier,
          created_at: new Date()
        });
      
      // Generate the authorization URL
      const authUrl = client.generateOAuth2AuthLink(
        this.REDIRECT_URI,
        {
          scope: this.SCOPES,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256'
        }
      );
      
      logger.debug({ userId, authUrl: authUrl.url }, 'Generated Twitter auth URL');
      
      // Return auth result with the URL
      return {
        success: true,
        authUrl: authUrl.url,
        state: authUrl.state
      };
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        userId
      }, 'Failed to initiate Twitter connection flow');
      
      return {
        success: false,
        error: 'Failed to initiate Twitter connection flow: ' + 
          (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Processes OAuth callback and exchanges code for access tokens
   * @param userId User ID from the original connection request
   * @param code Authorization code from Twitter
   * @param codeVerifier PKCE code verifier from the original request
   * @returns Authentication result with success status
   */
  async handleCallback(userId: string, code: string, codeVerifier: string): Promise<AuthResult> {
    try {
      logger.info({ userId, code: '***' }, 'Processing Twitter OAuth callback');
      
      // Create an OAuth client
      const client = new TwitterApi({
        clientId: this.CLIENT_ID,
        clientSecret: this.CLIENT_SECRET
      });
      
      // Exchange authorization code for access token
      const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: this.REDIRECT_URI
      });
      
      // Calculate token expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      
      // Initialize API client with the access token
      this.apiClient = new TwitterApi(accessToken);
      
      // Verify token by fetching the user's profile
      const user = await this.apiClient.currentUserV2();
      
      if (!user?.data) {
        throw new Error('Failed to retrieve user information with the provided token');
      }
      
      // Store tokens securely
      await storeTokens(userId, accessToken, refreshToken, expiresAt);
      
      // Update user profile information
      await supabase
        .from('platforms')
        .update({
          handle: user.data.username,
          url: `https://twitter.com/${user.data.username}`,
          metadata: {
            user_id: user.data.id,
            name: user.data.name,
            profile_image_url: user.data.profile_image_url,
            verified: user.data.verified || false,
            description: user.data.description,
            location: user.data.location,
            created_at: user.data.created_at
          }
        })
        .eq('creator_id', userId)
        .eq('platform_type', PlatformType.TWITTER);
      
      logger.info({ 
        userId, 
        twitterHandle: user.data.username,
        expiresAt 
      }, 'Twitter connection successful');
      
      return {
        success: true,
        platformType: PlatformType.TWITTER,
        username: user.data.username,
        profileUrl: `https://twitter.com/${user.data.username}`
      };
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        userId,
        code: '***'
      }, 'Failed to process Twitter OAuth callback');
      
      return {
        success: false,
        error: 'Failed to process Twitter callback: ' + 
          (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Fetches tweets from the user's Twitter account
   * @param userId User ID owning the Twitter connection
   * @param options Query options (limit, pagination, date range, etc.)
   * @returns Content result with tweets data in standardized format
   */
  async fetchContent(userId: string, options: any = {}): Promise<ContentResult> {
    try {
      // Retrieve user's Twitter tokens
      const { accessToken, refreshToken, expiresAt } = await getTokens(userId);
      
      // Check if token is expired and refresh if needed
      if (new Date() > expiresAt) {
        logger.info({ userId }, 'Twitter access token expired, refreshing...');
        await this.refreshToken(userId);
        // Get fresh tokens after refresh
        const freshTokens = await getTokens(userId);
        this.apiClient = this.createClient(freshTokens.accessToken);
      } else {
        // Initialize API client with the access token
        this.apiClient = this.createClient(accessToken);
      }
      
      // Prepare query parameters
      const {
        limit = 20,
        paginator = null,
        startTime = null,
        endTime = null,
        excludeReplies = false,
        excludeRetweets = false
      } = options;
      
      // Build tweet fields to retrieve
      const tweetFields = [
        'id', 'text', 'created_at', 'public_metrics',
        'attachments', 'referenced_tweets', 'context_annotations'
      ];
      
      // Build expansion fields to include related entities
      const expansions = [
        'attachments.media_keys', 'author_id', 
        'referenced_tweets.id', 'referenced_tweets.id.author_id'
      ];
      
      // Build media fields to include
      const mediaFields = [
        'type', 'url', 'preview_image_url', 'duration_ms',
        'height', 'width', 'public_metrics'
      ];
      
      // Apply rate limiting to API call
      const apiCall = async () => {
        // Create query parameters
        const queryParams: any = {
          max_results: limit,
          'tweet.fields': tweetFields.join(','),
          expansions: expansions.join(','),
          'media.fields': mediaFields.join(',')
        };
        
        // Add time filters if provided
        if (startTime) queryParams.start_time = new Date(startTime).toISOString();
        if (endTime) queryParams.end_time = new Date(endTime).toISOString();
        
        // Add exclude filters
        if (excludeReplies) queryParams.exclude = 'replies';
        if (excludeRetweets) queryParams.exclude = queryParams.exclude 
          ? `${queryParams.exclude},retweets` 
          : 'retweets';
        
        // Fetch user's tweets
        if (paginator) {
          // Continue from previous paginator
          return await this.apiClient.v2.tweets(queryParams, paginator);
        } else {
          // Start new query
          const { data } = await this.apiClient.currentUserV2();
          return await this.apiClient.v2.userTimeline(data.id, queryParams);
        }
      };
      
      // Execute API call with rate limiting
      const timeline = await this.handleRateLimiting(apiCall);
      
      // Transform tweets to standardized content format
      const content = timeline.tweets.map(transformTweetToContent);
      
      logger.info({
        userId,
        count: content.length,
        hasNextPage: timeline.meta.next_token ? true : false
      }, 'Fetched Twitter content');
      
      // Return standardized content result
      return {
        items: content,
        pagination: {
          hasNextPage: timeline.meta.next_token ? true : false,
          nextPageToken: timeline.meta.next_token || null,
          total: timeline.meta.result_count
        }
      };
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        userId,
        options
      }, 'Failed to fetch Twitter content');
      
      throw new ApiError('Failed to fetch Twitter content', {
        cause: error,
        statusCode: 500
      });
    }
  }

  /**
   * Fetches metrics for a specific tweet
   * @param userId User ID owning the Twitter connection
   * @param contentId Tweet ID to fetch metrics for
   * @param options Additional options for metrics retrieval
   * @returns Metrics result with engagement data
   */
  async fetchMetrics(userId: string, contentId: string, options: any = {}): Promise<MetricsResult> {
    try {
      // Retrieve user's Twitter tokens
      const { accessToken, refreshToken, expiresAt } = await getTokens(userId);
      
      // Check if token is expired and refresh if needed
      if (new Date() > expiresAt) {
        logger.info({ userId }, 'Twitter access token expired, refreshing...');
        await this.refreshToken(userId);
        // Get fresh tokens after refresh
        const freshTokens = await getTokens(userId);
        this.apiClient = this.createClient(freshTokens.accessToken);
      } else {
        // Initialize API client with the access token
        this.apiClient = this.createClient(accessToken);
      }
      
      // Apply rate limiting to API call
      const apiCall = async () => {
        // Build tweet fields to retrieve metrics
        const tweetFields = [
          'id', 'public_metrics', 'non_public_metrics',
          'organic_metrics', 'promoted_metrics'
        ];
        
        // Fetch tweet metrics
        return await this.apiClient.v2.singleTweet(contentId, {
          'tweet.fields': tweetFields.join(',')
        });
      };
      
      // Execute API call with rate limiting
      const result = await this.handleRateLimiting(apiCall);
      
      // Extract metrics from tweet
      const tweetMetrics = {
        ...result.data.public_metrics,
        ...result.data.non_public_metrics,
        ...result.data.organic_metrics,
        ...result.data.promoted_metrics
      };
      
      // Transform metrics to standardized format
      const standardizedMetrics = transformMetricsToStandard(tweetMetrics);
      
      logger.info({
        userId,
        contentId,
        views: standardizedMetrics.views,
        engagements: standardizedMetrics.engagements
      }, 'Fetched Twitter metrics');
      
      // Return metrics result
      return {
        metrics: standardizedMetrics,
        platformSpecificData: tweetMetrics
      };
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        userId,
        contentId
      }, 'Failed to fetch Twitter metrics');
      
      // Check if the error is due to non-existing content
      if (error.code === 404 || (error.message && error.message.includes('not found'))) {
        throw new ApiError('Tweet not found', { statusCode: 404 });
      }
      
      throw new ApiError('Failed to fetch Twitter metrics', {
        cause: error,
        statusCode: 500
      });
    }
  }

  /**
   * Fetches audience demographics data for the Twitter account
   * @param userId User ID owning the Twitter connection
   * @param options Options for audience data retrieval
   * @returns Audience result with demographic data
   */
  async fetchAudience(userId: string, options: any = {}): Promise<AudienceResult> {
    try {
      // Retrieve user's Twitter tokens
      const { accessToken, refreshToken, expiresAt } = await getTokens(userId);
      
      // Check if token is expired and refresh if needed
      if (new Date() > expiresAt) {
        logger.info({ userId }, 'Twitter access token expired, refreshing...');
        await this.refreshToken(userId);
        // Get fresh tokens after refresh
        const freshTokens = await getTokens(userId);
        this.apiClient = this.createClient(freshTokens.accessToken);
      } else {
        // Initialize API client with the access token
        this.apiClient = this.createClient(accessToken);
      }
      
      // Apply rate limiting to API call
      const apiCall = async () => {
        // Get current user ID
        const { data: userData } = await this.apiClient.currentUserV2({
          'user.fields': 'public_metrics,description,location,created_at,profile_image_url,verified'
        });
        
        // Get follower count
        const followers = await this.apiClient.v2.followers(userData.id, {
          max_results: 1000, // Maximum allowed by Twitter API
          'user.fields': 'public_metrics,location,description,created_at'
        });
        
        return {
          userData,
          followers
        };
      };
      
      // Execute API call with rate limiting
      const result = await this.handleRateLimiting(apiCall);
      const userData = result.userData;
      const followerData = result.followers;
      
      // Extract audience demographic information
      // Note: Twitter API v2 has limited demographic data available directly
      // Most platforms require third-party analytics for detailed demographics
      
      // Build basic audience information from available data
      const audienceData = {
        followerCount: userData.public_metrics?.followers_count || 0,
        followingCount: userData.public_metrics?.following_count || 0,
        // Create a sample of locations from follower data
        locations: extractLocationData(followerData),
        // Very limited gender and age data is available through Twitter API
        demographics: {
          // Placeholder for demographic data that would need to come from other sources
          ageRanges: {},
          genderDistribution: {},
          interests: extractInterests(followerData)
        },
        growth: {
          // Placeholder for growth data that would need historical tracking
          followerGrowthRate: null,
          engagementTrends: null
        },
        lastUpdated: new Date()
      };
      
      logger.info({
        userId,
        followerCount: audienceData.followerCount
      }, 'Fetched Twitter audience data');
      
      // Return audience result
      return {
        audience: audienceData,
        platformSpecificData: {
          userDetails: userData,
          followerSample: followerData.data,
          // Include raw data that might be useful for further processing
          followerMeta: followerData.meta
        }
      };
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        userId
      }, 'Failed to fetch Twitter audience data');
      
      throw new ApiError('Failed to fetch Twitter audience data', {
        cause: error,
        statusCode: 500
      });
    }
  }

  /**
   * Refreshes the OAuth access token using the refresh token
   * @param userId User ID owning the Twitter connection
   * @returns Authentication result with new token status
   */
  async refreshToken(userId: string): Promise<AuthResult> {
    try {
      logger.info({ userId }, 'Refreshing Twitter OAuth token');
      
      // Get current tokens
      const { refreshToken: currentRefreshToken } = await getTokens(userId);
      
      if (!currentRefreshToken) {
        throw new Error('No refresh token available for Twitter');
      }
      
      // Create an OAuth client
      const client = new TwitterApi({
        clientId: this.CLIENT_ID,
        clientSecret: this.CLIENT_SECRET
      });
      
      // Refresh the token
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = 
        await client.refreshOAuth2Token(currentRefreshToken);
      
      // Calculate new expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      
      // Store the new tokens
      await storeTokens(userId, accessToken, newRefreshToken, expiresAt);
      
      logger.info({ userId, expiresAt }, 'Twitter token refreshed successfully');
      
      return {
        success: true,
        message: 'Twitter token refreshed successfully'
      };
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        userId
      }, 'Failed to refresh Twitter token');
      
      // Update platform status to indicate refresh failure
      await supabase
        .from('platforms')
        .update({
          auth_status: 'refresh_failed',
          updated_at: new Date()
        })
        .eq('creator_id', userId)
        .eq('platform_type', PlatformType.TWITTER);
      
      return {
        success: false,
        error: 'Failed to refresh Twitter token: ' + 
          (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Revokes Twitter API access and disconnects the platform
   * @param userId User ID owning the Twitter connection
   * @returns Success status of disconnection
   */
  async disconnect(userId: string): Promise<boolean> {
    try {
      logger.info({ userId }, 'Disconnecting Twitter platform');
      
      // Get current tokens
      const { accessToken } = await getTokens(userId);
      
      // Create client with the access token
      this.apiClient = this.createClient(accessToken);
      
      // Attempt to revoke the token at Twitter
      // Note: Twitter API v2 doesn't have a specific endpoint for token revocation
      // But we'll handle this gracefully even if the API call fails
      
      try {
        // Try to invalidate the token, handle errors gracefully
        // This is a best-effort approach
        // Twitter API v2 doesn't currently provide a direct token revocation endpoint
        logger.info({ userId }, 'Note: Twitter API v2 does not provide a direct token revocation endpoint');
      } catch (revokeError) {
        // Log but continue with disconnection even if revocation fails
        logger.warn({
          error: revokeError instanceof Error ? revokeError.message : String(revokeError),
          userId
        }, 'Failed to revoke Twitter token at the source, continuing with disconnection');
      }
      
      // Remove tokens from our database
      // Update the platform record to show disconnected status
      await supabase
        .from('platforms')
        .update({
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          auth_status: 'disconnected',
          updated_at: new Date()
        })
        .eq('creator_id', userId)
        .eq('platform_type', PlatformType.TWITTER);
      
      logger.info({ userId }, 'Twitter platform disconnected successfully');
      
      return true;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        userId
      }, 'Failed to disconnect Twitter platform');
      
      throw new ApiError('Failed to disconnect Twitter platform', {
        cause: error,
        statusCode: 500
      });
    }
  }

  /**
   * Creates an authenticated Twitter API client
   * @param accessToken Valid access token for Twitter API
   * @returns Authenticated Twitter API client
   */
  private createClient(accessToken: string): TwitterApi {
    // Create a new TwitterApi instance with the provided access token
    return new TwitterApi(accessToken);
  }

  /**
   * Handle Twitter API rate limits with exponential backoff
   * @param apiCall Function that makes the API call
   * @returns API response after handling rate limits
   */
  private async handleRateLimiting(apiCall: Function): Promise<any> {
    // Implement rate limiting with exponential backoff
    const MAX_RETRIES = 3;
    let retries = 0;
    
    while (true) {
      try {
        // Check if we're within rate limits
        await this.rateLimiter.consume('twitter-api', 1);
        
        // Execute the API call
        const result = await apiCall();
        
        // If we reach here, the call was successful
        return result;
      } catch (error) {
        // If we've exceeded retries, throw the error
        if (retries >= MAX_RETRIES) {
          throw error;
        }
        
        // Check if this is a rate limit error from Twitter
        const isRateLimitError = 
          error.code === 429 || 
          (error.message && error.message.includes('rate limit'));
        
        if (isRateLimitError) {
          // Increment retry counter
          retries++;
          
          // Calculate backoff time (exponential with jitter)
          const baseBackoff = 1000 * Math.pow(2, retries);
          const jitter = Math.random() * 1000;
          const backoffMs = baseBackoff + jitter;
          
          logger.warn({
            retries,
            backoffMs,
            rateLimitError: true
          }, 'Twitter API rate limit exceeded, applying backoff');
          
          // Wait for the backoff period
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          
          // Try again after backoff
          continue;
        }
        
        // If it's not a rate limit error, throw it
        throw error;
      }
    }
  }
}

/**
 * Extract location data from follower information
 * @param followerData Follower data from Twitter API
 * @returns Mapped object of locations and their frequencies
 */
function extractLocationData(followerData: any): Record<string, number> {
  try {
    // Extract location information from follower data
    const locations: Record<string, number> = {};
    
    if (followerData && followerData.data && Array.isArray(followerData.data)) {
      followerData.data.forEach((follower: any) => {
        if (follower.location) {
          // Normalize location strings
          const location = follower.location.trim();
          
          if (location) {
            locations[location] = (locations[location] || 0) + 1;
          }
        }
      });
    }
    
    // Sort by frequency and limit to top locations
    return Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to extract location data from Twitter followers');
    
    return {};
  }
}

/**
 * Extract interests from follower descriptions and bios
 * @param followerData Follower data from Twitter API
 * @returns Mapped object of interests and their frequencies
 */
function extractInterests(followerData: any): Record<string, number> {
  try {
    // Extract interests from follower descriptions and bios
    // This is a basic implementation - more sophisticated NLP would improve results
    const interests: Record<string, number> = {};
    const interestKeywords = [
      'technology', 'tech', 'gaming', 'music', 'sports', 'fashion', 
      'travel', 'food', 'fitness', 'health', 'business', 'entrepreneur',
      'marketing', 'design', 'art', 'photography', 'politics', 'news',
      'education', 'science', 'finance', 'investing'
    ];
    
    if (followerData && followerData.data && Array.isArray(followerData.data)) {
      followerData.data.forEach((follower: any) => {
        if (follower.description) {
          const description = follower.description.toLowerCase();
          
          interestKeywords.forEach(keyword => {
            if (description.includes(keyword)) {
              interests[keyword] = (interests[keyword] || 0) + 1;
            }
          });
        }
      });
    }
    
    // Sort by frequency and limit to top interests
    return Object.entries(interests)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to extract interest data from Twitter followers');
    
    return {};
  }
}