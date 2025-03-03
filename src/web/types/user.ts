/**
 * Type definitions for user-related entities in the Engagerr web application.
 * These types are fundamental to the authentication system and user management
 * throughout the platform.
 */

/**
 * Core user entity representing a user account in the system
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  userType: UserType;
  avatar: string | null;
  authProvider: AuthProvider;
  isVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extended user interface that includes subscription information
 */
export interface UserWithSubscription {
  id: string;
  email: string;
  fullName: string;
  userType: UserType;
  avatar: string | null;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionRenewsAt: Date | null;
}

/**
 * Common profile attributes for all user types
 */
export interface UserProfile {
  userId: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  timezone: string;
  language: string;
  notificationPreferences: {
    [key: string]: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Categorizes users based on their primary role in the system
 */
export enum UserType {
  CREATOR = 'creator',
  BRAND = 'brand',
  ADMIN = 'admin',
}

/**
 * Fine-grained roles for permission management within the system
 */
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  CREATOR_OWNER = 'creator_owner',
  CREATOR_MANAGER = 'creator_manager',
  CREATOR_ANALYST = 'creator_analyst',
  BRAND_OWNER = 'brand_owner',
  BRAND_MANAGER = 'brand_manager',
  BRAND_VIEWER = 'brand_viewer',
}

/**
 * Specific permissions that can be assigned to roles or directly to users
 */
export enum Permission {
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_CONTENT = 'manage_content',
  MANAGE_PARTNERSHIPS = 'manage_partnerships',
  MANAGE_PLATFORMS = 'manage_platforms',
  MANAGE_TEAM = 'manage_team',
  MANAGE_BILLING = 'manage_billing',
  VIEW_CAMPAIGNS = 'view_campaigns',
  MANAGE_CAMPAIGNS = 'manage_campaigns',
  APPROVE_CONTRACTS = 'approve_contracts',
}

/**
 * Supported authentication providers for user accounts
 */
export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  APPLE = 'apple',
}

/**
 * Status of user identity verification
 */
export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

/**
 * Subscription levels available to users with different feature access
 */
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * Current status of a user's subscription
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

/**
 * Team member relationship between users and brand/creator entities
 */
export interface TeamMember {
  id: string;
  userId: string;
  entityId: string;
  entityType: UserType;
  role: TeamRole;
  permissions: Permission[];
  user: User;
  joinedAt: Date;
  lastActiveAt: Date | null;
}

/**
 * Roles available for team members within an organization
 */
export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/**
 * Invitation sent to users to join a team
 */
export interface TeamInvite {
  id: string;
  email: string;
  entityId: string;
  entityType: UserType;
  role: TeamRole;
  permissions: Permission[];
  token: string;
  status: InviteStatus;
  invitedById: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Status of team invitations sent to users
 */
export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

/**
 * User-specific settings and preferences
 */
export interface UserSettings {
  userId: string;
  theme: string;
  notifications: NotificationSettings;
  emailPreferences: EmailPreferences;
  timezone: string;
  language: string;
}

/**
 * User notification preferences
 */
export interface NotificationSettings {
  inApp: boolean;
  email: boolean;
  partnerships: boolean;
  messages: boolean;
  analytics: boolean;
  team: boolean;
}

/**
 * User email subscription preferences
 */
export interface EmailPreferences {
  marketing: boolean;
  digest: boolean;
  tips: boolean;
  updates: boolean;
}

/**
 * Combined user entity with profile and settings information
 */
export interface UserWithProfile {
  user: User;
  profile: UserProfile;
  settings: UserSettings;
}

/**
 * Maps user roles to their default permissions
 */
export type RolePermission = {
  role: UserRole;
  permissions: Permission[];
};

/**
 * Request to initiate a password reset
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Request to update a user's password
 */
export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}