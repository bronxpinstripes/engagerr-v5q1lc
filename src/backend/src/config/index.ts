/**
 * Central Configuration Module
 * 
 * This file consolidates all configuration modules into a single export point,
 * providing a unified way to import configuration throughout the application.
 * 
 * @version 1.0.0
 */

// Import configurations from individual modules
import * as constants from './constants';
import * as database from './database';
import * as supabase from './supabase';
import * as stripe from './stripe';
import * as ai from './ai';
import * as email from './email';

// Re-export each configuration namespace
export { constants };
export { database };

// Export Supabase configurations
export const supabaseClient = supabase.supabaseClient;
export const supabaseAdmin = supabase.supabaseAdmin;

// Export Stripe configurations
export const stripeClient = stripe.getStripeInstance;
export const stripeConfig = stripe.stripeConfig;

// Export AI configurations
export const aiConfig = ai.aiConfig;
export const modelEndpoints = ai.MODEL_ENDPOINTS;
export const modelRouter = ai.MODEL_SELECTION_RULES;

// Export Email configurations
export const emailClient = email.emailConfig;
export const emailTemplates = email.EmailTemplates;

// Create a consolidated configuration object
const config = {
  constants,
  database,
  supabase: {
    client: supabaseClient,
    admin: supabaseAdmin
  },
  stripe: {
    client: stripeClient,
    config: stripeConfig
  },
  ai: {
    config: aiConfig,
    endpoints: modelEndpoints,
    router: modelRouter
  },
  email: {
    client: emailClient,
    templates: emailTemplates
  }
};

// Default export the consolidated config
export default config;