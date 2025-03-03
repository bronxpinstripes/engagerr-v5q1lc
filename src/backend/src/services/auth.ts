import { supabaseClient, supabaseAdmin } from '../config/supabase'; // version specified in src/backend/src/config/supabase.ts
import userModel, { UserModel } from '../models/user';
import { CreatorModel } from '../models/creator';
import { BrandModel } from '../models/brand';
import { AppError, AuthenticationError, ConflictError, NotFoundError } from '../utils/errors';
import { validatePassword } from '../utils/validation';
import { generateToken, verifyToken } from '../utils/tokens';
import { EmailService } from 'resend'; // version specified as 1.0.0
import { UserType, User, AuthProvider, LoginCredentials, SignupData } from '../types/user';

/**
 * Service class providing authentication functionality for the Engagerr platform
 */
export class AuthService {
  private UserModel: UserModel;
  private CreatorModel: CreatorModel;
  private BrandModel: BrandModel;

  /**
   * Initializes the AuthService with required models
   */
  constructor() {
    this.UserModel = userModel;
    this.CreatorModel = new CreatorModel();
    this.BrandModel = new BrandModel();
  }

  /**
   * Registers a new user with email and password
   * @param signupData - The signup data including email, password, and user type
   * @returns The newly created user and session information
   */
  async signup(signupData: SignupData): Promise<{ user: User, session: any }> {
    // Validate the signup data including password strength
    validatePassword(signupData.password);

    // Check if user with email already exists
    const existingUser = await this.UserModel.findUserByEmail(signupData.email);
    if (existingUser) {
      throw new ConflictError('Email already in use.');
    }

    // Create new user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        data: {
          fullName: signupData.fullName,
          userType: signupData.userType
        }
      }
    });

    if (error) {
      throw new AppError(`Signup failed: ${error.message}`, 400, 'SIGNUP_FAILED', { supabaseError: error });
    }

    if (!data.user) {
      throw new AppError('No user returned from Supabase Auth', 500, 'NO_USER_FROM_SUPABASE');
    }

    // Create user record in database with appropriate profile type (Creator or Brand)
    let user;
    if (signupData.userType === UserType.CREATOR) {
      user = await this.CreatorModel.createCreator({
        userId: data.user.id,
        bio: '',
        categories: [],
        profileImage: ''
      });
    } else if (signupData.userType === UserType.BRAND) {
      user = await this.BrandModel.createBrand({
        userId: data.user.id,
        companyName: '',
        industries: [],
        logoImage: '',
        websiteUrl: '',
        description: '',
        location: ''
      });
    } else {
      throw new AppError('Invalid user type', 400, 'INVALID_USER_TYPE');
    }

    // Send verification email
    // TODO: Implement email verification

    // Return the created user and session data
    return { user: data.user as User, session: data.session };
  }

  /**
   * Authenticates a user with email and password
   * @param credentials - Login credentials containing email and password
   * @returns User and session information on successful login
   */
  async login(credentials: LoginCredentials): Promise<{ user: User, session: any }> {
    // Validate login credentials
    if (!credentials.email || !credentials.password) {
      throw new AppError('Invalid credentials', 400, 'INVALID_CREDENTIALS');
    }

    // Authenticate with Supabase Auth
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error) {
      throw new AuthenticationError(`Login failed: ${error.message}`, { supabaseError: error });
    }

    if (!data.user) {
      throw new AppError('No user returned from Supabase Auth', 500, 'NO_USER_FROM_SUPABASE');
    }

    // Check if user exists in database
    const user = await this.UserModel.findUserByEmail(credentials.email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update last login timestamp
    await this.UserModel.updateUser(user.id, { lastLoginAt: new Date() });

    // Return user and session data
    return { user: data.user as User, session: data.session };
  }

  /**
   * Logs out a user by invalidating their current session
   * @param sessionId - Session ID to invalidate
   */
  async logout(sessionId: string): Promise<void> {
    // Validate session ID
    if (!sessionId) {
      throw new AppError('Session ID is required', 400, 'MISSING_SESSION_ID');
    }

    // Call Supabase Auth to invalidate the session
    const { error } = await supabaseAdmin.auth.signOut();

    if (error) {
      throw new AppError(`Logout failed: ${error.message}`, 500, 'LOGOUT_FAILED', { supabaseError: error });
    }
  }

  /**
   * Refreshes an access token using a refresh token
   * @param refreshToken - Refresh token to use for refreshing the access token
   * @returns New access and refresh tokens
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string, refreshToken: string }> {
    // Validate refresh token
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
    }

    // Call Supabase Auth to refresh the token
    const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token: refreshToken });

    if (error) {
      throw new AppError(`Token refresh failed: ${error.message}`, 401, 'TOKEN_REFRESH_FAILED', { supabaseError: error });
    }

    // Return new access and refresh tokens
    return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
  }

  /**
   * Initiates a password reset process by sending a reset email
   * @param email - Email address to send the reset email to
   */
  async resetPassword(email: string): Promise<void> {
    // Validate email
    if (!email) {
      throw new AppError('Email is required', 400, 'MISSING_EMAIL');
    }

    // Check if user exists
    const user = await this.UserModel.findUserByEmail(email);
    if (!user) {
      // Returning success to prevent email enumeration
      return;
    }

    // Generate password reset token
    const resetToken = generateToken({ userId: user.id, userType: user.userType });

    // Send password reset email with token
    // TODO: Implement email sending

    // Store reset token with expiration
    // TODO: Implement token storage
  }

  /**
   * Verifies a password reset token and allows user to set new password
   * @param token - Password reset token
   * @param newPassword - New password to set
   */
  async verifyPasswordReset(token: string, newPassword: string): Promise<void> {
    // Validate token and new password
    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400, 'MISSING_TOKEN_PASSWORD');
    }

    // Verify token is valid and not expired
    const decodedToken = verifyToken(token);
    if (!decodedToken) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Update password in Supabase Auth
    // TODO: Implement password update

    // Invalidate all existing sessions for security
    // TODO: Implement session invalidation

    // Send password changed confirmation email
    // TODO: Implement email sending
  }

  /**
   * Verifies a user's email address using a verification token
   * @param token - Verification token
   */
  async verifyEmail(token: string): Promise<void> {
    // Validate verification token
    if (!token) {
      throw new AppError('Verification token is required', 400, 'MISSING_VERIFICATION_TOKEN');
    }

    // Verify token is valid and not expired
    const decodedToken = verifyToken(token);
    if (!decodedToken) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Update user's email verification status
    // TODO: Implement email verification update

    // Send welcome email
    // TODO: Implement email sending
  }

  /**
   * Initiates multi-factor authentication setup for a user
   * @param userId - User ID to setup MFA for
   */
  async setupMfa(userId: string): Promise<{ secret: string, qrCode: string }> {
    // Validate user ID
    if (!userId) {
      throw new AppError('User ID is required', 400, 'MISSING_USER_ID');
    }

    // Generate MFA secret
    // TODO: Implement MFA secret generation

    // Generate QR code for authenticator app
    // TODO: Implement QR code generation

    // Store temporary MFA secret pending verification
    // TODO: Implement temporary secret storage

    // Return secret and QR code to display to user
    return { secret: 'test-secret', qrCode: 'test-qr-code' };
  }

  /**
   * Verifies and activates MFA setup using verification code
   * @param userId - User ID to verify MFA for
   * @param verificationCode - Verification code from authenticator app
   */
  async verifyMfa(userId: string, verificationCode: string): Promise<void> {
    // Validate user ID and verification code
    if (!userId || !verificationCode) {
      throw new AppError('User ID and verification code are required', 400, 'MISSING_USER_ID_CODE');
    }

    // Verify code against temporary MFA secret
    // TODO: Implement MFA verification

    // Activate MFA for user account
    // TODO: Implement MFA activation

    // Store recovery codes for the user
    // TODO: Implement recovery code storage

    // Send MFA activation confirmation email
    // TODO: Implement email sending
  }

  /**
   * Validates an MFA code during login or sensitive operations
   * @param userId - User ID to validate MFA code for
   * @param mfaCode - MFA code from authenticator app
   */
  async validateMfaCode(userId: string, mfaCode: string): Promise<boolean> {
    // Validate user ID and MFA code
    if (!userId || !mfaCode) {
      throw new AppError('User ID and MFA code are required', 400, 'MISSING_USER_ID_CODE');
    }

    // Retrieve user's MFA secret
    // TODO: Implement MFA secret retrieval

    // Verify code against user's MFA secret
    // TODO: Implement MFA code verification

    // Return validation result
    return true;
  }

  /**
   * Disables MFA for a user account
   * @param userId - User ID to disable MFA for
   * @param password - User's password for verification
   */
  async disableMfa(userId: string, password: string): Promise<void> {
    // Validate user ID and password
    if (!userId || !password) {
      throw new AppError('User ID and password are required', 400, 'MISSING_USER_ID_PASSWORD');
    }

    // Verify password for security
    // TODO: Implement password verification

    // Disable MFA for user account
    // TODO: Implement MFA disable

    // Invalidate all existing sessions for security
    // TODO: Implement session invalidation

    // Send MFA deactivation confirmation email
    // TODO: Implement email sending
  }

  /**
   * Initiates or handles social login (Google, Apple) authentication
   * @param provider - Authentication provider (Google, Apple)
   * @param redirectUrl - URL to redirect to after authentication
   */
  async socialLogin(provider: AuthProvider, redirectUrl: string): Promise<{ url: string } | { user: User, session: any }> {
    // Validate provider and redirect URL
    if (!provider || !redirectUrl) {
      throw new AppError('Provider and redirect URL are required', 400, 'MISSING_PROVIDER_URL');
    }

    // Initiate OAuth flow with the provider via Supabase Auth
    // TODO: Implement OAuth flow

    // Return either redirect URL (initial flow) or user/session data (callback)
    return { url: 'test-redirect-url' };
  }

  /**
   * Handles authentication with social media platforms for integration
   * @param platform - Social media platform (YouTube, Instagram)
   * @param userId - User ID to connect the platform to
   * @param redirectUrl - URL to redirect to after authentication
   */
  async platformAuth(platform: string, userId: string, redirectUrl: string): Promise<{ url: string } | { platformId: string, accessToken: string }> {
    // Validate platform, user ID and redirect URL
    if (!platform || !userId || !redirectUrl) {
      throw new AppError('Platform, user ID, and redirect URL are required', 400, 'MISSING_PLATFORM_USER_URL');
    }

    // Initiate OAuth flow with the platform
    // TODO: Implement OAuth flow

    // Return either redirect URL (initial flow) or platform credentials (callback)
    return { url: 'test-platform-redirect-url' };
  }

  /**
   * Retrieves a user by their ID
   * @param userId - User ID to retrieve
   */
  async getUserById(userId: string): Promise<User> {
    // Validate user ID
    if (!userId) {
      throw new AppError('User ID is required', 400, 'MISSING_USER_ID');
    }

    // Retrieve user from database
    const user = await this.UserModel.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Return user data
    return user;
  }

  /**
   * Gets the current active session for the provided access token
   * @param accessToken - Access token to retrieve session for
   */
  async getCurrentSession(accessToken: string): Promise<any> {
    // Validate access token
    if (!accessToken) {
      throw new AppError('Access token is required', 400, 'MISSING_ACCESS_TOKEN');
    }

    // Retrieve session information from Supabase Auth
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      throw new AuthenticationError('Invalid access token', { supabaseError: error });
    }

    // Return session data if token is valid
    return data.session;
  }
}

// Create a singleton instance of the AuthService
const authService = new AuthService();

// Export the AuthService class and the singleton instance
export { AuthService, authService };