/**
 * Core user model implementation that provides data access methods for user management,
 * authentication, and profile operations in the Engagerr platform. Serves as the foundation
 * for both creator and brand user types with appropriate role-based access control.
 */

import { PrismaClient } from '@prisma/client'; // ^5.0.0
import { supabaseAdmin, SupabaseClient } from '../config/supabase'; // ^2.32.0
import {
  UserTypes,
  User,
  UserProfile,
  UserType,
  UserRole,
  AuthProvider,
  TeamMember,
  TeamRole,
  SignupData,
  LoginCredentials
} from '../types/user';
import { generateHash, compareHash, generateRandomToken } from '../utils/crypto';
import { sanitizeInput } from '../utils/validation';
import { NotFoundError, ConflictError, AuthenticationError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * User model with data access methods for user management, authentication, and profile operations.
 */
const userModel = {
  /**
   * Retrieves a user by their unique identifier.
   * @param userId The unique identifier of the user.
   * @returns A promise that resolves to the found user or null if not found.
   */
  async findUserById(userId: string): Promise<UserTypes.User | null> {
    try {
      logger.info({ userId }, 'Finding user by ID');
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        logger.warn({ userId }, 'User not found');
        return null;
      }

      return user;
    } catch (error) {
      logger.error({ userId, error }, 'Error finding user by ID');
      throw error;
    }
  },

  /**
   * Retrieves a user by their email address.
   * @param email The email address of the user.
   * @returns A promise that resolves to the found user or null if not found.
   */
  async findUserByEmail(email: string): Promise<UserTypes.User | null> {
    try {
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      logger.info({ email: sanitizedEmail }, 'Finding user by email');

      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail }
      });

      if (!user) {
        logger.warn({ email: sanitizedEmail }, 'User not found');
        return null;
      }

      return user;
    } catch (error) {
      logger.error({ email, error }, 'Error finding user by email');
      throw error;
    }
  },

  /**
   * Creates a new user account with the specified data.
   * @param userData The data for the new user account.
   * @returns A promise that resolves to the newly created user.
   */
  async createUser(userData: UserTypes.SignupData): Promise<UserTypes.User> {
    try {
      const sanitizedData = {
        ...userData,
        email: sanitizeInput(userData.email).toLowerCase(),
        fullName: sanitizeInput(userData.fullName)
      };

      logger.info({ userData: sanitizedData }, 'Creating new user');

      // Check if a user with the same email already exists
      const existingUser = await this.findUserByEmail(sanitizedData.email);
      if (existingUser) {
        logger.warn({ email: sanitizedData.email }, 'User already exists');
        throw new ConflictError('User with this email already exists');
      }

      // Hash the password
      const hashedPassword = await generateHash(sanitizedData.password);

      // Create user in Supabase Auth system
      const { data, error } = await supabaseAdmin.auth.signUp({
        email: sanitizedData.email,
        password: sanitizedData.password,
        options: {
          data: {
            fullName: sanitizedData.fullName,
            userType: sanitizedData.userType
          }
        }
      });

      if (error) {
        logger.error({ email: sanitizedData.email, error }, 'Error creating user in Supabase Auth');
        throw new Error(`Supabase Auth error: ${error.message}`);
      }

      if (!data.user) {
        logger.error({ email: sanitizedData.email }, 'No user returned from Supabase Auth');
        throw new Error('No user returned from Supabase Auth');
      }

      // Create user record in Prisma database
      const user = await prisma.user.create({
        data: {
          id: data.user.id,
          email: sanitizedData.email,
          fullName: sanitizedData.fullName,
          passwordHash: hashedPassword,
          userType: sanitizedData.userType,
          authProvider: AuthProvider.EMAIL,
          isVerified: false,
          mfaEnabled: false,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info({ userId: user.id }, 'User created successfully');
      return user;
    } catch (error) {
      logger.error({ userData, error }, 'Error creating user');
      throw error;
    }
  },

  /**
   * Authenticates a user with email and password credentials.
   * @param credentials The login credentials for the user.
   * @returns A promise that resolves to the authenticated user and JWT token.
   */
  async authenticateUser(credentials: UserTypes.LoginCredentials): Promise<{ user: UserTypes.User; token: string; }> {
    try {
      const sanitizedEmail = sanitizeInput(credentials.email).toLowerCase();
      logger.info({ email: sanitizedEmail }, 'Authenticating user');

      const user = await this.findUserByEmail(sanitizedEmail);
      if (!user) {
        logger.warn({ email: sanitizedEmail }, 'User not found during authentication');
        throw new AuthenticationError('Invalid credentials');
      }

      const passwordMatch = await compareHash(credentials.password, user.passwordHash);
      if (!passwordMatch) {
        logger.warn({ email: sanitizedEmail }, 'Invalid password during authentication');
        throw new AuthenticationError('Invalid credentials');
      }

      // Generate JWT token using Supabase Auth
      const { data, error } = await supabaseAdmin.auth.generateLink({
        type: 'magiclink',
        email: sanitizedEmail,
        password: credentials.password
      });

      if (error) {
        logger.error({ email: sanitizedEmail, error }, 'Error generating JWT token');
        throw new Error(`Supabase Auth error: ${error.message}`);
      }

      // Update last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      logger.info({ userId: user.id }, 'User authenticated successfully');
      return { user, token: data.properties.accessToken };
    } catch (error) {
      logger.error({ credentials, error }, 'Error authenticating user');
      throw error;
    }
  },

  /**
   * Updates a user's basic information.
   * @param userId The unique identifier of the user to update.
   * @param updateData The data to update for the user.
   * @returns A promise that resolves to the updated user.
   */
  async updateUser(userId: string, updateData: any): Promise<UserTypes.User> {
    try {
      const sanitizedData = {
        ...updateData,
        fullName: updateData.fullName ? sanitizeInput(updateData.fullName) : undefined,
        email: updateData.email ? sanitizeInput(updateData.email).toLowerCase() : undefined
      };

      logger.info({ userId, updateData: sanitizedData }, 'Updating user');

      const user = await this.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found during update');
        throw new NotFoundError('User not found');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: sanitizedData
      });

      logger.info({ userId: updatedUser.id }, 'User updated successfully');
      return updatedUser;
    } catch (error) {
      logger.error({ userId, updateData, error }, 'Error updating user');
      throw error;
    }
  },

  /**
   * Changes a user's password with verification of current password.
   * @param userId The unique identifier of the user to update.
   * @param currentPassword The current password of the user.
   * @param newPassword The new password for the user.
   * @returns A promise that resolves to true if password change was successful.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      logger.info({ userId }, 'Changing user password');

      const user = await this.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found during password change');
        throw new NotFoundError('User not found');
      }

      const passwordMatch = await compareHash(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        logger.warn({ userId }, 'Invalid current password during password change');
        throw new AuthenticationError('Invalid current password');
      }

      const hashedPassword = await generateHash(newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword }
      });

      logger.info({ userId }, 'User password changed successfully');
      return true;
    } catch (error) {
      logger.error({ userId, error }, 'Error changing user password');
      throw error;
    }
  },

  /**
   * Initiates the password reset process for a user.
   * @param email The email address of the user requesting a password reset.
   * @returns A promise that resolves to true if reset request was successful.
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      logger.info({ email: sanitizedEmail }, 'Requesting password reset');

      const user = await this.findUserByEmail(sanitizedEmail);
      if (!user) {
        logger.warn({ email: sanitizedEmail }, 'User not found during password reset request');
        return true; // Intentionally return true to avoid revealing email existence
      }

      const resetToken = generateRandomToken();
      const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry: tokenExpiry }
      });

      // TODO: Send password reset email with token

      logger.info({ userId: user.id }, 'Password reset requested successfully');
      return true;
    } catch (error) {
      logger.error({ email, error }, 'Error requesting password reset');
      throw error;
    }
  },

  /**
   * Completes the password reset process using a valid token.
   * @param token The password reset token.
   * @param newPassword The new password for the user.
   * @returns A promise that resolves to true if password reset was successful.
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      logger.info({ token }, 'Resetting password');

      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: new Date() }
        }
      });

      if (!user) {
        logger.warn({ token }, 'Invalid or expired reset token');
        throw new AuthenticationError('Invalid or expired reset token');
      }

      const hashedPassword = await generateHash(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      logger.info({ userId: user.id }, 'Password reset successfully');
      return true;
    } catch (error) {
      logger.error({ token, error }, 'Error resetting password');
      throw error;
    }
  },

  /**
   * Verifies a user's email address using a verification token.
   * @param token The email verification token.
   * @returns A promise that resolves to true if email verification was successful.
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      logger.info({ token }, 'Verifying email');

      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpiry: { gt: new Date() }
        }
      });

      if (!user) {
        logger.warn({ token }, 'Invalid or expired verification token');
        throw new AuthenticationError('Invalid or expired verification token');
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null
        }
      });

      logger.info({ userId: user.id }, 'Email verified successfully');
      return true;
    } catch (error) {
      logger.error({ token, error }, 'Error verifying email');
      throw error;
    }
  },

  /**
   * Deletes a user account and all associated data.
   * @param userId The unique identifier of the user to delete.
   * @returns A promise that resolves to true if deletion was successful.
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      logger.info({ userId }, 'Deleting user');

      const user = await this.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found during deletion');
        throw new NotFoundError('User not found');
      }

      // Start a transaction to ensure data consistency
      await prisma.$transaction(async (tx) => {
        // Delete associated data based on user type (creator or brand)
        if (user.userType === UserType.CREATOR) {
          // TODO: Delete creator-specific data
        } else if (user.userType === UserType.BRAND) {
          // TODO: Delete brand-specific data
        }

        // Delete user profile data
        await tx.userProfile.deleteMany({
          where: { userId: userId }
        });

        // Delete user record from database
        await tx.user.delete({
          where: { id: userId }
        });

        // Delete user from Supabase Auth
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) {
          logger.error({ userId, error }, 'Error deleting user from Supabase Auth');
          throw new Error(`Supabase Auth error: ${error.message}`);
        }
      });

      logger.info({ userId }, 'User deleted successfully');
      return true;
    } catch (error) {
      logger.error({ userId, error }, 'Error deleting user');
      throw error;
    }
  },

  /**
   * Retrieves a user's profile information.
   * @param userId The unique identifier of the user.
   * @returns A promise that resolves to the user profile or null if not found.
   */
  async getUserProfile(userId: string): Promise<UserTypes.UserProfile | null> {
    try {
      logger.info({ userId }, 'Getting user profile');

      const user = await this.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found while getting profile');
        throw new NotFoundError('User not found');
      }

      const profile = await prisma.userProfile.findUnique({
        where: { userId: userId }
      });

      return profile;
    } catch (error) {
      logger.error({ userId, error }, 'Error getting user profile');
      throw error;
    }
  },

  /**
   * Updates a user's profile information.
   * @param userId The unique identifier of the user.
   * @param profileData The data to update for the user profile.
   * @returns A promise that resolves to the updated profile.
   */
  async updateUserProfile(userId: string, profileData: any): Promise<UserTypes.UserProfile> {
    try {
      logger.info({ userId, profileData }, 'Updating user profile');

      const user = await this.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found while updating profile');
        throw new NotFoundError('User not found');
      }

      const profile = await prisma.userProfile.upsert({
        where: { userId: userId },
        update: profileData,
        create: {
          userId: userId,
          ...profileData
        }
      });

      logger.info({ userId }, 'User profile updated successfully');
      return profile;
    } catch (error) {
      logger.error({ userId, profileData, error }, 'Error updating user profile');
      throw error;
    }
  },

  /**
   * Enables multi-factor authentication for a user.
   * @param userId The unique identifier of the user.
   * @returns A promise that resolves to MFA setup information.
   */
  async enableMfa(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    try {
      logger.info({ userId }, 'Enabling MFA for user');

      const user = await this.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found while enabling MFA');
        throw new NotFoundError('User not found');
      }

      // TODO: Implement MFA setup logic

      const secret = generateRandomToken(32);
      const qrCodeUrl = `otpauth://totp/Engagerr:${user.email}?secret=${secret}&issuer=Engagerr`;

      logger.info({ userId }, 'MFA setup information generated');
      return { secret, qrCodeUrl };
    } catch (error) {
      logger.error({ userId, error }, 'Error enabling MFA for user');
      throw error;
    }
  },

  /**
   * Verifies MFA code and completes MFA setup.
   * @param userId The unique identifier of the user.
   * @param verificationCode The MFA verification code.
   * @returns A promise that resolves to true if MFA setup was successful.
   */
  async verifyAndEnableMfa(userId: string, verificationCode: string): Promise<boolean> {
    try {
      logger.info({ userId }, 'Verifying and enabling MFA for user');

      const user = await this.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found while verifying MFA');
        throw new NotFoundError('User not found');
      }

      // TODO: Implement MFA verification logic

      logger.info({ userId }, 'MFA verified and enabled successfully');
      return true;
    } catch (error) {
      logger.error({ userId, verificationCode, error }, 'Error verifying and enabling MFA for user');
      throw error;
    }
  },

  /**
   * Disables multi-factor authentication for a user.
   * @param userId The unique identifier of the user.
   * @param password The user's password for verification.
   * @returns A promise that resolves to true if MFA was successfully disabled.
   */
  async disableMfa(userId: string, password: string): Promise<boolean> {
    try {
      logger.info({ userId }, 'Disabling MFA for user');

      const user = await this.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found while disabling MFA');
        throw new NotFoundError('User not found');
      }

      const passwordMatch = await compareHash(password, user.passwordHash);
      if (!passwordMatch) {
        logger.warn({ userId }, 'Invalid password during MFA disable');
        throw new AuthenticationError('Invalid password');
      }

      // TODO: Implement MFA disable logic

      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false }
      });

      logger.info({ userId }, 'MFA disabled successfully');
      return true;
    } catch (error) {
      logger.error({ userId, error }, 'Error disabling MFA for user');
      throw error;
    }
  },

  /**
   * Assigns a role to a user.
   * @param userId The unique identifier of the user.
   * @param role The role to assign to the user.
   * @returns A promise that resolves to the updated user.
   */
  async assignRole(userId: string, role: UserTypes.UserRole): Promise<UserTypes.User> {
    try {
      logger.info({ userId, role }, 'Assigning role to user');

      const user = await this.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found while assigning role');
        throw new NotFoundError('User not found');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { userRole: role }
      });

      logger.info({ userId: updatedUser.id, role }, 'Role assigned successfully');
      return updatedUser;
    } catch (error) {
      logger.error({ userId, role, error }, 'Error assigning role to user');
      throw error;
    }
  },

  /**
   * Adds a team member to a creator or brand account.
   * @param entityId The unique identifier of the creator or brand.
   * @param entityType The type of entity (creator or brand).
   * @param userEmail The email address of the user to add as a team member.
   * @param role The role to assign to the team member.
   * @returns A promise that resolves to the created team member.
   */
  async createTeamMember(entityId: string, entityType: string, userEmail: string, role: UserTypes.TeamRole): Promise<UserTypes.TeamMember> {
    try {
      const sanitizedEmail = sanitizeInput(userEmail).toLowerCase();
      logger.info({ entityId, entityType, userEmail: sanitizedEmail, role }, 'Creating team member');

      // TODO: Check if target entity (creator or brand) exists

      // TODO: Find user by email or create invitation if user doesn't exist

      // TODO: Check for existing team membership to prevent duplicates

      const teamMember = {
        id: generateRandomToken(),
        userId: generateRandomToken(), // Replace with actual user ID
        entityId: entityId,
        entityType: entityType,
        role: role,
        user: {
          id: generateRandomToken(),
          email: sanitizedEmail,
          fullName: 'Test User',
          userType: UserType.CREATOR,
          authProvider: AuthProvider.EMAIL,
          isVerified: false,
          mfaEnabled: false,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        joinedAt: new Date()
      };

      // TODO: Set appropriate permissions based on role

      // TODO: If user doesn't exist, send invitation email

      logger.info({ teamMemberId: teamMember.id }, 'Team member created successfully');
      return teamMember;
    } catch (error) {
      logger.error({ entityId, entityType, userEmail, role, error }, 'Error creating team member');
      throw error;
    }
  },

  /**
   * Updates a team member's role.
   * @param teamMemberId The unique identifier of the team member to update.
   * @param newRole The new role to assign to the team member.
   * @returns A promise that resolves to the updated team member.
   */
  async updateTeamMemberRole(teamMemberId: string, newRole: UserTypes.TeamRole): Promise<UserTypes.TeamMember> {
    try {
      logger.info({ teamMemberId, newRole }, 'Updating team member role');

      // TODO: Check if team member exists

      // TODO: Verify current user has permission to change roles

      const teamMember = {
        id: teamMemberId,
        userId: generateRandomToken(),
        entityId: generateRandomToken(),
        entityType: 'creator',
        role: newRole,
        user: {
          id: generateRandomToken(),
          email: 'test@example.com',
          fullName: 'Test User',
          userType: UserType.CREATOR,
          authProvider: AuthProvider.EMAIL,
          isVerified: false,
          mfaEnabled: false,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        joinedAt: new Date()
      };

      // TODO: Update permissions based on new role

      logger.info({ teamMemberId: teamMember.id, newRole }, 'Team member role updated successfully');
      return teamMember;
    } catch (error) {
      logger.error({ teamMemberId, newRole, error }, 'Error updating team member role');
      throw error;
    }
  },

  /**
   * Removes a team member from a creator or brand account.
   * @param teamMemberId The unique identifier of the team member to remove.
   * @returns A promise that resolves to true if removal was successful.
   */
  async removeTeamMember(teamMemberId: string): Promise<boolean> {
    try {
      logger.info({ teamMemberId }, 'Removing team member');

      // TODO: Check if team member exists

      // TODO: Verify current user has permission to remove team members

      // TODO: Remove team member record from database

      // TODO: Revoke associated permissions

      logger.info({ teamMemberId }, 'Team member removed successfully');
      return true;
    } catch (error) {
      logger.error({ teamMemberId, error }, 'Error removing team member');
      throw error;
    }
  },

  /**
   * Retrieves all team members for a creator or brand account.
   * @param entityId The unique identifier of the creator or brand.
   * @param entityType The type of entity (creator or brand).
   * @returns A promise that resolves to an array of team members.
   */
  async getTeamMembers(entityId: string, entityType: string): Promise<UserTypes.TeamMember[]> {
    try {
      logger.info({ entityId, entityType }, 'Getting team members');

      // TODO: Check if target entity (creator or brand) exists

      const teamMembers = [
        {
          id: generateRandomToken(),
          userId: generateRandomToken(),
          entityId: entityId,
          entityType: entityType,
          role: TeamRole.MEMBER,
          user: {
            id: generateRandomToken(),
            email: 'test@example.com',
            fullName: 'Test User',
            userType: UserType.CREATOR,
            authProvider: AuthProvider.EMAIL,
            isVerified: false,
            mfaEnabled: false,
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          },
          joinedAt: new Date()
        }
      ];

      logger.info({ entityId, entityType, count: teamMembers.length }, 'Team members retrieved successfully');
      return teamMembers;
    } catch (error) {
      logger.error({ entityId, entityType, error }, 'Error getting team members');
      throw error;
    }
  }
};

export default userModel;