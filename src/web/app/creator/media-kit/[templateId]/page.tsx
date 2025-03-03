import React, { useState, useEffect } from 'react'; // React library for building UI components // react v18.0+
import { notFound, useRouter, useParams } from 'next/navigation'; // Next.js functions for routing and handling 404 errors // next/navigation v14.0.0
import { Save, ArrowLeft, Eye } from 'lucide-react'; // Icon components for UI elements // lucide-react v0.279.0
import { PageHeader } from '../../../../components/layout/PageHeader'; // Page header component for consistent title and actions area
import { Button } from '../../../../components/ui/Button'; // Button component for actions like saving or canceling
import { MediaKitGenerator } from '../../../../components/creator/MediaKitGenerator'; // Main component for creating and editing media kits
import { useMediaKit } from '../../../../hooks/useMediaKit'; // Hook for managing media kit operations and state
import { useToast } from '../../../../hooks/useToast'; // Hook for displaying toast notifications
import { MediaKitTemplateId, type MediaKit, type MediaKitFormData } from '../../../../types/media-kit'; // Type definitions for media kit functionality

/**
 * @description Main component for editing a specific media kit template
 * @returns JSX.Element Rendered page component
 */
const MediaKitTemplatePage: React.FC = () => {
  // Extract templateId from URL parameters using useParams
  const { templateId } = useParams<{ templateId: string }>();

  // Validate templateId
  if (!Object.values(MediaKitTemplateId).includes(templateId as MediaKitTemplateId)) {
    notFound();
    return null;
  }

  // Initialize state for isLoading to track data loading status
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get router for navigation using useRouter
  const router = useRouter();

  // Get toast function from useToast hook
  const { toast } = useToast();

  // Get mediaKit operations from useMediaKit hook (getMediaKit, updateMediaKit, etc.)
  const { getMediaKit, updateMediaKit } = useMediaKit();

  // Initialize state for mediaKit data
  const [mediaKitData, setMediaKitData] = useState<MediaKit | null>(null);

  // Fetch the media kit data using the templateId on component mount
  useEffect(() => {
    const fetchMediaKit = async () => {
      setIsLoading(true);
      try {
        const mediaKit = await getMediaKit(templateId as string);
        if (mediaKit) {
          setMediaKitData(mediaKit);
        } else {
          notFound(); // Handle not found case if template doesn't exist
        }
      } catch (error) {
        console.error('Failed to fetch media kit:', error);
        toast({
          title: 'Failed to load media kit.',
          description: 'Please try again later.',
          type: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMediaKit();
  }, [templateId, getMediaKit, toast]);

  // Handle not found case if template doesn't exist
  if (!templateId) {
    notFound();
    return null;
  }

  /**
   * @description Handles saving changes to the media kit
   * @param MediaKitFormData formData
   * @returns Promise<void> Async function with no return value
   */
  const handleSave = async (formData: MediaKitFormData): Promise<void> => {
    try {
      // Call updateMediaKit with templateId and form data
      if (mediaKitData?.id) {
        await updateMediaKit(mediaKitData.id, formData);
        // Show success toast notification
        toast({
          title: 'Media kit updated successfully.',
        });
      }
      // Navigate back to media kit list page
      router.push('/creator/media-kit');
    } catch (error: any) {
      toast({
        title: 'Failed to save media kit.',
        description: error.message,
        type: 'error',
      });
    }
  };

  /**
   * @description Handles canceling the edit operation
   * @returns void No return value
   */
  const handleCancel = (): void => {
    // Navigate back to media kit list page
    router.push('/creator/media-kit');
  };

  /**
   * @description Handles navigating to the preview page
   * @returns void No return value
   */
  const handlePreview = (): void => {
    // Navigate to preview page with templateId as a parameter
    router.push(`/creator/media-kit/${templateId}/preview`);
  };

  // Render loading state when isLoading is true
  if (isLoading || !mediaKitData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Render PageHeader with title and action buttons (Save, Preview, Cancel) */}
      <PageHeader
        title="Edit Media Kit"
        breadcrumbs={[
          { label: 'Media Kits', href: '/creator/media-kit' },
          { label: 'Edit', href: `/creator/media-kit/${templateId}`, active: true },
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </>
        }
      />
      {/* Render MediaKitGenerator component with initialData, onSave and onCancel props */}
      <MediaKitGenerator
        initialData={mediaKitData}
        onSave={handleSave}
        onCancel={handleCancel}
        isEditing={true} // Pass isEditing={true} to MediaKitGenerator to enable edit mode
      />
    </div>
  );
};

export default MediaKitTemplatePage;