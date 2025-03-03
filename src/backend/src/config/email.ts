/**
 * Email service configuration
 * Configuration for Resend email service used for transactional emails and notifications
 * @version 1.0.0
 */

import { ENVIRONMENT, ENVIRONMENTS } from '../config/constants';
import process from 'node:process';

/**
 * Interface for email configuration settings
 */
export interface EmailConfig {
  apiKey: string;
  defaultFromEmail: string;
  defaultFromName: string;
  defaultReplyTo: string;
  sandboxMode: boolean;
  debugMode: boolean;
}

/**
 * Retrieves the email configuration based on the current environment
 * @returns Email configuration object
 */
function getEmailConfig(): EmailConfig {
  // Base configuration for all environments
  const baseConfig: EmailConfig = {
    apiKey: process.env.RESEND_API_KEY || 'your-test-api-key',
    defaultFromEmail: 'no-reply@engagerr.app',
    defaultFromName: 'Engagerr',
    defaultReplyTo: 'support@engagerr.app',
    sandboxMode: true,
    debugMode: false,
  };

  // Environment-specific configurations
  const configs: Record<string, Partial<EmailConfig>> = {
    [ENVIRONMENTS.DEVELOPMENT]: {
      sandboxMode: true,
      debugMode: true,
      defaultFromEmail: 'dev-no-reply@engagerr.app',
    },
    [ENVIRONMENTS.TEST]: {
      sandboxMode: true,
      debugMode: true,
      defaultFromEmail: 'test-no-reply@engagerr.app',
    },
    [ENVIRONMENTS.STAGING]: {
      sandboxMode: true,
      debugMode: false,
      defaultFromEmail: 'staging-no-reply@engagerr.app',
    },
    [ENVIRONMENTS.PRODUCTION]: {
      sandboxMode: false,
      debugMode: false,
    },
  };

  // Merge base config with environment-specific config
  const envConfig = { ...baseConfig, ...configs[ENVIRONMENT] };

  // Override with environment variables if provided
  return {
    apiKey: process.env.RESEND_API_KEY || envConfig.apiKey,
    defaultFromEmail: process.env.EMAIL_FROM_ADDRESS || envConfig.defaultFromEmail,
    defaultFromName: process.env.EMAIL_FROM_NAME || envConfig.defaultFromName,
    defaultReplyTo: process.env.EMAIL_REPLY_TO || envConfig.defaultReplyTo,
    sandboxMode: process.env.EMAIL_SANDBOX_MODE === 'true' ? true : 
                 process.env.EMAIL_SANDBOX_MODE === 'false' ? false : 
                 envConfig.sandboxMode,
    debugMode: process.env.EMAIL_DEBUG_MODE === 'true' ? true : 
               process.env.EMAIL_DEBUG_MODE === 'false' ? false : 
               envConfig.debugMode,
  };
}

/**
 * Email configuration object for the current environment
 */
export const emailConfig = getEmailConfig();

/**
 * Default sender email address for all outgoing emails
 */
export const DEFAULT_FROM_EMAIL = emailConfig.defaultFromEmail;

/**
 * Default reply-to email address for all outgoing emails
 */
export const DEFAULT_REPLY_TO = emailConfig.defaultReplyTo;

/**
 * Enum of available email template identifiers
 */
export enum EmailTemplates {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password-reset',
  EMAIL_VERIFICATION = 'email-verification',
  PARTNERSHIP_REQUEST = 'partnership-request',
  PARTNERSHIP_ACCEPTED = 'partnership-accepted',
  PAYMENT_RECEIVED = 'payment-received',
  PAYMENT_RELEASED = 'payment-released',
  CONTENT_ANALYSIS_COMPLETE = 'content-analysis-complete',
  NEW_MESSAGE = 'new-message',
}