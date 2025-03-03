import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query'; // v5.0.0

import { useAuth } from './useAuth';
import { useCreator } from './useCreator';
import useToast from './useToast';
import { api } from '../lib/api';
import { API_ENDPOINTS } from '../lib/constants';
import {
  Content,
  ContentSummary,
  ContentType,
  ContentMetrics,
  CreateContentRequest,
  UpdateContentRequest,
  GetContentRequest,
  GetContentResponse,
  GetCreatorContentsRequest,
  GetCreatorContentsResponse,
  AnalyzeContentRequest,
  AnalyzeContentResponse
} from '../types/content';
import { PlatformType } from '../types/platform';

/**
 * Interface defining the return value of the useContent hook
 */
export interface ContentHookReturn {
  // Data states
  content: Content | null;
  contentLoading: boolean;
  contentError: string | null;
  contents: ContentSummary[];
  contentsLoading: boolean;
  contentsError: string | null;
  
  // Content operations
  getContent: (contentId: string) => Promise<Content | null>;
  getCreatorContents: (filters?: Partial<GetCreatorContentsRequest>) => Promise<ContentSummary[]>;
  createContent: (contentData: CreateContentRequest) => Promise<Content>;
  updateContent: (contentId: string, contentData: UpdateContentRequest) => Promise<Content>;
  deleteContent: (contentId: string) => Promise<void>;
  analyzeContent: (contentId: string) => Promise<AnalyzeContentResponse>;
  
  // Helper functions
  formatContent: (content: Content) => string;
  getContentTypeLabel: (contentType: ContentType) => string;
  refreshContentData: () => Promise<void>;
}

/**
 * Custom hook that provides functionality for managing content data and operations
 * in the Engagerr platform. This hook handles fetching, creating, updating, and analyzing
 * content items across different platforms, supporting the platform's core content
 * relationship mapping feature.
 * 
 * @returns An object containing content state and operations
 */
export const useContent = (): ContentHookReturn => {
  // Access authentication context to get the current user
  const { user } = useAuth();
  
  // Access creator context to get creator profile data
  const { creator } = useCreator();
  
  // Initialize toast notification system for success/error messages
  const toast = useToast();
  
  // Initialize query client for data fetching and cache invalidation
  const queryClient = useQueryClient();
  
  // Query for fetching single content item with caching
  const {
    data: contentData,
    isLoading: contentLoading,
    error: contentError,
    refetch: refetchContent
  } = useQuery<GetContentResponse, Error>(
    ['content'],
    async () => {
      // This query is disabled by default and manually triggered with contentId
      throw new Error('Content ID is required');
    },
    {
      enabled: false, // Disabled by default until manually triggered
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      cacheTime: 15 * 60 * 1000, // Cache data for 15 minutes
    }
  );
  
  // Query for fetching creator content items with filtering
  const {
    data: contentsData,
    isLoading: contentsLoading,
    error: contentsError,
    refetch: refetchContents
  } = useQuery<GetCreatorContentsResponse, Error>(
    ['creatorContents'],
    async () => {
      // This query is disabled by default and manually triggered with filters
      throw new Error('Creator ID is required');
    },
    {
      enabled: false, // Disabled by default until manually triggered
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      cacheTime: 15 * 60 * 1000, // Cache data for 15 minutes
    }
  );
  
  // Mutation for creating new content item
  const createContentMutation = useMutation<
    Content,
    Error,
    CreateContentRequest
  >({
    mutationFn: async (contentData) => {
      if (!user || !creator) {
        throw new Error('Authentication required');
      }
      
      return await api.post<Content>(
        `${API_ENDPOINTS.CONTENT}`,
        contentData
      );
    },
    onSuccess: () => {
      toast.success('Content created successfully');
      queryClient.invalidateQueries(['creatorContents']);
    },
    onError: (error) => {
      toast.error(
        'Failed to create content',
        error.message || 'Please try again later'
      );
    }
  });
  
  // Mutation for updating existing content item
  const updateContentMutation = useMutation<
    Content,
    Error,
    { contentId: string; contentData: UpdateContentRequest }
  >({
    mutationFn: async ({ contentId, contentData }) => {
      if (!user || !creator) {
        throw new Error('Authentication required');
      }
      
      return await api.put<Content>(
        `${API_ENDPOINTS.CONTENT}/${contentId}`,
        contentData
      );
    },
    onSuccess: (data) => {
      toast.success('Content updated successfully');
      queryClient.invalidateQueries(['content', data.id]);
      queryClient.invalidateQueries(['creatorContents']);
    },
    onError: (error) => {
      toast.error(
        'Failed to update content',
        error.message || 'Please try again later'
      );
    }
  });
  
  // Mutation for deleting content item
  const deleteContentMutation = useMutation<
    void,
    Error,
    string
  >({
    mutationFn: async (contentId) => {
      if (!user || !creator) {
        throw new Error('Authentication required');
      }
      
      await api.delete(
        `${API_ENDPOINTS.CONTENT}/${contentId}`
      );
    },
    onSuccess: () => {
      toast.success('Content deleted successfully');
      queryClient.invalidateQueries(['creatorContents']);
    },
    onError: (error) => {
      toast.error(
        'Failed to delete content',
        error.message || 'Please try again later'
      );
    }
  });
  
  // Mutation for analyzing content with AI
  const analyzeContentMutation = useMutation<
    AnalyzeContentResponse,
    Error,
    string
  >({
    mutationFn: async (contentId) => {
      if (!user || !creator) {
        throw new Error('Authentication required');
      }
      
      return await api.post<AnalyzeContentResponse>(
        `${API_ENDPOINTS.CONTENT}/${contentId}/analyze`
      );
    },
    onSuccess: (data) => {
      toast.success(
        'Content analysis complete',
        `Found ${data.suggestedRelationships?.length || 0} potential relationships`
      );
      queryClient.invalidateQueries(['content', data.contentId]);
      queryClient.invalidateQueries(['creatorContents']);
    },
    onError: (error) => {
      toast.error(
        'Failed to analyze content',
        error.message || 'Please try again later'
      );
    }
  });
  
  /**
   * Gets content by ID with error handling
   * @param contentId ID of the content to retrieve
   * @returns Promise resolving to content object or null
   */
  const getContent = useCallback(
    async (contentId: string): Promise<Content | null> => {
      if (!contentId) {
        toast.error('Content ID is required');
        return null;
      }
      
      try {
        const data = await api.get<GetContentResponse>(
          `${API_ENDPOINTS.CONTENT}/${contentId}`
        );
        
        // Update cache with fetched content
        queryClient.setQueryData(['content', contentId], data);
        
        return data.content;
      } catch (err) {
        const error = err as Error;
        toast.error(
          'Failed to fetch content',
          error.message || 'Please try again later'
        );
        return null;
      }
    },
    [toast, queryClient]
  );
  
  /**
   * Gets creator content with filtering options
   * @param filters Optional filters to apply to content query
   * @returns Promise resolving to array of content summaries
   */
  const getCreatorContents = useCallback(
    async (filters?: Partial<GetCreatorContentsRequest>): Promise<ContentSummary[]> => {
      if (!user || !creator) {
        toast.error('Authentication required');
        return [];
      }
      
      try {
        const params: GetCreatorContentsRequest = {
          creatorId: creator.id,
          page: 1,
          limit: 20,
          sortBy: 'publishedAt',
          sortDirection: 'desc',
          ...filters
        };
        
        const data = await api.get<GetCreatorContentsResponse>(
          `${API_ENDPOINTS.CREATORS}/${creator.id}/content`,
          params
        );
        
        // Update cache with fetched content list
        queryClient.setQueryData(['creatorContents', params], data);
        
        return data.contents;
      } catch (err) {
        const error = err as Error;
        toast.error(
          'Failed to fetch creator content',
          error.message || 'Please try again later'
        );
        return [];
      }
    },
    [user, creator, toast, queryClient]
  );
  
  /**
   * Creates new content with validation
   * @param contentData Data for the new content item
   * @returns Promise resolving to the created content
   */
  const createContent = useCallback(
    async (contentData: CreateContentRequest): Promise<Content> => {
      if (!contentData.title?.trim()) {
        throw new Error('Content title is required');
      }
      
      if (!contentData.url?.trim()) {
        throw new Error('Content URL is required');
      }
      
      return await createContentMutation.mutateAsync(contentData);
    },
    [createContentMutation]
  );
  
  /**
   * Updates existing content
   * @param contentId ID of the content to update
   * @param contentData Updated content data
   * @returns Promise resolving to the updated content
   */
  const updateContent = useCallback(
    async (contentId: string, contentData: UpdateContentRequest): Promise<Content> => {
      if (!contentId) {
        throw new Error('Content ID is required');
      }
      
      return await updateContentMutation.mutateAsync({ contentId, contentData });
    },
    [updateContentMutation]
  );
  
  /**
   * Deletes content with confirmation
   * @param contentId ID of the content to delete
   * @returns Promise resolving when deletion is complete
   */
  const deleteContent = useCallback(
    async (contentId: string): Promise<void> => {
      if (!contentId) {
        throw new Error('Content ID is required');
      }
      
      // Confirm deletion to prevent accidental data loss
      if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
        return;
      }
      
      await deleteContentMutation.mutateAsync(contentId);
    },
    [deleteContentMutation]
  );
  
  /**
   * Analyzes content and detect relationships
   * @param contentId ID of the content to analyze
   * @returns Promise resolving to the analysis results
   */
  const analyzeContent = useCallback(
    async (contentId: string): Promise<AnalyzeContentResponse> => {
      if (!contentId) {
        throw new Error('Content ID is required');
      }
      
      return await analyzeContentMutation.mutateAsync(contentId);
    },
    [analyzeContentMutation]
  );
  
  /**
   * Refreshes all content data by invalidating caches
   */
  const refreshContentData = useCallback(
    async (): Promise<void> => {
      await refetchContents();
      
      if (contentData?.content?.id) {
        await refetchContent();
      }
      
      // Invalidate any cached content data
      await api.invalidateQueries(['content', 'creatorContents']);
      
      toast.success('Content data refreshed');
    },
    [refetchContent, refetchContents, contentData, toast, api]
  );
  
  /**
   * Formats content for display
   * @param content Content object to format
   * @returns Formatted content string
   */
  const formatContent = useCallback(
    (content: Content): string => {
      let formattedString = content.title;
      
      if (content.platformType) {
        formattedString += ` | ${content.platformType.charAt(0).toUpperCase() + content.platformType.slice(1)}`;
      }
      
      if (content.contentType) {
        formattedString += ` | ${getContentTypeLabel(content.contentType)}`;
      }
      
      if (content.publishedAt) {
        formattedString += ` | ${new Date(content.publishedAt).toLocaleDateString()}`;
      }
      
      return formattedString;
    },
    []
  );
  
  /**
   * Gets human-readable label for content type
   * @param contentType Content type enum value
   * @returns Human-readable content type label
   */
  const getContentTypeLabel = useCallback(
    (contentType: ContentType): string => {
      const labels: Record<ContentType, string> = {
        [ContentType.VIDEO]: 'Video',
        [ContentType.POST]: 'Post',
        [ContentType.STORY]: 'Story',
        [ContentType.REEL]: 'Reel',
        [ContentType.SHORT]: 'Short',
        [ContentType.TWEET]: 'Tweet',
        [ContentType.ARTICLE]: 'Article',
        [ContentType.PODCAST_EPISODE]: 'Podcast Episode',
        [ContentType.BLOG_POST]: 'Blog Post',
        [ContentType.LIVESTREAM]: 'Livestream'
      };
      
      return labels[contentType] || String(contentType);
    },
    []
  );
  
  // Return object with content state and functions
  return {
    // Data states
    content: contentData?.content || null,
    contentLoading,
    contentError: contentError ? contentError.message : null,
    contents: contentsData?.contents || [],
    contentsLoading,
    contentsError: contentsError ? contentsError.message : null,
    
    // Content operations
    getContent,
    getCreatorContents,
    createContent,
    updateContent,
    deleteContent,
    analyzeContent,
    
    // Helper functions
    formatContent,
    getContentTypeLabel,
    refreshContentData
  };
};