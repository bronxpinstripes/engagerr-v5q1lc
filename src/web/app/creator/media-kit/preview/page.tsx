import React, { useState, useEffect, useCallback } from 'react'; // react v18.0+
import { useParams, useRouter } from 'next/navigation'; // next/navigation v14.0.0
import { ChevronLeft, Download, Share, Printer } from 'lucide-react'; // lucide-react v0.279.0

import DashboardLayout from '../../../../components/layout/DashboardLayout';
import PageHeader from '../../../../components/layout/PageHeader';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent } from '../../../../components/ui/Card';
import { useMediaKit } from '../../../../hooks/useMediaKit';
import { MediaKitExportFormat, type MediaKit } from '../../../../types/media-kit';
import { cn } from '../../../../lib/utils';
import { useToast } from '../../../../hooks/useToast';
import { ContentFamilyVisualization } from '../../../../components/shared/ContentFamilyVisualization';

/**
 * Page component that renders a preview of the creator's media kit
 */
const MediaKitPreviewPage: React.FC = () => {
  // Initialize router for navigation
  const router = useRouter();

  // Extract mediaKitId from URL parameters
  const { mediaKitId } = useParams<{ mediaKitId: string }>();

  // Initialize toast notification functionality
  const toast = useToast();

  // Get media kit operations from useMediaKit hook
  const { getMediaKit, currentMediaKit, isLoading, isExporting, exportMediaKit } = useMediaKit();

  // Set up state for the media kit data and loading states
  const [mediaKit, setMediaKit] = useState<MediaKit | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch media kit data when component mounts using the mediaKitId
  useEffect(() => {
    const fetchMediaKit = async () => {
      setLoading(true);
      try {
        if (mediaKitId) {
          const fetchedMediaKit = await getMediaKit(mediaKitId);
          if (fetchedMediaKit) {
            setMediaKit(fetchedMediaKit);
          } else {
            toast.error('Failed to load media kit', 'Media kit not found');
          }
        }
      } catch (error: any) {
        toast.error('Failed to load media kit', error.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMediaKit();
  }, [mediaKitId, getMediaKit, toast]);

  // Handle loading state with skeleton UI
  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <PageHeader title="Media Kit Preview" />
        <Card>
          <CardContent>Loading media kit...</CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Handle error state with appropriate error message
  if (!mediaKit) {
    return (
      <DashboardLayout>
        <PageHeader title="Media Kit Preview" />
        <Card>
          <CardContent>Error: Media kit not found.</CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  /**
   * Function to handle exporting the media kit in different formats
   * @param format The format to export the media kit in
   */
  const handleExport = useCallback(async (format: MediaKitExportFormat) => {
    try {
      if (mediaKitId) {
        await exportMediaKit(mediaKitId, {
          format: format,
          includeContactInfo: true,
          includeRateCard: true,
        });
        toast.success('Media kit exported successfully');
      }
    } catch (error: any) {
      toast.error('Failed to export media kit', error.message || 'An unexpected error occurred');
    }
  }, [mediaKitId, exportMediaKit, toast]);

  /**
   * Function to return to the media kit edit page
   */
  const handleReturn = () => {
    router.push(`/creator/media-kit/edit/${mediaKitId}`);
  };

  // Render dashboard layout with page header and preview content
  return (
    <DashboardLayout>
      {/* Render page header with navigation and export action buttons */}
      <PageHeader
        title="Media Kit Preview"
        breadcrumbs={[
          { label: 'Media Kit', href: '/creator/media-kit' },
          { label: 'Preview', href: `/creator/media-kit/preview/${mediaKitId}`, active: true },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" onClick={handleReturn}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport(MediaKitExportFormat.PDF)} disabled={isExporting}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Render the media kit content based on selected template */}
      <Card>
        <CardContent className="space-y-4">
          {mediaKit.elements.profile_summary && (
            <MediaKitCreatorDetails mediaKit={mediaKit} />
          )}
          {mediaKit.elements.platform_stats && (
            <MediaKitPlatformStats mediaKit={mediaKit} />
          )}
           {mediaKit.elements.content_showcase && (
            <MediaKitContentShowcase mediaKit={mediaKit} />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

/**
 * Component that renders the creator details section of the media kit
 * @param mediaKit The media kit data
 */
const MediaKitCreatorDetails: React.FC<{ mediaKit: MediaKit }> = ({ mediaKit }) => {
  // Extract creator details from media kit data
  const { name, bio, categories, photo, contact } = mediaKit.creatorDetails;

  // Render creator profile photo, name and bio, categories as tags, and contact information
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">About {name}</h2>
      <div className="flex items-center space-x-4">
        <img src={photo} alt={name} className="w-20 h-20 rounded-full object-cover" />
        <div>
          <p className="text-gray-700">{bio}</p>
          <div className="flex items-center space-x-2 mt-2">
            {categories.map((category) => (
              <span key={category} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
      {contact && <p>Contact: {contact}</p>}
    </div>
  );
};

/**
 * Component that renders the platform statistics section of the media kit
 * @param mediaKit The media kit data
 */
const MediaKitPlatformStats: React.FC<{ mediaKit: MediaKit }> = ({ mediaKit }) => {
  // Filter platform stats that are marked for inclusion
  const includedStats = mediaKit.platformStats.filter((stat) => stat.isIncluded);

  // Render each platform with its icon, handle and metrics
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Platform Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {includedStats.map((stat) => (
          <div key={stat.platformId} className="flex items-center space-x-2">
            <img src={stat.platformIcon} alt={stat.platformType} className="w-6 h-6" />
            <div>
              <p className="font-medium">{stat.handle}</p>
              <p className="text-gray-700">
                {stat.metricName}: {stat.metricValue}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Component that renders the content showcase section of the media kit
 * @param mediaKit The media kit data
 */
const MediaKitContentShowcase: React.FC<{ mediaKit: MediaKit }> = ({ mediaKit }) => {
  // Filter content items that are marked for inclusion
  const includedContent = mediaKit.featuredContent.filter((item) => item.isIncluded);

  // Render each content item with thumbnail, title, and metrics
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Featured Content</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {includedContent.map((item) => (
          <div key={item.contentId} className="border rounded-md overflow-hidden">
            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-40 object-cover" />
            <div className="p-2">
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-gray-700">{item.metricValue}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Function to handle exporting the media kit in different formats
 * @param format The format to export the media kit in
 */
const handleExport = async (format: MediaKitExportFormat): Promise<void> => {
  // TODO: Implement export functionality
  console.log(`Exporting media kit in ${format} format`);
};

/**
 * Function to return to the media kit edit page
 */
const handleReturn = (): void => {
  // TODO: Implement return functionality
  console.log('Returning to media kit edit page');
};

export default MediaKitPreviewPage;