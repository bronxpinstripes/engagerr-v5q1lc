import React, { useRef, useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ForceGraph2D } from 'react-force-graph';
import { VennDiagram } from '@nivo/venn';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import {
  ChartType, ChartTheme, ChartData, ChartOptions, GraphData, GraphOptions,
  MetricCardData, VennDiagramData
} from '../../types/charts';
import {
  createLineChart, createBarChart, createAreaChart, createPieChart,
  createScatterChart, createRadarChart, createContentRelationshipGraph,
  createVennDiagram
} from '../../lib/charts';

// Define props interfaces
export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isResponsive?: boolean;
  height?: number;
  width?: number;
  footer?: React.ReactNode;
}

export interface ChartProps {
  type: ChartType;
  data: ChartData | GraphData | MetricCardData | VennDiagramData;
  options?: ChartOptions | GraphOptions;
  title?: string;
  subtitle?: string;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isResponsive?: boolean;
  height?: number;
  width?: number;
  footer?: React.ReactNode;
}

/**
 * A wrapper component that provides consistent styling and layout for all chart components
 */
export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  children,
  className,
  isLoading = false,
  error = null,
  onRetry,
  isResponsive = true,
  height = 300,
  width,
  footer,
  ...props
}) => {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center p-6" style={{ height: height || 300 }}>
            <Skeleton className="w-full h-full rounded-md" />
          </div>
        ) : error ? (
          <div className="p-6">
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading chart</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Retry
                </button>
              )}
            </Alert>
          </div>
        ) : (
          <div style={{ height: height, width: width || '100%' }}>
            {isResponsive ? (
              <ResponsiveContainer width="100%" height="100%">
                {children}
              </ResponsiveContainer>
            ) : (
              children
            )}
          </div>
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
};

/**
 * Returns the appropriate chart component based on the chart type
 */
const getChartComponent = (
  chartType: ChartType,
  data: any,
  options?: any
): JSX.Element | null => {
  switch (chartType) {
    case ChartType.LINE:
      return <LineChartComponent data={data as ChartData} options={options} />;
    case ChartType.BAR:
      return <BarChartComponent data={data as ChartData} options={options} />;
    case ChartType.AREA:
      return <AreaChartComponent data={data as ChartData} options={options} />;
    case ChartType.PIE:
      return <PieChartComponent data={data as ChartData} options={options} />;
    case ChartType.SCATTER:
      return <ScatterChartComponent data={data as ChartData} options={options} />;
    case ChartType.RADAR:
      return <RadarChartComponent data={data as ChartData} options={options} />;
    case ChartType.GRAPH:
      return <ContentRelationshipGraph data={data as GraphData} options={options} />;
    case ChartType.VENN:
      return <VennDiagramComponent data={data as VennDiagramData} options={options} />;
    default:
      return null;
  }
};

/**
 * Renders a line chart for time series data
 */
export const LineChartComponent: React.FC<{ data: ChartData; options?: ChartOptions }> = ({ data, options }) => {
  // Get processed configuration from the charts utility
  const config = createLineChart(data, options);
  
  return (
    <LineChart
      data={data.series[0]?.data || []}
      margin={config.margin}
    >
      {config.grid !== false && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis
        dataKey="label"
        type={config.xAxis?.type || 'category'}
        tick={{ fontSize: 12 }}
        tickFormatter={config.xAxis?.tickFormatter}
        label={config.xAxis?.label ? { value: config.xAxis.label, position: 'insideBottom', offset: -5 } : undefined}
      />
      <YAxis
        type={config.yAxis?.type || 'number'}
        tick={{ fontSize: 12 }}
        tickFormatter={config.yAxis?.tickFormatter}
        label={config.yAxis?.label ? { value: config.yAxis.label, angle: -90, position: 'insideLeft' } : undefined}
      />
      {config.tooltip?.enabled !== false && (
        <Tooltip
          formatter={config.tooltip?.formatter}
          labelFormatter={config.tooltip?.labelFormatter}
          content={config.tooltip?.customContent as any}
        />
      )}
      {config.legend?.enabled !== false && (
        <Legend
          verticalAlign={config.legend?.position === 'top' || config.legend?.position === 'bottom' 
            ? config.legend.position : 'bottom' as any}
          align={config.legend?.align as any || 'center'}
          formatter={config.legend?.formatter as any}
          onClick={config.onLegendClick as any}
        />
      )}
      {data.series.map((series, index) => (
        <Line
          key={series.id || index}
          type="monotone"
          dataKey="value"
          name={series.name}
          data={series.data}
          stroke={series.color || (config.colors?.[index % (config.colors?.length || 1)])}
          activeDot={{ r: 8 }}
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={config.animation !== false}
        />
      ))}
    </LineChart>
  );
};

/**
 * Renders a bar chart for comparative data
 */
export const BarChartComponent: React.FC<{ data: ChartData; options?: ChartOptions }> = ({ data, options }) => {
  // Get processed configuration from the charts utility
  const config = createBarChart(data, options);
  const isHorizontal = config.layout === 'horizontal';
  
  return (
    <BarChart
      data={data.series[0]?.data || []}
      layout={isHorizontal ? 'vertical' : 'horizontal'}
      margin={config.margin}
    >
      {config.grid !== false && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis
        type={isHorizontal ? 'number' : 'category'}
        dataKey={isHorizontal ? undefined : 'label'}
        tick={{ fontSize: 12 }}
        tickFormatter={config.xAxis?.tickFormatter}
        label={config.xAxis?.label ? { value: config.xAxis.label, position: 'insideBottom', offset: -5 } : undefined}
      />
      <YAxis
        type={isHorizontal ? 'category' : 'number'}
        dataKey={isHorizontal ? 'label' : undefined}
        tick={{ fontSize: 12 }}
        tickFormatter={config.yAxis?.tickFormatter}
        label={config.yAxis?.label ? { value: config.yAxis.label, angle: -90, position: 'insideLeft' } : undefined}
      />
      {config.tooltip?.enabled !== false && (
        <Tooltip
          formatter={config.tooltip?.formatter}
          labelFormatter={config.tooltip?.labelFormatter}
          content={config.tooltip?.customContent as any}
        />
      )}
      {config.legend?.enabled !== false && (
        <Legend
          verticalAlign={config.legend?.position === 'top' || config.legend?.position === 'bottom' 
            ? config.legend.position : 'bottom' as any}
          align={config.legend?.align as any || 'center'}
          formatter={config.legend?.formatter as any}
          onClick={config.onLegendClick as any}
        />
      )}
      {data.series.map((series, index) => (
        <Bar
          key={series.id || index}
          dataKey="value"
          name={series.name}
          fill={series.color || (config.colors?.[index % (config.colors?.length || 1)])}
          stackId={config.stacked ? 'stack' : undefined}
          isAnimationActive={config.animation !== false}
          onClick={(data, index) => config.onClick?.(data, index)}
        >
          {/* If individual data points have colors, use cells */}
          {series.data.some(point => point.color) && 
            series.data.map((point, i) => (
              <Cell key={`cell-${i}`} fill={point.color} />
            ))
          }
        </Bar>
      ))}
    </BarChart>
  );
};

/**
 * Renders an area chart for cumulative data
 */
export const AreaChartComponent: React.FC<{ data: ChartData; options?: ChartOptions }> = ({ data, options }) => {
  // Get processed configuration from the charts utility
  const config = createAreaChart(data, options);
  
  return (
    <AreaChart
      data={data.series[0]?.data || []}
      margin={config.margin}
    >
      {config.grid !== false && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis
        dataKey="label"
        type={config.xAxis?.type || 'category'}
        tick={{ fontSize: 12 }}
        tickFormatter={config.xAxis?.tickFormatter}
        label={config.xAxis?.label ? { value: config.xAxis.label, position: 'insideBottom', offset: -5 } : undefined}
      />
      <YAxis
        type={config.yAxis?.type || 'number'}
        tick={{ fontSize: 12 }}
        tickFormatter={config.yAxis?.tickFormatter}
        label={config.yAxis?.label ? { value: config.yAxis.label, angle: -90, position: 'insideLeft' } : undefined}
      />
      {config.tooltip?.enabled !== false && (
        <Tooltip
          formatter={config.tooltip?.formatter}
          labelFormatter={config.tooltip?.labelFormatter}
          content={config.tooltip?.customContent as any}
        />
      )}
      {config.legend?.enabled !== false && (
        <Legend
          verticalAlign={config.legend?.position === 'top' || config.legend?.position === 'bottom' 
            ? config.legend.position : 'bottom' as any}
          align={config.legend?.align as any || 'center'}
          formatter={config.legend?.formatter as any}
          onClick={config.onLegendClick as any}
        />
      )}
      {/* Add gradient definitions for area charts */}
      <defs>
        {data.series.map((series, index) => (
          <linearGradient key={`gradient-${series.id || index}`} id={`color-${series.id || index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={series.color || (config.colors?.[index % (config.colors?.length || 1)])} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={series.color || (config.colors?.[index % (config.colors?.length || 1)])} stopOpacity={0.1}/>
          </linearGradient>
        ))}
      </defs>
      {data.series.map((series, index) => (
        <Area
          key={series.id || index}
          type="monotone"
          dataKey="value"
          name={series.name}
          data={series.data}
          stroke={series.color || (config.colors?.[index % (config.colors?.length || 1)])}
          fill={`url(#color-${series.id || index})`}
          stackId={config.stacked ? 'stack' : undefined}
          isAnimationActive={config.animation !== false}
        />
      ))}
    </AreaChart>
  );
};

/**
 * Renders a pie or donut chart for distribution data
 */
export const PieChartComponent: React.FC<{ data: ChartData; options?: ChartOptions }> = ({ data, options }) => {
  // Get processed configuration from the charts utility
  const config = createPieChart(data, options);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track container size for calculating pie dimensions
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setContainerSize({ width, height });
        }
      });
      
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);
  
  // Extract data for pie chart (flattening series data)
  const pieData = data.series.flatMap(series => 
    series.data.map(point => ({
      ...point,
      seriesName: series.name,
      seriesId: series.id,
      color: point.color || series.color
    }))
  );
  
  // Configuration for inner radius (donut chart if > 0)
  const innerRadius = options?.innerRadius || 0;
  const outerRadius = Math.min(containerSize.width, containerSize.height) / 2 - 20;
  
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={config.label?.enabled !== false}
          label={config.label?.formatter as any}
          outerRadius={outerRadius > 0 ? outerRadius : '80%'}
          innerRadius={innerRadius > 0 ? outerRadius * (innerRadius / 100) : 0}
          fill="#8884d8"
          paddingAngle={innerRadius > 0 ? 1 : 0}
          dataKey="value"
          nameKey="label"
          isAnimationActive={config.animation !== false}
          onClick={(data, index) => config.onClick?.(data, index)}
        >
          {pieData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || (config.colors?.[index % (config.colors?.length || 1)])} 
            />
          ))}
        </Pie>
        {config.tooltip?.enabled !== false && (
          <Tooltip
            formatter={config.tooltip?.formatter}
            labelFormatter={config.tooltip?.labelFormatter}
            content={config.tooltip?.customContent as any}
          />
        )}
        {config.legend?.enabled !== false && (
          <Legend
            verticalAlign={config.legend?.position === 'top' || config.legend?.position === 'bottom' 
              ? config.legend.position : 'bottom' as any}
            align={config.legend?.align as any || 'center'}
            formatter={config.legend?.formatter as any}
            onClick={config.onLegendClick as any}
          />
        )}
      </PieChart>
    </div>
  );
};

/**
 * Renders a scatter chart for correlation data
 */
export const ScatterChartComponent: React.FC<{ data: ChartData; options?: ChartOptions }> = ({ data, options }) => {
  // Get processed configuration from the charts utility
  const config = createScatterChart(data, options);
  
  return (
    <ScatterChart
      margin={config.margin}
    >
      {config.grid !== false && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis
        type="number"
        dataKey="value"
        name={config.xAxis?.label || 'X'}
        tick={{ fontSize: 12 }}
        tickFormatter={config.xAxis?.tickFormatter}
        label={config.xAxis?.label ? { value: config.xAxis.label, position: 'insideBottom', offset: -5 } : undefined}
        domain={config.xAxis?.domain || ['auto', 'auto']}
      />
      <YAxis
        type="number"
        dataKey="secondaryValue"
        name={config.yAxis?.label || 'Y'}
        tick={{ fontSize: 12 }}
        tickFormatter={config.yAxis?.tickFormatter}
        label={config.yAxis?.label ? { value: config.yAxis.label, angle: -90, position: 'insideLeft' } : undefined}
        domain={config.yAxis?.domain || ['auto', 'auto']}
      />
      {config.tooltip?.enabled !== false && (
        <Tooltip
          formatter={config.tooltip?.formatter}
          labelFormatter={config.tooltip?.labelFormatter}
          content={config.tooltip?.customContent as any}
        />
      )}
      {config.legend?.enabled !== false && (
        <Legend
          verticalAlign={config.legend?.position === 'top' || config.legend?.position === 'bottom' 
            ? config.legend.position : 'bottom' as any}
          align={config.legend?.align as any || 'center'}
          formatter={config.legend?.formatter as any}
          onClick={config.onLegendClick as any}
        />
      )}
      {data.series.map((series, index) => (
        <Scatter
          key={series.id || index}
          name={series.name}
          data={series.data.map(point => ({
            x: point.value,
            y: point.secondaryValue,
            ...point
          }))}
          fill={series.color || (config.colors?.[index % (config.colors?.length || 1)])}
          shape="circle"
          isAnimationActive={config.animation !== false}
        />
      ))}
    </ScatterChart>
  );
};

/**
 * Renders a radar chart for multi-dimensional data comparison
 */
export const RadarChartComponent: React.FC<{ data: ChartData; options?: ChartOptions }> = ({ data, options }) => {
  // Get processed configuration from the charts utility
  const config = createRadarChart(data, options);
  
  // Radar charts need a different data structure - transform the data
  const radarData = data.series[0]?.data.map(point => {
    const result: any = { name: point.label };
    data.series.forEach(series => {
      const matchingPoint = series.data.find(p => p.label === point.label);
      if (matchingPoint) {
        result[series.name] = matchingPoint.value;
      }
    });
    return result;
  }) || [];
  
  return (
    <RadarChart
      cx="50%"
      cy="50%"
      outerRadius="80%"
      data={radarData}
    >
      <PolarGrid />
      <PolarAngleAxis dataKey="name" />
      <PolarRadiusAxis />
      {data.series.map((series, index) => (
        <Radar
          key={series.id || index}
          name={series.name}
          dataKey={series.name}
          stroke={series.color || (config.colors?.[index % (config.colors?.length || 1)])}
          fill={series.color || (config.colors?.[index % (config.colors?.length || 1)])}
          fillOpacity={config.fillOpacity || 0.3}
          isAnimationActive={config.animation !== false}
        />
      ))}
      {config.tooltip?.enabled !== false && (
        <Tooltip
          formatter={config.tooltip?.formatter}
          labelFormatter={config.tooltip?.labelFormatter}
          content={config.tooltip?.customContent as any}
        />
      )}
      {config.legend?.enabled !== false && (
        <Legend
          verticalAlign={config.legend?.position === 'top' || config.legend?.position === 'bottom' 
            ? config.legend.position : 'bottom' as any}
          align={config.legend?.align as any || 'center'}
          formatter={config.legend?.formatter as any}
          onClick={config.onLegendClick as any}
        />
      )}
    </RadarChart>
  );
};

/**
 * Renders a graph visualization for content relationship mapping
 */
export const ContentRelationshipGraph: React.FC<{ data: GraphData; options?: GraphOptions }> = ({ data, options }) => {
  // Get processed configuration from the charts utility
  const config = createContentRelationshipGraph(data, options);
  const graphRef = useRef<any>();
  
  // Set up event handlers
  const handleNodeClick = (node: any) => {
    if (config.onNodeClick) {
      config.onNodeClick(node);
    }
    
    // If collapsible and the node has children, toggle collapsed state
    if (config.collapsible && node._collapsed !== undefined) {
      node._collapsed = !node._collapsed;
      if (graphRef.current) {
        graphRef.current.refresh();
      }
    }
  };
  
  const handleLinkClick = (link: any) => {
    if (config.onEdgeClick) {
      config.onEdgeClick(link);
    }
  };
  
  // Node painting function for custom styling
  const paintNode = React.useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const { color, size = 10, label, platformType, contentType, textColor = '#ffffff' } = node;
    
    // Draw node circle
    ctx.beginPath();
    ctx.fillStyle = color || '#cccccc';
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw border if specified
    if (node.borderWidth) {
      ctx.strokeStyle = node.borderColor || color || '#cccccc';
      ctx.lineWidth = node.borderWidth / globalScale;
      ctx.stroke();
    }
    
    // Only draw text if we're zoomed in enough
    if (globalScale > 0.7) {
      // Draw node label
      ctx.font = `${12 / globalScale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;
      ctx.fillText(label, node.x, node.y);
    }
    
    // Draw platform icon indicator if zoomed in enough
    if (globalScale > 1.5 && platformType) {
      // Simplified platform indicator
      ctx.beginPath();
      ctx.fillStyle = textColor;
      ctx.arc(node.x + size * 0.7, node.y - size * 0.7, size * 0.3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, []);
  
  // Set up zoom controls
  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.2, 400); // smooth transition
    }
  };
  
  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.2, 400); // smooth transition
    }
  };
  
  const handleZoomToFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400); // fit view with transition
    }
  };
  
  return (
    <div className="relative w-full h-full">
      <ForceGraph2D
        ref={graphRef}
        graphData={{
          nodes: data.nodes,
          links: data.edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            ...edge
          }))
        }}
        nodeLabel={node => node.label}
        nodeColor={node => node.color}
        nodeVal={node => node.size}
        nodeRelSize={1}
        nodeCanvasObject={paintNode}
        linkLabel={link => link.label || link.type}
        linkColor={link => link.color}
        linkWidth={link => link.width || 1}
        linkDirectionalArrowLength={link => link.arrowSize || 0}
        linkLineDash={link => link.dashed ? [2, 2] : undefined}
        linkDirectionalParticles={link => link.animated ? 4 : 0}
        linkDirectionalParticleSpeed={0.01}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        dagMode={config.layout === 'hierarchical' ? config.direction : undefined}
        dagLevelDistance={config.rankSpacing}
        d3AlphaDecay={0.1}
        d3VelocityDecay={0.4}
        cooldownTime={3000}
        onEngineStop={() => {
          if (graphRef.current && config.layout === 'hierarchical') {
            // Center on root node when layout stabilizes
            const rootNode = data.nodes.find(node => node.id === data.rootNodeId);
            if (rootNode) {
              graphRef.current.centerAt(rootNode.x, rootNode.y, 1000);
            }
          }
        }}
      />
      
      {/* Zoom controls */}
      {config.zoomable !== false && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 text-black"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 text-black"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={handleZoomToFit}
            className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 text-black"
            aria-label="Fit view"
          >
            ⤢
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Renders a Venn diagram for audience overlap visualization
 */
export const VennDiagramComponent: React.FC<{ data: VennDiagramData; options?: ChartOptions }> = ({ data, options }) => {
  // Get processed configuration from the charts utility
  const config = createVennDiagram(data, options);
  
  // Extract sets and intersections in the format needed by @nivo/venn
  const vennData = data.sets.map(set => {
    // Find intersections involving this set
    const setIntersections = data.intersections
      .filter(intersection => intersection.sets.includes(set.id))
      .map(intersection => ({
        sets: intersection.sets,
        size: intersection.size,
        label: intersection.label
      }));
    
    return {
      id: set.id,
      label: set.label,
      value: set.size,
      color: set.color,
      fontSize: 14
    };
  });
  
  return (
    <VennDiagram
      data={vennData}
      id="id"
      value="value"
      label="label"
      colors={{ scheme: 'set2' }} // Will be overridden by set colors
      colorMode="id"
      borderWidth={config.strokeWidth || 2}
      borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
      labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
      fontSize={14}
      blendMode="normal"
      animate={config.animation !== false}
      motionConfig="gentle"
      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      tooltip={({ id, value, label, color }) => (
        <div style={{ 
          background: 'white', 
          padding: '8px 12px', 
          border: '1px solid #ccc', 
          borderRadius: '4px',
          boxShadow: '0px 2px 6px rgba(0,0,0,0.15)'
        }}>
          <strong style={{ color }}>{label || id}</strong>: {value.toLocaleString()}
        </div>
      )}
      legends={config.legend?.enabled !== false ? [
        {
          anchor: 'bottom',
          direction: 'row',
          itemTextColor: '#333333',
          translateY: 30,
          itemHeight: 20,
          itemWidth: 100,
          symbolSize: 12,
          symbolShape: 'circle'
        }
      ] : []}
    />
  );
};

/**
 * Main chart component that determines which specific chart to render based on type
 */
const Chart: React.FC<ChartProps> = ({
  type,
  data,
  options,
  title,
  subtitle,
  className,
  isLoading = false,
  error = null,
  onRetry,
  isResponsive = true,
  height = 300,
  width,
  footer,
  ...props
}) => {
  // Get the appropriate chart component based on type
  const chartComponent = getChartComponent(type, data, options);
  
  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      className={className}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isResponsive={isResponsive}
      height={height}
      width={width}
      footer={footer}
      {...props}
    >
      {chartComponent}
    </ChartContainer>
  );
};

export default Chart;