import React from 'react'; // react v18.0.0
import { notFound, useParams } from 'next/navigation'; // next/navigation v14.0.0

import DashboardLayout from '../../../../components/layout/DashboardLayout';
import { useContent } from '../../../../hooks/useContent';
import { useContentRelationships } from '../../../../hooks/useContentRelationships';
import ContentFamilyGraph from '../../../../components/creator/ContentFamilyGraph';
import RelationshipEditor from '../../../../components/creator/RelationshipEditor';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../../components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../../../components/ui/Alert';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Button } from '../../../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/Tabs';

/**
 * @function ContentMappingDetailPage
 * @description Main page component for displaying content mapping details for a specific content item
 * @returns {JSX.Element} The rendered content mapping detail page
 */
const ContentMappingDetailPage: React.FC = () => {
  // LD1: Access contentId from URL parameters using useParams hook
  const { contentId } = useParams<{ contentId: string }>();

  // LD1: Initialize useContent hook to fetch content data
  const {
    content,
    contentLoading,
    contentError,
  } = useContent();

  // LD1: Initialize useContentRelationships hook to fetch relationship data
  const {
    getContentFamily,
    getVisualizationData,
    getRelationshipSuggestions,
  } = useContentRelationships();

  // LD1: Fetch content details when component mounts or contentId changes
  React.useEffect(() => {
    if (contentId) {
      content.getContent(contentId);
    }
  }, [contentId, content.getContent]);

  // LD1: Fetch content relationships when component mounts or contentId changes
  React.useEffect(() => {
    if (contentId) {
      getContentFamily(contentId);
      getVisualizationData(contentId);
      getRelationshipSuggestions(contentId);
    }
  }, [contentId, getContentFamily, getVisualizationData, getRelationshipSuggestions]);

  // LD1: Handle loading states while data is being fetched
  if (contentLoading) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Content Mapping</CardTitle>
            <CardDescription>Loading content details...</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton height={40} width={200} />
            <Skeleton height={300} />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // LD1: Handle error states if content or relationship data fails to load
  if (contentError) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Content Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{contentError}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // LD1: Redirect to 404 page if content doesn't exist
  if (!content.content) {
    notFound();
  }

  // LD1: Render page title and description with content information
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Content Mapping</CardTitle>
          <CardDescription>
            Manage relationships for: {content.content.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* LD1: Render tab interface to switch between visualization and editor views */}
          <Tabs defaultValue="visualization" className="w-full">
            <TabsList>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
              <TabsTrigger value="editor">Editor</TabsTrigger>
            </TabsList>
            <TabsContent value="visualization">
              {/* LD1: Render ContentFamilyGraph component in the visualization tab */}
              <ContentFamilyGraph contentId={contentId} />
            </TabsContent>
            <TabsContent value="editor">
              {/* LD1: Render RelationshipEditor component in the editor tab */}
              <RelationshipEditor contentId={contentId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// IE3: Export the page component as the default export
export default ContentMappingDetailPage;