/**
 * Visualization module for the Engagerr platform's analytics engine.
 * Transforms complex analytics data into standardized visualization formats for
 * dashboards, interactive visualizations, and exportable media kits.
 */

import { AnalyticsTypes } from '../types/analytics';
import { ContentTypes } from '../types/content';
import { PlatformTypes } from '../types/platform';
import { logger } from '../utils/logger';
import * as dateTimeUtils from '../utils/dateTime';
import { VISUALIZATION_CONFIG } from '../config/constants';
import * as lodash from 'lodash'; // v4.17.21

// Default options for chart configurations
export const DEFAULT_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: true,
  includeTooltips: true,
  includeLegend: true,
  colorPalette: 'default'
};

// Color palettes for visualizations
export const COLOR_PALETTES = {
  default: ['#2563EB', '#0D9488', '#8B5CF6', '#0891B2', '#4F46E5', '#059669'],
  platforms: {
    youtube: '#FF0000',
    instagram: '#E1306C',
    tiktok: '#000000',
    twitter: '#1DA1F2',
    linkedin: '#0077B5'
  },
  content: {
    video: '#FF0000',
    image: '#E1306C',
    text: '#1DA1F2',
    audio: '#8B5CF6'
  },
  trends: {
    positive: '#10B981',
    neutral: '#6B7280',
    negative: '#EF4444'
  }
};

/**
 * Creates a standardized chart configuration object for frontend rendering
 * 
 * @param chartType - The type of chart to create (line, bar, pie, etc.)
 * @param data - The data to visualize
 * @param options - Customization options for the chart
 * @returns Chart configuration object ready for frontend rendering
 */
export function createChartConfiguration(
  chartType: string,
  data: any,
  options: object = {}
): object {
  logger.debug('Creating chart configuration', { chartType });
  
  // Merge provided options with defaults
  const chartOptions = lodash.merge({}, DEFAULT_CHART_OPTIONS, options);
  
  // Validate the data structure for the chart type
  validateDataForChartType(chartType, data);
  
  // Select appropriate color palette
  const colorPalette = getColorPalette(chartOptions.colorPalette, data);
  
  // Build the chart configuration based on chart type
  const config = {
    type: chartType,
    data: formatDataForChart(chartType, data, colorPalette),
    options: buildChartOptions(chartType, data, chartOptions)
  };
  
  logger.debug('Chart configuration created');
  return config;
}

/**
 * Validates that the provided data matches the expected structure for the chart type
 * @private
 */
function validateDataForChartType(chartType: string, data: any): void {
  // Implementation would check that data has correct structure for the chart type
  // For now, just do a simple check that data exists
  if (!data) {
    logger.error('Invalid data for chart type', { chartType });
    throw new Error(`Invalid data for chart type: ${chartType}`);
  }
}

/**
 * Gets the appropriate color palette based on options and data
 * @private
 */
function getColorPalette(palette: string, data: any): string[] {
  if (palette === 'platforms' && Array.isArray(data)) {
    // Use platform-specific colors if data has platform property
    return data.map((item) => {
      return COLOR_PALETTES.platforms[item.platform?.toLowerCase() as keyof typeof COLOR_PALETTES.platforms] || 
             COLOR_PALETTES.default[0];
    });
  }
  
  if (palette === 'content' && Array.isArray(data)) {
    // Use content-type-specific colors if data has contentType property
    return data.map((item) => {
      return COLOR_PALETTES.content[item.contentType?.toLowerCase() as keyof typeof COLOR_PALETTES.content] || 
             COLOR_PALETTES.default[0];
    });
  }
  
  if (palette === 'trends' && Array.isArray(data)) {
    // Use trend-specific colors if data has trend property
    return data.map((item) => {
      const trend = item.trend?.toLowerCase();
      if (trend === 'positive') return COLOR_PALETTES.trends.positive;
      if (trend === 'negative') return COLOR_PALETTES.trends.negative;
      return COLOR_PALETTES.trends.neutral;
    });
  }
  
  // Default color palette
  return [...COLOR_PALETTES.default];
}

/**
 * Formats data for the specific chart type
 * @private
 */
function formatDataForChart(chartType: string, data: any, colors: string[]): object {
  // Implementation would transform data into the format needed for the chart library
  // For example, converting to datasets for line charts, or data points for pie charts
  
  // For simplicity, assuming a standard format with labels and datasets
  if (chartType === 'pie' || chartType === 'doughnut') {
    return {
      labels: data.map((item: any) => item.label),
      datasets: [{
        data: data.map((item: any) => item.value),
        backgroundColor: colors,
        borderWidth: 1
      }]
    };
  }
  
  // For line, bar, radar charts
  return {
    labels: data.labels,
    datasets: data.datasets.map((dataset: any, index: number) => ({
      ...dataset,
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length]
    }))
  };
}

/**
 * Builds chart options based on chart type and configuration
 * @private
 */
function buildChartOptions(chartType: string, data: any, options: any): object {
  const chartOptions: any = {
    responsive: options.responsive,
    maintainAspectRatio: options.maintainAspectRatio
  };
  
  // Add tooltips if enabled
  if (options.includeTooltips) {
    chartOptions.plugins = {
      ...chartOptions.plugins,
      tooltip: {
        enabled: true,
        mode: chartType === 'pie' || chartType === 'doughnut' ? 'nearest' : 'index',
        intersect: false
      }
    };
  }
  
  // Add legend if enabled
  if (options.includeLegend) {
    chartOptions.plugins = {
      ...chartOptions.plugins,
      legend: {
        display: true,
        position: 'top'
      }
    };
  }
  
  // Additional chart-specific options
  if (chartType === 'line' || chartType === 'bar') {
    chartOptions.scales = {
      x: {
        ticks: {
          autoSkip: true,
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    };
  }
  
  return chartOptions;
}

/**
 * Transforms time series analytics data into chart configuration
 * 
 * @param timeSeriesData - The time series data to visualize
 * @param options - Customization options for the chart
 * @returns Chart configuration for time series visualization
 */
export function timeSeriesDataToChartConfig(
  timeSeriesData: AnalyticsTypes.TimeSeriesData,
  options: object = {}
): object {
  logger.debug('Creating time series chart configuration', { 
    metric: timeSeriesData.metricName 
  });
  
  // Extract and format data points
  const labels = timeSeriesData.dataPoints.map(point => 
    dateTimeUtils.formatDate(point.date)
  );
  
  const values = timeSeriesData.dataPoints.map(point => point.value);
  
  // Determine trend color based on percentChange
  const trendColor = timeSeriesData.percentChange >= 0 
    ? COLOR_PALETTES.trends.positive
    : COLOR_PALETTES.trends.negative;
  
  // Create dataset with trend styling
  const datasets = [{
    label: timeSeriesData.metricName,
    data: values,
    borderColor: trendColor,
    backgroundColor: `${trendColor}20`, // Add transparency
    fill: options.fill !== undefined ? options.fill : true,
    tension: 0.3, // Slight curve for line charts
    pointRadius: 2,
    pointHoverRadius: 5
  }];
  
  // Configure chart options with time series specifics
  const chartOptions = {
    ...options,
    timeSeriesOptions: {
      granularity: timeSeriesData.granularity,
      percentChange: timeSeriesData.percentChange,
      trend: timeSeriesData.trend
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: timeSeriesData.metricName
        },
        beginAtZero: true
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          footer: (tooltipItems: any[]) => {
            // Add trend information to tooltip
            return `Trend: ${timeSeriesData.trend} (${timeSeriesData.percentChange >= 0 ? '+' : ''}${timeSeriesData.percentChange.toFixed(2)}%)`;
          }
        }
      }
    }
  };
  
  // Create final chart configuration
  return createChartConfiguration(
    'line', 
    {
      labels,
      datasets
    },
    chartOptions
  );
}

/**
 * Transforms platform breakdown data into chart configuration
 * 
 * @param platformBreakdowns - The platform breakdown data to visualize
 * @param metricToVisualize - The specific metric to display
 * @param options - Customization options for the chart
 * @returns Chart configuration for platform breakdown visualization
 */
export function platformBreakdownToChartConfig(
  platformBreakdowns: AnalyticsTypes.PlatformBreakdown[],
  metricToVisualize: string,
  options: object = {}
): object {
  logger.debug('Creating platform breakdown chart', { 
    platforms: platformBreakdowns.length, 
    metric: metricToVisualize 
  });
  
  // Default to pie chart if not specified
  const chartType = options?.chartType || 'doughnut';
  
  // Extract platform labels and metric values
  const data = platformBreakdowns.map(platform => ({
    label: platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1),
    value: platform.metrics[metricToVisualize] || 0,
    platform: platform.platform,
    percentage: platform.percentage,
    contentCount: platform.contentCount
  }));
  
  // Sort by value descending for better visualization
  data.sort((a, b) => b.value - a.value);
  
  // Set up colors using platform-specific colors
  const colors = data.map(item => 
    COLOR_PALETTES.platforms[item.platform.toLowerCase() as keyof typeof COLOR_PALETTES.platforms] || 
    COLOR_PALETTES.default[0]
  );
  
  let chartConfig;
  
  // Different configuration based on chart type
  if (chartType === 'pie' || chartType === 'doughnut') {
    chartConfig = {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: colors,
        borderWidth: 1
      }]
    };
  } else if (chartType === 'bar') {
    chartConfig = {
      labels: data.map(d => d.label),
      datasets: [{
        label: metricToVisualize,
        data: data.map(d => d.value),
        backgroundColor: colors
      }]
    };
  } else {
    // Handle other chart types as needed
    chartConfig = {
      labels: data.map(d => d.label),
      datasets: [{
        label: metricToVisualize,
        data: data.map(d => d.value),
        backgroundColor: colors
      }]
    };
  }
  
  // Configure chart options
  const chartOptions = {
    ...options,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const dataItem = data[context.dataIndex];
            return [
              `${dataItem.label}: ${context.formattedValue}`,
              `Percentage: ${dataItem.percentage.toFixed(2)}%`,
              `Content Items: ${dataItem.contentCount}`
            ];
          }
        }
      }
    }
  };
  
  // Create final chart configuration
  return createChartConfiguration(chartType, chartConfig, chartOptions);
}

/**
 * Transforms content type breakdown data into chart configuration
 * 
 * @param contentTypeBreakdowns - The content type breakdown data to visualize
 * @param metricToVisualize - The specific metric to display
 * @param options - Customization options for the chart
 * @returns Chart configuration for content type breakdown visualization
 */
export function contentTypeBreakdownToChartConfig(
  contentTypeBreakdowns: AnalyticsTypes.ContentTypeBreakdown[],
  metricToVisualize: string,
  options: object = {}
): object {
  logger.debug('Creating content type breakdown chart', { 
    contentTypes: contentTypeBreakdowns.length, 
    metric: metricToVisualize 
  });
  
  // Default to pie chart if not specified
  const chartType = options?.chartType || 'doughnut';
  
  // Extract content type labels and metric values
  const data = contentTypeBreakdowns.map(contentType => ({
    label: formatContentTypeName(contentType.contentType),
    value: contentType.metrics[metricToVisualize] || 0,
    contentType: contentType.contentType,
    percentage: contentType.percentage,
    contentCount: contentType.contentCount,
    engagementRate: contentType.engagementRate
  }));
  
  // Sort by value descending for better visualization
  data.sort((a, b) => b.value - a.value);
  
  // Set up colors using content-type-specific colors
  const colors = data.map(item => 
    COLOR_PALETTES.content[item.contentType.toLowerCase() as keyof typeof COLOR_PALETTES.content] || 
    COLOR_PALETTES.default[0]
  );
  
  let chartConfig;
  
  // Different configuration based on chart type
  if (chartType === 'pie' || chartType === 'doughnut') {
    chartConfig = {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: colors,
        borderWidth: 1
      }]
    };
  } else if (chartType === 'bar') {
    chartConfig = {
      labels: data.map(d => d.label),
      datasets: [{
        label: metricToVisualize,
        data: data.map(d => d.value),
        backgroundColor: colors
      }]
    };
  } else {
    // Handle other chart types as needed
    chartConfig = {
      labels: data.map(d => d.label),
      datasets: [{
        label: metricToVisualize,
        data: data.map(d => d.value),
        backgroundColor: colors
      }]
    };
  }
  
  // Configure chart options
  const chartOptions = {
    ...options,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const dataItem = data[context.dataIndex];
            return [
              `${dataItem.label}: ${context.formattedValue}`,
              `Percentage: ${dataItem.percentage.toFixed(2)}%`,
              `Content Items: ${dataItem.contentCount}`,
              `Engagement Rate: ${dataItem.engagementRate.toFixed(2)}%`
            ];
          }
        }
      }
    }
  };
  
  // Create final chart configuration
  return createChartConfiguration(chartType, chartConfig, chartOptions);
}

/**
 * Formats content type enum value into a readable display name
 * @private
 */
function formatContentTypeName(contentType: ContentTypes.ContentType): string {
  const formattedName = contentType.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return formattedName;
}

/**
 * Transforms audience overlap data into Venn diagram configuration
 * 
 * @param audienceOverlap - The audience overlap data to visualize
 * @param options - Customization options for the diagram
 * @returns Venn diagram configuration for audience overlap visualization
 */
export function audienceOverlapToVennConfig(
  audienceOverlap: AnalyticsTypes.AudienceOverlap,
  options: object = {}
): object {
  logger.debug('Creating audience overlap Venn diagram');
  
  // Extract platform pairs and their overlaps
  const { platformPairs, estimatedDuplication, estimatedUniqueReach } = audienceOverlap;
  
  // Calculate sets for the Venn diagram
  const sets = platformPairs.map(pair => {
    const [platform1, platform2] = pair.platforms;
    return {
      sets: [platform1, platform2],
      size: pair.overlapPercentage,
      label: `${formatPlatformName(platform1)} ∩ ${formatPlatformName(platform2)}`,
      percentage: pair.overlapPercentage
    };
  });
  
  // Add single platform sets
  const platforms = new Set<PlatformTypes.PlatformType>();
  platformPairs.forEach(pair => {
    platforms.add(pair.platforms[0]);
    platforms.add(pair.platforms[1]);
  });
  
  // Add individual platform sets
  Array.from(platforms).forEach(platform => {
    // For individual platform sizes, we would need actual audience size
    // For now, using a placeholder value
    sets.push({
      sets: [platform],
      size: 100, // Placeholder - this would come from actual data
      label: formatPlatformName(platform),
      color: COLOR_PALETTES.platforms[platform.toLowerCase() as keyof typeof COLOR_PALETTES.platforms]
    });
  });
  
  // Configure Venn diagram options
  const vennOptions = {
    ...options,
    colorScheme: COLOR_PALETTES.platforms,
    additionalInfo: {
      estimatedDuplication,
      estimatedUniqueReach
    }
  };
  
  // Return specialized Venn diagram configuration
  // Note: This doesn't use createChartConfiguration because Venn diagrams
  // typically require a different visualization library than standard charts
  return {
    type: 'venn',
    data: {
      sets
    },
    options: vennOptions
  };
}

/**
 * Formats platform type enum value into a readable display name
 * @private
 */
function formatPlatformName(platform: PlatformTypes.PlatformType): string {
  const formattedName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
  return formattedName;
}

/**
 * Transforms content relationship data into graph visualization configuration
 * 
 * @param relationshipGraph - The content relationship graph to visualize
 * @param options - Customization options for the graph
 * @returns Graph configuration for content relationship visualization
 */
export function contentRelationshipToGraphConfig(
  relationshipGraph: ContentTypes.ContentRelationshipGraph,
  options: object = {}
): object {
  logger.debug('Creating content relationship graph visualization');
  
  // Process nodes with visual attributes
  const nodes = relationshipGraph.nodes.map(node => {
    // Get platform-specific color
    const platformColor = 
      COLOR_PALETTES.platforms[node.platform.toLowerCase() as keyof typeof COLOR_PALETTES.platforms] || 
      COLOR_PALETTES.default[0];
    
    // Calculate node size based on views/engagements
    const metrics = node.metrics || {};
    const views = metrics.views || 0;
    const maxViews = Math.max(...relationshipGraph.nodes.map(n => n.metrics?.views || 0));
    const sizeScale = maxViews > 0 ? (views / maxViews) : 0.5;
    const size = 10 + (sizeScale * 40); // Scale between 10-50
    
    return {
      id: node.id,
      label: node.label,
      size,
      color: platformColor,
      platform: node.platform,
      contentType: node.contentType,
      metrics: node.metrics,
      image: node.thumbnail,
      isRoot: node.isRoot,
      depth: node.depth,
      url: node.url
    };
  });
  
  // Process edges with relationship-specific styling
  const edges = relationshipGraph.edges.map(edge => {
    // Style based on relationship type
    let style = 'solid';
    let width = 2;
    
    switch (edge.type) {
      case ContentTypes.RelationshipType.PARENT:
        style = 'solid';
        width = 3;
        break;
      case ContentTypes.RelationshipType.DERIVATIVE:
        style = 'dashed';
        width = 2;
        break;
      case ContentTypes.RelationshipType.REPURPOSED:
        style = 'dotted';
        width = 2;
        break;
      case ContentTypes.RelationshipType.REACTION:
        style = 'dash-dot';
        width = 1;
        break;
      case ContentTypes.RelationshipType.REFERENCE:
        style = 'dash-dot';
        width = 1;
        break;
    }
    
    // Scale width by confidence
    const confidenceAdjustment = edge.confidence || 1;
    width = width * confidenceAdjustment;
    
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: formatRelationshipType(edge.type),
      type: edge.type,
      style,
      width,
      confidence: edge.confidence
    };
  });
  
  // Determine layout based on options
  const layout = options.layout || 'hierarchical';
  
  // Graph visualization configuration
  const graphConfig = {
    nodes,
    edges,
    layout,
    options: {
      ...options,
      hierarchical: {
        direction: 'UD', // Top to bottom
        sortMethod: 'directed',
        levelSeparation: 150,
        nodeSpacing: 100
      },
      interaction: {
        hover: true,
        tooltipDelay: 300,
        navigationButtons: true,
        keyboard: true
      }
    }
  };
  
  // Return specialized graph visualization configuration
  return {
    type: 'network',
    data: graphConfig,
    options: {
      ...options,
      physics: {
        enabled: true,
        stabilization: {
          iterations: 200
        },
        hierarchicalRepulsion: {
          nodeDistance: 150
        }
      }
    }
  };
}

/**
 * Formats relationship type enum value into a readable display name
 * @private
 */
function formatRelationshipType(type: ContentTypes.RelationshipType): string {
  const formattedName = type.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return formattedName;
}

/**
 * Transforms aggregate metrics into multiple chart configurations
 * 
 * @param metrics - The aggregate metrics to visualize
 * @param options - Customization options for the charts
 * @returns Collection of chart configurations for dashboard visualization
 */
export function aggregateMetricsToChartConfigs(
  metrics: AnalyticsTypes.AggregateMetrics,
  options: object = {}
): object {
  logger.debug('Creating aggregate metrics visualizations');
  
  const result: Record<string, any> = {
    metricCards: generateMetricCards(metrics),
    charts: {}
  };
  
  // Create growth rate chart if data available
  if (metrics.growthRates && Object.keys(metrics.growthRates).length > 0) {
    const growthData = Object.entries(metrics.growthRates).map(([key, value]) => ({
      label: formatMetricName(key),
      value,
      trend: value >= 0 ? 'positive' : 'negative'
    }));
    
    result.charts.growthChart = createChartConfiguration(
      'bar',
      {
        labels: growthData.map(d => d.label),
        datasets: [{
          label: 'Growth Rate (%)',
          data: growthData.map(d => d.value),
          backgroundColor: growthData.map(d => 
            d.trend === 'positive' ? COLOR_PALETTES.trends.positive : COLOR_PALETTES.trends.negative
          )
        }]
      },
      {
        title: {
          display: true,
          text: 'Growth Rates'
        }
      }
    );
  }
  
  // Add engagement breakdown chart
  result.charts.engagementChart = createChartConfiguration(
    'pie',
    {
      labels: ['Likes', 'Comments', 'Shares'],
      datasets: [{
        data: [
          metrics.totalLikes || 0,
          metrics.totalComments || 0,
          metrics.totalShares || 0
        ],
        backgroundColor: [
          COLOR_PALETTES.default[0],
          COLOR_PALETTES.default[1],
          COLOR_PALETTES.default[2]
        ]
      }]
    },
    {
      title: {
        display: true,
        text: 'Engagement Breakdown'
      }
    }
  );
  
  // Period comparison chart (if previous period data available in options)
  if (options.previousPeriodMetrics) {
    const currentPeriod = {
      views: metrics.totalViews || 0,
      engagements: metrics.totalEngagements || 0,
      shares: metrics.totalShares || 0
    };
    
    const previousPeriod = {
      views: options.previousPeriodMetrics.totalViews || 0,
      engagements: options.previousPeriodMetrics.totalEngagements || 0,
      shares: options.previousPeriodMetrics.totalShares || 0
    };
    
    result.charts.periodComparisonChart = createChartConfiguration(
      'bar',
      {
        labels: ['Views', 'Engagements', 'Shares'],
        datasets: [
          {
            label: 'Current Period',
            data: [currentPeriod.views, currentPeriod.engagements, currentPeriod.shares],
            backgroundColor: COLOR_PALETTES.default[0]
          },
          {
            label: 'Previous Period',
            data: [previousPeriod.views, previousPeriod.engagements, previousPeriod.shares],
            backgroundColor: COLOR_PALETTES.default[1]
          }
        ]
      },
      {
        title: {
          display: true,
          text: 'Period Comparison'
        }
      }
    );
  }
  
  return result;
}

/**
 * Generates metric cards for dashboard visualizations
 * @private
 */
function generateMetricCards(metrics: AnalyticsTypes.AggregateMetrics): object[] {
  return [
    {
      title: 'Total Views',
      value: metrics.totalViews || 0,
      icon: 'eye',
      trend: metrics.growthRates?.views,
      color: 'blue'
    },
    {
      title: 'Total Engagements',
      value: metrics.totalEngagements || 0,
      icon: 'thumbs-up',
      trend: metrics.growthRates?.engagements,
      color: 'green'
    },
    {
      title: 'Engagement Rate',
      value: `${(metrics.engagementRate || 0).toFixed(2)}%`,
      icon: 'percentage',
      trend: metrics.growthRates?.engagementRate,
      color: 'purple'
    },
    {
      title: 'Estimated Value',
      value: formatCurrency(metrics.estimatedTotalValue || 0),
      icon: 'dollar-sign',
      trend: metrics.growthRates?.estimatedValue,
      color: 'amber'
    }
  ];
}

/**
 * Formats a currency value with appropriate symbol and formatting
 * @private
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Formats a metric name into a readable display name
 * @private
 */
function formatMetricName(metricName: string): string {
  return metricName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/([a-z])([A-Z])/, '$1 $2') // Add space between words
    .trim();
}

/**
 * Transforms content family metrics into multiple chart configurations
 * 
 * @param familyMetrics - The family metrics to visualize
 * @param options - Customization options for the charts
 * @returns Collection of chart configurations for family analytics visualization
 */
export function familyMetricsToChartConfigs(
  familyMetrics: AnalyticsTypes.FamilyMetrics,
  options: object = {}
): object {
  logger.debug('Creating family metrics visualizations');
  
  const result: Record<string, any> = {
    metricCards: generateFamilyMetricCards(familyMetrics),
    charts: {}
  };
  
  // Add platform breakdown
  if (familyMetrics.platformBreakdown?.length > 0) {
    result.charts.platformBreakdown = platformBreakdownToChartConfig(
      familyMetrics.platformBreakdown,
      'views',
      {
        title: {
          display: true,
          text: 'Platform Distribution'
        }
      }
    );
  }
  
  // Add content type breakdown
  if (familyMetrics.contentTypeBreakdown?.length > 0) {
    result.charts.contentTypeBreakdown = contentTypeBreakdownToChartConfig(
      familyMetrics.contentTypeBreakdown,
      'views',
      {
        title: {
          display: true,
          text: 'Content Type Distribution'
        }
      }
    );
  }
  
  // Add audience overlap if available
  if (familyMetrics.audienceOverlap) {
    result.charts.audienceOverlap = audienceOverlapToVennConfig(
      familyMetrics.audienceOverlap,
      {
        title: {
          display: true,
          text: 'Audience Overlap'
        }
      }
    );
  }
  
  // Add content item comparison chart
  if (familyMetrics.contentItems?.length > 0) {
    // Sort by views descending
    const sortedItems = [...familyMetrics.contentItems].sort((a, b) => 
      (b.metrics?.views || 0) - (a.metrics?.views || 0)
    );
    
    // Limit to top 10 items for readability
    const topItems = sortedItems.slice(0, 10);
    
    // Get platform colors for items
    const itemColors = topItems.map(item => 
      COLOR_PALETTES.platforms[item.platform.toLowerCase() as keyof typeof COLOR_PALETTES.platforms] || 
      COLOR_PALETTES.default[0]
    );
    
    result.charts.contentItemComparison = createChartConfiguration(
      'bar',
      {
        labels: topItems.map(item => truncateString(item.title, 20)),
        datasets: [{
          label: 'Views',
          data: topItems.map(item => item.metrics?.views || 0),
          backgroundColor: itemColors
        }]
      },
      {
        title: {
          display: true,
          text: 'Top Content Items by Views'
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (context: any) => {
                const item = topItems[context[0].dataIndex];
                return item.title;
              },
              afterTitle: (context: any) => {
                const item = topItems[context[0].dataIndex];
                return `${formatPlatformName(item.platform)} - ${formatContentTypeName(item.contentType)}`;
              }
            }
          }
        }
      }
    );
  }
  
  return result;
}

/**
 * Generates metric cards for family dashboard visualizations
 * @private
 */
function generateFamilyMetricCards(familyMetrics: AnalyticsTypes.FamilyMetrics): object[] {
  return [
    {
      title: 'Total Views',
      value: familyMetrics.aggregateMetrics.totalViews || 0,
      icon: 'eye',
      color: 'blue'
    },
    {
      title: 'Total Engagements',
      value: familyMetrics.aggregateMetrics.totalEngagements || 0,
      icon: 'thumbs-up',
      color: 'green'
    },
    {
      title: 'Content Items',
      value: familyMetrics.contentCount || 0,
      icon: 'layers',
      color: 'indigo'
    },
    {
      title: 'Platforms',
      value: familyMetrics.platformCount || 0,
      icon: 'globe',
      color: 'pink'
    },
    {
      title: 'Estimated Value',
      value: formatCurrency(familyMetrics.aggregateMetrics.estimatedTotalValue || 0),
      icon: 'dollar-sign',
      color: 'amber'
    }
  ];
}

/**
 * Truncates a string to a specified length and adds ellipsis if needed
 * @private
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Transforms creator-level metrics into multiple chart configurations
 * 
 * @param creatorMetrics - The creator metrics to visualize
 * @param options - Customization options for the charts
 * @returns Collection of chart configurations for creator analytics dashboard
 */
export function creatorMetricsToChartConfigs(
  creatorMetrics: AnalyticsTypes.CreatorAggregateMetrics,
  options: object = {}
): object {
  logger.debug('Creating creator analytics visualizations');
  
  const result: Record<string, any> = {
    metricCards: generateCreatorMetricCards(creatorMetrics),
    charts: {}
  };
  
  // Add platform breakdown
  if (creatorMetrics.platformBreakdown?.length > 0) {
    result.charts.platformBreakdown = platformBreakdownToChartConfig(
      creatorMetrics.platformBreakdown,
      'views',
      {
        title: {
          display: true,
          text: 'Platform Performance'
        }
      }
    );
  }
  
  // Add content type breakdown
  if (creatorMetrics.contentTypeBreakdown?.length > 0) {
    result.charts.contentTypeBreakdown = contentTypeBreakdownToChartConfig(
      creatorMetrics.contentTypeBreakdown,
      'views',
      {
        title: {
          display: true,
          text: 'Content Type Performance'
        }
      }
    );
  }
  
  // Add growth metrics visualization if available
  if (creatorMetrics.growthMetrics && Object.keys(creatorMetrics.growthMetrics).length > 0) {
    const growthData = Object.entries(creatorMetrics.growthMetrics).map(([key, value]) => ({
      label: formatMetricName(key),
      value,
      trend: value >= 0 ? 'positive' : 'negative'
    }));
    
    result.charts.growthMetrics = createChartConfiguration(
      'bar',
      {
        labels: growthData.map(d => d.label),
        datasets: [{
          label: 'Growth Rate (%)',
          data: growthData.map(d => d.value),
          backgroundColor: growthData.map(d => 
            d.trend === 'positive' ? COLOR_PALETTES.trends.positive : COLOR_PALETTES.trends.negative
          )
        }]
      },
      {
        title: {
          display: true,
          text: 'Growth Metrics'
        }
      }
    );
  }
  
  // Add top performing content visualization
  if (creatorMetrics.topPerformingContent?.length > 0) {
    // Get platform colors for items
    const itemColors = creatorMetrics.topPerformingContent.map(item => 
      COLOR_PALETTES.platforms[item.platform.toLowerCase() as keyof typeof COLOR_PALETTES.platforms] || 
      COLOR_PALETTES.default[0]
    );
    
    result.charts.topContent = createChartConfiguration(
      'bar',
      {
        labels: creatorMetrics.topPerformingContent.map(item => truncateString(item.title, 20)),
        datasets: [{
          label: 'Views',
          data: creatorMetrics.topPerformingContent.map(item => item.metrics?.views || 0),
          backgroundColor: itemColors
        }]
      },
      {
        title: {
          display: true,
          text: 'Top Performing Content'
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (context: any) => {
                const item = creatorMetrics.topPerformingContent[context[0].dataIndex];
                return item.title;
              },
              afterTitle: (context: any) => {
                const item = creatorMetrics.topPerformingContent[context[0].dataIndex];
                return `${formatPlatformName(item.platform)} - ${formatContentTypeName(item.contentType)}`;
              }
            }
          }
        }
      }
    );
  }
  
  // Add benchmark comparison if available
  if (creatorMetrics.benchmarks?.length > 0) {
    const benchmark = creatorMetrics.benchmarks[0]; // Use first benchmark
    
    const benchmarkCategories = Object.keys(benchmark.comparison)
      .filter(key => key in benchmark.metrics); // Only include metrics that exist in both
    
    const creatorValues = benchmarkCategories.map(category => benchmark.metrics[category]);
    const benchmarkValues = benchmarkCategories.map(category => benchmark.comparison[category]);
    
    result.charts.benchmarkComparison = createChartConfiguration(
      'radar',
      {
        labels: benchmarkCategories.map(formatMetricName),
        datasets: [
          {
            label: 'Your Performance',
            data: creatorValues,
            backgroundColor: `${COLOR_PALETTES.default[0]}40`,
            borderColor: COLOR_PALETTES.default[0],
            pointBackgroundColor: COLOR_PALETTES.default[0]
          },
          {
            label: benchmark.benchmarkGroup,
            data: benchmarkValues,
            backgroundColor: `${COLOR_PALETTES.default[1]}40`,
            borderColor: COLOR_PALETTES.default[1],
            pointBackgroundColor: COLOR_PALETTES.default[1]
          }
        ]
      },
      {
        title: {
          display: true,
          text: `Benchmark Comparison: ${benchmark.benchmarkType}`
        }
      }
    );
  }
  
  return result;
}

/**
 * Generates metric cards for creator dashboard visualizations
 * @private
 */
function generateCreatorMetricCards(creatorMetrics: AnalyticsTypes.CreatorAggregateMetrics): object[] {
  return [
    {
      title: 'Total Views',
      value: creatorMetrics.aggregateMetrics.totalViews || 0,
      icon: 'eye',
      trend: creatorMetrics.growthMetrics?.views,
      color: 'blue'
    },
    {
      title: 'Engagement Rate',
      value: `${(creatorMetrics.aggregateMetrics.engagementRate || 0).toFixed(2)}%`,
      icon: 'bar-chart-2',
      trend: creatorMetrics.growthMetrics?.engagementRate,
      color: 'green'
    },
    {
      title: 'Total Content',
      value: creatorMetrics.totalContentCount || 0,
      icon: 'file-text',
      color: 'indigo'
    },
    {
      title: 'Content Families',
      value: creatorMetrics.contentFamilyCount || 0,
      icon: 'git-branch',
      color: 'purple'
    },
    {
      title: 'Estimated Value',
      value: formatCurrency(creatorMetrics.aggregateMetrics.estimatedTotalValue || 0),
      icon: 'dollar-sign',
      trend: creatorMetrics.growthMetrics?.estimatedValue,
      color: 'amber'
    }
  ];
}

/**
 * Creates specialized visualizations formatted for creator media kits
 * 
 * @param creatorMetrics - The creator metrics to include in the media kit
 * @param mediaKitTemplate - The template style for the media kit
 * @param options - Customization options for the visualizations
 * @returns Media kit-optimized visualizations with export-ready formatting
 */
export function generateMediaKitVisualizations(
  creatorMetrics: AnalyticsTypes.CreatorAggregateMetrics,
  mediaKitTemplate: string,
  options: object = {}
): object {
  logger.debug('Generating media kit visualizations', { template: mediaKitTemplate });
  
  // Apply template-specific styling based on selected template
  const templateConfig = getMediaKitTemplateConfig(mediaKitTemplate);
  
  const result: Record<string, any> = {
    template: mediaKitTemplate,
    metricHighlights: generateMediaKitMetricHighlights(creatorMetrics),
    charts: {}
  };
  
  // Platform presence visualization (simplified for media kit)
  if (creatorMetrics.platformBreakdown?.length > 0) {
    const platformData = creatorMetrics.platformBreakdown.map(platform => ({
      platform: platform.platform,
      name: formatPlatformName(platform.platform),
      followers: platform.metrics.followers || 0,
      engagementRate: platform.engagementRate,
      icon: platform.platform.toLowerCase(),
      color: COLOR_PALETTES.platforms[platform.platform.toLowerCase() as keyof typeof COLOR_PALETTES.platforms] || 
             COLOR_PALETTES.default[0]
    }));
    
    result.platformPresence = platformData;
    
    // Create a simplified bar chart for platforms
    result.charts.platformChart = createChartConfiguration(
      'bar',
      {
        labels: platformData.map(p => p.name),
        datasets: [{
          label: 'Followers',
          data: platformData.map(p => p.followers),
          backgroundColor: platformData.map(p => p.color)
        }]
      },
      {
        ...templateConfig.chartOptions,
        title: {
          display: true,
          text: 'Platform Presence'
        }
      }
    );
  }
  
  // Audience demographics visualizations (if available in the metrics)
  if (creatorMetrics.audienceDemographics) {
    const { audienceDemographics } = creatorMetrics;
    
    // Age distribution
    if (audienceDemographics.ageRanges) {
      const ageData = Object.entries(audienceDemographics.ageRanges).map(([range, percentage]) => ({
        label: range,
        value: percentage
      }));
      
      result.charts.ageDistribution = createChartConfiguration(
        'pie',
        {
          labels: ageData.map(d => d.label),
          datasets: [{
            data: ageData.map(d => d.value),
            backgroundColor: COLOR_PALETTES.default
          }]
        },
        {
          ...templateConfig.chartOptions,
          title: {
            display: true,
            text: 'Audience Age Distribution'
          }
        }
      );
    }
    
    // Gender distribution
    if (audienceDemographics.genderDistribution) {
      const genderData = Object.entries(audienceDemographics.genderDistribution).map(([gender, percentage]) => ({
        label: gender.charAt(0).toUpperCase() + gender.slice(1),
        value: percentage
      }));
      
      result.charts.genderDistribution = createChartConfiguration(
        'doughnut',
        {
          labels: genderData.map(d => d.label),
          datasets: [{
            data: genderData.map(d => d.value),
            backgroundColor: [
              '#4F46E5', // Indigo for male
              '#EC4899', // Pink for female
              '#8B5CF6'  // Purple for other
            ]
          }]
        },
        {
          ...templateConfig.chartOptions,
          title: {
            display: true,
            text: 'Audience Gender Distribution'
          }
        }
      );
    }
    
    // Geographic distribution
    if (audienceDemographics.topLocations) {
      const locationData = Object.entries(audienceDemographics.topLocations)
        .sort((a, b) => b[1] - a[1]) // Sort by percentage descending
        .slice(0, 5) // Top 5 locations
        .map(([location, percentage]) => ({
          label: location,
          value: percentage
        }));
      
      result.charts.geoDistribution = createChartConfiguration(
        'bar',
        {
          labels: locationData.map(d => d.label),
          datasets: [{
            label: 'Audience %',
            data: locationData.map(d => d.value),
            backgroundColor: COLOR_PALETTES.default[0]
          }]
        },
        {
          ...templateConfig.chartOptions,
          title: {
            display: true,
            text: 'Top Audience Locations'
          }
        }
      );
    }
  }
  
  // Content showcase - highlighting best performing content
  if (creatorMetrics.topPerformingContent?.length > 0) {
    // Prepare simplified content items for showcase
    result.contentShowcase = creatorMetrics.topPerformingContent.slice(0, 3).map(content => ({
      title: content.title,
      platform: formatPlatformName(content.platform),
      contentType: formatContentTypeName(content.contentType),
      views: content.metrics.views || 0,
      engagements: content.metrics.engagements || 0,
      engagementRate: content.metrics.engagementRate || 0,
      platformColor: COLOR_PALETTES.platforms[content.platform.toLowerCase() as keyof typeof COLOR_PALETTES.platforms] || 
                     COLOR_PALETTES.default[0]
    }));
  }
  
  return result;
}

/**
 * Generates key metrics highlights for media kits
 * @private
 */
function generateMediaKitMetricHighlights(creatorMetrics: AnalyticsTypes.CreatorAggregateMetrics): object[] {
  // Calculate total reach across platforms
  let totalReach = 0;
  creatorMetrics.platformBreakdown?.forEach(platform => {
    totalReach += platform.metrics.followers || 0;
  });
  
  return [
    {
      title: 'Total Reach',
      value: formatLargeNumber(totalReach),
      description: 'Combined followers across platforms'
    },
    {
      title: 'Avg. Engagement',
      value: `${(creatorMetrics.aggregateMetrics.engagementRate || 0).toFixed(2)}%`,
      description: 'Average engagement rate across content'
    },
    {
      title: 'Content Published',
      value: creatorMetrics.totalContentCount || 0,
      description: 'Total content items published'
    },
    {
      title: 'Est. Audience Value',
      value: formatCurrency(creatorMetrics.aggregateMetrics.estimatedTotalValue || 0),
      description: 'Estimated content value based on performance'
    }
  ];
}

/**
 * Returns template-specific configuration for media kit styling
 * @private
 */
function getMediaKitTemplateConfig(template: string): any {
  const baseConfig = {
    fontFamily: 'Inter, sans-serif',
    colors: COLOR_PALETTES.default,
    chartOptions: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  };
  
  // Apply template-specific overrides
  switch (template.toLowerCase()) {
    case 'minimal':
      return {
        ...baseConfig,
        colorScheme: 'monochrome',
        chartOptions: {
          ...baseConfig.chartOptions,
          plugins: {
            ...baseConfig.chartOptions.plugins,
            legend: {
              ...baseConfig.chartOptions.plugins.legend,
              display: false
            }
          }
        }
      };
      
    case 'professional':
      return {
        ...baseConfig,
        colorScheme: 'corporate',
        chartOptions: {
          ...baseConfig.chartOptions,
          plugins: {
            ...baseConfig.chartOptions.plugins,
            title: {
              font: {
                weight: 'bold',
                size: 16
              }
            }
          }
        }
      };
      
    case 'creative':
      return {
        ...baseConfig,
        colorScheme: 'vibrant',
        fontFamily: 'Poppins, sans-serif',
        chartOptions: {
          ...baseConfig.chartOptions,
          plugins: {
            ...baseConfig.chartOptions.plugins,
            legend: {
              ...baseConfig.chartOptions.plugins.legend,
              labels: {
                usePointStyle: true,
                padding: 20
              }
            }
          }
        }
      };
      
    case 'enterprise':
      return {
        ...baseConfig,
        colorScheme: 'premium',
        chartOptions: {
          ...baseConfig.chartOptions,
          plugins: {
            ...baseConfig.chartOptions.plugins,
            subtitle: {
              display: true,
              position: 'bottom',
              font: {
                style: 'italic',
                size: 12
              }
            }
          }
        }
      };
      
    default:
      return baseConfig;
  }
}

/**
 * Formats large numbers with K/M/B suffixes
 * @private
 */
function formatLargeNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Creates visualization configurations for comparing multiple content families
 * 
 * @param familiesMetrics - Array of family metrics to compare
 * @param metricsToCompare - Array of metric names to include in comparison
 * @param options - Customization options for the visualizations
 * @returns Chart configurations for comparative visualization
 */
export function compareContentFamilies(
  familiesMetrics: AnalyticsTypes.FamilyMetrics[],
  metricsToCompare: string[],
  options: object = {}
): object {
  logger.debug('Creating content family comparison visualizations', {
    familiesCount: familiesMetrics.length,
    metrics: metricsToCompare
  });
  
  if (!familiesMetrics || familiesMetrics.length === 0) {
    logger.error('No family metrics provided for comparison');
    throw new Error('No family metrics provided for comparison');
  }
  
  if (!metricsToCompare || metricsToCompare.length === 0) {
    logger.error('No metrics specified for comparison');
    throw new Error('No metrics specified for comparison');
  }
  
  const result: Record<string, any> = {
    charts: {}
  };
  
  // Extract family names or IDs for labels
  const familyLabels = familiesMetrics.map((family, index) => 
    options.familyNames && Array.isArray(options.familyNames) ? 
      options.familyNames[index] : 
      `Family ${index + 1}`
  );
  
  // Create bar chart for each metric to compare
  metricsToCompare.forEach(metricName => {
    // Extract metric values from each family
    const metricValues = familiesMetrics.map(family => {
      if (metricName.includes('.')) {
        // Handle nested metric paths like "aggregateMetrics.totalViews"
        return lodash.get(family, metricName) || 0;
      }
      // Try to get from aggregateMetrics or directly from family
      return family.aggregateMetrics?.[metricName as keyof typeof family.aggregateMetrics] || 
             family[metricName as keyof typeof family] || 0;
    });
    
    // Format metric name for display
    const displayName = formatMetricName(metricName.split('.').pop() || metricName);
    
    // Create bar chart for this metric
    result.charts[`comparison_${metricName}`] = createChartConfiguration(
      'bar',
      {
        labels: familyLabels,
        datasets: [{
          label: displayName,
          data: metricValues,
          backgroundColor: COLOR_PALETTES.default.slice(0, familiesMetrics.length)
        }]
      },
      {
        title: {
          display: true,
          text: `${displayName} Comparison`
        }
      }
    );
  });
  
  // Create radar chart for multi-dimensional comparison if we have multiple metrics
  if (metricsToCompare.length > 1) {
    // Prepare datasets for each family
    const datasets = familiesMetrics.map((family, index) => {
      // Extract values for each metric
      const values = metricsToCompare.map(metricName => {
        if (metricName.includes('.')) {
          return lodash.get(family, metricName) || 0;
        }
        return family.aggregateMetrics?.[metricName as keyof typeof family.aggregateMetrics] || 
               family[metricName as keyof typeof family] || 0;
      });
      
      // Normalize values for better radar visualization
      const maxValues = metricsToCompare.map((metricName) => {
        return Math.max(...familiesMetrics.map(f => {
          if (metricName.includes('.')) {
            return lodash.get(f, metricName) || 0;
          }
          return f.aggregateMetrics?.[metricName as keyof typeof f.aggregateMetrics] || 
                 f[metricName as keyof typeof f] || 0;
        }));
      });
      
      const normalizedValues = values.map((value, vIndex) => {
        const maxValue = maxValues[vIndex];
        return maxValue > 0 ? (value / maxValue) * 100 : 0;
      });
      
      return {
        label: familyLabels[index],
        data: normalizedValues,
        backgroundColor: `${COLOR_PALETTES.default[index % COLOR_PALETTES.default.length]}40`,
        borderColor: COLOR_PALETTES.default[index % COLOR_PALETTES.default.length],
        pointBackgroundColor: COLOR_PALETTES.default[index % COLOR_PALETTES.default.length]
      };
    });
    
    // Create radar chart with all metrics
    result.charts.radarComparison = createChartConfiguration(
      'radar',
      {
        labels: metricsToCompare.map(metric => formatMetricName(metric.split('.').pop() || metric)),
        datasets
      },
      {
        title: {
          display: true,
          text: 'Multi-Dimensional Comparison'
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              display: false
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const familyIndex = context.datasetIndex;
                const metricIndex = context.dataIndex;
                const actualValue = (() => {
                  const metricName = metricsToCompare[metricIndex];
                  if (metricName.includes('.')) {
                    return lodash.get(familiesMetrics[familyIndex], metricName) || 0;
                  }
                  return familiesMetrics[familyIndex].aggregateMetrics?.[metricName as keyof typeof familiesMetrics[familyIndex].aggregateMetrics] || 
                         familiesMetrics[familyIndex][metricName as keyof typeof familiesMetrics[familyIndex]] || 0;
                })();
                
                return `${familyLabels[familyIndex]}: ${actualValue}`;
              }
            }
          }
        }
      }
    );
  }
  
  return result;
}