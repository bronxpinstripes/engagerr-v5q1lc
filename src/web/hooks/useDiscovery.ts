import { useState, useEffect, useCallback, useMemo } from 'react';
import useAuth from './useAuth';
import useDebounce from './useDebounce';
import useBrand from './useBrand';
import { Creator, Category, CreatorProfile, AudienceAgeBracket, AudienceDemographics, CreatorMetrics, CreatorSearchFilter } from '../types/creator';
import { SearchFilters, SavedSearch, PaginationParams } from '../types/brand';
import { api } from '../lib/api';
import { API_ROUTES } from '../lib/constants';

/**
 * Custom hook that provides comprehensive creator discovery functionality for brands,
 * including search, filtering, favorites management, and AI-powered creator recommendations.
 * 
 * @param initialFilters - Optional initial search filters to apply
 * @returns Object containing discovery state and functions for searching, filtering, and managing creator discovery
 */
const useDiscovery = (initialFilters?: SearchFilters) => {
  // ======= State Management =======
  // Creators search results
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Default filters if none provided
  const defaultFilters: SearchFilters = {
    categories: [],
    platforms: [],
    audienceAgeRange: { min: 0, max: 100 },
    audienceGender: [],
    audienceLocations: [],
    followerRange: { min: 0, max: undefined },
    engagementRate: { min: 0, max: undefined },
    contentTypes: [],
    budgetRange: { min: 0, max: undefined },
    keywords: []
  };
  
  // Search filters
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || defaultFilters);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);
  
  // Favorites and recommended creators
  const [favoriteCreators, setFavoriteCreators] = useState<string[]>([]);
  const [recommendedCreators, setRecommendedCreators] = useState<Creator[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState<boolean>(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Get auth and brand context
  const { user, isAuthenticated } = useAuth();
  const { 
    brand, 
    brandId, 
    savedSearches, 
    saveSearch: saveBrandSearch, 
    deleteSearch: deleteBrandSearch 
  } = useBrand();

  // ======= Main Functions =======
  
  /**
   * Search for creators based on query and filters
   * 
   * @param page - Page number to fetch
   * @returns Promise that resolves when search is complete
   */
  const searchCreators = useCallback(async (page: number = 1) => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Prepare pagination parameters
      const paginationParams: PaginationParams = {
        page,
        pageSize
      };
      
      // Prepare search parameters
      const searchParams = {
        query: debouncedSearchQuery,
        filters,
        sort: {
          field: sortBy,
          direction: sortDirection
        },
        ...paginationParams
      };
      
      // Make API request
      const response = await api.post(`${API_ROUTES.DISCOVERY}/search`, searchParams);
      
      // Update state with results
      setCreators(response.data.creators || []);
      setTotalResults(response.data.totalCount || 0);
      setTotalPages(Math.ceil((response.data.totalCount || 0) / pageSize));
      setCurrentPage(page);
      
    } catch (error: any) {
      setError(error.message || 'Failed to search creators');
      setCreators([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, debouncedSearchQuery, filters, pageSize, sortBy, sortDirection]);
  
  /**
   * Update search filters and reset to first page
   * 
   * @param newFilters - Partial filters to update
   */
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
    // Reset to first page when filters change
    setCurrentPage(1);
  }, []);
  
  /**
   * Reset filters to default values
   */
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  }, [defaultFilters]);
  
  /**
   * Handle page change for pagination
   * 
   * @param page - Target page number
   */
  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    searchCreators(page);
  }, [totalPages, searchCreators]);
  
  /**
   * Get detailed profile for a specific creator
   * 
   * @param creatorId - ID of the creator to get details for
   * @returns Promise resolving to creator profile data or null if unsuccessful
   */
  const getCreatorDetails = useCallback(async (creatorId: string) => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return null;
    }
    
    try {
      const response = await api.get(`${API_ROUTES.CREATORS}/${creatorId}/profile`);
      return response.data;
    } catch (error: any) {
      setError(error.message || 'Failed to get creator details');
      return null;
    }
  }, [isAuthenticated]);
  
  /**
   * Load a saved search configuration
   * 
   * @param savedSearch - Saved search configuration to load
   */
  const loadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    if (!savedSearch || !savedSearch.filters) return;
    
    setFilters(savedSearch.filters);
    setCurrentPage(1);
    searchCreators(1);
  }, [searchCreators]);
  
  /**
   * Save current search configuration with a name
   * 
   * @param name - Name to save the search configuration as
   * @returns Promise resolving when save operation completes
   */
  const saveSearch = useCallback(async (name: string) => {
    if (!isAuthenticated || !brandId) {
      setError('Authentication required');
      return;
    }
    
    try {
      await saveBrandSearch(name, filters);
    } catch (error: any) {
      setError(error.message || 'Failed to save search');
    }
  }, [isAuthenticated, brandId, filters, saveBrandSearch]);
  
  /**
   * Delete a saved search
   * 
   * @param searchId - ID of saved search to delete
   * @returns Promise resolving when delete operation completes
   */
  const deleteSavedSearch = useCallback(async (searchId: string) => {
    if (!isAuthenticated || !brandId) {
      setError('Authentication required');
      return;
    }
    
    try {
      await deleteBrandSearch(searchId);
    } catch (error: any) {
      setError(error.message || 'Failed to delete search');
    }
  }, [isAuthenticated, brandId, deleteBrandSearch]);
  
  /**
   * Add a creator to favorites
   * 
   * @param creatorId - ID of creator to favorite
   * @returns Promise resolving when operation completes
   */
  const favoriteCreator = useCallback(async (creatorId: string) => {
    if (!isAuthenticated || !brandId) {
      setError('Authentication required');
      return;
    }
    
    try {
      await api.post(`${API_ROUTES.BRANDS}/${brandId}/favorites`, { creatorId });
      setFavoriteCreators(prev => [...prev, creatorId]);
    } catch (error: any) {
      setError(error.message || 'Failed to favorite creator');
    }
  }, [isAuthenticated, brandId]);
  
  /**
   * Remove a creator from favorites
   * 
   * @param creatorId - ID of creator to unfavorite
   * @returns Promise resolving when operation completes
   */
  const unfavoriteCreator = useCallback(async (creatorId: string) => {
    if (!isAuthenticated || !brandId) {
      setError('Authentication required');
      return;
    }
    
    try {
      await api.delete(`${API_ROUTES.BRANDS}/${brandId}/favorites/${creatorId}`);
      setFavoriteCreators(prev => prev.filter(id => id !== creatorId));
    } catch (error: any) {
      setError(error.message || 'Failed to unfavorite creator');
    }
  }, [isAuthenticated, brandId]);
  
  /**
   * Check if a creator is in favorites
   * 
   * @param creatorId - ID of creator to check
   * @returns Boolean indicating if creator is favorited
   */
  const isFavorite = useCallback((creatorId: string) => {
    return favoriteCreators.includes(creatorId);
  }, [favoriteCreators]);
  
  /**
   * Get AI-powered recommended creators based on brand profile and preferences
   * 
   * @returns Promise resolving when recommendations are loaded
   */
  const getRecommendedCreators = useCallback(async () => {
    if (!isAuthenticated || !brandId) {
      setError('Authentication required');
      return;
    }
    
    setRecommendedLoading(true);
    
    try {
      const response = await api.get(`${API_ROUTES.DISCOVERY}/recommendations?brandId=${brandId}`);
      setRecommendedCreators(response.data || []);
    } catch (error: any) {
      setError(error.message || 'Failed to get recommendations');
      setRecommendedCreators([]);
    } finally {
      setRecommendedLoading(false);
    }
  }, [isAuthenticated, brandId]);
  
  /**
   * Sort the current results
   * 
   * @param field - Field to sort by
   * @param direction - Direction to sort (asc or desc)
   */
  const sortResults = useCallback((field: string, direction: 'asc' | 'desc' = 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
    searchCreators(currentPage);
  }, [searchCreators, currentPage]);
  
  // Load favorite creators on mount if brand ID is available
  useEffect(() => {
    const loadFavorites = async () => {
      if (!isAuthenticated || !brandId) return;
      
      try {
        const response = await api.get(`${API_ROUTES.BRANDS}/${brandId}/favorites`);
        setFavoriteCreators(response.data.map((fav: any) => fav.creatorId) || []);
      } catch (error: any) {
        console.error('Failed to load favorites:', error);
      }
    };
    
    loadFavorites();
  }, [isAuthenticated, brandId]);
  
  // Load initial recommendations
  useEffect(() => {
    if (isAuthenticated && brandId) {
      getRecommendedCreators();
    }
  }, [isAuthenticated, brandId, getRecommendedCreators]);
  
  // Trigger search when debounced query or filters change
  useEffect(() => {
    if (isAuthenticated) {
      searchCreators(1);
    }
  }, [debouncedSearchQuery, filters, isAuthenticated, searchCreators]);
  
  // Calculate category statistics from search results
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    creators.forEach(creator => {
      creator.categories?.forEach(category => {
        stats[category] = (stats[category] || 0) + 1;
      });
    });
    return stats;
  }, [creators]);
  
  // Calculate platform statistics from search results
  const platformStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    creators.forEach(creator => {
      // Access platform metrics from creator metrics data
      if (creator.metrics?.platformMetrics) {
        Object.keys(creator.metrics.platformMetrics).forEach(platform => {
          stats[platform] = (stats[platform] || 0) + 1;
        });
      }
    });
    
    return stats;
  }, [creators]);
  
  // Define sort options for UI
  const sortOptions = useMemo(() => ({
    relevance: { label: 'Relevance', value: 'relevance' },
    followers: { label: 'Followers', value: 'followers' },
    engagement: { label: 'Engagement Rate', value: 'engagement' },
    contentValue: { label: 'Content Value', value: 'contentValue' },
    name: { label: 'Name', value: 'name' }
  }), []);
  
  // Return all the necessary data and functions
  return {
    // Search results and state
    creators,
    loading,
    error,
    
    // Search parameters
    searchQuery,
    setSearchQuery,
    filters,
    updateFilters,
    resetFilters,
    
    // Pagination
    currentPage,
    pageSize,
    totalPages,
    totalResults,
    handlePageChange,
    
    // Core functions
    searchCreators,
    getCreatorDetails,
    
    // Saved searches
    savedSearches,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    
    // Favorites
    favoriteCreators,
    favoriteCreator,
    unfavoriteCreator,
    isFavorite,
    
    // Recommendations
    getRecommendedCreators,
    recommendedCreators,
    recommendedLoading,
    
    // Stats and sorting
    categoryStats,
    platformStats,
    sortOptions,
    sortResults
  };
};

export default useDiscovery;