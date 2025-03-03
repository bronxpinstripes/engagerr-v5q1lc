/**
 * Chart Types
 * 
 * This file contains TypeScript definitions for chart components and data structures used throughout the 
 * Engagerr platform. It provides type safety for various visualizations including line charts, bar charts,
 * pie charts, and specialized content relationship graphs.
 */

import { PlatformType } from './platform';
import { ContentType } from './content';

/**
 * Enumeration of supported chart types
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  RADAR = 'radar',
  GRAPH = 'graph',
  METRIC_CARD = 'metric_card',
  VENN = 'venn'
}

/**
 * Enumeration of chart color themes
 */
export enum ChartTheme {
  LIGHT = 'light',
  DARK = 'dark',
  BRANDED = 'branded',
  PLATFORM_SPECIFIC = 'platform_specific'
}

/**
 * Interface for individual data points in a chart
 */
export interface DataPoint {
  /** Label for this data point */
  label: string;
  /** Primary value for this data point */
  value: number;
  /** Optional secondary value for this data point */
  secondaryValue?: number;
  /** Optional date for time-series data */
  date?: Date;
  /** Optional custom color for this data point */
  color?: string;
  /** Optional platform type for platform-specific styling */
  platformType?: PlatformType;
  /** Optional content type for content-specific styling */
  contentType?: ContentType;
  /** Optional additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Interface for a series of data in a chart
 */
export interface ChartDataSeries {
  /** Unique identifier for this series */
  id: string;
  /** Display name for this series */
  name: string;
  /** Array of data points in this series */
  data: DataPoint[];
  /** Optional custom color for this series */
  color?: string;
  /** Whether this series is visible */
  visible?: boolean;
  /** Optional platform type for platform-specific styling */
  platformType?: PlatformType;
  /** Optional content type for content-specific styling */
  contentType?: ContentType;
}

/**
 * Interface for chart data structure
 */
export interface ChartData {
  /** Array of data series to display in the chart */
  series: ChartDataSeries[];
  /** Optional array of category labels for categorical charts */
  categories?: string[];
  /** Optional chart title */
  title?: string;
  /** Optional chart subtitle */
  subtitle?: string;
  /** Optional x-axis label */
  xAxisLabel?: string;
  /** Optional y-axis label */
  yAxisLabel?: string;
}

/**
 * Configuration for chart axes
 */
export interface AxisConfig {
  /** Data key/field name used for this axis */
  dataKey?: string;
  /** Type of axis (e.g., 'category', 'number', 'time') */
  type?: string;
  /** Axis label */
  label?: string;
  /** Axis domain (min/max values) */
  domain?: number[];
  /** Custom tick formatter function */
  tickFormatter?: (value: any) => string;
  /** Number of ticks to display */
  tickCount?: number;
  /** Whether to hide this axis */
  hide?: boolean;
}

/**
 * Configuration for chart tooltips
 */
export interface TooltipConfig {
  /** Whether tooltips are enabled */
  enabled?: boolean;
  /** Custom tooltip value formatter */
  formatter?: (value: any, name: string, props: any) => string;
  /** Custom tooltip label formatter */
  labelFormatter?: (label: any) => string;
  /** Custom tooltip content component */
  customContent?: React.ReactNode | ((props: any) => React.ReactNode);
}

/**
 * Configuration for chart legends
 */
export interface LegendConfig {
  /** Whether legend is enabled */
  enabled?: boolean;
  /** Legend position (e.g., 'top', 'right', 'bottom', 'left') */
  position?: string;
  /** Legend alignment (e.g., 'start', 'center', 'end') */
  align?: string;
  /** Custom legend formatter */
  formatter?: (value: string) => string;
}

/**
 * Options for configuring chart appearance and behavior
 */
export interface ChartOptions {
  /** Type of chart to display */
  type: ChartType;
  /** Chart color theme */
  theme?: ChartTheme;
  /** Custom color palette */
  colors?: string[];
  /** Whether to stack data series (for applicable chart types) */
  stacked?: boolean;
  /** Chart aspect ratio (width/height) */
  aspectRatio?: number;
  /** Explicit chart height */
  height?: number;
  /** Explicit chart width */
  width?: number;
  /** Chart margins */
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Tooltip configuration */
  tooltip?: TooltipConfig;
  /** Legend configuration */
  legend?: LegendConfig;
  /** Whether to display grid lines */
  grid?: boolean;
  /** Whether to animate the chart */
  animation?: boolean;
  /** Click handler for chart elements */
  onClick?: (data: any, index: number) => void;
  /** Click handler for legend items */
  onLegendClick?: (data: any) => void;
}

/**
 * Node in content relationship graph visualization
 */
export interface GraphNode {
  /** Unique identifier for this node */
  id: string;
  /** Display label for this node */
  label: string;
  /** Platform type for this content node */
  platformType: PlatformType;
  /** Content type for this node */
  contentType: ContentType;
  /** Performance metrics for this content */
  metrics?: Record<string, number>;
  /** Optional image/thumbnail URL */
  image?: string;
  /** Node size for visualization (relative to other nodes) */
  size?: number;
  /** Node color */
  color?: string;
  /** X position (if using fixed positioning) */
  x?: number;
  /** Y position (if using fixed positioning) */
  y?: number;
  /** Hierarchy depth level */
  depth?: number;
  /** Parent node ID */
  parent?: string;
}

/**
 * Edge connecting nodes in content relationship graph
 */
export interface GraphEdge {
  /** Unique identifier for this edge */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Edge type/relationship type */
  type: string;
  /** Optional edge label */
  label?: string;
  /** Edge value/weight */
  value?: number;
  /** Whether the edge has animation */
  animated?: boolean;
  /** Custom style properties */
  style?: Record<string, any>;
}

/**
 * Data structure for content relationship graph visualization
 */
export interface GraphData {
  /** Array of nodes in the graph */
  nodes: GraphNode[];
  /** Array of edges connecting nodes */
  edges: GraphEdge[];
  /** Optional graph title */
  title?: string;
  /** ID of the root node */
  rootNodeId?: string;
}

/**
 * Options for configuring graph visualization behavior
 */
export interface GraphOptions {
  /** Layout algorithm (e.g., 'hierarchical', 'force', 'radial') */
  layout?: string;
  /** Layout direction for hierarchical layouts */
  direction?: string;
  /** Node sizing method */
  nodeSizing?: string;
  /** Space between nodes at the same level */
  nodeSpacing?: number;
  /** Space between hierarchical levels */
  rankSpacing?: number;
  /** Graph color theme */
  theme?: ChartTheme;
  /** Whether the graph is interactive */
  interactive?: boolean;
  /** Whether zooming is enabled */
  zoomable?: boolean;
  /** Whether nodes can be collapsed/expanded */
  collapsible?: boolean;
  /** Duration of animations in milliseconds */
  animationDuration?: number;
  /** Node click handler */
  onNodeClick?: (node: GraphNode) => void;
  /** Edge click handler */
  onEdgeClick?: (edge: GraphEdge) => void;
}

/**
 * Data structure for metric card visualization
 */
export interface MetricCardData {
  /** Metric title/name */
  title: string;
  /** Current metric value */
  value: number;
  /** Previous period value for comparison */
  previousValue?: number;
  /** Absolute change from previous period */
  change?: number;
  /** Percentage change from previous period */
  changePercentage?: number;
  /** Trend direction ('up', 'down', 'stable') */
  trendDirection?: string;
  /** Data points for sparkline visualization */
  sparklineData?: DataPoint[];
  /** Value format specifier */
  format?: string;
  /** Optional icon or component */
  icon?: React.ReactNode;
  /** Card color/theme */
  color?: string;
}

/**
 * Individual set in a Venn diagram
 */
export interface VennSet {
  /** Unique identifier for this set */
  id: string;
  /** Display label for this set */
  label: string;
  /** Set size (proportional area) */
  size: number;
  /** Associated platform type */
  platformType?: PlatformType;
  /** Set color */
  color?: string;
}

/**
 * Intersection between sets in a Venn diagram
 */
export interface VennIntersection {
  /** Array of set IDs that form this intersection */
  sets: string[];
  /** Size of the intersection (proportional area) */
  size: number;
  /** Optional label for this intersection */
  label?: string;
}

/**
 * Data structure for audience overlap Venn diagrams
 */
export interface VennDiagramData {
  /** Array of sets in the diagram */
  sets: VennSet[];
  /** Array of intersections between sets */
  intersections: VennIntersection[];
  /** Optional diagram title */
  title?: string;
}

/**
 * Namespace for all chart-related types
 */
export namespace ChartTypes {
  export { ChartType };
  export { ChartTheme };
  export { DataPoint };
  export { ChartDataSeries };
  export { ChartData };
  export { ChartOptions };
  export { GraphData };
  export { GraphOptions };
  export { MetricCardData };
  export { VennDiagramData };
}