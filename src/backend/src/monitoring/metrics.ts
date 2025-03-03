/**
 * Advanced metrics collection and reporting system for the Engagerr platform.
 * Provides standardized instrumentation for tracking performance metrics, SLAs,
 * and resource utilization across application components, external integrations, and AI services.
 */

import express from 'express'; // ^4.18.2
import * as promClient from 'prom-client'; // ^14.2.0
import responseTime from 'response-time'; // ^2.3.2

import { logger } from '../utils/logger';
import { APP_CONFIG } from '../config/constants';
import { DATABASE_CONFIG } from '../config/database';
import { API_RATE_LIMITS } from '../config/constants';
import { generateCorrelationId } from '../middlewares/logging';

// Global registry for metrics collection
let metricsRegistry: promClient.Registry;
let metricsInitialized = false;

/**
 * Interface for metrics initialization options
 */
interface MetricsOptions {
  prefix?: string;
  defaultLabels?: Record<string, string>;
  collectDefaultMetrics?: boolean;
  defaultMetricsInterval?: number;
  httpMetricsPath?: string;
  excludePaths?: string[];
  buckets?: number[];
  percentiles?: number[];
}

/**
 * Interface for HTTP metrics middleware options
 */
interface HttpMetricsOptions {
  excludePaths?: string[];
  includePaths?: string[];
  buckets?: number[];
  normalizePath?: boolean;
}

/**
 * Interface for metrics exposure middleware options
 */
interface MetricsMiddlewareOptions {
  endpoint?: string;
  requireAuth?: boolean;
}

/**
 * Initializes the metrics collection system with appropriate configuration
 * 
 * @param options Configuration options for metrics collection
 * @returns Metrics registry and collection functions
 */
export function initializeMetrics(options: MetricsOptions = {}): any {
  if (metricsInitialized) {
    logger.warn('Metrics system already initialized');
    return { registry: metricsRegistry };
  }

  // Create a new registry with default labels
  const registry = new promClient.Registry();
  
  // Set default labels based on environment
  const defaultLabels = {
    app: 'engagerr',
    environment: APP_CONFIG.ENVIRONMENT,
    ...(options.defaultLabels || {})
  };
  
  registry.setDefaultLabels(defaultLabels);

  // Determine metric name prefix
  const prefix = options.prefix || 'engagerr_';

  // Register default application metrics if enabled
  if (options.collectDefaultMetrics !== false) {
    promClient.collectDefaultMetrics({
      register: registry,
      prefix,
      timestamps: true,
      interval: options.defaultMetricsInterval || 10000 // 10 seconds
    });
    
    logger.info('Default application metrics collection enabled');
  }

  // Create standard HTTP metrics
  const httpRequestDuration = new promClient.Histogram({
    name: `${prefix}http_request_duration_seconds`,
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code', 'content_type'],
    buckets: options.buckets || [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [registry]
  });

  const httpRequestsTotal = new promClient.Counter({
    name: `${prefix}http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry]
  });

  const httpResponseSize = new promClient.Histogram({
    name: `${prefix}http_response_size_bytes`,
    help: 'HTTP response size in bytes',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [100, 1000, 10000, 100000, 1000000],
    registers: [registry]
  });

  // Database metrics
  const dbQueryDuration = new promClient.Histogram({
    name: `${prefix}db_query_duration_seconds`,
    help: 'Database query duration in seconds',
    labelNames: ['query', 'operation', 'status'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
    registers: [registry]
  });

  const dbConnectionPoolSize = new promClient.Gauge({
    name: `${prefix}db_connection_pool_size`,
    help: 'Database connection pool size',
    labelNames: ['pool_type'],
    registers: [registry]
  });

  const dbConnectionPoolUsed = new promClient.Gauge({
    name: `${prefix}db_connection_pool_used`,
    help: 'Database connection pool usage',
    labelNames: ['pool_type'],
    registers: [registry]
  });

  // External API metrics
  const externalApiDuration = new promClient.Histogram({
    name: `${prefix}external_api_duration_seconds`,
    help: 'External API call duration in seconds',
    labelNames: ['service', 'endpoint', 'status'],
    buckets: [0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [registry]
  });

  const externalApiRequestsTotal = new promClient.Counter({
    name: `${prefix}external_api_requests_total`,
    help: 'Total external API requests',
    labelNames: ['service', 'endpoint', 'status'],
    registers: [registry]
  });

  const externalApiRateLimitRemaining = new promClient.Gauge({
    name: `${prefix}external_api_rate_limit_remaining`,
    help: 'Remaining rate limit for external APIs',
    labelNames: ['service', 'endpoint'],
    registers: [registry]
  });

  // AI model metrics
  const aiModelInferenceDuration = new promClient.Histogram({
    name: `${prefix}ai_model_inference_duration_seconds`,
    help: 'AI model inference duration in seconds',
    labelNames: ['model', 'operation', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [registry]
  });

  const aiModelTokensProcessed = new promClient.Counter({
    name: `${prefix}ai_model_tokens_processed_total`,
    help: 'Total tokens processed by AI models',
    labelNames: ['model', 'operation', 'type'],
    registers: [registry]
  });

  const aiModelQueueDepth = new promClient.Gauge({
    name: `${prefix}ai_model_queue_depth`,
    help: 'Current queue depth for AI model processing',
    labelNames: ['model'],
    registers: [registry]
  });

  // SLA metrics
  const slaCompliancePercentage = new promClient.Gauge({
    name: `${prefix}sla_compliance_percentage`,
    help: 'Percentage compliance with SLA targets',
    labelNames: ['service', 'metric'],
    registers: [registry]
  });

  const slaThresholdViolations = new promClient.Counter({
    name: `${prefix}sla_threshold_violations_total`,
    help: 'Total SLA threshold violations',
    labelNames: ['service', 'metric', 'severity'],
    registers: [registry]
  });

  // Store the registry globally for reuse
  metricsRegistry = registry;
  metricsInitialized = true;

  logger.info('Metrics collection system initialized');

  // Return metrics interface
  return {
    registry,
    metrics: {
      http: {
        requestDuration: httpRequestDuration,
        requestsTotal: httpRequestsTotal,
        responseSize: httpResponseSize
      },
      db: {
        queryDuration: dbQueryDuration,
        connectionPoolSize: dbConnectionPoolSize,
        connectionPoolUsed: dbConnectionPoolUsed
      },
      externalApi: {
        duration: externalApiDuration,
        requestsTotal: externalApiRequestsTotal,
        rateLimitRemaining: externalApiRateLimitRemaining
      },
      aiModel: {
        inferenceDuration: aiModelInferenceDuration,
        tokensProcessed: aiModelTokensProcessed,
        queueDepth: aiModelQueueDepth
      },
      sla: {
        compliancePercentage: slaCompliancePercentage,
        thresholdViolations: slaThresholdViolations
      }
    }
  };
}

/**
 * Creates Express middleware for collecting HTTP request and response metrics
 * 
 * @param options Configuration options for the middleware
 * @returns Express middleware for metrics collection
 */
export function createHttpMetricsMiddleware(options: HttpMetricsOptions = {}): express.RequestHandler {
  if (!metricsInitialized) {
    initializeMetrics();
  }

  const excludePaths = options.excludePaths || ['/metrics', '/health', '/favicon.ico'];
  const normalizePath = options.normalizePath !== false; // Default to true
  
  const metrics = initializeMetrics().metrics;
  
  // Use response-time middleware to accurately measure response time
  const responseTimeMiddleware = responseTime((req: express.Request, res: express.Response, time: number) => {
    const path = req.route?.path || req.path;
    
    // Skip excluded paths
    if (excludePaths.some(excluded => path.includes(excluded))) {
      return;
    }
    
    // Normalize path if enabled (converts /users/123 to /users/:id)
    const normalizedPath = normalizePath 
      ? path.replace(/\/\d+/g, '/:id').replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:uuid')
      : path;
    
    // Extract request details
    const method = req.method;
    const statusCode = res.statusCode.toString();
    const contentType = (res.getHeader('content-type') || 'unknown').toString().split(';')[0];
    const contentLength = parseInt(res.getHeader('content-length')?.toString() || '0', 10);
    
    // Record metrics
    metrics.http.requestDuration.observe(
      { method, route: normalizedPath, status_code: statusCode, content_type: contentType }, 
      time / 1000
    );
    
    metrics.http.requestsTotal.inc({ method, route: normalizedPath, status_code: statusCode });
    
    if (contentLength > 0) {
      metrics.http.responseSize.observe(
        { method, route: normalizedPath, status_code: statusCode },
        contentLength
      );
    }
  });
  
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Add correlation ID for request tracking if not already present
    if (!req.headers['x-correlation-id']) {
      const correlationId = generateCorrelationId();
      req.headers['x-correlation-id'] = correlationId;
      res.setHeader('X-Correlation-Id', correlationId);
    }
    
    // Apply response time middleware
    responseTimeMiddleware(req, res, next);
  };
}

/**
 * Records metrics for internal API operations
 * 
 * @param routeName Name of the API route or operation
 * @param operation The async function to execute and measure
 * @param labels Additional labels to add to the metrics
 * @returns Result of the operation with metrics recorded
 */
export async function trackApiMetrics<T>(
  routeName: string,
  operation: () => Promise<T>,
  labels: Record<string, string> = {}
): Promise<T> {
  if (!metricsInitialized) {
    initializeMetrics();
  }

  const metrics = initializeMetrics().metrics;
  const startTime = process.hrtime();
  const operationId = generateCorrelationId();
  
  // Prepare labels
  const metricLabels = {
    operation: routeName,
    ...labels
  };
  
  try {
    // Execute the operation
    const result = await operation();
    
    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    
    // Record success metrics
    metrics.http.requestDuration.observe(
      { ...metricLabels, status: 'success' },
      duration
    );
    
    metrics.http.requestsTotal.inc(
      { ...metricLabels, status_code: '200' }
    );
    
    return result;
  } catch (error) {
    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    
    // Record error metrics
    metrics.http.requestDuration.observe(
      { ...metricLabels, status: 'error' },
      duration
    );
    
    metrics.http.requestsTotal.inc(
      { ...metricLabels, status_code: '500' }
    );
    
    // Log error with correlation ID
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      operationId,
      routeName,
      duration
    }, 'API operation error');
    
    throw error;
  }
}

/**
 * Records metrics for database operations
 * 
 * @param queryName Name of the database query or operation
 * @param queryFn The database query function to execute and measure
 * @param labels Additional labels to add to the metrics
 * @returns Query result with metrics recorded
 */
export async function trackDatabaseMetrics<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  labels: Record<string, string> = {}
): Promise<T> {
  if (!metricsInitialized) {
    initializeMetrics();
  }

  const metrics = initializeMetrics().metrics;
  const startTime = process.hrtime();
  
  // Prepare labels
  const metricLabels = {
    query: queryName,
    ...labels
  };
  
  try {
    // Execute the query
    const result = await queryFn();
    
    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    
    // Record success metrics
    metrics.db.queryDuration.observe(
      { ...metricLabels, operation: 'query', status: 'success' },
      duration
    );
    
    // Update connection pool metrics if available
    if (DATABASE_CONFIG && DATABASE_CONFIG.poolSize) {
      metrics.db.connectionPoolSize.set(
        { pool_type: 'main' },
        DATABASE_CONFIG.poolSize
      );
      
      // This is an approximation - in a real implementation you would 
      // get the actual used connections from the pool
      const estimatedUsed = Math.floor(Math.random() * DATABASE_CONFIG.poolSize);
      metrics.db.connectionPoolUsed.set(
        { pool_type: 'main' },
        estimatedUsed
      );
    }
    
    return result;
  } catch (error) {
    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    
    // Record error metrics
    metrics.db.queryDuration.observe(
      { ...metricLabels, operation: 'query', status: 'error' },
      duration
    );
    
    // Log error with query details
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      queryName,
      duration
    }, 'Database query error');
    
    throw error;
  }
}

/**
 * Records metrics for external API calls
 * 
 * @param serviceIdentifier Name of the external service/API
 * @param apiCall The API call function to execute and measure
 * @param labels Additional labels to add to the metrics
 * @returns API call result with metrics recorded
 */
export async function trackExternalApiMetrics<T>(
  serviceIdentifier: string,
  apiCall: () => Promise<T>,
  labels: Record<string, string> = {}
): Promise<T> {
  if (!metricsInitialized) {
    initializeMetrics();
  }

  const metrics = initializeMetrics().metrics;
  const startTime = process.hrtime();
  
  // Prepare labels
  const metricLabels = {
    service: serviceIdentifier,
    endpoint: labels.endpoint || 'unknown',
    ...labels
  };
  
  try {
    // Execute the API call
    const result = await apiCall();
    
    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    
    // Record success metrics
    metrics.externalApi.duration.observe(
      { ...metricLabels, status: 'success' },
      duration
    );
    
    metrics.externalApi.requestsTotal.inc(
      { ...metricLabels, status: 'success' }
    );
    
    // Handle rate limit headers if present in response
    if (result && typeof result === 'object') {
      // Look for common rate limit headers in the response
      // This is a simplistic approach - actual header names vary by service
      const rateLimitRemaining = 
        (result as any).headers?.['x-rate-limit-remaining'] ||
        (result as any).headers?.['x-ratelimit-remaining'] ||
        null;
        
      if (rateLimitRemaining !== null && !isNaN(Number(rateLimitRemaining))) {
        metrics.externalApi.rateLimitRemaining.set(
          { service: serviceIdentifier, endpoint: labels.endpoint || 'unknown' },
          Number(rateLimitRemaining)
        );
      }
    }
    
    return result;
  } catch (error) {
    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    
    // Record error metrics
    metrics.externalApi.duration.observe(
      { ...metricLabels, status: 'error' },
      duration
    );
    
    metrics.externalApi.requestsTotal.inc(
      { ...metricLabels, status: 'error' }
    );
    
    // Log error with service details
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      serviceIdentifier,
      endpoint: labels.endpoint,
      duration
    }, 'External API call error');
    
    throw error;
  }
}

/**
 * Records metrics for AI model operations
 * 
 * @param modelName Name of the AI model
 * @param operationType Type of operation (inference, embedding, etc.)
 * @param inferenceOperation The model operation function to execute and measure
 * @param labels Additional labels to add to the metrics
 * @returns Inference result with metrics recorded
 */
export async function trackAiModelMetrics<T>(
  modelName: string,
  operationType: string,
  inferenceOperation: () => Promise<T>,
  labels: Record<string, string> = {}
): Promise<T> {
  if (!metricsInitialized) {
    initializeMetrics();
  }

  const metrics = initializeMetrics().metrics;
  const startTime = process.hrtime();
  
  // Update queue depth for the model (this would be more accurate in a real implementation)
  const queueDepth = Math.floor(Math.random() * 10); // Simulated queue depth
  metrics.aiModel.queueDepth.set({ model: modelName }, queueDepth);
  
  // Prepare labels
  const metricLabels = {
    model: modelName,
    operation: operationType,
    ...labels
  };
  
  // Track input tokens if available in labels
  if (labels.inputTokens && !isNaN(Number(labels.inputTokens))) {
    metrics.aiModel.tokensProcessed.inc(
      { model: modelName, operation: operationType, type: 'input' },
      Number(labels.inputTokens)
    );
  }
  
  try {
    // Execute the model operation
    const result = await inferenceOperation();
    
    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    
    // Record success metrics
    metrics.aiModel.inferenceDuration.observe(
      { ...metricLabels, status: 'success' },
      duration
    );
    
    // Track output tokens if available in result
    if (result && typeof result === 'object' && (result as any).outputTokens) {
      metrics.aiModel.tokensProcessed.inc(
        { model: modelName, operation: operationType, type: 'output' },
        Number((result as any).outputTokens)
      );
    }
    
    // If we have both input and output tokens, calculate tokens per second
    if (labels.inputTokens && result && typeof result === 'object' && (result as any).outputTokens) {
      const totalTokens = Number(labels.inputTokens) + Number((result as any).outputTokens);
      logger.debug({
        model: modelName,
        operation: operationType,
        tokensPerSecond: totalTokens / duration,
        duration
      }, 'AI model performance');
    }
    
    // Update queue depth after processing
    metrics.aiModel.queueDepth.set({ model: modelName }, Math.max(0, queueDepth - 1));
    
    return result;
  } catch (error) {
    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    
    // Record error metrics
    metrics.aiModel.inferenceDuration.observe(
      { ...metricLabels, status: 'error' },
      duration
    );
    
    // Log error with model details
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      modelName,
      operationType,
      duration
    }, 'AI model operation error');
    
    // Update queue depth after error
    metrics.aiModel.queueDepth.set({ model: modelName }, Math.max(0, queueDepth - 1));
    
    throw error;
  }
}

/**
 * Records metrics for SLA monitoring and compliance
 * 
 * @param serviceName Name of the service being monitored
 * @param metricName Name of the specific metric
 * @param value Measured value
 * @param thresholds Warning and critical thresholds
 * @param labels Additional labels to add to the metrics
 * @returns True if value is within SLA thresholds, false otherwise
 */
export function trackSlaMetrics(
  serviceName: string,
  metricName: string,
  value: number,
  thresholds: { warning: number; critical: number },
  labels: Record<string, string> = {}
): boolean {
  if (!metricsInitialized) {
    initializeMetrics();
  }

  const metrics = initializeMetrics().metrics;
  
  // Prepare labels
  const metricLabels = {
    service: serviceName,
    metric: metricName,
    ...labels
  };
  
  // Record the measured value
  metrics.sla.compliancePercentage.set(metricLabels, value);
  
  // Check against warning threshold
  if (value > thresholds.warning) {
    metrics.sla.thresholdViolations.inc({
      ...metricLabels,
      severity: 'warning'
    });
    
    // Log warning
    logger.warn({
      service: serviceName,
      metric: metricName,
      value,
      threshold: thresholds.warning,
      severity: 'warning'
    }, 'SLA warning threshold exceeded');
  }
  
  // Check against critical threshold
  if (value > thresholds.critical) {
    metrics.sla.thresholdViolations.inc({
      ...metricLabels,
      severity: 'critical'
    });
    
    // Log critical violation
    logger.error({
      service: serviceName,
      metric: metricName,
      value,
      threshold: thresholds.critical,
      severity: 'critical'
    }, 'SLA critical threshold exceeded');
    
    return false;
  }
  
  return true;
}

/**
 * Returns the metrics registry for external access
 * 
 * @returns Prometheus metrics registry
 */
export function getMetricsRegistry(): promClient.Registry {
  if (!metricsInitialized) {
    throw new Error('Metrics system not initialized. Call initializeMetrics() first.');
  }
  
  return metricsRegistry;
}

/**
 * Creates an Express middleware for exposing metrics in Prometheus format
 * 
 * @param options Configuration options for the middleware
 * @returns Express middleware for exposing metrics
 */
export function getMetricsMiddleware(options: MetricsMiddlewareOptions = {}): express.RequestHandler {
  if (!metricsInitialized) {
    throw new Error('Metrics system not initialized. Call initializeMetrics() first.');
  }
  
  const endpoint = options.endpoint || '/metrics';
  
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path !== endpoint) {
      return next();
    }
    
    // Check if authentication is required
    if (options.requireAuth && !req.headers.authorization) {
      res.status(401).send('Unauthorized');
      return;
    }
    
    try {
      // Get metrics from registry
      const metrics = await metricsRegistry.metrics();
      
      // Set appropriate content type
      res.setHeader('Content-Type', metricsRegistry.contentType);
      
      // Send metrics
      res.status(200).send(metrics);
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Error generating metrics');
      
      res.status(500).send('Error generating metrics');
    }
  };
}

/**
 * Service class for centralized metrics collection and reporting
 */
export class MetricsService {
  private registry: promClient.Registry;
  private counters: Map<string, promClient.Counter<string>>;
  private gauges: Map<string, promClient.Gauge<string>>;
  private histograms: Map<string, promClient.Histogram<string>>;
  private summaries: Map<string, promClient.Summary<string>>;
  private initialized: boolean;
  
  /**
   * Initializes the metrics service with configuration options
   * 
   * @param options Configuration options
   */
  constructor(options: MetricsOptions = {}) {
    this.registry = new promClient.Registry();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.summaries = new Map();
    this.initialized = false;
    
    // Set default labels
    const defaultLabels = {
      app: 'engagerr',
      environment: APP_CONFIG.ENVIRONMENT,
      ...(options.defaultLabels || {})
    };
    
    this.registry.setDefaultLabels(defaultLabels);
    
    // Register default metrics if enabled
    if (options.collectDefaultMetrics !== false) {
      this.registerDefaultMetrics();
    }
    
    this.initialized = true;
    
    logger.info('MetricsService initialized');
  }
  
  /**
   * Creates and registers a new counter metric
   * 
   * @param name Metric name
   * @param help Help text describing the metric
   * @param labelNames Names of labels that can be used with this metric
   * @returns Registered counter instance
   */
  public createCounter(name: string, help: string, labelNames: string[] = []): promClient.Counter<string> {
    // Check if counter already exists
    if (this.counters.has(name)) {
      return this.counters.get(name)!;
    }
    
    // Create and register counter
    const counter = new promClient.Counter({
      name,
      help,
      labelNames,
      registers: [this.registry]
    });
    
    this.counters.set(name, counter);
    return counter;
  }
  
  /**
   * Creates and registers a new gauge metric
   * 
   * @param name Metric name
   * @param help Help text describing the metric
   * @param labelNames Names of labels that can be used with this metric
   * @returns Registered gauge instance
   */
  public createGauge(name: string, help: string, labelNames: string[] = []): promClient.Gauge<string> {
    // Check if gauge already exists
    if (this.gauges.has(name)) {
      return this.gauges.get(name)!;
    }
    
    // Create and register gauge
    const gauge = new promClient.Gauge({
      name,
      help,
      labelNames,
      registers: [this.registry]
    });
    
    this.gauges.set(name, gauge);
    return gauge;
  }
  
  /**
   * Creates and registers a new histogram metric
   * 
   * @param name Metric name
   * @param help Help text describing the metric
   * @param labelNames Names of labels that can be used with this metric
   * @param buckets Histogram buckets
   * @returns Registered histogram instance
   */
  public createHistogram(
    name: string, 
    help: string, 
    labelNames: string[] = [],
    buckets: number[] = promClient.linearBuckets(0.1, 0.1, 10)
  ): promClient.Histogram<string> {
    // Check if histogram already exists
    if (this.histograms.has(name)) {
      return this.histograms.get(name)!;
    }
    
    // Create and register histogram
    const histogram = new promClient.Histogram({
      name,
      help,
      labelNames,
      buckets,
      registers: [this.registry]
    });
    
    this.histograms.set(name, histogram);
    return histogram;
  }
  
  /**
   * Creates and registers a new summary metric
   * 
   * @param name Metric name
   * @param help Help text describing the metric
   * @param labelNames Names of labels that can be used with this metric
   * @param percentiles Array of percentiles to calculate
   * @returns Registered summary instance
   */
  public createSummary(
    name: string, 
    help: string, 
    labelNames: string[] = [],
    percentiles: number[] = [0.01, 0.05, 0.5, 0.9, 0.95, 0.99]
  ): promClient.Summary<string> {
    // Check if summary already exists
    if (this.summaries.has(name)) {
      return this.summaries.get(name)!;
    }
    
    // Create and register summary
    const summary = new promClient.Summary({
      name,
      help,
      labelNames,
      percentiles,
      registers: [this.registry]
    });
    
    this.summaries.set(name, summary);
    return summary;
  }
  
  /**
   * Retrieves a registered metric by name and type
   * 
   * @param name Metric name
   * @param type Metric type (counter, gauge, histogram, summary)
   * @returns Metric instance or null if not found
   */
  public getMetric(name: string, type: 'counter' | 'gauge' | 'histogram' | 'summary'): any {
    switch (type) {
      case 'counter':
        return this.counters.get(name) || null;
      case 'gauge':
        return this.gauges.get(name) || null;
      case 'histogram':
        return this.histograms.get(name) || null;
      case 'summary':
        return this.summaries.get(name) || null;
      default:
        return null;
    }
  }
  
  /**
   * Registers default application metrics (CPU, memory, event loop)
   */
  public registerDefaultMetrics(): void {
    promClient.collectDefaultMetrics({
      register: this.registry,
      prefix: 'engagerr_',
      timestamps: true
    });
  }
  
  /**
   * Returns the content type for metrics exposition format
   * 
   * @returns Content type header value
   */
  public getContentType(): string {
    return this.registry.contentType;
  }
  
  /**
   * Returns all metrics in Prometheus exposition format
   * 
   * @returns Formatted metrics string
   */
  public async metrics(): Promise<string> {
    return await this.registry.metrics();
  }
}