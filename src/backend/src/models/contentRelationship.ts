/**
 * Model implementation for content relationships, providing functions to manage hierarchical
 * connections between content items across platforms using PostgreSQL's LTREE extension.
 */
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  RelationshipType,
  CreationMethod,
  ContentRelationship
} from '../types/content';
import { AppError, NotFoundError, ConflictError } from '../utils/errors';

/**
 * Creates a new relationship between two content items
 * 
 * @param relationshipData The data for the new relationship
 * @returns The created content relationship
 */
export async function createContentRelationship(relationshipData: {
  sourceContentId: string;
  targetContentId: string;
  relationshipType: RelationshipType;
  confidence: number;
  creationMethod: CreationMethod;
  metadata?: Record<string, any>;
}): Promise<ContentRelationship> {
  try {
    // Validate that source and target content exist
    const sourceContent = await prisma.content.findUnique({
      where: { id: relationshipData.sourceContentId }
    });

    const targetContent = await prisma.content.findUnique({
      where: { id: relationshipData.targetContentId }
    });

    if (!sourceContent) {
      throw new NotFoundError(
        `Source content not found: ${relationshipData.sourceContentId}`, 
        'Content', 
        relationshipData.sourceContentId
      );
    }

    if (!targetContent) {
      throw new NotFoundError(
        `Target content not found: ${relationshipData.targetContentId}`, 
        'Content',
        relationshipData.targetContentId
      );
    }

    // Check if a relationship already exists between these items
    const existingRelationship = await prisma.contentRelationship.findFirst({
      where: {
        sourceContentId: relationshipData.sourceContentId,
        targetContentId: relationshipData.targetContentId
      }
    });

    if (existingRelationship) {
      throw new ConflictError(
        'A relationship already exists between these content items',
        {
          sourceContentId: relationshipData.sourceContentId,
          targetContentId: relationshipData.targetContentId,
          existingRelationshipId: existingRelationship.id
        }
      );
    }

    // Validate the relationship won't create a cycle
    const isValid = await validateRelationshipCycle(
      relationshipData.sourceContentId,
      relationshipData.targetContentId
    );

    if (!isValid) {
      throw new ConflictError(
        'Creating this relationship would introduce a cycle in the content graph',
        {
          sourceContentId: relationshipData.sourceContentId,
          targetContentId: relationshipData.targetContentId
        }
      );
    }

    // Create the relationship
    const relationship = await prisma.contentRelationship.create({
      data: {
        sourceContentId: relationshipData.sourceContentId,
        targetContentId: relationshipData.targetContentId,
        relationshipType: relationshipData.relationshipType,
        confidence: relationshipData.confidence,
        creationMethod: relationshipData.creationMethod,
        metadata: relationshipData.metadata || {}
      }
    });

    // Update LTREE paths for hierarchical querying
    await updateContentHierarchyPaths(relationship);

    return relationship;
  } catch (error) {
    logger.error({
      message: 'Failed to create content relationship',
      error: error instanceof Error ? error.message : String(error),
      sourceContentId: relationshipData.sourceContentId,
      targetContentId: relationshipData.targetContentId
    });
    throw error;
  }
}

/**
 * Retrieves a specific content relationship by its ID
 * 
 * @param id The ID of the relationship to retrieve
 * @returns The relationship if found, null otherwise
 */
export async function getContentRelationshipById(id: string): Promise<ContentRelationship | null> {
  try {
    const relationship = await prisma.contentRelationship.findUnique({
      where: { id }
    });
    
    return relationship;
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve content relationship by ID',
      error: error instanceof Error ? error.message : String(error),
      relationshipId: id
    });
    throw error;
  }
}

/**
 * Retrieves all relationships where the specified content is the source
 * 
 * @param sourceContentId The ID of the source content
 * @returns Array of relationships with the specified source
 */
export async function getContentRelationshipsBySourceId(sourceContentId: string): Promise<ContentRelationship[]> {
  try {
    const relationships = await prisma.contentRelationship.findMany({
      where: { sourceContentId }
    });
    
    return relationships;
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve content relationships by source ID',
      error: error instanceof Error ? error.message : String(error),
      sourceContentId
    });
    throw error;
  }
}

/**
 * Retrieves all relationships where the specified content is the target
 * 
 * @param targetContentId The ID of the target content
 * @returns Array of relationships with the specified target
 */
export async function getContentRelationshipsByTargetId(targetContentId: string): Promise<ContentRelationship[]> {
  try {
    const relationships = await prisma.contentRelationship.findMany({
      where: { targetContentId }
    });
    
    return relationships;
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve content relationships by target ID',
      error: error instanceof Error ? error.message : String(error),
      targetContentId
    });
    throw error;
  }
}

/**
 * Retrieves the entire family tree of content related to a root content item
 * 
 * @param rootContentId The ID of the root content item
 * @returns Graph representation of the content family with nodes and edges
 */
export async function getContentFamily(rootContentId: string): Promise<{ nodes: any[], edges: any[] }> {
  try {
    // First check if the root content exists
    const rootContent = await prisma.content.findUnique({
      where: { id: rootContentId },
      include: {
        platform: true
      }
    });

    if (!rootContent) {
      throw new NotFoundError(`Root content not found: ${rootContentId}`, 'Content', rootContentId);
    }

    // Use recursive CTE to get the entire content family
    // This leverages PostgreSQL's WITH RECURSIVE feature through Prisma's queryRaw
    const familyData = await prisma.$queryRaw`
      WITH RECURSIVE content_family AS (
        -- Base case: the root content
        SELECT 
          c.id,
          c.title,
          c.description,
          c.content_type as "contentType",
          c.platform_id as "platformId",
          c.published_at as "publishedAt",
          c.url,
          c.thumbnail,
          c.views,
          c.engagements,
          c.shares,
          c.comments,
          c.estimated_value as "estimatedValue",
          p.platform_type as "platformType",
          0 as depth,
          NULL::uuid as "parentId",
          NULL::uuid as "relationshipId",
          NULL::text as "relationshipType",
          NULL::float as confidence
        FROM content c
        JOIN platform p ON c.platform_id = p.id
        WHERE c.id = ${rootContentId}
        
        UNION
        
        -- Recursive case: find all children
        SELECT 
          c.id,
          c.title,
          c.description,
          c.content_type as "contentType",
          c.platform_id as "platformId",
          c.published_at as "publishedAt",
          c.url,
          c.thumbnail,
          c.views,
          c.engagements,
          c.shares,
          c.comments,
          c.estimated_value as "estimatedValue",
          p.platform_type as "platformType",
          cf.depth + 1 as depth,
          cr.source_content_id as "parentId",
          cr.id as "relationshipId",
          cr.relationship_type as "relationshipType",
          cr.confidence
        FROM content_family cf
        JOIN content_relationship cr ON cf.id = cr.source_content_id
        JOIN content c ON cr.target_content_id = c.id
        JOIN platform p ON c.platform_id = p.id
        WHERE cf.depth < 10 -- Limit recursion depth for safety
      )
      SELECT * FROM content_family
      ORDER BY depth, "publishedAt";
    `;

    // Transform the query results into a graph structure with nodes and edges
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeMap: Record<string, boolean> = {};

    // Process each content item
    for (const item of familyData as any[]) {
      // Only add each node once
      if (!nodeMap[item.id]) {
        nodes.push({
          id: item.id,
          title: item.title,
          contentType: item.contentType,
          platformId: item.platformId,
          platformType: item.platformType,
          publishedAt: item.publishedAt,
          url: item.url,
          thumbnail: item.thumbnail,
          metrics: {
            views: item.views || 0,
            engagements: item.engagements || 0,
            shares: item.shares || 0,
            comments: item.comments || 0,
            estimatedValue: item.estimatedValue || 0
          },
          depth: item.depth,
          isRoot: item.depth === 0
        });
        
        nodeMap[item.id] = true;
      }
      
      // Add relationship edge if it exists
      if (item.relationshipId) {
        edges.push({
          id: item.relationshipId,
          source: item.parentId,
          target: item.id,
          type: item.relationshipType,
          confidence: item.confidence
        });
      }
    }

    return { nodes, edges };
  } catch (error) {
    logger.error({
      message: 'Failed to retrieve content family',
      error: error instanceof Error ? error.message : String(error),
      rootContentId
    });
    throw error;
  }
}

/**
 * Updates an existing content relationship
 * 
 * @param id The ID of the relationship to update
 * @param updateData The data to update
 * @returns The updated relationship
 */
export async function updateContentRelationship(id: string, updateData: {
  relationshipType?: RelationshipType;
  confidence?: number;
  metadata?: Record<string, any>;
}): Promise<ContentRelationship> {
  try {
    // Check if the relationship exists
    const existingRelationship = await prisma.contentRelationship.findUnique({
      where: { id }
    });

    if (!existingRelationship) {
      throw new NotFoundError(`Content relationship not found: ${id}`, 'ContentRelationship', id);
    }

    // Update the relationship
    const updatedRelationship = await prisma.contentRelationship.update({
      where: { id },
      data: {
        relationshipType: updateData.relationshipType,
        confidence: updateData.confidence,
        metadata: updateData.metadata ? {
          ...existingRelationship.metadata,
          ...updateData.metadata
        } : existingRelationship.metadata
      }
    });

    // Update LTREE paths if relationship type changed
    if (updateData.relationshipType && updateData.relationshipType !== existingRelationship.relationshipType) {
      await updateContentHierarchyPaths(updatedRelationship);
    }

    return updatedRelationship;
  } catch (error) {
    logger.error({
      message: 'Failed to update content relationship',
      error: error instanceof Error ? error.message : String(error),
      relationshipId: id,
      updateData
    });
    throw error;
  }
}

/**
 * Deletes a content relationship
 * 
 * @param id The ID of the relationship to delete
 * @returns True if deletion was successful
 */
export async function deleteContentRelationship(id: string): Promise<boolean> {
  try {
    // Check if the relationship exists
    const existingRelationship = await prisma.contentRelationship.findUnique({
      where: { id }
    });

    if (!existingRelationship) {
      throw new NotFoundError(`Content relationship not found: ${id}`, 'ContentRelationship', id);
    }

    // Store IDs before deletion for path updates
    const sourceId = existingRelationship.sourceContentId;
    const targetId = existingRelationship.targetContentId;

    // Delete the relationship
    await prisma.contentRelationship.delete({
      where: { id }
    });

    // Update affected content hierarchy paths
    await updateHierarchyAfterDeletion(sourceId, targetId);

    return true;
  } catch (error) {
    logger.error({
      message: 'Failed to delete content relationship',
      error: error instanceof Error ? error.message : String(error),
      relationshipId: id
    });
    throw error;
  }
}

/**
 * Uses similarity metrics to suggest potential relationships between content items
 * 
 * @param contentId The content ID to find potential relationships for
 * @param confidenceThreshold Minimum confidence score (0-1) for suggestions
 * @returns Array of potential relationships with confidence scores
 */
export async function findPotentialRelationships(
  contentId: string,
  confidenceThreshold: number = 0.7
): Promise<Array<{ targetId: string, confidence: number, relationshipType: RelationshipType }>> {
  try {
    // Validate content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        platform: true
      }
    });

    if (!content) {
      throw new NotFoundError(`Content not found: ${contentId}`, 'Content', contentId);
    }

    // Find content by the same creator that might be related
    const potentialMatches = await prisma.content.findMany({
      where: {
        creatorId: content.creatorId,
        id: { not: contentId },
        // Exclude content already in a relationship with this content
        NOT: {
          OR: [
            {
              targetRelationships: {
                some: { sourceContentId: contentId }
              }
            },
            {
              sourceRelationships: {
                some: { targetContentId: contentId }
              }
            }
          ]
        }
      },
      include: {
        platform: true
      }
    });

    // Calculate confidence scores and predict relationship types
    const results = potentialMatches.map(match => {
      // Calculate similarity score based on various factors
      let score = 0;
      let relationshipType = RelationshipType.DERIVATIVE;
      
      // Title similarity (up to 0.3)
      const titleWords = content.title.toLowerCase().split(/\W+/);
      const matchTitleWords = match.title.toLowerCase().split(/\W+/);
      const titleMatch = titleWords
        .filter(word => word.length > 3)
        .filter(word => matchTitleWords.includes(word)).length;
      
      score += Math.min(titleMatch / Math.max(titleWords.length, 1), 1) * 0.3;
      
      // Description similarity (up to 0.2)
      if (content.description && match.description) {
        const descWords = content.description.toLowerCase().split(/\W+/);
        const matchDescWords = match.description.toLowerCase().split(/\W+/);
        const descMatch = descWords
          .filter(word => word.length > 3)
          .filter(word => matchDescWords.includes(word)).length;
        
        score += Math.min(descMatch / Math.max(descWords.length, 1), 1) * 0.2;
      }
      
      // Time proximity (up to 0.2)
      const dateDiff = Math.abs(
        content.publishedAt.getTime() - match.publishedAt.getTime()
      );
      const daysDiff = dateDiff / (24 * 60 * 60 * 1000);
      score += Math.max(0, (7 - daysDiff) / 7) * 0.2;
      
      // Platform and content type heuristics (up to 0.3)
      
      // Common pattern: Long-form content is parent to shorter content
      if (
        (content.contentType === 'podcast' || content.contentType === 'video') &&
        (match.contentType === 'short_video' || match.contentType === 'photo')
      ) {
        relationshipType = RelationshipType.PARENT;
        score += 0.2;
      } 
      // Common pattern: Article is parent to social media posts
      else if (
        content.contentType === 'article' &&
        (match.contentType === 'post' || match.contentType === 'photo')
      ) {
        relationshipType = RelationshipType.PARENT;
        score += 0.2;
      }
      // Common pattern: YouTube content repurposed for social media
      else if (
        content.platform.platformType === 'youtube' &&
        (match.platform.platformType === 'instagram' || match.platform.platformType === 'tiktok')
      ) {
        relationshipType = RelationshipType.PARENT;
        score += 0.15;
      }
      // Common pattern: Earlier content is parent to later content
      else if (content.publishedAt < match.publishedAt) {
        const daysBetween = (match.publishedAt.getTime() - content.publishedAt.getTime()) / (24 * 60 * 60 * 1000);
        // If within 7 days, likely related
        if (daysBetween <= 7) {
          relationshipType = RelationshipType.PARENT;
          score += 0.1;
        }
      }
      // Common pattern: Later content may reference earlier content
      else if (content.publishedAt > match.publishedAt) {
        const daysBetween = (content.publishedAt.getTime() - match.publishedAt.getTime()) / (24 * 60 * 60 * 1000);
        // If within 7 days, might be a reaction
        if (daysBetween <= 7) {
          relationshipType = RelationshipType.REFERENCE;
          score += 0.05;
        }
      }
      
      return {
        targetId: match.id,
        confidence: Math.min(score, 0.99), // Cap at 0.99
        relationshipType
      };
    });
    
    // Filter by confidence threshold and sort by descending confidence
    return results
      .filter(result => result.confidence >= confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
    
  } catch (error) {
    logger.error({
      message: 'Failed to find potential relationships',
      error: error instanceof Error ? error.message : String(error),
      contentId
    });
    throw error;
  }
}

/**
 * Validates that creating a relationship won't introduce a cycle in the content graph
 * 
 * @param sourceId The source content ID
 * @param targetId The target content ID
 * @returns True if the relationship is valid (won't create a cycle), false otherwise
 */
export async function validateRelationshipCycle(sourceId: string, targetId: string): Promise<boolean> {
  try {
    // Simple case: can't create a relationship to itself
    if (sourceId === targetId) {
      return false;
    }

    // Check if target is already in the source's ancestry chain
    // This uses a recursive query to traverse the relationship graph upward
    const result = await prisma.$queryRaw`
      WITH RECURSIVE ancestry AS (
        -- Start with the target ID
        SELECT 
          id,
          source_content_id,
          target_content_id,
          ARRAY[id] as path,
          1 as depth
        FROM content_relationship
        WHERE target_content_id = ${targetId}
        
        UNION ALL
        
        -- Recursively find all ancestors
        SELECT
          cr.id,
          cr.source_content_id,
          cr.target_content_id,
          a.path || cr.id,
          a.depth + 1
        FROM content_relationship cr
        JOIN ancestry a ON cr.target_content_id = a.source_content_id
        WHERE NOT cr.id = ANY(a.path) -- Prevent existing cycles
        AND a.depth < 20 -- Limit recursion depth
      )
      SELECT EXISTS (
        SELECT 1 FROM ancestry WHERE source_content_id = ${sourceId}
      ) as cycle_exists;
    `;

    // If cycle_exists is true, a cycle would be created
    return !result[0].cycle_exists;
  } catch (error) {
    logger.error({
      message: 'Failed to validate relationship cycle',
      error: error instanceof Error ? error.message : String(error),
      sourceId,
      targetId
    });
    throw error;
  }
}

/**
 * Updates content hierarchy paths using LTREE after creating or updating a relationship
 * @param relationship The relationship that was created or updated
 */
async function updateContentHierarchyPaths(relationship: ContentRelationship): Promise<void> {
  try {
    const { sourceContentId, targetContentId } = relationship;
    
    // Update content_node entries to maintain the LTREE hierarchy
    // This is a simplified implementation that assumes the content_node table
    // has the necessary structure for LTREE operations
    
    // Get the content node for the source
    const sourceNode = await prisma.contentNode.findFirst({
      where: { contentId: sourceContentId }
    });
    
    if (!sourceNode) {
      logger.warn({
        message: 'Source content node not found for hierarchy update',
        sourceContentId,
        targetContentId,
        relationshipId: relationship.id
      });
      return;
    }
    
    // Update the target node's path to be under the source
    await prisma.$executeRaw`
      UPDATE content_node
      SET 
        path = ${sourceNode.path || sourceContentId.replace(/-/g, '_')} || '.' || replace(${targetContentId}::text, '-', '_'),
        depth = ${sourceNode.depth || 0} + 1,
        root_id = ${sourceNode.rootId || sourceContentId}
      WHERE content_id = ${targetContentId};
    `;
    
    // Update all descendants of the target
    await prisma.$executeRaw`
      UPDATE content_node
      SET 
        path = subpath(${sourceNode.path || sourceContentId.replace(/-/g, '_')}::ltree, 0) || '.' || 
              subpath(cn.path, 
                      nlevel(subpath(cn.path, 0, 1)::ltree), 
                      nlevel(cn.path)),
        root_id = ${sourceNode.rootId || sourceContentId}
      FROM content_node cn
      WHERE 
        content_node.path <@ cn.path
        AND cn.content_id = ${targetContentId}
        AND content_node.content_id != ${targetContentId};
    `;
    
  } catch (error) {
    logger.error({
      message: 'Failed to update content hierarchy paths',
      error: error instanceof Error ? error.message : String(error),
      sourceContentId: relationship.sourceContentId,
      targetContentId: relationship.targetContentId
    });
  }
}

/**
 * Updates content hierarchy paths after a relationship is deleted
 * @param sourceId The source content ID of the deleted relationship
 * @param targetId The target content ID of the deleted relationship
 */
async function updateHierarchyAfterDeletion(sourceId: string, targetId: string): Promise<void> {
  try {
    // Check if the target content still has other parent relationships
    const otherParentRelationship = await prisma.contentRelationship.findFirst({
      where: {
        targetContentId: targetId,
        sourceContentId: { not: sourceId }
      }
    });
    
    if (otherParentRelationship) {
      // If there's another parent, update paths to use that parent instead
      const otherParentNode = await prisma.contentNode.findFirst({
        where: { contentId: otherParentRelationship.sourceContentId }
      });
      
      if (otherParentNode) {
        const targetNode = await prisma.contentNode.findFirst({
          where: { contentId: targetId }
        });
        
        if (targetNode) {
          // Update the target node to use the other parent's path
          await prisma.$executeRaw`
            UPDATE content_node
            SET 
              path = ${otherParentNode.path || otherParentRelationship.sourceContentId.replace(/-/g, '_')} || '.' || 
                    replace(${targetId}::text, '-', '_'),
              depth = ${otherParentNode.depth || 0} + 1,
              root_id = ${otherParentNode.rootId || otherParentRelationship.sourceContentId}
            WHERE content_id = ${targetId};
          `;
          
          // Update all descendants
          await prisma.$executeRaw`
            UPDATE content_node
            SET 
              path = ${otherParentNode.path || otherParentRelationship.sourceContentId.replace(/-/g, '_')}::ltree || '.' || 
                    subpath(path, nlevel(${targetNode.path}::ltree)),
              root_id = ${otherParentNode.rootId || otherParentRelationship.sourceContentId}
            WHERE path <@ ${targetNode.path}::ltree
            AND content_id != ${targetId};
          `;
        }
      }
    } else {
      // If no other parents, make this target a root node
      const targetNode = await prisma.contentNode.findFirst({
        where: { contentId: targetId }
      });
      
      if (targetNode) {
        // Update the target node to be a root
        await prisma.$executeRaw`
          UPDATE content_node
          SET 
            path = replace(${targetId}::text, '-', '_')::ltree,
            depth = 0,
            root_id = ${targetId}
          WHERE content_id = ${targetId};
        `;
        
        // Update all descendants
        await prisma.$executeRaw`
          UPDATE content_node
          SET 
            path = replace(${targetId}::text, '-', '_')::ltree || '.' || 
                  subpath(path, nlevel(${targetNode.path}::ltree)),
            root_id = ${targetId}
          WHERE path <@ ${targetNode.path}::ltree
          AND content_id != ${targetId};
        `;
      }
    }
  } catch (error) {
    logger.error({
      message: 'Failed to update hierarchy after deletion',
      error: error instanceof Error ? error.message : String(error),
      sourceId,
      targetId
    });
  }
}