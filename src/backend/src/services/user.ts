/**
 * Service layer implementation that provides user management functionality for the Engagerr platform.
 * This service handles user operations including profile management, team collaboration, and user security features.
 */

import userModel from '../models/user'; // src/backend/src/models/user.ts
import creatorModel from '../models/creator'; // src/backend/src/models/creator.ts
import brandModel from '../models/brand'; // src/backend/src/models/brand.ts
import { supabaseStorage } from '../config/supabase'; // src/backend/src/config/supabase.ts
import {
  UserTypes,
  User,
  UserProfile,
  UserType,
  UserRole,
  TeamMember,
  TeamRole,
  TeamInvite
} from '../types/user'; // src/backend/src/types/user.ts
import { CreatorTypes } from '../types/creator'; // src/backend/src/types/creator.ts
import { BrandTypes } from '../types/brand'; // src/backend/src/types/brand.ts
import emailService from '../services/email'; // src/backend/src/services/email.ts
import { sanitizeInput, validateEmail } from '../utils/validation'; // src/backend/src/utils/validation.ts
import { generateToken } from '../utils/tokens'; // src/backend/src/utils/tokens.ts
import { checkPermission } from '../security/permissions'; // src/backend/src/security/permissions.ts
import { NotFoundError, ValidationError, AuthorizationError, ConflictError } from '../utils/errors'; // src/backend/src/utils/errors.ts
import sharp from 'sharp'; // ^0.32.5
import { logger } from '../utils/logger'; // src/backend/src/utils/logger.ts

const userService = {
  /**
   * Retrieve a user by their unique identifier
   * @param userId The unique identifier of the user
   * @returns Promise resolving to the found user
   * @throws NotFoundError if user doesn't exist
   */
  async getUserById(userId: string): Promise<UserTypes.User> {
    logger.info({ userId }, 'Attempting to retrieve user by ID');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    const user = await userModel.findUserById(userId);

    if (!user) {
      logger.warn({ userId }, 'User not found');
      throw new NotFoundError('User not found');
    }

    logger.info({ userId: user.id }, 'User retrieved successfully');
    return user;
  },

  /**
   * Retrieve a user by their email address
   * @param email The email address of the user
   * @returns Promise resolving to the found user
   * @throws NotFoundError if user doesn't exist
   */
  async getUserByEmail(email: string): Promise<UserTypes.User> {
    logger.info({ email }, 'Attempting to retrieve user by email');

    if (!email) {
      logger.error({ email }, 'Invalid email parameter');
      throw new ValidationError('Invalid email parameter');
    }

    const user = await userModel.findUserByEmail(email);

    if (!user) {
      logger.warn({ email }, 'User not found');
      throw new NotFoundError('User not found');
    }

    logger.info({ userId: user.id, email }, 'User retrieved successfully');
    return user;
  },

  /**
   * Update a user's basic information
   * @param userId The unique identifier of the user to update
   * @param updateData The data to update for the user
   * @returns Promise resolving to the updated user
   * @throws NotFoundError if user doesn't exist
   */
  async updateUser(userId: string, updateData: Partial<UserTypes.User>): Promise<UserTypes.User> {
    logger.info({ userId, updateData }, 'Attempting to update user');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    if (!updateData) {
      logger.error({ userId }, 'Invalid updateData parameter');
      throw new ValidationError('Invalid updateData parameter');
    }

    const user = await userModel.updateUser(userId, updateData);

    logger.info({ userId: user.id }, 'User updated successfully');
    return user;
  },

  /**
   * Retrieve a user's profile information
   * @param userId The unique identifier of the user
   * @returns Promise resolving to the user's profile
   * @throws NotFoundError if profile doesn't exist
   */
  async getUserProfile(userId: string): Promise<UserTypes.UserProfile> {
    logger.info({ userId }, 'Attempting to retrieve user profile');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    const profile = await userModel.getUserProfile(userId);

    if (!profile) {
      logger.warn({ userId }, 'User profile not found');
      throw new NotFoundError('User profile not found');
    }

    logger.info({ userId, profile }, 'User profile retrieved successfully');
    return profile;
  },

  /**
   * Update a user's profile information
   * @param userId The unique identifier of the user
   * @param profileData The data to update for the user profile
   * @returns Promise resolving to the updated profile
   * @throws NotFoundError if user doesn't exist
   */
  async updateUserProfile(userId: string, profileData: Partial<UserTypes.UserProfile>): Promise<UserTypes.UserProfile> {
    logger.info({ userId, profileData }, 'Attempting to update user profile');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    if (!profileData) {
      logger.error({ userId }, 'Invalid profileData parameter');
      throw new ValidationError('Invalid profileData parameter');
    }

    const profile = await userModel.updateUserProfile(userId, profileData);

    logger.info({ userId, profile }, 'User profile updated successfully');
    return profile;
  },

  /**
   * Upload and process a user's profile image
   * @param userId The unique identifier of the user
   * @param imageBuffer The image data as a Buffer
   * @param filename The original filename of the image
   * @returns Promise resolving to the public URL of the uploaded image
   * @throws NotFoundError if user doesn't exist
   */
  async uploadProfileImage(userId: string, imageBuffer: Buffer, filename: string): Promise<string> {
    logger.info({ userId, filename }, 'Attempting to upload profile image');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    if (!imageBuffer) {
      logger.error({ userId }, 'Invalid imageBuffer parameter');
      throw new ValidationError('Invalid imageBuffer parameter');
    }

    if (!filename) {
      logger.error({ userId }, 'Invalid filename parameter');
      throw new ValidationError('Invalid filename parameter');
    }

    const user = await userModel.findUserById(userId);
    if (!user) {
      logger.warn({ userId }, 'User not found');
      throw new NotFoundError('User not found');
    }

    // Process image using sharp (resize, optimize)
    const processedImageBuffer = await sharp(imageBuffer)
      .resize(256, 256)
      .toFormat('jpeg')
      .jpeg({ quality: 80 })
      .toBuffer();

    // Generate unique filename based on userId and timestamp
    const timestamp = Date.now();
    const imagePath = `profile-images/${userId}/${timestamp}-${filename}`;

    // Upload processed image to Supabase Storage
    const { data, error } = await supabaseStorage
      .uploadFile(imagePath, processedImageBuffer, { contentType: 'image/jpeg' });

    if (error) {
      logger.error({ userId, filename, error }, 'Error uploading profile image to Supabase Storage');
      throw new Error('Error uploading profile image to Supabase Storage');
    }

    // Get public URL for the uploaded image
    const publicUrl = supabaseStorage.getPublicUrl(data.path);

    // Update user profile with new image URL
    await userModel.updateUserProfile(userId, { avatarUrl: publicUrl });

    logger.info({ userId, publicUrl }, 'Profile image uploaded successfully');
    return publicUrl;
  },

  /**
   * Delete a user account and all associated data
   * @param userId The unique identifier of the user to delete
   * @param requestedByUserId The unique identifier of the user requesting the deletion
   * @returns Promise resolving to true if deletion was successful
   * @throws NotFoundError if user doesn't exist
   * @throws AuthorizationError if the user does not have permission to delete the account
   */
  async deleteUser(userId: string, requestedByUserId: string): Promise<boolean> {
    logger.info({ userId, requestedByUserId }, 'Attempting to delete user');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    if (!requestedByUserId) {
      logger.error({ requestedByUserId }, 'Invalid requestedByUserId parameter');
      throw new ValidationError('Invalid requestedByUserId parameter');
    }

    const user = await userModel.findUserById(userId);
    if (!user) {
      logger.warn({ userId }, 'User not found');
      throw new NotFoundError('User not found');
    }

    // Check if the user has permission to delete the account
    if (userId !== requestedByUserId) {
      logger.warn({ userId, requestedByUserId }, 'User does not have permission to delete this account');
      throw new AuthorizationError('You do not have permission to delete this account');
    }

    const success = await userModel.deleteUser(userId);

    logger.info({ userId }, 'User deleted successfully');
    return success;
  },
  
    /**
   * Retrieve all roles assigned to a user
   * @param userId The unique identifier of the user
   * @returns Promise resolving to array of user roles
   * @throws NotFoundError if user doesn't exist
   */
  async getUserRoles(userId: string): Promise<UserTypes.UserRole[]> {
    logger.info({ userId }, 'Attempting to retrieve user roles');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    const user = await userModel.findUserById(userId);
    if (!user) {
      logger.warn({ userId }, 'User not found');
      throw new NotFoundError('User not found');
    }

    // Extract and return array of assigned roles
    const roles: UserTypes.UserRole[] = [user.userType.toUpperCase() as UserTypes.UserRole];

    logger.info({ userId, roles }, 'User roles retrieved successfully');
    return roles;
  },

  /**
   * Assign a role to a user
   * @param userId The unique identifier of the user
   * @param role The role to assign to the user
   * @param assignedByUserId The unique identifier of the user assigning the role
   * @returns Promise resolving to the updated user
   * @throws NotFoundError if user doesn't exist
   * @throws AuthorizationError if the user does not have permission to assign roles
   */
  async assignRole(userId: string, role: UserTypes.UserRole, assignedByUserId: string): Promise<UserTypes.User> {
    logger.info({ userId, role, assignedByUserId }, 'Attempting to assign role to user');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    if (!role) {
      logger.error({ role }, 'Invalid role parameter');
      throw new ValidationError('Invalid role parameter');
    }

    if (!assignedByUserId) {
      logger.error({ assignedByUserId }, 'Invalid assignedByUserId parameter');
      throw new ValidationError('Invalid assignedByUserId parameter');
    }

    // Check if the assignedByUserId has permission to assign roles
    // TODO: Implement permission check logic

    const user = await userModel.assignRole(userId, role);

    logger.info({ userId: user.id, role }, 'Role assigned successfully');
    return user;
  },

  /**
   * Remove a role from a user
   * @param userId The unique identifier of the user
   * @param role The role to remove from the user
   * @param removedByUserId The unique identifier of the user removing the role
   * @returns Promise resolving to the updated user
   * @throws NotFoundError if user doesn't exist
   * @throws AuthorizationError if the user does not have permission to remove roles
   */
  async removeRole(userId: string, role: UserTypes.UserRole, removedByUserId: string): Promise<UserTypes.User> {
    logger.info({ userId, role, removedByUserId }, 'Attempting to remove role from user');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    if (!role) {
      logger.error({ role }, 'Invalid role parameter');
      throw new ValidationError('Invalid role parameter');
    }

    if (!removedByUserId) {
      logger.error({ removedByUserId }, 'Invalid removedByUserId parameter');
      throw new ValidationError('Invalid removedByUserId parameter');
    }

    // Check if the removedByUserId has permission to remove roles
    // TODO: Implement permission check logic

    const user = await userModel.removeRole(userId, role);

    logger.info({ userId: user.id, role }, 'Role removed successfully');
    return user;
  },

  /**
   * Retrieve all team members for an entity (creator or brand)
   * @param entityId The unique identifier of the creator or brand
   * @param entityType The type of entity (creator or brand)
   * @returns Promise resolving to array of team members
   * @throws NotFoundError if entity doesn't exist
   */
  async getTeamMembers(entityId: string, entityType: string): Promise<UserTypes.TeamMember[]> {
    logger.info({ entityId, entityType }, 'Attempting to retrieve team members');

    if (!entityId) {
      logger.error({ entityId }, 'Invalid entityId parameter');
      throw new ValidationError('Invalid entityId parameter');
    }

    if (!entityType) {
      logger.error({ entityType }, 'Invalid entityType parameter');
      throw new ValidationError('Invalid entityType parameter');
    }

    const teamMembers = await userModel.getTeamMembers(entityId, entityType);

    logger.info({ entityId, entityType, count: teamMembers.length }, 'Team members retrieved successfully');
    return teamMembers;
  },

  /**
   * Add a team member to an entity (creator or brand)
   * @param entityId The unique identifier of the creator or brand
   * @param entityType The type of entity (creator or brand)
   * @param email The email address of the user to add as a team member
   * @param role The role to assign to the team member
   * @param addedByUserId The unique identifier of the user adding the team member
   * @returns Promise resolving to the team member or invitation
   * @throws NotFoundError if entity doesn't exist
   * @throws AuthorizationError if the user does not have permission to add team members
   */
  async addTeamMember(entityId: string, entityType: string, email: string, role: UserTypes.TeamRole, addedByUserId: string): Promise<UserTypes.TeamMember | UserTypes.TeamInvite> {
    logger.info({ entityId, entityType, email, role, addedByUserId }, 'Attempting to add team member');

    if (!entityId) {
      logger.error({ entityId }, 'Invalid entityId parameter');
      throw new ValidationError('Invalid entityId parameter');
    }

    if (!entityType) {
      logger.error({ entityType }, 'Invalid entityType parameter');
      throw new ValidationError('Invalid entityType parameter');
    }

    if (!email) {
      logger.error({ email }, 'Invalid email parameter');
      throw new ValidationError('Invalid email parameter');
    }

    if (!role) {
      logger.error({ role }, 'Invalid role parameter');
      throw new ValidationError('Invalid role parameter');
    }

    if (!addedByUserId) {
      logger.error({ addedByUserId }, 'Invalid addedByUserId parameter');
      throw new ValidationError('Invalid addedByUserId parameter');
    }

    // Check if the addedByUserId has permission to add team members
    // TODO: Implement permission check logic

    const teamMember = await userModel.createTeamMember(entityId, entityType, email, role);

    logger.info({ teamMemberId: teamMember.id }, 'Team member added successfully');
    return teamMember;
  },

  /**
   * Update a team member's role
   * @param teamMemberId The unique identifier of the team member to update
   * @param newRole The new role to assign to the team member
   * @param updatedByUserId The unique identifier of the user updating the team member
   * @returns Promise resolving to the updated team member
   * @throws NotFoundError if team member doesn't exist
   * @throws AuthorizationError if the user does not have permission to update team members
   */
  async updateTeamMemberRole(teamMemberId: string, newRole: UserTypes.TeamRole, updatedByUserId: string): Promise<UserTypes.TeamMember> {
    logger.info({ teamMemberId, newRole, updatedByUserId }, 'Attempting to update team member role');

    if (!teamMemberId) {
      logger.error({ teamMemberId }, 'Invalid teamMemberId parameter');
      throw new ValidationError('Invalid teamMemberId parameter');
    }

    if (!newRole) {
      logger.error({ newRole }, 'Invalid newRole parameter');
      throw new ValidationError('Invalid newRole parameter');
    }

    if (!updatedByUserId) {
      logger.error({ updatedByUserId }, 'Invalid updatedByUserId parameter');
      throw new ValidationError('Invalid updatedByUserId parameter');
    }

    // Check if the updatedByUserId has permission to update team members
    // TODO: Implement permission check logic

    const teamMember = await userModel.updateTeamMemberRole(teamMemberId, newRole);

    logger.info({ teamMemberId: teamMember.id, newRole }, 'Team member role updated successfully');
    return teamMember;
  },

  /**
   * Remove a team member from an entity
   * @param teamMemberId The unique identifier of the team member to remove
   * @param removedByUserId The unique identifier of the user removing the team member
   * @returns Promise resolving to true if removal was successful
   * @throws NotFoundError if team member doesn't exist
   * @throws AuthorizationError if the user does not have permission to remove team members
   */
  async removeTeamMember(teamMemberId: string, removedByUserId: string): Promise<boolean> {
    logger.info({ teamMemberId, removedByUserId }, 'Attempting to remove team member');

    if (!teamMemberId) {
      logger.error({ teamMemberId }, 'Invalid teamMemberId parameter');
      throw new ValidationError('Invalid teamMemberId parameter');
    }

    if (!removedByUserId) {
      logger.error({ removedByUserId }, 'Invalid removedByUserId parameter');
      throw new ValidationError('Invalid removedByUserId parameter');
    }

    // Check if the removedByUserId has permission to remove team members
    // TODO: Implement permission check logic

    const success = await userModel.removeTeamMember(teamMemberId);

    logger.info({ teamMemberId }, 'Team member removed successfully');
    return success;
  },
  
  /**
   * Create and send an invitation to join a team
   * @param entityId The unique identifier of the creator or brand
   * @param entityType The type of entity (creator or brand)
   * @param email The email address of the user to invite
   * @param role The role to assign to the invited user
   * @param invitedByUserId The unique identifier of the user creating the invite
   * @returns Promise resolving to the created invitation
   * @throws NotFoundError if entity doesn't exist
   * @throws AuthorizationError if the user does not have permission to create invites
   */
  async createTeamInvite(entityId: string, entityType: string, email: string, role: UserTypes.TeamRole, invitedByUserId: string): Promise<UserTypes.TeamInvite> {
    logger.info({ entityId, entityType, email, role, invitedByUserId }, 'Attempting to create team invite');

    if (!entityId) {
      logger.error({ entityId }, 'Invalid entityId parameter');
      throw new ValidationError('Invalid entityId parameter');
    }

    if (!entityType) {
      logger.error({ entityType }, 'Invalid entityType parameter');
      throw new ValidationError('Invalid entityType parameter');
    }

    if (!email) {
      logger.error({ email }, 'Invalid email parameter');
      throw new ValidationError('Invalid email parameter');
    }

    if (!role) {
      logger.error({ role }, 'Invalid role parameter');
      throw new ValidationError('Invalid role parameter');
    }

    if (!invitedByUserId) {
      logger.error({ invitedByUserId }, 'Invalid invitedByUserId parameter');
      throw new ValidationError('Invalid invitedByUserId parameter');
    }

    // Check if the invitedByUserId has permission to create invites
    // TODO: Implement permission check logic

    const teamInvite = await userModel.createTeamInvite(entityId, entityType, email, role);

    logger.info({ teamInviteId: teamInvite.id }, 'Team invite created successfully');
    return teamInvite;
  },
  
  /**
   * Accept a team invitation
   * @param token The invitation token
   * @param userId The unique identifier of the user accepting the invite
   * @returns Promise resolving to the created team member
   * @throws NotFoundError if invitation doesn't exist
   * @throws AuthorizationError if the user does not have permission to accept the invite
   */
  async acceptTeamInvite(token: string, userId: string): Promise<UserTypes.TeamMember> {
    logger.info({ token, userId }, 'Attempting to accept team invite');

    if (!token) {
      logger.error({ token }, 'Invalid token parameter');
      throw new ValidationError('Invalid token parameter');
    }

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    // Check if the user has permission to accept the invite
    // TODO: Implement permission check logic

    const teamMember = await userModel.acceptTeamInvite(token, userId);

    logger.info({ teamMemberId: teamMember.id }, 'Team invite accepted successfully');
    return teamMember;
  },
  
  /**
   * Set up multi-factor authentication for a user
   * @param userId The unique identifier of the user
   * @returns Promise resolving to MFA setup information
   * @throws NotFoundError if user doesn't exist
   */
  async setupMfa(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    logger.info({ userId }, 'Attempting to setup MFA for user');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    const mfaSetup = await userModel.enableMfa(userId);

    logger.info({ userId }, 'MFA setup information retrieved successfully');
    return mfaSetup;
  },

  /**
   * Verify MFA code and completes MFA setup
   * @param userId The unique identifier of the user
   * @param verificationCode The MFA verification code
   * @returns Promise resolving to true if MFA setup was successful
   * @throws NotFoundError if user doesn't exist
   */
  async verifyMfa(userId: string, verificationCode: string): Promise<boolean> {
    logger.info({ userId, verificationCode }, 'Attempting to verify MFA for user');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    if (!verificationCode) {
      logger.error({ verificationCode }, 'Invalid verificationCode parameter');
      throw new ValidationError('Invalid verificationCode parameter');
    }

    const success = await userModel.verifyAndEnableMfa(userId, verificationCode);

    logger.info({ userId }, 'MFA verified and enabled successfully');
    return success;
  },

  /**
   * Disable multi-factor authentication for a user
   * @param userId The unique identifier of the user
   * @param password The user's password for verification
   * @returns Promise resolving to true if MFA was successfully disabled
   * @throws NotFoundError if user doesn't exist
   * @throws AuthenticationError if the password is incorrect
   */
  async disableMfa(userId: string, password: string): Promise<boolean> {
    logger.info({ userId }, 'Attempting to disable MFA for user');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    if (!password) {
      logger.error({ password }, 'Invalid password parameter');
      throw new ValidationError('Invalid password parameter');
    }

    const success = await userModel.disableMfa(userId, password);

    logger.info({ userId }, 'MFA disabled successfully');
    return success;
  },
  
  /**
   * Validate an MFA code for a user
   * @param userId The unique identifier of the user
   * @param mfaCode The MFA code to validate
   * @returns Promise resolving to true if MFA code is valid
   * @throws NotFoundError if user doesn't exist
   */
  async validateMfaCode(userId: string, mfaCode: string): Promise<boolean> {
    logger.info({ userId }, 'Attempting to validate MFA code for user');

    if (!userId) {
      logger.error({ userId }, 'Invalid userId parameter');
      throw new ValidationError('Invalid userId parameter');
    }

    if (!mfaCode) {
      logger.error({ mfaCode }, 'Invalid mfaCode parameter');
      throw new ValidationError('Invalid mfaCode parameter');
    }

    const isValid = await userModel.validateMfaCode(userId, mfaCode);

    logger.info({ userId, isValid }, 'MFA code validation result');
    return isValid;
  }
};

export default userService;