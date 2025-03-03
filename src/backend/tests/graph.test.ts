/**
 * Unit and integration tests for the content relationship graph system that tracks parent/child content relationships across platforms using PostgreSQL's LTREE extension.
 * Tests the functionality for creating, querying, visualizing, and analyzing hierarchical content relationships.
 */

import { contentRelationshipGraph } from '../src/graph'; // Main interface for content relationship graph operations
import { hierarchyBuilder } from '../src/graph'; // Utilities for building and maintaining hierarchical structures
import { prisma } from '../src/config/database'; // Database client for testing database operations
import { setupTestDatabase } from './setup'; // Initialize test database with test data
import { ContentTypes } from '../src/types/content'; // Type definitions for content and relationship structures
import contentRelationshipModel from '../src/models/contentRelationship'; // Model for managing content relationships
import contentModel from '../src/models/content'; // Model for retrieving content data

describe('Content Relationship Graph Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  describe('buildContentGraph', () => {
    it('should build a valid content graph from a root content item', async () => {
      // Generate test content hierarchy with multiple platforms
      const rootId = 'test-content-root-id';
      const graph = await contentRelationshipGraph.buildContentGraph(rootId);
      expect(graph).toBeDefined();
      expect(graph.rootContentId).toBe(rootId);
    });

    it('should throw an error when root content does not exist', async () => {
      // Call buildContentGraph with a non-existent ID
      const nonExistentId = 'non-existent-id';
      await expect(contentRelationshipGraph.buildContentGraph(nonExistentId))
        .rejects.toThrowError(`Root content not found: ${nonExistentId}`);
    });
  });
});