/**
 * Central export module for the graph system that manages content relationship hierarchies using PostgreSQL's LTREE extension. This barrel file consolidates and exposes the functionality for building, querying, traversing, and analyzing content relationship graphs across the Engagerr platform.
 */

import contentRelationshipGraph from './contentRelationship'; // Core content relationship graph functionality
import hierarchyBuilder from './hierarchyBuilder'; // Hierarchy building and path management functionality
import contentGraphQueries from './queries'; // Specialized database queries for graph operations
import contentTraversal from './traversal'; // Advanced graph traversal algorithms

export {
  contentRelationshipGraph, // Main interface for content relationship graph operations
  hierarchyBuilder, // Utilities for building and maintaining hierarchical structures
  contentGraphQueries, // Specialized database queries for graph operations
  contentTraversal // Advanced graph traversal and analysis algorithms
};