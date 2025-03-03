/**
 * User Types Definition
 * 
 * This module defines the core TypeScript interfaces, types, and enums for user-related
 * data structures used throughout the Engagerr platform. It includes definitions for
 * authentication, roles, permissions, and team management functionality.
 */

// Define all types within a namespace
export namespace UserTypes {
  /**
   * Categorizes users based on their primary role in the system
   */
  export enum UserType {
    CREATOR = 'creator',
    BRAND = 'brand',
    ADMIN = 'admin'
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
    BRAND_VIEWER = 'brand_viewer'
  }

  /**
   * Supported authentication providers for user accounts
   */
  export enum AuthProvider {
    EMAIL = 'email',
    GOOGLE = 'google',
    APPLE = 'apple'
  }

  /**
   * Status of user identity verification
   */
  export enum VerificationStatus {
    UNVERIFIED = 'unverified',
    PENDING = 'pending',
    VERIFIED = 'verified'
  }

  /**
   * Subscription levels available to users with different feature access
   */
  export enum SubscriptionTier {
    FREE = 'free',
    BASIC = 'basic',
    PRO = 'pro',
    ENTERPRISE = 'enterprise'
  }

  /**
   * Current status of a user's subscription
   */
  export enum SubscriptionStatus {
    ACTIVE = 'active',
    TRIAL = 'trial',
    PAST_DUE = 'past_due',
    CANCELED = 'canceled',
    EXPIRED = 'expired'
  }

  /**
   * Roles available for team members within an organization
   */
  export enum TeamRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
    VIEWER = 'viewer'
  }

  /**
   * Status of team invitations sent to users
   */
  export enum InviteStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    EXPIRED = 'expired'
  }

  /**
   * Core user entity representing a user account in the system
   */
  export interface User {
    id: string;
    email: string;
    fullName: string;
    userType: UserType;
    authProvider: AuthProvider;
    isVerified: boolean;
    mfaEnabled: boolean;
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * Common profile attributes for all user types
   */
  export interface UserProfile {
    userId: string;
    avatarUrl: string;
    phoneNumber: string;
    timezone: string;
    language: string;
    notificationPreferences: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * Team member relationship between users and brand/creator entities
   */
  export interface TeamMember {
    id: string;
    userId: string;
    entityId: string;
    entityType: string; // 'creator' or 'brand'
    role: TeamRole;
    user: User;
    joinedAt: Date;
  }

  /**
   * Invitation sent to users to join a team
   */
  export interface TeamInvite {
    id: string;
    email: string;
    entityId: string;
    entityType: string; // 'creator' or 'brand'
    role: TeamRole;
    token: string;
    status: InviteStatus;
    expiresAt: Date;
    createdAt: Date;
  }

  /**
   * Data required for user registration
   */
  export interface SignupData {
    email: string;
    password: string;
    fullName: string;
    userType: UserType;
    inviteToken?: string; // Optional, used when signing up through a team invite
  }

  /**
   * Credentials required for user authentication
   */
  export interface LoginCredentials {
    email: string;
    password: string;
    mfaCode?: string; // Optional, required only when MFA is enabled
  }
}

// Re-export individual types for direct import
export type User = UserTypes.User;
export type UserProfile = UserTypes.UserProfile;
export type TeamMember = UserTypes.TeamMember;
export type TeamInvite = UserTypes.TeamInvite;
export type SignupData = UserTypes.SignupData;
export type LoginCredentials = UserTypes.LoginCredentials;

// Re-export enums (these can be exported directly as values)
export import UserType = UserTypes.UserType;
export import UserRole = UserTypes.UserRole;
export import AuthProvider = UserTypes.AuthProvider;
export import VerificationStatus = UserTypes.VerificationStatus;
export import SubscriptionTier = UserTypes.SubscriptionTier;
export import SubscriptionStatus = UserTypes.SubscriptionStatus;
export import TeamRole = UserTypes.TeamRole;
export import InviteStatus = UserTypes.InviteStatus;