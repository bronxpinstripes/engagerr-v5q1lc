import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import useAuth from './useAuth';
import { api } from '../lib/api';
import useToast from './useToast';
import { API_ROUTES } from '../lib/constants';
import {
  Brand,
  BrandProfile,
  BrandSettings,
  BrandPreferences,
  Industry,
  CreateBrandInput,
  UpdateBrandInput,
  BrandStatistics,
  BrandDashboardData,
  SavedSearch,
  SearchFilters,
  RecommendedCreator
} from '../types/brand';
import { UserType } from '../types/user';

/**
 * Interface defining the return value of the useBrand hook
 */
export interface BrandHookReturn {
  // Brand state
  brand: Brand | undefined;
  brandLoading: boolean;
  brandError: Error | null;
  brandId: string | undefined;
  
  // Dashboard data
  dashboardData: BrandDashboardData | undefined;
  dashboardLoading: boolean;
  
  // Statistics
  statistics: BrandStatistics | undefined;
  statisticsLoading: boolean;
  
  // Profile data
  brandProfile: BrandProfile | undefined;
  profileLoading: boolean;
  
  // Saved searches
  savedSearches: SavedSearch[] | undefined;
  savedSearchesLoading: boolean;
  
  // Recommended creators
  recommendedCreators: RecommendedCreator[] | undefined;
  recommendedCreatorsLoading: boolean;
  
  // Data fetching functions
  fetchBrand: () => void;
  fetchDashboard: () => void;
  fetchStatistics: () => void;
  fetchProfile: () => void;
  fetchSavedSearches: () => void;
  fetchRecommendedCreators: () => void;
  
  // Data mutation functions
  createBrand: (data: CreateBrandInput) => Promise<Brand>;
  updateBrand: (data: UpdateBrandInput) => Promise<Brand>;
  updateSettings: (settings: Partial<BrandSettings>) => Promise<Brand>;
  updatePreferences: (preferences: Partial<BrandPreferences>) => Promise<Brand>;
  saveSearch: (name: string, filters: SearchFilters) => Promise<SavedSearch>;
  deleteSearch: (searchId: string) => Promise<void>;
  
  // Helper functions
  isBrandUser: boolean;
  verifyBrandUser: () => boolean;
}

/**
 * Custom React hook that provides comprehensive brand management functionality for the Engagerr platform,
 * allowing access to brand profile data, statistics, and operations for managing brand information and preferences.
 * 
 * @returns Object containing brand state and management functions
 */
const useBrand = (): BrandHookReturn => {
  // Get authentication state using useAuth hook
  const { user } = useAuth();
  
  // Access toast notification system for feedback messages
  const toast = useToast();
  
  // Get React Query queryClient for cache invalidation
  const queryClient = useQueryClient();
  
  // Helper function to verify if the user is a brand
  const verifyBrandUser = useCallback(() => {
    return user?.userType === UserType.BRAND;
  }, [user]);
  
  // Computed property for quick brand type check
  const isBrandUser = useMemo(() => verifyBrandUser(), [verifyBrandUser]);
  
  // Helper to get current user ID
  const userId = useMemo(() => {
    if (user) {
      return user.id;
    }
    return undefined;
  }, [user]);
  
  // Query: Fetch current brand data
  const brandQuery = useQuery(
    ['brand', userId],
    async () => {
      if (!userId || !isBrandUser) return undefined;
      // Get brand by user ID
      return await api.get<Brand>(`${API_ROUTES.BRANDS}/user/${userId}`);
    },
    {
      enabled: !!userId && isBrandUser,
      onError: (error: any) => {
        toast.error('Failed to load brand data', error.message);
      }
    }
  );
  
  // Derived brandId from the brand query result
  const brandId = useMemo(() => {
    return brandQuery.data?.id;
  }, [brandQuery.data]);
  
  // Query: Fetch brand dashboard data
  const dashboardQuery = useQuery(
    ['brandDashboard', brandId],
    async () => {
      if (!brandId) return undefined;
      return await api.get<BrandDashboardData>(`${API_ROUTES.BRANDS}/${brandId}/dashboard`);
    },
    {
      enabled: !!brandId,
      onError: (error: any) => {
        toast.error('Failed to load dashboard data', error.message);
      }
    }
  );
  
  // Query: Fetch brand statistics
  const statisticsQuery = useQuery(
    ['brandStatistics', brandId],
    async () => {
      if (!brandId) return undefined;
      return await api.get<BrandStatistics>(`${API_ROUTES.BRANDS}/${brandId}/statistics`);
    },
    {
      enabled: !!brandId,
      onError: (error: any) => {
        toast.error('Failed to load brand statistics', error.message);
      }
    }
  );
  
  // Query: Fetch brand profile
  const profileQuery = useQuery(
    ['brandProfile', brandId],
    async () => {
      if (!brandId) return undefined;
      return await api.get<BrandProfile>(`${API_ROUTES.BRANDS}/${brandId}/profile`);
    },
    {
      enabled: !!brandId,
      onError: (error: any) => {
        toast.error('Failed to load brand profile', error.message);
      }
    }
  );
  
  // Query: Fetch saved searches
  const savedSearchesQuery = useQuery(
    ['savedSearches', brandId],
    async () => {
      if (!brandId) return undefined;
      return await api.get<SavedSearch[]>(`${API_ROUTES.BRANDS}/${brandId}/saved-searches`);
    },
    {
      enabled: !!brandId,
      onError: (error: any) => {
        toast.error('Failed to load saved searches', error.message);
      }
    }
  );
  
  // Query: Fetch recommended creators
  const recommendedCreatorsQuery = useQuery(
    ['recommendedCreators', brandId],
    async () => {
      if (!brandId) return undefined;
      return await api.get<RecommendedCreator[]>(`${API_ROUTES.BRANDS}/${brandId}/recommended-creators`);
    },
    {
      enabled: !!brandId,
      onError: (error: any) => {
        toast.error('Failed to load recommended creators', error.message);
      }
    }
  );
  
  // Mutation: Create brand
  const createBrandMutation = useMutation<Brand, Error, CreateBrandInput>(
    (data) => api.post<Brand>(API_ROUTES.BRANDS, data),
    {
      onSuccess: (data) => {
        toast.success('Brand profile created successfully');
        queryClient.invalidateQueries(['brand', userId]);
      },
      onError: (error: any) => {
        toast.error('Failed to create brand profile', error.message);
      }
    }
  );
  
  // Mutation: Update brand
  const updateBrandMutation = useMutation<Brand, Error, UpdateBrandInput>(
    (data) => {
      if (!brandId) throw new Error('Brand ID is required');
      return api.put<Brand>(`${API_ROUTES.BRANDS}/${brandId}`, data);
    },
    {
      onSuccess: (data) => {
        toast.success('Brand profile updated successfully');
        queryClient.invalidateQueries(['brand', userId]);
        queryClient.invalidateQueries(['brandProfile', brandId]);
      },
      onError: (error: any) => {
        toast.error('Failed to update brand profile', error.message);
      }
    }
  );
  
  // Mutation: Update brand settings
  const updateSettingsMutation = useMutation<Brand, Error, Partial<BrandSettings>>(
    (settings) => {
      if (!brandId) throw new Error('Brand ID is required');
      return api.put<Brand>(`${API_ROUTES.BRANDS}/${brandId}/settings`, settings);
    },
    {
      onSuccess: (data) => {
        toast.success('Brand settings updated successfully');
        queryClient.invalidateQueries(['brand', userId]);
      },
      onError: (error: any) => {
        toast.error('Failed to update brand settings', error.message);
      }
    }
  );
  
  // Mutation: Update discovery preferences
  const updatePreferencesMutation = useMutation<Brand, Error, Partial<BrandPreferences>>(
    (preferences) => {
      if (!brandId) throw new Error('Brand ID is required');
      return api.put<Brand>(`${API_ROUTES.BRANDS}/${brandId}/preferences`, preferences);
    },
    {
      onSuccess: (data) => {
        toast.success('Discovery preferences updated successfully');
        queryClient.invalidateQueries(['brand', userId]);
      },
      onError: (error: any) => {
        toast.error('Failed to update discovery preferences', error.message);
      }
    }
  );
  
  // Mutation: Save search
  const saveSearchMutation = useMutation<
    SavedSearch,
    Error,
    { name: string; filters: SearchFilters }
  >(
    ({ name, filters }) => {
      if (!brandId) throw new Error('Brand ID is required');
      return api.post<SavedSearch>(`${API_ROUTES.BRANDS}/${brandId}/saved-searches`, { name, filters });
    },
    {
      onSuccess: (data) => {
        toast.success('Search saved successfully');
        queryClient.invalidateQueries(['savedSearches', brandId]);
      },
      onError: (error: any) => {
        toast.error('Failed to save search', error.message);
      }
    }
  );
  
  // Mutation: Delete search
  const deleteSearchMutation = useMutation<void, Error, string>(
    (searchId) => {
      if (!brandId) throw new Error('Brand ID is required');
      return api.delete(`${API_ROUTES.BRANDS}/${brandId}/saved-searches/${searchId}`);
    },
    {
      onSuccess: () => {
        toast.success('Search deleted successfully');
        queryClient.invalidateQueries(['savedSearches', brandId]);
      },
      onError: (error: any) => {
        toast.error('Failed to delete search', error.message);
      }
    }
  );
  
  // Convenience function wrappers for refetching data
  const fetchBrand = useCallback(() => {
    if (userId && isBrandUser) {
      brandQuery.refetch();
    }
  }, [userId, isBrandUser, brandQuery]);
  
  const fetchDashboard = useCallback(() => {
    if (brandId) {
      dashboardQuery.refetch();
    }
  }, [brandId, dashboardQuery]);
  
  const fetchStatistics = useCallback(() => {
    if (brandId) {
      statisticsQuery.refetch();
    }
  }, [brandId, statisticsQuery]);
  
  const fetchProfile = useCallback(() => {
    if (brandId) {
      profileQuery.refetch();
    }
  }, [brandId, profileQuery]);
  
  const fetchSavedSearches = useCallback(() => {
    if (brandId) {
      savedSearchesQuery.refetch();
    }
  }, [brandId, savedSearchesQuery]);
  
  const fetchRecommendedCreators = useCallback(() => {
    if (brandId) {
      recommendedCreatorsQuery.refetch();
    }
  }, [brandId, recommendedCreatorsQuery]);
  
  // Wrapper functions for mutations
  const createBrand = useCallback(
    async (data: CreateBrandInput): Promise<Brand> => {
      return await createBrandMutation.mutateAsync(data);
    },
    [createBrandMutation]
  );
  
  const updateBrand = useCallback(
    async (data: UpdateBrandInput): Promise<Brand> => {
      return await updateBrandMutation.mutateAsync(data);
    },
    [updateBrandMutation]
  );
  
  const updateSettings = useCallback(
    async (settings: Partial<BrandSettings>): Promise<Brand> => {
      return await updateSettingsMutation.mutateAsync(settings);
    },
    [updateSettingsMutation]
  );
  
  const updatePreferences = useCallback(
    async (preferences: Partial<BrandPreferences>): Promise<Brand> => {
      return await updatePreferencesMutation.mutateAsync(preferences);
    },
    [updatePreferencesMutation]
  );
  
  const saveSearch = useCallback(
    async (name: string, filters: SearchFilters): Promise<SavedSearch> => {
      return await saveSearchMutation.mutateAsync({ name, filters });
    },
    [saveSearchMutation]
  );
  
  const deleteSearch = useCallback(
    async (searchId: string): Promise<void> => {
      await deleteSearchMutation.mutateAsync(searchId);
    },
    [deleteSearchMutation]
  );
  
  // Return all the necessary data and functions
  return {
    // Brand state data
    brand: brandQuery.data,
    brandLoading: brandQuery.isLoading,
    brandError: brandQuery.error as Error | null,
    brandId,
    
    // Dashboard data
    dashboardData: dashboardQuery.data,
    dashboardLoading: dashboardQuery.isLoading,
    
    // Statistics
    statistics: statisticsQuery.data,
    statisticsLoading: statisticsQuery.isLoading,
    
    // Profile data
    brandProfile: profileQuery.data,
    profileLoading: profileQuery.isLoading,
    
    // Saved searches
    savedSearches: savedSearchesQuery.data,
    savedSearchesLoading: savedSearchesQuery.isLoading,
    
    // Recommended creators
    recommendedCreators: recommendedCreatorsQuery.data,
    recommendedCreatorsLoading: recommendedCreatorsQuery.isLoading,
    
    // Data fetching functions
    fetchBrand,
    fetchDashboard,
    fetchStatistics,
    fetchProfile,
    fetchSavedSearches,
    fetchRecommendedCreators,
    
    // Data mutation functions
    createBrand,
    updateBrand,
    updateSettings,
    updatePreferences,
    saveSearch,
    deleteSearch,
    
    // Helper functions
    isBrandUser,
    verifyBrandUser
  };
};

export default useBrand;