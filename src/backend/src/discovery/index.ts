/**
 * Central export file for the Discovery Marketplace functionality, aggregating search, filtering, ranking, matching, and recommendation capabilities to enable brands to find and evaluate creators for partnerships based on various criteria and AI-enhanced matching.
 */

import {
  searchCreators, // Import main search function for creator discovery
  quickSearch, // Import text-based quick search functionality
  findSimilarCreators, // Import function to find creators similar to a reference creator
  executeSearch, // Import high-level search execution function
  saveSearch, // Import function to save search criteria for future use
  getSavedSearch, // Import function to retrieve saved search configurations
} from './search';
import {
  applyFilters, // Import function for applying filters to search results
  createFilterQuery, // Import function to create database queries from filter options
  getPaginatedFilteredCreators, // Import function to get paginated filtered creators
  FilterProcessor, // Import class for advanced filtering operations
} from './filtering';
import {
  calculateMatchScore, // Import function to calculate match scores between creators and criteria
  rankCreators, // Import function to rank creators based on match scores
  sortCreatorsByField, // Import function to sort creators by a specified field
  enhanceSearchResults, // Import function to enhance search results with match scores
} from './ranking';
import {
  calculateBrandCreatorMatch, // Import function for calculating detailed brand-creator match
  getRecommendedCreators, // Import function to get AI-recommended creators for a brand
} from './matching';
import {
  RecommendationEngine, // Import main recommendation engine class
  generateContentRecommendations, // Import function for generating content recommendations for creators
  generatePlatformRecommendations, // Import function for generating platform recommendations for creators
  generatePartnershipRecommendations, // Import function for generating partnership recommendations
  generateGrowthRecommendations, // Import function for generating growth recommendations for creators
} from './recommendation';
import { logger } from '../utils/logger'; // Import logger for discovery operations tracking

/**
 * Initializes the discovery system including search, filtering, and recommendation components
 * @returns {Promise<void>} Resolves when discovery system is initialized
 */
export async function initializeDiscoverySystem(): Promise<void> {
  // Initialize filter processor with default handlers
  const filterProcessor = new FilterProcessor();

  // Initialize recommendation engine
  const recommendationEngine = new RecommendationEngine();

  // Set up AI model routing for discovery operations
  // (Placeholder for future AI integration)

  // Log successful initialization of discovery system
  logger.info('Discovery system initialized successfully');
}

// Export all functions and classes for use in other modules
export {
  searchCreators, // Primary search function for creator discovery
  quickSearch, // Text-based quick search functionality
  findSimilarCreators, // Find creators similar to a given creator
  executeSearch, // High-level search execution function
  saveSearch, // Save search criteria for future use
  getSavedSearch, // Retrieve a saved search configuration
  applyFilters, // Apply filters to search results
  createFilterQuery, // Create database queries from filter options
  FilterProcessor, // Advanced filter processing capabilities
  calculateMatchScore, // Calculate match score between creator and brand criteria
  enhanceSearchResults, // Enhance search results with match scores and explanations
  sortCreatorsByField, // Sort creators by specified field and direction
  calculateBrandCreatorMatch, // Calculate detailed match between brand and creator
  getRecommendedCreators, // Get AI-recommended creators for a brand
  RecommendationEngine, // Main engine for generating various types of recommendations
  generateContentRecommendations, // Generate content strategy recommendations for creators
  generatePlatformRecommendations, // Generate platform strategy recommendations for creators
  generatePartnershipRecommendations, // Generate partnership opportunity recommendations
  generateGrowthRecommendations, // Generate growth strategy recommendations for creators
  initializeDiscoverySystem // Initialize the discovery system components
};