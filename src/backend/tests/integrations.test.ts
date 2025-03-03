import { describe, it, expect, jest, beforeAll, beforeEach, afterEach, afterAll } from 'jest'; // version: ^29.6.0
import MockAdapter from 'axios-mock-adapter'; // version: ^1.21.5
import { Stripe } from 'stripe'; // version: ^12.0.0
import * as integrations from '../src/integrations';
import { YouTubeAdapter } from '../src/integrations/platforms/youtube';
import DeepSeekService from '../src/services/ai/deepseek';
import * as stripePayment from '../src/integrations/stripe/payment';
import * as stripeSubscription from '../src/integrations/stripe/subscription';
import * as resend from '../src/integrations/resend';
import { ExternalServiceError } from '../src/utils/errors';
import { globalMocks, setupMocks } from './setup';
import nock from 'nock'; // version: ^13.3.1

/**
 * Test suite for Engagerr's integration components, validating the platform's connections to external services including social platforms, payment processing, and email delivery.
 * These tests ensure that the Integration Framework correctly handles authentication, data transformation, error cases, and implements resilience patterns as specified.
 */
describe('Engagerr Integrations Tests', () => {
  let axiosMock: MockAdapter;
  let aiServiceMocks: any;
  let supabaseMocks: any;
  let stripeMocks: any;

  beforeAll(() => {
    const mocks = setupMocks();
    axiosMock = mocks.axios;
    aiServiceMocks = mocks.aiServices;
    supabaseMocks = mocks.supabase;
    stripeMocks = mocks.stripe;
  });

  beforeEach(() => {
    axiosMock.reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    axiosMock.restore();
  });

  /**
   * Sets up mock responses for external integration tests
   * @returns Mock configuration and instances for test use
   */
  const setupIntegrationMocks = () => {
    // Configure axios mock adapter for HTTP requests
    const axiosMock = new MockAdapter(axios);

    // Set up mock responses for social platform APIs
    axiosMock.onGet(/youtube\.googleapis\.com/).reply(200, { items: [] });
    axiosMock.onGet(/instagram\.com/).reply(200, { data: [] });
    axiosMock.onGet(/tiktokapis\.com/).reply(200, { data: [] });

    // Configure Stripe mock responses for payment tests
    const stripe = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret' }),
        retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' }),
      },
    };

    // Set up Resend email API mocks
    const resendSendEmailMock = jest.spyOn(resend, 'sendEmail');
    resendSendEmailMock.mockResolvedValue({ success: true, id: 'resend_test_id' });

    return { axiosMock, stripe, resendSendEmailMock };
  };

  /**
   * Creates realistic mock data for platform integration tests
   * @param platform
   * @returns Platform-specific mock data
   */
  const createMockPlatformData = (platform: string) => {
    // Generate realistic content data based on platform
    const contentData = {
      title: `Test ${platform} Content`,
      description: `This is a test content item for ${platform}`,
      url: `https://www.${platform}.com/testcontent`,
      views: 1000,
      likes: 100,
      comments: 50,
      shares: 20,
    };

    // Create mock metrics that match platform structures
    const metrics = {
      views: 1000,
      likes: 100,
      comments: 50,
      shares: 20,
    };

    // Generate audience demographic data
    const audience = {
      ageRanges: { '18-24': 50, '25-34': 30, '35-44': 20 },
      genderDistribution: { male: 60, female: 40 },
      topLocations: { US: 70, CA: 20, UK: 10 },
    };

    return { contentData, metrics, audience };
  };

  /**
   * Creates a mock rate-limited response to test backoff strategies
   * @param platform
   * @returns Mock rate limit error response
   */
  const mockRateLimitedResponse = (platform: string) => {
    // Create appropriate error status code (429)
    const status = 429;

    // Add platform-specific rate limit headers
    const headers: any = {
      'content-type': 'application/json',
    };

    if (platform === 'youtube') {
      headers['retry-after'] = 60; // Example retry-after header
    } else if (platform === 'instagram') {
      headers['x-ratelimit-remaining'] = 0;
      headers['x-ratelimit-reset'] = Date.now() + 60000; // Example reset time
    }

    // Include retry-after information if applicable
    const data = {
      error: {
        message: 'Rate limit exceeded',
        code: '429',
      },
    };

    return { status, headers, data };
  };

  /**
   * Creates a mock Stripe payment intent for testing
   * @param options
   * @returns Mock payment intent that mimics Stripe response
   */
  const mockStripePaymentIntent = (options: any) => {
    // Generate payment intent ID with test prefix
    const paymentIntentId = `pi_test_${Math.random().toString(36).substring(2, 15)}`;

    // Set status based on options (succeeded, processing, requires_payment_method)
    const status = options.status || 'succeeded';

    // Include client_secret for frontend testing
    const client_secret = `${paymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`;

    // Add amounts, currency and metadata fields
    const amount = options.amount || 1000; // Default $10.00
    const currency = options.currency || 'usd';
    const metadata = options.metadata || {};

    return {
      id: paymentIntentId,
      client_secret: client_secret,
      amount: amount,
      currency: currency,
      status: status,
      metadata: metadata,
    };
  };

  it('should successfully connect to YouTube', async () => {
    // Arrange
    const { axiosMock } = setupIntegrationMocks();
    const youtubeAdapter = new YouTubeAdapter();
    const userId = 'test-user';
    const code = 'test-auth-code';
    const redirectUri = 'http://localhost:3000/api/integrations/youtube/callback';

    // Mock successful token exchange
    axiosMock.onPost('https://oauth2.googleapis.com/token').reply(200, {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    });

    // Mock successful channel info retrieval
    axiosMock.onGet(/youtube\.googleapis\.com\/youtube\/v3\/channels/).reply(200, {
      items: [{
        id: 'UC123456789',
        snippet: {
          title: 'Test YouTube Channel',
          description: 'A test channel for YouTube',
        },
        statistics: {
          subscriberCount: '100000',
          viewCount: '5000000',
          videoCount: '100',
        },
      }],
    });

    // Act
    const result = await youtubeAdapter.connect(userId, code, redirectUri);

    // Assert
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('should handle YouTube connection failure', async () => {
    // Arrange
    const { axiosMock } = setupIntegrationMocks();
    const youtubeAdapter = new YouTubeAdapter();
    const userId = 'test-user';
    const code = 'test-auth-code';
    const redirectUri = 'http://localhost:3000/api/integrations/youtube/callback';

    // Mock failed token exchange
    axiosMock.onPost('https://oauth2.googleapis.com/token').reply(500, {
      error: 'invalid_grant',
      error_description: 'Code was already redeemed',
    });

    // Act
    const result = await youtubeAdapter.connect(userId, code, redirectUri);

    // Assert
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('should fetch YouTube content successfully', async () => {
    // Arrange
    const { axiosMock } = setupIntegrationMocks();
    const youtubeAdapter = new YouTubeAdapter();
    const userId = 'test-user';

    // Mock successful token retrieval
    jest.spyOn(youtubeAdapter as any, 'getAccessToken').mockResolvedValue({ accessToken: 'test-access-token', additionalData: { channelId: 'UC123456789' } });

    // Mock successful video retrieval
    axiosMock.onGet(/youtube\.googleapis\.com\/youtube\/v3\/search/).reply(200, {
      items: [{ id: { videoId: 'test-video-id' }, snippet: { title: 'Test Video' } }],
    });

    // Mock successful video details retrieval
    axiosMock.onGet(/youtube\.googleapis\.com\/youtube\/v3\/videos/).reply(200, {
      items: [{ id: 'test-video-id', snippet: { title: 'Test Video' }, statistics: { viewCount: '1000' } }],
    });

    // Act
    const result = await youtubeAdapter.fetchContent(userId);

    // Assert
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('items');
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should handle YouTube content fetch failure', async () => {
    // Arrange
    const { axiosMock } = setupIntegrationMocks();
    const youtubeAdapter = new YouTubeAdapter();
    const userId = 'test-user';

    // Mock successful token retrieval
    jest.spyOn(youtubeAdapter as any, 'getAccessToken').mockResolvedValue({ accessToken: 'test-access-token', additionalData: { channelId: 'UC123456789' } });

    // Mock failed video retrieval
    axiosMock.onGet(/youtube\.googleapis\.com\/youtube\/v3\/search/).reply(500, {
      error: 'Internal Server Error',
    });

    // Act
    const result = await youtubeAdapter.fetchContent(userId);

    // Assert
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('should test DeepSeek API connection successfully', async () => {
    // Arrange
    const deepSeekService = new DeepSeekService();
    const testPrompt = 'Hello, this is a connection test. Please respond with "Connection successful".';

    // Mock successful API response
    axiosMock.onPost(/api\.deepseek\.com\/v1\/completions/).reply(200, {
      choices: [{ message: { content: 'Connection successful' } }],
    });

    // Act
    const result = await deepSeekService.testConnection();

    // Assert
    expect(result).toHaveProperty('status', 'connected');
    expect(result).toHaveProperty('latency');
  });

  it('should handle DeepSeek API connection test failure', async () => {
    // Arrange
    const deepSeekService = new DeepSeekService();

    // Mock failed API response
    axiosMock.onPost(/api\.deepseek\.com\/v1\/completions/).reply(500, {
      error: 'Internal Server Error',
    });

    // Act
    const result = await deepSeekService.testConnection();

    // Assert
    expect(result).toHaveProperty('status', 'error');
    expect(result).toHaveProperty('error');
  });

  it('should create a Stripe payment intent successfully', async () => {
    // Arrange
    const amount = 1000;
    const currency = 'usd';
    const metadata = { order_id: '123' };

    // Act
    const paymentIntent = await stripePayment.createPaymentIntent({ amount, currency, metadata });

    // Assert
    expect(paymentIntent).toHaveProperty('id');
    expect(paymentIntent).toHaveProperty('client_secret');
    expect(paymentIntent.amount).toBe(amount);
    expect(paymentIntent.currency).toBe(currency);
    expect(paymentIntent.metadata).toEqual(metadata);
  });

  it('should handle Stripe payment intent creation failure', async () => {
    // Arrange
    const amount = 1000;
    const currency = 'usd';

    // Mock Stripe API to throw an error
    (stripeMocks.paymentIntents.create as jest.Mock).mockRejectedValue(new Error('Stripe API error'));

    // Act & Assert
    await expect(stripePayment.createPaymentIntent({ amount, currency })).rejects.toThrow(ExternalServiceError);
  });

  it('should create a Stripe subscription successfully', async () => {
    // Arrange
    const customerId = 'cus_test123';
    const priceId = 'price_test123';

    // Act
    const subscription = await stripeSubscription.createSubscription(customerId, priceId);

    // Assert
    expect(subscription).toHaveProperty('id');
    expect(subscription.customer).toBe(customerId);
    expect(subscription.status).toBe('active');
  });

  it('should handle Stripe subscription creation failure', async () => {
    // Arrange
    const customerId = 'cus_test123';
    const priceId = 'price_test123';

    // Mock Stripe API to throw an error
    (stripeMocks.subscriptions.create as jest.Mock).mockRejectedValue(new Error('Stripe API error'));

    // Act & Assert
    await expect(stripeSubscription.createSubscription(customerId, priceId)).rejects.toThrow(ExternalServiceError);
  });

  it('should send an email using Resend successfully', async () => {
    // Arrange
    const options = {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test email content</p>',
    };

    // Act
    const result = await resend.sendEmail(options);

    // Assert
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('id');
  });

  it('should handle Resend email sending failure', async () => {
    // Arrange
    const options = {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test email content</p>',
    };

    // Mock Resend API to throw an error
    (resend as any).sendEmail = jest.fn().mockRejectedValue(new Error('Resend API error'));

    // Act & Assert
    await expect(resend.sendEmail(options)).rejects.toThrow(ApiError);
  });

  it('should handle rate limiting with exponential backoff', async () => {
    // Arrange
    const youtubeAdapter = new YouTubeAdapter();
    const userId = 'test-user';
    const contentId = 'test-content-id';

    // Mock successful token retrieval
    jest.spyOn(youtubeAdapter as any, 'getAccessToken').mockResolvedValue({ accessToken: 'test-access-token', additionalData: { channelId: 'UC123456789' } });

    // Mock rate-limited response
    axiosMock.onGet(/youtube\.googleapis\.com\/youtube\/v3\/videos/).reply(() => mockRateLimitedResponse('youtube'));

    // Act & Assert
    await expect(youtubeAdapter.fetchMetrics(userId, contentId)).rejects.toThrow(ExternalServiceError);
  });
});