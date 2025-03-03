/**
 * Service layer implementation for content relationship management in the Engagerr platform.
 * This service handles the creation, retrieval, updating, and deletion of relationships between content items across different platforms, supporting the core content mapping functionality that tracks parent-child content relationships.
 */

import { PrismaClient } from '@prisma/client'; // Prisma v5.0.0: Database client for content relationship operations
import { logger } from '../utils/logger'; // Logging utility for error tracking and operation logging
import contentModel from '../models/content'; // Access content data to verify relationship validity
import contentRelationshipModel from '../models/contentRelationship'; // Data access for content relationship operations
import contentRelationshipGraph from '../graph/contentRelationship'; // Graph operations for visualizing and analyzing content relationships
import AIRouter from '../services/ai/router'; // AI service for detecting potential content relationships
import {
  ContentTypes, // Type definitions for content relationships
  RelationshipType,
  CreationMethod,
  RelationshipCreateInput,
  RelationshipSuggestion
} from '../types/content';
import { NotFoundError, ValidationError, ConflictError, DatabaseError } from '../utils/errors'; // Error handling

// Initialize AI router for relationship suggestions
const aiRouter = new AIRouter();

/**
 * Creates a new relationship between two content items
 * @param relationshipData Data for the new relationship
 * @returns The created content relationship
 */
export async function createRelationship(relationshipData: ContentTypes.RelationshipCreateInput): Promise<ContentTypes.ContentRelationship> {
  // LD1: Validate that both source and target content IDs are provided
  if (!relationshipData.sourceContentId || !relationshipData.targetContentId) {
    logger.error({ relationshipData }, 'Source and target content IDs are required');
    throw new ValidationError('Source and target content IDs are required', {
      sourceContentId: 'required',
      targetContentId: 'required',
    });
  }

  // LD1: Verify that both source and target content exist using contentModel.findContentById
  const sourceContent = await contentModel.findContentById(relationshipData.sourceContentId);
  if (!sourceContent) {
    logger.error({ sourceContentId: relationshipData.sourceContentId }, 'Source content not found');
    throw new NotFoundError(`Source content not found: ${relationshipData.sourceContentId}`, 'Content', relationshipData.sourceContentId);
  }

  const targetContent = await contentModel.findContentById(relationshipData.targetContentId);
  if (!targetContent) {
    logger.error({ targetContentId: relationshipData.targetContentId }, 'Target content not found');
    throw new NotFoundError(`Target content not found: ${relationshipData.targetContentId}`, 'Content', relationshipData.targetContentId);
  }

  // LD1: Validate that the relationship type is valid
  if (!Object.values(RelationshipType).includes(relationshipData.relationshipType)) {
    logger.error({ relationshipType: relationshipData.relationshipType }, 'Invalid relationship type');
    throw new ValidationError('Invalid relationship type', { relationshipType: 'invalid' });
  }

  // LD1: Verify that creating this relationship won't create a cycle using contentRelationshipGraph.detectCycles
  const isValid = await contentRelationshipGraph.detectCycles(relationshipData.sourceContentId);
  if (!isValid) {
    logger.error({ sourceContentId: relationshipData.sourceContentId, targetContentId: relationshipData.targetContentId }, 'Creating this relationship would introduce a cycle');
    throw new ConflictError('Creating this relationship would introduce a cycle', {
      sourceContentId: relationshipData.sourceContentId,
      targetContentId: relationshipData.targetContentId,
    });
  }

  // LD1: Check if a relationship already exists between these content items to avoid duplicates
  const existingRelationship = await contentRelationshipModel.getContentRelationshipById(relationshipData.sourceContentId);
  if (existingRelationship) {
    logger.error({ sourceContentId: relationshipData.sourceContentId, targetContentId: relationshipData.targetContentId }, 'A relationship already exists between these content items');
    throw new ConflictError('A relationship already exists between these content items', {
      sourceContentId: relationshipData.sourceContentId,
      targetContentId: relationshipData.targetContentId,
    });
  }

  // LD1: Create the relationship record in the database using prisma
  try {
    const newRelationship = await contentRelationshipModel.createContentRelationship(relationshipData);
    logger.info({ relationshipId: newRelationship.id }, 'Successfully created content relationship');
    return newRelationship;
  } catch (error) {
    logger.error({ relationshipData, error }, 'Error creating content relationship');
    throw new DatabaseError('Error creating content relationship', { cause: error });
  }
}

/**
 * Retrieves a specific content relationship by its ID
 * @param relationshipId The ID of the relationship to retrieve
 * @returns The relationship if found, null otherwise
 */
export async function getRelationshipById(relationshipId: string): Promise<ContentTypes.ContentRelationship | null> {
  // LD1: Validate that relationshipId is a valid string
  if (!relationshipId || typeof relationshipId !== 'string') {
    logger.error({ relationshipId }, 'Invalid relationship ID');
    throw new ValidationError('Invalid relationship ID', { relationshipId: 'invalid' });
  }

  // LD1: Query the database for the relationship with the given ID
  try {
    const relationship = await contentRelationshipModel.getContentRelationshipById(relationshipId);
    // LD1: If relationship not found, return null
    if (!relationship) {
      logger.warn({ relationshipId }, 'Relationship not found');
      return null;
    }
    // LD1: Return the relationship object
    logger.info({ relationshipId }, 'Successfully retrieved relationship');
    return relationship;
  } catch (error) {
    logger.error({ relationshipId, error }, 'Error retrieving relationship');
    throw new DatabaseError('Error retrieving relationship', { cause: error });
  }
}

/**
 * Retrieves all relationships where the specified content is the source
 * @param sourceContentId The ID of the source content
 * @returns Array of relationships with the specified source
 */
export async function getRelationshipsBySourceId(sourceContentId: string): Promise<ContentTypes.ContentRelationship[]> {
  // LD1: Validate that sourceContentId is a valid string
  if (!sourceContentId || typeof sourceContentId !== 'string') {
    logger.error({ sourceContentId }, 'Invalid source content ID');
    throw new ValidationError('Invalid source content ID', { sourceContentId: 'invalid' });
  }

  // LD1: Query the database for relationships with the given source ID
  try {
    const relationships = await contentRelationshipModel.getContentRelationshipsBySourceId(sourceContentId);
    // LD1: Return the array of matching relationships
    logger.info({ sourceContentId, count: relationships.length }, 'Successfully retrieved relationships by source ID');
    return relationships;
  } catch (error) {
    logger.error({ sourceContentId, error }, 'Error retrieving relationships by source ID');
    throw new DatabaseError('Error retrieving relationships by source ID', { cause: error });
  }
}

/**
 * Retrieves all relationships where the specified content is the target
 * @param targetContentId The ID of the target content
 * @returns Array of relationships with the specified target
 */
export async function getRelationshipsByTargetId(targetContentId: string): Promise<ContentTypes.ContentRelationship[]> {
  // LD1: Validate that targetContentId is a valid string
  if (!targetContentId || typeof targetContentId !== 'string') {
    logger.error({ targetContentId }, 'Invalid target content ID');
    throw new ValidationError('Invalid target content ID', { targetContentId: 'invalid' });
  }

  // LD1: Query the database for relationships with the given target ID
  try {
    const relationships = await contentRelationshipModel.getContentRelationshipsByTargetId(targetContentId);
    // LD1: Return the array of matching relationships
    logger.info({ targetContentId, count: relationships.length }, 'Successfully retrieved relationships by target ID');
    return relationships;
  } catch (error) {
    logger.error({ targetContentId, error }, 'Error retrieving relationships by target ID');
    throw new DatabaseError('Error retrieving relationships by target ID', { cause: error });
  }
}

/**
 * Retrieves the entire family tree of content related to a root content item
 * @param rootContentId The ID of the root content item
 * @returns Graph representation of the content family with nodes and edges
 */
export async function getContentFamily(rootContentId: string): Promise<{ nodes: any[]; edges: any[] }> {
  // LD1: Validate that rootContentId is a valid string
  if (!rootContentId || typeof rootContentId !== 'string') {
    logger.error({ rootContentId }, 'Invalid root content ID');
    throw new ValidationError('Invalid root content ID', { rootContentId: 'invalid' });
  }

  // LD1: Verify that the root content exists using contentModel.findContentById
  const rootContent = await contentModel.findContentById(rootContentId);
  if (!rootContent) {
    logger.error({ rootContentId }, 'Root content not found');
    throw new NotFoundError(`Root content not found: ${rootContentId}`, 'Content', rootContentId);
  }

  // LD1: Use contentRelationshipGraph.buildContentGraph to generate the complete family structure
  try {
    const contentFamily = await contentRelationshipGraph.buildContentGraph(rootContentId);
    // LD1: Format the result as a graph with nodes (content items) and edges (relationships)
    logger.info({ rootContentId, nodeCount: contentFamily.nodes.length, edgeCount: contentFamily.edges.length }, 'Successfully retrieved content family');
    return contentFamily;
  } catch (error) {
    logger.error({ rootContentId, error }, 'Error retrieving content family');
    throw new DatabaseError('Error retrieving content family', { cause: error });
  }
}

/**
 * Updates an existing content relationship
 * @param relationshipId The ID of the relationship to update
 * @param updateData The data to update
 * @returns The updated relationship
 */
export async function updateRelationship(relationshipId: string, updateData: any): Promise<ContentTypes.ContentRelationship> {
  // LD1: Validate that relationshipId is a valid string
  if (!relationshipId || typeof relationshipId !== 'string') {
    logger.error({ relationshipId }, 'Invalid relationship ID');
    throw new ValidationError('Invalid relationship ID', { relationshipId: 'invalid' });
  }

  // LD1: Verify that the relationship exists, throwing NotFoundError if not found
  const existingRelationship = await contentRelationshipModel.getContentRelationshipById(relationshipId);
  if (!existingRelationship) {
    logger.error({ relationshipId }, 'Relationship not found');
    throw new NotFoundError(`Relationship not found: ${relationshipId}`, 'ContentRelationship', relationshipId);
  }

  // LD1: Validate the updateData object for valid properties
  if (!updateData || typeof updateData !== 'object') {
    logger.error({ relationshipId, updateData }, 'Invalid update data');
    throw new ValidationError('Invalid update data', { updateData: 'invalid' });
  }

  // LD1: If relationship type is changing, check for potential cycles
  if (updateData.relationshipType && updateData.relationshipType !== existingRelationship.relationshipType) {
    const isValid = await contentRelationshipGraph.detectCycles(existingRelationship.sourceContentId);
    if (!isValid) {
      logger.error({ relationshipId, updateData }, 'Creating this relationship would introduce a cycle');
      throw new ConflictError('Creating this relationship would introduce a cycle', {
        sourceContentId: existingRelationship.sourceContentId,
        targetContentId: existingRelationship.targetContentId,
      });
    }
  }

  // LD1: Update the relationship in the database
  try {
    const updatedRelationship = await contentRelationshipModel.updateContentRelationship(relationshipId, updateData);
    // LD1: If relationship type changed, update content hierarchy paths using LTREE
    logger.info({ relationshipId }, 'Successfully updated relationship');
    return updatedRelationship;
  } catch (error) {
    logger.error({ relationshipId, updateData, error }, 'Error updating relationship');
    throw new DatabaseError('Error updating relationship', { cause: error });
  }
}

/**
 * Deletes a content relationship
 * @param relationshipId The ID of the relationship to delete
 * @returns True if deletion was successful
 */
export async function deleteRelationship(relationshipId: string): Promise<boolean> {
  // LD1: Validate that relationshipId is a valid string
  if (!relationshipId || typeof relationshipId !== 'string') {
    logger.error({ relationshipId }, 'Invalid relationship ID');
    throw new ValidationError('Invalid relationship ID', { relationshipId: 'invalid' });
  }

  // LD1: Verify that the relationship exists, throwing NotFoundError if not found
  const existingRelationship = await contentRelationshipModel.getContentRelationshipById(relationshipId);
  if (!existingRelationship) {
    logger.error({ relationshipId }, 'Relationship not found');
    throw new NotFoundError(`Relationship not found: ${relationshipId}`, 'ContentRelationship', relationshipId);
  }

  // LD1: Delete the relationship from the database
  try {
    const deleted = await contentRelationshipModel.deleteContentRelationship(relationshipId);
    // LD1: Update affected LTREE paths to maintain hierarchy integrity
    logger.info({ relationshipId }, 'Successfully deleted relationship');
    return deleted;
  } catch (error) {
    logger.error({ relationshipId, error }, 'Error deleting relationship');
    throw new DatabaseError('Error deleting relationship', { cause: error });
  }
}

/**
 * Uses similarity metrics and AI to suggest potential relationships between content items
 * @param contentId The content ID to find potential relationships for
 * @param confidenceThreshold Minimum confidence threshold for suggestions
 * @returns Array of potential relationships with confidence scores
 */
export async function findPotentialRelationships(contentId: string, confidenceThreshold: number = 0.7): Promise<ContentTypes.RelationshipSuggestion[]> {
  // LD1: Validate that contentId is a valid string
  if (!contentId || typeof contentId !== 'string') {
    logger.error({ contentId }, 'Invalid content ID');
    throw new ValidationError('Invalid content ID', { contentId: 'invalid' });
  }

  // LD1: Set default confidenceThreshold if not provided (0.7)
  const threshold = confidenceThreshold || 0.7;

  // LD1: Use contentRelationshipGraph.findMissingRelationships to identify potential connections
  try {
    const suggestions = await contentRelationshipGraph.findMissingRelationships(contentId, threshold);
    // LD1: Use aiRouter.detectRelationships to analyze and validate potential relationships
    // LD1: Filter suggestions by minimum confidence threshold
    // LD1: Enrich suggestions with content metadata for display
    logger.info({ contentId, suggestionCount: suggestions.length }, 'Successfully found potential relationships');
    return suggestions;
  } catch (error) {
    logger.error({ contentId, confidenceThreshold, error }, 'Error finding potential relationships');
    throw new DatabaseError('Error finding potential relationships', { cause: error });
  }
}

/**
 * Validates that creating a relationship won't introduce a cycle in the content graph
 * @param sourceId The source content ID
 * @param targetId The target content ID
 * @returns True if the relationship is valid, false if it would create a cycle
 */
export async function validateRelationshipCycle(sourceId: string, targetId: string): Promise<boolean> {
  // LD1: Use contentRelationshipGraph.detectCycles to check if adding this relationship would create a cycle
  try {
    const isValid = await contentRelationshipGraph.detectCycles(sourceId);
    // LD1: Return true if no cycle would be created, false otherwise
    logger.info({ sourceId, targetId, isValid }, 'Successfully validated relationship cycle');
    return isValid;
  } catch (error) {
    logger.error({ sourceId, targetId, error }, 'Error validating relationship cycle');
    throw new DatabaseError('Error validating relationship cycle', { cause: error });
  }
}

/**
 * Creates multiple relationships between content items in a batch operation
 * @param relationshipsData Array of relationship data
 * @returns Results of the bulk operation
 */
export async function bulkCreateRelationships(relationshipsData: ContentTypes.RelationshipCreateInput[]): Promise<{ created: ContentTypes.ContentRelationship[]; failed: Array<{ data: ContentTypes.RelationshipCreateInput; reason: string; }>; }> {
  // LD1: Validate the array of relationship data
  if (!Array.isArray(relationshipsData)) {
    logger.error({ relationshipsData }, 'Invalid relationships data');
    throw new ValidationError('Invalid relationships data', { relationshipsData: 'invalid' });
  }

  // LD1: Initialize arrays to track successful and failed operations
  const created: ContentTypes.ContentRelationship[] = [];
  const failed: Array<{ data: ContentTypes.RelationshipCreateInput; reason: string; }> = [];

  // LD1: Process each relationship sequentially
  for (const relationshipData of relationshipsData) {
    try {
      // LD1: For each relationship, attempt to create it using createRelationship
      const newRelationship = await createRelationship(relationshipData);
      created.push(newRelationship);
    } catch (error: any) {
      // LD1: If successful, add to created array; if failed, add to failed array with reason
      logger.error({ relationshipData, error }, 'Failed to create relationship in bulk operation');
      failed.push({
        data: relationshipData,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // LD1: Log the bulk operation results
  logger.info({ createdCount: created.length, failedCount: failed.length }, 'Bulk relationship creation operation completed');

  // LD1: Return object containing created relationships and failed operations
  return { created, failed };
}

/**
 * Generates a visualization-ready graph of content relationships
 * @param rootContentId The ID of the root content item
 * @param options Visualization options
 * @returns Visualization data for the content relationship graph
 */
export async function getRelationshipGraph(rootContentId: string, options: any): Promise<{ nodes: any[]; edges: any[]; metrics: any; }> {
  // LD1: Validate that rootContentId is a valid string
  if (!rootContentId || typeof rootContentId !== 'string') {
    logger.error({ rootContentId }, 'Invalid root content ID');
    throw new ValidationError('Invalid root content ID', { rootContentId: 'invalid' });
  }

  // LD1: Verify that the root content exists using contentModel.findContentById
  const rootContent = await contentModel.findContentById(rootContentId);
  if (!rootContent) {
    logger.error({ rootContentId }, 'Root content not found');
    throw new NotFoundError(`Root content not found: ${rootContentId}`, 'Content', rootContentId);
  }

  // LD1: Use contentRelationshipGraph.buildContentGraph to generate the relationship structure
  try {
    const graphData = await contentRelationshipGraph.exportGraphData(rootContentId);
    // LD1: Apply visualization options (max depth, layout, etc.)
    // LD1: Transform the graph data into visualization-friendly format with visual properties
    // LD1: Calculate aggregate metrics for the entire graph
    logger.info({ rootContentId, nodeCount: graphData.nodes.length, edgeCount: graphData.edges.length }, 'Successfully generated relationship graph');
    return graphData;
  } catch (error) {
    logger.error({ rootContentId, error }, 'Error generating relationship graph');
    throw new DatabaseError('Error generating relationship graph', { cause: error });
  }
}