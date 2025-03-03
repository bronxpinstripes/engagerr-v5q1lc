import express from 'express'; // version: ^4.18.2
import multer from 'multer'; // version: ^1.4.5-lts.1
import userController from '../controllers/users';
import { authenticate, requireRole, requirePermission } from '../middlewares/auth';
import { validateBody, validateParams } from '../middlewares/validation';
import { UserTypes } from '../types/user';
import { schemas } from '../utils/validation';

// Create a new Express router instance
const router = express.Router();

// Configure multer middleware for file uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Creates and configures Express router with user-related API routes
 */
export function createUserRoutes(): express.Router {
  // Route to get the currently authenticated user's information
  router.get('/me', authenticate, userController.getCurrentUser);

  // Route to get a user by their ID
  router.get('/:userId', authenticate, validateParams(schemas.userSchema()), userController.getUserById);

  // Route to update a user's profile information
  router.put('/me', authenticate, validateBody(schemas.userSchema()), userController.updateUserProfile);

  // Route to upload a user's profile image
  router.post('/me/image', authenticate, upload.single('image'), userController.uploadProfileImage);

  // Route to delete a user account
  router.delete('/:userId', authenticate, validateParams(schemas.userSchema()), userController.deleteUser);

  // Route to get roles assigned to a user
  router.get('/:userId/roles', authenticate, requirePermission('view', 'user'), validateParams(schemas.userSchema()), userController.getUserRoles);

  // Route to assign a role to a user
  router.post('/:userId/roles', authenticate, requirePermission('edit', 'user'), validateParams(schemas.userSchema()), validateBody(schemas.userSchema()), userController.assignRole);

  // Route to remove a role from a user
  router.delete('/:userId/roles', authenticate, requirePermission('edit', 'user'), validateParams(schemas.userSchema()), validateBody(schemas.userSchema()), userController.removeRole);

  // Route to get team members for an entity (creator or brand)
  router.get('/:entityType/:entityId/team', authenticate, userController.getTeamMembers);

  // Route to add a team member to an entity
  router.post('/:entityType/:entityId/team', authenticate, validateBody(schemas.userSchema()), userController.addTeamMember);

  // Route to update a team member's role
  router.put('/team/:teamMemberId', authenticate, validateBody(schemas.userSchema()), userController.updateTeamMemberRole);

  // Route to remove a team member from an entity
  router.delete('/team/:teamMemberId', authenticate, userController.removeTeamMember);

  // Route to create a team invite
  router.post('/:entityType/:entityId/invite', authenticate, validateBody(schemas.userSchema()), userController.createTeamInvite);

  // Route to accept a team invite
  router.post('/invite/:token/accept', authenticate, userController.acceptTeamInvite);

  // Route to setup multi-factor authentication
  router.post('/mfa/setup', authenticate, userController.setupMfa);

  // Route to verify multi-factor authentication
  router.post('/mfa/verify', authenticate, validateBody(schemas.userSchema()), userController.verifyMfa);

  // Route to disable multi-factor authentication
  router.post('/mfa/disable', authenticate, validateBody(schemas.userSchema()), userController.disableMfa);

  // Return the configured router
  return router;
}

// Export configured user routes for use in the main router
export default createUserRoutes();