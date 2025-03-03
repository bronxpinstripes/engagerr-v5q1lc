import React, { useEffect, useState, useCallback, useRef } from 'react'; // react v18.0.0
import * as d3 from 'd3'; // d3 v7.8.0
import { ZoomIn, ZoomOut, RefreshCw, Plus, Minus } from 'lucide-react'; // lucide-react v0.279.0

import { useContentRelationships } from '../../hooks/useContentRelationships';
import { useContent } from '../../hooks/useContent';
import {
  ContentNode,
  RelationshipEdge,
  ContentFamily,
  ContentFamilyVisualizationData,
  ContentType,
} from '../../types/content';
import { PlatformType } from '../../types/platform';
import { Card, CardContent, Button } from '../../components/ui/Card';
import { cn } from '../../lib/utils';

/**
 * @interface ContentFamilyGraphProps
 * @description Props interface for the ContentFamilyGraph component.
 */
interface ContentFamilyGraphProps {
  contentId: string;
  data?: ContentFamilyVisualizationData;
  interactive?: boolean;
  width?: number;
  height?: number;
  onNodeSelect?: (node: ContentNode) => void;
  options?: GraphOptions;
  className?: string;
}

/**
 * @interface GraphOptions
 * @description Options for customizing the graph visualization.
 */
interface GraphOptions {
  showLabels?: boolean;
  enableZoom?: boolean;
  enableDrag?: boolean;
  showControls?: boolean;
  nodeSizeScale?: number;
  linkDistance?: number;
  colors?: {
    [platform in PlatformType]?: string;
  };
}

/**
 * @function ContentFamilyGraph
 * @description A functional React component that renders an interactive visualization of content relationships.
 * @param {ContentFamilyGraphProps} props - The props for the component.
 * @returns {JSX.Element} The rendered component.
 */
const ContentFamilyGraph: React.FC<ContentFamilyGraphProps> = ({
  contentId,
  data: initialData,
  interactive = true,
  width = 800,
  height = 600,
  onNodeSelect,
  options = {
    showLabels: true,
    enableZoom: true,
    enableDrag: true,
    showControls: true,
    nodeSizeScale: 1,
    linkDistance: 100,
    colors: {
      [PlatformType.YOUTUBE]: '#FF0000',
      [PlatformType.INSTAGRAM]: '#E1306C',
      [PlatformType.TIKTOK]: '#000000',
      [PlatformType.TWITTER]: '#1DA1F2',
      [PlatformType.LINKEDIN]: '#0A66C2',
      [PlatformType.PODCAST]: '#8940FA',
    },
  },
  className,
}) => {
  // Create a ref for the graph container element
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Set up state for loading, error, selected node, and expanded nodes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ContentNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Set up state for zoom level and graph data
  const [zoomLevel, setZoomLevel] = useState(1);
  const [graphData, setGraphData] = useState<ContentFamilyVisualizationData | null>(initialData || null);

  // Import the useContentRelationships hook to fetch and manage content relationship data
  const { getContentFamily, getVisualizationData } = useContentRelationships();

  // Use useEffect to fetch content family data when contentId changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const familyData = await getVisualizationData(contentId);
        setGraphData(familyData);
      } catch (err: any) {
        setError(err.message || 'Failed to load content family');
      } finally {
        setLoading(false);
      }
    };

    if (contentId) {
      fetchData();
    }
  }, [contentId, getVisualizationData]);

  // Use useEffect to initialize and update the graph when data or dimensions change
  useEffect(() => {
    if (graphContainerRef.current && graphData) {
      updateGraph(graphData, options);
    }
  }, [graphData, options]);

  // Define zoom control handlers (zoom in, zoom out, reset)
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prevZoom) => Math.min(prevZoom + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prevZoom) => Math.max(prevZoom - 0.2, 0.2));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
  }, []);

  /**
   * @function initializeGraph
   * @description Initializes the D3.js force-directed graph visualization.
   * @param {HTMLElement} container - The container element for the graph.
   * @param {ContentFamilyVisualizationData} data - The data for the graph.
   * @param {GraphOptions} options - Options for customizing the graph.
   * @returns {void} No return value.
   */
  const initializeGraph = useCallback((
    container: HTMLElement,
    data: ContentFamilyVisualizationData,
    options: GraphOptions
  ) => {
    // Clear any existing SVG elements from the container
    d3.select(container).select('svg').remove();

    // Create a new SVG element with the specified dimensions
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create a zoom behavior and attach it to the SVG
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        graphGroup.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create a container group for all graph elements with zoom transform
    const graphGroup = svg.append('g');

    // Create arrow markers for directional links
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 13)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 13)
      .attr('markerHeight', 13)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#ddd');

    // Initialize the force simulation with appropriate forces
    const simulation = d3.forceSimulation<ContentNode>(data.graph.nodes)
      .force('link', d3.forceLink<ContentNode, RelationshipEdge>(data.graph.edges)
        .id(d => d.id)
        .distance(options.linkDistance || 100)
        .strength(d => d.confidence || 0.5))
      .force('charge', d3.forceManyBody().strength(-50 * (options?.nodeSizeScale || 1)))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Create link elements with styling based on relationship type
    const links = graphGroup.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.graph.edges)
      .enter()
      .append('line')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => getRelationshipStrokeStyle(d.relationshipType))
      .attr('marker-end', 'url(#arrowhead)');

    // Create node elements with platform-specific styling
    const nodes = graphGroup.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data.graph.nodes)
      .enter()
      .append('circle')
      .attr('r', d => (d.isRoot ? 12 : 8) * (options?.nodeSizeScale || 1))
      .attr('fill', d => getPlatformColor(d.platformType))
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, ContentNode, any>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add labels to nodes with content titles
    if (options.showLabels) {
      graphGroup.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(data.graph.nodes)
        .enter()
        .append('text')
        .text(d => d.label)
        .attr('x', d => (d.isRoot ? 15 : 10) * (options?.nodeSizeScale || 1))
        .attr('y', 5)
        .style('text-anchor', 'start')
        .style('font-size', '12px')
        .style('font-family', 'sans-serif')
        .style('fill', '#555')
        .style('pointer-events', 'none');
    }

    // Add event listeners for node interactions (click, drag, hover)
    nodes.on('click', handleNodeClick);

    // Start the force simulation to position nodes and links
    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as ContentNode).x || 0)
        .attr('y1', d => (d.source as ContentNode).y || 0)
        .attr('x2', d => (d.target as ContentNode).x || 0)
        .attr('y2', d => (d.target as ContentNode).y || 0);

      nodes
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);
    });

    // Stop simulation when it cools down
    simulation.alpha(1).restart();
  }, [handleNodeClick, height, width]);

  /**
   * @function handleNodeClick
   * @description Handles the click event on a graph node to expand/collapse child nodes and show details.
   * @param {Event} event - The click event.
   * @param {ContentNode} node - The clicked node.
   * @returns {void} No return value.
   */
  const handleNodeClick = useCallback((event: any, node: ContentNode) => {
    // Prevent default click behavior
    event.stopPropagation();

    // If node has children and is collapsed, expand to show children
    // If node is already expanded, collapse to hide children
    if (expandedNodes.has(node.id)) {
      expandedNodes.delete(node.id);
    } else {
      expandedNodes.add(node.id);
    }

    // If onNodeSelect callback is provided, call it with the selected node
    onNodeSelect?.(node);
    setSelectedNode(node);

    // Update the expanded/collapsed nodes state
    setExpandedNodes(new Set(expandedNodes));
  }, [expandedNodes, onNodeSelect]);

  /**
   * @function updateGraph
   * @description Updates the graph visualization when data or options change.
   * @param {ContentFamilyVisualizationData} data - The data for the graph.
   * @param {GraphOptions} options - Options for customizing the graph.
   * @returns {void} No return value.
   */
  const updateGraph = useCallback((
    data: ContentFamilyVisualizationData,
    options: GraphOptions
  ) => {
    // Check if container element and data exist
    if (!graphContainerRef.current || !data) return;

    // Clear the existing graph
    d3.select(graphContainerRef.current).select('svg').remove();

    // Initialize a new graph with updated data and options
    initializeGraph(graphContainerRef.current, data, options);

  }, [initializeGraph]);

  /**
   * @function getPlatformColor
   * @description Returns the appropriate color for a node based on its platform.
   * @param {PlatformType} platform - The platform type.
   * @returns {string} Color hex code or CSS variable reference.
   */
  const getPlatformColor = useCallback((platform: PlatformType): string => {
    // Map platform types to predefined color values
    const platformColors: { [key in PlatformType]: string } = {
      [PlatformType.YOUTUBE]: options.colors?.[PlatformType.YOUTUBE] || '#FF0000',
      [PlatformType.INSTAGRAM]: options.colors?.[PlatformType.INSTAGRAM] || '#E1306C',
      [PlatformType.TIKTOK]: options.colors?.[PlatformType.TIKTOK] || '#000000',
      [PlatformType.TWITTER]: options.colors?.[PlatformType.TWITTER] || '#1DA1F2',
      [PlatformType.LINKEDIN]: options.colors?.[PlatformType.LINKEDIN] || '#0A66C2',
      [PlatformType.PODCAST]: options.colors?.[PlatformType.PODCAST] || '#8940FA',
    };

    // Return the corresponding color for the platform
    return platformColors[platform] || '#888'; // Default color
  }, [options.colors]);

  /**
   * @function getRelationshipStrokeStyle
   * @description Returns the appropriate stroke style for a link based on relationship type.
   * @param {RelationshipType} relationshipType - The relationship type.
   * @returns {string} SVG stroke-dasharray value.
   */
  const getRelationshipStrokeStyle = useCallback((relationshipType: RelationshipType): string => {
    // Map relationship types to stroke patterns (solid, dashed, dotted, etc.)
    const relationshipStyles: { [key in RelationshipType]: string } = {
      [RelationshipType.PARENT]: 'none',
      [RelationshipType.CHILD]: '3,3',
      [RelationshipType.DERIVATIVE]: '5,5',
      [RelationshipType.REPURPOSED]: '7,7',
      [RelationshipType.REACTION]: '9,9',
      [RelationshipType.REFERENCE]: '11,11',
    };

    // Return the corresponding stroke pattern
    return relationshipStyles[relationshipType] || 'none'; // Default solid line
  }, []);

  // Render loading state while data is being fetched
  if (loading) {
    return <div>Loading content family graph...</div>;
  }

  // Render error state if data fetching fails
  if (error) {
    return <div>Error: {error}</div>;
  }

  // Render the graph container with appropriate dimensions
  return (
    <Card className={cn("col-span-2", className)}>
      <CardContent>
        {options.showControls && (
          <div className="flex justify-end space-x-2 mb-2">
            <Button variant="outline" size="icon" onClick={handleZoomIn} aria-label="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut} aria-label="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomReset} aria-label="Reset Zoom">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div ref={graphContainerRef} style={{ width: '100%', height: '400px' }} />
      </CardContent>
    </Card>
  );
};

export default ContentFamilyGraph;