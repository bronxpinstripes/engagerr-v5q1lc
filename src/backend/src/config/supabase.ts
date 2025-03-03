/**
 * Supabase client configuration
 * Configures and initializes the Supabase client instances for auth, database, 
 * and storage operations. Provides both regular client (for user operations) 
 * and admin client (for privileged operations) with appropriate security settings.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'; // ^2.32.0
import { APP_CONFIG, ENVIRONMENT, IS_PRODUCTION, IS_DEVELOPMENT } from './constants';
import { logger } from '../utils/logger';

// Get Supabase URL and keys from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT_MS = 5000;

/**
 * Creates a configured Supabase client with the specified API key
 * @param supabaseKey The API key to use for authentication
 * @param options Additional client options
 * @returns Configured Supabase client instance
 */
function createSupabaseClient(
  supabaseKey: string, 
  options: Record<string, any> = {}
): SupabaseClient {
  // Validate required environment variables
  if (!SUPABASE_URL || SUPABASE_URL.trim() === '') {
    const error = new Error(
      'Supabase URL is missing. Please set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable.'
    );
    logger.error({ error: error.message }, 'Supabase initialization failed');
    throw error;
  }

  if (!supabaseKey || supabaseKey.trim() === '') {
    const error = new Error(
      'Supabase API key is missing. Please set SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY.'
    );
    logger.error({ error: error.message }, 'Supabase initialization failed');
    throw error;
  }

  try {
    // Default options for all environments
    const defaultOptions = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    };

    // Check if we're in a Node.js environment or browser
    const isServer = typeof window === 'undefined';
    
    // If in server environment, add custom headers
    if (isServer) {
      defaultOptions.global = {
        headers: {
          'X-Client-Info': `engagerr-backend/${process.env.npm_package_version || 'unknown'}`
        }
      };
    }

    // Merge default options with any custom options
    const clientOptions = {
      ...defaultOptions,
      ...options
    };

    // Development-specific options
    if (IS_DEVELOPMENT) {
      clientOptions.debug = true;
    }

    // Create and return the Supabase client
    logger.info({
      environment: ENVIRONMENT,
      url: SUPABASE_URL,
      isServerEnvironment: isServer
    }, 'Initializing Supabase client');
    
    return createClient(SUPABASE_URL, supabaseKey, clientOptions);
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      environment: ENVIRONMENT
    }, 'Failed to initialize Supabase client');
    
    throw error;
  }
}

/**
 * Validates that the Supabase client can connect to the service
 * @returns Promise resolving to true if connection is healthy, false otherwise
 */
export async function validateSupabaseConnection(): Promise<boolean> {
  try {
    // Create a timeout promise to prevent hanging
    const timeout = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT_MS);
    });

    // Attempt a simple query to verify connection
    const connectionTest = async (): Promise<boolean> => {
      try {
        // Use a simple query that just checks if the connection works
        const { error } = await supabaseClient.auth.getSession();
        
        if (error) {
          logger.warn({ 
            error: error.message,
            code: error.code 
          }, 'Supabase connection test failed');
          return false;
        }
        
        logger.info('Supabase connection test successful');
        return true;
      } catch (error) {
        logger.error({ 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }, 'Supabase connection test failed');
        
        return false;
      }
    };

    // Wait for either the query to complete or timeout
    return await Promise.race([connectionTest(), timeout]) as boolean;
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error validating Supabase connection');
    
    return false;
  }
}

// Initialize the regular client for standard user operations
export const supabaseClient = createSupabaseClient(SUPABASE_ANON_KEY || '');

// Initialize the admin client with service role for privileged operations
export const supabaseAdmin = createSupabaseClient(SUPABASE_SERVICE_KEY || '', {
  auth: {
    autoRefreshToken: false, // No auto refresh for admin client
    persistSession: false    // Don't persist admin sessions
  }
});

// Log successful initialization
logger.info({
  environment: ENVIRONMENT,
  clientsInitialized: true
}, 'Supabase clients initialized successfully');