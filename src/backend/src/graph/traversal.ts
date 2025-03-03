/**
 * Advanced graph traversal algorithms for navigating content relationship structures
 * 
 * This module provides specialized functions for exploring hierarchical content relationships,
 * finding paths between content nodes, detecting cycles, and analyzing graph properties
 * across the content relationship network. These algorithms support Engagerr's core
 * content relationship mapping feature.
 */

import { prisma } from '../config/database';
import { ContentTypes } from '../types/content';
import { hierarchyBuilder } from './hierarchyBuilder';
import { contentGraphQueries } from './queries';
import { contentRelationshipModel } from '../models/contentRelationship';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';

/**
 * Traverses the content hierarchy along a specific path pattern and returns nodes in the path
 * 
 * @param startNodeId - ID of the starting content node
 * @param pathPattern - LTREE compatible path pattern to traverse (e.g., "*.youtube.*")
 * @param filters - Optional filters to apply to the results
 * @returns Array of content nodes along the traversed path
 */
async function traverseContentPath(
  startNodeId: string,
  pathPattern: string,
  filters?: ContentTypes.ContentFilter
): Promise<ContentTypes.ContentNode[]> {
  try {
    logger.debug({
      startNodeId,
      pathPattern,
      filters
    }, 'Traversing content path');

    // First, check if the start node exists
    const startNode = await prisma.contentNode.findUnique({
      where: { contentId: startNodeId },
      select: { path: true }
    });

    if (!startNode) {
      throw new NotFoundError(`Start node with ID ${startNodeId} not found`, 'ContentNode', startNodeId);
    }

    // Combine start node path with the provided pattern
    // If pattern starts with *, append to start node path
    // Otherwise, use pattern as is (absolute path)
    const fullPattern = pathPattern.startsWith('*') 
      ? `${startNode.path}.${pathPattern}`
      : pathPattern;

    // Use the contentGraphQueries module to execute the path query
    const nodes = await contentGraphQueries.queryContentNodesByPath(fullPattern, filters || {});

    logger.debug({
      startNodeId,
      pathPattern,
      nodesFound: nodes.length
    }, 'Content path traversal completed');

    return nodes;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      startNodeId,
      pathPattern
    }, 'Failed to traverse content path');

    throw error;
  }
}

/**
 * Finds all possible paths between two content nodes in the graph
 * 
 * @param startNodeId - ID of the starting content node
 * @param endNodeId - ID of the ending content node
 * @param maxDepth - Maximum path length to consider
 * @returns Array of possible paths, each an array of content nodes
 */
async function findPathBetweenNodes(
  startNodeId: string,
  endNodeId: string,
  maxDepth: number = 10
): Promise<ContentTypes.ContentNode[][]> {
  try {
    logger.debug({
      startNodeId,
      endNodeId,
      maxDepth
    }, 'Finding paths between content nodes');

    // Validate that both nodes exist
    const [startNode, endNode] = await Promise.all([
      prisma.contentNode.findUnique({
        where: { contentId: startNodeId },
        include: { content: true }
      }),
      prisma.contentNode.findUnique({
        where: { contentId: endNodeId },
        include: { content: true }
      })
    ]);

    if (!startNode) {
      throw new NotFoundError(`Start node with ID ${startNodeId} not found`, 'ContentNode', startNodeId);
    }

    if (!endNode) {
      throw new NotFoundError(`End node with ID ${endNodeId} not found`, 'ContentNode', endNodeId);
    }

    // Check for direct connection first (optimization)
    const directRelationship = await prisma.contentRelationship.findFirst({
      where: {
        OR: [
          { sourceContentId: startNodeId, targetContentId: endNodeId },
          { sourceContentId: endNodeId, targetContentId: startNodeId }
        ]
      }
    });

    if (directRelationship) {
      // Direct path exists
      return [[startNode, endNode]];
    }

    // Implement breadth-first search to find all paths
    const paths: ContentTypes.ContentNode[][] = [];
    const visited = new Set<string>();
    
    // Queue of partial paths for BFS
    const queue: { path: ContentTypes.ContentNode[], lastNodeId: string }[] = [
      { path: [startNode], lastNodeId: startNodeId }
    ];
    
    while (queue.length > 0) {
      const { path, lastNodeId } = queue.shift()!;
      
      // Skip if we've exceeded max depth
      if (path.length > maxDepth) {
        continue;
      }
      
      // Get all connected nodes (both outgoing and incoming relationships)
      const relationships = await prisma.contentRelationship.findMany({
        where: {
          OR: [
            { sourceContentId: lastNodeId },
            { targetContentId: lastNodeId }
          ]
        }
      });
      
      for (const rel of relationships) {
        // Determine the connected node ID
        const connectedNodeId = rel.sourceContentId === lastNodeId 
          ? rel.targetContentId 
          : rel.sourceContentId;
        
        // Skip if we've already visited this node in this path (avoid cycles)
        if (path.some(node => node.contentId === connectedNodeId)) {
          continue;
        }
        
        // Get the connected node
        const connectedNode = await prisma.contentNode.findUnique({
          where: { contentId: connectedNodeId },
          include: { content: true }
        });
        
        if (!connectedNode) {
          continue;
        }
        
        // Create new path with this node
        const newPath = [...path, connectedNode];
        
        // If we reached the end node, add to paths
        if (connectedNodeId === endNodeId) {
          paths.push(newPath);
          continue;
        }
        
        // Otherwise, add to queue for further exploration
        queue.push({
          path: newPath,
          lastNodeId: connectedNodeId
        });
      }
    }
    
    logger.debug({
      startNodeId,
      endNodeId,
      pathsFound: paths.length
    }, 'Paths found between content nodes');
    
    return paths;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      startNodeId,
      endNodeId
    }, 'Failed to find paths between nodes');

    throw error;
  }
}

/**
 * Detects cycles in the content relationship graph starting from a specific node
 * 
 * @param startNodeId - ID of the starting content node
 * @returns Object indicating whether cycles exist and which nodes form the cycles
 */
async function detectCycles(
  startNodeId: string
): Promise<{ hasCycles: boolean, cycleNodes: string[] }> {
  try {
    logger.debug({
      startNodeId
    }, 'Detecting cycles in content relationship graph');

    // First get the content family to work with
    const { nodes, edges } = await contentRelationshipModel.getContentFamily(startNodeId);
    
    if (nodes.length === 0) {
      throw new NotFoundError(`Content family not found for ${startNodeId}`, 'ContentNode', startNodeId);
    }
    
    // Build adjacency list from edges
    const adjacencyList: Record<string, string[]> = {};
    for (const node of nodes) {
      adjacencyList[node.id] = [];
    }
    
    for (const edge of edges) {
      if (!adjacencyList[edge.source]) {
        adjacencyList[edge.source] = [];
      }
      adjacencyList[edge.source].push(edge.target);
    }
    
    // Detect cycles using DFS
    const cycleNodes: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    function dfs(nodeId: string): boolean {
      // Mark current node as visited and add to recursion stack
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      // Visit all adjacent nodes
      for (const adjacentId of adjacencyList[nodeId] || []) {
        // If not visited, recurse
        if (!visited.has(adjacentId)) {
          if (dfs(adjacentId)) {
            cycleNodes.push(adjacentId);
            return true;
          }
        } 
        // If in recursion stack, cycle detected
        else if (recursionStack.has(adjacentId)) {
          cycleNodes.push(adjacentId);
          return true;
        }
      }
      
      // Remove from recursion stack
      recursionStack.delete(nodeId);
      return false;
    }
    
    // Start DFS from the start node
    const hasCycles = dfs(startNodeId);
    
    logger.debug({
      startNodeId,
      hasCycles,
      cycleNodesCount: cycleNodes.length
    }, 'Cycle detection completed');
    
    return { 
      hasCycles, 
      cycleNodes: hasCycles ? [...new Set(cycleNodes)] : [] 
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      startNodeId
    }, 'Failed to detect cycles in content graph');

    throw error;
  }
}

/**
 * Finds the shortest path between two content nodes using Dijkstra's algorithm
 * 
 * @param startNodeId - ID of the starting content node
 * @param endNodeId - ID of the ending content node
 * @returns The shortest path and its distance
 */
async function findShortestPath(
  startNodeId: string,
  endNodeId: string
): Promise<{ path: ContentTypes.ContentNode[], distance: number }> {
  try {
    logger.debug({
      startNodeId,
      endNodeId
    }, 'Finding shortest path between content nodes');

    // Retrieve the content graph that might contain both nodes
    // We'll use the larger of the two families to ensure we capture the full path
    const startNodeFamily = await contentGraphQueries.queryContentFamilySubgraph(startNodeId, {});
    
    // Check if end node exists in the graph
    const endNodeInStartFamily = startNodeFamily.nodes.some(node => node.contentId === endNodeId);
    
    let graphNodes: ContentTypes.ContentNode[] = [];
    let graphEdges: any[] = [];
    
    if (endNodeInStartFamily) {
      // End node is in the start node's family, use this graph
      graphNodes = startNodeFamily.nodes;
      graphEdges = startNodeFamily.edges;
    } else {
      // Try the reverse: check if start node is in end node's family
      const endNodeFamily = await contentGraphQueries.queryContentFamilySubgraph(endNodeId, {});
      const startNodeInEndFamily = endNodeFamily.nodes.some(node => node.contentId === startNodeId);
      
      if (startNodeInEndFamily) {
        graphNodes = endNodeFamily.nodes;
        graphEdges = endNodeFamily.edges;
      } else {
        // Nodes are not in the same family, need to get a broader graph
        // This could be expensive, so we'll need optimizations for a real implementation
        // For now, we'll throw an error
        throw new NotFoundError(`No path found between ${startNodeId} and ${endNodeId}`, 'ContentPath');
      }
    }
    
    // Build adjacency list with weights
    const adjacencyList: Record<string, { nodeId: string, weight: number }[]> = {};
    
    // Initialize adjacency list
    for (const node of graphNodes) {
      adjacencyList[node.contentId] = [];
    }
    
    // Add edges to adjacency list (bidirectional)
    for (const edge of graphEdges) {
      // Calculate edge weight based on relationship type and confidence
      // Lower confidence = higher weight (harder to traverse)
      const weight = 1 / (edge.confidence || 0.5);
      
      // Add connections in both directions for Dijkstra
      if (!adjacencyList[edge.source]) {
        adjacencyList[edge.source] = [];
      }
      if (!adjacencyList[edge.target]) {
        adjacencyList[edge.target] = [];
      }
      
      adjacencyList[edge.source].push({ nodeId: edge.target, weight });
      // For non-directional path finding, add the reverse edge too
      adjacencyList[edge.target].push({ nodeId: edge.source, weight });
    }
    
    // Apply Dijkstra's algorithm
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const unvisited = new Set<string>();
    
    // Initialize distances
    for (const node of graphNodes) {
      distances[node.contentId] = node.contentId === startNodeId ? 0 : Infinity;
      previous[node.contentId] = null;
      unvisited.add(node.contentId);
    }
    
    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let current: string | null = null;
      let smallestDistance = Infinity;
      
      for (const nodeId of unvisited) {
        if (distances[nodeId] < smallestDistance) {
          smallestDistance = distances[nodeId];
          current = nodeId;
        }
      }
      
      // If we can't find a node or we've reached the end, stop
      if (current === null || current === endNodeId || smallestDistance === Infinity) {
        break;
      }
      
      // Remove current from unvisited
      unvisited.delete(current);
      
      // Update distances to neighbors
      for (const { nodeId, weight } of adjacencyList[current] || []) {
        if (unvisited.has(nodeId)) {
          const potentialDistance = distances[current] + weight;
          
          if (potentialDistance < distances[nodeId]) {
            distances[nodeId] = potentialDistance;
            previous[nodeId] = current;
          }
        }
      }
    }
    
    // Reconstruct the path
    const pathNodeIds: string[] = [];
    let current = endNodeId;
    
    // If no path exists, throw an error
    if (previous[endNodeId] === null && endNodeId !== startNodeId) {
      throw new NotFoundError(`No path found between ${startNodeId} and ${endNodeId}`, 'ContentPath');
    }
    
    // Work backwards from end to start
    while (current !== null) {
      pathNodeIds.unshift(current);
      current = previous[current] || null;
    }
    
    // Get the actual node objects for the path
    const pathNodes = await Promise.all(
      pathNodeIds.map(async (nodeId) => {
        const node = graphNodes.find(n => n.contentId === nodeId);
        if (node) return node;
        
        // If not in our graph, get it from the database
        const dbNode = await prisma.contentNode.findUnique({
          where: { contentId: nodeId },
          include: { content: true, metrics: true }
        });
        
        if (!dbNode) {
          throw new NotFoundError(`Node in path not found: ${nodeId}`, 'ContentNode', nodeId);
        }
        
        return dbNode as ContentTypes.ContentNode;
      })
    );
    
    logger.debug({
      startNodeId,
      endNodeId,
      pathLength: pathNodes.length,
      distance: distances[endNodeId]
    }, 'Shortest path found');
    
    return {
      path: pathNodes,
      distance: distances[endNodeId]
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      startNodeId,
      endNodeId
    }, 'Failed to find shortest path between nodes');

    throw error;
  }
}

/**
 * Finds common ancestor nodes for multiple content items
 * 
 * @param contentIds - Array of content IDs to find common ancestors for
 * @returns Array of common ancestor nodes
 */
async function findCommonAncestors(
  contentIds: string[]
): Promise<ContentTypes.ContentNode[]> {
  try {
    logger.debug({
      contentIds,
      count: contentIds.length
    }, 'Finding common ancestors for content nodes');

    if (!contentIds || contentIds.length === 0) {
      return [];
    }
    
    if (contentIds.length === 1) {
      // A node is its own ancestor, so just return all ancestors of this node
      return await contentGraphQueries.queryContentNodesByDescendant(contentIds[0], {});
    }
    
    // Use the specialized query function for finding common ancestors
    const commonAncestors = await contentGraphQueries.queryCommonAncestors(contentIds);
    
    logger.debug({
      contentIds,
      commonAncestorsFound: commonAncestors.length
    }, 'Common ancestor search completed');
    
    return commonAncestors;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      contentIds
    }, 'Failed to find common ancestors');

    throw error;
  }
}

/**
 * Identifies distinct subgraphs within a larger content graph
 * 
 * @param creatorId - ID of the creator to analyze
 * @returns Array of identified subgraphs with their root nodes and sizes
 */
async function findContentSubgraphs(
  creatorId: string
): Promise<{ rootNodeId: string, nodeCount: number }[]> {
  try {
    logger.debug({
      creatorId
    }, 'Finding content subgraphs');

    // Fetch all content nodes for this creator
    const contentNodes = await prisma.contentNode.findMany({
      where: {
        content: {
          creatorId
        }
      },
      select: {
        contentId: true,
        rootId: true,
        path: true
      }
    });
    
    if (contentNodes.length === 0) {
      return [];
    }
    
    // Group nodes by their root ID
    const subgraphMap: Record<string, string[]> = {};
    
    for (const node of contentNodes) {
      const rootId = node.rootId || node.contentId;
      if (!subgraphMap[rootId]) {
        subgraphMap[rootId] = [];
      }
      subgraphMap[rootId].push(node.contentId);
    }
    
    // Build result
    const subgraphs = Object.entries(subgraphMap).map(([rootNodeId, nodeIds]) => ({
      rootNodeId,
      nodeCount: nodeIds.length
    }));
    
    // Sort by node count (largest first)
    subgraphs.sort((a, b) => b.nodeCount - a.nodeCount);
    
    logger.debug({
      creatorId,
      subgraphsFound: subgraphs.length
    }, 'Content subgraphs identified');
    
    return subgraphs;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      creatorId
    }, 'Failed to find content subgraphs');

    throw error;
  }
}

/**
 * Analyzes node centrality measures in a content family graph
 * 
 * @param rootContentId - ID of the root content node
 * @returns Record mapping node IDs to their centrality metrics
 */
async function analyzeGraphCentrality(
  rootContentId: string
): Promise<Record<string, { degreeCentrality: number, betweennessCentrality: number }>> {
  try {
    logger.debug({
      rootContentId
    }, 'Analyzing graph centrality for content family');

    // Get the content family graph
    const { nodes, edges } = await contentGraphQueries.queryContentFamilySubgraph(rootContentId, {});
    
    if (nodes.length === 0) {
      throw new NotFoundError(`Content family not found for ${rootContentId}`, 'ContentNode', rootContentId);
    }
    
    // Build adjacency list for graph algorithms
    const adjacencyList: Record<string, string[]> = {};
    for (const node of nodes) {
      adjacencyList[node.contentId] = [];
    }
    
    for (const edge of edges) {
      // Add bidirectional edges for centrality calculations
      if (!adjacencyList[edge.sourceContentId]) {
        adjacencyList[edge.sourceContentId] = [];
      }
      if (!adjacencyList[edge.targetContentId]) {
        adjacencyList[edge.targetContentId] = [];
      }
      
      adjacencyList[edge.sourceContentId].push(edge.targetContentId);
      adjacencyList[edge.targetContentId].push(edge.sourceContentId);
    }
    
    // Calculate degree centrality
    const degreeCentrality: Record<string, number> = {};
    for (const [nodeId, neighbors] of Object.entries(adjacencyList)) {
      degreeCentrality[nodeId] = neighbors.length;
    }
    
    // Calculate betweenness centrality (simplified approach)
    const betweennessCentrality: Record<string, number> = {};
    const nodeIds = nodes.map(n => n.contentId);
    
    // Initialize betweenness to 0 for all nodes
    for (const nodeId of nodeIds) {
      betweennessCentrality[nodeId] = 0;
    }
    
    // For each pair of nodes, find shortest paths and increment betweenness for nodes on the path
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const sourceId = nodeIds[i];
        const targetId = nodeIds[j];
        
        // Skip if same node
        if (sourceId === targetId) continue;
        
        // Find all shortest paths between source and target
        const shortestPaths = findAllShortestPaths(adjacencyList, sourceId, targetId);
        
        // If no paths, skip
        if (shortestPaths.length === 0) continue;
        
        // Count each node's appearance in shortest paths
        for (const path of shortestPaths) {
          // Skip source and target nodes
          const intermediateNodes = path.slice(1, -1);
          for (const nodeId of intermediateNodes) {
            betweennessCentrality[nodeId] = (betweennessCentrality[nodeId] || 0) + (1 / shortestPaths.length);
          }
        }
      }
    }
    
    // Normalize centrality measures
    const maxDegree = Math.max(...Object.values(degreeCentrality));
    const maxBetweenness = Math.max(...Object.values(betweennessCentrality));
    
    // Combine results
    const result: Record<string, { degreeCentrality: number, betweennessCentrality: number }> = {};
    
    for (const nodeId of nodeIds) {
      result[nodeId] = {
        degreeCentrality: maxDegree > 0 ? degreeCentrality[nodeId] / maxDegree : 0,
        betweennessCentrality: maxBetweenness > 0 ? betweennessCentrality[nodeId] / maxBetweenness : 0
      };
    }
    
    logger.debug({
      rootContentId,
      nodesAnalyzed: nodes.length
    }, 'Graph centrality analysis completed');
    
    return result;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      rootContentId
    }, 'Failed to analyze graph centrality');

    throw error;
  }
}

/**
 * Performs a breadth-first (level order) traversal of the content hierarchy
 * 
 * @param rootContentId - ID of the root content node
 * @returns Array of node arrays, grouped by hierarchy level
 */
async function traverseLevelOrder(
  rootContentId: string
): Promise<ContentTypes.ContentNode[][]> {
  try {
    logger.debug({
      rootContentId
    }, 'Performing level-order traversal of content hierarchy');

    // Get the content family
    const familyNodes = await contentRelationshipModel.getContentFamily(rootContentId);
    
    if (!familyNodes || !familyNodes.nodes || familyNodes.nodes.length === 0) {
      throw new NotFoundError(`Content family not found for ${rootContentId}`, 'ContentNode', rootContentId);
    }
    
    // Group nodes by their depth
    const nodesByLevel: Record<number, ContentTypes.ContentNode[]> = {};
    const maxDepth = Math.max(...familyNodes.nodes.map(n => n.depth || 0));
    
    // Initialize empty arrays for each level
    for (let i = 0; i <= maxDepth; i++) {
      nodesByLevel[i] = [];
    }
    
    // Group nodes by level
    for (const node of familyNodes.nodes) {
      const depth = node.depth || 0;
      nodesByLevel[depth].push(node as unknown as ContentTypes.ContentNode);
    }
    
    // Convert to array of arrays
    const result: ContentTypes.ContentNode[][] = [];
    for (let i = 0; i <= maxDepth; i++) {
      if (nodesByLevel[i] && nodesByLevel[i].length > 0) {
        result.push(nodesByLevel[i]);
      }
    }
    
    logger.debug({
      rootContentId,
      levelCount: result.length,
      totalNodes: familyNodes.nodes.length
    }, 'Level-order traversal completed');
    
    return result;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      rootContentId
    }, 'Failed to perform level-order traversal');

    throw error;
  }
}

// ============ Helper Functions ============

/**
 * Helper function to find all shortest paths between two nodes in a graph
 * 
 * @param adjacencyList - Graph represented as adjacency list
 * @param startId - ID of the start node
 * @param endId - ID of the end node
 * @returns All shortest paths from start to end
 */
function findAllShortestPaths(
  adjacencyList: Record<string, string[]>,
  startId: string,
  endId: string
): string[][] {
  // BFS to find the shortest distance
  const distances: Record<string, number> = {};
  const queue: string[] = [startId];
  distances[startId] = 0;
  
  // Find shortest distance
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current === endId) {
      break;
    }
    
    for (const neighbor of adjacencyList[current] || []) {
      if (distances[neighbor] === undefined) {
        distances[neighbor] = distances[current] + 1;
        queue.push(neighbor);
      }
    }
  }
  
  // If end not reachable, return empty array
  if (distances[endId] === undefined) {
    return [];
  }
  
  // DFS to find all shortest paths
  const shortestPaths: string[][] = [];
  
  function dfs(current: string, path: string[]) {
    // If we reached the end, add path to results
    if (current === endId) {
      shortestPaths.push([...path, current]);
      return;
    }
    
    // Try all neighbors that are on a shortest path
    for (const neighbor of adjacencyList[current] || []) {
      if (distances[neighbor] === distances[current] + 1) {
        dfs(neighbor, [...path, current]);
      }
    }
  }
  
  dfs(startId, []);
  return shortestPaths;
}

export default {
  traverseContentPath,
  findPathBetweenNodes,
  detectCycles,
  findShortestPath,
  findCommonAncestors,
  findContentSubgraphs,
  analyzeGraphCentrality,
  traverseLevelOrder
};