import { useState, useEffect, useCallback } from 'react'; // react v18.0+
import { useAuth } from '../hooks/useAuth';
import { useCreator } from '../hooks/useCreator';
import { useAnalytics } from '../hooks/useAnalytics';
import { api } from '../lib/api';
import {
  MediaKitTemplateId,
  MediaKitElementType,
  MediaKitExportFormat,
  type MediaKit,
  type MediaKitFormData,
  type MediaKitExportOptions,
  type GetMediaKitRequest,
  type GetMediaKitResponse,
  type ListMediaKitsRequest,
  type ListMediaKitsResponse,
} from '../types/media-kit';

/**
 * Custom hook for managing media kits for creators
 * @returns Media kit state and operations
 */
const useMediaKit = () => {
  // Initialize state for mediaKits array
  const [mediaKits, setMediaKits] = useState<MediaKit[]>([]);

  // Initialize state for currentMediaKit object
  const [currentMediaKit, setCurrentMediaKit] = useState<MediaKit | null>(null);

  // Initialize loading states (isLoading, isCreating, isUpdating, isDeleting, isExporting)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Initialize error state
  const [error, setError] = useState<any>(null);

  // Get authenticated user using useAuth hook
  const { user } = useAuth();

  // Get creator data using useCreator hook
  const { creator } = useCreator();

  // Get analytics data using useAnalytics hook
  const { creatorMetrics } = useAnalytics();

  /**
   * Fetches all media kits for the current creator
   * @param options 
   * @returns Promise<MediaKit[]>: Array of media kits
   */
  const listMediaKits = useCallback(async (options?: { limit?: number; offset?: number }) => {
    // Set isLoading state to true
    setIsLoading(true);

    try {
      // Prepare request parameters with creator ID
      const params: ListMediaKitsRequest = {
        creatorId: creator?.id || '',
        limit: options?.limit,
        offset: options?.offset,
      };

      // Make API call to fetch media kits list
      const response: ListMediaKitsResponse = await api.get('/api/media-kits', params);

      // Handle API response and update mediaKits state
      setMediaKits(response.mediaKits);
    } catch (error: any) {
      // Handle errors and set error state if needed
      setError(error);
    } finally {
      // Set isLoading state to false
      setIsLoading(false);
    }

    // Return fetched media kits
    return mediaKits;
  }, [creator?.id, mediaKits]);

  /**
   * Fetches a specific media kit by ID
   * @param mediaKitId 
   * @returns Promise<MediaKit>: The requested media kit
   */
  const getMediaKit = useCallback(async (mediaKitId: string) => {
    // Set isLoading state to true
    setIsLoading(true);

    try {
      // Prepare request parameters with media kit ID
      const params: GetMediaKitRequest = {
        mediaKitId,
        creatorId: creator?.id || '',
      };

      // Make API call to fetch specific media kit
      const response: GetMediaKitResponse = await api.get(`/api/media-kits/${mediaKitId}`, params);

      // Update currentMediaKit state with fetched data
      setCurrentMediaKit(response.mediaKit);
    } catch (error: any) {
      // Handle errors and set error state if needed
      setError(error);
    } finally {
      // Set isLoading state to false
      setIsLoading(false);
    }

    // Return fetched media kit
    return currentMediaKit;
  }, [creator?.id, currentMediaKit]);

  /**
   * Creates a new media kit for the creator
   * @param mediaKitData 
   * @returns Promise<MediaKit>: The newly created media kit
   */
  const createMediaKit = useCallback(async (mediaKitData: MediaKitFormData) => {
    // Set isCreating state to true
    setIsCreating(true);

    try {
      // Format and prepare form data for API
      const formData = new FormData();
      formData.append('name', mediaKitData.name);
      formData.append('templateId', mediaKitData.templateId);
      formData.append('elements', JSON.stringify(mediaKitData.elements));
      formData.append('creatorDetails', JSON.stringify(mediaKitData.creatorDetails));
      formData.append('platformStats', JSON.stringify(mediaKitData.platformStats));
      formData.append('featuredContent', JSON.stringify(mediaKitData.featuredContent));
      formData.append('isPublic', String(mediaKitData.isPublic));

      // Process and upload any file attachments (cover image, etc.)
      if (mediaKitData.coverImage) {
        formData.append('coverImage', mediaKitData.coverImage);
      }

      // Make API call to create media kit
      const response: GetMediaKitResponse = await api.post('/api/media-kits', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update mediaKits state with new media kit
      setMediaKits((prevMediaKits) => [...prevMediaKits, response.mediaKit]);

      // Set currentMediaKit to the newly created kit
      setCurrentMediaKit(response.mediaKit);

      return response.mediaKit;
    } catch (error: any) {
      // Handle errors and set error state if needed
      setError(error);
      throw error;
    } finally {
      // Set isCreating state to false
      setIsCreating(false);
    }
  }, []);

  /**
   * Updates an existing media kit
   * @param mediaKitId 
   * @param mediaKitData 
   * @returns Promise<MediaKit>: The updated media kit
   */
  const updateMediaKit = useCallback(async (mediaKitId: string, mediaKitData: MediaKitFormData) => {
    // Set isUpdating state to true
    setIsUpdating(true);

    try {
      // Format and prepare form data for API
      const formData = new FormData();
      formData.append('name', mediaKitData.name);
      formData.append('templateId', mediaKitData.templateId);
      formData.append('elements', JSON.stringify(mediaKitData.elements));
      formData.append('creatorDetails', JSON.stringify(mediaKitData.creatorDetails));
      formData.append('platformStats', JSON.stringify(mediaKitData.platformStats));
      formData.append('featuredContent', JSON.stringify(mediaKitData.featuredContent));
      formData.append('isPublic', String(mediaKitData.isPublic));

      // Process and upload any file attachments (cover image, etc.)
      if (mediaKitData.coverImage) {
        formData.append('coverImage', mediaKitData.coverImage);
      }

      // Make API call to update media kit
      const response: GetMediaKitResponse = await api.patch(`/api/media-kits/${mediaKitId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update mediaKits state with updated media kit
      setMediaKits((prevMediaKits) =>
        prevMediaKits.map((mk) => (mk.id === mediaKitId ? response.mediaKit : mk))
      );

      // Update currentMediaKit state
      setCurrentMediaKit(response.mediaKit);

      return response.mediaKit;
    } catch (error: any) {
      // Handle errors and set error state if needed
      setError(error);
      throw error;
    } finally {
      // Set isUpdating state to false
      setIsUpdating(false);
    }
  }, []);

  /**
   * Deletes a media kit
   * @param mediaKitId 
   * @returns Promise<boolean>: Success status
   */
  const deleteMediaKit = useCallback(async (mediaKitId: string) => {
    // Set isDeleting state to true
    setIsDeleting(true);

    try {
      // Make API call to delete media kit
      await api.delete(`/api/media-kits/${mediaKitId}`);

      // Remove deleted media kit from mediaKits state
      setMediaKits((prevMediaKits) => prevMediaKits.filter((mk) => mk.id !== mediaKitId));

      // If current media kit is deleted, clear currentMediaKit state
      if (currentMediaKit?.id === mediaKitId) {
        setCurrentMediaKit(null);
      }

      return true;
    } catch (error: any) {
      // Handle errors and set error state if needed
      setError(error);
      return false;
    } finally {
      // Set isDeleting state to false
      setIsDeleting(false);
    }
  }, [currentMediaKit?.id]);

  /**
   * Exports a media kit in the specified format
   * @param mediaKitId 
   * @param options 
   * @returns Promise<string>: URL to exported media kit
   */
  const exportMediaKit = useCallback(async (mediaKitId: string, options: MediaKitExportOptions) => {
    // Set isExporting state to true
    setIsExporting(true);

    try {
      // Prepare export options (format, include contact info, include rate card)
      const exportOptions = {
        format: options.format,
        includeContactInfo: options.includeContactInfo,
        includeRateCard: options.includeRateCard,
      };

      // Make API call to export media kit
      const response: { url: string } = await api.post(`/api/media-kits/${mediaKitId}/export`, exportOptions);

      // Generate appropriate file or link based on format
      if (options.format === MediaKitExportFormat.WEB_LINK) {
        // Handle copy link based on export format
        return response.url;
      } else {
        // Handle download or 
        return response.url;
      }
    } catch (error: any) {
      // Handle errors and set error state if needed
      setError(error);
      throw error;
    } finally {
      // Set isExporting state to false
      setIsExporting(false);
    }
  }, []);

  /**
   * Utility function to pre-fill media kit data from creator profile and analytics
   * @returns MediaKitFormData: Pre-populated media kit data
   */
  const populateMediaKitData = useCallback(() => {
    // Check if creator data is available
    if (!creator) {
      return null;
    }

    // Extract creator profile information (name, bio, photo, etc.)
    const { profileImage, bio, categories } = creator;
    const name = creator.user.fullName;
    const contact = creator.user.email;

    // Check if analytics data is available
    if (!creatorMetrics) {
      return null;
    }

    // Extract platform statistics from analytics
    // Extract audience demographics from analytics
    // Extract top-performing content for content showcase

    // Format data to match media kit structure
    const populatedData: MediaKitFormData = {
      name: `${name}'s Media Kit`,
      templateId: MediaKitTemplateId.PROFESSIONAL,
      coverImage: profileImage,
      elements: {
        [MediaKitElementType.PROFILE_SUMMARY]: true,
        [MediaKitElementType.PLATFORM_STATS]: true,
        [MediaKitElementType.AUDIENCE_DEMOGRAPHICS]: true,
        [MediaKitElementType.CONTENT_SHOWCASE]: true,
      },
      creatorDetails: {
        name,
        bio,
        categories,
        photo: profileImage,
        contact,
      },
      platformStats: [],
      featuredContent: [],
      isPublic: false,
    };

    // Return populated media kit form data
    return populatedData;
  }, [creator, creatorMetrics]);

  // Return state variables and functions as hook result
  return {
    mediaKits,
    currentMediaKit,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isExporting,
    error,
    listMediaKits,
    getMediaKit,
    createMediaKit,
    updateMediaKit,
    deleteMediaKit,
    exportMediaKit,
    populateMediaKitData,
  };
};

export default useMediaKit;