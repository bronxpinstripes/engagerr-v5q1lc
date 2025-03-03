/**
 * Hierarchical content relationship management module.
 * 
 * Provides functionality for building and maintaining hierarchical content relationships
 * using PostgreSQL's LTREE extension. This module is a core component of Engagerr's content
 * relationship mapping feature, enabling the tracking of parent-child content relationships
 * across different platforms.
 * 
 * @module hierarchyBuilder
 */

import { ContentNode, ContentRelationship, Content } from '../types/content';
import { GraphError } from '../utils/errors';
import { logger } from '../utils/logger';
import { db } from '../config/database';

/**
 * Builds a hierarchical structure from flat content relationships.
 * 
 * @param relationships - Array of content relationships to build hierarchy from
 * @param rootContentId - Optional ID of content to use as the root
 * @returns Promise resolving to array of content nodes with hierarchical paths
 */
export async function buildHierarchy(
  relationships: ContentRelationship[],
  rootContentId?: string
): Promise<ContentNode[]> {
  logger.debug({
    relationshipCount: relationships.length,
    rootContentId
  }, 'Building content hierarchy');
  
  if (!relationships || relationships.length === 0) {
    return [];
  }
  
  try {
    // Build adjacency list from relationships
    const adjacencyList: Record<string, string[]> = {};
    const contentMap: Set<string> = new Set();
    
    // Create entries for both source and target content IDs
    relationships.forEach(rel => {
      contentMap.add(rel.sourceContentId);
      contentMap.add(rel.targetContentId);
      
      // Add as child to parent
      if (!adjacencyList[rel.sourceContentId]) {
        adjacencyList[rel.sourceContentId] = [];
      }
      
      // Ensure we don't create duplicate relationships
      if (!adjacencyList[rel.sourceContentId].includes(rel.targetContentId)) {
        adjacencyList[rel.sourceContentId].push(rel.targetContentId);
      }
      
      // Ensure target has an entry even if it has no children
      if (!adjacencyList[rel.targetContentId]) {
        adjacencyList[rel.targetContentId] = [];
      }
    });
    
    // Find potential root nodes (nodes with no parents)
    let rootContentIds: string[] = [];
    
    if (rootContentId && contentMap.has(rootContentId)) {
      // Use the specified root if provided and valid
      rootContentIds = [rootContentId];
    } else {
      // Find nodes that only appear as sources and never as targets
      const allTargets = new Set(relationships.map(rel => rel.targetContentId));
      rootContentIds = Array.from(contentMap).filter(id => !allTargets.has(id));
      
      // If no clear root is found, use the first content ID
      if (rootContentIds.length === 0 && contentMap.size > 0) {
        rootContentIds = [Array.from(contentMap)[0]];
        logger.warn({
          selectedRoot: rootContentIds[0]
        }, 'No clear root found, using first content item as root');
      }
    }
    
    // Fetch content items for all IDs in the map
    const contentIds = Array.from(contentMap);
    const contentItems = await fetchContentItems(contentIds);
    
    if (!contentItems || contentItems.length === 0) {
      throw new GraphError('Failed to fetch content items for hierarchy building');
    }
    
    // Create a map of content items by ID for easy lookup
    const contentItemsMap: Record<string, Content> = {};
    contentItems.forEach(item => {
      contentItemsMap[item.id] = item;
    });
    
    // Build the hierarchy starting from the root(s)
    const nodes: ContentNode[] = [];
    
    for (const rootId of rootContentIds) {
      // Generate path for root node
      const rootContent = contentItemsMap[rootId];
      if (!rootContent) {
        logger.warn({ rootId }, 'Root content not found in content items');
        continue;
      }
      
      const rootPath = generatePath(rootContent, null);
      
      // Create root node
      const rootNode: ContentNode = {
        id: generateNodeId(),
        contentId: rootId,
        path: rootPath,
        depth: 0,
        rootId: rootId
      };
      
      nodes.push(rootNode);
      
      // Build tree recursively
      await buildSubtree(rootId, rootNode.path, rootId, 0, adjacencyList, contentItemsMap, nodes);
    }
    
    logger.info({
      nodeCount: nodes.length,
      rootCount: rootContentIds.length
    }, 'Content hierarchy built successfully');
    
    return nodes;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      relationshipCount: relationships.length
    }, 'Failed to build content hierarchy');
    
    throw new GraphError(
      `Failed to build content hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Creates a new content node in the hierarchy.
 * 
 * @param contentId - ID of the content item
 * @param parentId - ID of the parent content item (null if root)
 * @param relationshipType - Type of relationship to parent
 * @returns Promise resolving to the newly created content node
 */
export async function createContentNode(
  contentId: string,
  parentId: string | null,
  relationshipType: string
): Promise<ContentNode> {
  logger.debug({
    contentId,
    parentId,
    relationshipType
  }, 'Creating content node in hierarchy');
  
  try {
    // Check if content already exists in the hierarchy
    const existingNodeQuery = `
      SELECT * FROM content_nodes 
      WHERE content_id = $1 
      LIMIT 1
    `;
    
    const existingNode = await db.query(existingNodeQuery, [contentId]);
    
    if (existingNode.rows.length > 0) {
      throw new GraphError(`Content node with id ${contentId} already exists in hierarchy`);
    }
    
    // Fetch the content item
    const contentQuery = `
      SELECT * FROM contents
      WHERE id = $1
      LIMIT 1
    `;
    
    const contentResult = await db.query(contentQuery, [contentId]);
    
    if (contentResult.rows.length === 0) {
      throw new GraphError(`Content with id ${contentId} not found`);
    }
    
    const content = contentResult.rows[0] as Content;
    
    let path: string;
    let rootId: string = contentId; // Default to self as root
    let depth = 0;
    
    // If has parent, fetch parent node and build path based on parent
    if (parentId) {
      const parentNodeQuery = `
        SELECT * FROM content_nodes
        WHERE content_id = $1
        LIMIT 1
      `;
      
      const parentResult = await db.query(parentNodeQuery, [parentId]);
      
      if (parentResult.rows.length === 0) {
        throw new GraphError(`Parent node with id ${parentId} not found in hierarchy`);
      }
      
      const parentNode = parentResult.rows[0] as ContentNode;
      path = generatePath(content, parentNode.path);
      rootId = parentNode.rootId;
      depth = parentNode.depth + 1;
    } else {
      // This is a root node
      path = generatePath(content, null);
    }
    
    // Create the node
    const createNodeQuery = `
      INSERT INTO content_nodes (content_id, path, depth, root_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const nodeResult = await db.query(createNodeQuery, [
      contentId,
      path,
      depth,
      rootId
    ]);
    
    if (nodeResult.rows.length === 0) {
      throw new GraphError('Failed to create content node');
    }
    
    const newNode = nodeResult.rows[0] as ContentNode;
    
    logger.info({
      nodeId: newNode.id,
      contentId: newNode.contentId,
      path: newNode.path,
      depth: newNode.depth,
      rootId: newNode.rootId
    }, 'Content node created successfully');
    
    return newNode;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      contentId,
      parentId
    }, 'Failed to create content node');
    
    throw new GraphError(
      `Failed to create content node: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Updates the path of a content node and all its descendants when its position
 * in the hierarchy changes.
 * 
 * @param contentId - ID of the content node to update
 * @param newParentId - ID of the new parent content node
 * @returns Promise resolving to the updated content node
 */
export async function updateContentPath(
  contentId: string,
  newParentId: string
): Promise<ContentNode> {
  logger.debug({
    contentId,
    newParentId
  }, 'Updating content node path');
  
  // Start a transaction since we'll be updating multiple nodes
  const client = await db.transaction();
  
  try {
    // Fetch current node
    const nodeQuery = `
      SELECT * FROM content_nodes
      WHERE content_id = $1
      LIMIT 1
    `;
    
    const nodeResult = await client.query(nodeQuery, [contentId]);
    
    if (nodeResult.rows.length === 0) {
      throw new GraphError(`Content node with id ${contentId} not found in hierarchy`);
    }
    
    const currentNode = nodeResult.rows[0] as ContentNode;
    const oldPath = currentNode.path;
    
    // Fetch descendants before updating the node
    const descendantsQuery = `
      SELECT * FROM content_nodes
      WHERE path <@ $1 AND content_id != $2
      ORDER BY depth ASC
    `;
    
    const descendantsResult = await client.query(descendantsQuery, [oldPath, contentId]);
    const descendants = descendantsResult.rows as ContentNode[];
    
    // Fetch new parent node
    const parentQuery = `
      SELECT * FROM content_nodes
      WHERE content_id = $1
      LIMIT 1
    `;
    
    const parentResult = await client.query(parentQuery, [newParentId]);
    
    if (parentResult.rows.length === 0) {
      throw new GraphError(`New parent node with id ${newParentId} not found in hierarchy`);
    }
    
    const parentNode = parentResult.rows[0] as ContentNode;
    
    // Check if the new parent is a descendant of the current node (would create a cycle)
    if (parentNode.path.startsWith(oldPath)) {
      throw new GraphError('Cannot move a node to one of its own descendants');
    }
    
    // Fetch content item to generate new path
    const contentQuery = `
      SELECT * FROM contents
      WHERE id = $1
      LIMIT 1
    `;
    
    const contentResult = await client.query(contentQuery, [contentId]);
    
    if (contentResult.rows.length === 0) {
      throw new GraphError(`Content with id ${contentId} not found`);
    }
    
    const content = contentResult.rows[0] as Content;
    
    // Generate new path
    const newPath = generatePath(content, parentNode.path);
    const newDepth = parentNode.depth + 1;
    const newRootId = parentNode.rootId;
    
    // Update the current node
    const updateNodeQuery = `
      UPDATE content_nodes
      SET path = $1, depth = $2, root_id = $3
      WHERE content_id = $4
      RETURNING *
    `;
    
    const updateResult = await client.query(updateNodeQuery, [
      newPath,
      newDepth,
      newRootId,
      contentId
    ]);
    
    if (updateResult.rows.length === 0) {
      throw new GraphError(`Failed to update content node with id ${contentId}`);
    }
    
    const updatedNode = updateResult.rows[0] as ContentNode;
    
    // Update all descendants if any exist
    if (descendants.length > 0) {
      logger.debug({
        contentId,
        descendantCount: descendants.length
      }, 'Updating descendant paths');
      
      for (const descendant of descendants) {
        // Replace old path prefix with new path
        const descendantRelativePath = descendant.path.substring(oldPath.length);
        const newDescendantPath = newPath + descendantRelativePath;
        const newDescendantDepth = descendant.depth - currentNode.depth + newDepth;
        
        const updateDescendantQuery = `
          UPDATE content_nodes
          SET path = $1, depth = $2, root_id = $3
          WHERE content_id = $4
        `;
        
        await client.query(updateDescendantQuery, [
          newDescendantPath,
          newDescendantDepth,
          newRootId,
          descendant.contentId
        ]);
      }
    }
    
    // Commit the transaction
    await client.commit();
    
    logger.info({
      nodeId: updatedNode.id,
      contentId: updatedNode.contentId,
      oldPath,
      newPath: updatedNode.path,
      descendantsUpdated: descendants.length
    }, 'Content node path updated successfully');
    
    return updatedNode;
  } catch (error) {
    // Rollback transaction on error
    await client.rollback();
    
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      contentId,
      newParentId
    }, 'Failed to update content node path');
    
    throw new GraphError(
      `Failed to update content node path: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Removes a content node from the hierarchy, with options to preserve or remove descendants.
 * 
 * @param contentId - ID of the content node to remove
 * @param preserveDescendants - If true, reassign descendants to the parent of the removed node
 * @returns Promise resolving to true if removal was successful
 */
export async function removeFromHierarchy(
  contentId: string,
  preserveDescendants: boolean = false
): Promise<boolean> {
  logger.debug({
    contentId,
    preserveDescendants
  }, 'Removing content node from hierarchy');
  
  // Start a transaction since we'll be updating multiple nodes
  const client = await db.transaction();
  
  try {
    // Fetch current node
    const nodeQuery = `
      SELECT n.*, p.path as parent_path, p.content_id as parent_id
      FROM content_nodes n
      LEFT JOIN content_nodes p ON subpath(n.path, 0, nlevel(n.path) - 1) = p.path
      WHERE n.content_id = $1
      LIMIT 1
    `;
    
    const nodeResult = await client.query(nodeQuery, [contentId]);
    
    if (nodeResult.rows.length === 0) {
      throw new GraphError(`Content node with id ${contentId} not found in hierarchy`);
    }
    
    const node = nodeResult.rows[0];
    const nodePath = node.path;
    const parentPath = node.parent_path;
    const parentId = node.parent_id;
    
    // Fetch descendants if we need to preserve them
    if (preserveDescendants) {
      // Fetch all immediate children of the node to be removed
      const childrenQuery = `
        SELECT * FROM content_nodes
        WHERE path ~ $1::lquery
        ORDER BY depth ASC
      `;
      
      // Create lquery pattern to match immediate children
      const childPattern = `${nodePath}.*{1}`;
      const childrenResult = await client.query(childrenQuery, [childPattern]);
      const children = childrenResult.rows;
      
      if (children.length > 0) {
        logger.debug({
          contentId,
          childCount: children.length
        }, 'Reassigning children to grandparent');
        
        // Process each child and its descendants
        for (const child of children) {
          // Create new path by replacing the node's path with the parent's
          let newChildPath;
          
          if (parentPath) {
            // If there's a parent, use its path as the new prefix
            newChildPath = child.path.replace(new RegExp(`^${nodePath}\\.`), `${parentPath}.`);
          } else {
            // If no parent (removing a root), the child becomes a root
            newChildPath = child.path.replace(new RegExp(`^${nodePath}\\.`), '');
          }
          
          // Update child node and all its descendants
          const updateChildQuery = `
            UPDATE content_nodes
            SET path = $1,
                depth = depth - 1,
                root_id = $2
            WHERE path <@ $3
          `;
          
          await client.query(updateChildQuery, [
            newChildPath,
            parentId || child.content_id, // If no parent, child becomes its own root
            child.path
          ]);
        }
      }
    } else {
      // If not preserving descendants, delete all descendants
      const deleteDescendantsQuery = `
        DELETE FROM content_nodes
        WHERE path <@ $1 AND content_id != $2
      `;
      
      const deleteResult = await client.query(deleteDescendantsQuery, [nodePath, contentId]);
      logger.debug({
        contentId,
        descendantsRemoved: deleteResult.rowCount
      }, 'Removed node descendants');
    }
    
    // Delete the node itself
    const deleteNodeQuery = `
      DELETE FROM content_nodes
      WHERE content_id = $1
    `;
    
    await client.query(deleteNodeQuery, [contentId]);
    
    // Commit the transaction
    await client.commit();
    
    logger.info({
      contentId,
      preserveDescendants
    }, 'Content node removed from hierarchy successfully');
    
    return true;
  } catch (error) {
    // Rollback transaction on error
    await client.rollback();
    
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      contentId,
      preserveDescendants
    }, 'Failed to remove content node from hierarchy');
    
    throw new GraphError(
      `Failed to remove content node: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Retrieves the entire family tree for a given content root.
 * 
 * @param rootContentId - ID of the root content node
 * @returns Promise resolving to array of nodes in the family tree
 */
export async function getContentFamily(rootContentId: string): Promise<ContentNode[]> {
  logger.debug({
    rootContentId
  }, 'Retrieving content family tree');
  
  try {
    // First verify the root exists
    const rootQuery = `
      SELECT * FROM content_nodes
      WHERE content_id = $1
      LIMIT 1
    `;
    
    const rootResult = await db.query(rootQuery, [rootContentId]);
    
    if (rootResult.rows.length === 0) {
      throw new GraphError(`Root content node with id ${rootContentId} not found in hierarchy`);
    }
    
    const rootNode = rootResult.rows[0] as ContentNode;
    
    // Query for all nodes in the family tree
    const familyQuery = `
      SELECT n.*, c.title, c.description, c.content_type, c.platform_id, 
             c.published_at, c.url, c.thumbnail, c.views, c.engagements
      FROM content_nodes n
      JOIN contents c ON n.content_id = c.id
      WHERE n.path <@ $1
      ORDER BY n.depth ASC, n.path
    `;
    
    const familyResult = await db.query(familyQuery, [rootNode.path]);
    const familyNodes = familyResult.rows;
    
    logger.info({
      rootContentId,
      familySize: familyNodes.length
    }, 'Content family tree retrieved successfully');
    
    return familyNodes.map(node => ({
      id: node.id,
      contentId: node.content_id,
      path: node.path,
      depth: node.depth,
      rootId: node.root_id,
      // Include basic content data for convenience
      content: {
        id: node.content_id,
        title: node.title,
        description: node.description,
        contentType: node.content_type,
        platformId: node.platform_id,
        publishedAt: node.published_at,
        url: node.url,
        thumbnail: node.thumbnail,
        views: node.views,
        engagements: node.engagements
      }
    }));
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      rootContentId
    }, 'Failed to retrieve content family tree');
    
    throw new GraphError(
      `Failed to retrieve content family: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Finds the lowest common ancestor for multiple content nodes.
 * 
 * @param contentIds - Array of content IDs to find common ancestor for
 * @returns Promise resolving to the common ancestor node or null if none exists
 */
export async function findCommonAncestor(contentIds: string[]): Promise<ContentNode | null> {
  if (!contentIds || contentIds.length === 0) {
    return null;
  }
  
  if (contentIds.length === 1) {
    // A single node is its own common ancestor
    try {
      const nodeQuery = `
        SELECT * FROM content_nodes
        WHERE content_id = $1
        LIMIT 1
      `;
      
      const nodeResult = await db.query(nodeQuery, [contentIds[0]]);
      
      if (nodeResult.rows.length === 0) {
        return null;
      }
      
      return nodeResult.rows[0] as ContentNode;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        contentId: contentIds[0]
      }, 'Failed to retrieve single node');
      
      return null;
    }
  }
  
  logger.debug({
    contentIds,
    count: contentIds.length
  }, 'Finding common ancestor for content nodes');
  
  try {
    // Fetch all nodes
    const nodesQuery = `
      SELECT * FROM content_nodes
      WHERE content_id = ANY($1)
    `;
    
    const nodesResult = await db.query(nodesQuery, [contentIds]);
    const nodes = nodesResult.rows;
    
    if (nodes.length !== contentIds.length) {
      logger.warn({
        requestedCount: contentIds.length,
        foundCount: nodes.length
      }, 'Not all requested nodes were found in hierarchy');
      
      // If we couldn't find all nodes, work with what we have
      if (nodes.length === 0) {
        return null;
      }
    }
    
    // Extract paths
    const paths = nodes.map(node => node.path);
    
    // Find the longest common prefix (LCP) of all paths
    let lcp = getLongestCommonPrefix(paths);
    
    if (!lcp) {
      logger.info({
        contentIds
      }, 'No common ancestor found for nodes');
      return null;
    }
    
    // Find the node with this path
    const ancestorQuery = `
      SELECT * FROM content_nodes
      WHERE path = $1
      LIMIT 1
    `;
    
    const ancestorResult = await db.query(ancestorQuery, [lcp]);
    
    if (ancestorResult.rows.length === 0) {
      logger.warn({
        lcp,
        contentIds
      }, 'Common ancestor path exists but node not found');
      return null;
    }
    
    const ancestor = ancestorResult.rows[0] as ContentNode;
    
    logger.info({
      contentIds,
      ancestorContentId: ancestor.contentId,
      ancestorPath: ancestor.path
    }, 'Common ancestor found for content nodes');
    
    return ancestor;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      contentIds
    }, 'Failed to find common ancestor');
    
    throw new GraphError(
      `Failed to find common ancestor: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generates an LTREE compatible path for a content node.
 * 
 * @param content - Content item to generate path for
 * @param parentPath - Optional parent path to append to
 * @returns LTREE compatible path string
 */
export function generatePath(content: Content, parentPath: string | null): string {
  // Extract platform type prefix from platform ID (assumes format: platform_type_xyz)
  const platformParts = content.platformId.split('_');
  const platformPrefix = platformParts.length > 0 ? platformParts[0] : 'unk';
  
  // Sanitize content ID for LTREE compatibility
  // LTREE requires labels to be alphanumeric plus underscores, no starting/ending underscores
  const sanitizedId = content.id
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/^_+/, '') // Remove leading underscores
    .replace(/_+$/, '') // Remove trailing underscores
    .replace(/_+/g, '_'); // Collapse multiple underscores
  
  // Combine platform prefix with sanitized ID
  const nodeLabel = `${platformPrefix}_${sanitizedId}`;
  
  // If parent path is provided, append to it
  if (parentPath) {
    return `${parentPath}.${nodeLabel}`;
  }
  
  // Otherwise, use just the node label as the path
  return nodeLabel;
}

/**
 * Validates that a path string is compatible with LTREE format.
 * 
 * @param path - Path string to validate
 * @returns Whether the path is valid
 */
export function validatePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  // LTREE paths must follow these rules:
  // 1. Labels separated by periods
  // 2. Labels contain only alphanumeric chars and underscores
  // 3. Labels don't start or end with underscores
  // 4. No empty labels (no consecutive periods)
  
  // Check for consecutive periods (empty labels)
  if (path.includes('..')) {
    return false;
  }
  
  // Split into labels and check each one
  const labels = path.split('.');
  
  for (const label of labels) {
    // Check for empty label
    if (label.length === 0) {
      return false;
    }
    
    // Check for invalid characters
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(label)) {
      return false;
    }
  }
  
  return true;
}

// ========== Helper Functions ==========

/**
 * Helper function to recursively build a subtree for the hierarchy.
 */
async function buildSubtree(
  contentId: string,
  parentPath: string,
  rootId: string,
  depth: number,
  adjacencyList: Record<string, string[]>,
  contentMap: Record<string, Content>,
  nodes: ContentNode[]
): Promise<void> {
  // Get children of this node
  const children = adjacencyList[contentId] || [];
  
  // Process each child
  for (const childId of children) {
    const childContent = contentMap[childId];
    
    if (!childContent) {
      logger.warn({ childId, parentId: contentId }, 'Child content not found in content map');
      continue;
    }
    
    // Generate path for the child
    const childPath = generatePath(childContent, parentPath);
    
    // Create child node
    const childNode: ContentNode = {
      id: generateNodeId(),
      contentId: childId,
      path: childPath,
      depth: depth + 1,
      rootId
    };
    
    nodes.push(childNode);
    
    // Recursively process this child's children
    await buildSubtree(
      childId,
      childPath,
      rootId,
      depth + 1,
      adjacencyList,
      contentMap,
      nodes
    );
  }
}

/**
 * Helper function to fetch content items by ID.
 */
async function fetchContentItems(contentIds: string[]): Promise<Content[]> {
  if (!contentIds || contentIds.length === 0) {
    return [];
  }
  
  try {
    const query = `
      SELECT * FROM contents
      WHERE id = ANY($1)
    `;
    
    const result = await db.query(query, [contentIds]);
    return result.rows as Content[];
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      contentIds
    }, 'Failed to fetch content items');
    
    throw new GraphError('Failed to fetch content items');
  }
}

/**
 * Helper function to generate a unique node ID.
 */
function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function to find the longest common prefix of an array of paths.
 */
function getLongestCommonPrefix(paths: string[]): string | null {
  if (!paths || paths.length === 0) {
    return null;
  }
  
  if (paths.length === 1) {
    return paths[0];
  }
  
  // Split all paths into labels
  const splitPaths = paths.map(path => path.split('.'));
  
  // Find minimum length of all paths
  const minLength = Math.min(...splitPaths.map(p => p.length));
  
  // Find the LCP
  let commonPrefix: string[] = [];
  
  for (let i = 0; i < minLength; i++) {
    const currentLabel = splitPaths[0][i];
    
    // Check if this label matches in all paths
    if (splitPaths.every(path => path[i] === currentLabel)) {
      commonPrefix.push(currentLabel);
    } else {
      break;
    }
  }
  
  if (commonPrefix.length === 0) {
    return null;
  }
  
  return commonPrefix.join('.');
}