/**
 * Type definitions for authentication-related functionality in the Engagerr application.
 * Includes types for login/registration flows, session management, multi-factor authentication,
 * and role-based access control.
 */

import { User } from '../types/user';
import { Provider } from '@supabase/supabase-js'; // v2.38.0

/**
 * Credentials required for user login
 */
export interface LoginCredentials {
  /**
   * User's email address
   */
  email: string;
  
  /**
   * User's password
   */
  password: string;
}

/**
 * Information required for new user registration
 */
export interface RegisterCredentials {
  /**
   * User's email address
   */
  email: string;
  
  /**
   * User's password - must meet complexity requirements
   */
  password: string;
  
  /**
   * User's full name
   */
  fullName: string;
  
  /**
   * Type of user account being created
   */
  userType: UserType;
}

/**
 * Standard response format for authentication operations
 */
export interface AuthResponse {
  /**
   * Authenticated user information if successful
   */
  user: User | null;
  
  /**
   * Session information if authentication successful
   */
  session: Session | null;
  
  /**
   * Error information if authentication failed
   */
  error: Error | null;
}

/**
 * Represents an authenticated user session
 */
export interface Session {
  /**
   * JWT token for API authentication
   */
  accessToken: string;
  
  /**
   * Token used to obtain new access tokens
   */
  refreshToken: string;
  
  /**
   * Timestamp when the access token expires
   */
  expiresAt: number;
  
  /**
   * Information about the authenticated user
   */
  user: User;
}

/**
 * Current authentication state of the application
 */
export interface AuthState {
  /**
   * Current authenticated user or null if not authenticated
   */
  user: User | null;
  
  /**
   * Current session or null if not authenticated
   */
  session: Session | null;
  
  /**
   * Whether authentication state is being loaded
   */
  isLoading: boolean;
  
  /**
   * Whether user is currently authenticated
   */
  isAuthenticated: boolean;
  
  /**
   * Whether multi-factor authentication is enabled for the user
   */
  mfaEnabled: boolean;
  
  /**
   * Whether MFA has been verified for the current session
   */
  mfaVerified: boolean;
}

/**
 * Authentication context type for React context provider
 */
export interface AuthContextType {
  /**
   * Current authentication state
   */
  state: AuthState;
  
  /**
   * Log in with email and password
   */
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  
  /**
   * Register a new user
   */
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  
  /**
   * Log out the current user
   */
  logout: () => Promise<void>;
  
  /**
   * Request a password reset email
   */
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<{ error: Error | null }>;
  
  /**
   * Update user password with reset token
   */
  updatePassword: (credentials: UpdatePasswordCredentials) => Promise<{ error: Error | null }>;
  
  /**
   * Send a magic link for passwordless login
   */
  sendMagicLink: (email: string) => Promise<{ error: Error | null }>;
  
  /**
   * Set up multi-factor authentication
   */
  setupMFA: (type: MFAType) => Promise<MFASetupResponse>;
  
  /**
   * Verify an MFA code
   */
  verifyMFA: (credentials: MFAVerificationCredentials) => Promise<{ error: Error | null }>;
  
  /**
   * Disable multi-factor authentication
   */
  disableMFA: () => Promise<{ error: Error | null }>;
}

/**
 * Types of users in the system
 */
export enum UserType {
  /**
   * Content creator user
   */
  CREATOR = 'creator',
  
  /**
   * Brand/company user
   */
  BRAND = 'brand',
  
  /**
   * System administrator
   */
  ADMIN = 'admin'
}

/**
 * Roles for permission-based access control
 */
export enum Role {
  /**
   * Primary account holder for creator accounts
   */
  CREATOR_OWNER = 'creator_owner',
  
  /**
   * Delegated administrator for creator accounts
   */
  CREATOR_MANAGER = 'creator_manager',
  
  /**
   * View-only team member for creator accounts
   */
  CREATOR_ANALYST = 'creator_analyst',
  
  /**
   * Primary account holder for brand accounts
   */
  BRAND_OWNER = 'brand_owner',
  
  /**
   * Campaign administrator for brand accounts
   */
  BRAND_MANAGER = 'brand_manager',
  
  /**
   * View-only team member for brand accounts
   */
  BRAND_VIEWER = 'brand_viewer',
  
  /**
   * Engagerr platform administrator
   */
  SYSTEM_ADMIN = 'system_admin'
}

/**
 * Supported OAuth providers for social login
 */
export enum OAuthProvider {
  /**
   * Google authentication
   */
  GOOGLE = 'google',
  
  /**
   * Apple authentication
   */
  APPLE = 'apple'
}

/**
 * Status of user identity verification
 */
export enum VerificationStatus {
  /**
   * Verification in progress
   */
  PENDING = 'pending',
  
  /**
   * User identity verified
   */
  VERIFIED = 'verified',
  
  /**
   * Verification rejected
   */
  REJECTED = 'rejected'
}

/**
 * Types of multi-factor authentication supported
 */
export enum MFAType {
  /**
   * Time-based one-time password
   */
  TOTP = 'totp',
  
  /**
   * SMS verification code
   */
  SMS = 'sms',
  
  /**
   * Authenticator app
   */
  APP = 'app'
}

/**
 * Response containing MFA setup information
 */
export interface MFASetupResponse {
  /**
   * Secret key for TOTP setup
   */
  secret: string;
  
  /**
   * QR code URL for easy setup
   */
  qrCode: string;
}

/**
 * Credentials for verifying an MFA code
 */
export interface MFAVerificationCredentials {
  /**
   * Verification code from authenticator app, SMS, or email
   */
  code: string;
}

/**
 * Types of authentication tokens used in the system
 */
export enum TokenType {
  /**
   * Short-lived JWT for API authentication
   */
  AUTH_JWT = 'auth_jwt',
  
  /**
   * Long-lived token for obtaining new access tokens
   */
  REFRESH = 'refresh',
  
  /**
   * Access token for platform integrations
   */
  PLATFORM_ACCESS = 'platform_access',
  
  /**
   * Token for API access from external services
   */
  API_ACCESS = 'api_access'
}

/**
 * Credentials for initiating password reset
 */
export interface ResetPasswordCredentials {
  /**
   * User's email address
   */
  email: string;
}

/**
 * Credentials for updating password with reset token
 */
export interface UpdatePasswordCredentials {
  /**
   * New password
   */
  password: string;
  
  /**
   * Reset token from email
   */
  token: string;
}