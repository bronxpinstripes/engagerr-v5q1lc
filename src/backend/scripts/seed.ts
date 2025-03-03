/**
 * Database seeding script for Engagerr
 * 
 * This script populates the database with realistic sample data for development and testing environments.
 * It creates users, creators, brands, content items, content relationships, platforms, analytics, and partnerships.
 */

import { PrismaClient } from '../prisma/client';
import { faker } from '@faker-js/faker'; // ^8.0.2
import * as bcrypt from 'bcrypt'; // ^5.1.1
import chalk from 'chalk'; // ^5.3.0
import * as dotenv from 'dotenv'; // ^16.3.1
import supabaseClient from '../src/config/supabase';
import { constants } from '../src/config/constants';
import { logger } from '../src/utils/logger';
import {
  UserType,
  VerificationStatus,
  SubscriptionTier
} from '../src/types/user';
import {
  PlatformType
} from '../src/types/platform';
import {
  ContentType,
  RelationshipType,
  CreationMethod
} from '../src/types/content';
import {
  PartnershipStatus
} from '../src/types/partnership';

// Load environment variables
dotenv.config();

// Number of sample records to create
const SAMPLE_COUNTS = {
  USERS: 20,
  CREATORS: 10,
  BRANDS: 8,
  PLATFORMS_PER_CREATOR: 3,
  CONTENT_PER_PLATFORM: 8,
  CONTENT_RELATIONSHIPS: 30,
  PARTNERSHIPS: 15,
  CONTRACTS: 12,
  PAYMENTS: 24
};

/**
 * Main seeding function
 */
async function main() {
  const prisma = new PrismaClient();
  
  try {
    logger.info('Starting database seed');
    
    // Seed users first (they're the base for creators and brands)
    const users = await seedUsers(prisma);
    
    // Seed creators and brands based on the created users
    const creators = await seedCreators(prisma, users);
    const brands = await seedBrands(prisma, users);
    
    // Seed platforms for creators
    const platforms = await seedPlatforms(prisma, creators);
    
    // Seed content items for each platform
    const contentItems = await seedContent(prisma, creators, platforms);
    
    // Seed content relationships (this is a core feature of Engagerr)
    await seedContentRelationships(prisma, contentItems);
    
    // Generate LTREE paths for efficient hierarchical queries
    await generateLTREEPaths(contentItems, await prisma.contentRelationship.findMany());
    
    // Seed analytics data for content
    await seedAnalytics(prisma, contentItems);
    
    // Seed partnerships between creators and brands
    const partnerships = await seedPartnerships(prisma, creators, brands);
    
    // Seed contracts for partnerships
    await seedContracts(prisma, partnerships);
    
    // Seed payments for partnerships
    await seedPayments(prisma, partnerships);
    
    // Seed subscriptions for creators and brands
    await seedSubscriptions(prisma, creators, brands);
    
    logger.info(chalk.green('✓ Database seed completed successfully'));
  } catch (error) {
    logger.error(error, 'Error seeding database');
    throw error;
  } finally {
    // Close the database connection
    await prisma.$disconnect();
  }
}

/**
 * Seed the database with users
 * @param prisma PrismaClient instance
 * @returns Created users
 */
async function seedUsers(prisma: PrismaClient): Promise<Record<string, any>> {
  logger.info('Seeding users');
  
  const users: Record<string, any> = {};
  const creatorEmails: string[] = [];
  const brandEmails: string[] = [];
  
  // Create creator users
  for (let i = 0; i < SAMPLE_COUNTS.CREATORS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    creatorEmails.push(email);
    
    users[email] = {
      email,
      passwordHash: await bcrypt.hash('password123', 10),
      fullName: `${firstName} ${lastName}`,
      userType: UserType.CREATOR,
      userRole: 'USER',
      authProvider: 'EMAIL',
      isVerified: true,
      lastLoginAt: faker.date.recent(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent()
    };
  }
  
  // Create brand users
  for (let i = 0; i < SAMPLE_COUNTS.BRANDS; i++) {
    const companyName = faker.company.name();
    const email = faker.internet.email({ 
      firstName: companyName.split(' ')[0], 
      lastName: 'brand' 
    }).toLowerCase();
    brandEmails.push(email);
    
    users[email] = {
      email,
      passwordHash: await bcrypt.hash('password123', 10),
      fullName: companyName,
      userType: UserType.BRAND,
      userRole: 'USER',
      authProvider: 'EMAIL',
      isVerified: true,
      lastLoginAt: faker.date.recent(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent()
    };
  }
  
  // Create admin user for testing
  const adminEmail = 'admin@engagerr.app';
  users[adminEmail] = {
    email: adminEmail,
    passwordHash: await bcrypt.hash('admin123', 10),
    fullName: 'System Administrator',
    userType: UserType.ADMIN,
    userRole: 'SYSTEM_ADMIN',
    authProvider: 'EMAIL',
    isVerified: true,
    lastLoginAt: faker.date.recent(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent()
  };
  
  // Insert all users into the database
  const createdUsers: Record<string, any> = {};
  
  for (const email of [...creatorEmails, ...brandEmails, adminEmail]) {
    const userData = users[email];
    const user = await prisma.user.create({
      data: userData
    });
    
    createdUsers[email] = user;
  }
  
  logger.info(`Created ${Object.keys(createdUsers).length} users`);
  return createdUsers;
}

/**
 * Seed the database with creator profiles
 * @param prisma PrismaClient instance
 * @param users Created user records
 * @returns Created creators
 */
async function seedCreators(
  prisma: PrismaClient,
  users: Record<string, any>
): Promise<Record<string, any>> {
  logger.info('Seeding creators');
  
  const creators: Record<string, any> = {};
  
  // Find users with CREATOR user type
  const creatorUsers = Object.values(users).filter(
    (user) => user.userType === UserType.CREATOR
  );
  
  for (const user of creatorUsers) {
    // Generate random creator categories
    const categoryCount = faker.number.int({ min: 1, max: 3 });
    const categories = faker.helpers.arrayElements(
      constants.CREATOR_CATEGORIES,
      categoryCount
    );
    
    // Determine verification status with weighted randomization
    const verificationStatus = faker.helpers.weightedArrayElement([
      { value: VerificationStatus.UNVERIFIED, weight: 0.2 },
      { value: VerificationStatus.PENDING, weight: 0.1 },
      { value: VerificationStatus.VERIFIED, weight: 0.7 }
    ]);
    
    // Determine subscription tier with weighted randomization
    const subscriptionTier = faker.helpers.weightedArrayElement([
      { value: SubscriptionTier.FREE, weight: 0.4 },
      { value: SubscriptionTier.BASIC, weight: 0.3 },
      { value: SubscriptionTier.PRO, weight: 0.2 },
      { value: SubscriptionTier.ENTERPRISE, weight: 0.1 }
    ]);
    
    const creator = await prisma.creator.create({
      data: {
        userId: user.id,
        bio: faker.lorem.paragraph(),
        categories,
        profileImage: faker.image.avatar(),
        verificationStatus,
        subscriptionTier,
        subscriptionStatus: 'ACTIVE',
        settings: {
          notificationPreferences: {
            email: true,
            push: true,
            inApp: true
          },
          privacySettings: {
            profileVisibility: 'public',
            showFinancials: faker.datatype.boolean(),
            showPartnerships: faker.datatype.boolean()
          }
        }
      }
    });
    
    creators[user.id] = creator;
  }
  
  logger.info(`Created ${Object.keys(creators).length} creators`);
  return creators;
}

/**
 * Seed the database with brand profiles
 * @param prisma PrismaClient instance
 * @param users Created user records
 * @returns Created brands
 */
async function seedBrands(
  prisma: PrismaClient,
  users: Record<string, any>
): Promise<Record<string, any>> {
  logger.info('Seeding brands');
  
  const brands: Record<string, any> = {};
  
  // Find users with BRAND user type
  const brandUsers = Object.values(users).filter(
    (user) => user.userType === UserType.BRAND
  );
  
  for (const user of brandUsers) {
    // Generate random brand industries
    const industryCount = faker.number.int({ min: 1, max: 3 });
    const industries = faker.helpers.arrayElements(
      constants.BRAND_INDUSTRIES,
      industryCount
    );
    
    // Determine subscription tier with weighted randomization
    const subscriptionTier = faker.helpers.weightedArrayElement([
      { value: SubscriptionTier.FREE, weight: 0.3 },
      { value: SubscriptionTier.BASIC, weight: 0.3 },
      { value: SubscriptionTier.PRO, weight: 0.3 },
      { value: SubscriptionTier.ENTERPRISE, weight: 0.1 }
    ]);
    
    const brand = await prisma.brand.create({
      data: {
        userId: user.id,
        companyName: user.fullName,
        industries,
        logoImage: faker.image.urlLoremFlickr({ category: 'business' }),
        websiteUrl: faker.internet.url(),
        subscriptionTier,
        subscriptionStatus: 'ACTIVE',
        settings: {
          notificationPreferences: {
            email: true,
            push: true,
            inApp: true
          },
          privacySettings: {
            profileVisibility: 'public'
          },
          discoveryPreferences: {
            preferredCategories: faker.helpers.arrayElements(constants.CREATOR_CATEGORIES, 3),
            preferredPlatforms: faker.helpers.arrayElements(constants.PLATFORMS, 2)
          }
        }
      }
    });
    
    brands[user.id] = brand;
  }
  
  logger.info(`Created ${Object.keys(brands).length} brands`);
  return brands;
}

/**
 * Seed the database with platform connections for creators
 * @param prisma PrismaClient instance
 * @param creators Created creator records
 * @returns Created platforms
 */
async function seedPlatforms(
  prisma: PrismaClient,
  creators: Record<string, any>
): Promise<Record<string, any>> {
  logger.info('Seeding platforms');
  
  const platforms: Record<string, any> = {};
  
  for (const creatorId in creators) {
    const creator = creators[creatorId];
    
    // Determine how many platforms this creator has
    const platformCount = faker.number.int({
      min: 1,
      max: SAMPLE_COUNTS.PLATFORMS_PER_CREATOR
    });
    
    // Select random platforms from the available types
    const platformTypes = faker.helpers.arrayElements(
      constants.PLATFORMS,
      platformCount
    );
    
    for (const platformType of platformTypes) {
      // Generate a realistic handle based on platform
      let handle = '';
      
      switch (platformType) {
        case PlatformType.YOUTUBE:
          handle = `@${faker.internet.userName().toLowerCase()}`;
          break;
        case PlatformType.INSTAGRAM:
          handle = faker.internet.userName().toLowerCase();
          break;
        case PlatformType.TIKTOK:
          handle = `@${faker.internet.userName().toLowerCase()}`;
          break;
        case PlatformType.TWITTER:
          handle = `@${faker.internet.userName().toLowerCase()}`;
          break;
        case PlatformType.LINKEDIN:
          handle = faker.person.fullName();
          break;
        default:
          handle = faker.internet.userName().toLowerCase();
      }
      
      // Generate a URL for the platform profile
      let url = '';
      
      switch (platformType) {
        case PlatformType.YOUTUBE:
          url = `https://youtube.com/channel/${faker.string.alphanumeric(24)}`;
          break;
        case PlatformType.INSTAGRAM:
          url = `https://instagram.com/${handle.replace('@', '')}`;
          break;
        case PlatformType.TIKTOK:
          url = `https://tiktok.com/${handle}`;
          break;
        case PlatformType.TWITTER:
          url = `https://twitter.com/${handle.replace('@', '')}`;
          break;
        case PlatformType.LINKEDIN:
          url = `https://linkedin.com/in/${handle.split(' ')[0].toLowerCase()}-${handle.split(' ')[1]?.toLowerCase() || faker.lorem.word()}-${faker.string.alphanumeric(8)}`;
          break;
        default:
          url = faker.internet.url();
      }
      
      const platform = await prisma.platform.create({
        data: {
          creatorId: creator.id,
          platformType,
          handle,
          url,
          authStatus: 'CONNECTED',
          lastSyncAt: faker.date.recent()
        }
      });
      
      // Store by platform ID for later reference
      platforms[platform.id] = platform;
      
      // Also store by creator and platform type for easier lookups
      if (!platforms[creator.id]) {
        platforms[creator.id] = {};
      }
      platforms[creator.id][platformType] = platform;
    }
  }
  
  logger.info(`Created ${Object.keys(platforms).length} platforms`);
  return platforms;
}

/**
 * Seed the database with content items for creators across platforms
 * @param prisma PrismaClient instance
 * @param creators Created creator records
 * @param platforms Created platform records
 * @returns Created content items
 */
async function seedContent(
  prisma: PrismaClient,
  creators: Record<string, any>,
  platforms: Record<string, any>
): Promise<Record<string, any>> {
  logger.info('Seeding content');
  
  const contentItems: Record<string, any> = {};
  
  for (const creatorId in creators) {
    const creator = creators[creatorId];
    const creatorPlatforms = platforms[creator.id];
    
    if (!creatorPlatforms) continue;
    
    // For each platform, create content items
    for (const platformType in creatorPlatforms) {
      const platform = creatorPlatforms[platformType];
      
      // Determine appropriate content types for this platform
      const contentTypes = getContentTypesForPlatform(platformType as PlatformType);
      
      // Determine how many content items to create
      const contentCount = faker.number.int({
        min: 3,
        max: SAMPLE_COUNTS.CONTENT_PER_PLATFORM
      });
      
      // Create content items
      for (let i = 0; i < contentCount; i++) {
        // Select a random content type for this platform
        const contentType = faker.helpers.arrayElement(contentTypes);
        
        // Generate a publication date within the last year
        const publishedAt = faker.date.between({
          from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          to: new Date()
        });
        
        // Generate a title and description appropriate for the content type
        const title = getContentTitle(contentType);
        const description = getContentDescription(contentType);
        
        // Generate a URL for the content
        const url = getContentUrl(platformType as PlatformType, contentType);
        
        // Generate a thumbnail URL
        const thumbnail = faker.image.urlLoremFlickr({ category: getPlatformCategory(platformType as PlatformType) });
        
        // Determine if this will be a root content (original content)
        // More items should be root than children initially
        const isRoot = faker.helpers.maybe(() => true, { probability: 0.7 });
        
        // Create the content item
        const content = await prisma.content.create({
          data: {
            creatorId: creator.id,
            platformId: platform.id,
            externalId: faker.string.alphanumeric(12),
            title,
            description,
            contentType,
            publishedAt,
            url,
            thumbnail,
            path: '', // Will be populated later
            isRoot,
            metadata: {
              duration: contentType === ContentType.VIDEO ? faker.number.int({ min: 30, max: 1800 }) : null,
              width: faker.number.int({ min: 800, max: 1920 }),
              height: faker.number.int({ min: 600, max: 1080 }),
              tags: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => faker.word.sample())
            }
          }
        });
        
        // Store the content item for later use
        contentItems[content.id] = content;
      }
    }
  }
  
  logger.info(`Created ${Object.keys(contentItems).length} content items`);
  return contentItems;
}

/**
 * Helper function to get appropriate content types for a platform
 * @param platformType Type of platform
 * @returns Array of content types appropriate for the platform
 */
function getContentTypesForPlatform(platformType: PlatformType): ContentType[] {
  switch (platformType) {
    case PlatformType.YOUTUBE:
      return [ContentType.VIDEO, ContentType.SHORT_VIDEO];
    case PlatformType.INSTAGRAM:
      return [ContentType.PHOTO, ContentType.CAROUSEL, ContentType.STORY, ContentType.SHORT_VIDEO];
    case PlatformType.TIKTOK:
      return [ContentType.SHORT_VIDEO];
    case PlatformType.TWITTER:
      return [ContentType.POST, ContentType.PHOTO];
    case PlatformType.LINKEDIN:
      return [ContentType.POST, ContentType.ARTICLE];
    default:
      return [ContentType.POST, ContentType.PHOTO, ContentType.VIDEO];
  }
}

/**
 * Helper function to generate a realistic content title
 * @param contentType Type of content
 * @returns Generated title
 */
function getContentTitle(contentType: ContentType): string {
  switch (contentType) {
    case ContentType.VIDEO:
      return faker.helpers.weightedArrayElement([
        { weight: 0.6, value: `${faker.word.adjective()} ${faker.word.noun()} ${faker.word.verb()} ${faker.word.noun()}` },
        { weight: 0.4, value: `How to ${faker.word.verb()} ${faker.word.adjective()} ${faker.word.noun()}` }
      ]);
    case ContentType.SHORT_VIDEO:
      return faker.helpers.weightedArrayElement([
        { weight: 0.7, value: `When you ${faker.word.verb()} ${faker.word.noun()}` },
        { weight: 0.3, value: `${faker.number.int({ min: 1, max: 10 })} ways to ${faker.word.verb()}` }
      ]);
    case ContentType.ARTICLE:
      return faker.helpers.weightedArrayElement([
        { weight: 0.5, value: `${faker.number.int({ min: 3, max: 15 })} Essential ${faker.word.noun()}s for ${faker.word.adjective()} ${faker.word.noun()}` },
        { weight: 0.5, value: `Why ${faker.word.noun()}s Are the Future of ${faker.word.noun()}` }
      ]);
    default:
      return faker.lorem.sentence();
  }
}

/**
 * Helper function to generate a realistic content description
 * @param contentType Type of content
 * @returns Generated description
 */
function getContentDescription(contentType: ContentType): string {
  switch (contentType) {
    case ContentType.VIDEO:
    case ContentType.ARTICLE:
      return faker.lorem.paragraphs({ min: 1, max: 3 });
    case ContentType.SHORT_VIDEO:
    case ContentType.STORY:
      return faker.lorem.sentence();
    default:
      return faker.lorem.sentences({ min: 1, max: 3 });
  }
}

/**
 * Helper function to generate a URL for content
 * @param platformType Type of platform
 * @param contentType Type of content
 * @returns Generated URL
 */
function getContentUrl(platformType: PlatformType, contentType: ContentType): string {
  switch (platformType) {
    case PlatformType.YOUTUBE:
      return `https://youtube.com/watch?v=${faker.string.alphanumeric(11)}`;
    case PlatformType.INSTAGRAM:
      return `https://instagram.com/p/${faker.string.alphanumeric(11)}`;
    case PlatformType.TIKTOK:
      return `https://tiktok.com/@user/video/${faker.string.numeric(19)}`;
    case PlatformType.TWITTER:
      return `https://twitter.com/user/status/${faker.string.numeric(19)}`;
    case PlatformType.LINKEDIN:
      return `https://linkedin.com/posts/${faker.string.alphanumeric(10)}`;
    default:
      return faker.internet.url();
  }
}

/**
 * Helper function to get a category for image generation
 * @param platformType Type of platform
 * @returns Category string for image generation
 */
function getPlatformCategory(platformType: PlatformType): string {
  switch (platformType) {
    case PlatformType.YOUTUBE:
      return 'video';
    case PlatformType.INSTAGRAM:
      return 'fashion';
    case PlatformType.TIKTOK:
      return 'people';
    case PlatformType.TWITTER:
      return 'abstract';
    case PlatformType.LINKEDIN:
      return 'business';
    default:
      return 'technology';
  }
}

/**
 * Seed the database with content relationships
 * @param prisma PrismaClient instance
 * @param contentItems Created content items
 * @returns Promise that resolves when seeding is complete
 */
async function seedContentRelationships(
  prisma: PrismaClient,
  contentItems: Record<string, any>
): Promise<void> {
  logger.info('Seeding content relationships');
  
  // Start with content items marked as root
  const rootContentItems = Object.values(contentItems).filter(
    (content) => content.isRoot
  );
  
  // Get non-root content items
  const childContentItems = Object.values(contentItems).filter(
    (content) => !content.isRoot
  );
  
  // Keep track of which child content items have been assigned to a parent
  const assignedChildIds = new Set<string>();
  
  // Create relationship records
  const relationshipRecords = [];
  
  // For each root content item, create some child relationships
  for (const rootContent of rootContentItems) {
    // Determine how many direct children this root content will have
    const childCount = faker.number.int({ min: 0, max: 3 });
    
    for (let i = 0; i < childCount; i++) {
      // Find an unassigned child content item
      const availableChildren = childContentItems.filter(
        (child) => !assignedChildIds.has(child.id) && child.creatorId === rootContent.creatorId
      );
      
      if (availableChildren.length === 0) break;
      
      // Select a random child and mark it as assigned
      const childContent = faker.helpers.arrayElement(availableChildren);
      assignedChildIds.add(childContent.id);
      
      // Create parent-child relationship record
      relationshipRecords.push({
        sourceContentId: rootContent.id,
        targetContentId: childContent.id,
        relationshipType: RelationshipType.DERIVATIVE,
        confidence: faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
        creationMethod: CreationMethod.SYSTEM_DETECTED
      });
      
      // Some children might have their own children (grandchildren of the root)
      if (faker.number.int({ min: 1, max: 10 }) > 7) {
        // Determine how many grandchildren
        const grandchildCount = faker.number.int({ min: 1, max: 2 });
        
        for (let j = 0; j < grandchildCount; j++) {
          // Find an unassigned grandchild
          const availableGrandchildren = childContentItems.filter(
            (grandchild) => 
              !assignedChildIds.has(grandchild.id) && 
              grandchild.creatorId === rootContent.creatorId
          );
          
          if (availableGrandchildren.length === 0) break;
          
          // Select a random grandchild and mark it as assigned
          const grandchildContent = faker.helpers.arrayElement(availableGrandchildren);
          assignedChildIds.add(grandchildContent.id);
          
          // Create parent-child relationship record (child to grandchild)
          relationshipRecords.push({
            sourceContentId: childContent.id,
            targetContentId: grandchildContent.id,
            relationshipType: RelationshipType.DERIVATIVE,
            confidence: faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
            creationMethod: CreationMethod.SYSTEM_DETECTED
          });
        }
      }
    }
  }
  
  // Create all relationship records in the database
  for (const relationshipData of relationshipRecords) {
    await prisma.contentRelationship.create({
      data: relationshipData
    });
  }
  
  logger.info(`Created ${relationshipRecords.length} content relationships`);
}

/**
 * Generate LTREE path structures for content relationships
 * @param contentItems Created content items
 * @param relationships Created relationships
 * @returns Promise that resolves when paths are generated
 */
async function generateLTREEPaths(
  contentItems: Record<string, any>,
  relationships: any[]
): Promise<void> {
  logger.info('Generating LTREE paths for content relationships');
  
  // First, get all relationships from the database
  const allRelationships = await prisma.contentRelationship.findMany({
    include: {
      sourceContent: true,
      targetContent: true
    }
  });
  
  // Build a directed graph of content relationships
  const graph: Record<string, string[]> = {};
  
  // Initialize graph with all content items
  for (const contentId in contentItems) {
    graph[contentId] = [];
  }
  
  // Add edges to the graph based on relationships
  for (const relationship of allRelationships) {
    const { sourceContentId, targetContentId } = relationship;
    
    if (!graph[sourceContentId]) {
      graph[sourceContentId] = [];
    }
    
    graph[sourceContentId].push(targetContentId);
  }
  
  // Find all root nodes (content with no parents or marked as root)
  const rootNodes = new Set<string>();
  
  // Get content items marked explicitly as roots
  for (const contentId in contentItems) {
    if (contentItems[contentId].isRoot) {
      rootNodes.add(contentId);
    }
  }
  
  // Get content items that have no parents (are not targets in any relationship)
  const targetContentIds = new Set(
    allRelationships.map((rel) => rel.targetContentId)
  );
  
  for (const contentId in contentItems) {
    if (!targetContentIds.has(contentId)) {
      rootNodes.add(contentId);
    }
  }
  
  // Generate LTREE paths starting from each root node
  const contentPaths: Record<string, string> = {};
  
  // For each root node, perform a depth-first traversal to generate paths
  for (const rootId of rootNodes) {
    // Root path is just the content ID
    contentPaths[rootId] = rootId;
    
    // Recursive helper function to traverse the graph
    function traverseGraph(nodeId: string, path: string) {
      // For each child of this node
      for (const childId of graph[nodeId] || []) {
        // Child path is parent path + child ID
        const childPath = `${path}.${childId}`;
        contentPaths[childId] = childPath;
        
        // Traverse children of this node
        traverseGraph(childId, childPath);
      }
    }
    
    // Start traversal from the root
    traverseGraph(rootId, rootId);
  }
  
  // Update content items with generated paths
  for (const contentId in contentPaths) {
    const path = contentPaths[contentId];
    
    await prisma.content.update({
      where: { id: contentId },
      data: { path }
    });
    
    // Also create ContentNode records for efficient querying
    const rootId = path.split('.')[0];
    const depth = path.split('.').length - 1;
    
    await prisma.contentNode.create({
      data: {
        contentId,
        path,
        depth,
        rootId
      }
    });
  }
  
  logger.info(`Generated LTREE paths for ${Object.keys(contentPaths).length} content items`);
}

/**
 * Seed the database with analytics data for content
 * @param prisma PrismaClient instance
 * @param contentItems Created content items
 * @returns Promise that resolves when seeding is complete
 */
async function seedAnalytics(
  prisma: PrismaClient,
  contentItems: Record<string, any>
): Promise<void> {
  logger.info('Seeding content analytics');
  
  // For each content item, create metrics
  for (const contentId in contentItems) {
    const content = contentItems[contentId];
    
    // Generate realistic performance metrics based on content type and platform
    const views = generateViewCount(content.contentType, content.platformId);
    const engagements = Math.round(views * generateEngagementRate(content.contentType, content.platformId));
    const shares = Math.round(views * generateShareRate(content.contentType, content.platformId));
    const comments = Math.round(engagements * faker.number.float({ min: 0.05, max: 0.2, precision: 0.01 }));
    const likes = engagements - comments;
    
    // Calculate engagement rate as a percentage
    const engagementRate = (engagements / views) * 100;
    
    // Calculate watch time for video content
    let watchTime = null;
    if (content.contentType === ContentType.VIDEO || content.contentType === ContentType.SHORT_VIDEO) {
      // Average watch time in minutes
      const metadata = content.metadata || {};
      const duration = metadata.duration || faker.number.int({ min: 30, max: 1800 });
      const averageWatchPercentage = faker.number.float({ min: 0.3, max: 0.8, precision: 0.01 });
      watchTime = (duration / 60) * averageWatchPercentage;
    }
    
    // Generate an estimated value based on views and engagement rate
    const estimatedValue = views * 0.01 * (engagementRate / 100) * 2;
    
    // Create the metrics record
    await prisma.contentMetrics.create({
      data: {
        contentId,
        date: content.publishedAt,
        views,
        engagements,
        engagementRate,
        shares,
        comments,
        likes,
        watchTime,
        estimatedValue,
        platformSpecificMetrics: {
          clicks: faker.number.int({ min: Math.round(views * 0.01), max: Math.round(views * 0.05) }),
          saves: faker.number.int({ min: Math.round(engagements * 0.1), max: Math.round(engagements * 0.3) }),
          impressions: views * faker.number.float({ min: 1.2, max: 2.0, precision: 0.01 })
        },
        lastUpdated: new Date()
      }
    });
    
    // Some platforms have platform-level metrics as well
    const platform = await prisma.platform.findUnique({
      where: { id: content.platformId }
    });
    
    if (platform) {
      // Check if this platform already has metrics
      const existingMetrics = await prisma.platformMetrics.findUnique({
        where: { platformId: platform.id }
      });
      
      if (!existingMetrics) {
        // Generate platform-level metrics
        const followers = generateFollowerCount(platform.platformType);
        
        await prisma.platformMetrics.create({
          data: {
            platformId: platform.id,
            followers,
            engagementRate: faker.number.float({ min: 1.5, max: 7.5, precision: 0.1 }),
            contentCount: faker.number.int({ min: 10, max: 100 }),
            averageViews: faker.number.int({ min: 1000, max: 50000 }),
            platformSpecificMetrics: {
              growth_rate: faker.number.float({ min: 0.5, max: 5.0, precision: 0.1 }),
              audience_retention: faker.number.float({ min: 40, max: 80, precision: 0.1 })
            },
            lastUpdated: new Date()
          }
        });
      }
    }
  }
  
  logger.info(`Created analytics for ${Object.keys(contentItems).length} content items`);
}

/**
 * Generate a realistic view count based on content type and platform
 * @param contentType Type of content
 * @param platformId Platform ID
 * @returns Generated view count
 */
function generateViewCount(contentType: ContentType, platformId: string): number {
  // Base views depend on content type
  let baseViews = 0;
  
  switch (contentType) {
    case ContentType.VIDEO:
      baseViews = faker.number.int({ min: 500, max: 50000 });
      break;
    case ContentType.SHORT_VIDEO:
      baseViews = faker.number.int({ min: 1000, max: 100000 });
      break;
    case ContentType.PHOTO:
    case ContentType.CAROUSEL:
      baseViews = faker.number.int({ min: 300, max: 30000 });
      break;
    case ContentType.STORY:
      baseViews = faker.number.int({ min: 200, max: 20000 });
      break;
    case ContentType.POST:
      baseViews = faker.number.int({ min: 100, max: 10000 });
      break;
    case ContentType.ARTICLE:
      baseViews = faker.number.int({ min: 50, max: 5000 });
      break;
    default:
      baseViews = faker.number.int({ min: 100, max: 10000 });
  }
  
  // Apply viral multiplier to some content (1 in 20 chance)
  if (faker.number.int({ min: 1, max: 20 }) === 1) {
    baseViews *= faker.number.float({ min: 5, max: 20, precision: 0.1 });
  }
  
  return Math.round(baseViews);
}

/**
 * Generate a realistic engagement rate based on content type and platform
 * @param contentType Type of content
 * @param platformId Platform ID
 * @returns Generated engagement rate (0-1)
 */
function generateEngagementRate(contentType: ContentType, platformId: string): number {
  // Base engagement rates depend on content type
  let baseRate = 0;
  
  switch (contentType) {
    case ContentType.VIDEO:
      baseRate = faker.number.float({ min: 0.03, max: 0.08, precision: 0.001 });
      break;
    case ContentType.SHORT_VIDEO:
      baseRate = faker.number.float({ min: 0.05, max: 0.15, precision: 0.001 });
      break;
    case ContentType.PHOTO:
    case ContentType.CAROUSEL:
      baseRate = faker.number.float({ min: 0.04, max: 0.12, precision: 0.001 });
      break;
    case ContentType.STORY:
      baseRate = faker.number.float({ min: 0.02, max: 0.06, precision: 0.001 });
      break;
    case ContentType.POST:
      baseRate = faker.number.float({ min: 0.01, max: 0.05, precision: 0.001 });
      break;
    case ContentType.ARTICLE:
      baseRate = faker.number.float({ min: 0.01, max: 0.03, precision: 0.001 });
      break;
    default:
      baseRate = faker.number.float({ min: 0.02, max: 0.07, precision: 0.001 });
  }
  
  // Highly engaging content (1 in 10 chance)
  if (faker.number.int({ min: 1, max: 10 }) === 1) {
    baseRate *= faker.number.float({ min: 1.5, max: 3, precision: 0.1 });
  }
  
  return baseRate;
}

/**
 * Generate a realistic share rate based on content type and platform
 * @param contentType Type of content
 * @param platformId Platform ID
 * @returns Generated share rate (0-1)
 */
function generateShareRate(contentType: ContentType, platformId: string): number {
  // Base share rates depend on content type
  let baseRate = 0;
  
  switch (contentType) {
    case ContentType.VIDEO:
      baseRate = faker.number.float({ min: 0.005, max: 0.02, precision: 0.001 });
      break;
    case ContentType.SHORT_VIDEO:
      baseRate = faker.number.float({ min: 0.01, max: 0.04, precision: 0.001 });
      break;
    case ContentType.PHOTO:
    case ContentType.CAROUSEL:
      baseRate = faker.number.float({ min: 0.003, max: 0.015, precision: 0.001 });
      break;
    case ContentType.POST:
      baseRate = faker.number.float({ min: 0.002, max: 0.01, precision: 0.001 });
      break;
    default:
      baseRate = faker.number.float({ min: 0.001, max: 0.01, precision: 0.001 });
  }
  
  // Highly shareable content (1 in 15 chance)
  if (faker.number.int({ min: 1, max: 15 }) === 1) {
    baseRate *= faker.number.float({ min: 2, max: 5, precision: 0.1 });
  }
  
  return baseRate;
}

/**
 * Generate a realistic follower count based on platform type
 * @param platformType Type of platform
 * @returns Generated follower count
 */
function generateFollowerCount(platformType: PlatformType): number {
  switch (platformType) {
    case PlatformType.YOUTUBE:
      return faker.number.int({ min: 1000, max: 500000 });
    case PlatformType.INSTAGRAM:
      return faker.number.int({ min: 2000, max: 1000000 });
    case PlatformType.TIKTOK:
      return faker.number.int({ min: 5000, max: 2000000 });
    case PlatformType.TWITTER:
      return faker.number.int({ min: 500, max: 100000 });
    case PlatformType.LINKEDIN:
      return faker.number.int({ min: 300, max: 50000 });
    default:
      return faker.number.int({ min: 1000, max: 100000 });
  }
}

/**
 * Seed the database with partnerships between creators and brands
 * @param prisma PrismaClient instance
 * @param creators Created creator records
 * @param brands Created brand records
 * @returns Created partnerships
 */
async function seedPartnerships(
  prisma: PrismaClient,
  creators: Record<string, any>,
  brands: Record<string, any>
): Promise<Record<string, any>> {
  logger.info('Seeding partnerships');
  
  const partnerships: Record<string, any> = {};
  
  // Get creator and brand IDs
  const creatorIds = Object.values(creators).map((creator) => creator.id);
  const brandIds = Object.values(brands).map((brand) => brand.id);
  
  // Create partnerships between creators and brands
  for (let i = 0; i < SAMPLE_COUNTS.PARTNERSHIPS; i++) {
    // Select a random creator and brand
    const creatorId = faker.helpers.arrayElement(creatorIds);
    const brandId = faker.helpers.arrayElement(brandIds);
    
    // Generate a partnership status
    const status = faker.helpers.weightedArrayElement([
      { value: PartnershipStatus.DRAFT, weight: 0.1 },
      { value: PartnershipStatus.PROPOSAL_PENDING, weight: 0.2 },
      { value: PartnershipStatus.NEGOTIATION, weight: 0.1 },
      { value: PartnershipStatus.CONTRACT_PENDING, weight: 0.1 },
      { value: PartnershipStatus.ACTIVE, weight: 0.3 },
      { value: PartnershipStatus.COMPLETED, weight: 0.2 }
    ]);
    
    // Generate a realistic budget based on status
    const budget = faker.number.float({
      min: 500,
      max: 10000,
      precision: 0.01
    });
    
    // Calculate platform fee
    const platformFee = budget * 0.08; // 8% platform fee
    
    // Generate dates based on status
    let startedAt = null;
    let completedAt = null;
    
    if (status === PartnershipStatus.ACTIVE || status === PartnershipStatus.COMPLETED) {
      startedAt = faker.date.recent(30);
      
      if (status === PartnershipStatus.COMPLETED) {
        completedAt = new Date(startedAt.getTime() + faker.number.int({ min: 7, max: 30 }) * 24 * 60 * 60 * 1000);
      }
    }
    
    // Create the partnership
    const partnership = await prisma.partnership.create({
      data: {
        creatorId,
        brandId,
        status,
        budget,
        platformFee,
        startedAt,
        completedAt,
        createdAt: faker.date.recent(60),
        updatedAt: faker.date.recent(10)
      }
    });
    
    partnerships[partnership.id] = partnership;
  }
  
  logger.info(`Created ${Object.keys(partnerships).length} partnerships`);
  return partnerships;
}

/**
 * Seed the database with contracts for partnerships
 * @param prisma PrismaClient instance
 * @param partnerships Created partnership records
 * @returns Promise that resolves when seeding is complete
 */
async function seedContracts(
  prisma: PrismaClient,
  partnerships: Record<string, any>
): Promise<void> {
  logger.info('Seeding contracts');
  
  let contractCount = 0;
  
  // Create contracts for partnerships that are beyond the proposal stage
  for (const partnershipId in partnerships) {
    const partnership = partnerships[partnershipId];
    
    if (
      partnership.status === PartnershipStatus.CONTRACT_PENDING ||
      partnership.status === PartnershipStatus.ACTIVE ||
      partnership.status === PartnershipStatus.COMPLETED
    ) {
      // Generate contract status based on partnership status
      let status;
      let signedByCreatorAt = null;
      let signedByBrandAt = null;
      
      if (partnership.status === PartnershipStatus.CONTRACT_PENDING) {
        status = faker.helpers.arrayElement([
          'DRAFT',
          'PENDING_SIGNATURES',
          'PARTIALLY_SIGNED'
        ]);
      } else if (
        partnership.status === PartnershipStatus.ACTIVE ||
        partnership.status === PartnershipStatus.COMPLETED
      ) {
        status = partnership.status === PartnershipStatus.ACTIVE ? 'ACTIVE' : 'COMPLETED';
        
        // In these states, both parties have signed
        signedByCreatorAt = new Date(partnership.createdAt.getTime() + faker.number.int({ min: 1, max: 3 }) * 24 * 60 * 60 * 1000);
        signedByBrandAt = new Date(partnership.createdAt.getTime() + faker.number.int({ min: 1, max: 3 }) * 24 * 60 * 60 * 1000);
      }
      
      // Generate contract terms
      const terms = {
        deliverables: [
          {
            type: faker.helpers.arrayElement(constants.CONTENT_TYPES),
            platform: faker.helpers.arrayElement(constants.PLATFORMS),
            description: faker.lorem.sentence(),
            dueDate: faker.date.future({ refDate: partnership.createdAt })
          },
          {
            type: faker.helpers.arrayElement(constants.CONTENT_TYPES),
            platform: faker.helpers.arrayElement(constants.PLATFORMS),
            description: faker.lorem.sentence(),
            dueDate: faker.date.future({ refDate: partnership.createdAt })
          }
        ],
        paymentTerms: {
          schedule: faker.helpers.arrayElement(['upfront', '50_50', 'milestone']),
          currency: 'USD'
        },
        usage: {
          duration: faker.number.int({ min: 30, max: 365 }),
          restrictions: faker.lorem.paragraph()
        }
      };
      
      // Create the contract
      await prisma.contract.create({
        data: {
          partnershipId,
          terms,
          status,
          signedByCreatorAt,
          signedByBrandAt,
          documentUrl: faker.internet.url(),
          createdAt: partnership.createdAt,
          updatedAt: faker.date.recent(10)
        }
      });
      
      contractCount++;
    }
  }
  
  logger.info(`Created ${contractCount} contracts`);
}

/**
 * Seed the database with payments for partnerships
 * @param prisma PrismaClient instance
 * @param partnerships Created partnership records
 * @returns Promise that resolves when seeding is complete
 */
async function seedPayments(
  prisma: PrismaClient,
  partnerships: Record<string, any>
): Promise<void> {
  logger.info('Seeding payments');
  
  let paymentCount = 0;
  
  // Create payments for active and completed partnerships
  for (const partnershipId in partnerships) {
    const partnership = partnerships[partnershipId];
    
    if (
      partnership.status === PartnershipStatus.ACTIVE ||
      partnership.status === PartnershipStatus.COMPLETED
    ) {
      // 50% upfront payment for all active/completed partnerships
      await prisma.payment.create({
        data: {
          partnershipId,
          amount: partnership.budget * 0.5,
          status: 'COMPLETED',
          type: 'INITIAL',
          stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
          escrowId: `escrow_${faker.string.alphanumeric(16)}`,
          createdAt: partnership.startedAt || partnership.createdAt,
          processedAt: partnership.startedAt || partnership.createdAt
        }
      });
      
      paymentCount++;
      
      // Final payment for completed partnerships
      if (partnership.status === PartnershipStatus.COMPLETED) {
        await prisma.payment.create({
          data: {
            partnershipId,
            amount: partnership.budget * 0.5,
            status: 'COMPLETED',
            type: 'FINAL',
            stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
            escrowId: `escrow_${faker.string.alphanumeric(16)}`,
            createdAt: partnership.completedAt,
            processedAt: partnership.completedAt
          }
        });
        
        paymentCount++;
      }
      
      // Some active partnerships might have final payment pending
      if (
        partnership.status === PartnershipStatus.ACTIVE &&
        faker.datatype.boolean()
      ) {
        await prisma.payment.create({
          data: {
            partnershipId,
            amount: partnership.budget * 0.5,
            status: 'PENDING',
            type: 'FINAL',
            createdAt: faker.date.recent(5)
          }
        });
        
        paymentCount++;
      }
    }
  }
  
  logger.info(`Created ${paymentCount} payments`);
}

/**
 * Seed the database with subscription records
 * @param prisma PrismaClient instance
 * @param creators Created creator records
 * @param brands Created brand records
 * @returns Promise that resolves when seeding is complete
 */
async function seedSubscriptions(
  prisma: PrismaClient,
  creators: Record<string, any>,
  brands: Record<string, any>
): Promise<void> {
  logger.info('Seeding subscriptions');
  
  let subscriptionCount = 0;
  
  // Create subscription records for creators
  for (const creatorId in creators) {
    const creator = creators[creatorId];
    
    // Get user to link subscription
    const user = await prisma.user.findUnique({
      where: { id: creator.userId }
    });
    
    if (user) {
      // Create subscription based on creator's tier
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
          stripeSubscriptionId: creator.subscriptionTier !== SubscriptionTier.FREE ? 
            `sub_${faker.string.alphanumeric(14)}` : null,
          tier: creator.subscriptionTier,
          status: creator.subscriptionStatus,
          currentPeriodStart: faker.date.past(),
          currentPeriodEnd: faker.date.future(),
          cancelAtPeriodEnd: faker.helpers.maybe(() => true, { probability: 0.1 })
        }
      });
      
      subscriptionCount++;
    }
  }
  
  // Create subscription records for brands
  for (const brandId in brands) {
    const brand = brands[brandId];
    
    // Get user to link subscription
    const user = await prisma.user.findUnique({
      where: { id: brand.userId }
    });
    
    if (user) {
      // Create subscription based on brand's tier
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
          stripeSubscriptionId: brand.subscriptionTier !== SubscriptionTier.FREE ? 
            `sub_${faker.string.alphanumeric(14)}` : null,
          tier: brand.subscriptionTier,
          status: brand.subscriptionStatus,
          currentPeriodStart: faker.date.past(),
          currentPeriodEnd: faker.date.future(),
          cancelAtPeriodEnd: faker.helpers.maybe(() => true, { probability: 0.1 })
        }
      });
      
      subscriptionCount++;
    }
  }
  
  logger.info(`Created ${subscriptionCount} subscriptions`);
}

// Execute the main function
main()
  .then(() => {
    console.log(chalk.green.bold('✓ Database seed completed successfully'));
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red.bold('✗ Database seed failed:'));
    console.error(error);
    process.exit(1);
  });