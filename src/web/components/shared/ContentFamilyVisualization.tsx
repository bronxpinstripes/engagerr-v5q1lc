import React, { useState, useEffect, useMemo, useCallback } from 'react'; // react v18.0.0
import { FiExternalLink } from 'react-icons/fi'; // react-icons v4.10.0

import { useContentRelationships } from '../../hooks/useContentRelationships';
import {
  ContentFamilyVisualizationData,
  ContentNode,
  RelationshipType,
} from '../../types/content';
import { PLATFORM_DISPLAY_INFO } from '../../lib/constants';
import { formatNumber } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';

/**
 * Interface defining the props for the ContentFamilyVisualization component
 */
export interface ContentFamilyVisualizationProps {
  /** ID of the root content item to visualize */
  contentId: string;
  /** Optional CSS class name for styling */
  className?: string;
  /** Maximum number of nodes to display in the visualization */
  maxNodes?: number;
  /** Whether to display the visualization in a compact mode */
  compact?: boolean;
  /** Optional callback function for handling node clicks */
  onNodeClick?: (node: ContentNode) => void;
}

/**
 * Renders a simplified visualization of content family relationships
 */
const ContentFamilyVisualization: React.FC<ContentFamilyVisualizationProps> = ({
  contentId,
  className,
  maxNodes = 10,
  compact = false,
  onNodeClick,
}) => {
  // Initialize useContentRelationships hook to access visualization data
  const { getContentFamily, contentFamily, contentFamilyLoading, contentFamilyError } = useContentRelationships();

  // Fetch content family visualization data when contentId changes
  useEffect(() => {
    if (contentId) {
      getContentFamily(contentId);
    }
  }, [contentId, getContentFamily]);

  // Handle loading state with skeleton UI
  if (contentFamilyLoading) {
    return (
      <Card className={cn("col-span-2", className)}>
        <CardContent className="flex flex-col items-center justify-center p-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Handle error state with alert message
  if (contentFamilyError) {
    return (
      <Card className={cn("col-span-2", className)}>
        <CardContent>
          <Alert variant="error">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load content relationships. {contentFamilyError}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Handle empty state when no content relationships exist
  if (!contentFamily || !contentFamily.childContent || contentFamily.childContent.length === 0) {
    return (
      <Card className={cn("col-span-2", className)}>
        <CardContent className="flex flex-col items-center justify-center p-4">
          <Alert variant="info">
            <AlertTitle>No Content Relationships</AlertTitle>
            <AlertDescription>
              No related content found for this item.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Organize nodes by platform for display
  const groupedNodes = useMemo(() => {
    return groupNodesByPlatform(contentFamily.childContent as any);
  }, [contentFamily]);

  return (
    <Card className={cn("col-span-2", className)}>
      <CardContent className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Content Relationships</h3>
        <div className="flex flex-col gap-2">
          {Object.entries(groupedNodes).map(([platform, nodes]) => (
            <PlatformGroup
              key={platform}
              platform={platform}
              nodes={nodes}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Renders a group of content items for a specific platform
 */
const PlatformGroup: React.FC<{
  platform: string;
  nodes: ContentNode[];
  onNodeClick?: (node: ContentNode) => void;
}> = ({ platform, nodes, onNodeClick }) => {
  // Get platform-specific styling information from PLATFORM_DISPLAY_INFO
  const platformInfo = PLATFORM_DISPLAY_INFO[platform];

  // Apply platform-specific colors and icons
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-sm font-medium flex items-center gap-1">
        {platformInfo?.icon && (
          <platformInfo.icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
        )}
        {platformInfo?.name || platform}
      </h4>
      <div className="flex flex-col pl-2 gap-1">
        {nodes.map((node) => (
          <ContentNodeItem
            key={node.id}
            node={node}
            platformInfo={platformInfo}
            onClick={onNodeClick ? () => onNodeClick(node) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Renders an individual content node with its metrics
 */
const ContentNodeItem: React.FC<{
  node: ContentNode;
  platformInfo: any;
  onClick?: () => void;
}> = ({ node, platformInfo, onClick }) => {
  // Extract relevant data from the content node
  const { content } = node;
  const { views, engagements } = content.metrics || { views: 0, engagements: 0 };

  // Apply appropriate styling based on platform
  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-md hover:bg-gray-100 transition-colors cursor-pointer",
        onClick ? "cursor-pointer" : "",
      )}
      onClick={onClick}
      data-testid="content-node"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium truncate" title={content.title}>
          {content.title}
        </span>
        {content.isRootContent && <span className="text-xs text-gray-500">(Parent)</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{formatNumber(views)} views</span>
        <span>{formatNumber(engagements)} engagements</span>
      </div>
    </div>
  );
};

/**
 * Renders a simple connecting line between related content
 */
const ConnectionLine: React.FC<{ type: RelationshipType }> = ({ type }) => {
  // Determine line style based on relationship type
  const lineStyle =
    type === RelationshipType.CHILD ? "border-l-2 border-gray-300" : "border-t-2 border-gray-300";

  // Render appropriate connection line or arrow
  return <div className={`h-4 w-4 relative ${lineStyle}`} />;
};

/**
 * Returns a human-readable label for relationship types
 */
const getRelationshipTypeLabel = (type: RelationshipType): string => {
  switch (type) {
    case RelationshipType.CHILD:
      return "Child";
    case RelationshipType.DERIVATIVE:
      return "Derivative";
    case RelationshipType.REPURPOSED:
      return "Repurposed";
    default:
      return String(type);
  }
};

/**
 * Groups content nodes by their platform
 */
const groupNodesByPlatform = (nodes: ContentNode[]): Record<string, ContentNode[]> => {
  const grouped: Record<string, ContentNode[]> = {};
  nodes.forEach((node) => {
    const platform = node.platformType;
    if (!grouped[platform]) {
      grouped[platform] = [];
    }
    grouped[platform].push(node);
  });
  return grouped;
};

export default ContentFamilyVisualization;