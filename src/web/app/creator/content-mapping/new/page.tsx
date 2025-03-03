import React from 'react'; // React library for building UI components // react ^18.0.0
import { useState, useCallback } from 'react'; // React hooks for state management and callback memoization // react ^18.0.0
import { useRouter, useSearchParams } from 'next/navigation'; // Next.js navigation hooks for routing and query parameters // next/navigation ^14.0.0
import { ArrowLeft } from 'lucide-react'; // Icon for back button // lucide-react ^0.279.0

import PageHeader from '../../../../components/layout/PageHeader'; // Display page header with title and actions
import ContentAddForm from '../../../../components/creator/ContentAddForm'; // Form for adding new content items and establishing relationships
import Card from '../../../../components/ui/Card'; // Container for content form
import { CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card'; // Card header container, Card title component, Card content container
import Button from '../../../../components/ui/Button'; // UI button component for actions
import { useContent } from '../../../../hooks/useContent'; // Hook for managing content data and operations
import { useContentRelationships } from '../../../../hooks/useContentRelationships'; // Hook for managing content relationship data and operations
import { useToast } from '../../../../hooks/useToast'; // Hook for displaying toast notifications

/**
 * Page component for adding new content items and establishing relationships
 */
const NewContentPage: React.FC = () => {
  // LD1: Initialize router for navigation
  const router = useRouter();

  // LD1: Get search params to extract parentContentId if present
  const searchParams = useSearchParams();

  // LD1: Set up toast notifications using useToast hook
  const { toast } = useToast();

  // LD1: Use useContent hook to access content data and operations
  const { getContent } = useContent();

  // LD1: Use useContentRelationships hook to access relationship data and operations
  const { getContentFamily } = useContentRelationships();

  // LD1: Get parentContentId from URL query parameters if available
  const parentContentId = searchParams?.get('parentContentId') || undefined;

  // LD1: Fetch parent content details if parentContentId is provided
  const [parentContent, setParentContent] = useState(null);

  // LD1: Fetch parent content details if parentContentId is provided
  React.useEffect(() => {
    const fetchParentContent = async () => {
      if (parentContentId) {
        const content = await getContent(parentContentId);
        setParentContent(content);
      }
    };

    fetchParentContent();
  }, [getContent, parentContentId]);

  // LD1: Handle form submission success to return to content mapping page
  const handleFormSuccess = useCallback(() => {
    toast.success('Content added successfully!');
    router.push('/creator/content-mapping');
  }, [router, toast]);

  // LD1: Handle form submission errors with toast notifications
  const handleFormError = useCallback((errorMessage: string) => {
    toast.error('Failed to add content', errorMessage);
  }, [toast]);

  // LD1: Render page header with title and back button
  return (
    <div>
      <PageHeader
        title="Add New Content"
        description="Add content to your profile and establish relationships with existing content."
        breadcrumbs={[
          { label: 'Content Mapping', href: '/creator/content-mapping' },
          { label: 'Add New Content', href: '/creator/content-mapping/new', active: true },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* LD1: Render card containing the content add form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Content</CardTitle>
        </CardHeader>
        <CardContent>
          {/* LD1: Pass parent content ID to the form if available */}
          <ContentAddForm
            parentContentId={parentContentId}
            onSuccess={handleFormSuccess}
            onError={handleFormError}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default NewContentPage;