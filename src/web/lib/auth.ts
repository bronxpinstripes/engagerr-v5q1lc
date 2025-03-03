import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // v0.8.0
import { SupabaseClient, User as SupabaseUser, AuthError, Provider } from "@supabase/supabase-js"; // v2.38.0
import { redirect } from "next/navigation"; // v14.0.0

import { User, UserType, UserRole, Permission } from "../types/user";
import { 
  LoginCredentials, 
  RegisterCredentials, 
  AuthResponse, 
  Session, 
  OAuthProvider, 
  MFAType, 
  MFASetupResponse, 
  MFAVerificationCredentials, 
  ResetPasswordCredentials, 
  UpdatePasswordCredentials,
  AuthState
} from "../types/auth";
import { API_ROUTES, USER_TYPES, AUTH_PROVIDERS, ROUTES } from "./constants";
import { toastSuccess, toastError } from "./toast";

/**
 * Default authentication state used for initialization
 */
export const DEFAULT_AUTH_STATE: AuthState = {
  user: null,
  session: null,
  isLoading: false,
  isAuthenticated: false,
  mfaEnabled: false,
  mfaVerified: false
};

/**
 * Authenticates a user with email and password
 * @param credentials Login credentials containing email and password
 * @returns Authentication response with user data or error
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const supabase = createClientComponentClient();
  const { email, password } = credentials;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      toastError("Login failed", error.message);
      return { user: null, session: null, error };
    }
    
    if (data.user) {
      const user = transformSupabaseUser(data.user);
      const session = data.session ? {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at || 0).getTime(),
        user
      } : null;
      
      toastSuccess("Login successful", "Welcome back!");
      return { user, session, error: null };
    }
    
    return { user: null, session: null, error: new Error("Login failed") };
  } catch (error) {
    const authError = error as AuthError;
    toastError("Login failed", authError.message || "An unexpected error occurred");
    return { user: null, session: null, error: authError };
  }
}

/**
 * Registers a new user with email, password and user type
 * @param credentials Registration credentials
 * @returns Authentication response with user data or error
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const supabase = createClientComponentClient();
  const { email, password, fullName, userType } = credentials;
  
  try {
    // Register the user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Store user type and full name in metadata
        data: {
          full_name: fullName,
          user_type: userType
        }
      }
    });
    
    if (error) {
      toastError("Registration failed", error.message);
      return { user: null, session: null, error };
    }
    
    if (data.user) {
      const user = transformSupabaseUser(data.user);
      const session = data.session ? {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at || 0).getTime(),
        user
      } : null;
      
      toastSuccess("Registration successful", "Your account has been created!");
      return { user, session, error: null };
    }
    
    return { user: null, session: null, error: new Error("Registration failed") };
  } catch (error) {
    const authError = error as AuthError;
    toastError("Registration failed", authError.message || "An unexpected error occurred");
    return { user: null, session: null, error: authError };
  }
}

/**
 * Signs out the current user and clears session
 */
export async function logout(): Promise<void> {
  const supabase = createClientComponentClient();
  
  try {
    await supabase.auth.signOut();
    toastSuccess("Logged out", "You have been successfully logged out");
  } catch (error) {
    const authError = error as AuthError;
    toastError("Logout failed", authError.message || "An unexpected error occurred");
  }
}

/**
 * Initiates OAuth authentication with specified provider
 * @param provider OAuth provider to authenticate with
 */
export async function oauthLogin(provider: OAuthProvider): Promise<void> {
  const supabase = createClientComponentClient();
  
  // Map OAuthProvider enum to Supabase provider
  let supabaseProvider: Provider;
  switch (provider) {
    case OAuthProvider.GOOGLE:
      supabaseProvider = 'google';
      break;
    case OAuthProvider.APPLE:
      supabaseProvider = 'apple';
      break;
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
  
  try {
    // Get the current URL for redirects
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback` 
      : undefined;
    
    await supabase.auth.signInWithOAuth({
      provider: supabaseProvider,
      options: {
        redirectTo,
        scopes: 'email profile',
      }
    });
  } catch (error) {
    const authError = error as AuthError;
    toastError("OAuth login failed", authError.message || "An unexpected error occurred");
  }
}

/**
 * Handles the callback from OAuth providers after authentication
 * @returns Authentication response with user data or error
 */
export async function handleOAuthCallback(): Promise<AuthResponse> {
  const supabase = createClientComponentClient();
  
  try {
    // Get session from URL (handled by Supabase Auth Helpers)
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      toastError("Authentication failed", error.message);
      return { user: null, session: null, error };
    }
    
    if (data.session && data.session.user) {
      const user = transformSupabaseUser(data.session.user);
      const session = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at || 0).getTime(),
        user
      };
      
      toastSuccess("Authentication successful", "Welcome to Engagerr!");
      return { user, session, error: null };
    }
    
    return { user: null, session: null, error: new Error("Authentication failed") };
  } catch (error) {
    const authError = error as AuthError;
    toastError("Authentication failed", authError.message || "An unexpected error occurred");
    return { user: null, session: null, error: authError };
  }
}

/**
 * Sends a password reset email to the user
 * @param credentials Object containing user's email
 * @returns Authentication response with success or error
 */
export async function resetPassword(credentials: ResetPasswordCredentials): Promise<AuthResponse> {
  const supabase = createClientComponentClient();
  const { email } = credentials;
  
  try {
    // Get the current URL for redirects
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/reset-password/confirm` 
      : undefined;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    
    if (error) {
      toastError("Password reset failed", error.message);
      return { user: null, session: null, error };
    }
    
    toastSuccess(
      "Password reset email sent", 
      "Check your inbox for instructions to reset your password"
    );
    return { user: null, session: null, error: null };
  } catch (error) {
    const authError = error as AuthError;
    toastError("Password reset failed", authError.message || "An unexpected error occurred");
    return { user: null, session: null, error: authError };
  }
}

/**
 * Updates the user's password
 * @param credentials Object containing new password and reset token
 * @returns Authentication response with success or error
 */
export async function updatePassword(credentials: UpdatePasswordCredentials): Promise<AuthResponse> {
  const supabase = createClientComponentClient();
  const { password, token } = credentials;
  
  try {
    // If token is provided, we're in the reset flow
    if (token) {
      // Note: This is handled by Supabase Auth Helpers automatically
      // through the redirect URL and query parameters
    }
    
    // Update the password
    const { data, error } = await supabase.auth.updateUser({
      password
    });
    
    if (error) {
      toastError("Password update failed", error.message);
      return { user: null, session: null, error };
    }
    
    if (data.user) {
      const user = transformSupabaseUser(data.user);
      
      toastSuccess(
        "Password updated", 
        "Your password has been successfully updated"
      );
      return { user, session: null, error: null };
    }
    
    return { user: null, session: null, error: new Error("Password update failed") };
  } catch (error) {
    const authError = error as AuthError;
    toastError("Password update failed", authError.message || "An unexpected error occurred");
    return { user: null, session: null, error: authError };
  }
}

/**
 * Gets the current authenticated user
 * @returns Current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClientComponentClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    return transformSupabaseUser(user);
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Gets the current authentication session
 * @returns Current session or null if not authenticated
 */
export async function getCurrentSession(): Promise<Session | null> {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) return null;
    
    const user = transformSupabaseUser(data.session.user);
    
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: new Date(data.session.expires_at || 0).getTime(),
      user
    };
  } catch (error) {
    console.error("Error getting current session:", error);
    return null;
  }
}

/**
 * Refreshes the current authentication session
 * @returns Refreshed session or null if unsuccessful
 */
export async function refreshSession(): Promise<Session | null> {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) return null;
    
    const user = transformSupabaseUser(data.session.user);
    
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: new Date(data.session.expires_at || 0).getTime(),
      user
    };
  } catch (error) {
    console.error("Error refreshing session:", error);
    return null;
  }
}

/**
 * Initiates the setup process for multi-factor authentication
 * @param type MFA type to set up
 * @returns MFA setup data or null on error
 */
export async function setupMFA(type: MFAType): Promise<MFASetupResponse | null> {
  const supabase = createClientComponentClient();
  
  try {
    // Currently Supabase only supports TOTP
    if (type !== MFAType.TOTP && type !== MFAType.APP) {
      toastError("MFA setup failed", "Unsupported MFA type");
      return null;
    }
    
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp'
    });
    
    if (error) {
      toastError("MFA setup failed", error.message);
      return null;
    }
    
    return {
      secret: data.totp.secret,
      qrCode: data.totp.uri
    };
  } catch (error) {
    const authError = error as AuthError;
    toastError("MFA setup failed", authError.message || "An unexpected error occurred");
    return null;
  }
}

/**
 * Verifies a multi-factor authentication code
 * @param credentials Object containing verification code
 * @returns Authentication response with success or error
 */
export async function verifyMFA(credentials: MFAVerificationCredentials): Promise<AuthResponse> {
  const supabase = createClientComponentClient();
  const { code } = credentials;
  
  try {
    // Create a verification challenge
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorType: 'totp'
    });
    
    if (challengeError) {
      toastError("MFA verification failed", challengeError.message);
      return { user: null, session: null, error: challengeError };
    }
    
    // Verify with the code
    const { data, error } = await supabase.auth.mfa.verify({
      factorId: challenge.id,
      challengeId: challenge.id,
      code
    });
    
    if (error) {
      toastError("MFA verification failed", error.message);
      return { user: null, session: null, error };
    }
    
    if (data) {
      toastSuccess("MFA verification successful", "Your account is now secured with MFA");
      
      // Get the user after verification
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user ? transformSupabaseUser(userData.user) : null;
      
      return { user, session: null, error: null };
    }
    
    return { user: null, session: null, error: new Error("MFA verification failed") };
  } catch (error) {
    const authError = error as AuthError;
    toastError("MFA verification failed", authError.message || "An unexpected error occurred");
    return { user: null, session: null, error: authError };
  }
}

/**
 * Disables multi-factor authentication for the current user
 * @returns Authentication response with success or error
 */
export async function disableMFA(): Promise<AuthResponse> {
  const supabase = createClientComponentClient();
  
  try {
    // Get the authenticated user's MFA factors
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    
    if (factorsError) {
      toastError("MFA disable failed", factorsError.message);
      return { user: null, session: null, error: factorsError };
    }
    
    // Find the TOTP factor
    const totpFactor = factors.totp.find(factor => factor.verified);
    
    if (!totpFactor) {
      toastError("MFA disable failed", "No active MFA factor found");
      return { user: null, session: null, error: new Error("No active MFA factor found") };
    }
    
    // Unenroll (disable) the MFA factor
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: totpFactor.id
    });
    
    if (error) {
      toastError("MFA disable failed", error.message);
      return { user: null, session: null, error };
    }
    
    toastSuccess("MFA disabled", "Multi-factor authentication has been turned off");
    
    // Get the updated user
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user ? transformSupabaseUser(userData.user) : null;
    
    return { user, session: null, error: null };
  } catch (error) {
    const authError = error as AuthError;
    toastError("MFA disable failed", authError.message || "An unexpected error occurred");
    return { user: null, session: null, error: authError };
  }
}

/**
 * Checks if a user has a specific role
 * @param user User object to check
 * @param role Role to check for
 * @returns True if user has the role, false otherwise
 */
export function hasRole(user: User, role: UserRole): boolean {
  if (!user) return false;
  
  // Get roles from user
  // In a real implementation, this would check roles attached to the user account
  // For now, we'll simulate based on userType
  const userRoles: UserRole[] = [];
  
  switch (user.userType) {
    case UserType.CREATOR:
      userRoles.push(UserRole.CREATOR_OWNER);
      break;
    case UserType.BRAND:
      userRoles.push(UserRole.BRAND_OWNER);
      break;
    case UserType.ADMIN:
      userRoles.push(UserRole.SYSTEM_ADMIN);
      break;
  }
  
  return userRoles.includes(role);
}

/**
 * Checks if a user has a specific permission
 * @param user User object to check
 * @param permission Permission to check for
 * @returns True if user has the permission, false otherwise
 */
export function hasPermission(user: User, permission: Permission): boolean {
  if (!user) return false;
  
  // Get permissions from user
  // In a real implementation, this would check permissions attached to the user account
  // For now, we'll simulate based on userType
  const userPermissions: Permission[] = [];
  
  switch (user.userType) {
    case UserType.CREATOR:
      userPermissions.push(
        Permission.VIEW_ANALYTICS,
        Permission.MANAGE_CONTENT,
        Permission.MANAGE_PLATFORMS,
        Permission.MANAGE_PARTNERSHIPS
      );
      break;
    case UserType.BRAND:
      userPermissions.push(
        Permission.VIEW_CAMPAIGNS,
        Permission.MANAGE_CAMPAIGNS,
        Permission.MANAGE_PARTNERSHIPS
      );
      break;
    case UserType.ADMIN:
      // Admin has all permissions
      Object.values(Permission).forEach(p => userPermissions.push(p as Permission));
      break;
  }
  
  return userPermissions.includes(permission);
}

/**
 * Gets the user type (creator, brand, or admin) for a given user
 * @param user User object to check
 * @returns User type enum value or null if not available
 */
export function getUserType(user: User): UserType | null {
  if (!user) return null;
  return user.userType;
}

/**
 * Gets the appropriate redirect path after login based on user type
 * @param user User object to generate path for
 * @returns Dashboard path based on user type
 */
export function getRedirectPath(user: User): string {
  if (!user) return ROUTES.HOME;
  
  switch (user.userType) {
    case UserType.CREATOR:
      return ROUTES.CREATOR_DASHBOARD;
    case UserType.BRAND:
      return ROUTES.BRAND_DASHBOARD;
    case UserType.ADMIN:
      return ROUTES.ADMIN_DASHBOARD;
    default:
      return ROUTES.HOME;
  }
}

/**
 * Transforms a Supabase user object to the application User type
 * @param supabaseUser User object from Supabase
 * @returns Transformed user object
 */
export function transformSupabaseUser(supabaseUser: SupabaseUser): User {
  // Extract user_type and full_name from metadata with fallbacks
  const metadata = supabaseUser.user_metadata || {};
  const userType = metadata.user_type || UserType.CREATOR;
  const fullName = metadata.full_name || metadata.name || 'Unnamed User';
  
  // Determine auth provider
  let authProvider = AuthProvider.EMAIL;
  if (supabaseUser.app_metadata?.provider === 'google') {
    authProvider = AuthProvider.GOOGLE;
  } else if (supabaseUser.app_metadata?.provider === 'apple') {
    authProvider = AuthProvider.APPLE;
  }
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    fullName,
    userType: userType as UserType,
    avatar: metadata.avatar_url || null,
    authProvider,
    isVerified: supabaseUser.email_confirmed_at !== null,
    mfaEnabled: supabaseUser.factors && supabaseUser.factors.length > 0,
    lastLoginAt: supabaseUser.last_sign_in_at ? new Date(supabaseUser.last_sign_in_at) : new Date(),
    createdAt: supabaseUser.created_at ? new Date(supabaseUser.created_at) : new Date(),
    updatedAt: new Date()
  };
}

/**
 * Transforms a Supabase session to the application Session type
 * @param supabaseSession Session object from Supabase
 * @returns Transformed session object
 */
export function transformSupabaseSession(supabaseSession: any): Session {
  return {
    accessToken: supabaseSession.access_token,
    refreshToken: supabaseSession.refresh_token,
    expiresAt: new Date(supabaseSession.expires_at || 0).getTime(),
    user: transformSupabaseUser(supabaseSession.user)
  };
}