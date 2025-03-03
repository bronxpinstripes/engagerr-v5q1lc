import { Request, Response, NextFunction } from 'express'; // version specified: ^4.18.2
import { AuthService } from '../services/auth'; // Authentication business logic
import { UserType } from '../types/user'; // Enum for user types (Creator/Brand)
import { ApiError } from '../utils/errors'; // Custom error class for API errors
import { validate } from '../utils/validation'; // Utility for validating request data
import { LoginSchema, RegisterSchema, VerifyEmailSchema, ResetPasswordRequestSchema, ResetPasswordSchema } from '../types/api'; // Validation schemas
import { logger } from '../utils/logger'; // Logging utility

/**
 * Authentication controllers for handling user authentication operations including login, registration, verification, and password management using Supabase Auth
 */

/**
 * Handles user login authentication with email/password
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends authentication tokens and user data or error response
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body against LoginSchema
    const validatedData = await validate(req.body, LoginSchema);

    // Extract email and password from request
    const { email, password } = validatedData;

    // Call AuthService.login with credentials
    const authService = new AuthService();
    const { user, session } = await authService.login({ email, password });

    // Set HTTP-only cookies for JWT and refresh token
    res.cookie('access_token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
    });

    res.cookie('refresh_token', session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Return success response with user data and tokens
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
        },
      },
    });

    // Log successful login event
    logger.info({ message: 'User logged in successfully', userId: user.id, email: user.email });
  } catch (error) {
    // Catch and forward any errors to error handling middleware
    next(error);
  }
};

/**
 * Registers a new user account (creator or brand)
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends registration confirmation or error response
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body against RegisterSchema
    const validatedData = await validate(req.body, RegisterSchema);

    // Extract user registration data including email, password, name, and user_type
    const { email, password, fullName, userType } = validatedData;

    // Call AuthService.register with user data
    const authService = new AuthService();
    await authService.signup({ email, password, fullName, userType });

    // Return success response with registration confirmation
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
    });

    // Log successful registration event
    logger.info({ message: 'User registered successfully', email, userType });
  } catch (error) {
    // Catch and forward any errors to error handling middleware
    next(error);
  }
};

/**
 * Verifies a user's email with the token sent after registration
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends verification confirmation or error response
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request params against VerifyEmailSchema
    const validatedData = await validate(req.params, VerifyEmailSchema);

    // Extract token from request
    const { token } = validatedData;

    // Call AuthService.verifyEmail with token
    const authService = new AuthService();
    await authService.verifyEmail(token);

    // Return success response with verification confirmation
    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });

    // Log successful email verification
    logger.info({ message: 'Email verified successfully', token });
  } catch (error) {
    // Catch and forward any errors to error handling middleware
    next(error);
  }
};

/**
 * Initiates password reset process by sending email with reset instructions
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends confirmation that reset email was sent or error response
 */
export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body against ResetPasswordRequestSchema
    const validatedData = await validate(req.body, ResetPasswordRequestSchema);

    // Extract email from request
    const { email } = validatedData;

    // Call AuthService.requestPasswordReset with email
    const authService = new AuthService();
    await authService.resetPassword(email);

    // Return success response (even if email doesn't exist for security)
    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully. Please check your inbox.',
    });

    // Log password reset request (without exposing whether email exists)
    logger.info({ message: 'Password reset requested', email });
  } catch (error) {
    // Catch and forward any errors to error handling middleware
    next(error);
  }
};

/**
 * Completes password reset process with token and new password
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends password reset confirmation or error response
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body against ResetPasswordSchema
    const validatedData = await validate(req.body, ResetPasswordSchema);

    // Extract token and new password from request
    const { token, newPassword } = validatedData;

    // Call AuthService.resetPassword with token and new password
    const authService = new AuthService();
    await authService.verifyPasswordReset(token, newPassword);

    // Return success response with reset confirmation
    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });

    // Log successful password reset
    logger.info({ message: 'Password reset successfully', token });
  } catch (error) {
    // Catch and forward any errors to error handling middleware
    next(error);
  }
};

/**
 * Handles OAuth authentication callback from providers (Google, Apple, etc.)
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Redirects with authentication tokens or to error page
 */
export const oauthCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract provider and authorization code from request
    const { provider, code } = req.query;

    if (!provider || typeof provider !== 'string' || !code || typeof code !== 'string') {
      throw new ApiError('Invalid OAuth parameters', 400, 'INVALID_OAUTH_PARAMS');
    }

    // Call AuthService.oauthCallback with provider and code
    const authService = new AuthService();
    const { url, user, session } = await authService.socialLogin(provider, code);

    if (url) {
      // Redirect to appropriate frontend URL with success
      res.redirect(url);
    } else if (user && session) {
      // Set HTTP-only cookies for JWT and refresh token
      res.cookie('access_token', session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 4 * 60 * 60 * 1000, // 4 hours
      });

      res.cookie('refresh_token', session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Redirect to success page
      res.redirect('/oauth/success');
    } else {
      // Handle unexpected response
      throw new ApiError('Unexpected OAuth response', 500, 'UNEXPECTED_OAUTH_RESPONSE');
    }

    // Log successful OAuth authentication
    logger.info({ message: 'OAuth authentication successful', provider });
  } catch (error) {
    // Catch errors and redirect to error page with appropriate message
    logger.error({ message: 'OAuth authentication failed', error });
    const errorMessage = encodeURIComponent((error as any).message || 'OAuth authentication failed');
    res.redirect(`/oauth/error?message=${errorMessage}`);
  }
};

/**
 * Logs out current user by invalidating tokens
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends logout confirmation or error response
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract refresh token from cookies or authentication header
    const refreshToken = req.cookies.refresh_token || req.headers.authorization?.split(' ')[1];

    if (!refreshToken) {
      throw new ApiError('Refresh token is missing', 400, 'MISSING_REFRESH_TOKEN');
    }

    // Call AuthService.logout with refresh token
    const authService = new AuthService();
    await authService.logout(refreshToken);

    // Clear authentication cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    // Return success response with logout confirmation
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });

    // Log logout event
    logger.info({ message: 'Logout successful' });
  } catch (error) {
    // Catch and forward any errors to error handling middleware
    next(error);
  }
};

/**
 * Refreshes authentication tokens with a valid refresh token
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends new authentication tokens or error response
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract refresh token from cookies or authentication header
    const refreshToken = req.cookies.refresh_token || req.headers.authorization?.split(' ')[1];

    if (!refreshToken) {
      throw new ApiError('Refresh token is missing', 400, 'MISSING_REFRESH_TOKEN');
    }

    // Call AuthService.refreshToken with refresh token
    const authService = new AuthService();
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(refreshToken);

    // Set new HTTP-only cookies for refreshed JWT and refresh token
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Return success response with new tokens
    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });

    // Log token refresh event
    logger.info({ message: 'Token refreshed successfully' });
  } catch (error) {
    // Catch and forward any errors to error handling middleware
    next(error);
  }
};

/**
 * Retrieves current authenticated user information
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 * @returns Sends current user data or error response
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract user ID from authenticated request context
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError('User ID is missing from request context', 401, 'MISSING_USER_ID');
    }

    // Call AuthService.getCurrentUser with user ID
    const authService = new AuthService();
    const user = await authService.getUserById(userId);

    // Return success response with detailed user data including profile type (creator/brand)
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
      },
    });

    // Log successful retrieval of user data
    logger.info({ message: 'User data retrieved successfully', userId });
  } catch (error) {
    // Catch and forward any errors to error handling middleware
    next(error);
  }
};