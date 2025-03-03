import express from 'express'; // version: ^4.17.1
import { authenticate, optionalAuth } from '../middlewares/auth';
import { authController } from '../controllers/auth';
import { validateRequest } from '../utils/validation';
import { loginSchema, registerSchema, emailSchema, passwordSchema } from '../utils/validation';
import { rateLimit } from '../middlewares/rateLimit';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Configures and returns the Express router with all authentication routes
 */
function configureAuthRoutes(): express.Router {
  // Create a new Express Router instance
  const router = express.Router();

  // Define POST /login route with login schema validation and rate limiting
  router.post('/login', rateLimit('AUTH'), validateRequest('body', loginSchema), authController.login);

  // Define POST /register route with registration schema validation and rate limiting
  router.post('/register', rateLimit('AUTH'), validateRequest('body', registerSchema), authController.register);

  // Define GET /verify-email route for email verification
  router.get('/verify-email/:token', validateRequest('params', emailSchema), authController.verifyEmail);

  // Define POST /forgot-password route for password reset requests
  router.post('/forgot-password', rateLimit('AUTH'), validateRequest('body', emailSchema), authController.requestPasswordReset);

  // Define POST /reset-password route for password reset confirmation
  router.post('/reset-password', rateLimit('AUTH'), validateRequest('body', passwordSchema), authController.resetPassword);

  // Define GET /oauth/callback/:provider route for OAuth authentication callbacks
  router.get('/oauth/callback/:provider', authController.oauthCallback);

  // Define POST /logout route with authentication middleware
  router.post('/logout', authenticate, authController.logout);

  // Define POST /refresh-token route for token refresh
  router.post('/refresh-token', authController.refreshToken);

  // Define GET /me route with authentication middleware to get current user
  router.get('/me', authenticate, authController.getCurrentUser);

  // Return the configured router
  return router;
}

// Export the configured router
export default configureAuthRoutes();