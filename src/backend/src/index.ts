import express from 'express'; // express ^4.18.2: Web server framework
import cors from 'cors'; // cors ^2.8.5: Cross-Origin Resource Sharing middleware
import helmet from 'helmet'; // helmet ^7.0.0: Security headers middleware
import compression from 'compression'; // compression ^1.7.4: Response compression middleware
import http from 'http'; // http ^0.0.1-security: HTTP server creation
import * as dotenv from 'dotenv'; // dotenv ^16.3.1: Environment variable loading

import { APP_CONFIG } from './config/constants'; // Access environment configuration and constants
import router from './routes'; // Import configured API routes
import { prisma, prismaRead, checkDatabaseConnection, checkRequiredExtensions, DatabaseConnectionError } from './config/database'; // Database connection and utilities
import { supabaseClient, supabaseAdmin, validateSupabaseConnection } from './config/supabase'; // Supabase client instances and validation
import { errorMiddleware, requestLoggingMiddleware, authenticate, rateLimiter, handleNotFound } from './middlewares'; // Import middleware functions for request processing
import { initializeMonitoring, createMonitoringMiddleware, healthMonitor } from './monitoring'; // Monitoring and health check functionality
import logger from './utils/logger'; // Application logging

// Load environment variables from .env file
dotenv.config();

// Declare global server variable
declare global {
  var server: http.Server;
}

/**
 * Initializes the Express server with all middleware and routes
 * @returns Promise<express.Application> Configured Express application
 */
async function initializeServer(): Promise<express.Application> {
  // LD1: Create new Express application instance
  const app = express();

  // LD1: Initialize monitoring system
  const monitoring = initializeMonitoring();
  const { combinedMiddleware } = createMonitoringMiddleware();
  app.use(combinedMiddleware);

  // LD1: Configure security middleware (helmet, cors)
  app.use(helmet());
  app.use(cors());

  // LD1: Set up parsing middleware for JSON and URL-encoded data
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // LD1: Apply compression middleware
  app.use(compression());

  // LD1: Set up request logging middleware
  app.use(requestLoggingMiddleware());

  // LD1: Mount API routes with version prefix
  app.use(`/api/${APP_CONFIG.API_VERSION}`, router);

  // LD1: Set up health check endpoints
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // LD1: Configure error handling middleware
  app.use(errorMiddleware);

  // LD1: Set up 404 handler for unmatched routes
  app.use(handleNotFound);

  // LD1: Return the configured application
  return app;
}

/**
 * Starts the HTTP server after verifying database connections
 * @param app express.Application
 * @returns Promise<http.Server> Running HTTP server instance
 */
async function startServer(app: express.Application): Promise<http.Server> {
  try {
    // LD1: Verify database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new DatabaseConnectionError('Failed to connect to the database');
    }

    // LD1: Check required PostgreSQL extensions
    const extensionsChecked = await checkRequiredExtensions();
    if (!extensionsChecked.success) {
      throw new Error(`Missing required database extensions: ${extensionsChecked.missingExtensions.join(', ')}`);
    }

    // LD1: Validate Supabase connection
    const supabaseConnected = await validateSupabaseConnection();
    if (!supabaseConnected) {
      throw new Error('Failed to connect to Supabase');
    }

    // LD1: Start HTTP server on configured port
    const port = process.env.PORT || 3000;
    global.server = app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
    });

    // LD1: Return server instance
    return global.server;
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    throw error;
  }
}

/**
 * Gracefully stops the server and closes database connections
 * @returns Promise<void> Completion of shutdown process
 */
async function stopServer(): Promise<void> {
  logger.info('Stopping server');

  try {
    // LD1: Close HTTP server connections
    if (global.server) {
      global.server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    // LD1: Disconnect Prisma database clients
    await prisma.$disconnect();
    await prismaRead.$disconnect();
    logger.info('Prisma clients disconnected');

    // LD1: Stop health monitoring
    healthMonitor.stopMonitoring();

    // LD1: Log successful shutdown
    logger.info('Server stopped successfully');

    // LD1: Exit process with success code
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during server shutdown');
    process.exit(1);
  }
}

/**
 * Sets up process-level error handlers for graceful shutdown
 * @returns void No return value
 */
function handleProcessErrors(): void {
  // LD1: Set up handler for unhandled promise rejections
  process.on('unhandledRejection', (error: Error, promise: Promise<any>) => {
    logger.error({ error, promise }, 'Unhandled promise rejection');
    // Consider implementing a more sophisticated error handling strategy here
    // such as logging to an external service or attempting to recover from the error
    stopServer();
  });

  // LD1: Set up handler for uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error({ error }, 'Uncaught exception');
    // It is generally unsafe to resume normal operation after an uncaught exception
    // so the best course of action is to terminate the process
    stopServer();
  });

  // LD1: Set up SIGTERM handler for graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal');
    stopServer();
  });

  // LD1: Set up SIGINT handler for graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT signal');
    stopServer();
  });
}

/**
 * Main application entry point that orchestrates server initialization and startup
 * @returns Promise<void> Completion of startup process
 */
async function main(): Promise<void> {
  try {
    // LD1: Load environment variables
    logger.info('Starting Engagerr backend');

    // LD1: Set up process error handlers
    handleProcessErrors();

    // LD1: Initialize server with all middleware and routes
    const app = await initializeServer();

    // LD1: Start server and verify connections
    await startServer(app);

    // LD1: Log successful application startup
    logger.info('Engagerr backend started successfully');
  } catch (error) {
    logger.fatal({ error }, 'Engagerr backend failed to start');
    process.exit(1);
  }
}

// Execute main function
main();