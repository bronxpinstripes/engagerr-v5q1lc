import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query'; // v5.0.0
import { useAuth } from './useAuth';
import { useCreator } from './useCreator';
import { useToast } from './useToast';
import { api } from '../lib/api';
import { API_ENDPOINTS } from '../lib/constants';
import {
  ContentRelationship,
  RelationshipType,
  CreationMethod,
  ContentFamily,
  ContentGraph,
  ContentNode,
  RelationshipEdge,
  ContentFamilyVisualizationData,
  CreateRelationshipRequest,
  CreateRelationshipResponse,
  GetContentSuggestionsRequest,
  ContentSuggestion
} from '../types/content';

/**
 * Interface defining the return value of the useContentRelationships hook
 */
export interface ContentRelationshipsHookReturn {
  // Data
  relationships: ContentRelationship[];
  relationshipsLoading: boolean;
  relationshipsError: string | null;
  
  contentFamily: ContentFamily | null;
  contentFamilyLoading: boolean;
  contentFamilyError: string | null;
  
  suggestions: ContentSuggestion[];
  suggestionsLoading: boolean;
  suggestionsError: string | null;
  
  // Functions
  getRelationships: (contentId: string) => Promise<ContentRelationship[]>;
  getContentFamily: (rootContentId: string) => Promise<ContentFamily | null>;
  getVisualizationData: (contentFamilyId: string) => Promise<ContentFamilyVisualizationData | null>;
  getRelationshipSuggestions: (contentId: string) => Promise<ContentSuggestion[]>;
  
  createRelationship: (data: CreateRelationshipRequest) => Promise<ContentRelationship>;
  updateRelationship: (relationshipId: string, data: Partial<ContentRelationship>) => Promise<ContentRelationship>;
  deleteRelationship: (relationshipId: string) => Promise<void>;
  
  approveRelationshipSuggestion: (suggestionId: string) => Promise<ContentRelationship>;
  rejectRelationshipSuggestion: (suggestionId: string) => Promise<void>;
  
  getRelationshipTypeLabel: (relationshipType: RelationshipType) => string;
  refreshRelationshipData: () => Promise<void>;
}

/**
 * Custom hook that provides functionality for managing content relationships in the Engagerr platform.
 * This hook handles fetching, creating, updating, and deleting relationships between content items
 * across different platforms, supporting the platform's proprietary content mapping technology.
 * 
 * @returns A ContentRelationshipsHookReturn object containing relationship state and operations
 */
export const useContentRelationships = (): ContentRelationshipsHookReturn => {
  // Access authentication context to get current user
  const { user } = useAuth();
  
  // Access creator context to get creator profile data
  const { creator } = useCreator();
  
  // Initialize toast notification system for success/error messages
  const toast = useToast();
  
  // Initialize query client for data fetching and cache invalidation
  const queryClient = useQueryClient();
  
  // Get creator ID for API requests
  const creatorId = useMemo(() => creator?.id || '', [creator]);
  
  // Set up query for fetching content relationships
  const {
    data: relationships = [],
    isLoading: relationshipsLoading,
    error: relationshipsError,
    refetch: refetchRelationships
  } = useQuery<ContentRelationship[], Error>(
    ['contentRelationships'],
    async () => {
      // Default query returns empty array if no active content ID
      return [];
    },
    {
      // Don't execute the query initially, we'll refetch when needed with specific contentId
      enabled: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 15 * 60 * 1000 // 15 minutes
    }
  );
  
  // Set up query for fetching content family data
  const {
    data: contentFamily,
    isLoading: contentFamilyLoading,
    error: contentFamilyError,
    refetch: refetchContentFamily
  } = useQuery<ContentFamily | null, Error>(
    ['contentFamily'],
    async () => {
      // Default query returns null if no active content family ID
      return null;
    },
    {
      // Don't execute the query initially, we'll refetch when needed with specific rootContentId
      enabled: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 15 * 60 * 1000 // 15 minutes
    }
  );
  
  // Set up query for fetching relationship suggestions
  const {
    data: suggestions = [],
    isLoading: suggestionsLoading,
    error: suggestionsError,
    refetch: refetchSuggestions
  } = useQuery<ContentSuggestion[], Error>(
    ['contentSuggestions'],
    async () => {
      // Default query returns empty array if no active content ID
      return [];
    },
    {
      // Don't execute the query initially, we'll refetch when needed with specific contentId
      enabled: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 15 * 60 * 1000 // 15 minutes
    }
  );
  
  // Mutation for creating new relationships
  const createRelationshipMutation = useMutation<
    ContentRelationship,
    Error,
    CreateRelationshipRequest
  >({
    mutationFn: async (data) => {
      const response = await api.post<CreateRelationshipResponse>(
        `${API_ENDPOINTS.CONTENT}/relationships`,
        { ...data, creatorId }
      );
      return response.relationship;
    },
    onSuccess: () => {
      toast.success('Relationship created successfully');
      queryClient.invalidateQueries(['contentRelationships']);
      queryClient.invalidateQueries(['contentFamily']);
    },
    onError: (error) => {
      toast.error(
        'Failed to create relationship',
        error.message || 'Please try again later'
      );
    }
  });
  
  // Mutation for updating existing relationships
  const updateRelationshipMutation = useMutation<
    ContentRelationship,
    Error,
    { id: string; data: Partial<ContentRelationship> }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await api.put<ContentRelationship>(
        `${API_ENDPOINTS.CONTENT}/relationships/${id}`,
        { ...data, creatorId }
      );
      return response;
    },
    onSuccess: () => {
      toast.success('Relationship updated successfully');
      queryClient.invalidateQueries(['contentRelationships']);
      queryClient.invalidateQueries(['contentFamily']);
    },
    onError: (error) => {
      toast.error(
        'Failed to update relationship',
        error.message || 'Please try again later'
      );
    }
  });
  
  // Mutation for deleting relationships
  const deleteRelationshipMutation = useMutation<
    void,
    Error,
    string
  >({
    mutationFn: async (relationshipId) => {
      await api.delete(
        `${API_ENDPOINTS.CONTENT}/relationships/${relationshipId}`,
        { creatorId }
      );
    },
    onSuccess: () => {
      toast.success('Relationship deleted successfully');
      queryClient.invalidateQueries(['contentRelationships']);
      queryClient.invalidateQueries(['contentFamily']);
    },
    onError: (error) => {
      toast.error(
        'Failed to delete relationship',
        error.message || 'Please try again later'
      );
    }
  });
  
  // Mutation for approving relationship suggestions
  const approveRelationshipSuggestionMutation = useMutation<
    ContentRelationship,
    Error,
    string
  >({
    mutationFn: async (suggestionId) => {
      const response = await api.post<ContentRelationship>(
        `${API_ENDPOINTS.CONTENT}/suggestions/${suggestionId}/approve`,
        { creatorId }
      );
      return response;
    },
    onSuccess: () => {
      toast.success('Relationship suggestion approved');
      queryClient.invalidateQueries(['contentSuggestions']);
      queryClient.invalidateQueries(['contentRelationships']);
      queryClient.invalidateQueries(['contentFamily']);
    },
    onError: (error) => {
      toast.error(
        'Failed to approve relationship suggestion',
        error.message || 'Please try again later'
      );
    }
  });
  
  // Mutation for rejecting relationship suggestions
  const rejectRelationshipSuggestionMutation = useMutation<
    void,
    Error,
    string
  >({
    mutationFn: async (suggestionId) => {
      await api.post(
        `${API_ENDPOINTS.CONTENT}/suggestions/${suggestionId}/reject`,
        { creatorId }
      );
    },
    onSuccess: () => {
      toast.success('Relationship suggestion rejected');
      queryClient.invalidateQueries(['contentSuggestions']);
    },
    onError: (error) => {
      toast.error(
        'Failed to reject relationship suggestion',
        error.message || 'Please try again later'
      );
    }
  });
  
  // Function to get relationships for a content item
  const getRelationships = useCallback(
    async (contentId: string): Promise<ContentRelationship[]> => {
      try {
        // Update query key to include contentId
        queryClient.setQueryData(['contentRelationships', contentId], null);
        
        // Fetch relationships with the contentId
        const response = await api.get<ContentRelationship[]>(
          `${API_ENDPOINTS.CONTENT}/${contentId}/relationships`,
          { creatorId }
        );
        
        // Update query cache and return response
        queryClient.setQueryData(['contentRelationships', contentId], response);
        return response;
      } catch (err) {
        const error = err as Error;
        toast.error(
          'Failed to fetch relationships',
          error.message || 'Please try again later'
        );
        throw error;
      }
    },
    [creatorId, queryClient, toast]
  );
  
  // Function to get content family data
  const getContentFamily = useCallback(
    async (rootContentId: string): Promise<ContentFamily | null> => {
      try {
        // Update query key to include rootContentId
        queryClient.setQueryData(['contentFamily', rootContentId], null);
        
        // Fetch content family with the rootContentId
        const response = await api.get<ContentFamily>(
          `${API_ENDPOINTS.CONTENT}/${rootContentId}/family`,
          { creatorId }
        );
        
        // Update query cache and return response
        queryClient.setQueryData(['contentFamily', rootContentId], response);
        return response;
      } catch (err) {
        const error = err as Error;
        toast.error(
          'Failed to fetch content family',
          error.message || 'Please try again later'
        );
        return null;
      }
    },
    [creatorId, queryClient, toast]
  );
  
  // Helper function to process relationship data for visualization
  const processVisualizationData = useCallback(
    (data: ContentFamilyVisualizationData): ContentFamilyVisualizationData => {
      // Add any additional processing logic here if needed
      // For example, sorting nodes, enhancing edge data, etc.
      
      const { graph } = data;
      
      // Set node size based on metrics (making root node larger)
      const enhancedNodes = graph.nodes.map(node => ({
        ...node,
        size: node.isRoot ? 2 : 1,
        // Add additional data for visualization if needed
        data: {
          ...node.data,
          label: `${node.label} (${node.platformType})`,
        }
      }));
      
      // Set edge weights based on confidence
      const enhancedEdges = graph.edges.map(edge => ({
        ...edge,
        weight: edge.confidence,
        // Add additional data for visualization if needed
      }));
      
      return {
        ...data,
        graph: {
          nodes: enhancedNodes,
          edges: enhancedEdges
        }
      };
    },
    []
  );
  
  // Function to get visualization data for a content family
  const getVisualizationData = useCallback(
    async (contentFamilyId: string): Promise<ContentFamilyVisualizationData | null> => {
      try {
        // Fetch visualization data for the content family
        const response = await api.get<ContentFamilyVisualizationData>(
          `${API_ENDPOINTS.CONTENT}/${contentFamilyId}/visualization`,
          { creatorId }
        );
        
        // Process the visualization data before returning
        return processVisualizationData(response);
      } catch (err) {
        const error = err as Error;
        toast.error(
          'Failed to fetch visualization data',
          error.message || 'Please try again later'
        );
        return null;
      }
    },
    [creatorId, toast, processVisualizationData]
  );
  
  // Function to get relationship suggestions for a content item
  const getRelationshipSuggestions = useCallback(
    async (contentId: string): Promise<ContentSuggestion[]> => {
      try {
        // Prepare request parameters
        const params: GetContentSuggestionsRequest = {
          contentId,
          creatorId,
          confidenceThreshold: 0.5, // Only show suggestions with at least 50% confidence
          limit: 10 // Limit to 10 suggestions
        };
        
        // Update query key to include contentId
        queryClient.setQueryData(['contentSuggestions', contentId], null);
        
        // Fetch suggestions with the contentId
        const response = await api.get<ContentSuggestion[]>(
          `${API_ENDPOINTS.CONTENT}/${contentId}/suggestions`,
          params
        );
        
        // Update query cache and return response
        queryClient.setQueryData(['contentSuggestions', contentId], response);
        return response;
      } catch (err) {
        const error = err as Error;
        toast.error(
          'Failed to fetch relationship suggestions',
          error.message || 'Please try again later'
        );
        return [];
      }
    },
    [creatorId, queryClient, toast]
  );
  
  // Function to create a new relationship
  const createRelationship = useCallback(
    async (data: CreateRelationshipRequest): Promise<ContentRelationship> => {
      return await createRelationshipMutation.mutateAsync(data);
    },
    [createRelationshipMutation]
  );
  
  // Function to update an existing relationship
  const updateRelationship = useCallback(
    async (relationshipId: string, data: Partial<ContentRelationship>): Promise<ContentRelationship> => {
      return await updateRelationshipMutation.mutateAsync({ id: relationshipId, data });
    },
    [updateRelationshipMutation]
  );
  
  // Function to delete a relationship
  const deleteRelationship = useCallback(
    async (relationshipId: string): Promise<void> => {
      await deleteRelationshipMutation.mutateAsync(relationshipId);
    },
    [deleteRelationshipMutation]
  );
  
  // Function to approve a relationship suggestion
  const approveRelationshipSuggestion = useCallback(
    async (suggestionId: string): Promise<ContentRelationship> => {
      return await approveRelationshipSuggestionMutation.mutateAsync(suggestionId);
    },
    [approveRelationshipSuggestionMutation]
  );
  
  // Function to reject a relationship suggestion
  const rejectRelationshipSuggestion = useCallback(
    async (suggestionId: string): Promise<void> => {
      await rejectRelationshipSuggestionMutation.mutateAsync(suggestionId);
    },
    [rejectRelationshipSuggestionMutation]
  );
  
  // Helper function to get a human-readable label for relationship types
  const getRelationshipTypeLabel = useCallback((relationshipType: RelationshipType): string => {
    const labels: Record<RelationshipType, string> = {
      [RelationshipType.PARENT]: 'Parent',
      [RelationshipType.CHILD]: 'Child',
      [RelationshipType.DERIVATIVE]: 'Derivative',
      [RelationshipType.REPURPOSED]: 'Repurposed',
      [RelationshipType.REACTION]: 'Reaction',
      [RelationshipType.REFERENCE]: 'Reference'
    };
    
    return labels[relationshipType] || String(relationshipType);
  }, []);
  
  // Function to refresh all relationship data
  const refreshRelationshipData = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        refetchRelationships(),
        refetchContentFamily(),
        refetchSuggestions()
      ]);
      toast.success('Relationship data refreshed');
    } catch (err) {
      const error = err as Error;
      toast.error(
        'Failed to refresh relationship data',
        error.message || 'Please try again later'
      );
    }
  }, [refetchRelationships, refetchContentFamily, refetchSuggestions, toast]);
  
  // Return the hook's API
  return {
    // Data
    relationships,
    relationshipsLoading,
    relationshipsError: relationshipsError ? relationshipsError.message : null,
    
    contentFamily,
    contentFamilyLoading,
    contentFamilyError: contentFamilyError ? contentFamilyError.message : null,
    
    suggestions,
    suggestionsLoading,
    suggestionsError: suggestionsError ? suggestionsError.message : null,
    
    // Functions
    getRelationships,
    getContentFamily,
    getVisualizationData,
    getRelationshipSuggestions,
    
    createRelationship,
    updateRelationship,
    deleteRelationship,
    
    approveRelationshipSuggestion,
    rejectRelationshipSuggestion,
    
    getRelationshipTypeLabel,
    refreshRelationshipData
  };
};