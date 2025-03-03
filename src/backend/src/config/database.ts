/**
 * Database configuration and connection management
 * 
 * Manages PostgreSQL database connections through Prisma ORM and Supabase,
 * configuring connection pooling, read/write splitting, and specialized
 * extensions like LTREE for content relationship hierarchies.
 */

import { PrismaClient } from '@prisma/client'; // ^5.0.0
import { Prisma } from '@prisma/client'; // ^5.0.0
import { APP_CONFIG, ENVIRONMENT, IS_PRODUCTION, IS_DEVELOPMENT } from './constants';
import { logger } from '../utils/logger';
import supabase from './supabase';

/**
 * Configuration interface for database connection pool settings
 */
export interface PoolConfig {
  max?: number;
  min?: number;
  idle?: number;
  acquire?: number;
  connectionTimeout?: number;
}

/**
 * Configuration interface for database settings
 */
export interface DatabaseConfig {
  url?: string;
  logLevel?: 'info' | 'query' | 'warn' | 'error';
  logQueries?: boolean;
  pool?: PoolConfig;
  readReplicas?: {
    enabled: boolean;
    urls?: string[];
  };
  queryTimeout?: number;
  connectionTimeout?: number;
  extensions?: string[];
}

/**
 * Custom error class for database connection issues
 */
export class DatabaseConnectionError extends Error {
  public originalError: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.originalError = originalError;
    
    // Ensure proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseConnectionError);
    }
  }
}

/**
 * Retrieves the database configuration based on the current environment
 */
function getDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    logLevel: IS_PRODUCTION ? 'error' : (IS_DEVELOPMENT ? 'query' : 'info'),
    logQueries: !IS_PRODUCTION,
    queryTimeout: 30000, // 30 seconds timeout for queries
    connectionTimeout: 10000, // 10 seconds timeout for connections
    extensions: ['ltree'], // Required extensions for content relationship hierarchies
    readReplicas: {
      enabled: IS_PRODUCTION || APP_CONFIG.ENVIRONMENT === 'staging'
    }
  };

  // Set connection pool sizes based on environment
  if (IS_PRODUCTION) {
    config.pool = {
      max: 30,
      min: 5,
      idle: 10000,
      acquire: 60000,
      connectionTimeout: 20000
    };
  } else if (APP_CONFIG.ENVIRONMENT === 'staging') {
    config.pool = {
      max: 20,
      min: 3,
      idle: 10000,
      acquire: 60000,
      connectionTimeout: 15000
    };
  } else {
    config.pool = {
      max: 10,
      min: 1,
      idle: 5000,
      acquire: 30000,
      connectionTimeout: 10000
    };
  }

  return config;
}

/**
 * Creates a configured Prisma client instance with the appropriate settings
 */
function createPrismaClient(config: DatabaseConfig): PrismaClient {
  // Configure logging based on environment
  const prismaLogging: any[] = [];
  
  if (config.logQueries) {
    prismaLogging.push({
      level: config.logLevel || 'warn',
      emit: 'event'
    });
  }
  
  // Initialize client with configuration
  const prismaClient = new PrismaClient({
    log: prismaLogging.length > 0 ? prismaLogging : undefined,
    datasourceUrl: config.url,
  });
  
  // Set up logging events if enabled
  if (config.logQueries) {
    prismaClient.$on('query', (e) => {
      logger.debug({
        query: e.query,
        params: e.params,
        duration: e.duration,
        timestamp: e.timestamp
      }, 'Prisma query executed');
    });
  }
  
  // Set up query timeout middleware
  if (config.queryTimeout) {
    prismaClient.$use(async (params, next) => {
      const startTime = Date.now();
      
      try {
        const result = await Promise.race([
          next(params),
          new Promise((_, reject) => {
            const timeoutId = setTimeout(() => {
              clearTimeout(timeoutId);
              reject(new Error(`Query timeout after ${config.queryTimeout}ms: ${params.model}.${params.action}`));
            }, config.queryTimeout);
          })
        ]);
        
        // Log slow queries for optimization
        const duration = Date.now() - startTime;
        if (duration > (config.queryTimeout || 30000) * 0.8) {
          logger.warn({ 
            query: `${params.model}.${params.action}`,
            duration,
            args: JSON.stringify(params.args).slice(0, 200) // Limit size for logging
          }, 'Slow database query detected');
        }
        
        return result;
      } catch (error) {
        // Enhanced error logging for query failures
        logger.error({
          query: `${params.model}.${params.action}`,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
          args: JSON.stringify(params.args).slice(0, 200)
        }, 'Database query failed');
        
        throw error;
      }
    });
  }
  
  return prismaClient;
}

/**
 * Creates a Prisma client configured to use read replicas if available
 */
function createReadReplicaClient(): PrismaClient {
  const config = getDatabaseConfig();
  
  if (config.readReplicas?.enabled) {
    // If we have explicit replica URLs, use them
    if (config.readReplicas.urls && config.readReplicas.urls.length > 0) {
      // Randomly select one of the read replicas for load balancing
      const randomIndex = Math.floor(Math.random() * config.readReplicas.urls.length);
      config.url = config.readReplicas.urls[randomIndex];
      
      logger.info({ 
        replicaCount: config.readReplicas.urls.length,
        selectedIndex: randomIndex
      }, 'Selected read replica from pool');
    } else {
      // Try to use environment variables for read replicas
      const readReplicaUrl = process.env.DATABASE_READ_REPLICA_URL;
      
      if (readReplicaUrl) {
        config.url = readReplicaUrl;
        logger.info('Using explicit read replica URL from environment');
      } else {
        // Fallback: Modify connection string to use read replica if Supabase is configured for it
        const originalUrl = process.env.DATABASE_URL;
        if (originalUrl) {
          // This approach depends on the database provider's connection string format
          if (originalUrl.includes('?')) {
            config.url = `${originalUrl}&options=read-replica`;
          } else {
            config.url = `${originalUrl}?options=read-replica`;
          }
          logger.info('Modified connection string for read replica access');
        } else {
          logger.warn('Read replicas enabled but no connection information available');
        }
      }
    }
  } else {
    logger.info('Read replicas not enabled, using primary database for reads');
  }
  
  // Adjust pool configuration for read operations
  if (config.pool) {
    // Typically want more connections for read operations as they're more common
    config.pool.max = Math.floor((config.pool.max || 10) * 1.5); // 50% more connections for read pool
    config.pool.min = Math.max(2, Math.floor((config.pool.min || 2) * 1.5)); // At least 2 connections
  }
  
  // Create the read-optimized client
  return createPrismaClient(config);
}

/**
 * Performs a health check on the database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Create a timeout promise to prevent hanging
    const timeout = new Promise<boolean>((_, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        reject(new Error('Database connection timeout after 5000ms'));
      }, 5000);
    });

    // Attempt to execute a simple query
    const checkConnection = async (): Promise<boolean> => {
      try {
        // Execute a simple query to test the connection
        await prisma.$queryRaw`SELECT 1 as check`;
        logger.info('Database connection test successful');
        return true;
      } catch (error) {
        logger.error({ 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }, 'Database connection test failed');
        
        return false;
      }
    };

    // Wait for either the query to complete or timeout
    return await Promise.race([checkConnection(), timeout]) as boolean;
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error checking database connection');
    
    return false;
  }
}

/**
 * Verifies that all required PostgreSQL extensions (like LTREE) are enabled
 */
export async function checkRequiredExtensions(): Promise<{success: boolean, missingExtensions: string[]}> {
  try {
    const config = getDatabaseConfig();
    const requiredExtensions = config.extensions || ['ltree'];
    const missingExtensions: string[] = [];
    
    // Query the database for installed extensions
    const installedExtensions = await prisma.$queryRaw<Array<{extname: string}>>`
      SELECT extname FROM pg_extension;
    `;
    
    // Convert to simple array of extension names
    const installedExtensionNames = installedExtensions.map(ext => 
      typeof ext.extname === 'string' ? ext.extname.toLowerCase() : String(ext.extname).toLowerCase()
    );
    
    // Check for missing required extensions
    for (const requiredExt of requiredExtensions) {
      if (!installedExtensionNames.includes(requiredExt.toLowerCase())) {
        missingExtensions.push(requiredExt);
        logger.warn(`Required database extension '${requiredExt}' is not installed`);
      }
    }
    
    const success = missingExtensions.length === 0;
    
    if (success) {
      logger.info('All required database extensions are installed');
    } else {
      logger.error({ missingExtensions }, 'Missing required database extensions');
    }
    
    return { success, missingExtensions };
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error checking database extensions');
    
    return { 
      success: false, 
      missingExtensions: ['Error checking extensions'] 
    };
  }
}

// Initialize primary database client
const config = getDatabaseConfig();
export const prisma = createPrismaClient(config);

// Initialize read replica client if enabled
export const prismaRead = createReadReplicaClient();

// Log successful initialization
logger.info({
  environment: ENVIRONMENT,
  readReplicasEnabled: config.readReplicas?.enabled,
  databaseExtensions: config.extensions
}, 'Database clients initialized successfully');