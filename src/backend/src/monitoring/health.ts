/**
 * Comprehensive health monitoring system for the Engagerr platform
 * Provides health check endpoints, component status monitoring, and readiness/liveness probes
 * for containerized environments.
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import fetch from 'node-fetch'; // ^3.3.2
import * as os from 'os'; // native
import * as process from 'process'; // native
import { logger } from '../utils/logger';
import { checkDatabaseConnection, checkRequiredExtensions } from '../config/database';
import { APP_CONFIG } from '../config/constants';
import supabase from '../config/supabase';

// Health status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// Component health info
export interface ComponentHealth {
  status: HealthStatus;
  name: string;
  message?: string;
  timestamp: number;
  details?: Record<string, any>;
}

// System health response
export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: number;
  components?: Record<string, ComponentHealth>;
  environment?: string;
  version?: string;
  uptime?: number;
  [key: string]: any;
}

// Options for health check middleware
export interface HealthCheckOptions {
  path?: string;
  includeDetails?: boolean;
  dependencyTimeout?: number;
  livenessPath?: string;
  readinessPath?: string;
  responseHeaders?: Record<string, string>;
}

// Options for external service health checks
export interface ExternalServiceOptions {
  timeout?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  expectedStatus?: number | number[];
  validateResponse?: (response: any) => boolean;
}

// Options for the health monitor
export interface HealthMonitorOptions {
  checkIntervals?: Record<string, number>;
  components?: string[];
  notificationThresholds?: Record<string, number>;
  maxRetryAttempts?: number;
  retryDelay?: number;
}

/**
 * Creates an Express middleware that handles health check requests
 * @param options Configuration options for the health check middleware
 * @returns Express middleware for health checks
 */
export function createHealthCheckMiddleware(options: HealthCheckOptions = {}) {
  const {
    path = '/health',
    includeDetails = false,
    dependencyTimeout = 5000,
    livenessPath = '/health/liveness',
    readinessPath = '/health/readiness',
    responseHeaders = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if not a health check path
    const isHealthCheck = [path, livenessPath, readinessPath].some(p => 
      req.path === p || req.path === p.replace(/^\//, '')
    );
    
    if (!isHealthCheck) {
      return next();
    }
    
    try {
      // Determine which check to perform
      const isLiveness = req.path === livenessPath || req.path === livenessPath.replace(/^\//, '');
      const isReadiness = req.path === readinessPath || req.path === readinessPath.replace(/^\//, '');
      
      let healthResult: HealthCheckResponse;
      
      // Perform appropriate health check
      if (isLiveness) {
        healthResult = await checkLiveness();
        logger.info({ path: req.path, status: healthResult.status }, 'Liveness check performed');
      } else if (isReadiness) {
        healthResult = await checkReadiness();
        logger.info({ 
          path: req.path, 
          status: healthResult.status,
          components: Object.keys(healthResult.components || {})
            .reduce((acc, key) => {
              acc[key] = healthResult.components?.[key].status;
              return acc;
            }, {} as Record<string, HealthStatus>)
        }, 'Readiness check performed');
      } else {
        // Default health check
        healthResult = await checkLiveness();
        
        // Include some component checks for the default endpoint
        // but don't make it as extensive as the readiness check
        const dbHealth = await checkComponentHealth('database');
        healthResult.components = {
          database: dbHealth
        };
        
        logger.info({ path: req.path, status: healthResult.status }, 'Default health check performed');
      }
      
      // Set response status based on health status
      let httpStatus = 200;
      if (healthResult.status === 'degraded') {
        httpStatus = 200; // Still usable but with degraded performance
      } else if (healthResult.status === 'unhealthy') {
        httpStatus = 503; // Service Unavailable
      } else if (healthResult.status === 'unknown') {
        httpStatus = 500; // Internal Server Error
      }
      
      // Set headers
      Object.entries(responseHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      // Remove detailed component information if not requested
      if (!includeDetails && !isReadiness && healthResult.components) {
        Object.keys(healthResult.components).forEach(key => {
          if (healthResult.components && healthResult.components[key].details) {
            delete healthResult.components[key].details;
          }
        });
      }
      
      // Send response
      res.status(httpStatus).json(healthResult);
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        path: req.path 
      }, 'Health check error');
      
      res.status(500).json({
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

/**
 * Performs a basic liveness check to verify the application is running
 * @returns Health status object with overall status and timestamp
 */
export async function checkLiveness(): Promise<HealthCheckResponse> {
  const healthResponse: HealthCheckResponse = {
    status: 'unknown',
    timestamp: Date.now(),
    uptime: process.uptime(),
    environment: APP_CONFIG.ENVIRONMENT
  };
  
  try {
    // Basic check - if we're executing this code, the process is alive
    // We'll add some memory checks as a basic verification
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    // Check if memory usage is within reasonable limits
    // Warning if RSS is >80% of available memory
    const memoryHealthy = memoryUsage.rss < (totalMemory * 0.8);
    
    if (memoryHealthy) {
      healthResponse.status = 'healthy';
    } else {
      healthResponse.status = 'degraded';
      healthResponse.message = 'High memory usage detected';
    }
    
    // Add memory information to the response
    healthResponse.memory = {
      used: memoryUsage.rss,
      free: freeMemory,
      total: totalMemory,
      usagePercent: (memoryUsage.rss / totalMemory) * 100
    };
    
  } catch (error) {
    healthResponse.status = 'unhealthy';
    healthResponse.error = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 'Liveness check failed');
  }
  
  return healthResponse;
}

/**
 * Performs a comprehensive readiness check of all system components
 * @returns Detailed health status object with component-level status
 */
export async function checkReadiness(): Promise<HealthCheckResponse> {
  const healthResponse: HealthCheckResponse = {
    status: 'unknown',
    timestamp: Date.now(),
    components: {},
    uptime: process.uptime(),
    environment: APP_CONFIG.ENVIRONMENT,
    version: process.env.npm_package_version || 'unknown'
  };
  
  try {
    // Component checks
    const dbHealth = await checkComponentHealth('database');
    const supabaseHealth = await checkComponentHealth('supabase');
    const fileStorageHealth = await checkComponentHealth('storage');
    const aiServicesHealth = await checkComponentHealth('ai-services');
    const systemResourcesHealth = await checkComponentHealth('system');
    
    // Add component health results
    healthResponse.components = {
      database: dbHealth,
      supabase: supabaseHealth,
      fileStorage: fileStorageHealth,
      aiServices: aiServicesHealth,
      systemResources: systemResourcesHealth
    };
    
    // Determine overall health based on component health
    const componentStatuses = Object.values(healthResponse.components).map(c => c.status);
    
    if (componentStatuses.includes('unhealthy')) {
      // Critical components are unhealthy
      healthResponse.status = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      // Some components are degraded but service can still function
      healthResponse.status = 'degraded';
    } else if (componentStatuses.every(s => s === 'healthy')) {
      // All components are healthy
      healthResponse.status = 'healthy';
    } else {
      // Some components are in unknown state
      healthResponse.status = 'degraded';
    }
    
    // Add summary message based on status
    switch (healthResponse.status) {
      case 'healthy':
        healthResponse.message = 'All systems operational';
        break;
      case 'degraded':
        healthResponse.message = 'System operating with degraded performance';
        break;
      case 'unhealthy':
        healthResponse.message = 'System is not operational';
        break;
      default:
        healthResponse.message = 'System status unknown';
        break;
    }
    
  } catch (error) {
    healthResponse.status = 'unhealthy';
    healthResponse.error = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, 'Readiness check failed');
  }
  
  return healthResponse;
}

/**
 * Checks the health of a specific system component
 * @param componentName Name of the component to check
 * @returns Component health status with details
 */
export async function checkComponentHealth(componentName: string): Promise<ComponentHealth> {
  const componentHealth: ComponentHealth = {
    status: 'unknown',
    name: componentName,
    timestamp: Date.now()
  };
  
  try {
    switch (componentName) {
      case 'database':
        // Check database connectivity
        const isConnected = await checkDatabaseConnection();
        
        if (isConnected) {
          // Check if required extensions are available
          const extensions = await checkRequiredExtensions();
          
          if (extensions.success) {
            componentHealth.status = 'healthy';
            componentHealth.message = 'Database connection successful';
          } else {
            componentHealth.status = 'degraded';
            componentHealth.message = 'Database connected but missing required extensions';
            componentHealth.details = { missingExtensions: extensions.missingExtensions };
          }
        } else {
          componentHealth.status = 'unhealthy';
          componentHealth.message = 'Database connection failed';
        }
        break;
        
      case 'supabase':
        // Check if the supabase client exists and is accessible
        if (supabase) {
          try {
            // Try a basic auth operation to check connectivity
            const { error } = await supabase.auth.getSession();
            
            if (error) {
              componentHealth.status = 'degraded';
              componentHealth.message = `Supabase connection issue: ${error.message}`;
              componentHealth.details = { error: error.message, code: error.code };
            } else {
              componentHealth.status = 'healthy';
              componentHealth.message = 'Supabase connection successful';
            }
          } catch (error) {
            componentHealth.status = 'unhealthy';
            componentHealth.message = 'Failed to connect to Supabase';
            componentHealth.details = { 
              error: error instanceof Error ? error.message : String(error)
            };
          }
        } else {
          componentHealth.status = 'unhealthy';
          componentHealth.message = 'Supabase client not initialized';
        }
        break;
        
      case 'storage':
        // Check if storage is accessible
        try {
          // Simple check if we're using Supabase storage
          const { data, error } = await supabase.storage.listBuckets();
          
          if (error) {
            componentHealth.status = 'degraded';
            componentHealth.message = `Storage access issue: ${error.message}`;
            componentHealth.details = { error: error.message };
          } else {
            componentHealth.status = 'healthy';
            componentHealth.message = 'Storage access successful';
            componentHealth.details = { buckets: data.length };
          }
        } catch (error) {
          componentHealth.status = 'unhealthy';
          componentHealth.message = 'Failed to access storage';
          componentHealth.details = { 
            error: error instanceof Error ? error.message : String(error)
          };
        }
        break;
        
      case 'ai-services':
        // Check if AI services are accessible
        try {
          // Check if AI model URLs are configured
          const llama3Url = process.env.LLAMA_SERVICE_URL;
          const mistralUrl = process.env.MISTRAL_SERVICE_URL;
          const deepseekUrl = process.env.DEEPSEEK_API_URL;
          
          // Track status of each model service
          const modelStatus: Record<string, HealthStatus> = {};
          
          // Check model services
          if (llama3Url) {
            try {
              const result = await checkExternalServiceHealth('llama3', llama3Url);
              modelStatus.llama3 = result.status;
            } catch (error) {
              modelStatus.llama3 = 'unhealthy';
            }
          }
          
          if (mistralUrl) {
            try {
              const result = await checkExternalServiceHealth('mistral', mistralUrl);
              modelStatus.mistral = result.status;
            } catch (error) {
              modelStatus.mistral = 'unhealthy';
            }
          }
          
          if (deepseekUrl) {
            try {
              const result = await checkExternalServiceHealth('deepseek', deepseekUrl);
              modelStatus.deepseek = result.status;
            } catch (error) {
              modelStatus.deepseek = 'unhealthy';
            }
          }
          
          // Determine overall AI service health
          if (Object.keys(modelStatus).length === 0) {
            componentHealth.status = 'unknown';
            componentHealth.message = 'No AI services configured';
          } else if (Object.values(modelStatus).every(s => s === 'healthy')) {
            componentHealth.status = 'healthy';
            componentHealth.message = 'All AI services operational';
          } else if (Object.values(modelStatus).every(s => s === 'unhealthy')) {
            componentHealth.status = 'unhealthy';
            componentHealth.message = 'All AI services unavailable';
          } else {
            componentHealth.status = 'degraded';
            componentHealth.message = 'Some AI services unavailable';
          }
          
          componentHealth.details = { models: modelStatus };
        } catch (error) {
          componentHealth.status = 'unhealthy';
          componentHealth.message = 'Failed to check AI services';
          componentHealth.details = { 
            error: error instanceof Error ? error.message : String(error)
          };
        }
        break;
        
      case 'system':
        // System resources check
        try {
          const cpuUsage = os.loadavg()[0] / os.cpus().length; // Normalized load average
          const memoryUsage = process.memoryUsage();
          const totalMemory = os.totalmem();
          const freeMemory = os.freemem();
          
          // Determine health based on resource usage
          let systemStatus: HealthStatus = 'healthy';
          const issues: string[] = [];
          
          // CPU check - Alert if load average exceeds number of CPUs
          if (cpuUsage > 0.8) {
            systemStatus = 'degraded';
            issues.push('High CPU usage');
          }
          
          // Memory check - Alert if memory usage >80% of total
          if (memoryUsage.rss > (totalMemory * 0.8)) {
            systemStatus = 'degraded';
            issues.push('High memory usage');
          }
          
          // Memory check - Alert if free memory <10% of total
          if (freeMemory < (totalMemory * 0.1)) {
            systemStatus = 'degraded';
            issues.push('Low free memory');
          }
          
          componentHealth.status = systemStatus;
          componentHealth.message = issues.length > 0 
            ? `System resources issues: ${issues.join(', ')}`
            : 'System resources within normal parameters';
          
          componentHealth.details = {
            cpu: {
              loadAverage: os.loadavg(),
              cores: os.cpus().length,
              normalizedLoad: cpuUsage
            },
            memory: {
              total: totalMemory,
              free: freeMemory,
              used: memoryUsage.rss,
              usagePercent: (memoryUsage.rss / totalMemory) * 100
            },
            uptime: {
              system: os.uptime(),
              process: process.uptime()
            }
          };
        } catch (error) {
          componentHealth.status = 'unknown';
          componentHealth.message = 'Failed to check system resources';
          componentHealth.details = { 
            error: error instanceof Error ? error.message : String(error)
          };
        }
        break;
        
      default:
        componentHealth.status = 'unknown';
        componentHealth.message = `Unknown component: ${componentName}`;
        break;
    }
  } catch (error) {
    componentHealth.status = 'unknown';
    componentHealth.message = 'Error checking component health';
    componentHealth.details = { 
      error: error instanceof Error ? error.message : String(error)
    };
    
    logger.error({ 
      component: componentName,
      error: error instanceof Error ? error.message : String(error) 
    }, 'Component health check failed');
  }
  
  return componentHealth;
}

/**
 * Verifies connectivity to an external service dependency
 * @param serviceName Name of the service
 * @param serviceUrl URL of the service
 * @param options Additional options for the health check
 * @returns Service health status with connection details
 */
export async function checkExternalServiceHealth(
  serviceName: string,
  serviceUrl: string,
  options: ExternalServiceOptions = {}
): Promise<ComponentHealth> {
  const { 
    timeout = 5000,
    headers = {},
    method = 'GET',
    body,
    expectedStatus = 200,
    validateResponse
  } = options;
  
  const componentHealth: ComponentHealth = {
    status: 'unknown',
    name: serviceName,
    timestamp: Date.now()
  };
  
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Connection to ${serviceName} timed out`)), timeout);
    });
    
    // Start timing for response time measurement
    const startTime = Date.now();
    
    // Attempt to connect to the service
    const fetchPromise = fetch(serviceUrl, {
      method,
      headers: {
        'Accept': 'application/json',
        ...headers
      },
      body: body ? body : undefined
    });
    
    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Check if status is within expected range
    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const isStatusValid = expectedStatuses.includes(response.status);
    
    // Validate response if validator function provided
    let isResponseValid = true;
    if (validateResponse && response.ok) {
      try {
        const data = await response.json();
        isResponseValid = validateResponse(data);
      } catch (error) {
        isResponseValid = false;
        logger.warn({ 
          service: serviceName,
          error: error instanceof Error ? error.message : String(error) 
        }, 'Failed to validate service response');
      }
    }
    
    // Determine component health based on status and validation
    if (isStatusValid && isResponseValid) {
      componentHealth.status = 'healthy';
      componentHealth.message = `${serviceName} is operational`;
    } else if (isStatusValid && !isResponseValid) {
      componentHealth.status = 'degraded';
      componentHealth.message = `${serviceName} returned unexpected response format`;
    } else {
      componentHealth.status = 'unhealthy';
      componentHealth.message = `${serviceName} returned unexpected status: ${response.status}`;
    }
    
    // Add details
    componentHealth.details = {
      url: serviceUrl,
      status: response.status,
      responseTime,
      expectedStatus: expectedStatuses
    };
    
  } catch (error) {
    componentHealth.status = 'unhealthy';
    componentHealth.message = `Failed to connect to ${serviceName}`;
    componentHealth.details = { 
      error: error instanceof Error ? error.message : String(error),
      url: serviceUrl
    };
    
    logger.error({ 
      service: serviceName,
      url: serviceUrl,
      error: error instanceof Error ? error.message : String(error) 
    }, 'Service health check failed');
  }
  
  return componentHealth;
}

/**
 * Service class that provides continuous health monitoring of system components
 */
export class HealthMonitor {
  private options: HealthMonitorOptions;
  private componentStatus: Record<string, ComponentHealth>;
  private checkSchedule: Record<string, NodeJS.Timeout>;
  private isMonitoring: boolean;
  private listeners: Array<(component: string, status: ComponentHealth, previous: ComponentHealth | null) => void>;
  
  /**
   * Initializes the health monitor with configuration options
   * @param options Configuration options for the health monitor
   */
  constructor(options: HealthMonitorOptions = {}) {
    // Default check intervals in milliseconds
    const defaultCheckIntervals = {
      database: 60000, // Every minute
      supabase: 60000,
      storage: 120000, // Every 2 minutes
      'ai-services': 180000, // Every 3 minutes
      system: 30000 // Every 30 seconds
    };
    
    // Default notification thresholds
    const defaultNotificationThresholds = {
      degraded: 3, // Notify after 3 consecutive degraded status
      unhealthy: 1 // Notify immediately for unhealthy status
    };
    
    this.options = {
      checkIntervals: { ...defaultCheckIntervals, ...options.checkIntervals },
      components: options.components || Object.keys(defaultCheckIntervals),
      notificationThresholds: { ...defaultNotificationThresholds, ...options.notificationThresholds },
      maxRetryAttempts: options.maxRetryAttempts || 3,
      retryDelay: options.retryDelay || 5000
    };
    
    this.componentStatus = {};
    this.checkSchedule = {};
    this.isMonitoring = false;
    this.listeners = [];
    
    // Initialize component status
    this.options.components.forEach(component => {
      this.componentStatus[component] = {
        status: 'unknown',
        name: component,
        timestamp: Date.now()
      };
    });
  }
  
  /**
   * Starts continuous health monitoring of system components
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Health monitoring is already active');
      return;
    }
    
    this.isMonitoring = true;
    logger.info({
      components: this.options.components,
      intervals: this.options.checkIntervals
    }, 'Starting health monitoring');
    
    // Schedule checks for each component
    this.options.components.forEach(component => {
      const interval = this.options.checkIntervals?.[component] || 60000;
      
      // Perform initial check
      this.checkComponent(component).catch(error => 
        logger.error({ 
          component, 
          error: error instanceof Error ? error.message : String(error)
        }, 'Initial health check failed')
      );
      
      // Schedule recurring checks
      this.checkSchedule[component] = setInterval(async () => {
        try {
          await this.checkComponent(component);
        } catch (error) {
          logger.error({ 
            component, 
            error: error instanceof Error ? error.message : String(error)
          }, 'Scheduled health check failed');
        }
      }, interval);
    });
    
    // Log the start of monitoring
    logger.info('Health monitoring started successfully');
  }
  
  /**
   * Stops the continuous health monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      logger.warn('Health monitoring is not active');
      return;
    }
    
    this.isMonitoring = false;
    
    // Clear all scheduled checks
    Object.values(this.checkSchedule).forEach(timeout => clearInterval(timeout));
    this.checkSchedule = {};
    
    logger.info('Health monitoring stopped');
  }
  
  /**
   * Returns the current health status of all components
   * @returns Current health status for all monitored components
   */
  public getSystemStatus(): HealthCheckResponse {
    const timestamp = Date.now();
    
    // Compile status for all components
    const components = { ...this.componentStatus };
    
    // Calculate overall status
    let overallStatus: HealthStatus = 'healthy';
    
    // If any critical component is unhealthy, the system is unhealthy
    if (Object.values(components).some(c => c.status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } 
    // If any component is degraded, the system is degraded
    else if (Object.values(components).some(c => c.status === 'degraded')) {
      overallStatus = 'degraded';
    } 
    // If any component is unknown and none are unhealthy, the system is degraded
    else if (Object.values(components).some(c => c.status === 'unknown')) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      timestamp,
      components,
      environment: APP_CONFIG.ENVIRONMENT,
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime()
    };
  }
  
  /**
   * Performs a health check on a specific component
   * @param componentName Name of the component to check
   * @returns Component health status
   */
  public async checkComponent(componentName: string): Promise<ComponentHealth> {
    // Store previous status for comparison
    const previousStatus = this.componentStatus[componentName] || null;
    
    try {
      // Perform component health check
      const status = await checkComponentHealth(componentName);
      
      // Update component status
      this.componentStatus[componentName] = status;
      
      // Check if status changed
      const hasStatusChanged = !previousStatus || 
        previousStatus.status !== status.status;
      
      // Notify listeners if status changed
      if (hasStatusChanged) {
        this.listeners.forEach(listener => {
          try {
            listener(componentName, status, previousStatus);
          } catch (error) {
            logger.error({ 
              component: componentName,
              error: error instanceof Error ? error.message : String(error)
            }, 'Error in health status change listener');
          }
        });
        
        // Log status change
        logger.info({
          component: componentName,
          previous: previousStatus?.status || 'unknown',
          current: status.status,
          message: status.message
        }, 'Component health status changed');
      }
      
      return status;
    } catch (error) {
      // Log error
      logger.error({ 
        component: componentName,
        error: error instanceof Error ? error.message : String(error)
      }, 'Component health check failed');
      
      // Update status to reflect the error
      const errorStatus: ComponentHealth = {
        status: 'unknown',
        name: componentName,
        timestamp: Date.now(),
        message: 'Error checking component health',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
      
      this.componentStatus[componentName] = errorStatus;
      return errorStatus;
    }
  }
  
  /**
   * Registers a listener for component status changes
   * @param listener Function to call when component status changes
   * @returns Function to remove the listener
   */
  public onStatusChange(
    listener: (component: string, status: ComponentHealth, previous: ComponentHealth | null) => void
  ): () => void {
    this.listeners.push(listener);
    
    // Return a function to remove this listener
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Checks database connectivity and performance
   * @returns Database health status
   */
  public async checkDatabaseHealth(): Promise<ComponentHealth> {
    return checkComponentHealth('database');
  }
  
  /**
   * Checks connectivity to all external service dependencies
   * @returns External services health status
   */
  public async checkExternalServicesHealth(): Promise<ComponentHealth> {
    // This would be implemented to check all external services
    // For now we return a simple mock
    return {
      status: 'healthy',
      name: 'external-services',
      timestamp: Date.now(),
      message: 'External services operational'
    };
  }
  
  /**
   * Checks health of AI model services
   * @returns AI services health status
   */
  public async checkAIServicesHealth(): Promise<ComponentHealth> {
    return checkComponentHealth('ai-services');
  }
  
  /**
   * Monitors system resource utilization
   * @returns System resources health status
   */
  public checkSystemResources(): ComponentHealth {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const cpuUsage = os.loadavg()[0] / os.cpus().length; // Normalized load average
      
      let status: HealthStatus = 'healthy';
      const issues: string[] = [];
      
      // CPU check
      if (cpuUsage > 0.8) {
        status = 'degraded';
        issues.push('High CPU usage');
      }
      
      // Memory check
      if (memoryUsage.rss > (totalMemory * 0.8)) {
        status = 'degraded';
        issues.push('High memory usage');
      }
      
      // Free memory check
      if (freeMemory < (totalMemory * 0.1)) {
        status = 'degraded';
        issues.push('Low free memory');
      }
      
      return {
        status,
        name: 'system-resources',
        timestamp: Date.now(),
        message: issues.length > 0 
          ? `System resource issues: ${issues.join(', ')}` 
          : 'System resources normal',
        details: {
          cpu: {
            loadAverage: os.loadavg(),
            cores: os.cpus().length,
            normalizedLoad: cpuUsage
          },
          memory: {
            total: totalMemory,
            free: freeMemory,
            used: memoryUsage.rss,
            usagePercent: (memoryUsage.rss / totalMemory) * 100
          }
        }
      };
    } catch (error) {
      return {
        status: 'unknown',
        name: 'system-resources',
        timestamp: Date.now(),
        message: 'Error checking system resources',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}

// Create singleton instance for application-wide health monitoring
export const healthMonitor = new HealthMonitor();