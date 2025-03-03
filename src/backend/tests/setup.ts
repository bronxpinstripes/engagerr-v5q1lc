/**
 * Test environment setup for Engagerr backend
 * Configures database, mock services and global Jest hooks
 */

import { APP_CONFIG } from '../src/config/constants';
import { prisma } from '../src/config/database';
import { supabaseClient } from '../src/config/supabase';
import { logger } from '../src/utils/logger';
import { TASK_TYPES } from '../src/config/ai';
import axios from 'axios'; // ^1.4.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.5

// Global object to store mock instances accessible across test files
export const globalMocks: {
  axios: MockAdapter | null;
  aiServices: Record<string, any> | null;
  supabase: Record<string, any> | null;
  stripe: Record<string, any> | null;
} = {
  axios: null,
  aiServices: null,
  supabase: null,
  stripe: null,
};

/**
 * Initializes the test database with a clean schema and test data
 */
export async function setupTestDatabase(): Promise<void> {
  // Verify we're in the test environment to prevent accidental production data modification
  if (!APP_CONFIG.IS_TEST) {
    throw new Error('setupTestDatabase should only be called in test environment');
  }

  try {
    logger.info('Setting up test database...');

    // Reset database to a clean state
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE;`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA public;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO postgres;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public;`);
    
    // Apply migrations for test database
    logger.info('Applying database migrations...');
    // In a real implementation, you would use Prisma's migration API
    // For example: await exec('npx prisma migrate deploy');
    
    // Seed test data within a transaction for atomicity
    logger.info('Seeding test data...');
    await prisma.$transaction(async (tx) => {
      await seedTestData(tx);
    });
    
    logger.info('Test database setup completed successfully');
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to set up test database');
    throw error;
  }
}

/**
 * Seeds the test database with fixture data
 */
async function seedTestData(prismaClient: any): Promise<void> {
  try {
    // Create test users
    await prismaClient.user.createMany({
      data: [
        {
          id: 'test-creator-id',
          email: 'test-creator@example.com',
          name: 'Test Creator',
          userType: 'CREATOR',
        },
        {
          id: 'test-brand-id',
          email: 'test-brand@example.com',
          name: 'Test Brand',
          userType: 'BRAND',
        },
      ],
      skipDuplicates: true,
    });

    // Create test creators and brands
    await prismaClient.creator.create({
      data: {
        id: 'test-creator-profile-id',
        userId: 'test-creator-id',
        bio: 'Test creator bio',
        categories: ['Tech', 'Lifestyle'],
        verificationStatus: 'VERIFIED',
        subscriptionTier: 'PRO',
      },
    });

    await prismaClient.brand.create({
      data: {
        id: 'test-brand-profile-id',
        userId: 'test-brand-id',
        companyName: 'Test Brand Inc.',
        industries: ['Technology'],
        subscriptionTier: 'GROWTH',
      },
    });

    // Create test platforms and content
    await prismaClient.platform.create({
      data: {
        id: 'test-platform-id',
        creatorId: 'test-creator-profile-id',
        platformType: 'YOUTUBE',
        handle: '@testcreator',
        lastSyncAt: new Date(),
      },
    });
    
    await prismaClient.content.createMany({
      data: [
        {
          id: 'test-content-root-id',
          creatorId: 'test-creator-profile-id',
          platformId: 'test-platform-id',
          externalId: 'yt-123456',
          title: 'Test Parent Content',
          contentType: 'VIDEO',
          publishedAt: new Date('2023-01-01'),
        },
        {
          id: 'test-content-child-id',
          creatorId: 'test-creator-profile-id',
          platformId: 'test-platform-id',
          externalId: 'yt-654321',
          title: 'Test Child Content',
          contentType: 'SHORT_FORM_VIDEO',
          publishedAt: new Date('2023-01-02'),
        },
      ],
    });

    // Create test content relationships
    await prismaClient.contentRelationship.create({
      data: {
        id: 'test-relationship-id',
        sourceId: 'test-content-root-id',
        targetId: 'test-content-child-id',
        relationshipType: 'PARENT_CHILD',
        confidence: 0.95,
      },
    });

    logger.info('Test data seeded successfully');
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to seed test data');
    throw error;
  }
}

/**
 * Configures mock implementations for external services and dependencies
 */
export function setupMocks(): object {
  logger.info('Setting up test mocks...');
  
  // Set up axios mock for external API requests
  const axiosMock = new MockAdapter(axios);
  
  // Configure platform API mocks
  setupPlatformAPIMocks(axiosMock);
  
  // Set up AI service mocks
  const aiServiceMocks = setupAIServiceMocks();
  
  // Set up Supabase mocks
  const supabaseMocks = setupSupabaseMocks();
  
  // Set up Stripe mocks
  const stripeMocks = setupStripeMocks();
  
  // Store mock instances in global object for access across tests
  globalMocks.axios = axiosMock;
  globalMocks.aiServices = aiServiceMocks;
  globalMocks.supabase = supabaseMocks;
  globalMocks.stripe = stripeMocks;
  
  logger.info('Test mocks setup completed successfully');
  
  return {
    axios: axiosMock,
    aiServices: aiServiceMocks,
    supabase: supabaseMocks,
    stripe: stripeMocks,
  };
}

/**
 * Configures mocks for platform API endpoints
 */
function setupPlatformAPIMocks(axiosMock: MockAdapter): void {
  // YouTube API mocks
  axiosMock.onGet(/youtube\/v3\/channels/).reply(200, {
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
  
  axiosMock.onGet(/youtube\/v3\/videos/).reply(200, {
    items: [{
      id: 'yt-123456',
      snippet: {
        title: 'Test YouTube Video',
        description: 'A test video for YouTube',
        publishedAt: '2023-01-01T00:00:00Z',
      },
      statistics: {
        viewCount: '50000',
        likeCount: '5000',
        commentCount: '1000',
      },
    }],
  });
  
  // Instagram API mocks
  axiosMock.onGet(/graph\.instagram\.com/).reply(200, {
    username: 'testcreator',
    media_count: 100,
    follower_count: 50000,
    media: {
      data: [{
        id: 'ig-123456',
        caption: 'Test Instagram Post',
        media_type: 'IMAGE',
        timestamp: '2023-01-01T00:00:00Z',
        like_count: 2000,
        comments_count: 500,
      }],
    },
  });
  
  // TikTok API mocks
  axiosMock.onGet(/open\.tiktokapis\.com/).reply(200, {
    data: {
      user: {
        display_name: 'Test Creator',
        follower_count: 75000,
      },
      videos: [{
        id: 'tt-123456',
        title: 'Test TikTok Video',
        create_time: 1672531200, // 2023-01-01T00:00:00Z
        share_count: 1000,
        like_count: 10000,
        comment_count: 2000,
        view_count: 100000,
      }],
    },
  });
}

/**
 * Creates mock implementations of AI services with predefined responses
 */
export function setupAIServiceMocks(): object {
  const aiMocks = {
    // Mock implementations for DeepSeek API
    deepseek: {
      analyze: jest.fn().mockImplementation((content) => {
        return Promise.resolve({
          topics: ['Test topic 1', 'Test topic 2'],
          quality: 'high',
          engagementPotential: 'medium',
          entities: ['test entity 1', 'test entity 2'],
          sentiment: 'positive',
          categories: ['Tech', 'Lifestyle'],
        });
      }),
      generate: jest.fn().mockImplementation((prompt) => {
        return Promise.resolve({
          contentIdeas: [
            {
              title: 'Test content idea 1',
              platform: 'YouTube',
              format: 'Tutorial',
              rationale: 'Test rationale 1',
            },
            {
              title: 'Test content idea 2',
              platform: 'TikTok',
              format: 'Short-form',
              rationale: 'Test rationale 2',
            },
          ],
        });
      }),
    },
    
    // Mock implementations for Llama model
    llama: {
      analyze: jest.fn().mockImplementation((content) => {
        return Promise.resolve({
          topics: ['Test topic 1', 'Test topic 2'],
          quality: 'medium',
          engagementPotential: 'high',
          entities: ['test entity 1', 'test entity 2'],
          sentiment: 'neutral',
          categories: ['Tech', 'Education'],
        });
      }),
      detectRelationships: jest.fn().mockImplementation((content1, content2) => {
        return Promise.resolve({
          relationshipType: 'parent-child',
          confidence: 0.92,
          justification: 'Test relationship justification',
          directionality: 'content1 is parent of content2',
        });
      }),
    },
    
    // Mock implementations for Mistral model
    mistral: {
      classify: jest.fn().mockImplementation((content) => {
        return Promise.resolve({
          primaryCategory: 'Tech',
          confidence: 0.95,
          contentFormat: 'Tutorial',
          targetAudience: ['tech enthusiasts', 'beginners'],
          contentTone: 'informative',
          industryVertical: 'Technology',
        });
      }),
    },
    
    // Mock implementations for CLIP/BLIP
    clip: {
      analyzeImage: jest.fn().mockImplementation((imageUrl) => {
        return Promise.resolve({
          objects: ['object 1', 'object 2'],
          sceneContext: 'indoor setting',
          visualAttributes: ['bright', 'colorful'],
          contentSafety: 'safe',
          textContent: 'sample text in image',
        });
      }),
    },
    
    // Task router mock
    router: {
      routeTask: jest.fn().mockImplementation((task, content) => {
        switch (task) {
          case TASK_TYPES.CONTENT_ANALYSIS:
            return aiMocks.llama.analyze(content);
          case TASK_TYPES.RELATIONSHIP_DETECTION:
            return aiMocks.llama.detectRelationships(content.content1, content.content2);
          case TASK_TYPES.CREATIVE_GENERATION:
            return aiMocks.deepseek.generate(content);
          case TASK_TYPES.CLASSIFICATION:
            return aiMocks.mistral.classify(content);
          case TASK_TYPES.IMAGE_ANALYSIS:
            return aiMocks.clip.analyzeImage(content);
          default:
            return Promise.reject(new Error(`Unknown task type: ${task}`));
        }
      }),
    },
  };
  
  return aiMocks;
}

/**
 * Configures mocks for Supabase authentication and storage
 */
export function setupSupabaseMocks(): object {
  const supabaseMocks = {
    auth: {
      signUp: jest.fn().mockImplementation((credentials) => {
        return Promise.resolve({
          data: {
            user: {
              id: 'test-user-id',
              email: credentials.email,
            },
            session: {
              access_token: 'test-access-token',
              refresh_token: 'test-refresh-token',
              expires_at: Date.now() + 3600000,
            },
          },
          error: null,
        });
      }),
      
      signIn: jest.fn().mockImplementation((credentials) => {
        return Promise.resolve({
          data: {
            user: {
              id: 'test-user-id',
              email: credentials.email,
            },
            session: {
              access_token: 'test-access-token',
              refresh_token: 'test-refresh-token',
              expires_at: Date.now() + 3600000,
            },
          },
          error: null,
        });
      }),
      
      signOut: jest.fn().mockResolvedValue({ error: null }),
      
      getSession: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          data: {
            session: {
              access_token: 'test-access-token',
              refresh_token: 'test-refresh-token',
              expires_at: Date.now() + 3600000,
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
              },
            },
          },
          error: null,
        });
      }),
    },
    
    storage: {
      from: jest.fn().mockImplementation((bucket) => {
        return {
          upload: jest.fn().mockResolvedValue({ 
            data: { path: `${bucket}/test-file.jpg` }, 
            error: null 
          }),
          download: jest.fn().mockResolvedValue({ 
            data: new Uint8Array([0, 1, 2, 3]), 
            error: null 
          }),
          getPublicUrl: jest.fn().mockReturnValue({ 
            data: { publicUrl: `https://test-storage.com/${bucket}/test-file.jpg` } 
          }),
          remove: jest.fn().mockResolvedValue({ data: null, error: null }),
          list: jest.fn().mockResolvedValue({
            data: [
              { name: 'test-file-1.jpg' },
              { name: 'test-file-2.jpg' },
            ],
            error: null,
          }),
        };
      }),
    },
    
    // Mock for database queries via Supabase
    from: jest.fn().mockImplementation((table) => {
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
        then: jest.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null }),
      };
    }),
  };
  
  // Replace supabaseClient methods with mocks
  if (supabaseClient) {
    Object.defineProperty(supabaseClient, 'auth', { value: supabaseMocks.auth });
    Object.defineProperty(supabaseClient, 'storage', { value: supabaseMocks.storage });
    Object.defineProperty(supabaseClient, 'from', { value: supabaseMocks.from });
  }
  
  return supabaseMocks;
}

/**
 * Sets up mock implementations for Stripe API
 */
function setupStripeMocks(): object {
  const stripeMocks = {
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User',
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User',
      }),
    },
    
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          data: [{
            id: 'si_test123',
            price: {
              id: 'price_test123',
              product: 'prod_test123',
            },
          }],
        },
      }),
      update: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'canceled',
      }),
    },
    
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret_test123',
        amount: 5000, // $50.00
        currency: 'usd',
        status: 'requires_payment_method',
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
      }),
      capture: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
      }),
    },
    
    transfers: {
      create: jest.fn().mockResolvedValue({
        id: 'tr_test123',
        amount: 4500, // $45.00 (after platform fee)
        currency: 'usd',
        destination: 'acct_test123',
      }),
    },
  };
  
  return stripeMocks;
}

/**
 * Main Jest global setup function that runs before all tests
 */
export async function globalSetup(): Promise<void> {
  try {
    logger.info('Starting global test setup...');
    
    // Verify test environment
    if (!APP_CONFIG.IS_TEST) {
      throw new Error('Tests must run in the test environment to prevent data corruption');
    }
    
    // Setup test database
    await setupTestDatabase();
    
    // Setup mocks
    setupMocks();
    
    // Set up test-specific environment variables if needed
    process.env.TEST_MODE = 'true';
    
    logger.info('Global test setup completed successfully');
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Global test setup failed');
    
    throw error;
  }
}

// Default export of globalSetup function for Jest configuration
export default globalSetup;