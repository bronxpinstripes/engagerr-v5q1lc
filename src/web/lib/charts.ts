/**
 * Charts Library
 * 
 * Core utility library for creating and configuring chart visualizations throughout
 * the Engagerr platform. Provides functions for generating different chart types,
 * processing data into chart-compatible formats, and standardizing visualization configurations.
 */

import { merge } from 'lodash'; // v4.17.21
import chroma from 'chroma-js'; // v2.4.2
import { 
  ChartTypes, 
  ChartType, 
  ChartTheme, 
  ChartData, 
  ChartOptions, 
  GraphData, 
  GraphOptions, 
  MetricCardData, 
  VennDiagramData 
} from '../types/charts';
import { PlatformType } from '../types/platform';
import { ContentType } from '../types/content';
import { 
  formatNumber, 
  formatPercentage, 
  formatCurrency, 
  formatDuration, 
  formatMetricValue 
} from './formatters';
import { 
  PLATFORMS, 
  COLORS, 
  CHART_TYPES 
} from './constants';
import { 
  getContrastColor, 
  clamp, 
  generateId 
} from './utils';

// =============================================================================
// Default Options
// =============================================================================

/**
 * Default chart options shared across all chart types
 */
export const DEFAULT_CHART_OPTIONS: Partial<ChartOptions> = {
  theme: ChartTheme.LIGHT,
  aspectRatio: 16 / 9,
  stacked: false,
  grid: true,
  animation: true,
  margin: {
    top: 20,
    right: 20,
    bottom: 50,
    left: 50
  },
  tooltip: {
    enabled: true
  },
  legend: {
    enabled: true,
    position: 'bottom',
    align: 'center'
  }
};

/**
 * Returns default chart options based on chart type
 * @param chartType The type of chart being created
 * @param overrides Optional overrides for the default options
 * @returns Merged chart options with defaults and overrides
 */
export function getDefaultChartOptions(
  chartType: ChartType,
  overrides: Partial<ChartOptions> = {}
): ChartOptions {
  // Base options from defaults
  const baseOptions = { ...DEFAULT_CHART_OPTIONS };

  // Chart-specific default options
  let chartSpecificOptions: Partial<ChartOptions> = {};

  switch (chartType) {
    case ChartType.LINE:
      chartSpecificOptions = {
        xAxis: {
          type: 'category',
          dataKey: 'date',
          tickCount: 6
        },
        yAxis: {
          type: 'number',
          tickCount: 5
        }
      };
      break;

    case ChartType.BAR:
      chartSpecificOptions = {
        xAxis: {
          type: 'category',
          dataKey: 'label'
        },
        yAxis: {
          type: 'number',
          tickCount: 5
        }
      };
      break;

    case ChartType.AREA:
      chartSpecificOptions = {
        xAxis: {
          type: 'category',
          dataKey: 'date',
          tickCount: 6
        },
        yAxis: {
          type: 'number',
          tickCount: 5
        },
        stacked: true
      };
      break;

    case ChartType.PIE:
      chartSpecificOptions = {
        legend: {
          enabled: true,
          position: 'right',
          align: 'middle'
        },
        tooltip: {
          formatter: (value, name) => `${name}: ${formatNumber(value)}`
        }
      };
      break;

    case ChartType.SCATTER:
      chartSpecificOptions = {
        xAxis: {
          type: 'number',
          tickCount: 5
        },
        yAxis: {
          type: 'number',
          tickCount: 5
        }
      };
      break;

    case ChartType.RADAR:
      chartSpecificOptions = {
        legend: {
          enabled: true,
          position: 'bottom'
        }
      };
      break;

    case ChartType.GRAPH:
      chartSpecificOptions = {
        interactive: true,
        zoomable: true,
        collapsible: true,
        animationDuration: 300
      };
      break;

    case ChartType.VENN:
      chartSpecificOptions = {
        animation: true
      };
      break;

    case ChartType.METRIC_CARD:
      chartSpecificOptions = {};
      break;

    default:
      chartSpecificOptions = {};
  }

  // Merge the base options, chart-specific options, and any overrides
  return merge(
    { type: chartType },
    baseOptions,
    chartSpecificOptions,
    overrides
  ) as ChartOptions;
}

/**
 * Returns an array of colors based on the specified theme
 * @param theme The chart color theme
 * @param platformType Optional platform type for platform-specific colors
 * @returns Array of color hex codes
 */
export function getChartThemeColors(
  theme: ChartTheme,
  platformType?: PlatformType
): string[] {
  // For platform-specific themes, use the platform's brand color if provided
  if (theme === ChartTheme.PLATFORM_SPECIFIC && platformType) {
    const platformColor = getPlatformColor(platformType);
    const baseColor = chroma(platformColor);
    
    // Generate variations of the platform color
    return [
      baseColor.hex(),
      baseColor.brighten(0.5).hex(),
      baseColor.brighten(1).hex(),
      baseColor.darken(0.5).hex(),
      baseColor.darken(1).hex()
    ];
  }

  // Theme-specific color palettes
  switch (theme) {
    case ChartTheme.LIGHT:
      return [
        '#2563EB', // Primary blue
        '#0D9488', // Teal
        '#8B5CF6', // Purple
        '#F59E0B', // Amber
        '#EC4899', // Pink
        '#10B981', // Emerald
        '#6366F1', // Indigo
        '#EF4444', // Red
        '#64748B', // Slate
        '#7C3AED'  // Violet
      ];

    case ChartTheme.DARK:
      return [
        '#3B82F6', // Brighter blue for dark theme
        '#14B8A6', // Brighter teal
        '#A78BFA', // Brighter purple
        '#FBBF24', // Brighter amber
        '#F472B6', // Brighter pink
        '#34D399', // Brighter emerald
        '#818CF8', // Brighter indigo
        '#F87171', // Brighter red
        '#94A3B8', // Brighter slate
        '#8B5CF6'  // Brighter violet
      ];

    case ChartTheme.BRANDED:
      // Application branded colors based on primary and secondary colors
      const primaryColor = chroma(COLORS.PRIMARY);
      const secondaryColor = chroma(COLORS.SECONDARY);
      const accentColor = chroma(COLORS.ACCENT);
      
      return [
        primaryColor.hex(),
        secondaryColor.hex(),
        accentColor.hex(),
        primaryColor.brighten(0.7).hex(),
        secondaryColor.brighten(0.7).hex(),
        accentColor.brighten(0.7).hex(),
        primaryColor.darken(0.5).hex(),
        secondaryColor.darken(0.5).hex(),
        accentColor.darken(0.5).hex(),
        COLORS.WARNING
      ];

    default:
      // Default to light theme colors
      return getChartThemeColors(ChartTheme.LIGHT);
  }
}

// =============================================================================
// Data Formatting
// =============================================================================

/**
 * Processes raw data into a format suitable for charts
 * @param data Raw data array to format
 * @param options Formatting options
 * @returns Formatted chart data structure
 */
export function formatChartData(
  data: any[],
  options: {
    xKey?: string;
    yKey?: string;
    seriesKey?: string;
    categoryKey?: string;
    labelKey?: string;
    valueKey?: string;
    colorKey?: string;
    platformKey?: string;
    contentTypeKey?: string;
    sortByValue?: boolean;
    sortDirection?: 'asc' | 'desc';
    limit?: number;
  } = {}
): ChartData {
  if (!data || !data.length) {
    return { series: [] };
  }

  const {
    xKey = 'x',
    yKey = 'y',
    seriesKey,
    categoryKey,
    labelKey = 'label',
    valueKey = 'value',
    colorKey,
    platformKey = 'platformType',
    contentTypeKey = 'contentType',
    sortByValue = false,
    sortDirection = 'desc',
    limit
  } = options;

  let result: ChartData;

  // If data should be grouped into series
  if (seriesKey && data[0][seriesKey] !== undefined) {
    // Group data by series
    const seriesGroups = data.reduce((groups: Record<string, any[]>, item) => {
      const key = item[seriesKey]?.toString() || 'undefined';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});

    // Create series from groups
    const series = Object.entries(seriesGroups).map(([name, items], index) => {
      // Get platform type from first item if available
      const platformType = items[0]?.[platformKey];

      // Create data points for this series
      const dataPoints = items.map(item => ({
        label: item[labelKey] || '',
        value: Number(item[valueKey] || 0),
        secondaryValue: item[yKey] !== undefined ? Number(item[yKey]) : undefined,
        date: item.date || undefined,
        color: item[colorKey] || undefined,
        platformType: item[platformKey] || undefined,
        contentType: item[contentTypeKey] || undefined,
        metadata: { ...item }
      }));

      // Sort data points if requested
      if (sortByValue) {
        dataPoints.sort((a, b) => 
          sortDirection === 'desc' 
            ? b.value - a.value 
            : a.value - b.value
        );
      }

      // Apply limit if specified
      const limitedData = limit ? dataPoints.slice(0, limit) : dataPoints;

      // Determine series color based on platform type or index
      let color;
      if (platformType) {
        color = getPlatformColor(platformType as PlatformType);
      }

      return {
        id: generateId(),
        name,
        data: limitedData,
        color,
        platformType: platformType as PlatformType,
        visible: true
      };
    });

    result = { series };
  } else {
    // For single series data
    let dataPoints = data.map(item => ({
      label: item[labelKey] || '',
      value: Number(item[valueKey] || 0),
      secondaryValue: item[yKey] !== undefined ? Number(item[yKey]) : undefined,
      date: item.date || undefined,
      color: item[colorKey] || undefined,
      platformType: item[platformKey] || undefined,
      contentType: item[contentTypeKey] || undefined,
      metadata: { ...item }
    }));

    // Sort data points if requested
    if (sortByValue) {
      dataPoints.sort((a, b) => 
        sortDirection === 'desc' 
          ? b.value - a.value 
          : a.value - b.value
      );
    }

    // Apply limit if specified
    if (limit) {
      dataPoints = dataPoints.slice(0, limit);
    }

    result = {
      series: [{
        id: generateId(),
        name: 'Data',
        data: dataPoints,
        visible: true
      }]
    };
  }

  // Extract categories if categoryKey is provided
  if (categoryKey && data[0]?.[categoryKey] !== undefined) {
    const categories = [...new Set(data.map(item => item[categoryKey]))];
    result.categories = categories;
  }

  return result;
}

/**
 * Formats time series data for temporal charts
 * @param timeSeriesData Array of time series data points
 * @param metrics Array of metric names to include
 * @param options Additional formatting options
 * @returns Formatted chart data for time series visualization
 */
export function formatTimeSeriesData(
  timeSeriesData: any[],
  metrics: string[],
  options: {
    dateKey?: string;
    sortByDate?: boolean;
    dateFormat?: string;
    metricLabels?: Record<string, string>;
    metricColors?: Record<string, string>;
    platformTypeKey?: string;
  } = {}
): ChartData {
  if (!timeSeriesData || !timeSeriesData.length || !metrics || !metrics.length) {
    return { series: [] };
  }

  const {
    dateKey = 'date',
    sortByDate = true,
    metricLabels = {},
    metricColors = {},
    platformTypeKey = 'platformType'
  } = options;

  // Sort data by date if requested
  const sortedData = [...timeSeriesData];
  if (sortByDate) {
    sortedData.sort((a, b) => {
      const dateA = new Date(a[dateKey]).getTime();
      const dateB = new Date(b[dateKey]).getTime();
      return dateA - dateB;
    });
  }

  // Create a series for each metric
  const series = metrics.map((metric, index) => {
    // Get platform type from first item that has it (if available)
    const platformType = timeSeriesData.find(item => item[platformTypeKey])?.[platformTypeKey];
    
    // Generate data points for this metric
    const dataPoints = sortedData.map(item => ({
      label: item[dateKey] || '',
      date: new Date(item[dateKey]),
      value: Number(item[metric] || 0),
      metadata: { ...item }
    }));

    // Determine color for this metric
    let color = metricColors[metric];
    if (!color) {
      if (platformType) {
        color = getPlatformColor(platformType as PlatformType);
      } else {
        color = getMetricColor(metric);
      }
    }

    return {
      id: metric,
      name: metricLabels[metric] || metric,
      data: dataPoints,
      color,
      visible: true
    };
  });

  return { series };
}

/**
 * Formats platform breakdown data for comparative charts
 * @param platformData Array of platform data
 * @param metricKey Metric to compare across platforms
 * @param options Additional formatting options
 * @returns Formatted chart data for platform comparison
 */
export function formatPlatformBreakdownData(
  platformData: any[],
  metricKey: string,
  options: {
    platformKey?: string;
    labelKey?: string;
    sortByValue?: boolean;
    sortDirection?: 'asc' | 'desc';
    limit?: number;
    includePercentages?: boolean;
    totalValue?: number;
  } = {}
): ChartData {
  if (!platformData || !platformData.length) {
    return { series: [] };
  }

  const {
    platformKey = 'platformType',
    labelKey = 'name',
    sortByValue = true,
    sortDirection = 'desc',
    limit,
    includePercentages = true,
    totalValue
  } = options;

  // Calculate total for percentages if not provided
  const total = totalValue || platformData.reduce((sum, item) => sum + Number(item[metricKey] || 0), 0);

  // Create data points for each platform
  let dataPoints = platformData.map(item => {
    const value = Number(item[metricKey] || 0);
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const platformType = item[platformKey] as PlatformType;

    return {
      label: item[labelKey] || platformType || 'Unknown',
      value,
      percentage,
      platformType,
      color: getPlatformColor(platformType),
      metadata: { ...item }
    };
  });

  // Sort by value if requested
  if (sortByValue) {
    dataPoints.sort((a, b) => 
      sortDirection === 'desc' 
        ? b.value - a.value 
        : a.value - b.value
    );
  }

  // Apply limit if specified
  if (limit) {
    dataPoints = dataPoints.slice(0, limit);
  }

  // Create a single series with platform-specific colors
  const series = [{
    id: generateId(),
    name: metricKey,
    data: dataPoints,
    visible: true
  }];

  return { series };
}

// =============================================================================
// Chart Creation Functions
// =============================================================================

/**
 * Creates configuration for a line chart
 * @param data Formatted chart data
 * @param options Chart configuration options
 * @returns Complete line chart configuration
 */
export function createLineChart(
  data: ChartData,
  options: Partial<ChartOptions> = {}
): object {
  const chartOptions = getDefaultChartOptions(ChartType.LINE, options);
  const themeColors = getChartThemeColors(chartOptions.theme || ChartTheme.LIGHT);
  
  // Apply colors to series if not already specified
  data.series.forEach((series, index) => {
    if (!series.color) {
      series.color = themeColors[index % themeColors.length];
    }
  });

  // Configure axes formatters based on data
  const xAxis = {
    ...chartOptions.xAxis,
    tickFormatter: (value: any) => {
      // Format date values if present
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      return value;
    }
  };

  const yAxis = {
    ...chartOptions.yAxis,
    tickFormatter: (value: any) => {
      // Format number values
      return formatNumber(value);
    }
  };

  // Configure tooltip formatter
  const tooltip = {
    ...chartOptions.tooltip,
    formatter: (value: any, name: string, props: any) => {
      // Check for custom metric type
      const metricType = props?.payload?.metricType || 'number';
      return formatMetricValue(value, metricType);
    }
  };

  return {
    type: 'line',
    data,
    colors: themeColors,
    xAxis,
    yAxis,
    tooltip,
    legend: chartOptions.legend,
    grid: chartOptions.grid,
    animation: chartOptions.animation,
    margin: chartOptions.margin,
    aspectRatio: chartOptions.aspectRatio,
    height: chartOptions.height,
    width: chartOptions.width,
    onClick: chartOptions.onClick,
    onLegendClick: chartOptions.onLegendClick
  };
}

/**
 * Creates configuration for a bar chart
 * @param data Formatted chart data
 * @param options Chart configuration options
 * @returns Complete bar chart configuration
 */
export function createBarChart(
  data: ChartData,
  options: Partial<ChartOptions> = {}
): object {
  const chartOptions = getDefaultChartOptions(ChartType.BAR, options);
  const themeColors = getChartThemeColors(chartOptions.theme || ChartTheme.LIGHT);
  
  // Apply colors to series if not already specified
  data.series.forEach((series, index) => {
    if (!series.color) {
      series.color = themeColors[index % themeColors.length];
    }
  });

  // Apply colors to individual data points if needed
  data.series.forEach(series => {
    series.data.forEach(point => {
      if (!point.color && point.platformType) {
        point.color = getPlatformColor(point.platformType);
      }
    });
  });

  // Determine if chart should be horizontal
  const layout = options.layout || 'vertical';
  
  // Configure axes based on layout
  const xAxis = {
    ...chartOptions.xAxis,
    type: layout === 'horizontal' ? 'number' : 'category'
  };

  const yAxis = {
    ...chartOptions.yAxis,
    type: layout === 'horizontal' ? 'category' : 'number'
  };

  // Configure tooltip formatter
  const tooltip = {
    ...chartOptions.tooltip,
    formatter: (value: any, name: string, props: any) => {
      // Check for custom metric type
      const metricType = props?.payload?.metricType || 'number';
      return formatMetricValue(value, metricType);
    }
  };

  return {
    type: 'bar',
    data,
    colors: themeColors,
    layout,
    stacked: chartOptions.stacked,
    xAxis,
    yAxis,
    tooltip,
    legend: chartOptions.legend,
    grid: chartOptions.grid,
    animation: chartOptions.animation,
    margin: chartOptions.margin,
    aspectRatio: chartOptions.aspectRatio,
    height: chartOptions.height,
    width: chartOptions.width,
    onClick: chartOptions.onClick,
    onLegendClick: chartOptions.onLegendClick
  };
}

/**
 * Creates configuration for an area chart
 * @param data Formatted chart data
 * @param options Chart configuration options
 * @returns Complete area chart configuration
 */
export function createAreaChart(
  data: ChartData,
  options: Partial<ChartOptions> = {}
): object {
  const chartOptions = getDefaultChartOptions(ChartType.AREA, options);
  const themeColors = getChartThemeColors(chartOptions.theme || ChartTheme.LIGHT);
  
  // Apply colors to series if not already specified
  data.series.forEach((series, index) => {
    if (!series.color) {
      series.color = themeColors[index % themeColors.length];
    }
  });

  // Configure gradient fills for areas
  const enhancedSeries = data.series.map(series => ({
    ...series,
    // Add gradient fill configuration
    fill: options.gradient !== false ? `url(#${series.id}-gradient)` : series.color,
    gradient: options.gradient !== false ? {
      id: `${series.id}-gradient`,
      color: series.color,
      opacity: 0.2
    } : undefined
  }));

  // Configure axes formatters based on data
  const xAxis = {
    ...chartOptions.xAxis,
    tickFormatter: (value: any) => {
      // Format date values if present
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      return value;
    }
  };

  const yAxis = {
    ...chartOptions.yAxis,
    tickFormatter: (value: any) => {
      // Format number values
      return formatNumber(value);
    }
  };

  // Configure tooltip formatter
  const tooltip = {
    ...chartOptions.tooltip,
    formatter: (value: any, name: string, props: any) => {
      // Check for custom metric type
      const metricType = props?.payload?.metricType || 'number';
      return formatMetricValue(value, metricType);
    }
  };

  return {
    type: 'area',
    data: { ...data, series: enhancedSeries },
    colors: themeColors,
    stacked: chartOptions.stacked !== false, // Default to stacked for area charts
    xAxis,
    yAxis,
    tooltip,
    legend: chartOptions.legend,
    grid: chartOptions.grid,
    animation: chartOptions.animation,
    margin: chartOptions.margin,
    aspectRatio: chartOptions.aspectRatio,
    height: chartOptions.height,
    width: chartOptions.width,
    onClick: chartOptions.onClick,
    onLegendClick: chartOptions.onLegendClick
  };
}

/**
 * Creates configuration for a pie or donut chart
 * @param data Formatted chart data
 * @param options Chart configuration options
 * @returns Complete pie chart configuration
 */
export function createPieChart(
  data: ChartData,
  options: Partial<ChartOptions> = {}
): object {
  const chartOptions = getDefaultChartOptions(ChartType.PIE, options);
  const themeColors = getChartThemeColors(chartOptions.theme || ChartTheme.LIGHT);
  
  // Flatten series data for pie chart
  let pieData: any[] = [];
  data.series.forEach(series => {
    pieData = pieData.concat(series.data.map(point => ({
      ...point,
      seriesName: series.name,
      seriesId: series.id
    })));
  });
  
  // Apply colors to data points if not already specified
  pieData.forEach((point, index) => {
    if (!point.color) {
      // Use platform color if available, otherwise use theme colors
      if (point.platformType) {
        point.color = getPlatformColor(point.platformType);
      } else {
        point.color = themeColors[index % themeColors.length];
      }
    }
  });

  // Check if this should be a donut chart
  const innerRadius = options.innerRadius || 0;
  const isDonut = innerRadius > 0;

  // Configure tooltip formatter
  const tooltip = {
    ...chartOptions.tooltip,
    formatter: (value: any, name: string, props: any) => {
      // Format value based on metric type
      const metricType = props?.payload?.metricType || 'number';
      const formattedValue = formatMetricValue(value, metricType);
      
      // Include percentage if total is available
      const total = pieData.reduce((sum, item) => sum + item.value, 0);
      const percentage = total > 0 ? (value / total) * 100 : 0;
      const formattedPercentage = formatPercentage(percentage, 1);
      
      return `${name}: ${formattedValue} (${formattedPercentage})`;
    }
  };

  return {
    type: 'pie',
    data: pieData,
    colors: themeColors,
    innerRadius: isDonut ? `${innerRadius}%` : undefined,
    padAngle: isDonut ? 1 : 0,
    cornerRadius: 4,
    label: {
      enabled: options.labels !== false,
      position: 'outside',
      formatter: (value: any, name: string) => {
        // Show label for significant segments
        const total = pieData.reduce((sum, item) => sum + item.value, 0);
        const percentage = total > 0 ? (value / total) * 100 : 0;
        return percentage >= 5 ? name : '';
      }
    },
    tooltip,
    legend: chartOptions.legend,
    animation: chartOptions.animation,
    aspectRatio: chartOptions.aspectRatio,
    height: chartOptions.height,
    width: chartOptions.width,
    onClick: chartOptions.onClick,
    onLegendClick: chartOptions.onLegendClick
  };
}

/**
 * Creates configuration for a scatter plot
 * @param data Formatted chart data
 * @param options Chart configuration options
 * @returns Complete scatter chart configuration
 */
export function createScatterChart(
  data: ChartData,
  options: Partial<ChartOptions> = {}
): object {
  const chartOptions = getDefaultChartOptions(ChartType.SCATTER, options);
  const themeColors = getChartThemeColors(chartOptions.theme || ChartTheme.LIGHT);
  
  // Apply colors to series if not already specified
  data.series.forEach((series, index) => {
    if (!series.color) {
      series.color = themeColors[index % themeColors.length];
    }
  });

  // Configure point size if not specified
  const pointSize = options.pointSize || 5;

  // Configure axes formatters
  const xAxis = {
    ...chartOptions.xAxis,
    tickFormatter: (value: any) => {
      return formatNumber(value);
    }
  };

  const yAxis = {
    ...chartOptions.yAxis,
    tickFormatter: (value: any) => {
      return formatNumber(value);
    }
  };

  // Configure tooltip formatter
  const tooltip = {
    ...chartOptions.tooltip,
    formatter: (value: any, name: string, props: any) => {
      const x = props?.payload?.x;
      const y = props?.payload?.y;
      const xMetricType = props?.payload?.xMetricType || 'number';
      const yMetricType = props?.payload?.yMetricType || 'number';
      
      // Format both x and y values based on their metric types
      const formattedX = formatMetricValue(x, xMetricType);
      const formattedY = formatMetricValue(y, yMetricType);
      
      return `${name}\nX: ${formattedX}\nY: ${formattedY}`;
    }
  };

  return {
    type: 'scatter',
    data,
    colors: themeColors,
    pointSize,
    xAxis,
    yAxis,
    tooltip,
    legend: chartOptions.legend,
    grid: chartOptions.grid,
    animation: chartOptions.animation,
    margin: chartOptions.margin,
    aspectRatio: chartOptions.aspectRatio,
    height: chartOptions.height,
    width: chartOptions.width,
    onClick: chartOptions.onClick,
    onLegendClick: chartOptions.onLegendClick
  };
}

/**
 * Creates configuration for a radar chart
 * @param data Formatted chart data
 * @param options Chart configuration options
 * @returns Complete radar chart configuration
 */
export function createRadarChart(
  data: ChartData,
  options: Partial<ChartOptions> = {}
): object {
  const chartOptions = getDefaultChartOptions(ChartType.RADAR, options);
  const themeColors = getChartThemeColors(chartOptions.theme || ChartTheme.LIGHT);
  
  // Apply colors to series if not already specified
  data.series.forEach((series, index) => {
    if (!series.color) {
      series.color = themeColors[index % themeColors.length];
    }
  });

  // Configure fill options
  const fillOpacity = options.fillOpacity !== undefined ? options.fillOpacity : 0.3;

  // Configure tooltip formatter
  const tooltip = {
    ...chartOptions.tooltip,
    formatter: (value: any, name: string, props: any) => {
      // Format value based on metric type
      const metricType = props?.payload?.metricType || 'number';
      return formatMetricValue(value, metricType);
    }
  };

  return {
    type: 'radar',
    data,
    colors: themeColors,
    fillOpacity,
    polarGrid: {
      gridType: 'polygon',
      radialLines: true,
      angleLines: true
    },
    tooltip,
    legend: chartOptions.legend,
    animation: chartOptions.animation,
    aspectRatio: chartOptions.aspectRatio,
    height: chartOptions.height,
    width: chartOptions.width,
    onClick: chartOptions.onClick,
    onLegendClick: chartOptions.onLegendClick
  };
}

/**
 * Creates configuration for a content relationship graph visualization
 * @param data Graph data with nodes and edges
 * @param options Graph visualization options
 * @returns Complete graph visualization configuration
 */
export function createContentRelationshipGraph(
  data: GraphData,
  options: Partial<GraphOptions> = {}
): object {
  // Default graph options
  const defaultOptions: GraphOptions = {
    layout: 'hierarchical',
    direction: 'UD', // Up to Down
    nodeSizing: 'metric', // Size nodes based on metrics
    nodeSpacing: 100,
    rankSpacing: 150,
    theme: ChartTheme.LIGHT,
    interactive: true,
    zoomable: true,
    collapsible: true,
    animationDuration: 300
  };

  // Merge defaults with provided options
  const graphOptions = merge({}, defaultOptions, options);
  
  // Process nodes to add visual properties based on platform and metrics
  const enhancedNodes = data.nodes.map(node => {
    // Determine node size based on metrics if nodeSizing is 'metric'
    let size = 40; // Default size
    if (graphOptions.nodeSizing === 'metric' && node.metrics) {
      // Use views or other available metric for sizing
      const metricValue = node.metrics.views || 
                          node.metrics.engagements || 
                          Object.values(node.metrics)[0] || 0;
      
      // Logarithmic scaling for metrics to prevent extreme size differences
      size = Math.max(20, Math.min(100, 20 + Math.log10(metricValue + 1) * 10));
    } else if (graphOptions.nodeSizing === 'depth' && node.depth !== undefined) {
      // Size based on depth in hierarchy (inverse - root is largest)
      const maxDepth = Math.max(...data.nodes.map(n => n.depth || 0));
      size = Math.max(20, 60 - (node.depth || 0) * (40 / (maxDepth || 1)));
    }

    // Determine node color based on platform
    const color = node.color || getPlatformColor(node.platformType);
    
    // Determine text color for optimal contrast with background
    const textColor = getContrastColor(color);
    
    return {
      ...node,
      size,
      color,
      textColor,
      // Add border for root node
      borderWidth: node.id === data.rootNodeId ? 3 : 1,
      borderColor: node.id === data.rootNodeId ? '#000000' : color,
      // Add icon based on content type
      icon: node.contentType?.toLowerCase(),
      // For hierarchical layouts, assign level based on depth
      level: node.depth !== undefined ? node.depth : undefined
    };
  });

  // Process edges to add visual properties
  const enhancedEdges = data.edges.map(edge => {
    // Get source and target nodes
    const sourceNode = enhancedNodes.find(n => n.id === edge.source);
    const targetNode = enhancedNodes.find(n => n.id === edge.target);
    
    // Determine edge color based on source node color (dimmed)
    const color = sourceNode ? chroma(sourceNode.color).alpha(0.5).css() : '#888888';
    
    // Determine edge width based on relationship
    let width = 1;
    switch (edge.type) {
      case 'parent':
        width = 3;
        break;
      case 'child':
        width = 2;
        break;
      case 'derivative':
        width = 2;
        break;
      case 'reference':
        width = 1;
        break;
      default:
        width = 1;
    }
    
    return {
      ...edge,
      color,
      width,
      // Add arrow to show direction
      arrowSize: 8,
      // Add dashed line for reference edges
      dashed: edge.type === 'reference',
      // Add animation for highlighted paths
      animated: edge.animated !== undefined ? edge.animated : false
    };
  });

  return {
    type: 'graph',
    nodes: enhancedNodes,
    edges: enhancedEdges,
    layout: graphOptions.layout,
    direction: graphOptions.direction,
    nodeSpacing: graphOptions.nodeSpacing,
    rankSpacing: graphOptions.rankSpacing,
    interactive: graphOptions.interactive,
    zoomable: graphOptions.zoomable,
    collapsible: graphOptions.collapsible,
    animationDuration: graphOptions.animationDuration,
    rootNodeId: data.rootNodeId,
    theme: graphOptions.theme,
    onNodeClick: graphOptions.onNodeClick,
    onEdgeClick: graphOptions.onEdgeClick
  };
}

/**
 * Creates configuration for a metric card visualization
 * @param data Metric card data
 * @param options Metric card configuration options
 * @returns Complete metric card configuration
 */
export function createMetricCard(
  data: MetricCardData,
  options: {
    metricType?: string;
    showSparkline?: boolean;
    size?: 'sm' | 'md' | 'lg';
    highlightTrend?: boolean;
    currencyCode?: string;
  } = {}
): object {
  const {
    metricType = 'number',
    showSparkline = true,
    size = 'md',
    highlightTrend = true,
    currencyCode = 'USD'
  } = options;

  // Format the metric value based on its type
  let formattedValue = '';
  switch (metricType) {
    case 'currency':
      formattedValue = formatCurrency(data.value, currencyCode);
      break;
    case 'percentage':
      formattedValue = formatPercentage(data.value);
      break;
    case 'duration':
      formattedValue = formatDuration(data.value);
      break;
    default:
      formattedValue = formatNumber(data.value);
  }

  // Calculate change metrics if previous value is available
  let changePercentage = data.changePercentage;
  let trendDirection = data.trendDirection;
  
  if (data.previousValue !== undefined && changePercentage === undefined) {
    // Calculate percentage change
    changePercentage = data.previousValue !== 0 
      ? ((data.value - data.previousValue) / Math.abs(data.previousValue)) * 100
      : data.value > 0 ? 100 : 0;
    
    // Determine trend direction
    trendDirection = changePercentage > 0 ? 'up' : changePercentage < 0 ? 'down' : 'stable';
  }

  // Format change percentage
  const formattedChangePercentage = changePercentage !== undefined
    ? formatPercentage(Math.abs(changePercentage))
    : undefined;

  // Determine color based on trend direction and type
  let trendColor = data.color;
  if (!trendColor && highlightTrend && trendDirection) {
    if (trendDirection === 'up') {
      trendColor = COLORS.SUCCESS;
    } else if (trendDirection === 'down') {
      trendColor = COLORS.ERROR;
    } else {
      trendColor = COLORS.TEXT;
    }
  }

  // Format sparkline data if available
  const sparklineConfig = showSparkline && data.sparklineData && data.sparklineData.length > 0 
    ? {
        data: data.sparklineData,
        color: trendColor || COLORS.PRIMARY,
        height: size === 'sm' ? 20 : size === 'md' ? 30 : 40,
        showArea: true,
        areaOpacity: 0.2,
        lineWidth: 2,
        showDots: false
      }
    : undefined;

  return {
    title: data.title,
    value: formattedValue,
    rawValue: data.value,
    changePercentage: formattedChangePercentage,
    rawChangePercentage: changePercentage,
    trendDirection,
    trendColor,
    icon: data.icon,
    size,
    sparkline: sparklineConfig,
    metricType
  };
}

/**
 * Creates configuration for a Venn diagram showing audience overlap
 * @param data Venn diagram data with sets and intersections
 * @param options Venn diagram configuration options
 * @returns Complete Venn diagram configuration
 */
export function createVennDiagram(
  data: VennDiagramData,
  options: {
    size?: number;
    strokeWidth?: number;
    showLabels?: boolean;
    highlightOnHover?: boolean;
  } = {}
): object {
  const {
    size = 300,
    strokeWidth = 2,
    showLabels = true,
    highlightOnHover = true
  } = options;

  // Process sets to add colors if not specified
  const enhancedSets = data.sets.map(set => {
    // Determine color based on platform type if available
    const color = set.color || (set.platformType 
      ? getPlatformColor(set.platformType) 
      : undefined);
    
    return {
      ...set,
      color
    };
  });

  // Create configuration for intersections
  const enhancedIntersections = data.intersections.map(intersection => {
    // Create label based on intersection size
    const label = intersection.label || `${formatNumber(intersection.size)}`;
    
    // Get the sets involved in this intersection
    const involvedSets = intersection.sets.map(setId => 
      enhancedSets.find(set => set.id === setId)
    ).filter(Boolean);
    
    // Calculate a blend color for the intersection
    let blendColor;
    if (involvedSets.length > 0) {
      const setColors = involvedSets.map(set => set?.color || '#CCCCCC');
      blendColor = chroma.average(setColors).hex();
    } else {
      blendColor = '#CCCCCC';
    }
    
    return {
      ...intersection,
      label,
      color: blendColor
    };
  });

  return {
    type: 'venn',
    sets: enhancedSets,
    intersections: enhancedIntersections,
    size,
    strokeWidth,
    showLabels,
    highlightOnHover,
    title: data.title,
    tooltip: {
      enabled: true,
      formatter: (setIds: string[], value: number) => {
        if (setIds.length === 1) {
          // Single set
          const set = enhancedSets.find(s => s.id === setIds[0]);
          return `${set?.label || 'Set'}: ${formatNumber(value)}`;
        } else {
          // Intersection
          const setLabels = setIds.map(id => 
            enhancedSets.find(s => s.id === id)?.label || 'Set'
          ).join(' ∩ ');
          return `${setLabels}: ${formatNumber(value)}`;
        }
      }
    }
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Returns the color associated with a specific platform
 * @param platformType Platform type
 * @param opacity Optional opacity value (0-1)
 * @returns Color with optional opacity
 */
export function getPlatformColor(
  platformType: PlatformType,
  opacity?: number
): string {
  // Find the platform configuration
  const platform = Object.values(PLATFORMS).find(p => p.id === platformType);
  
  // Get the platform color or default to a generic color
  const color = platform?.color || '#888888';
  
  // Apply opacity if specified
  if (opacity !== undefined && opacity >= 0 && opacity <= 1) {
    return chroma(color).alpha(opacity).css();
  }
  
  return color;
}

/**
 * Returns the color associated with a specific metric type
 * @param metricType Metric type identifier
 * @param opacity Optional opacity value (0-1)
 * @returns Color with optional opacity
 */
export function getMetricColor(
  metricType: string,
  opacity?: number
): string {
  // Color mapping for different metric types
  const metricColors: Record<string, string> = {
    views: '#2563EB', // Blue
    engagements: '#8B5CF6', // Purple
    engagement_rate: '#8B5CF6', // Purple
    likes: '#EC4899', // Pink
    comments: '#0D9488', // Teal
    shares: '#F59E0B', // Amber
    watch_time: '#10B981', // Emerald
    content_value: '#64748B' // Slate
  };
  
  // Get the metric color or default to a generic color
  const color = metricColors[metricType] || COLORS.PRIMARY;
  
  // Apply opacity if specified
  if (opacity !== undefined && opacity >= 0 && opacity <= 1) {
    return chroma(color).alpha(opacity).css();
  }
  
  return color;
}

/**
 * Creates a color gradient array between two colors
 * @param startColor Starting color
 * @param endColor Ending color
 * @param steps Number of color steps in the gradient
 * @returns Array of color hex codes forming a gradient
 */
export function createColorGradient(
  startColor: string,
  endColor: string,
  steps: number
): string[] {
  // Create a color scale using chroma.js
  const scale = chroma.scale([startColor, endColor]).mode('lch').colors(steps);
  
  return scale;
}