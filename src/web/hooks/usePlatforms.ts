import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query'; // v5.0.0
import { api } from '../lib/api';
import useAuth from './useAuth';
import useToast from './useToast';
import { 
  PlatformType, 
  AuthStatus, 
  ConnectPlatformParams, 
  DisconnectPlatformParams, 
  PlatformOAuthResult, 
  PlatformSyncStatus, 
  type Platform, 
  type PlatformMetrics, 
  type PlatformConnectionError, 
  type PlatformSyncResult 
} from '../types/platform';

/**
 * Interface for the platforms management API returned by usePlatforms hook
 */
export interface PlatformsAPI {
  /** List of connected platforms for the current creator */
  platforms: Platform[];
  /** Whether platforms data is currently loading */
  isLoading: boolean;
  /** Any error that occurred during platforms data fetching */
  error: Error | null;
  /** Function to manually refetch platforms data */
  refetch: () => Promise<void>;
  /** Function to generate OAuth URL for platform connection */
  getOAuthUrl: (platformType: PlatformType, redirectUrl: string) => Promise<string>;
  /** Function to connect a platform with OAuth */
  connectPlatform: (params: ConnectPlatformParams) => Promise<PlatformOAuthResult>;
  /** Function to disconnect a platform */
  disconnectPlatform: (params: DisconnectPlatformParams) => Promise<{ success: boolean }>;
  /** Function to sync platform content */
  syncPlatformContent: (platformId: string, options?: object) => Promise<PlatformSyncResult>;
  /** Function to retrieve platform performance metrics */
  getPlatformMetrics: (platformId: string, timeRange?: object) => Promise<PlatformMetrics>;
  /** Whether a platform connection is in progress */
  isConnecting: boolean;
  /** Whether a platform disconnection is in progress */
  isDisconnecting: boolean;
  /** Whether a platform content sync is in progress */
  isSyncing: boolean;
}

/**
 * Custom hook for managing social platform connections and data
 * Provides functions for connecting, disconnecting, syncing, and querying platforms
 * @returns Platform management functions and data
 */
const usePlatforms = (): PlatformsAPI => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();
  
  // Create a query key for platforms data
  const platformsQueryKey = user ? [`creator-platforms-${user.id}`] : null;
  
  /**
   * Fetches connected platforms for the current creator
   * @param creatorId The ID of the creator to fetch platforms for
   * @returns List of connected platforms
   */
  const fetchPlatforms = async (creatorId: string): Promise<Platform[]> => {
    if (!creatorId) {
      return [];
    }
    
    try {
      const response = await api.get<Platform[]>(`/api/creators/${creatorId}/platforms`);
      return response;
    } catch (error) {
      throw error;
    }
  };
  
  // Set up React Query for platforms data
  const { 
    data: platforms = [], 
    isLoading, 
    error: queryError, 
    refetch: reactQueryRefetch 
  } = useQuery(
    platformsQueryKey,
    () => fetchPlatforms(user?.id || ''),
    {
      enabled: !!user?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    }
  );
  
  // Ensure error is of the correct type
  const error = queryError ? (queryError as Error) : null;
  
  /**
   * Generates OAuth URL for platform connection
   * @param platformType Type of platform to connect
   * @param redirectUrl URL to redirect after OAuth flow
   * @returns OAuth authorization URL
   */
  const getOAuthUrl = async (platformType: PlatformType, redirectUrl: string): Promise<string> => {
    try {
      const response = await api.get<{ url: string }>('/api/platforms/oauth/url', {
        params: {
          platformType,
          redirectUrl
        }
      });
      
      return response.url;
    } catch (error) {
      toast.error('Failed to generate authentication URL', 'Please try again later.');
      throw error;
    }
  };
  
  // Mutation for connecting a platform
  const { mutateAsync: connectPlatform, isLoading: isConnecting } = useMutation<
    PlatformOAuthResult,
    Error,
    ConnectPlatformParams
  >(
    async (params: ConnectPlatformParams) => {
      try {
        const response = await api.post<PlatformOAuthResult>('/api/platforms/connect', params);
        
        // Show a success toast on successful connection
        if (response.success) {
          toast.success(
            `${params.platformType} connected successfully!`,
            'Your content will be synchronized automatically.'
          );
        }
        
        return response;
      } catch (error) {
        // Show an error toast
        toast.error(
          `Failed to connect ${params.platformType}`,
          error instanceof Error ? error.message : 'An unexpected error occurred.'
        );
        throw error;
      }
    },
    {
      onSuccess: () => {
        // Invalidate platforms query to refetch the updated list
        if (platformsQueryKey) {
          api.invalidateQueries(platformsQueryKey);
        }
      },
    }
  );
  
  // Mutation for disconnecting a platform
  const { mutateAsync: disconnectPlatform, isLoading: isDisconnecting } = useMutation<
    { success: boolean },
    Error,
    DisconnectPlatformParams
  >(
    async (params: DisconnectPlatformParams) => {
      try {
        const response = await api.delete<{ success: boolean }>(`/api/platforms/${params.platformId}`);
        
        // Show a success toast on successful disconnection
        toast.success(
          'Platform disconnected',
          'The platform has been successfully disconnected from your account.'
        );
        
        return response;
      } catch (error) {
        // Show an error toast
        toast.error(
          'Failed to disconnect platform',
          error instanceof Error ? error.message : 'An unexpected error occurred.'
        );
        throw error;
      }
    },
    {
      onSuccess: () => {
        // Invalidate platforms query to refetch the updated list
        if (platformsQueryKey) {
          api.invalidateQueries(platformsQueryKey);
        }
      },
    }
  );
  
  // Mutation for syncing platform content
  const { mutateAsync: syncContent, isLoading: isSyncing } = useMutation<
    PlatformSyncResult,
    Error,
    { platformId: string; options?: object }
  >(
    async ({ platformId, options }) => {
      try {
        const response = await api.post<PlatformSyncResult>(
          `/api/platforms/${platformId}/sync`,
          options || {}
        );
        
        // Show a success toast on successful sync
        if (response.status === PlatformSyncStatus.COMPLETED) {
          toast.success(
            'Content synchronized',
            `${response.newContentCount} new items and ${response.updatedContentCount} updated items.`
          );
        }
        
        return response;
      } catch (error) {
        // Show an error toast
        toast.error(
          'Failed to synchronize content',
          error instanceof Error ? error.message : 'An unexpected error occurred.'
        );
        throw error;
      }
    }
  );
  
  /**
   * Sync platform content with optional settings
   * @param platformId ID of the platform to sync
   * @param options Optional sync configuration
   * @returns Result of the sync operation
   */
  const syncPlatformContent = useCallback(
    async (platformId: string, options?: object): Promise<PlatformSyncResult> => {
      return await syncContent({ platformId, options });
    },
    [syncContent]
  );
  
  /**
   * Retrieves performance metrics for a platform
   * @param platformId ID of the platform to get metrics for
   * @param timeRange Optional time range for metrics
   * @returns Platform performance metrics
   */
  const getPlatformMetrics = useCallback(
    async (platformId: string, timeRange?: object): Promise<PlatformMetrics> => {
      try {
        const response = await api.get<PlatformMetrics>(
          `/api/platforms/${platformId}/metrics`, 
          { params: timeRange }
        );
        return response;
      } catch (error) {
        toast.error(
          'Failed to fetch platform metrics',
          error instanceof Error ? error.message : 'An unexpected error occurred.'
        );
        throw error;
      }
    },
    [toast]
  );
  
  /**
   * Refetch platforms data
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (platformsQueryKey) {
      await queryClient.invalidateQueries(platformsQueryKey);
    }
  }, [queryClient, platformsQueryKey]);
  
  return {
    platforms,
    isLoading,
    error,
    refetch,
    getOAuthUrl,
    connectPlatform,
    disconnectPlatform,
    syncPlatformContent,
    getPlatformMetrics,
    isConnecting,
    isDisconnecting,
    isSyncing,
  };
};

export default usePlatforms;