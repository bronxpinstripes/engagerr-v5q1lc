import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query'; // v5.0.0
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { api } from '../lib/api';
import { API_ENDPOINTS } from '../lib/constants';
import {
  Creator,
  CreatorProfile,
  CreatorSettings,
  CreatorMetrics,
  AudienceDemographics,
  CreatorTeam,
  RateCard,
  GetCreatorRequest,
  GetCreatorResponse,
  UpdateCreatorRequest,
  UpdateCreatorResponse,
  OnboardingState,
  Category
} from '../types/creator';
import {
  User,
  UserType,
  SubscriptionTier,
  SubscriptionStatus,
  VerificationStatus
} from '../types/user';

/**
 * Interface defining the return value of the useCreator hook
 */
export interface CreatorHookReturn {
  // Data
  creator: Creator | null;
  profile: CreatorProfile | null;
  settings: CreatorSettings | null;
  metrics: CreatorMetrics | null;
  audience: AudienceDemographics | null;
  team: CreatorTeam | null;
  rateCard: RateCard | null;
  
  // Status
  isLoading: boolean;
  error: string | null;
  isCreator: boolean;
  onboardingState: OnboardingState;
  
  // Functions
  getCurrentOnboardingStep: () => number;
  updateOnboardingState: (state: OnboardingState) => Promise<void>;
  updateProfile: (profile: Partial<CreatorProfile>) => Promise<CreatorProfile>;
  updateSettings: (settings: Partial<CreatorSettings>) => Promise<CreatorSettings>;
  updateCategories: (categories: Category[]) => Promise<CreatorProfile>;
  uploadProfileImage: (file: File) => Promise<string>;
  uploadCoverImage: (file: File) => Promise<string>;
  refreshCreatorData: () => Promise<void>;
  getCategoryLabel: (category: Category) => string;
  getSubscriptionInfo: () => { tier: SubscriptionTier; status: SubscriptionStatus };
}

/**
 * Custom hook that provides functionality for managing creator profile data, 
 * handling creator-specific operations, and accessing creator-related information
 * throughout the Engagerr application.
 * 
 * @returns A CreatorHookReturn object containing creator state and operations
 */
export const useCreator = (): CreatorHookReturn => {
  // Access current authenticated user
  const { user } = useAuth();
  
  // Initialize React Query client for data invalidation
  const queryClient = useQueryClient();
  
  // Access toast notifications
  const toast = useToast();
  
  // Check if current user is a creator
  const isCreator = useMemo(() => {
    return !!user && user.userType === UserType.CREATOR;
  }, [user]);

  // Query for fetching creator data
  const {
    data: creatorData,
    isLoading,
    error,
    refetch
  } = useQuery<GetCreatorResponse, Error>(
    ['creator', user?.id],
    async () => {
      if (!user || !isCreator) {
        throw new Error('No authenticated creator user');
      }
      
      const params: GetCreatorRequest = {
        creatorId: user.id,
        includeMetrics: true,
        includeAudience: true,
        includeTeam: true,
        includeRateCard: true
      };
      
      return await api.get<GetCreatorResponse>(`${API_ENDPOINTS.CREATORS}/${user.id}`, params);
    },
    {
      enabled: !!user && isCreator,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
      onError: (error) => {
        toast.error(
          'Failed to load creator data',
          error.message || 'Please try again later'
        );
      }
    }
  );

  // Mutation for updating creator profile
  const updateProfileMutation = useMutation<
    CreatorProfile,
    Error,
    Partial<CreatorProfile>
  >({
    mutationFn: async (profileData) => {
      if (!user || !isCreator || !creatorData) {
        throw new Error('No authenticated creator user');
      }
      
      const response = await api.patch<UpdateCreatorResponse>(
        `${API_ENDPOINTS.CREATORS}/${user.id}/profile`,
        profileData
      );
      
      return response.profile;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries(['creator', user?.id]);
    },
    onError: (error) => {
      toast.error(
        'Failed to update profile',
        error.message || 'Please try again later'
      );
    }
  });

  // Mutation for updating creator settings
  const updateSettingsMutation = useMutation<
    CreatorSettings,
    Error,
    Partial<CreatorSettings>
  >({
    mutationFn: async (settingsData) => {
      if (!user || !isCreator || !creatorData) {
        throw new Error('No authenticated creator user');
      }
      
      const response = await api.patch<UpdateCreatorResponse>(
        `${API_ENDPOINTS.CREATORS}/${user.id}/settings`,
        settingsData
      );
      
      return response.settings;
    },
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries(['creator', user?.id]);
    },
    onError: (error) => {
      toast.error(
        'Failed to update settings',
        error.message || 'Please try again later'
      );
    }
  });

  // Mutation for updating onboarding state
  const updateOnboardingStateMutation = useMutation<
    void,
    Error,
    OnboardingState
  >({
    mutationFn: async (state) => {
      if (!user || !isCreator || !creatorData) {
        throw new Error('No authenticated creator user');
      }
      
      await api.patch<UpdateCreatorResponse>(
        `${API_ENDPOINTS.CREATORS}/${user.id}/onboarding`,
        { onboardingState: state }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['creator', user?.id]);
    },
    onError: (error) => {
      toast.error(
        'Failed to update onboarding state',
        error.message || 'Please try again later'
      );
    }
  });

  /**
   * Updates the creator's onboarding state
   * @param state The new onboarding state
   */
  const updateOnboardingState = useCallback(
    async (state: OnboardingState): Promise<void> => {
      await updateOnboardingStateMutation.mutateAsync(state);
    },
    [updateOnboardingStateMutation]
  );

  /**
   * Gets the current step number in the onboarding process
   * @returns A numeric step value (1-based index)
   */
  const getCurrentOnboardingStep = useCallback((): number => {
    if (!creatorData?.creator) return 1;
    
    const stateToStepMap: Record<OnboardingState, number> = {
      [OnboardingState.NOT_STARTED]: 1,
      [OnboardingState.ACCOUNT_CREATED]: 2,
      [OnboardingState.PROFILE_COMPLETED]: 3,
      [OnboardingState.PLATFORM_CONNECTED]: 4,
      [OnboardingState.CONTENT_ANALYZED]: 5,
      [OnboardingState.SUBSCRIPTION_SELECTED]: 6,
      [OnboardingState.COMPLETED]: 7
    };
    
    return stateToStepMap[creatorData.creator.onboardingState] || 1;
  }, [creatorData?.creator]);

  /**
   * Updates the creator's profile information
   * @param profile Partial profile data to update
   * @returns Promise resolving to the updated profile
   */
  const updateProfile = useCallback(
    async (profile: Partial<CreatorProfile>): Promise<CreatorProfile> => {
      return await updateProfileMutation.mutateAsync(profile);
    },
    [updateProfileMutation]
  );

  /**
   * Updates the creator's settings
   * @param settings Partial settings data to update
   * @returns Promise resolving to the updated settings
   */
  const updateSettings = useCallback(
    async (settings: Partial<CreatorSettings>): Promise<CreatorSettings> => {
      return await updateSettingsMutation.mutateAsync(settings);
    },
    [updateSettingsMutation]
  );

  /**
   * Updates the creator's categories
   * @param categories New categories for the creator
   * @returns Promise resolving to the updated profile
   */
  const updateCategories = useCallback(
    async (categories: Category[]): Promise<CreatorProfile> => {
      return await updateProfileMutation.mutateAsync({ categories });
    },
    [updateProfileMutation]
  );

  /**
   * Uploads a new profile image for the creator
   * @param file Image file to upload
   * @returns Promise resolving to the image URL
   */
  const uploadProfileImage = useCallback(
    async (file: File): Promise<string> => {
      if (!user || !isCreator) {
        throw new Error('No authenticated creator user');
      }
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'profile');
      
      try {
        const response = await api.post<{ url: string }>(
          `${API_ENDPOINTS.CREATORS}/${user.id}/upload-image`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        // Update creator profile with new image URL
        await updateProfile({ profileImage: response.url });
        
        toast.success('Profile image uploaded successfully');
        return response.url;
      } catch (err) {
        const error = err as Error;
        toast.error(
          'Failed to upload profile image',
          error.message || 'Please try again later'
        );
        throw error;
      }
    },
    [user, isCreator, updateProfile, toast]
  );

  /**
   * Uploads a new cover image for the creator
   * @param file Image file to upload
   * @returns Promise resolving to the image URL
   */
  const uploadCoverImage = useCallback(
    async (file: File): Promise<string> => {
      if (!user || !isCreator) {
        throw new Error('No authenticated creator user');
      }
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'cover');
      
      try {
        const response = await api.post<{ url: string }>(
          `${API_ENDPOINTS.CREATORS}/${user.id}/upload-image`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        // Update creator profile with new cover image URL
        await updateProfile({ coverImage: response.url });
        
        toast.success('Cover image uploaded successfully');
        return response.url;
      } catch (err) {
        const error = err as Error;
        toast.error(
          'Failed to upload cover image',
          error.message || 'Please try again later'
        );
        throw error;
      }
    },
    [user, isCreator, updateProfile, toast]
  );

  /**
   * Refreshes creator data by triggering a refetch
   */
  const refreshCreatorData = useCallback(async (): Promise<void> => {
    try {
      await refetch();
      toast.success('Creator data refreshed');
    } catch (err) {
      const error = err as Error;
      toast.error(
        'Failed to refresh creator data',
        error.message || 'Please try again later'
      );
    }
  }, [refetch, toast]);

  /**
   * Gets a human-readable label for a category
   * @param category The category enum value
   * @returns A formatted category label
   */
  const getCategoryLabel = useCallback((category: Category): string => {
    const labels: Record<Category, string> = {
      [Category.TECH]: 'Technology',
      [Category.LIFESTYLE]: 'Lifestyle',
      [Category.BEAUTY]: 'Beauty',
      [Category.FASHION]: 'Fashion',
      [Category.FITNESS]: 'Fitness',
      [Category.GAMING]: 'Gaming',
      [Category.FOOD]: 'Food',
      [Category.TRAVEL]: 'Travel',
      [Category.BUSINESS]: 'Business',
      [Category.EDUCATION]: 'Education',
      [Category.ENTERTAINMENT]: 'Entertainment',
      [Category.SPORTS]: 'Sports',
      [Category.OTHER]: 'Other'
    };
    
    return labels[category] || String(category);
  }, []);

  /**
   * Gets subscription information for the creator
   * @returns Object with subscription tier and status
   */
  const getSubscriptionInfo = useCallback(() => {
    return {
      tier: creatorData?.creator?.subscriptionTier || SubscriptionTier.FREE,
      status: creatorData?.creator?.subscriptionStatus || SubscriptionStatus.ACTIVE
    };
  }, [creatorData?.creator]);

  // Extract onboarding state with fallback to NOT_STARTED
  const onboardingState = useMemo(
    () => creatorData?.creator?.onboardingState || OnboardingState.NOT_STARTED,
    [creatorData?.creator?.onboardingState]
  );

  // Return the hook's API
  return {
    // Creator data
    creator: creatorData?.creator || null,
    profile: creatorData?.profile || null,
    settings: creatorData?.settings || null,
    metrics: creatorData?.metrics || null,
    audience: creatorData?.audience || null,
    team: creatorData?.team || null,
    rateCard: creatorData?.rateCard || null,
    
    // Status
    isLoading,
    error: error ? error.message : null,
    isCreator,
    onboardingState,
    
    // Functions
    getCurrentOnboardingStep,
    updateOnboardingState,
    updateProfile,
    updateSettings,
    updateCategories,
    uploadProfileImage,
    uploadCoverImage,
    refreshCreatorData,
    getCategoryLabel,
    getSubscriptionInfo
  };
};