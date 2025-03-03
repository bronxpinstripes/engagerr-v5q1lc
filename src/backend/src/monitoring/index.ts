/**
 * Main entry point for the Engagerr monitoring system
 * 
 * Consolidates logging, metrics collection, and health monitoring functionality
 * into a unified interface for application-wide observability.
 */

import express from 'express'; // ^4.18.2

// Import logging functionality
import { 
  initializeLogging, 
  createLogEntry, 
  logWithContext, 
  queryLogs,
  monitoringLogger
} from './logs';

// Import metrics functionality
import {
  initializeMetrics,
  createHttpMetricsMiddleware,
  trackApiMetrics,
  trackDatabaseMetrics,
  trackExternalApiMetrics,
  trackAiModelMetrics,
  trackSlaMetrics,
  getMetricsRegistry,
  getMetricsMiddleware,
  MetricsService
} from './metrics';

// Import health monitoring functionality
import {
  createHealthCheckMiddleware,
  checkLiveness,
  checkReadiness,
  HealthMonitor,
  healthMonitor
} from './health';

// Import configuration
import { APP_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

// Global flag to track if monitoring has been initialized
let monitoringInitialized = false;

/**
 * Options for initializing the monitoring system
 */
interface MonitoringOptions {
  logging?: {
    storageType?: 'database' | 'elasticsearch' | 'file';
    retentionDays?: number;
    httpLogging?: boolean;
    redactFields?: string[];
  };
  metrics?: {
    prefix?: string;
    defaultLabels?: Record<string, string>;
    collectDefaultMetrics?: boolean;
    defaultMetricsInterval?: number;
    httpMetricsPath?: string;
    excludePaths?: string[];
  };
  health?: {
    checkPath?: string;
    livenessPath?: string;
    readinessPath?: string;
    includeDetails?: boolean;
    autoStart?: boolean;
    checkIntervals?: Record<string, number>;
  };
}

/**
 * Initializes all monitoring subsystems (logging, metrics, health)
 * with appropriate configuration
 * 
 * @param options Configuration options for monitoring initialization
 * @returns Consolidated monitoring interface with all functions
 */
export function initializeMonitoring(options: MonitoringOptions = {}): any {
  if (monitoringInitialized) {
    logger.warn('Monitoring system already initialized, skipping initialization');
    return {
      logging: monitoringLogger,
      metrics: getMetricsRegistry(),
      health: healthMonitor
    };
  }

  // Initialize logging subsystem
  const logging = initializeLogging(options.logging);
  
  // Initialize metrics collection
  const metrics = initializeMetrics(options.metrics);
  
  // Initialize health monitoring
  if (options.health?.autoStart) {
    healthMonitor.startMonitoring();
  }

  // Log successful initialization
  logger.info({
    environment: APP_CONFIG.ENVIRONMENT,
    loggingEnabled: !!logging,
    metricsEnabled: !!metrics,
    healthMonitoringEnabled: options.health?.autoStart || false
  }, 'Monitoring system initialized successfully');

  // Mark as initialized
  monitoringInitialized = true;

  // Return consolidated monitoring interface
  return {
    logging,
    metrics,
    health: healthMonitor
  };
}

/**
 * Creates Express middleware that combines logging, metrics collection,
 * and health checks
 * 
 * @param options Configuration options for monitoring middleware
 * @returns Object containing middleware functions for different monitoring aspects
 */
export function createMonitoringMiddleware(options: {
  logging?: any;
  metrics?: any;
  health?: any;
} = {}): {
  loggingMiddleware: express.RequestHandler;
  metricsMiddleware: express.RequestHandler;
  healthMiddleware: express.RequestHandler;
  combinedMiddleware: express.RequestHandler;
} {
  if (!monitoringInitialized) {
    initializeMonitoring();
  }

  // Create HTTP request logging middleware
  const loggingMiddleware = options.logging?.disabled 
    ? (req: express.Request, res: express.Response, next: express.NextFunction) => next()
    : monitoringLogger.expressLogger || ((req: express.Request, res: express.Response, next: express.NextFunction) => next());

  // Create metrics collection middleware
  const metricsMiddleware = options.metrics?.disabled
    ? (req: express.Request, res: express.Response, next: express.NextFunction) => next()
    : createHttpMetricsMiddleware(options.metrics);

  // Create health check endpoint middleware
  const healthMiddleware = options.health?.disabled
    ? (req: express.Request, res: express.Response, next: express.NextFunction) => next()
    : createHealthCheckMiddleware(options.health);

  return {
    loggingMiddleware,
    metricsMiddleware,
    healthMiddleware,
    // Combined middleware that applies all monitoring middleware in sequence
    combinedMiddleware: (req: express.Request, res: express.Response, next: express.NextFunction) => {
      loggingMiddleware(req, res, (err?: any) => {
        if (err) return next(err);
        metricsMiddleware(req, res, (err?: any) => {
          if (err) return next(err);
          healthMiddleware(req, res, next);
        });
      });
    }
  };
}

/**
 * Unified tracking function that records logs, metrics, and health impact
 * for operations
 * 
 * @param operationName Name of the operation to track
 * @param operation Async function to execute and measure
 * @param options Additional tracking options
 * @returns Result of the operation with monitoring data recorded
 */
export async function trackOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  options: {
    correlationId?: string;
    labels?: Record<string, string>;
    context?: Record<string, any>;
    affectsHealth?: boolean;
    componentName?: string;
  } = {}
): Promise<T> {
  if (!monitoringInitialized) {
    initializeMonitoring();
  }

  // Generate a correlation ID if not provided
  const correlationId = options.correlationId || `op-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  // Create a logger with operation context
  const contextLogger = logWithContext({
    correlationId,
    operation: operationName,
    ...options.context
  });

  // Log operation start
  contextLogger.info(`Starting operation: ${operationName}`);
  
  // Prepare metric labels
  const metricLabels = {
    operation: operationName,
    correlationId,
    ...options.labels
  };

  try {
    // Determine the type of operation for appropriate metrics tracking
    let result: T;
    
    if (operationName.startsWith('api.') || operationName.startsWith('http.')) {
      // API operation
      result = await trackApiMetrics(operationName, operation, metricLabels);
    } else if (operationName.startsWith('db.')) {
      // Database operation
      result = await trackDatabaseMetrics(operationName, operation, metricLabels);
    } else if (operationName.startsWith('external.')) {
      // External API call
      const serviceName = operationName.split('.')[1] || 'unknown';
      result = await trackExternalApiMetrics(serviceName, operation, metricLabels);
    } else if (operationName.startsWith('ai.')) {
      // AI model operation
      const modelName = operationName.split('.')[1] || 'unknown';
      const operationType = operationName.split('.')[2] || 'inference';
      result = await trackAiModelMetrics(modelName, operationType, operation, metricLabels);
    } else {
      // Generic operation
      const startTime = process.hrtime();
      result = await operation();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;
      
      // Log duration as a metric
      contextLogger.debug({
        operation: operationName,
        durationSeconds: duration
      }, `Operation completed in ${duration.toFixed(3)}s`);
    }

    // Log successful completion
    contextLogger.info(`Completed operation: ${operationName}`);

    // Update component health if specified
    if (options.affectsHealth && options.componentName) {
      healthMonitor.checkComponent(options.componentName)
        .catch(err => logger.error({
          error: err instanceof Error ? err.message : String(err),
          component: options.componentName,
          operation: operationName
        }, 'Failed to update component health after operation'));
    }

    return result;
  } catch (error) {
    // Log error
    contextLogger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, `Error in operation: ${operationName}`);

    // Update component health if failure should affect health
    if (options.affectsHealth && options.componentName) {
      healthMonitor.checkComponent(options.componentName)
        .catch(err => logger.error({
          error: err instanceof Error ? err.message : String(err),
          component: options.componentName,
          operation: operationName
        }, 'Failed to update component health after operation error'));
    }

    // Re-throw the error
    throw error;
  }
}

/**
 * Returns comprehensive monitoring status including logs, metrics, and health
 * 
 * @param options Options for status retrieval
 * @returns Consolidated monitoring status
 */
export async function getMonitoringStatus(options: {
  logsLimit?: number;
  includeMetrics?: boolean;
  includeHealth?: boolean;
} = {}): Promise<any> {
  if (!monitoringInitialized) {
    throw new Error('Monitoring system not initialized. Call initializeMonitoring() first.');
  }

  const status: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: APP_CONFIG.ENVIRONMENT,
    uptime: process.uptime()
  };

  // Get health status
  if (options.includeHealth !== false) {
    status['health'] = healthMonitor.getSystemStatus();
  }

  // Get recent logs
  if (options.logsLimit !== 0) {
    try {
      const logs = await queryLogs({
        limit: options.logsLimit || 10,
        page: 1
      });
      status['recentLogs'] = logs;
    } catch (error) {
      status['recentLogs'] = { 
        error: 'Failed to retrieve logs',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Get metrics
  if (options.includeMetrics !== false) {
    try {
      const metricsRegistry = getMetricsRegistry();
      const metrics = await metricsRegistry.metrics();
      status['metrics'] = metrics;
    } catch (error) {
      status['metrics'] = { 
        error: 'Failed to retrieve metrics',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  return status;
}

/**
 * Service class that provides a unified interface to all monitoring capabilities
 */
export class MonitoringService {
  private options: MonitoringOptions;
  private logging: any;
  private metrics: any;
  private health: any;
  public initialized: boolean;

  /**
   * Initializes the monitoring service with all subsystems
   * 
   * @param options Configuration options for monitoring
   */
  constructor(options: MonitoringOptions = {}) {
    this.options = options;
    this.initialized = false;
    this.init();
  }

  /**
   * Initializes all monitoring subsystems
   */
  private init(): void {
    // Initialize logging
    this.logging = initializeLogging(this.options.logging);
    
    // Initialize metrics
    this.metrics = initializeMetrics(this.options.metrics);
    
    // Initialize health monitoring
    if (this.options.health?.autoStart) {
      healthMonitor.startMonitoring();
    }
    this.health = healthMonitor;

    this.initialized = true;
    
    logger.info('MonitoringService initialized successfully');
  }

  /**
   * Creates Express middleware for all monitoring functions
   * 
   * @param options Configuration options for the middleware
   * @returns Middleware functions for monitoring
   */
  public createMiddleware(options: any = {}): {
    loggingMiddleware: express.RequestHandler;
    metricsMiddleware: express.RequestHandler;
    healthMiddleware: express.RequestHandler;
    combinedMiddleware: express.RequestHandler;
  } {
    return createMonitoringMiddleware({
      logging: options.logging || this.options.logging,
      metrics: options.metrics || this.options.metrics,
      health: options.health || this.options.health
    });
  }

  /**
   * Tracks an operation with logs, metrics, and health impact
   * 
   * @param operationName Name of the operation to track
   * @param operation Async function to execute and measure
   * @param options Additional tracking options
   * @returns Operation result with monitoring
   */
  public async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: any = {}
  ): Promise<T> {
    return trackOperation(operationName, operation, options);
  }

  /**
   * Returns the current status of all monitoring systems
   * 
   * @returns Consolidated monitoring status
   */
  public async getStatus(): Promise<any> {
    return getMonitoringStatus();
  }

  /**
   * Gracefully shuts down all monitoring subsystems
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // Stop health monitoring
    this.health.stopMonitoring();
    
    // Log shutdown
    logger.info('MonitoringService shutting down');
    
    this.initialized = false;
  }
}

// Export all re-exported functionality to provide a unified interface
export {
  // Re-export from logs.ts
  initializeLogging,
  createLogEntry,
  logWithContext,
  queryLogs,
  monitoringLogger,
  
  // Re-export from metrics.ts
  initializeMetrics,
  createHttpMetricsMiddleware,
  trackApiMetrics,
  trackDatabaseMetrics,
  trackExternalApiMetrics,
  trackAiModelMetrics,
  trackSlaMetrics,
  getMetricsRegistry,
  getMetricsMiddleware,
  MetricsService,
  
  // Re-export from health.ts
  createHealthCheckMiddleware,
  checkLiveness,
  checkReadiness,
  HealthMonitor,
  healthMonitor
};