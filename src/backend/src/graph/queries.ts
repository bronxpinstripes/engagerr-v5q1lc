import { prisma, prismaRead } from '../config/database';
import { ContentTypes } from '../types/content';
import { PlatformTypes } from '../types/platform';
import { logger } from '../utils/logger';
import { DatabaseError } from '../utils/errors';

/**
 * Retrieves content nodes matching a specific LTREE path pattern
 * @param pathPattern LTREE path pattern to match
 * @param filters Additional filters to apply to the query
 * @returns Array of content nodes matching the path pattern
 */
async function queryContentNodesByPath(
  pathPattern: string,
  filters: ContentTypes.ContentFilter
): Promise<ContentTypes.ContentNode[]> {
  try {
    // Sanitize the path pattern to prevent SQL injection
    const sanitizedPattern = pathPattern.replace(/[^a-zA-Z0-9_.*]/g, '');
    
    // Build the base query for matching the path pattern
    const query: any = {
      where: {
        path: {
          equals: sanitizedPattern, // Use the LTREE path matching operator
        },
      },
      include: {
        content: true,
        metrics: true,
      },
    };
    
    // Apply additional filters
    if (filters) {
      if (filters.creatorId) {
        query.where.content = { ...query.where.content, creatorId: filters.creatorId };
      }
      
      if (filters.platformId) {
        query.where.content = { ...query.where.content, platformId: filters.platformId };
      }
      
      if (filters.contentType) {
        query.where.content = { ...query.where.content, contentType: filters.contentType };
      }
      
      if (filters.startDate) {
        query.where.content = { 
          ...query.where.content, 
          publishedAt: { 
            ...(query.where.content?.publishedAt || {}),
            gte: filters.startDate 
          } 
        };
      }
      
      if (filters.endDate) {
        query.where.content = { 
          ...query.where.content, 
          publishedAt: { 
            ...(query.where.content?.publishedAt || {}),
            lte: filters.endDate 
          } 
        };
      }
      
      if (filters.searchTerm) {
        query.where.content = { 
          ...query.where.content, 
          OR: [
            { title: { contains: filters.searchTerm, mode: 'insensitive' } },
            { description: { contains: filters.searchTerm, mode: 'insensitive' } }
          ]
        };
      }
      
      // Apply pagination
      if (filters.limit) {
        query.take = filters.limit;
      }
      
      if (filters.offset) {
        query.skip = filters.offset;
      }
    }
    
    // Execute the query using the read-optimized client
    const nodes = await prismaRead.contentNode.findMany(query);
    
    // Transform and return the results
    return nodes.map(node => ({
      id: node.id,
      contentId: node.contentId,
      path: node.path,
      depth: node.depth,
      rootId: node.rootId,
      content: node.content,
      metrics: node.metrics,
    }));
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      pathPattern,
      filters
    }, 'Error querying content nodes by path');
    
    throw new DatabaseError('Failed to query content nodes by path', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Retrieves all content nodes that are descendants of a specified ancestor node
 * @param ancestorId ID of the ancestor content node
 * @param filters Additional filters to apply to the query
 * @returns Array of descendant content nodes
 */
async function queryContentNodesByAncestor(
  ancestorId: string,
  filters: ContentTypes.ContentFilter
): Promise<ContentTypes.ContentNode[]> {
  try {
    // First, retrieve the path of the ancestor content node
    const ancestorNode = await prismaRead.contentNode.findUnique({
      where: { contentId: ancestorId },
      select: { path: true }
    });
    
    if (!ancestorNode) {
      throw new Error(`Ancestor node with ID ${ancestorId} not found`);
    }
    
    // Build query to find all nodes whose path starts with the ancestor's path
    // This uses the LTREE descendant operator <@
    const query: any = {
      where: {
        path: {
          startsWith: ancestorNode.path + '.', // Find all paths where ancestorNode.path is an ancestor
        },
      },
      include: {
        content: true,
        metrics: true,
      },
      orderBy: {
        depth: 'asc',
      },
    };
    
    // Apply additional filters
    if (filters) {
      if (filters.creatorId) {
        query.where.content = { ...query.where.content, creatorId: filters.creatorId };
      }
      
      if (filters.platformId) {
        query.where.content = { ...query.where.content, platformId: filters.platformId };
      }
      
      if (filters.contentType) {
        query.where.content = { ...query.where.content, contentType: filters.contentType };
      }
      
      // Apply date filters
      if (filters.startDate || filters.endDate) {
        query.where.content = { ...query.where.content, publishedAt: {} };
        
        if (filters.startDate) {
          query.where.content.publishedAt.gte = filters.startDate;
        }
        
        if (filters.endDate) {
          query.where.content.publishedAt.lte = filters.endDate;
        }
      }
      
      // Apply pagination
      if (filters.limit) {
        query.take = filters.limit;
      }
      
      if (filters.offset) {
        query.skip = filters.offset;
      }
    }
    
    // Execute the query
    const nodes = await prismaRead.contentNode.findMany(query);
    
    // Transform and return the results
    return nodes.map(node => ({
      id: node.id,
      contentId: node.contentId,
      path: node.path,
      depth: node.depth,
      rootId: node.rootId,
      content: node.content,
      metrics: node.metrics,
    }));
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      ancestorId,
      filters
    }, 'Error querying content nodes by ancestor');
    
    throw new DatabaseError('Failed to query content nodes by ancestor', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Retrieves all content nodes that are ancestors of a specified descendant node
 * @param descendantId ID of the descendant content node
 * @param filters Additional filters to apply to the query
 * @returns Array of ancestor content nodes
 */
async function queryContentNodesByDescendant(
  descendantId: string,
  filters: ContentTypes.ContentFilter
): Promise<ContentTypes.ContentNode[]> {
  try {
    // First, retrieve the path of the descendant content node
    const descendantNode = await prismaRead.contentNode.findUnique({
      where: { contentId: descendantId },
      select: { path: true }
    });
    
    if (!descendantNode) {
      throw new Error(`Descendant node with ID ${descendantId} not found`);
    }
    
    // We need to get all ancestors of this path
    // We'll split the path and create subpaths for each level
    const pathParts = descendantNode.path.split('.');
    const ancestorPaths = [];
    
    // Create all possible ancestor paths
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (i === 0) {
        currentPath = pathParts[i];
      } else {
        currentPath += '.' + pathParts[i];
      }
      ancestorPaths.push(currentPath);
    }
    
    // Build query to find all nodes whose paths match the ancestor paths
    const query: any = {
      where: {
        path: {
          in: ancestorPaths
        },
      },
      include: {
        content: true,
        metrics: true,
      },
      orderBy: {
        depth: 'asc',
      },
    };
    
    // Apply additional filters
    if (filters) {
      if (filters.creatorId) {
        query.where.content = { ...query.where.content, creatorId: filters.creatorId };
      }
      
      if (filters.platformId) {
        query.where.content = { ...query.where.content, platformId: filters.platformId };
      }
      
      if (filters.contentType) {
        query.where.content = { ...query.where.content, contentType: filters.contentType };
      }
      
      // Apply date filters
      if (filters.startDate || filters.endDate) {
        query.where.content = { ...query.where.content, publishedAt: {} };
        
        if (filters.startDate) {
          query.where.content.publishedAt.gte = filters.startDate;
        }
        
        if (filters.endDate) {
          query.where.content.publishedAt.lte = filters.endDate;
        }
      }
      
      // Apply pagination
      if (filters.limit) {
        query.take = filters.limit;
      }
      
      if (filters.offset) {
        query.skip = filters.offset;
      }
    }
    
    // Execute the query
    const nodes = await prismaRead.contentNode.findMany(query);
    
    // Transform and return the results
    return nodes.map(node => ({
      id: node.id,
      contentId: node.contentId,
      path: node.path,
      depth: node.depth,
      rootId: node.rootId,
      content: node.content,
      metrics: node.metrics,
    }));
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      descendantId,
      filters
    }, 'Error querying content nodes by descendant');
    
    throw new DatabaseError('Failed to query content nodes by descendant', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Retrieves a subgraph of the content family based on specified criteria
 * @param rootContentId ID of the root content node
 * @param filters Additional filters to apply to the query
 * @returns Subgraph with nodes and edges
 */
async function queryContentFamilySubgraph(
  rootContentId: string,
  filters: ContentTypes.ContentFilter
): Promise<{ nodes: ContentTypes.ContentNode[], edges: any[] }> {
  try {
    // First, retrieve the root content node
    const rootNode = await prismaRead.contentNode.findUnique({
      where: { contentId: rootContentId },
      include: {
        content: true,
        metrics: true,
      }
    });
    
    if (!rootNode) {
      throw new Error(`Root content node with ID ${rootContentId} not found`);
    }
    
    // Then retrieve all descendants using the root path
    // This gets the entire content family subgraph
    let query: any = {
      where: {
        OR: [
          { contentId: rootContentId }, // Include the root itself
          { path: { startsWith: rootNode.path + '.' } }, // And all its descendants
        ]
      },
      include: {
        content: true,
        metrics: true,
      },
      orderBy: {
        depth: 'asc',
      },
    };
    
    // Apply additional filters
    if (filters) {
      if (filters.platformId) {
        query.where.content = { ...query.where.content, platformId: filters.platformId };
      }
      
      if (filters.contentType) {
        query.where.content = { ...query.where.content, contentType: filters.contentType };
      }
      
      // Apply date filters
      if (filters.startDate || filters.endDate) {
        query.where.content = { ...query.where.content, publishedAt: {} };
        
        if (filters.startDate) {
          query.where.content.publishedAt.gte = filters.startDate;
        }
        
        if (filters.endDate) {
          query.where.content.publishedAt.lte = filters.endDate;
        }
      }
      
      // Search term filter
      if (filters.searchTerm) {
        query.where.content = { 
          ...query.where.content, 
          OR: [
            { title: { contains: filters.searchTerm, mode: 'insensitive' } },
            { description: { contains: filters.searchTerm, mode: 'insensitive' } }
          ]
        };
      }
    }
    
    // Execute the node query
    const nodes = await prismaRead.contentNode.findMany(query);
    
    // Transform nodes to the expected format
    const formattedNodes = nodes.map(node => ({
      id: node.id,
      contentId: node.contentId,
      path: node.path,
      depth: node.depth,
      rootId: node.rootId,
      content: node.content,
      metrics: node.metrics,
    }));
    
    // Now retrieve all edges (relationships) between these nodes
    // We need to get all content relationships where both source and target
    // are in our subgraph nodes
    const contentIds = nodes.map(node => node.contentId);
    
    const edges = await prismaRead.contentRelationship.findMany({
      where: {
        AND: [
          { sourceContentId: { in: contentIds } },
          { targetContentId: { in: contentIds } }
        ]
      }
    });
    
    return {
      nodes: formattedNodes,
      edges: edges
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      rootContentId,
      filters
    }, 'Error querying content family subgraph');
    
    throw new DatabaseError('Failed to query content family subgraph', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Finds content nodes that have no established relationships (orphaned nodes)
 * @param creatorId ID of the creator
 * @param filters Additional filters to apply to the query
 * @returns Array of orphaned content nodes
 */
async function queryContentNodesWithoutRelationships(
  creatorId: string,
  filters: ContentTypes.ContentFilter
): Promise<ContentTypes.ContentNode[]> {
  try {
    // For this complex query, we'll use a raw SQL approach
    // We'll find content that doesn't appear in any relationship
    let sqlQuery = `
      SELECT c.id
      FROM content c
      WHERE c.creator_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM content_relationship cr
        WHERE cr.source_content_id = c.id OR cr.target_content_id = c.id
      )
    `;
    
    const queryParams: any[] = [creatorId];
    let paramIndex = 2;
    
    // Apply filters
    if (filters?.platformId) {
      sqlQuery += ` AND c.platform_id = $${paramIndex}`;
      queryParams.push(filters.platformId);
      paramIndex++;
    }
    
    if (filters?.contentType) {
      sqlQuery += ` AND c.content_type = $${paramIndex}`;
      queryParams.push(filters.contentType);
      paramIndex++;
    }
    
    if (filters?.startDate) {
      sqlQuery += ` AND c.published_at >= $${paramIndex}`;
      queryParams.push(filters.startDate);
      paramIndex++;
    }
    
    if (filters?.endDate) {
      sqlQuery += ` AND c.published_at <= $${paramIndex}`;
      queryParams.push(filters.endDate);
      paramIndex++;
    }
    
    if (filters?.searchTerm) {
      sqlQuery += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
      queryParams.push(`%${filters.searchTerm}%`);
      paramIndex++;
    }
    
    // Add ordering
    sqlQuery += ` ORDER BY c.published_at DESC`;
    
    // Add pagination
    if (filters?.limit) {
      sqlQuery += ` LIMIT $${paramIndex}`;
      queryParams.push(filters.limit);
      paramIndex++;
    }
    
    if (filters?.offset) {
      sqlQuery += ` OFFSET $${paramIndex}`;
      queryParams.push(filters.offset);
      paramIndex++;
    }
    
    const orphanedContentIds = await prismaRead.$queryRaw<{ id: string }[]>`${sqlQuery}`;
    
    // If no orphaned content found, return empty array
    if (orphanedContentIds.length === 0) {
      return [];
    }
    
    const orphanedIds = orphanedContentIds.map(row => row.id);
    
    // Get the content items for these IDs
    const orphanedContent = await prismaRead.content.findMany({
      where: {
        id: {
          in: orphanedIds
        }
      },
      include: {
        metrics: true
      }
    });
    
    // Map them to a ContentNode-like structure
    return orphanedContent.map(content => ({
      id: `orphaned-${content.id}`, // Temporary ID for orphaned content
      contentId: content.id,
      path: '', // No path yet
      depth: -1, // Indicate it's not in the hierarchy
      rootId: '', // No root
      content: content,
      metrics: content.metrics || null
    }));
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      creatorId,
      filters
    }, 'Error querying content nodes without relationships');
    
    throw new DatabaseError('Failed to query content nodes without relationships', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Finds common ancestor nodes between multiple content items
 * @param contentIds Array of content IDs to find common ancestors for
 * @returns Array of common ancestor nodes
 */
async function queryCommonAncestors(
  contentIds: string[]
): Promise<ContentTypes.ContentNode[]> {
  try {
    if (!contentIds || contentIds.length < 2) {
      throw new Error('At least two content IDs are required to find common ancestors');
    }
    
    // First, get all paths for the specified content IDs
    const contentNodes = await prismaRead.contentNode.findMany({
      where: {
        contentId: {
          in: contentIds
        }
      },
      select: {
        contentId: true,
        path: true
      }
    });
    
    if (contentNodes.length !== contentIds.length) {
      throw new Error('Not all specified content IDs were found in the hierarchy');
    }
    
    // Extract the paths
    const paths = contentNodes.map(node => node.path);
    
    // Use PostgreSQL's LTREE functionality to find the longest common ancestor
    // The lca() function returns the longest common ancestor of paths
    const result = await prismaRead.$queryRaw<{ ancestor_path: string }[]>`
      SELECT lca(ARRAY[${paths.join(',')}]::ltree[]) as ancestor_path
    `;
    
    if (!result[0] || !result[0].ancestor_path) {
      // No common ancestor found
      return [];
    }
    
    // Get the longest common ancestor path
    const ancestorPath = result[0].ancestor_path;
    
    // Find all content nodes with this path or its ancestors
    // We'll use subpath to get all prefixes of the ancestor path
    const ancestorsPaths = [];
    const ancestorLabels = ancestorPath.split('.');
    
    // Build all possible ancestor paths from the LCA
    let currentPath = '';
    for (let i = 0; i < ancestorLabels.length; i++) {
      if (i === 0) {
        currentPath = ancestorLabels[i];
      } else {
        currentPath += '.' + ancestorLabels[i];
      }
      ancestorsPaths.push(currentPath);
    }
    
    // Query for all nodes with these paths
    const commonAncestors = await prismaRead.contentNode.findMany({
      where: {
        path: {
          in: ancestorsPaths
        }
      },
      include: {
        content: true,
        metrics: true
      },
      orderBy: {
        depth: 'asc'
      }
    });
    
    // Transform and return the results
    return commonAncestors.map(node => ({
      id: node.id,
      contentId: node.contentId,
      path: node.path,
      depth: node.depth,
      rootId: node.rootId,
      content: node.content,
      metrics: node.metrics,
    }));
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      contentIds
    }, 'Error querying common ancestors');
    
    throw new DatabaseError('Failed to query common ancestors', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Finds content nodes that exist in the content table but not in the hierarchy
 * @param creatorId ID of the creator
 * @returns Array of content nodes missing from the hierarchy
 */
async function queryOrphanedNodes(creatorId: string): Promise<ContentTypes.ContentNode[]> {
  try {
    // Find content items that don't have corresponding entries in content_node table
    const orphanedContentItems = await prismaRead.$queryRaw<any[]>`
      SELECT c.*
      FROM content c
      LEFT JOIN content_node cn ON c.id = cn.content_id
      WHERE c.creator_id = ${creatorId}
      AND cn.id IS NULL
      ORDER BY c.published_at DESC
    `;
    
    // Map the raw content items to a ContentNode-like structure
    return orphanedContentItems.map(item => ({
      id: null, // No node ID since these are orphaned
      contentId: item.id,
      path: null, // No path in the hierarchy
      depth: -1, // Indicating it's not in the hierarchy
      rootId: null, // No root
      content: {
        id: item.id,
        creatorId: item.creator_id,
        platformId: item.platform_id,
        externalId: item.external_id,
        title: item.title,
        description: item.description,
        contentType: item.content_type,
        publishedAt: item.published_at,
        url: item.url,
        thumbnail: item.thumbnail,
        views: item.views || 0,
        engagements: item.engagements || 0,
        engagementRate: item.engagement_rate || 0,
        shares: item.shares || 0,
        comments: item.comments || 0,
        estimatedValue: item.estimated_value || 0,
        metadata: item.metadata || {},
        platform: item.platform,
        isRoot: item.is_root,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      },
      metrics: null // No metrics available
    }));
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      creatorId
    }, 'Error querying orphaned nodes');
    
    throw new DatabaseError('Failed to query orphaned nodes', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Aggregates metrics across a content family to calculate total performance
 * @param rootContentId ID of the root content node
 * @returns Aggregated metrics for the content family
 */
async function queryContentMetricsAggregation(
  rootContentId: string
): Promise<ContentTypes.AggregateMetrics> {
  try {
    // First, retrieve the root content node
    const rootNode = await prismaRead.contentNode.findUnique({
      where: { contentId: rootContentId },
      include: {
        content: true,
        metrics: true,
      }
    });
    
    if (!rootNode) {
      throw new Error(`Root content node with ID ${rootContentId} not found`);
    }
    
    // Get all content in the family
    const familyQuery = {
      where: {
        OR: [
          { contentId: rootContentId }, // Include the root itself
          { path: { startsWith: rootNode.path + '.' } }, // And all its descendants
        ]
      },
      include: {
        content: {
          include: {
            platform: true // Include platform for platform-specific calculations
          }
        },
        metrics: true,
      }
    };
    
    const familyNodes = await prismaRead.contentNode.findMany(familyQuery);
    
    // Count unique platforms
    const platformIds = new Set<string>();
    for (const node of familyNodes) {
      if (node.content?.platformId) {
        platformIds.add(node.content.platformId);
      }
    }
    
    // Calculate aggregate metrics
    let totalViews = 0;
    let totalEngagements = 0;
    let totalShares = 0;
    let totalComments = 0;
    let totalWatchTime = 0;
    let totalValue = 0;
    
    for (const node of familyNodes) {
      // Use content metrics or fallback to content fields
      const metrics = node.metrics || {};
      const content = node.content || {};
      
      totalViews += metrics.views || content.views || 0;
      totalEngagements += metrics.engagements || content.engagements || 0;
      totalShares += metrics.shares || content.shares || 0;
      totalComments += metrics.comments || content.comments || 0;
      totalWatchTime += metrics.watchTime || 0;
      totalValue += metrics.estimatedValue || content.estimatedValue || 0;
    }
    
    // Calculate engagement rate across family
    const engagementRate = totalViews > 0 
      ? (totalEngagements / totalViews) * 100 
      : 0;
    
    // For unique reach, we need to account for audience overlap
    // This is a complex calculation that would ideally use actual data on audience overlap
    // For now, we'll use a simple overlap estimation formula
    // where we assume 30% overlap between content pieces on the same platform
    // and 15% overlap between different platforms
    
    // Group nodes by platform
    const nodesByPlatform: Record<string, any[]> = {};
    for (const node of familyNodes) {
      if (node.content?.platformId) {
        if (!nodesByPlatform[node.content.platformId]) {
          nodesByPlatform[node.content.platformId] = [];
        }
        nodesByPlatform[node.content.platformId].push(node);
      }
    }
    
    // Calculate platform-specific reach
    const platformReach: Record<string, number> = {};
    for (const [platformId, nodes] of Object.entries(nodesByPlatform)) {
      let platformViews = 0;
      for (const node of nodes) {
        platformViews += node.metrics?.views || node.content?.views || 0;
      }
      
      // Apply overlap estimation within platform
      const overlapFactor = Math.max(0, 1 - (0.3 * (nodes.length - 1)));
      platformReach[platformId] = platformViews * overlapFactor;
    }
    
    // Calculate total unique reach with cross-platform overlap
    let uniqueReachEstimate = 0;
    const platformReachValues = Object.values(platformReach);
    
    if (platformReachValues.length === 1) {
      uniqueReachEstimate = platformReachValues[0];
    } else if (platformReachValues.length > 1) {
      // Sort platforms by reach (largest first)
      platformReachValues.sort((a, b) => b - a);
      
      // Start with the largest platform reach
      uniqueReachEstimate = platformReachValues[0];
      
      // Add other platforms with cross-platform overlap adjustment
      for (let i = 1; i < platformReachValues.length; i++) {
        // Each additional platform contributes less to unique reach
        // due to increasing overlap probability
        const overlapFactor = Math.max(0, 1 - (0.15 * i));
        uniqueReachEstimate += platformReachValues[i] * overlapFactor;
      }
    }
    
    // Prepare and return aggregate metrics
    return {
      totalViews,
      totalEngagements,
      totalShares,
      totalComments,
      totalWatchTime,
      engagementRate,
      estimatedTotalValue: totalValue,
      uniqueReachEstimate: Math.round(uniqueReachEstimate),
      contentCount: familyNodes.length,
      platformCount: platformIds.size
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      rootContentId
    }, 'Error aggregating content metrics');
    
    throw new DatabaseError('Failed to aggregate content metrics', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Identifies distinct content family groups for a creator
 * @param creatorId ID of the creator
 * @returns Array of content family groups with counts
 */
async function queryContentFamilyGroups(
  creatorId: string
): Promise<{ rootContentId: string, contentCount: number }[]> {
  try {
    // Find all root nodes (depth = 0) for this creator
    const rootNodes = await prismaRead.contentNode.findMany({
      where: {
        depth: 0,
        content: {
          creatorId: creatorId
        }
      },
      select: {
        contentId: true,
        path: true
      }
    });
    
    // For each root node, count the number of descendants
    const familyGroups = [];
    
    for (const rootNode of rootNodes) {
      // Count all nodes with this path as prefix (including the root itself)
      const count = await prismaRead.contentNode.count({
        where: {
          OR: [
            { contentId: rootNode.contentId }, // The root itself
            { path: { startsWith: rootNode.path + '.' } } // All descendants
          ]
        }
      });
      
      familyGroups.push({
        rootContentId: rootNode.contentId,
        contentCount: count
      });
    }
    
    // Sort by content count (largest families first)
    return familyGroups.sort((a, b) => b.contentCount - a.contentCount);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      creatorId
    }, 'Error querying content family groups');
    
    throw new DatabaseError('Failed to query content family groups', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Calculates the distribution of content across different platforms within a content family
 * @param rootContentId ID of the root content node
 * @returns Platform distribution with counts
 */
async function queryPlatformDistribution(
  rootContentId: string
): Promise<Record<PlatformTypes.PlatformType, number>> {
  try {
    // First, retrieve the root content node
    const rootNode = await prismaRead.contentNode.findUnique({
      where: { contentId: rootContentId },
      select: { path: true }
    });
    
    if (!rootNode) {
      throw new Error(`Root content node with ID ${rootContentId} not found`);
    }
    
    // Get the platform distribution within the family tree
    // Using the <@ operator to find all nodes within this path
    const distributionQuery = await prismaRead.$queryRaw<{ platform_type: string, count: number }[]>`
      SELECT p.platform_type, COUNT(*) as count
      FROM content_node cn
      JOIN content c ON cn.content_id = c.id
      JOIN platform p ON c.platform_id = p.id
      WHERE cn.content_id = ${rootContentId}
         OR cn.path <@ ${rootNode.path}
      GROUP BY p.platform_type
    `;
    
    // Convert to the expected return format
    const distribution: Record<PlatformTypes.PlatformType, number> = {} as Record<PlatformTypes.PlatformType, number>;
    
    for (const row of distributionQuery) {
      distribution[row.platform_type as PlatformTypes.PlatformType] = Number(row.count);
    }
    
    return distribution;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      rootContentId
    }, 'Error querying platform distribution');
    
    throw new DatabaseError('Failed to query platform distribution', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Executes a raw LTREE query for advanced relationship analysis
 * @param query Raw SQL query string using LTREE operators
 * @param parameters Array of parameters for the query
 * @returns Raw query results
 */
async function executeRawLtreeQuery(
  query: string,
  parameters: any[]
): Promise<any[]> {
  try {
    // Validate that the query starts with SELECT to prevent unsafe operations
    const normalizedQuery = query.trim().toUpperCase();
    if (!normalizedQuery.startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed for security reasons');
    }
    
    // Log the query for debugging purposes
    logger.debug({
      query,
      parameters
    }, 'Executing raw LTREE query');
    
    // Execute the raw query
    const result = await prismaRead.$queryRaw(
      Prisma.sql([query, ...parameters])
    );
    
    return result;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      query,
      parameters
    }, 'Error executing raw LTREE query');
    
    throw new DatabaseError('Failed to execute raw LTREE query', { 
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

// Export all the query functions
export default {
  queryContentNodesByPath,
  queryContentNodesByAncestor,
  queryContentNodesByDescendant,
  queryContentFamilySubgraph,
  queryContentNodesWithoutRelationships,
  queryCommonAncestors,
  queryOrphanedNodes,
  queryContentMetricsAggregation,
  queryContentFamilyGroups,
  queryPlatformDistribution,
  executeRawLtreeQuery
};