import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react v18.0.0
import { FiPlus, FiX, FiCheck, FiTrash2, FiLink, FiUnlink } from 'react-icons/fi'; // react-icons/fi v4.10.0

import { useContentRelationships } from '../../hooks/useContentRelationships';
import { useContent } from '../../hooks/useContent';
import { useToast } from '../../hooks/useToast';
import { ContentRelationship, RelationshipType, CreationMethod, ContentNode, ContentSuggestion } from '../../types/content';
import ContentFamilyGraph from './ContentFamilyGraph';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';
import { PLATFORM_DISPLAY_INFO } from '../../lib/constants';

/**
 * @interface RelationshipEditorProps
 * @description Props for the RelationshipEditor component.
 */
export interface RelationshipEditorProps {
  /** ID of the content item to manage relationships for */
  contentId: string;
  /** Callback function to trigger when relationships change */
  onChange?: () => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * @function RelationshipEditor
 * @description Main component for editing content relationships.
 * @param {RelationshipEditorProps} props - The props for the component.
 * @returns {JSX.Element} The rendered relationship editor component.
 */
const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  contentId,
  onChange,
  className,
}) => {
  // Initialize state for editing mode, selected relationships, and form values
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<ContentRelationship | null>(null);

  // Use useContentRelationships hook to access relationship data and functions
  const {
    relationships,
    relationshipsLoading,
    relationshipsError,
    suggestions,
    suggestionsLoading,
    suggestionsError,
    getRelationships,
    getRelationshipSuggestions,
    createRelationship,
    updateRelationship,
    deleteRelationship,
    approveRelationshipSuggestion,
    rejectRelationshipSuggestion,
    getRelationshipTypeLabel,
  } = useContentRelationships();

  // Use useContent hook to fetch content data for relationship selection
  const { content, contentLoading, contentError } = useContent();

  // Use useToast hook for displaying success/error notifications
  const toast = useToast();

  // Fetch relationships and suggestions when contentId changes
  useEffect(() => {
    if (contentId) {
      getRelationships(contentId);
      getRelationshipSuggestions(contentId);
    }
  }, [contentId, getRelationships, getRelationshipSuggestions]);

  // Implement handleCreateRelationship function to create new relationships
  const handleCreateRelationship = async (
    sourceContentId: string,
    targetContentId: string,
    relationshipType: RelationshipType
  ) => {
    try {
      await createRelationship({
        sourceContentId,
        targetContentId,
        relationshipType,
        creatorId: content?.creatorId || '',
      });
      setIsCreateMode(false);
      onChange?.();
    } catch (error: any) {
      toast.error('Failed to create relationship', error.message || 'Please try again.');
    }
  };

  // Implement handleUpdateRelationship function to update existing relationships
  const handleUpdateRelationship = async (
    relationshipId: string,
    relationshipType: RelationshipType
  ) => {
    try {
      await updateRelationship(relationshipId, { relationshipType });
      setSelectedRelationship(null);
      onChange?.();
    } catch (error: any) {
      toast.error('Failed to update relationship', error.message || 'Please try again.');
    }
  };

  // Implement handleDeleteRelationship function to delete relationships
  const handleDeleteRelationship = async (relationshipId: string) => {
    try {
      await deleteRelationship(relationshipId);
      onChange?.();
    } catch (error: any) {
      toast.error('Failed to delete relationship', error.message || 'Please try again.');
    }
  };

  // Implement handleApproveRelationshipSuggestion function for AI suggestions
  const handleApproveRelationshipSuggestion = async (suggestionId: string) => {
    try {
      await approveRelationshipSuggestion(suggestionId);
      onChange?.();
    } catch (error: any) {
      toast.error('Failed to approve suggestion', error.message || 'Please try again.');
    }
  };

  // Implement handleRejectRelationshipSuggestion function for AI suggestions
  const handleRejectRelationshipSuggestion = async (suggestionId: string) => {
    try {
      await rejectRelationshipSuggestion(suggestionId);
    } catch (error: any) {
      toast.error('Failed to reject suggestion', error.message || 'Please try again.');
    }
  };

  // Render relationship creation form when in create mode
  const RelationshipForm = () => {
    const [sourceContentId, setSourceContentId] = useState('');
    const [targetContentId, setTargetContentId] = useState('');
    const [relationshipType, setRelationshipType] = useState<RelationshipType>(RelationshipType.CHILD);

    const contentOptions = useMemo(() => {
      return (content?.creatorId) ? [{ label: content.title, value: content.id }] : [];
    }, [content]);

    const handleSubmit = () => {
      if (sourceContentId && targetContentId && relationshipType) {
        handleCreateRelationship(sourceContentId, targetContentId, relationshipType);
      } else {
        toast.error('Please select source, target, and relationship type.');
      }
    };

    return (
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="sourceContentId" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                Source Content
              </label>
              <Select onValueChange={setSourceContentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Source Content" />
                </SelectTrigger>
                <SelectContent>
                  {contentOptions?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="targetContentId" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                Target Content
              </label>
              <Select onValueChange={setTargetContentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Target Content" />
                </SelectTrigger>
                <SelectContent>
                  {contentOptions?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label htmlFor="relationshipType" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
              Relationship Type
            </label>
            <Select onValueChange={(value) => setRelationshipType(value as RelationshipType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Relationship Type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(RelationshipType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {getRelationshipTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsCreateMode(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Create Relationship</Button>
          </div>
        </div>
      </CardContent>
    );
  };

  // Render existing relationships list with edit/delete options
  const RelationshipList = () => {
    if (relationshipsLoading) {
      return <Skeleton count={3} height={40} />;
    }

    if (relationshipsError) {
      return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{relationshipsError}</AlertDescription></Alert>;
    }

    if (!relationships || relationships.length === 0) {
      return <Alert><AlertTitle>No Relationships</AlertTitle><AlertDescription>No relationships found for this content. Start by creating one!</AlertDescription></Alert>;
    }

    return (
      <CardContent>
        <div className="grid gap-4">
          {relationships.map((relationship) => (
            <div key={relationship.id} className="flex items-center justify-between">
              <div>
                {relationship.sourceContent?.title} <FiLink /> {relationship.targetContent?.title} ({getRelationshipTypeLabel(relationship.relationshipType)})
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" onClick={() => setSelectedRelationship(relationship)}>
                  <FiLink className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteRelationship(relationship.id)}>
                  <FiTrash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    );
  };

  // Render AI-suggested relationships with approve/reject options
  const SuggestionList = () => {
    if (suggestionsLoading) {
      return <Skeleton count={3} height={40} />;
    }

    if (suggestionsError) {
      return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{suggestionsError}</AlertDescription></Alert>;
    }

    if (!suggestions || suggestions.length === 0) {
      return <Alert><AlertTitle>No Suggestions</AlertTitle><AlertDescription>No relationship suggestions found for this content.</AlertDescription></Alert>;
    }

    return (
      <CardContent>
        <div className="grid gap-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.suggestedContentId} className="flex items-center justify-between">
              <div>
                {suggestion.sourceContentId} <FiUnlink /> {suggestion.suggestedContent.title} ({getRelationshipTypeLabel(suggestion.relationshipType)})
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleApproveRelationshipSuggestion(suggestion.suggestedContentId)}>
                  <FiCheck className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleRejectRelationshipSuggestion(suggestion.suggestedContentId)}>
                  <FiX className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    );
  };

  // Helper component to display content item information
  interface ContentItemDisplayProps {
    content: ContentNode;
    options?: {
      size?: 'small' | 'medium' | 'large';
    };
  }

  const ContentItemDisplay: React.FC<ContentItemDisplayProps> = ({ content, options }) => {
    return (
      <div className="flex items-center space-x-2">
        <img src={content.content.thumbnail} alt={content.content.title} className="w-10 h-10 rounded-full" />
        <div>
          <h3 className="text-sm font-medium">{content.content.title}</h3>
          <p className="text-xs text-gray-500">{content.platformType} - {content.contentType}</p>
        </div>
      </div>
    );
  };

  // Helper function to get human-readable labels for relationship types
  const getRelationshipTypeLabel = (relationshipType: RelationshipType): string => {
    const labels: Record<RelationshipType, string> = {
      [RelationshipType.PARENT]: 'Parent',
      [RelationshipType.CHILD]: 'Child',
      [RelationshipType.DERIVATIVE]: 'Derivative',
      [RelationshipType.REPURPOSED]: 'Repurposed',
      [RelationshipType.REACTION]: 'Reaction',
      [RelationshipType.REFERENCE]: 'Reference'
    };

    return labels[relationshipType] || String(relationshipType);
  };

  // Render the main component structure
  return (
    <div className={cn("grid gap-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Content Relationships</CardTitle>
          <CardContent>
            <Button onClick={() => setIsCreateMode(true)}>
              <FiPlus className="h-4 w-4 mr-2" />
              Create Relationship
            </Button>
          </CardContent>
        </CardHeader>
        {isCreateMode ? (
          <RelationshipForm />
        ) : (
          <RelationshipList />
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Suggested Relationships</CardTitle>
        </CardHeader>
        <SuggestionList />
      </Card>

      <ContentFamilyGraph contentId={contentId} />
    </div>
  );
};

export default RelationshipEditor;