import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Import types from the internal modules
import { UserType, SubscriptionTier } from '../src/types/user';
import { VerificationStatus } from '../src/types/creator';
import { PlatformType } from '../src/types/platform';
import { ContentType, RelationshipType, CreationMethod } from '../src/types/content';
import { hashPassword } from '../src/utils/crypto';
import logger from '../src/utils/logger';

// Load environment variables
dotenv.config();

/**
 * Creates test user accounts with different roles (creators, brands, admins)
 * @param prisma PrismaClient instance
 * @param count Number of users to create
 * @returns Array of created user objects
 */
async function createUsers(prisma: PrismaClient, count: number = 20): Promise<any[]> {
  try {
    logger.info(`Creating ${count} test users...`);

    // Create a fixed admin user for testing
    const adminUser = {
      id: uuidv4(),
      email: 'admin@engagerr.app',
      passwordHash: await hashPassword('Admin1234!'),
      fullName: 'Admin User',
      userType: UserType.ADMIN,
      isVerified: true,
      authProvider: 'email',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };

    // Create regular users (mix of creators and brands)
    const users = [];
    
    for (let i = 0; i < count; i++) {
      const isCreator = i < Math.ceil(count * 0.7); // 70% creators, 30% brands
      const userType = isCreator ? UserType.CREATOR : UserType.BRAND;
      
      const user = {
        id: uuidv4(),
        email: faker.internet.email().toLowerCase(),
        passwordHash: await hashPassword('Password123!'),
        fullName: faker.person.fullName(),
        userType: userType,
        isVerified: true,
        authProvider: 'email',
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent(),
        lastLoginAt: faker.date.recent()
      };
      
      users.push(user);
    }

    // Insert admin and regular users
    await prisma.user.createMany({
      data: [adminUser, ...users],
      skipDuplicates: true,
    });

    // Return all created users
    const createdUsers = await prisma.user.findMany();
    logger.info(`Created ${createdUsers.length} test users`);
    
    return createdUsers;
  } catch (error) {
    logger.error(`Error creating test users: ${error.message}`);
    throw error;
  }
}

/**
 * Creates creator profiles for users with CREATOR type
 * @param prisma PrismaClient instance
 * @param users Array of user objects
 * @returns Array of created creator profiles
 */
async function createCreators(prisma: PrismaClient, users: any[]): Promise<any[]> {
  try {
    // Filter users with CREATOR type
    const creatorUsers = users.filter(user => user.userType === UserType.CREATOR);
    logger.info(`Creating ${creatorUsers.length} creator profiles...`);

    const creators = creatorUsers.map(user => {
      // Generate random categories (1-4 categories per creator)
      const categoryCount = faker.number.int({ min: 1, max: 4 });
      const categories = [];
      
      for (let i = 0; i < categoryCount; i++) {
        const category = faker.helpers.arrayElement([
          'technology', 'gaming', 'beauty', 'fashion', 'fitness', 
          'health', 'food', 'travel', 'lifestyle', 'business', 
          'education', 'entertainment', 'music', 'sports', 'arts'
        ]);
        
        if (!categories.includes(category)) {
          categories.push(category);
        }
      }

      // Generate random verification status with bias toward verified for testing
      const verificationStatus = faker.helpers.weightedArrayElement([
        { value: VerificationStatus.VERIFIED, weight: 0.6 },
        { value: VerificationStatus.PENDING, weight: 0.2 },
        { value: VerificationStatus.UNVERIFIED, weight: 0.2 }
      ]);

      // Generate subscription tier with even distribution for testing
      const subscriptionTier = faker.helpers.arrayElement([
        SubscriptionTier.FREE,
        SubscriptionTier.BASIC,
        SubscriptionTier.PRO,
        SubscriptionTier.ENTERPRISE
      ]);

      return {
        id: uuidv4(),
        userId: user.id,
        bio: faker.lorem.paragraph(),
        categories: categories,
        profileImage: faker.image.avatar(),
        verificationStatus: verificationStatus,
        subscriptionTier: subscriptionTier,
        subscriptionStatus: 'active',
        settings: JSON.stringify({
          notificationPreferences: {
            email: faker.datatype.boolean(),
            push: faker.datatype.boolean(),
            inApp: true
          },
          privacySettings: {
            profileVisibility: 'public',
            showFinancials: faker.datatype.boolean(),
            showPartnerships: faker.datatype.boolean()
          }
        }),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    });

    // Insert creators
    await prisma.creator.createMany({
      data: creators,
      skipDuplicates: true,
    });

    // Return created creators
    const createdCreators = await prisma.creator.findMany({
      include: {
        user: true
      }
    });
    
    logger.info(`Created ${createdCreators.length} creator profiles`);
    return createdCreators;
  } catch (error) {
    logger.error(`Error creating creator profiles: ${error.message}`);
    throw error;
  }
}

/**
 * Creates brand profiles for users with BRAND type
 * @param prisma PrismaClient instance
 * @param users Array of user objects
 * @returns Array of created brand profiles
 */
async function createBrands(prisma: PrismaClient, users: any[]): Promise<any[]> {
  try {
    // Filter users with BRAND type
    const brandUsers = users.filter(user => user.userType === UserType.BRAND);
    logger.info(`Creating ${brandUsers.length} brand profiles...`);

    const brands = brandUsers.map(user => {
      // Generate random industries (1-3 industries per brand)
      const industryCount = faker.number.int({ min: 1, max: 3 });
      const industries = [];
      
      for (let i = 0; i < industryCount; i++) {
        const industry = faker.helpers.arrayElement([
          'technology', 'retail', 'healthcare', 'finance', 'education', 
          'entertainment', 'food', 'fashion', 'automotive', 'travel'
        ]);
        
        if (!industries.includes(industry)) {
          industries.push(industry);
        }
      }

      // Generate subscription tier
      const subscriptionTier = faker.helpers.arrayElement([
        SubscriptionTier.BASIC,
        SubscriptionTier.PRO,
        SubscriptionTier.ENTERPRISE
      ]);

      return {
        id: uuidv4(),
        userId: user.id,
        companyName: faker.company.name(),
        industries: industries,
        logoImage: `https://logo.clearbit.com/${faker.internet.domainName()}`,
        websiteUrl: faker.internet.url(),
        subscriptionTier: subscriptionTier,
        subscriptionStatus: 'active',
        settings: JSON.stringify({
          notificationPreferences: {
            email: faker.datatype.boolean(),
            push: faker.datatype.boolean(),
            inApp: true
          },
          discoveryPreferences: {
            autoMatchCreators: faker.datatype.boolean(),
            preferredCategories: faker.helpers.arrayElements([
              'technology', 'gaming', 'beauty', 'fashion', 'fitness', 
              'health', 'food', 'travel', 'lifestyle', 'business'
            ], faker.number.int({ min: 1, max: 3 }))
          }
        }),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    });

    // Insert brands
    await prisma.brand.createMany({
      data: brands,
      skipDuplicates: true,
    });

    // Return created brands
    const createdBrands = await prisma.brand.findMany({
      include: {
        user: true
      }
    });
    
    logger.info(`Created ${createdBrands.length} brand profiles`);
    return createdBrands;
  } catch (error) {
    logger.error(`Error creating brand profiles: ${error.message}`);
    throw error;
  }
}

/**
 * Creates platform connections for creator profiles
 * @param prisma PrismaClient instance
 * @param creators Array of creator objects
 * @returns Array of created platform connections
 */
async function createPlatforms(prisma: PrismaClient, creators: any[]): Promise<any[]> {
  try {
    logger.info('Creating platform connections for creators...');
    
    const platforms = [];
    
    for (const creator of creators) {
      // Each creator has 1-4 platforms
      const platformCount = faker.number.int({ min: 1, max: 4 });
      
      // Pick random unique platforms for this creator
      const platformTypes = faker.helpers.arrayElements(
        Object.values(PlatformType),
        platformCount
      );
      
      for (const platformType of platformTypes) {
        const handle = faker.internet.userName(
          creator.user.fullName.split(' ')[0],
          creator.user.fullName.split(' ')[1]
        );
        
        platforms.push({
          id: uuidv4(),
          creatorId: creator.id,
          platformType: platformType,
          handle: handle,
          url: getPlatformUrl(platformType, handle),
          accessToken: faker.string.alphanumeric(32), // Mock token (would be encrypted in production)
          refreshToken: faker.string.alphanumeric(32), // Mock token
          tokenExpiresAt: faker.date.future(),
          authStatus: 'connected',
          lastSyncAt: faker.date.recent(),
          followers: faker.number.int({ min: 1000, max: 1000000 }),
          engagement: faker.number.float({ min: 1, max: 10, precision: 0.1 }),
          contentCount: faker.number.int({ min: 10, max: 200 }),
          verified: faker.datatype.boolean(0.3), // 30% chance of being verified
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent()
        });
      }
    }

    // Insert platforms
    await prisma.platform.createMany({
      data: platforms,
      skipDuplicates: true,
    });

    // Return created platforms
    const createdPlatforms = await prisma.platform.findMany();
    logger.info(`Created ${createdPlatforms.length} platform connections`);
    
    return createdPlatforms;
  } catch (error) {
    logger.error(`Error creating platform connections: ${error.message}`);
    throw error;
  }
}

// Helper function to generate platform URLs
function getPlatformUrl(platformType: PlatformType, handle: string): string {
  switch (platformType) {
    case PlatformType.YOUTUBE:
      return `https://youtube.com/channel/${faker.string.alphanumeric(24)}`;
    case PlatformType.INSTAGRAM:
      return `https://instagram.com/${handle}`;
    case PlatformType.TIKTOK:
      return `https://tiktok.com/@${handle}`;
    case PlatformType.TWITTER:
      return `https://twitter.com/${handle}`;
    case PlatformType.LINKEDIN:
      return `https://linkedin.com/in/${handle}-${faker.string.alphanumeric(8)}`;
    default:
      return `https://example.com/${handle}`;
  }
}

/**
 * Creates content items for creators across their connected platforms
 * @param prisma PrismaClient instance
 * @param creators Array of creator objects
 * @param platforms Array of platform objects
 * @returns Array of created content items
 */
async function createContent(prisma: PrismaClient, creators: any[], platforms: any[]): Promise<any[]> {
  try {
    logger.info('Creating content items for platforms...');
    
    const contentItems = [];
    
    for (const platform of platforms) {
      // Each platform has between 5-15 content items
      const contentCount = faker.number.int({ min: 5, max: 15 });
      
      for (let i = 0; i < contentCount; i++) {
        // Get appropriate content types for this platform
        const contentType = getContentTypeForPlatform(platform.platformType);
        
        // Generate publish date within the last year, biased toward more recent
        const monthsAgo = faker.number.int({ min: 0, max: 11 });
        const daysAgo = faker.number.int({ min: 0, max: 30 });
        const publishedAt = new Date();
        publishedAt.setMonth(publishedAt.getMonth() - monthsAgo);
        publishedAt.setDate(publishedAt.getDate() - daysAgo);
        
        contentItems.push({
          id: uuidv4(),
          creatorId: platform.creatorId,
          platformId: platform.id,
          externalId: faker.string.alphanumeric(11),
          title: faker.lorem.sentence({ min: 3, max: 8 }),
          description: faker.lorem.paragraph(),
          contentType: contentType,
          publishedAt: publishedAt,
          url: `${platform.url}/${faker.string.alphanumeric(10)}`,
          thumbnail: faker.image.url(),
          views: faker.number.int({ min: 500, max: 1000000 }),
          engagements: faker.number.int({ min: 10, max: 50000 }),
          shares: faker.number.int({ min: 0, max: 5000 }),
          comments: faker.number.int({ min: 0, max: 1000 }),
          metadata: JSON.stringify({
            duration: contentType === ContentType.VIDEO ? faker.number.int({ min: 30, max: 1800 }) : null,
            tags: faker.helpers.arrayElements(
              ['creator', 'content', 'social media', 'trending', 'viral'],
              faker.number.int({ min: 2, max: 5 })
            )
          }),
          path: null, // Will be set later when creating relationships
          isRoot: faker.datatype.boolean(0.3), // 30% chance of being root content
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent()
        });
      }
    }

    // Insert content items
    await prisma.content.createMany({
      data: contentItems,
      skipDuplicates: true,
    });

    // Return created content items
    const createdContent = await prisma.content.findMany();
    logger.info(`Created ${createdContent.length} content items`);
    
    return createdContent;
  } catch (error) {
    logger.error(`Error creating content items: ${error.message}`);
    throw error;
  }
}

// Helper function to get appropriate content type for a platform
function getContentTypeForPlatform(platformType: PlatformType): ContentType {
  switch (platformType) {
    case PlatformType.YOUTUBE:
      return faker.helpers.arrayElement([
        ContentType.VIDEO,
        ContentType.SHORT_VIDEO
      ]);
    case PlatformType.INSTAGRAM:
      return faker.helpers.arrayElement([
        ContentType.PHOTO,
        ContentType.CAROUSEL,
        ContentType.STORY,
        ContentType.SHORT_VIDEO
      ]);
    case PlatformType.TIKTOK:
      return ContentType.SHORT_VIDEO;
    case PlatformType.TWITTER:
      return faker.helpers.arrayElement([
        ContentType.POST,
        ContentType.PHOTO
      ]);
    case PlatformType.LINKEDIN:
      return faker.helpers.arrayElement([
        ContentType.POST,
        ContentType.ARTICLE
      ]);
    default:
      return ContentType.OTHER;
  }
}

/**
 * Establishes parent-child relationships between content items to create content families
 * @param prisma PrismaClient instance
 * @param content Array of content objects
 * @returns Array of created content relationships
 */
async function createContentRelationships(prisma: PrismaClient, content: any[]): Promise<any[]> {
  try {
    logger.info('Creating content relationships...');
    
    // Group content by creator
    const contentByCreator = {};
    content.forEach(item => {
      if (!contentByCreator[item.creatorId]) {
        contentByCreator[item.creatorId] = [];
      }
      contentByCreator[item.creatorId].push(item);
    });
    
    const relationships = [];
    const contentUpdates = [];
    
    // For each creator, create content families
    for (const creatorId in contentByCreator) {
      const creatorContent = contentByCreator[creatorId];
      
      // Find potential parent content (longer formats like videos, articles, etc.)
      const potentialParents = creatorContent.filter(item => 
        [ContentType.VIDEO, ContentType.ARTICLE, ContentType.PODCAST].includes(item.contentType)
      );
      
      // If no good parents, use any content item
      const parents = potentialParents.length > 0 
        ? potentialParents 
        : faker.helpers.arrayElements(creatorContent, Math.min(3, creatorContent.length));
      
      for (const parent of parents) {
        // Make sure this is marked as a root content
        contentUpdates.push({
          id: parent.id,
          path: parent.id, // Root path is its own ID
          isRoot: true
        });
        
        // Find potential children (excluding the parent itself)
        const potentialChildren = creatorContent.filter(item => 
          item.id !== parent.id && 
          item.publishedAt >= parent.publishedAt // Children must be published same day or after parent
        );
        
        // Create 2-5 child relationships for each parent
        const childCount = Math.min(
          faker.number.int({ min: 2, max: 5 }),
          potentialChildren.length
        );
        
        const selectedChildren = faker.helpers.arrayElements(potentialChildren, childCount);
        
        // Create relationships
        for (const child of selectedChildren) {
          const relationship = {
            id: uuidv4(),
            sourceContentId: parent.id,
            targetContentId: child.id,
            relationshipType: getRelationshipType(parent.contentType, child.contentType),
            confidence: faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
            creationMethod: faker.helpers.arrayElement([
              CreationMethod.AI_SUGGESTED,
              CreationMethod.SYSTEM_DETECTED,
              CreationMethod.USER_DEFINED
            ]),
            metadata: JSON.stringify({
              detectionMethod: 'content_similarity',
              similarityScore: faker.number.float({ min: 0.6, max: 0.95, precision: 0.01 })
            }),
            createdAt: faker.date.recent(),
            updatedAt: faker.date.recent()
          };
          
          relationships.push(relationship);
          
          // Update child content path
          contentUpdates.push({
            id: child.id,
            path: `${parent.id}.${child.id}`, // LTREE format: parent_id.child_id
            isRoot: false
          });
        }
      }
    }

    // Use a transaction to create relationships and update content paths
    await prisma.$transaction(async (tx) => {
      // Insert relationships
      await tx.contentRelationship.createMany({
        data: relationships,
        skipDuplicates: true,
      });
      
      // Update content paths
      for (const update of contentUpdates) {
        await tx.content.update({
          where: { id: update.id },
          data: {
            path: update.path,
            isRoot: update.isRoot
          }
        });
      }
    });

    // Return created relationships
    const createdRelationships = await prisma.contentRelationship.findMany();
    logger.info(`Created ${createdRelationships.length} content relationships`);
    logger.info(`Updated ${contentUpdates.length} content items with LTREE paths`);
    
    return createdRelationships;
  } catch (error) {
    logger.error(`Error creating content relationships: ${error.message}`);
    throw error;
  }
}

// Helper function to determine relationship type based on content types
function getRelationshipType(sourceType: ContentType, targetType: ContentType): RelationshipType {
  // If target is a short-form version of source
  if (
    (sourceType === ContentType.VIDEO && targetType === ContentType.SHORT_VIDEO) ||
    (sourceType === ContentType.ARTICLE && targetType === ContentType.POST)
  ) {
    return RelationshipType.DERIVATIVE;
  }
  
  // If target is a different format completely
  if (sourceType !== targetType) {
    return RelationshipType.REPURPOSED;
  }
  
  // Default relationship
  return faker.helpers.arrayElement([
    RelationshipType.DERIVATIVE,
    RelationshipType.REPURPOSED,
    RelationshipType.REFERENCE
  ]);
}

/**
 * Generates performance metrics for content items across platforms
 * @param prisma PrismaClient instance
 * @param content Array of content objects
 * @returns Array of created analytics records
 */
async function createAnalytics(prisma: PrismaClient, content: any[]): Promise<any[]> {
  try {
    logger.info('Creating analytics data for content...');
    
    const analytics = [];
    
    // For each content item, create daily metrics for last 30 days
    for (const contentItem of content) {
      // Generate metrics with realistic trends (generally increasing)
      let baseViews = contentItem.views / 30;
      let baseEngagements = contentItem.engagements / 30;
      let baseShares = contentItem.shares / 30;
      let baseComments = contentItem.comments / 30;
      
      // Create metrics for last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Add some randomness to daily metrics with a general upward trend
        const volatility = faker.number.float({ min: 0.8, max: 1.2 });
        const trend = Math.max(1.0, 1 + (30 - i) / 100); // Slight upward trend
        
        const views = Math.round(baseViews * volatility * trend);
        const engagements = Math.round(baseEngagements * volatility * trend);
        const shares = Math.round(baseShares * volatility * trend);
        const comments = Math.round(baseComments * volatility * trend);
        
        analytics.push({
          id: uuidv4(),
          contentId: contentItem.id,
          date: date,
          views: views,
          engagements: engagements,
          shares: shares,
          comments: comments,
          likes: Math.round(engagements * 0.7), // Likes are ~70% of engagements
          watchTime: contentItem.contentType === ContentType.VIDEO ? views * faker.number.float({ min: 0.5, max: 5 }) : null,
          engagementRate: engagements / (views || 1) * 100,
          metadata: JSON.stringify({
            sourceDataComplete: true,
            clickthroughRate: faker.number.float({ min: 0.5, max: 5, precision: 0.1 }),
            uniqueViewers: Math.round(views * faker.number.float({ min: 0.7, max: 0.95 }))
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Update base values for next day (slight randomness in trend)
        baseViews = views * faker.number.float({ min: 0.95, max: 1.05 });
        baseEngagements = engagements * faker.number.float({ min: 0.95, max: 1.05 });
        baseShares = shares * faker.number.float({ min: 0.95, max: 1.05 });
        baseComments = comments * faker.number.float({ min: 0.95, max: 1.05 });
      }
    }

    // Insert analytics in batches to avoid hitting database limits
    const batchSize = 1000;
    for (let i = 0; i < analytics.length; i += batchSize) {
      const batch = analytics.slice(i, i + batchSize);
      await prisma.contentMetrics.createMany({
        data: batch,
        skipDuplicates: true
      });
      logger.info(`Inserted batch of ${batch.length} metrics records`);
    }

    logger.info(`Created ${analytics.length} analytics records`);
    return analytics;
  } catch (error) {
    logger.error(`Error creating analytics data: ${error.message}`);
    throw error;
  }
}

/**
 * Creates partnership relationships between creators and brands
 * @param prisma PrismaClient instance
 * @param creators Array of creator objects
 * @param brands Array of brand objects
 * @returns Array of created partnership records
 */
async function createPartnerships(prisma: PrismaClient, creators: any[], brands: any[]): Promise<any[]> {
  try {
    logger.info('Creating partnerships between creators and brands...');
    
    const partnerships = [];
    
    // Create 1-3 partnerships for each brand
    for (const brand of brands) {
      const partnershipCount = faker.number.int({ min: 1, max: 3 });
      
      // Select random creators for this brand's partnerships
      const selectedCreators = faker.helpers.arrayElements(
        creators,
        Math.min(partnershipCount, creators.length)
      );
      
      for (const creator of selectedCreators) {
        // Generate partnership date within the last 6 months
        const monthsAgo = faker.number.int({ min: 0, max: 5 });
        const daysAgo = faker.number.int({ min: 0, max: 30 });
        const partnershipDate = new Date();
        partnershipDate.setMonth(partnershipDate.getMonth() - monthsAgo);
        partnershipDate.setDate(partnershipDate.getDate() - daysAgo);
        
        // Determine status based on date
        const status = getPartnershipStatus(monthsAgo, daysAgo);
        
        // Generate budget (higher for enterprise brands)
        const isEnterprise = brand.subscriptionTier === SubscriptionTier.ENTERPRISE;
        const budget = isEnterprise
          ? faker.number.int({ min: 5000, max: 50000 })
          : faker.number.int({ min: 1000, max: 10000 });
        
        const partnership = {
          id: uuidv4(),
          brandId: brand.id,
          creatorId: creator.id,
          name: `${brand.companyName} ${faker.helpers.arrayElement(['Campaign', 'Promotion', 'Partnership', 'Collaboration'])}`,
          description: faker.lorem.paragraph(),
          status: status,
          budget: budget,
          platformFee: Math.round(budget * 0.08), // 8% platform fee
          startDate: partnershipDate,
          endDate: new Date(partnershipDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days later
          createdAt: new Date(partnershipDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before start
          updatedAt: faker.date.recent()
        };
        
        partnerships.push(partnership);
      }
    }

    // Insert partnerships
    await prisma.partnership.createMany({
      data: partnerships,
      skipDuplicates: true,
    });

    // Create contracts and payments for each partnership
    await Promise.all(partnerships.map(async (partnership) => {
      // Create contract
      const contract = {
        id: uuidv4(),
        partnershipId: partnership.id,
        terms: JSON.stringify({
          deliverables: [
            { type: 'instagram_post', quantity: 1, dueDate: new Date(partnership.startDate.getTime() + 7 * 24 * 60 * 60 * 1000) },
            { type: 'instagram_story', quantity: 3, dueDate: new Date(partnership.startDate.getTime() + 14 * 24 * 60 * 60 * 1000) },
            { type: 'tiktok_video', quantity: 1, dueDate: new Date(partnership.startDate.getTime() + 21 * 24 * 60 * 60 * 1000) }
          ],
          paymentSchedule: [
            { milestone: 'signing', percentage: 50, amount: partnership.budget * 0.5 },
            { milestone: 'completion', percentage: 50, amount: partnership.budget * 0.5 }
          ],
          revisions: 2,
          exclusivity: faker.datatype.boolean()
        }),
        status: partnership.status === 'completed' ? 'signed' : partnership.status === 'active' ? 'signed' : 'draft',
        documentUrl: faker.internet.url(),
        signedByCreatorAt: partnership.status !== 'proposed' ? new Date(partnership.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
        signedByBrandAt: partnership.status !== 'proposed' ? new Date(partnership.createdAt.getTime() + 1 * 24 * 60 * 60 * 1000) : null,
        createdAt: partnership.createdAt,
        updatedAt: partnership.updatedAt
      };
      
      await prisma.contract.create({
        data: contract
      });
      
      // Create payments if appropriate
      if (partnership.status === 'active' || partnership.status === 'completed') {
        // Initial payment
        await prisma.payment.create({
          data: {
            id: uuidv4(),
            partnershipId: partnership.id,
            amount: partnership.budget * 0.5, // 50% upfront
            status: 'completed',
            stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
            processingFee: (partnership.budget * 0.5) * 0.029 + 0.3, // 2.9% + $0.30
            createdAt: new Date(partnership.startDate.getTime() - 5 * 24 * 60 * 60 * 1000),
            processedAt: new Date(partnership.startDate.getTime() - 5 * 24 * 60 * 60 * 1000)
          }
        });
        
        // Final payment (only if completed)
        if (partnership.status === 'completed') {
          await prisma.payment.create({
            data: {
              id: uuidv4(),
              partnershipId: partnership.id,
              amount: partnership.budget * 0.5, // 50% on completion
              status: 'completed',
              stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
              processingFee: (partnership.budget * 0.5) * 0.029 + 0.3, // 2.9% + $0.30
              createdAt: new Date(partnership.endDate.getTime() - 2 * 24 * 60 * 60 * 1000),
              processedAt: new Date(partnership.endDate.getTime() - 2 * 24 * 60 * 60 * 1000)
            }
          });
        }
      }
    }));

    // Return created partnerships
    const createdPartnerships = await prisma.partnership.findMany({
      include: {
        creator: true,
        brand: true,
        contract: true,
        payments: true
      }
    });
    
    logger.info(`Created ${createdPartnerships.length} partnerships with contracts and payments`);
    return createdPartnerships;
  } catch (error) {
    logger.error(`Error creating partnerships: ${error.message}`);
    throw error;
  }
}

// Helper function to determine partnership status based on date
function getPartnershipStatus(monthsAgo: number, daysAgo: number): string {
  const totalDaysAgo = monthsAgo * 30 + daysAgo;
  
  if (totalDaysAgo > 90) {
    // Older partnerships are likely completed
    return 'completed';
  } else if (totalDaysAgo > 60) {
    // Some older ones might be completed or active
    return faker.helpers.arrayElement(['completed', 'active']);
  } else if (totalDaysAgo > 30) {
    // More recent ones are likely active
    return 'active';
  } else {
    // Very recent ones could be proposed or active
    return faker.helpers.arrayElement(['proposed', 'active']);
  }
}

/**
 * Main function that orchestrates the entire database seeding process
 */
async function main() {
  const prisma = new PrismaClient();
  
  try {
    logger.info('Starting database seed process...');
    
    // Create users
    const users = await createUsers(prisma, 30);
    
    // Create creator profiles for users with CREATOR type
    const creators = await createCreators(prisma, users);
    
    // Create brand profiles for users with BRAND type
    const brands = await createBrands(prisma, users);
    
    // Create platform connections for creators
    const platforms = await createPlatforms(prisma, creators);
    
    // Create content items for each platform
    const content = await createContent(prisma, creators, platforms);
    
    // Create content relationships (parent-child)
    const relationships = await createContentRelationships(prisma, content);
    
    // Create analytics data for content
    const analytics = await createAnalytics(prisma, content);
    
    // Create partnerships between creators and brands
    const partnerships = await createPartnerships(prisma, creators, brands);
    
    logger.info('Database seed process completed successfully');
  } catch (error) {
    logger.error(`Seed process failed with error: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default main;