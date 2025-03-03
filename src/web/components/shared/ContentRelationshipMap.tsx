import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // react v18.0.0
import { FiZoomIn, FiZoomOut, FiMaximize, FiMinimize } from 'react-icons/fi'; // react-icons/fi v4.10.0
import * as d3 from 'd3'; // d3 v7.8.0

import { useContentRelationships } from '../../hooks/useContentRelationships';
import { ContentFamilyVisualizationData, ContentNode, ContentGraph, RelationshipType } from '../../types/content';
import { GraphData, GraphOptions } from '../../types/charts';
import { createContentRelationshipGraph } from '../../lib/charts';
import { PLATFORM_DISPLAY_INFO } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';

/**
 * Interface defining the props for the ContentRelationshipMap component
 */
export interface ContentRelationshipMapProps {
  /** ID of the content item to visualize relationships for */
  contentId: string;
  /** Optional CSS class name for styling */
  className?: string;
  /** Optional height of the visualization */
  height?: number | string;
  /** Optional layout type for the graph */
  layout?: string;
  /** Optional interaction mode for the graph */
  interactionMode?: string;
  /** Whether to show interaction controls */
  showControls?: boolean;
  /** Callback function for node click events */
  onNodeClick?: (node: ContentNode) => void;
}

/**
 * Renders an interactive visualization of content relationships across platforms
 * @param props - The props object containing component configuration
 * @returns The rendered content relationship map component
 */
const ContentRelationshipMap: React.FC<ContentRelationshipMapProps> = ({
  contentId,
  className,
  height = 600,
  layout = 'hierarchical',
  interactionMode = 'focus',
  showControls = true,
  onNodeClick
}) => {
  // Destructure props for easier access

  // Initialize useContentRelationships hook to access visualization data
  const { 
    contentFamily,
    contentFamilyLoading,
    contentFamilyError,
    getVisualizationData
  } = useContentRelationships();

  // Initialize state for zoom level, viewBox, and selected node
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewBox, setViewBox] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ContentNode | null>(null);

  // Create refs for the SVG container and graph element
  const svgRef = useRef<SVGSVGElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  // Fetch content family visualization data when contentId changes
  useEffect(() => {
    if (contentId) {
      getVisualizationData(contentId);
    }
  }, [contentId, getVisualizationData]);

  // Transform visualization data into GraphData format for D3 rendering
  const graphData: GraphData | null = useMemo(() => {
    if (contentFamily?.graph) {
      return transformToGraphData(contentFamily);
    }
    return null;
  }, [contentFamily]);

  // Set up graph options including layout type, interaction settings, and events
  const graphOptions: GraphOptions = useMemo(() => ({
    layout,
    interactive: interactionMode === 'focus',
    zoomable: true,
    collapsible: true,
    onNodeClick: (node: ContentNode) => {
      setSelectedNode(node);
      if (onNodeClick) {
        onNodeClick(node);
      }
    }
  }), [layout, interactionMode, onNodeClick]);

  // Implement zoom functionality with zoom in, zoom out, and reset controls
  const { zoomIn, zoomOut, resetZoom } = useZoom(svgRef, graphRef);

  // Implement fullscreen toggle functionality
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  // Render loading state while data is being fetched
  if (contentFamilyLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="flex items-center justify-center">
          <Skeleton className="w-48 h-8" />
        </CardContent>
      </Card>
    );
  }

  // Render error state if data fetching fails
  if (contentFamilyError) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent>
          <Alert variant="error">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load content relationships.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Render empty state if no visualization data exists
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent>
          <Alert>
            <AlertTitle>No Relationships</AlertTitle>
            <AlertDescription>No content relationships found for this item.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Render the relationship graph using D3 when data is available
  return (
    <Card className={cn("relative h-full", className)} ref={containerRef}>
      <CardContent className="relative">
        <svg 
          ref={svgRef} 
          width="100%" 
          height={height}
        >
          <ContentRelationshipGraphComponent 
            graphData={graphData} 
            graphOptions={graphOptions} 
            setZoomLevel={setZoomLevel} 
            setViewBox={setViewBox} 
            graphRef={graphRef}
          />
        </svg>
      </CardContent>

      {/* Render interaction controls when showControls is true */}
      {showControls && (
        <InteractionControls 
          zoomIn={zoomIn} 
          zoomOut={zoomOut} 
          resetZoom={resetZoom} 
          isFullscreen={isFullscreen} 
          toggleFullscreen={toggleFullscreen} 
        />
      )}

      {/* Render node details panel if a node is selected */}
      {selectedNode && (
        <NodeDetailsPanel 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
        />
      )}
    </Card>
  );
};

export default ContentRelationshipMap;

/**
 * Type definition for the props of the InteractionControls component
 */
interface InteractionControlsProps {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

/**
 * Renders interaction controls for the relationship map
 * @param props - The props object containing control functions and state
 * @returns The rendered control buttons
 */
const InteractionControls: React.FC<InteractionControlsProps> = ({ 
  zoomIn, 
  zoomOut, 
  resetZoom, 
  isFullscreen, 
  toggleFullscreen 
}) => {
  // Render zoom in button with appropriate icon and handler
  // Render zoom out button with appropriate icon and handler
  // Render reset zoom button with appropriate icon and handler
  // Render fullscreen toggle button with appropriate icon based on current state
  // Apply appropriate styling and positioning for controls
  // Add accessibility attributes for all controls
  return (
    <div className="absolute top-2 right-2 flex items-center space-x-2 bg-white rounded-md shadow-md p-2 z-10">
      <button onClick={zoomIn} aria-label="Zoom In" className="p-1 hover:bg-gray-100 rounded-md">
        <FiZoomIn className="h-4 w-4" />
      </button>
      <button onClick={zoomOut} aria-label="Zoom Out" className="p-1 hover:bg-gray-100 rounded-md">
        <FiZoomOut className="h-4 w-4" />
      </button>
      <button onClick={resetZoom} aria-label="Reset Zoom" className="p-1 hover:bg-gray-100 rounded-md">
        Reset
      </button>
      <button onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} className="p-1 hover:bg-gray-100 rounded-md">
        {isFullscreen ? <FiMinimize className="h-4 w-4" /> : <FiMaximize className="h-4 w-4" />}
      </button>
    </div>
  );
};

/**
 * Type definition for the props of the NodeDetailsPanel component
 */
interface NodeDetailsPanelProps {
  node: ContentNode;
  onClose: () => void;
}

/**
 * Displays detailed information about a selected content node
 * @param props - The props object containing the content node and close handler
 * @returns The rendered node details panel
 */
const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ node, onClose }) => {
  // Extract content details from the provided node
  const { content, platformType } = node;

  // Format metrics data for display
  const views = content.metrics?.views || 0;
  const engagements = content.metrics?.engagements || 0;
  const engagementRate = content.metrics?.engagementRate || 0;

  // Apply platform-specific styling based on the content's platform
  const platformInfo = PLATFORM_DISPLAY_INFO[platformType];
  const platformColor = platformInfo?.color || 'gray';

  // Display content title, description, and platform information
  // Show performance metrics with appropriate formatting
  // Display relationship type if applicable
  // Include close button to dismiss the panel
  return (
    <div className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-90 flex items-center justify-center z-20">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
        <p className="text-gray-600 mb-4">{content.description}</p>
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium" style={{ color: platformColor }}>{platformInfo?.name || platformType}</span>
        </div>
        <div className="mb-2">
          <p>Views: {views}</p>
          <p>Engagements: {engagements}</p>
          <p>Engagement Rate: {engagementRate}%</p>
        </div>
        <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md">Close</button>
      </div>
    </div>
  );
};

/**
 * Type definition for the props of the ContentRelationshipGraphComponent component
 */
interface ContentRelationshipGraphComponentProps {
  graphData: GraphData;
  graphOptions: GraphOptions;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  setViewBox: React.Dispatch<React.SetStateAction<string | null>>;
  graphRef: React.RefObject<HTMLDivElement>;
}

/**
 * Renders the D3.js graph visualization
 * @param props - The props object containing graph data, options, and state management functions
 * @returns Null (component directly manipulates the DOM)
 */
const ContentRelationshipGraphComponent: React.FC<ContentRelationshipGraphComponentProps> = ({ 
  graphData, 
  graphOptions, 
  setZoomLevel, 
  setViewBox, 
  graphRef 
}) => {
  // Use a ref to store the D3 graph instance
  const d3GraphRef = useRef<any>(null);

  useEffect(() => {
    if (!graphData || !graphRef.current) return;

    // Clear any existing graph
    d3.select(graphRef.current).selectAll("*").remove();

    // Create the graph visualization
    const { nodes, edges, ...options } = graphData;
    const graph = createContentRelationshipGraph(graphData, graphOptions);

    // Select the graph container and append the graph
    d3.select(graphRef.current)
      .append(() => graph);

    // Store the D3 graph instance in the ref
    d3GraphRef.current = graph;

  }, [graphData, graphOptions, setZoomLevel, setViewBox, graphRef]);

  return null;
};

/**
 * Transforms ContentFamilyVisualizationData to GraphData format for D3
 * @param data - The ContentFamilyVisualizationData to transform
 * @returns Data in format ready for the graph visualization
 */
const transformToGraphData = (data: ContentFamilyVisualizationData): GraphData => {
  // Map ContentNodes to GraphNodes with styling based on platform and metrics
  // Calculate node size based on engagement metrics
  // Apply platform-specific colors from PLATFORM_DISPLAY_INFO
  // Transform relationship edges with appropriate styling
  // Set root node ID for hierarchical layouts
  // Return complete GraphData structure
  const graphNodes = data.graph.nodes.map(node => ({
    id: node.id,
    label: node.label,
    platformType: node.platformType,
    contentType: node.contentType,
    metrics: node.content.metrics,
    size: 40,
    depth: 0,
    parent: '',
    data: node
  }));

  const graphEdges = data.graph.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.relationshipType,
    label: '',
    value: edge.confidence,
    animated: false
  }));

  return {
    nodes: graphNodes,
    edges: graphEdges,
    rootNodeId: data.rootContent.id
  };
};

/**
 * Custom hook for managing zoom functionality
 * @param svgRef - React ref to the SVG element
 * @param graphRef - React ref to the graph container element
 * @returns Zoom controls and state
 */
const useZoom = (svgRef: React.RefObject<SVGSVGElement>, graphRef: React.RefObject<HTMLDivElement>) => {
  // Initialize zoom state with scale and translate values
  const [zoomState, setZoomState] = useState({ scale: 1, translateX: 0, translateY: 0 });

  // Set up D3 zoom behavior with constraints
  const zoom = useMemo(() => {
    return d3.zoom<SVGSVGElement, null>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, null>) => {
        setZoomState({
          scale: event.transform.k,
          translateX: event.transform.x,
          translateY: event.transform.y
        });
      });
  }, []);

  // Implement zoomIn function to increase scale
  const zoomIn = useCallback(() => {
    d3.select(svgRef.current).transition().duration(500).call(zoom.scaleBy, 1.2);
  }, [zoom, svgRef]);

  // Implement zoomOut function to decrease scale
  const zoomOut = useCallback(() => {
    d3.select(svgRef.current).transition().duration(500).call(zoom.scaleBy, 0.8);
  }, [zoom, svgRef]);

  // Implement resetZoom function to return to default view
  const resetZoom = useCallback(() => {
    d3.select(svgRef.current).transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    setZoomState({ scale: 1, translateX: 0, translateY: 0 });
  }, [zoom, svgRef]);

  return {
    zoomState,
    zoomIn,
    zoomOut,
    resetZoom
  };
};

/**
 * Custom hook for managing fullscreen functionality
 * @param containerRef - React ref to the container element
 * @returns Fullscreen state and controls
 */
const useFullscreen = (containerRef: React.RefObject<HTMLDivElement>) => {
  // Track fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Implement enterFullscreen function
  const enterFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).mozRequestFullScreen) { /* Firefox */
        (containerRef.current as any).mozRequestFullScreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) { /* IE/Edge */
        (containerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    }
  }, [containerRef]);

  // Implement exitFullscreen function
  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).mozCancelFullScreen) { /* Firefox */
      (document as any).mozCancelFullScreen();
    } else if ((document as any).webkitExitFullscreen) { /* Chrome, Safari and Opera */
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) { /* IE/Edge */
      (document as any).msExitFullscreen();
    }
    setIsFullscreen(false);
  }, []);

  // Implement toggleFullscreen function
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Handle fullscreenchange event
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement ||
        !!(document as any).mozFullScreenElement ||
        !!(document as any).webkitFullscreenElement ||
        !!(document as any).msFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    // Clean up event listeners on unmount
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Return isFullscreen state and control functions
  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen
  };
};