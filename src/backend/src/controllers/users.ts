/**
 * Controller functions for user-related operations in the Engagerr platform, handling user profile management, team collaboration, role management, and security settings.
 * Provides the interface between Express routes and user service business logic.
 */

import { Request, Response, NextFunction } from 'express'; // version: ^4.18.2
import userService from '../services/user';
import { UserTypes } from '../types/user';
import logger from '../utils/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '../utils/errors';

/**
 * Retrieves the currently authenticated user's information
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with user data or error
 */
export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user ID from the authenticated request
    const userId = req.user.id;

    // Call userService.getUserById to get user details
    const user = await userService.getUserById(userId);

    // Return 200 response with user object
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    // Handle errors with appropriate error responses
    next(error);
  }
}

/**
 * Retrieves a user by their ID
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with user data or error
 */
export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user ID from request parameters
    const userId = req.params.userId;

    // Call userService.getUserById to get user details
    const user = await userService.getUserById(userId);

    // Return 200 response with user object
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    // Handle errors with appropriate error responses
    next(error);
  }
}

/**
 * Updates a user's profile information
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with updated profile or error
 */
export async function updateUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user ID from authenticated request and profile data from request body
    const userId = req.user.id;
    const profileData = req.body;

    // Validate profile data format and content
    // TODO: Implement validation schema for profile data

    // Call userService.updateUserProfile with user ID and profile data
    const updatedProfile = await userService.updateUserProfile(userId, profileData);

    // Return 200 response with updated profile
    res.status(200).json({ success: true, data: updatedProfile });
  } catch (error) {
    // Handle validation and service errors with appropriate responses
    next(error);
  }
}

/**
 * Uploads and processes a user's profile image
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with image URL or error
 */
export async function uploadProfileImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user ID from authenticated request and image file from request
    const userId = req.user.id;

    // Validate file is an acceptable image format and size
    if (!req.file) {
      throw new ValidationError('No image file provided', {});
    }

    // Call userService.uploadProfileImage with user ID and image data
    const imageUrl = await userService.uploadProfileImage(userId, req.file.buffer, req.file.originalname);

    // Return 200 response with image URL
    res.status(200).json({ success: true, data: { imageUrl } });
  } catch (error) {
    // Handle validation and service errors with appropriate responses
    next(error);
  }
}

/**
 * Deletes a user account
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with success or error
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract target user ID from request parameters and requesting user ID from authenticated request
    const targetUserId = req.params.userId;
    const requestingUserId = req.user.id;

    // Call userService.deleteUser with both IDs to verify permissions and perform deletion
    const success = await userService.deleteUser(targetUserId, requestingUserId);

    // Return 200 response with success message
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    // Handle permission errors and service errors with appropriate responses
    next(error);
  }
}

/**
 * Retrieves roles assigned to a user
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with roles or error
 */
export async function getUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user ID from request parameters
    const userId = req.params.userId;

    // Call userService.getUserRoles to get assigned roles
    const roles = await userService.getUserRoles(userId);

    // Return 200 response with roles array
    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    // Handle errors with appropriate error responses
    next(error);
  }
}

/**
 * Assigns a role to a user
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with updated user or error
 */
export async function assignRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract target user ID from request parameters, role from request body, and requesting user ID from authenticated request
    const targetUserId = req.params.userId;
    const role = req.body.role as UserTypes.UserRole;
    const requestingUserId = req.user.id;

    // Validate role is a valid UserRole enum value
    if (!Object.values(UserTypes.UserRole).includes(role)) {
      throw new ValidationError('Invalid role provided', {});
    }

    // Call userService.assignRole with parameters to verify permissions and assign role
    const updatedUser = await userService.assignRole(targetUserId, role, requestingUserId);

    // Return 200 response with updated user object
    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    // Handle permission errors and service errors with appropriate responses
    next(error);
  }
}

/**
 * Removes a role from a user
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with updated user or error
 */
export async function removeRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract target user ID from request parameters, role from request body, and requesting user ID from authenticated request
    const targetUserId = req.params.userId;
    const role = req.body.role as UserTypes.UserRole;
    const requestingUserId = req.user.id;

    // Validate role is a valid UserRole enum value
    if (!Object.values(UserTypes.UserRole).includes(role)) {
      throw new ValidationError('Invalid role provided', {});
    }

    // Call userService.removeRole with parameters to verify permissions and remove role
    const updatedUser = await userService.removeRole(targetUserId, role, requestingUserId);

    // Return 200 response with updated user object
    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    // Handle permission errors and service errors with appropriate responses
    next(error);
  }
}

/**
 * Retrieves team members for an entity (creator or brand)
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with team members or error
 */
export async function getTeamMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract entity ID and entity type from request parameters
    const entityId = req.params.entityId;
    const entityType = req.params.entityType;

    // Call userService.getTeamMembers with entity information
    const teamMembers = await userService.getTeamMembers(entityId, entityType);

    // Return 200 response with team members array
    res.status(200).json({ success: true, data: teamMembers });
  } catch (error) {
    // Handle errors with appropriate error responses
    next(error);
  }
}

/**
 * Adds a team member to an entity
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with team member or invitation details or error
 */
export async function addTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract entity ID and entity type from request parameters
    const entityId = req.params.entityId;
    const entityType = req.params.entityType;

    // Extract email and role from request body
    const email = req.body.email;
    const role = req.body.role as UserTypes.TeamRole;

    // Extract requesting user ID from authenticated request
    const requestingUserId = req.user.id;

    // Validate email format and role is a valid TeamRole
    if (!email) {
      throw new ValidationError('Email is required', {});
    }
    if (!Object.values(UserTypes.TeamRole).includes(role)) {
      throw new ValidationError('Invalid role provided', {});
    }

    // Call userService.addTeamMember with all parameters
    const teamMember = await userService.addTeamMember(entityId, entityType, email, role, requestingUserId);

    // Return 200 response with team member object or invitation details
    res.status(200).json({ success: true, data: teamMember });
  } catch (error) {
    // Handle validation, permission, and service errors with appropriate responses
    next(error);
  }
}

/**
 * Updates a team member's role
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with updated team member or error
 */
export async function updateTeamMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract team member ID from request parameters
    const teamMemberId = req.params.teamMemberId;

    // Extract new role from request body
    const newRole = req.body.role as UserTypes.TeamRole;

    // Extract requesting user ID from authenticated request
    const requestingUserId = req.user.id;

    // Validate role is a valid TeamRole
    if (!Object.values(UserTypes.TeamRole).includes(newRole)) {
      throw new ValidationError('Invalid role provided', {});
    }

    // Call userService.updateTeamMemberRole with parameters
    const updatedTeamMember = await userService.updateTeamMemberRole(teamMemberId, newRole, requestingUserId);

    // Return 200 response with updated team member
    res.status(200).json({ success: true, data: updatedTeamMember });
  } catch (error) {
    // Handle validation, permission, and service errors with appropriate responses
    next(error);
  }
}

/**
 * Removes a team member from an entity
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with success or error
 */
export async function removeTeamMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract team member ID from request parameters
    const teamMemberId = req.params.teamMemberId;

    // Extract requesting user ID from authenticated request
    const requestingUserId = req.user.id;

    // Call userService.removeTeamMember with parameters
    const success = await userService.removeTeamMember(teamMemberId, requestingUserId);

    // Return 200 response with success message
    res.status(200).json({ success: true, message: 'Team member removed successfully' });
  } catch (error) {
    // Handle permission and service errors with appropriate responses
    next(error);
  }
}

/**
 * Creates and sends a team invitation
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with invitation details or error
 */
export async function createTeamInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract entity ID and entity type from request parameters
    const entityId = req.params.entityId;
    const entityType = req.params.entityType;

    // Extract email and role from request body
    const email = req.body.email;
    const role = req.body.role as UserTypes.TeamRole;

    // Extract requesting user ID from authenticated request
    const requestingUserId = req.user.id;

    // Validate email format and role is a valid TeamRole
    if (!email) {
      throw new ValidationError('Email is required', {});
    }
    if (!Object.values(UserTypes.TeamRole).includes(role)) {
      throw new ValidationError('Invalid role provided', {});
    }

    // Call userService.createTeamInvite with parameters
    const invitation = await userService.createTeamInvite(entityId, entityType, email, role, requestingUserId);

    // Return 200 response with invitation details
    res.status(200).json({ success: true, data: invitation });
  } catch (error) {
    // Handle validation, permission, and service errors with appropriate responses
    next(error);
  }
}

/**
 * Accepts a team invitation
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with team member details or error
 */
export async function acceptTeamInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract invitation token from request parameters
    const token = req.params.token;

    // Extract user ID from authenticated request
    const userId = req.user.id;

    // Call userService.acceptTeamInvite with token and user ID
    const teamMember = await userService.acceptTeamInvite(token, userId);

    // Return 200 response with team member details
    res.status(200).json({ success: true, data: teamMember });
  } catch (error) {
    // Handle validation and service errors with appropriate responses
    next(error);
  }
}

/**
 * Initiates multi-factor authentication setup
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with MFA setup details or error
 */
export async function setupMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user ID from authenticated request
    const userId = req.user.id;

    // Call userService.setupMfa with user ID
    const mfaSetup = await userService.setupMfa(userId);

    // Return 200 response with MFA secret and QR code URL
    res.status(200).json({ success: true, data: mfaSetup });
  } catch (error) {
    // Handle service errors with appropriate responses
    next(error);
  }
}

/**
 * Verifies and activates MFA setup
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with success or error
 */
export async function verifyMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user ID from authenticated request
    const userId = req.user.id;

    // Extract verification code from request body
    const verificationCode = req.body.code;

    // Validate verification code format
    if (!verificationCode) {
      throw new ValidationError('Verification code is required', {});
    }

    // Call userService.verifyMfa with user ID and verification code
    const success = await userService.verifyMfa(userId, verificationCode);

    // Return 200 response with success message
    res.status(200).json({ success: true, message: 'MFA verified and enabled successfully' });
  } catch (error) {
    // Handle validation and service errors with appropriate responses
    next(error);
  }
}

/**
 * Disables multi-factor authentication
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns Response with success or error
 */
export async function disableMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract user ID from authenticated request
    const userId = req.user.id;

    // Extract password from request body
    const password = req.body.password;

    // Validate password is provided
    if (!password) {
      throw new ValidationError('Password is required', {});
    }

    // Call userService.disableMfa with user ID and password
    const success = await userService.disableMfa(userId, password);

    // Return 200 response with success message
    res.status(200).json({ success: true, message: 'MFA disabled successfully' });
  } catch (error) {
    // Handle validation and service errors with appropriate responses
    next(error);
  }
}

/**
 * Export all user controller functions as default export
 */
export default {
  getCurrentUser,
  getUserById,
  updateUserProfile,
  uploadProfileImage,
  deleteUser,
  getUserRoles,
  assignRole,
  removeRole,
  getTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  createTeamInvite,
  acceptTeamInvite,
  setupMfa,
  verifyMfa,
  disableMfa
};