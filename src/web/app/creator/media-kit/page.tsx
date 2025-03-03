import React, { useState, useEffect } from 'react'; // React library for building UI components // react v18.0+
import { Plus, FileEdit, Trash2, Share, Eye } from 'lucide-react'; // Icon components for UI elements // lucide-react v0.279.0
import Link from 'next/link'; // Next.js link component for navigation // ^14.0.0
import { useRouter } from 'next/navigation'; // Next.js hook for programmatic navigation // ^14.0.0

import PageHeader from '../../../../components/layout/PageHeader'; // Page header component for consistent title and actions area
import { Button } from '../../../../components/ui/Button'; // Button component for actions like creating new media kits
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../../components/ui/Card'; // Card components for displaying media kit items
import { MediaKitGenerator } from '../../../../components/creator/MediaKitGenerator'; // Main component for creating and editing media kits
import { useMediaKit } from '../../../../hooks/useMediaKit'; // Hook for managing media kit operations and state
import { useToast } from '../../../../hooks/useToast'; // Hook for displaying toast notifications
import { cn } from '../../../../lib/utils'; // Utility for conditionally joining class names

/**
 * @description Main component for the Media Kit page showing a list of existing media kits and options to create new ones
 */
const MediaKitPage: React.FC = () => {
  // Initialize state for isCreating to control the visibility of the media kit generator
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Initialize state for currentEditingId to track which media kit is being edited
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);

  // Get mediaKits, loading states, and media kit functions from useMediaKit hook
  const { mediaKits, isLoading, deleteMediaKit, exportMediaKit, listMediaKits } = useMediaKit();

  // Get toast function from useToast hook
  const { toast } = useToast();

  // Get router from useRouter hook
  const router = useRouter();

  // Set up useEffect to fetch media kits when the component mounts
  useEffect(() => {
    listMediaKits();
  }, [listMediaKits]);

  /**
   * @description Define handleCreate function to show the media kit generator
   * @returns void
   */
  const handleCreate = () => {
    setIsCreating(true);
  };

  /**
   * @description Define handleEdit function to navigate to the edit page for a specific media kit
   * @param string mediaKitId
   * @returns void
   */
  const handleEdit = (mediaKitId: string) => {
    setCurrentEditingId(mediaKitId);
    router.push(`/creator/media-kit/${mediaKitId}/edit`);
  };

  /**
   * @description Define handleSave function to handle saving a new media kit
   * @param object newMediaKit
   * @returns void
   */
  const handleSave = (newMediaKit: any) => {
    setIsCreating(false);
    setCurrentEditingId(null);
    router.refresh();
  };

  /**
   * @description Define handleCancel function to hide the media kit generator
   * @returns void
   */
  const handleCancel = () => {
    setIsCreating(false);
    setCurrentEditingId(null);
  };

  /**
   * @description Define handleDelete function to delete a media kit with confirmation
   * @param string mediaKitId
   * @returns void
   */
  const handleDelete = async (mediaKitId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this media kit?');
    if (confirmed) {
      try {
        await deleteMediaKit(mediaKitId);
        toast({
          title: 'Media kit deleted successfully.',
        });
        router.refresh();
      } catch (error: any) {
        toast({
          title: 'Failed to delete media kit.',
          description: error.message,
          type: 'error',
        });
      }
    }
  };

  /**
   * @description Define handleExport function to export a media kit
   * @param string mediaKitId
   * @returns void
   */
  const handleExport = async (mediaKitId: string) => {
    try {
      await exportMediaKit(mediaKitId, { format: 'pdf', includeContactInfo: true, includeRateCard: true });
      toast({
        title: 'Media kit exported successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to export media kit.',
        description: error.message,
        type: 'error',
      });
    }
  };

  /**
   * @description Define handleView function to navigate to the preview page
   * @param string mediaKitId
   * @returns void
   */
  const handleView = (mediaKitId: string) => {
    router.push(`/creator/media-kit/${mediaKitId}/preview`);
  };

  // Render page with PageHeader component including title and create button
  return (
    <div>
      <PageHeader
        title="Media Kits"
        description="Create and manage media kits to showcase your profile, metrics, and content to potential brand partners."
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Media Kit
          </Button>
        }
      />

      {/* Render media kit generator when isCreating is true */}
      {isCreating && (
        <MediaKitGenerator
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Render loading state when isLoading is true */}
      {isLoading && <p>Loading media kits...</p>}

      {/* Render empty state when no media kits exist */}
      {!isLoading && mediaKits && mediaKits.length === 0 && (
        <Card>
          <CardContent>
            <p>No media kits created yet. Click the button above to create one!</p>
          </CardContent>
        </Card>
      )}

      {/* Render grid of media kit cards with thumbnail, name, and action buttons */}
      {!isLoading && mediaKits && mediaKits.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {mediaKits.map((mediaKit) => (
            <Card key={mediaKit.id}>
              <CardHeader>
                <CardTitle>{mediaKit.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Placeholder for media kit thumbnail */}
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md mb-2">
                  {/* You can replace this with an actual thumbnail image */}
                  <img
                    src={mediaKit.coverImage || 'https://via.placeholder.com/640x360'}
                    alt="Media Kit Thumbnail"
                    className="object-cover w-full h-full"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleView(mediaKit.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(mediaKit.id)}>
                    <FileEdit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(mediaKit.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Include pagination if there are many media kits */}
    </div>
  );
};

export default MediaKitPage;