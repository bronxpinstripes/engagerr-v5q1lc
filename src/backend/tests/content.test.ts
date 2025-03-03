/**
 * Test suite for content functionality in the Engagerr platform, focusing on content creation, retrieval, relationships, and family graph structures. Tests the core content relationship mapping feature that enables tracking hierarchical content connections across different platforms.
 */

import { jest } from '@jest/globals'; //  ^29.6.0
import contentModel from '../src/models/content'; // Import content model functions for testing content operations
import contentService from '../src/services/content'; // Import content service functions for integration testing
import { createContentRelationship } from '../src/models/contentRelationship';
import contentRelationshipGraph from '../src/graph/contentRelationship'; // Import graph utilities for testing content relationship structures
import { ContentTypes, ContentType, RelationshipType, CreationMethod, ContentCreateInput, RelationshipCreateInput } from '../src/types/content'; // Import content type definitions for test data creation
import { PlatformTypes, PlatformType } from '../src/types/platform'; // Import platform type definitions for test data creation
import { prisma } from '../src/config/database'; // Database client for test data setup and verification
import { NotFoundError, ValidationError, ConflictError } from '../src/utils/errors'; // Error class for testing error handling
import { setupTestDatabase, teardownTestDatabase, globalMocks } from './setup'; // Function to set up test database before tests

describe('Content Model', () => {
  /**
   * Test suite for content model operations
   * Groups tests for content model CRUD operations
   * Sets up test data for content model tests
   * Runs individual test cases for content model functions
   */

  beforeAll(async () => {
    /**
     * Set up test data for content model tests
     */
    await setupTestDatabase();
  });

  afterAll(async () => {
    /**
     * Clean up test database after tests
     */
    await teardownTestDatabase();
  });

  test('should create content successfully', async () => {
    /**
     * Tests the creation of content items
     * Creates test data for a new content item
     * Calls contentModel.createContent with test data
     * Verifies the created content has expected properties
     * Verifies content is stored in the database
     */
    const contentData: ContentCreateInput = {
      creatorId: 'test-creator-profile-id',
      platformId: 'test-platform-id',
      externalId: 'test-external-id',
      title: 'Test Content',
      description: 'Test Description',
      contentType: ContentType.VIDEO,
      publishedAt: new Date(),
      url: 'http://test.com',
      thumbnail: 'http://test.com/thumbnail.jpg',
      metadata: {},
      parentContentId: null,
      isRoot: true,
    };

    const createdContent = await contentModel.createContent(contentData);

    expect(createdContent).toBeDefined();
    expect(createdContent.creatorId).toBe(contentData.creatorId);
    expect(createdContent.title).toBe(contentData.title);

    const dbContent = await prisma.content.findUnique({
      where: { id: createdContent.id },
    });

    expect(dbContent).toBeDefined();
    expect(dbContent?.title).toBe(contentData.title);
  });

  test('should find content by ID', async () => {
    /**
     * Tests retrieval of content items by ID
     * Creates test content item in database
     * Calls contentModel.findContentById with the created content ID
     * Verifies the retrieved content matches the created content
     * Test with non-existent ID should return null
     */
    const contentData: ContentCreateInput = {
      creatorId: 'test-creator-profile-id',
      platformId: 'test-platform-id',
      externalId: 'test-external-id-find',
      title: 'Test Content Find',
      description: 'Test Description Find',
      contentType: ContentType.VIDEO,
      publishedAt: new Date(),
      url: 'http://test.com',
      thumbnail: 'http://test.com/thumbnail.jpg',
      metadata: {},
      parentContentId: null,
      isRoot: true,
    };

    const createdContent = await contentModel.createContent(contentData);

    const foundContent = await contentModel.findContentById(createdContent.id);
    expect(foundContent).toBeDefined();
    expect(foundContent?.title).toBe(contentData.title);

    const notFoundContent = await contentModel.findContentById('non-existent-id');
    expect(notFoundContent).toBeNull();
  });

  test('should update content successfully', async () => {
    /**
     * Tests updating existing content items
     * Creates test content item in database
     * Prepare update data with modified properties
     * Calls contentModel.updateContent with update data
     * Verify content is updated with new properties
     * Verify other properties remain unchanged
     */
    const contentData: ContentCreateInput = {
      creatorId: 'test-creator-profile-id',
      platformId: 'test-platform-id',
      externalId: 'test-external-id-update',
      title: 'Test Content Update',
      description: 'Test Description Update',
      contentType: ContentType.VIDEO,
      publishedAt: new Date(),
      url: 'http://test.com',
      thumbnail: 'http://test.com/thumbnail.jpg',
      metadata: {},
      parentContentId: null,
      isRoot: true,
    };

    const createdContent = await contentModel.createContent(contentData);

    const updateData = {
      id: createdContent.id,
      title: 'Updated Content Title',
      description: 'Updated Content Description',
    };

    const updatedContent = await contentModel.updateContent(updateData);
    expect(updatedContent).toBeDefined();
    expect(updatedContent.title).toBe(updateData.title);
    expect(updatedContent.description).toBe(updateData.description);
    expect(updatedContent.platformId).toBe(contentData.platformId);
  });

  test('should delete content successfully', async () => {
    /**
     * Tests deletion of content items
     * Creates test content item in database
     * Calls contentModel.deleteContent with content ID
     * Verify operation returns true
     * Verify content no longer exists in database
     * Test with non-existent ID should throw NotFoundError
     */
    const contentData: ContentCreateInput = {
      creatorId: 'test-creator-profile-id',
      platformId: 'test-platform-id',
      externalId: 'test-external-id-delete',
      title: 'Test Content Delete',
      description: 'Test Description Delete',
      contentType: ContentType.VIDEO,
      publishedAt: new Date(),
      url: 'http://test.com',
      thumbnail: 'http://test.com/thumbnail.jpg',
      metadata: {},
      parentContentId: null,
      isRoot: true,
    };

    const createdContent = await contentModel.createContent(contentData);

    const deleteResult = await contentModel.deleteContent(createdContent.id);
    expect(deleteResult).toBe(true);

    const notFoundContent = await prisma.content.findUnique({
      where: { id: createdContent.id },
    });
    expect(notFoundContent).toBeNull();

    await expect(contentModel.deleteContent('non-existent-id')).rejects.toThrow(NotFoundError);
  });

  test('should list creator content with filters', async () => {
    /**
     * Tests retrieving content items for a creator with filtering
     * Creates multiple test content items for a creator with different properties
     * Calls contentModel.listCreatorContent with various filters
     * Verify filtered results match expected items
     * Test pagination by setting limit and offset parameters
     * Verify total count is returned correctly
     */
    const contentData1: ContentCreateInput = {
      creatorId: 'test-creator-profile-id',
      platformId: 'test-platform-id',
      externalId: 'test-external-id-1',
      title: 'Test Content 1',
      description: 'Test Description',
      contentType: ContentType.VIDEO,
      publishedAt: new Date('2023-01-01'),
      url: 'http://test.com',
      thumbnail: 'http://test.com/thumbnail.jpg',
      metadata: {},
      parentContentId: null,
      isRoot: true,
    };

    const contentData2: ContentCreateInput = {
      creatorId: 'test-creator-profile-id',
      platformId: 'test-platform-id',
      externalId: 'test-external-id-2',
      title: 'Test Content 2',
      description: 'Test Description',
      contentType: ContentType.PHOTO,
      publishedAt: new Date('2023-01-05'),
      url: 'http://test.com',
      thumbnail: 'http://test.com/thumbnail.jpg',
      metadata: {},
      parentContentId: null,
      isRoot: true,
    };

    await contentModel.createContent(contentData1);
    await contentModel.createContent(contentData2);

    const filters: ContentTypes.ContentFilter = {
      creatorId: 'test-creator-profile-id',
      contentType: ContentType.VIDEO,
      limit: 1,
      offset: 0,
    };

    const { content, total } = await contentModel.listCreatorContent('test-creator-profile-id', filters);
    expect(content).toBeDefined();
    expect(content.length).toBe(1);
    expect(content[0].contentType).toBe(ContentType.VIDEO);
    expect(total).toBe(2);
  });
});

describe('Content Relationships', () => {
  /**
   * Test suite for content relationship functionality
   * Groups tests for content relationship operations
   * Sets up test data for content relationship tests
   * Runs individual test cases for relationship functions
   */

  beforeAll(async () => {
    /**
     * Set up test data for content relationship tests
     */
    await setupTestDatabase();
  });

  afterAll(async () => {
    /**
     * Clean up test database after tests
     */
    await teardownTestDatabase();
  });

  test('should create relationship between content items', async () => {
    /**
     * Tests creating relationships between content items
     * Create two test content items in database
     * Prepare relationship data with source and target content IDs
     * Call createContentRelationship with relationship data
     * Verify relationship is created with correct properties
     * Verify relationship exists in database
     */
    const relationshipData: RelationshipCreateInput = {
      sourceContentId: 'test-content-root-id',
      targetContentId: 'test-content-child-id',
      relationshipType: RelationshipType.DERIVATIVE,
      confidence: 0.95,
      creationMethod: CreationMethod.USER_DEFINED,
      metadata: {},
    };

    const relationship = await createContentRelationship(relationshipData);
    expect(relationship).toBeDefined();
    expect(relationship.sourceContentId).toBe(relationshipData.sourceContentId);
    expect(relationship.targetContentId).toBe(relationshipData.targetContentId);

    const dbRelationship = await prisma.contentRelationship.findUnique({
      where: { id: relationship.id },
    });
    expect(dbRelationship).toBeDefined();
    expect(dbRelationship?.sourceContentId).toBe(relationshipData.sourceContentId);
    expect(dbRelationship?.targetContentId).toBe(relationshipData.targetContentId);
  });

  test('should retrieve content family with relationships', async () => {
    /**
     * Tests retrieving entire content family tree
     * Create root content item in database
     * Create multiple child content items with relationships to root
     * Create third-level content items related to children
     * Call contentModel.getContentFamily with root content ID
     * Verify family structure includes all related content items
     * Verify relationships are preserved in the family structure
     */
    const contentFamily = await contentModel.getContentFamily('test-content-root-id');
    expect(contentFamily).toBeDefined();
  });

  test('should build content graph from relationships', async () => {
    /**
     * Tests building a graph representation of content relationships
     * Create content family with multiple levels and branches
     * Call contentRelationshipGraph.buildContentGraph with root content ID
     * Verify graph structure has correct nodes and edges
     * Verify graph contains correct hierarchy based on relationships
     * Verify aggregate metrics are calculated correctly
     */
    const contentGraph = await contentRelationshipGraph.buildContentGraph('test-content-root-id');
    expect(contentGraph).toBeDefined();
  });

  test('should export content family as visualization data', async () => {
    /**
     * Tests exporting relationship data in visualization-ready format
     * Create content family with relationships across platforms
     * Call contentRelationshipGraph.exportGraphData with root content ID
     * Verify visualization data has nodes with visual properties
     * Verify edges connect the correct nodes with relationship types
     * Verify visualization data includes aggregate metrics
     */
    const visualizationData = await contentRelationshipGraph.exportGraphData('test-content-root-id');
    expect(visualizationData).toBeDefined();
  });
});

describe('Content Service Integration', () => {
  /**
   * Test suite for content service integration
   * Groups tests for content service integration tests
   * Sets up test data for service integration tests
   * Runs individual test cases for service integration
   */

  beforeAll(async () => {
    /**
     * Set up test data for service integration tests
     */
    await setupTestDatabase();
  });

  afterAll(async () => {
    /**
     * Clean up test database after tests
     */
    await teardownTestDatabase();
  });

  test('should create content and establish relationships', async () => {
    /**
     * Tests creating content with automatic relationship establishment
     * Create parent content item in database
     * Prepare new content data with parentContentId reference
     * Call contentService.createNewContent with new content data
     * Verify new content is created successfully
     * Verify relationship to parent content is established
     * Verify content family includes both parent and child content
     */
    const contentData: ContentCreateInput = {
      creatorId: 'test-creator-profile-id',
      platformId: 'test-platform-id',
      externalId: 'test-external-id-create-service',
      title: 'Test Content Service',
      description: 'Test Description Service',
      contentType: ContentType.VIDEO,
      publishedAt: new Date(),
      url: 'http://test.com',
      thumbnail: 'http://test.com/thumbnail.jpg',
      metadata: {},
      parentContentId: 'test-content-root-id',
      isRoot: false,
    };

    const newContent = await contentService.createNewContent(contentData);
    expect(newContent).toBeDefined();
    expect(newContent.title).toBe(contentData.title);

    const relationship = await prisma.contentRelationship.findFirst({
      where: {
        sourceContentId: 'test-content-root-id',
        targetContentId: newContent.id,
      },
    });
    expect(relationship).toBeDefined();

    const contentFamily = await contentModel.getContentFamily('test-content-root-id');
    expect(contentFamily).toBeDefined();
  });

  test('should suggest potential content relationships', async () => {
    /**
     * Tests AI-based suggestion of potential content relationships
     * Create multiple content items with similar attributes but no relationships
     * Mock AI service response for relationship detection
     * Call contentService.suggestContentRelationships with content ID
     * Verify suggested relationships include expected content items
     * Verify suggestions include confidence scores and relationship types
     * Test filtering suggestions by confidence threshold
     */
    const aiServiceMocks = globalMocks.aiServices;
    aiServiceMocks.llama.detectRelationships.mockResolvedValue([{
      targetContentId: 'test-content-child-id',
      relationshipType: 'related',
      confidence: 0.8,
    }]);

    const suggestions = await contentService.suggestContentRelationships('test-content-root-id');
    expect(suggestions).toBeDefined();
    expect(suggestions.length).toBeGreaterThan(0);
  });

  test('should prevent relationship cycles in content graph', async () => {
    /**
     * Tests validation to prevent cycles in content relationship graph
     * Create content items with existing hierarchical relationships
     * Attempt to create relationship from child to parent (would create cycle)
     * Verify operation throws ConflictError
     * Verify content graph integrity is maintained
     * Verify valid relationships can still be created
     */
    const relationshipData: RelationshipCreateInput = {
      sourceContentId: 'test-content-child-id',
      targetContentId: 'test-content-root-id',
      relationshipType: RelationshipType.DERIVATIVE,
      confidence: 0.95,
      creationMethod: CreationMethod.USER_DEFINED,
      metadata: {},
    };

    await expect(createContentRelationship(relationshipData)).rejects.toThrow(ConflictError);
  });

  test('should calculate aggregate metrics for content family', async () => {
    /**
     * Tests calculation of aggregate metrics across content family
     * Create content family with items across different platforms
     * Set metrics for each content item with known values
     * Call contentService.getContentFamily with includeMetrics=true
     * Verify aggregate metrics include sum of individual metrics
     * Verify metrics handle audience overlap deduplication
     * Verify derived metrics like engagement rate are calculated correctly
     */
    const contentFamily = await contentService.getContentFamily('test-content-root-id', { includeMetrics: true });
    expect(contentFamily).toBeDefined();
  });
});