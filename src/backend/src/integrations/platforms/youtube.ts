/**
 * YouTube Platform Adapter
 * 
 * This adapter implements the PlatformAdapter interface for the YouTube platform.
 * It handles authentication, content retrieval, and metrics fetching from YouTube API.
 * 
 * @module integrations/platforms/youtube
 */

import axios from 'axios'; // v1.5.0
import { OAuth2Client } from 'google-auth-library'; // v9.0.0

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
import { YOUTUBE_API_CONFIG } from '../../config/constants';

/**
 * YouTube adapter for integrating with YouTube API
 * Implements the PlatformAdapter interface for YouTube
 */
class YouTubeAdapter implements PlatformAdapter {
  private apiClient: axios.AxiosInstance;
  private rateLimiter: RateLimiter;
  private readonly API_BASE_URL: string;
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;
  private readonly REDIRECT_URI: string;
  private readonly SCOPES: string[];

  /**
   * Initialize the YouTube adapter with API configuration
   */
  constructor() {
    // Initialize API configuration from constants
    this.API_BASE_URL = YOUTUBE_API_CONFIG.BASE_URL;
    this.CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || '';
    this.CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || '';
    this.REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || '';
    this.SCOPES = YOUTUBE_API_CONFIG.SCOPES;

    // Create axios instance with base URL and default headers
    this.apiClient = axios.create({
      baseURL: this.API_BASE_URL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Initialize rate limiter for YouTube API calls
    this.rateLimiter = new RateLimiter({
      points: 10000, // YouTube API quota points per day
      duration: 86400, // 24 hours in seconds
    });

    // Validate required configuration
    if (!this.CLIENT_ID || !this.CLIENT_SECRET || !this.REDIRECT_URI) {
      logger.error('Missing YouTube API credentials. YouTube integration will not function properly.');
    }
  }

  /**
   * Generate OAuth URL and handle authentication flow for connecting a creator's YouTube account
   * @param userId User ID of the creator
   * @param code Authorization code from OAuth flow
   * @param redirectUri Redirect URI used in the OAuth flow
   * @returns Authentication result with tokens
   */
  async connect(userId: string, code: string, redirectUri: string): Promise<AuthResult> {
    try {
      logger.info(`Connecting YouTube account for user ${userId}`);
      
      // Create OAuth client
      const oauth2Client = this.getAuthClient();
      
      // If we have a code, exchange it for tokens
      if (code) {
        // Set redirect URI (may be different from the default one)
        oauth2Client.redirectUri = redirectUri || this.REDIRECT_URI;
        
        // Exchange authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        
        // Validate that we received required tokens
        if (!tokens.access_token) {
          throw new Error('No access token received from YouTube');
        }
        
        // Get the creator's channel information to verify connection
        oauth2Client.setCredentials(tokens);
        const channelInfo = await this.fetchChannelInfo(oauth2Client);
        
        // Encrypt tokens for secure storage
        const encryptedAccessToken = await encryptToken(tokens.access_token, {
          userId,
          platformType: PlatformType.YOUTUBE
        });
        
        const encryptedRefreshToken = tokens.refresh_token 
          ? await encryptToken(tokens.refresh_token, {
              userId,
              platformType: PlatformType.YOUTUBE
            })
          : null;
        
        // Calculate token expiry
        const expiryDate = tokens.expiry_date 
          ? new Date(tokens.expiry_date) 
          : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
        
        // Return authentication result
        return {
          success: true,
          platformType: PlatformType.YOUTUBE,
          handle: channelInfo.title,
          url: `https://youtube.com/channel/${channelInfo.id}`,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiryDate,
          additionalData: {
            channelId: channelInfo.id,
            thumbnailUrl: channelInfo.thumbnailUrl,
            subscriberCount: channelInfo.subscriberCount
          }
        };
      } else {
        // Generate authorization URL if no code provided
        const authorizeUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: this.SCOPES,
          include_granted_scopes: true,
          prompt: 'consent' // Force consent to ensure refresh token is returned
        });
        
        // Return URL for frontend to redirect user
        return {
          success: false,
          requiresAuth: true,
          authUrl: authorizeUrl,
          platformType: PlatformType.YOUTUBE
        };
      }
    } catch (error) {
      logger.error(`Error connecting YouTube account: ${error.message}`, { 
        userId,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: `Failed to connect YouTube account: ${error.message}`,
        platformType: PlatformType.YOUTUBE
      };
    }
  }

  /**
   * Retrieve content items from a creator's YouTube channel
   * @param userId User ID of the creator
   * @param options Options for fetching content
   * @returns Standardized content data from YouTube
   */
  async fetchContent(userId: string, options: any = {}): Promise<ContentResult> {
    try {
      logger.debug(`Fetching YouTube content for user ${userId}`, { options });
      
      // Retrieve and decrypt YouTube access token
      const tokenData = await this.getAccessToken(userId);
      if (!tokenData.accessToken) {
        return {
          success: false,
          error: 'No valid YouTube access token found',
          items: []
        };
      }
      
      // Apply rate limiting
      await this.handleRateLimiting(async () => {
        // Estimate using 50 quota points for this operation
        return true;
      });
      
      // Set up pagination parameters
      const { pageToken = null, limit = 50, startDate, endDate } = options;
      const maxResults = Math.min(limit, 50); // YouTube API max is 50
      
      // Set up time-based filtering if provided
      let publishedAfter = startDate ? new Date(startDate).toISOString() : undefined;
      let publishedBefore = endDate ? new Date(endDate).toISOString() : undefined;
      
      // Get channel ID from token data
      const channelId = tokenData.additionalData?.channelId;
      if (!channelId) {
        // Fetch channel ID if not available
        const channelInfo = await this.fetchChannelInfo(null, tokenData.accessToken);
        tokenData.additionalData = {
          ...tokenData.additionalData,
          channelId: channelInfo.id
        };
      }
      
      // Fetch videos from channel
      const response = await this.apiClient.get('/v3/search', {
        params: {
          part: 'snippet',
          channelId: tokenData.additionalData?.channelId,
          maxResults,
          pageToken,
          type: 'video',
          publishedAfter,
          publishedBefore,
          order: 'date',
          key: process.env.YOUTUBE_API_KEY // For search, we use API key instead of OAuth
        },
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`
        }
      });
      
      // Get detailed video information for each found video
      const videoIds = response.data.items.map((item: any) => item.id.videoId).join(',');
      
      // Skip if no videos found
      if (!videoIds) {
        return {
          success: true,
          items: [],
          nextPageToken: response.data.nextPageToken || null,
          totalResults: response.data.pageInfo?.totalResults || 0
        };
      }
      
      // Get detailed video data
      const videosResponse = await this.apiClient.get('/v3/videos', {
        params: {
          part: 'snippet,contentDetails,statistics',
          id: videoIds,
          key: process.env.YOUTUBE_API_KEY
        },
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`
        }
      });
      
      // Transform YouTube data to standardized format
      const transformedContent = this.transformContent(videosResponse.data.items);
      
      logger.debug(`Fetched ${transformedContent.length} YouTube content items for user ${userId}`);
      
      return {
        success: true,
        items: transformedContent,
        nextPageToken: response.data.nextPageToken || null,
        totalResults: response.data.pageInfo?.totalResults || 0
      };
    } catch (error) {
      logger.error(`Error fetching YouTube content: ${error.message}`, {
        userId,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: `Failed to fetch YouTube content: ${error.message}`,
        items: []
      };
    }
  }

  /**
   * Retrieve performance metrics for YouTube content
   * @param userId User ID of the creator
   * @param contentId Content ID to fetch metrics for (optional)
   * @param options Options for fetching metrics
   * @returns Standardized metrics data from YouTube
   */
  async fetchMetrics(userId: string, contentId?: string, options: any = {}): Promise<MetricsResult> {
    try {
      logger.debug(`Fetching YouTube metrics for user ${userId}`, { 
        contentId,
        options
      });
      
      // Retrieve and decrypt YouTube access token
      const tokenData = await this.getAccessToken(userId);
      if (!tokenData.accessToken) {
        return {
          success: false,
          error: 'No valid YouTube access token found',
          metrics: {}
        };
      }
      
      // Apply rate limiting - YouTube Analytics API costs more quota points
      await this.handleRateLimiting(async () => {
        // Estimate using 100 quota points for this operation
        return true;
      });
      
      // Determine date range for metrics
      const endDate = options.endDate ? new Date(options.endDate) : new Date();
      const startDate = options.startDate 
        ? new Date(options.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
      
      // Format dates for YouTube API
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Build base parameters for analytics request
      const baseParams = {
        'start-date': formattedStartDate,
        'end-date': formattedEndDate,
        dimensions: 'day',
        sort: 'day'
      };
      
      // Depending on whether contentId is provided, fetch metrics for a specific video or channel-wide
      let metricsData: any;
      
      if (contentId) {
        // Fetch metrics for specific video
        metricsData = await this.apiClient.get('/v2/reports', {
          params: {
            ...baseParams,
            ids: `channel==${tokenData.additionalData?.channelId}`,
            metrics: 'views,likes,dislikes,comments,shares,averageViewDuration,averageViewPercentage',
            filters: `video==${contentId}`,
            key: process.env.YOUTUBE_API_KEY
          },
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`
          }
        });
      } else {
        // Fetch channel-wide metrics
        metricsData = await this.apiClient.get('/v2/reports', {
          params: {
            ...baseParams,
            ids: `channel==${tokenData.additionalData?.channelId}`,
            metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,dislikes,comments,shares,subscribersGained,subscribersLost',
            key: process.env.YOUTUBE_API_KEY
          },
          headers: {
            Authorization: `Bearer ${tokenData.accessToken}`
          }
        });
      }
      
      // Transform YouTube metrics to standardized format
      const transformedMetrics = this.transformMetrics(metricsData.data);
      
      logger.debug(`Fetched YouTube metrics for user ${userId}`, {
        metrics: Object.keys(transformedMetrics),
        contentId: contentId || 'channel'
      });
      
      return {
        success: true,
        metrics: transformedMetrics,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      };
    } catch (error) {
      logger.error(`Error fetching YouTube metrics: ${error.message}`, {
        userId,
        contentId,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: `Failed to fetch YouTube metrics: ${error.message}`,
        metrics: {}
      };
    }
  }

  /**
   * Retrieve audience demographic data for a YouTube channel
   * @param userId User ID of the creator
   * @param options Options for fetching audience data
   * @returns Standardized audience data from YouTube
   */
  async fetchAudience(userId: string, options: any = {}): Promise<AudienceResult> {
    try {
      logger.debug(`Fetching YouTube audience data for user ${userId}`, { options });
      
      // Retrieve and decrypt YouTube access token
      const tokenData = await this.getAccessToken(userId);
      if (!tokenData.accessToken) {
        return {
          success: false,
          error: 'No valid YouTube access token found',
          audience: {}
        };
      }
      
      // Apply rate limiting - Demographics API costs high quota points
      await this.handleRateLimiting(async () => {
        // Estimate using 150 quota points for this operation
        return true;
      });
      
      // Determine date range for audience data
      const endDate = options.endDate ? new Date(options.endDate) : new Date();
      const startDate = options.startDate 
        ? new Date(options.startDate)
        : new Date(endDate.getTime() - 28 * 24 * 60 * 60 * 1000); // Default to 28 days
      
      // Format dates for YouTube API
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Fetch audience age and gender demographics
      const ageGenderResponse = await this.apiClient.get('/v2/reports', {
        params: {
          'start-date': formattedStartDate,
          'end-date': formattedEndDate,
          ids: `channel==${tokenData.additionalData?.channelId}`,
          metrics: 'viewerPercentage',
          dimensions: 'ageGroup,gender',
          sort: 'gender,ageGroup',
          key: process.env.YOUTUBE_API_KEY
        },
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`
        }
      });
      
      // Fetch audience geography
      const geographyResponse = await this.apiClient.get('/v2/reports', {
        params: {
          'start-date': formattedStartDate,
          'end-date': formattedEndDate,
          ids: `channel==${tokenData.additionalData?.channelId}`,
          metrics: 'views',
          dimensions: 'country',
          sort: '-views',
          maxResults: 25, // Top 25 countries
          key: process.env.YOUTUBE_API_KEY
        },
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`
        }
      });
      
      // Fetch audience device and platform data
      const deviceResponse = await this.apiClient.get('/v2/reports', {
        params: {
          'start-date': formattedStartDate,
          'end-date': formattedEndDate,
          ids: `channel==${tokenData.additionalData?.channelId}`,
          metrics: 'views',
          dimensions: 'deviceType,operatingSystem',
          sort: '-views',
          key: process.env.YOUTUBE_API_KEY
        },
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`
        }
      });
      
      // Transform all audience data to standardized format
      const audienceData = this.transformAudience({
        ageGender: ageGenderResponse.data,
        geography: geographyResponse.data,
        devices: deviceResponse.data
      });
      
      logger.debug(`Fetched YouTube audience data for user ${userId}`, {
        demographics: Object.keys(audienceData)
      });
      
      return {
        success: true,
        audience: audienceData,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      };
    } catch (error) {
      logger.error(`Error fetching YouTube audience data: ${error.message}`, {
        userId,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: `Failed to fetch YouTube audience data: ${error.message}`,
        audience: {}
      };
    }
  }

  /**
   * Refresh the YouTube access token when expired
   * @param userId User ID of the creator
   * @returns Updated authentication tokens
   */
  async refreshToken(userId: string): Promise<AuthResult> {
    try {
      logger.info(`Refreshing YouTube token for user ${userId}`);
      
      // Retrieve encrypted refresh token
      // In a real implementation, this would be fetched from a database
      // For this example, we'll assume we have access to the encrypted token
      const encryptedToken = ''; // This would be retrieved from database
      
      if (!encryptedToken) {
        return {
          success: false,
          error: 'No refresh token found',
          platformType: PlatformType.YOUTUBE
        };
      }
      
      // Decrypt the refresh token
      const refreshToken = await decryptToken(encryptedToken, {
        userId,
        platformType: PlatformType.YOUTUBE
      });
      
      // Create OAuth client
      const oauth2Client = this.getAuthClient();
      
      // Set the refresh token
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      // Request new access token
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Encrypt new access token
      const encryptedAccessToken = await encryptToken(credentials.access_token!, {
        userId,
        platformType: PlatformType.YOUTUBE
      });
      
      // Encrypt new refresh token if provided
      const newEncryptedRefreshToken = credentials.refresh_token 
        ? await encryptToken(credentials.refresh_token, {
            userId,
            platformType: PlatformType.YOUTUBE
          })
        : encryptedToken; // Keep the existing one if not updated
      
      // Calculate expiry
      const expiryDate = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + (credentials.expires_in || 3600) * 1000);
      
      logger.info(`Successfully refreshed YouTube token for user ${userId}`);
      
      return {
        success: true,
        platformType: PlatformType.YOUTUBE,
        accessToken: encryptedAccessToken,
        refreshToken: newEncryptedRefreshToken,
        tokenExpiresAt: expiryDate
      };
    } catch (error) {
      logger.error(`Error refreshing YouTube token: ${error.message}`, {
        userId,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: `Failed to refresh YouTube token: ${error.message}`,
        platformType: PlatformType.YOUTUBE
      };
    }
  }
  
  /**
   * Disconnect the platform integration
   * @param userId The ID of the user
   * @returns Promise resolving when disconnection is complete
   */
  async disconnect(userId: string): Promise<any> {
    try {
      logger.info(`Disconnecting YouTube account for user ${userId}`);
      
      // In a real implementation, this would:
      // 1. Revoke the access token with Google's OAuth server
      // 2. Delete the tokens from our database
      // 3. Update the user's platform connection status
      
      // Simulate successful disconnection
      return {
        success: true,
        message: 'YouTube account disconnected successfully'
      };
    } catch (error) {
      logger.error(`Error disconnecting YouTube account: ${error.message}`, {
        userId,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: `Failed to disconnect YouTube account: ${error.message}`
      };
    }
  }

  /**
   * Create and configure Google OAuth client
   * @returns Configured OAuth client
   */
  private getAuthClient(): OAuth2Client {
    return new OAuth2Client(
      this.CLIENT_ID,
      this.CLIENT_SECRET,
      this.REDIRECT_URI
    );
  }

  /**
   * Fetch channel information using authorized client or access token
   * @param oauthClient Optional OAuth client to use
   * @param accessToken Optional access token to use directly
   * @returns Channel information
   */
  private async fetchChannelInfo(oauthClient: OAuth2Client | null, accessToken?: string): Promise<any> {
    try {
      // Determine authentication method
      const authHeader = accessToken 
        ? { Authorization: `Bearer ${accessToken}` }
        : { Authorization: `Bearer ${(await oauthClient?.getAccessToken()).token}` };
      
      // Fetch data from YouTube API
      const response = await this.apiClient.get('/v3/channels', {
        params: {
          part: 'snippet,statistics',
          mine: true,
          key: process.env.YOUTUBE_API_KEY
        },
        headers: authHeader
      });
      
      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No YouTube channel found for this account');
      }
      
      const channel = response.data.items[0];
      
      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnailUrl: channel.snippet.thumbnails?.default?.url || channel.snippet.thumbnails?.medium?.url,
        subscriberCount: parseInt(channel.statistics.subscriberCount, 10) || 0,
        videoCount: parseInt(channel.statistics.videoCount, 10) || 0,
        viewCount: parseInt(channel.statistics.viewCount, 10) || 0
      };
    } catch (error) {
      logger.error(`Error fetching YouTube channel info: ${error.message}`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Map YouTube content types to standardized content types
   * @param youtubeContentType YouTube content type
   * @param metadata Additional metadata for determining type
   * @returns Standardized content type
   */
  private mapContentType(youtubeContentType: string, metadata: any): ContentType {
    // YouTube primarily has videos, but we need to distinguish shorts
    // Check if the video is a short based on duration and aspect ratio
    if (youtubeContentType === 'youtube#video') {
      // YouTube Shorts are usually vertical videos under 60 seconds
      const duration = metadata.duration; // Expected in seconds
      const isVertical = metadata.height > metadata.width;
      
      if (duration <= 60 && isVertical) {
        return ContentType.SHORT_VIDEO;
      }
      
      return ContentType.VIDEO;
    }
    
    // Default to regular video for anything else
    return ContentType.VIDEO;
  }

  /**
   * Transform YouTube content data to standardized format
   * @param youtubeData YouTube content data
   * @returns Array of standardized content items
   */
  private transformContent(youtubeData: any[]): any[] {
    return youtubeData.map(video => {
      // Calculate duration in seconds from ISO 8601 format
      let durationSeconds = 0;
      const durationISO = video.contentDetails?.duration || 'PT0S';
      
      // Parse ISO 8601 duration (e.g., PT1H2M3S)
      const hoursMatch = durationISO.match(/(\d+)H/);
      const minutesMatch = durationISO.match(/(\d+)M/);
      const secondsMatch = durationISO.match(/(\d+)S/);
      
      if (hoursMatch) durationSeconds += parseInt(hoursMatch[1], 10) * 3600;
      if (minutesMatch) durationSeconds += parseInt(minutesMatch[1], 10) * 60;
      if (secondsMatch) durationSeconds += parseInt(secondsMatch[1], 10);
      
      // Extract thumbnail with highest resolution
      const thumbnails = video.snippet.thumbnails;
      const thumbnailUrl = thumbnails?.maxres?.url || 
                          thumbnails?.high?.url || 
                          thumbnails?.medium?.url || 
                          thumbnails?.default?.url;
      
      // Calculate aspect ratio for content type determination
      const height = thumbnails?.high?.height || 360;
      const width = thumbnails?.high?.width || 480;
      
      // Determine content type
      const contentType = this.mapContentType('youtube#video', {
        duration: durationSeconds,
        height,
        width
      });
      
      // Get statistics or default to zeroes
      const statistics = video.statistics || {};
      
      return {
        id: video.id,
        externalId: video.id,
        platform: PlatformType.YOUTUBE,
        title: video.snippet.title,
        description: video.snippet.description,
        contentType,
        publishedAt: new Date(video.snippet.publishedAt),
        url: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnail: thumbnailUrl,
        duration: durationSeconds,
        views: parseInt(statistics.viewCount, 10) || 0,
        likes: parseInt(statistics.likeCount, 10) || 0,
        comments: parseInt(statistics.commentCount, 10) || 0,
        shares: 0, // YouTube API doesn't provide share count
        engagements: (parseInt(statistics.likeCount, 10) || 0) + 
                    (parseInt(statistics.commentCount, 10) || 0),
        engagementRate: statistics.viewCount ? 
                      ((parseInt(statistics.likeCount, 10) || 0) + 
                      (parseInt(statistics.commentCount, 10) || 0)) / 
                      parseInt(statistics.viewCount, 10) * 100 : 0,
        tags: video.snippet.tags || [],
        metadata: {
          categoryId: video.snippet.categoryId,
          liveBroadcastContent: video.snippet.liveBroadcastContent,
          publishedAt: video.snippet.publishedAt,
          channelId: video.snippet.channelId,
          channelTitle: video.snippet.channelTitle,
          defaultAudioLanguage: video.snippet.defaultAudioLanguage,
          defaultLanguage: video.snippet.defaultLanguage
        }
      };
    });
  }

  /**
   * Transform YouTube metrics data to standardized format
   * @param youtubeMetrics YouTube metrics data
   * @returns Standardized metrics object
   */
  private transformMetrics(youtubeMetrics: any): any {
    if (!youtubeMetrics || !youtubeMetrics.rows || youtubeMetrics.rows.length === 0) {
      return {
        views: 0,
        engagements: 0,
        engagementRate: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        watchTime: 0,
        averageViewDuration: 0,
        timeSeries: []
      };
    }
    
    // Extract column headers to understand the data structure
    const columnHeaders = youtubeMetrics.columnHeaders.map((header: any) => header.name);
    
    // Initialize totals
    let totalViews = 0;
    let totalLikes = 0;
    let totalDislikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalWatchTime = 0; // In minutes
    let totalSubscribersGained = 0;
    let totalSubscribersLost = 0;
    
    // Process each row of data
    const timeSeriesData: any[] = [];
    youtubeMetrics.rows.forEach((row: any) => {
      const entry: any = { date: row[0] }; // First element is usually the date
      
      // Map each metric to the corresponding value in the row
      columnHeaders.forEach((header: string, index: number) => {
        if (header === 'day') return; // Skip date column
        
        const value = parseFloat(row[index]);
        entry[header] = value;
        
        // Update totals
        switch (header) {
          case 'views':
            totalViews += value;
            break;
          case 'likes':
            totalLikes += value;
            break;
          case 'dislikes':
            totalDislikes += value;
            break;
          case 'comments':
            totalComments += value;
            break;
          case 'shares':
            totalShares += value;
            break;
          case 'estimatedMinutesWatched':
            totalWatchTime += value;
            break;
          case 'subscribersGained':
            totalSubscribersGained += value;
            break;
          case 'subscribersLost':
            totalSubscribersLost += value;
            break;
        }
      });
      
      timeSeriesData.push(entry);
    });
    
    // Calculate engagement metrics
    const totalEngagements = totalLikes + totalComments + totalShares;
    const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;
    const averageViewDuration = totalViews > 0 ? totalWatchTime / totalViews : 0;
    const netSubscriberChange = totalSubscribersGained - totalSubscribersLost;
    
    // Return standardized metrics
    return {
      views: totalViews,
      engagements: totalEngagements,
      engagementRate: engagementRate,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      watchTime: totalWatchTime,
      averageViewDuration: averageViewDuration,
      subscribersGained: totalSubscribersGained || 0,
      subscribersLost: totalSubscribersLost || 0,
      netSubscriberChange: netSubscriberChange || 0,
      timeSeries: timeSeriesData
    };
  }

  /**
   * Transform YouTube audience data to standardized format
   * @param youtubeAudience YouTube audience data
   * @returns Standardized audience object
   */
  private transformAudience(youtubeAudience: any): any {
    // Default values if data is missing
    if (!youtubeAudience) {
      return {
        ageDistribution: {},
        genderDistribution: {},
        geoDistribution: {},
        deviceDistribution: {}
      };
    }
    
    // Process age and gender data
    const ageGenderData = youtubeAudience.ageGender || {};
    const ageDistribution: Record<string, number> = {};
    const genderDistribution: Record<string, number> = {
      male: 0,
      female: 0,
      other: 0
    };
    
    // Process rows and map to standard format
    if (ageGenderData.rows && ageGenderData.rows.length > 0) {
      ageGenderData.rows.forEach((row: any) => {
        // Format typically: [ageRange, gender, percentage]
        const ageRange = row[0].replace('age', ''); // e.g., "age18-24" -> "18-24"
        const gender = row[1].toLowerCase();
        const percentage = parseFloat(row[2]);
        
        // Update age distribution
        if (!ageDistribution[ageRange]) {
          ageDistribution[ageRange] = 0;
        }
        ageDistribution[ageRange] += percentage;
        
        // Update gender distribution
        if (gender === 'male' || gender === 'female') {
          genderDistribution[gender] += percentage;
        } else {
          genderDistribution.other += percentage;
        }
      });
    }
    
    // Process geography data
    const geographyData = youtubeAudience.geography || {};
    const geoDistribution: Record<string, number> = {};
    
    if (geographyData.rows && geographyData.rows.length > 0) {
      geographyData.rows.forEach((row: any) => {
        // Format typically: [countryCode, views]
        const countryCode = row[0];
        const views = parseInt(row[1], 10);
        geoDistribution[countryCode] = views;
      });
    }
    
    // Process device data
    const deviceData = youtubeAudience.devices || {};
    const deviceDistribution: Record<string, number> = {};
    const osDistribution: Record<string, number> = {};
    
    if (deviceData.rows && deviceData.rows.length > 0) {
      deviceData.rows.forEach((row: any) => {
        // Format typically: [deviceType, operatingSystem, views]
        const deviceType = row[0].toLowerCase();
        const operatingSystem = row[1].toLowerCase();
        const views = parseInt(row[2], 10);
        
        // Update device distribution
        if (!deviceDistribution[deviceType]) {
          deviceDistribution[deviceType] = 0;
        }
        deviceDistribution[deviceType] += views;
        
        // Update OS distribution
        if (!osDistribution[operatingSystem]) {
          osDistribution[operatingSystem] = 0;
        }
        osDistribution[operatingSystem] += views;
      });
    }
    
    // Return standardized audience data
    return {
      ageDistribution,
      genderDistribution,
      geoDistribution,
      deviceDistribution,
      osDistribution
    };
  }

  /**
   * Handle YouTube API rate limits with exponential backoff
   * @param apiCall Function that makes the API call
   * @returns API response after handling rate limits
   */
  private async handleRateLimiting(apiCall: Function): Promise<any> {
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: any = null;
    
    while (retryCount <= maxRetries) {
      try {
        // Check if rate limit is exceeded using the rate limiter
        await this.rateLimiter.consume('youtube_api', 1);
        
        // Make the API call
        return await apiCall();
      } catch (error) {
        // Track the last error
        lastError = error;
        
        // Check if it's a rate limiting error
        if (error.response && error.response.status === 429) {
          // Get retry delay from response headers or use exponential backoff
          const retryAfter = parseInt(error.response.headers['retry-after'], 10) || Math.pow(2, retryCount) * 1000;
          
          logger.warn(`YouTube API rate limit exceeded. Retrying in ${retryAfter}ms`, {
            retryCount,
            retryAfter
          });
          
          // Wait for the retry-after period
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          
          // Increment retry counter
          retryCount++;
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          // Network timeout, retry with backoff
          const backoffTime = Math.pow(2, retryCount) * 1000;
          
          logger.warn(`YouTube API request timeout. Retrying in ${backoffTime}ms`, {
            retryCount,
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          retryCount++;
        } else {
          // If it's not a rate limiting error, rethrow
          throw error;
        }
      }
    }
    
    // If we've exhausted retries, throw the last error
    logger.error(`YouTube API request failed after ${maxRetries} retries`, {
      error: lastError.message,
      stack: lastError.stack
    });
    
    throw lastError;
  }

  /**
   * Helper method to retrieve and decrypt access token
   * @param userId User ID to get token for
   * @returns Decrypted token data
   */
  private async getAccessToken(userId: string): Promise<any> {
    // In a real implementation, this would retrieve the encrypted token from a database
    // For this example, we'll assume we have a way to get the encrypted token
    const encryptedToken = ''; // This would be retrieved from database
    
    if (!encryptedToken) {
      // Try to refresh the token if available
      const refreshResult = await this.refreshToken(userId);
      if (refreshResult.success) {
        return {
          accessToken: refreshResult.accessToken,
          additionalData: refreshResult.additionalData
        };
      }
      
      return { accessToken: null };
    }
    
    try {
      // Decrypt the token
      const accessToken = await decryptToken(encryptedToken, {
        userId,
        platformType: PlatformType.YOUTUBE
      });
      
      // Return the token and any additional data
      return {
        accessToken,
        additionalData: {} // This would contain channelId etc. from the database
      };
    } catch (error) {
      logger.error(`Error decrypting YouTube token: ${error.message}`, {
        userId,
        error: error.message
      });
      
      // Try to refresh the token
      const refreshResult = await this.refreshToken(userId);
      if (refreshResult.success) {
        return {
          accessToken: refreshResult.accessToken,
          additionalData: refreshResult.additionalData
        };
      }
      
      return { accessToken: null };
    }
  }
}

export { YouTubeAdapter };