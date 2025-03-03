/**
 * Advanced logging system for the Engagerr platform
 * 
 * Provides structured logging, log storage, retrieval, correlation, and context
 * management for comprehensive observability across the application.
 */

import { logger, createChildLogger, redactSensitiveInfo } from '../utils/logger'; // v8.14.1
import { prisma } from '../config/database'; // ^5.0.0
import pinoHttp from 'pino-http'; // ^8.3.3
import expressPinoLogger from 'express-pino-logger'; // ^7.0.0

// These constants should be in constants.ts but aren't explicitly defined there
// Default values that can be overridden through environment variables
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || '30', 10);
const LOG_STORAGE_TYPE = process.env.LOG_STORAGE_TYPE || 'database';

/**
 * Log levels enum
 */
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Log entry interface
 */
interface LogEntry {
  id?: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log query options interface
 */
interface LogQueryOptions {
  timeRange?: {
    start: Date;
    end: Date;
  };
  level?: LogLevel | LogLevel[];
  source?: string | string[];
  correlationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Log query result interface
 */
interface LogQueryResult {
  logs: LogEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Logger options interface
 */
interface LoggerOptions {
  storageType?: 'database' | 'elasticsearch' | 'file';
  retentionDays?: number;
  httpLogging?: boolean;
  redactFields?: string[];
}

/**
 * Log storage adapter interface
 */
interface LogStorageAdapter {
  store(logEntry: LogEntry): Promise<LogEntry>;
  query(options: LogQueryOptions): Promise<LogQueryResult>;
  rotate(retentionDays: number): Promise<number>;
}

/**
 * Database log adapter for storing and retrieving logs from Postgres
 */
class DatabaseLogAdapter implements LogStorageAdapter {
  private prismaClient: any;
  private config: any;

  /**
   * Initialize the database log adapter
   * @param prismaClient Prisma client instance
   * @param config Configuration options
   */
  constructor(prismaClient: any, config: any = {}) {
    this.prismaClient = prismaClient;
    this.config = config;
  }

  /**
   * Store a log entry in the database
   * @param logEntry The log entry to store
   * @returns The stored log entry with ID
   */
  async store(logEntry: LogEntry): Promise<LogEntry> {
    try {
      // Check for existing "log" model in Prisma schema
      // If not available, this will fail gracefully and log to console
      const result = await this.prismaClient.log.create({
        data: {
          timestamp: new Date(logEntry.timestamp),
          level: logEntry.level,
          message: logEntry.message,
          source: logEntry.source || 'application',
          correlationId: logEntry.correlationId,
          metadata: logEntry.metadata ? JSON.stringify(logEntry.metadata) : null
        }
      });
      
      return {
        ...logEntry,
        id: result.id
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        operation: 'DatabaseLogAdapter.store'
      }, 'Failed to store log entry in database');
      
      // Return the original log entry if storage fails
      return logEntry; 
    }
  }

  /**
   * Query logs from the database with filtering and pagination
   * @param options Query options including filters and pagination
   * @returns Matching logs with pagination metadata
   */
  async query(options: LogQueryOptions): Promise<LogQueryResult> {
    const {
      timeRange,
      level,
      source,
      correlationId,
      search,
      page = 1,
      limit = 20
    } = options;

    // Build the where clause for Prisma
    const where: any = {};

    if (timeRange) {
      where.timestamp = {
        gte: timeRange.start,
        lte: timeRange.end
      };
    }

    if (level) {
      if (Array.isArray(level)) {
        where.level = { in: level };
      } else {
        where.level = level;
      }
    }

    if (source) {
      if (Array.isArray(source)) {
        where.source = { in: source };
      } else {
        where.source = source;
      }
    }

    if (correlationId) {
      where.correlationId = correlationId;
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { metadata: { contains: search, mode: 'insensitive' } }
      ];
    }

    try {
      // Get total count for pagination
      const total = await this.prismaClient.log.count({ where });

      // Get logs with pagination
      const logs = await this.prismaClient.log.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      // Map database records to LogEntry format
      const mappedLogs = logs.map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message,
        source: log.source,
        correlationId: log.correlationId,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined
      }));

      return {
        logs: mappedLogs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        operation: 'DatabaseLogAdapter.query',
        options
      }, 'Failed to query logs from database');
      
      return {
        logs: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0
        }
      };
    }
  }

  /**
   * Remove old logs based on retention policy
   * @param retentionDays Number of days to retain logs
   * @returns Number of logs removed
   */
  async rotate(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.prismaClient.log.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      logger.info({
        removedCount: result.count,
        retentionDays,
        cutoffDate
      }, 'Database logs rotated successfully');
      
      return result.count;
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        operation: 'DatabaseLogAdapter.rotate',
        retentionDays
      }, 'Failed to rotate logs in database');
      
      return 0;
    }
  }
}

/**
 * Elasticsearch log adapter for storing and retrieving logs
 */
class ElasticsearchLogAdapter implements LogStorageAdapter {
  private client: any;
  private config: any;
  private indexName: string;

  /**
   * Initialize the Elasticsearch log adapter
   * @param config Configuration options
   */
  constructor(config: any = {}) {
    this.config = config;
    this.indexName = config.indexName || 'engagerr-logs';
    
    try {
      // Dynamic import to avoid requiring elasticsearch package when not used
      const pinoElasticsearch = require('pino-elasticsearch'); // ^6.2.0
      
      // Create the Elasticsearch client
      this.client = pinoElasticsearch({
        node: config.node || 'http://localhost:9200',
        index: this.indexName,
        esVersion: config.esVersion || 8,
        flushBytes: 1000,
        auth: config.auth
      });
      
      logger.info({
        indexName: this.indexName,
        node: config.node || 'http://localhost:9200'
      }, 'Elasticsearch log adapter initialized');
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        operation: 'ElasticsearchLogAdapter.constructor' 
      }, 'Failed to initialize Elasticsearch adapter');
      
      // Create a dummy client that logs errors
      this.client = {
        send: async () => {
          logger.error('Elasticsearch client not properly initialized');
          return null;
        },
        search: async () => {
          logger.error('Elasticsearch client not properly initialized');
          return { body: { hits: { hits: [], total: { value: 0 } } } };
        },
        indices: {
          delete: async () => {
            logger.error('Elasticsearch client not properly initialized');
            return null;
          }
        },
        cat: {
          indices: async () => {
            logger.error('Elasticsearch client not properly initialized');
            return { body: [] };
          }
        }
      };
    }
  }

  /**
   * Store a log entry in Elasticsearch
   * @param logEntry The log entry to store
   * @returns The stored log entry with ID
   */
  async store(logEntry: LogEntry): Promise<LogEntry> {
    try {
      // Format the document for Elasticsearch
      const document = {
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        message: logEntry.message,
        source: logEntry.source || 'application',
        correlationId: logEntry.correlationId,
        metadata: logEntry.metadata
      };
      
      // Send to Elasticsearch
      const result = await this.client.send({
        index: this.indexName,
        document
      });
      
      return {
        ...logEntry,
        id: result?.body?._id || `es-${Date.now()}`
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        operation: 'ElasticsearchLogAdapter.store' 
      }, 'Failed to store log entry in Elasticsearch');
      
      return logEntry;
    }
  }

  /**
   * Query logs from Elasticsearch with filtering and pagination
   * @param options Query options including filters and pagination
   * @returns Matching logs with pagination metadata
   */
  async query(options: LogQueryOptions): Promise<LogQueryResult> {
    const {
      timeRange,
      level,
      source,
      correlationId,
      search,
      page = 1,
      limit = 20
    } = options;

    // Build the Elasticsearch query
    const must: any[] = [];

    if (timeRange) {
      must.push({
        range: {
          timestamp: {
            gte: timeRange.start.toISOString(),
            lte: timeRange.end.toISOString()
          }
        }
      });
    }

    if (level) {
      if (Array.isArray(level)) {
        must.push({ terms: { level } });
      } else {
        must.push({ term: { level } });
      }
    }

    if (source) {
      if (Array.isArray(source)) {
        must.push({ terms: { source } });
      } else {
        must.push({ term: { source } });
      }
    }

    if (correlationId) {
      must.push({ term: { correlationId } });
    }

    if (search) {
      must.push({
        multi_match: {
          query: search,
          fields: ['message', 'metadata.*']
        }
      });
    }

    try {
      const result = await this.client.search({
        index: this.indexName,
        body: {
          query: {
            bool: { must: must.length > 0 ? must : [{ match_all: {} }] }
          },
          sort: [{ timestamp: 'desc' }],
          from: (page - 1) * limit,
          size: limit
        }
      });

      const hits = result.body.hits.hits;
      const total = result.body.hits.total.value;

      // Map Elasticsearch documents to LogEntry format
      const logs = hits.map((hit: any) => ({
        id: hit._id,
        timestamp: hit._source.timestamp,
        level: hit._source.level,
        message: hit._source.message,
        source: hit._source.source,
        correlationId: hit._source.correlationId,
        metadata: hit._source.metadata
      }));

      return {
        logs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        operation: 'ElasticsearchLogAdapter.query',
        options 
      }, 'Failed to query logs from Elasticsearch');
      
      return {
        logs: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0
        }
      };
    }
  }

  /**
   * Remove old logs based on retention policy using index rotation
   * @param retentionDays Number of days to retain logs
   * @returns Number of indices rotated
   */
  async rotate(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    try {
      // Get all indices for our logs
      const indices = await this.client.cat.indices({
        index: `${this.indexName}-*`,
        format: 'json',
        h: 'index,creation.date'
      });
      
      // Filter to find indices older than our retention period
      const oldIndices = indices.body.filter((idx: any) => {
        const creationDate = new Date(parseInt(idx['creation.date']));
        return creationDate < cutoffDate;
      });
      
      if (oldIndices.length === 0) {
        logger.info({
          retentionDays,
          cutoffDate
        }, 'No Elasticsearch indices to rotate');
        return 0;
      }
      
      // Delete the old indices
      const indexNames = oldIndices.map((idx: any) => idx.index);
      await this.client.indices.delete({
        index: indexNames.join(',')
      });
      
      logger.info({
        retentionDays,
        cutoffDate,
        removedIndices: indexNames
      }, 'Elasticsearch indices rotated successfully');
      
      return indexNames.length;
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        operation: 'ElasticsearchLogAdapter.rotate',
        retentionDays
      }, 'Failed to rotate Elasticsearch indices');
      
      return 0;
    }
  }
}

/**
 * Creates the appropriate log storage adapter based on configuration
 * @param storageType The type of storage to use (database, elasticsearch, file)
 * @returns Configured storage adapter instance
 */
function createLogStorageAdapter(storageType: string): LogStorageAdapter {
  switch (storageType.toLowerCase()) {
    case 'elasticsearch':
      return new ElasticsearchLogAdapter({
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        indexName: process.env.ELASTICSEARCH_INDEX || 'engagerr-logs',
        esVersion: process.env.ELASTICSEARCH_VERSION || 8,
        auth: process.env.ELASTICSEARCH_AUTH ? {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD
        } : undefined
      });
    case 'file':
      // File storage not implemented, fall back to database
      logger.warn('File-based log storage not implemented, falling back to database');
      return new DatabaseLogAdapter(prisma);
    case 'database':
    default:
      return new DatabaseLogAdapter(prisma);
  }
}

/**
 * Initializes the logging system with appropriate storage backends and configuration
 * @param options Configuration options
 * @returns Initialized logging system
 */
export function initializeLogging(options: LoggerOptions = {}): any {
  // Set default values
  const storageType = options.storageType || LOG_STORAGE_TYPE || 'database';
  const retentionDays = options.retentionDays || LOG_RETENTION_DAYS || 30;
  
  logger.info({
    storageType,
    retentionDays,
    httpLogging: options.httpLogging || false
  }, 'Initializing monitoring logger');
  
  // Create storage adapter
  const storageAdapter = createLogStorageAdapter(storageType);
  
  // Create a specialized logger for monitoring
  const customMonitoringLogger = createChildLogger({
    source: 'monitoring',
    storageType,
    retentionDays
  });
  
  // Set up HTTP request logging if enabled
  if (options.httpLogging) {
    const httpLogger = pinoHttp({
      logger: customMonitoringLogger,
      // Customize request serialization to avoid sensitive data
      serializers: {
        req: (req: any) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort
        })
      },
      // Don't log health check endpoints
      autoLogging: {
        ignore: (req: any) => req.url.includes('/health') || req.url.includes('/heartbeat')
      }
    });
    
    const expressLogger = expressPinoLogger({
      logger: customMonitoringLogger
    });
    
    // Attach loggers to the monitoring logger
    (customMonitoringLogger as any).httpLogger = httpLogger;
    (customMonitoringLogger as any).expressLogger = expressLogger;
  }
  
  // Add storage functionality to the logger
  (customMonitoringLogger as any).store = async (level: string, message: string, metadata?: any) => {
    return await createLogEntry(level, message, metadata, 'monitoring');
  };
  
  (customMonitoringLogger as any).query = async (options: LogQueryOptions) => {
    return await queryLogs(options);
  };
  
  (customMonitoringLogger as any).rotate = async () => {
    return await rotateLogs();
  };
  
  (customMonitoringLogger as any).withContext = (context: any) => {
    return logWithContext(context);
  };
  
  // Schedule log rotation if we're in a server environment
  if (typeof window === 'undefined') {
    const rotationInterval = 24 * 60 * 60 * 1000; // 24 hours
    setInterval(() => {
      rotateLogs().catch(err => {
        logger.error({ 
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        }, 'Error during scheduled log rotation');
      });
    }, rotationInterval);
    
    logger.info({
      rotationInterval: '24 hours',
      retentionDays
    }, 'Log rotation scheduled');
  }
  
  return customMonitoringLogger;
}

/**
 * Creates a structured log entry and stores it in the configured storage system
 * @param level Log level (error, warn, info, debug)
 * @param message Log message
 * @param metadata Additional contextual data
 * @param source Source system or component
 * @returns Created log entry with ID
 */
export async function createLogEntry(
  level: string,
  message: string,
  metadata?: any,
  source: string = 'application'
): Promise<LogEntry> {
  // Validate the log level
  if (!['error', 'warn', 'info', 'debug'].includes(level)) {
    level = 'info'; // Default to info if invalid level
  }
  
  // Ensure metadata is serializable and redact sensitive information
  let sanitizedMetadata = metadata;
  if (metadata) {
    try {
      // Redact any sensitive information
      sanitizedMetadata = redactSensitiveInfo(metadata);
      
      // Verify it's serializable
      JSON.parse(JSON.stringify(sanitizedMetadata));
    } catch (error) {
      sanitizedMetadata = { 
        error: 'Non-serializable metadata', 
        providedType: typeof metadata 
      };
      
      logger.warn({
        level,
        message: message.substring(0, 100), // Only log part of the message in case it's sensitive
        metadataType: typeof metadata
      }, 'Non-serializable metadata provided to log entry');
    }
  }
  
  // Create the log entry
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: level as LogLevel,
    message,
    source,
    correlationId: process.domain?.['correlationId'],
    metadata: sanitizedMetadata
  };
  
  // Get the storage adapter
  const storageType = LOG_STORAGE_TYPE || 'database';
  const storageAdapter = createLogStorageAdapter(storageType);
  
  // Store the log entry
  try {
    const storedEntry = await storageAdapter.store(logEntry);
    return storedEntry;
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      operation: 'createLogEntry'
    }, 'Failed to store log entry');
    
    return logEntry;
  }
}

/**
 * Creates logs with consistent context attached to each entry
 * @param context Context object to include with all log entries
 * @returns Logger instance with bound context
 */
export function logWithContext(context: Record<string, any>) {
  // Ensure context has a correlation ID if available
  if (!context.correlationId && process.domain?.['correlationId']) {
    context.correlationId = process.domain['correlationId'];
  }
  
  // Create a child logger with the provided context
  const contextLogger = createChildLogger(context);
  
  // Extend with methods to store logs in the configured system
  return {
    ...contextLogger,
    info: (message: string, additionalMetadata?: any) => {
      contextLogger.info(additionalMetadata || {}, message);
      return createLogEntry('info', message, { ...context, ...additionalMetadata });
    },
    error: (message: string, additionalMetadata?: any) => {
      contextLogger.error(additionalMetadata || {}, message);
      return createLogEntry('error', message, { ...context, ...additionalMetadata });
    },
    warn: (message: string, additionalMetadata?: any) => {
      contextLogger.warn(additionalMetadata || {}, message);
      return createLogEntry('warn', message, { ...context, ...additionalMetadata });
    },
    debug: (message: string, additionalMetadata?: any) => {
      contextLogger.debug(additionalMetadata || {}, message);
      return createLogEntry('debug', message, { ...context, ...additionalMetadata });
    },
    withContext: (additionalContext: Record<string, any>) => {
      return logWithContext({ ...context, ...additionalContext });
    }
  };
}

/**
 * Searches and retrieves logs based on query criteria
 * @param queryOptions Query filters and pagination parameters
 * @returns Matching log entries with pagination metadata
 */
export async function queryLogs(queryOptions: LogQueryOptions): Promise<LogQueryResult> {
  const storageType = LOG_STORAGE_TYPE || 'database';
  const storageAdapter = createLogStorageAdapter(storageType);
  
  try {
    return await storageAdapter.query(queryOptions);
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      operation: 'queryLogs',
      queryOptions
    }, 'Failed to query logs');
    
    return {
      logs: [],
      pagination: {
        total: 0,
        page: queryOptions.page || 1,
        limit: queryOptions.limit || 20,
        pages: 0
      }
    };
  }
}

/**
 * Performs log rotation based on configured retention policy
 * @returns Completion signal
 */
export async function rotateLogs(): Promise<void> {
  const retentionDays = LOG_RETENTION_DAYS || 30;
  const storageType = LOG_STORAGE_TYPE || 'database';
  const storageAdapter = createLogStorageAdapter(storageType);
  
  try {
    const removedCount = await storageAdapter.rotate(retentionDays);
    logger.info({
      removedCount,
      retentionDays,
      storageType
    }, 'Log rotation completed successfully');
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      operation: 'rotateLogs',
      retentionDays
    }, 'Failed to rotate logs');
  }
}

// Initialize the monitoring logger with default settings
export const monitoringLogger = initializeLogging();