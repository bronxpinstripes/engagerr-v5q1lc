import { useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { 
  AuthState, 
  LoginCredentials, 
  RegisterCredentials, 
  ResetPasswordCredentials, 
  UpdatePasswordCredentials,
  MFAVerificationCredentials, 
  OAuthProvider,
  MFAType,
  UserType
} from '../types/auth';
import { User } from '../types/user';
import useToast from './useToast';

/**
 * Interface defining the authentication API returned by the useAuth hook
 */
export interface AuthAPI {
  // Authentication state
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  
  // Authentication methods
  login: (credentials: LoginCredentials) => Promise<any>;
  register: (credentials: RegisterCredentials) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<any>;
  updatePassword: (credentials: UpdatePasswordCredentials) => Promise<any>;
  setupMFA: (type: MFAType) => Promise<any>;
  verifyMFA: (credentials: MFAVerificationCredentials) => Promise<any>;
  disableMFA: () => Promise<any>;
  oauthLogin: (provider: OAuthProvider) => Promise<void>;
  
  // Authorization helper methods
  getUserType: (user?: User) => UserType | null;
  hasRole: (role: string, user?: User) => boolean;
  hasPermission: (permission: string, user?: User) => boolean;
}

/**
 * Custom hook that provides simplified access to authentication functionality
 * throughout the Engagerr application. This hook wraps the AuthContext to offer
 * a streamlined interface for handling user authentication, session management,
 * and authorization checks.
 * 
 * @returns Authentication state and methods for managing user authentication
 */
const useAuth = (): AuthAPI => {
  // Get authentication context
  const { 
    state, 
    login: contextLogin, 
    register: contextRegister, 
    logout: contextLogout, 
    resetPassword: contextResetPassword, 
    updatePassword: contextUpdatePassword, 
    setupMFA: contextSetupMFA, 
    verifyMFA: contextVerifyMFA, 
    disableMFA: contextDisableMFA 
  } = useAuthContext();
  
  // Initialize toast notification utility
  const toast = useToast();
  
  // Create memoized wrapper for login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    return await contextLogin(credentials);
  }, [contextLogin]);
  
  // Create memoized wrapper for register function
  const register = useCallback(async (credentials: RegisterCredentials) => {
    return await contextRegister(credentials);
  }, [contextRegister]);
  
  // Create memoized wrapper for logout function
  const logout = useCallback(async (): Promise<void> => {
    await contextLogout();
  }, [contextLogout]);
  
  // Create memoized wrapper for resetPassword function
  const resetPassword = useCallback(async (credentials: ResetPasswordCredentials) => {
    return await contextResetPassword(credentials);
  }, [contextResetPassword]);
  
  // Create memoized wrapper for updatePassword function
  const updatePassword = useCallback(async (credentials: UpdatePasswordCredentials) => {
    return await contextUpdatePassword(credentials);
  }, [contextUpdatePassword]);
  
  // Create memoized wrapper for setupMFA function
  const setupMFA = useCallback(async (type: MFAType) => {
    return await contextSetupMFA(type);
  }, [contextSetupMFA]);
  
  // Create memoized wrapper for verifyMFA function
  const verifyMFA = useCallback(async (credentials: MFAVerificationCredentials) => {
    return await contextVerifyMFA(credentials);
  }, [contextVerifyMFA]);
  
  // Create memoized wrapper for disableMFA function
  const disableMFA = useCallback(async () => {
    return await contextDisableMFA();
  }, [contextDisableMFA]);
  
  // Create memoized wrapper for OAuth login function
  const oauthLogin = useCallback(async (provider: OAuthProvider): Promise<void> => {
    try {
      // OAuth login is not directly exposed through the context
      // In a real implementation, this would utilize the oauthLogin function from auth library
      toast.error("OAuth login not available", "This feature is not currently implemented in the context");
      throw new Error("OAuth login not implemented in context");
    } catch (error) {
      throw error;
    }
  }, [toast]);
  
  // Create memoized wrapper for getUserType function
  const getUserType = useCallback((user?: User): UserType | null => {
    const targetUser = user || state.user;
    if (!targetUser) return null;
    return targetUser.userType;
  }, [state.user]);
  
  // Create memoized wrapper for hasRole function
  const hasRole = useCallback((role: string, user?: User): boolean => {
    const targetUser = user || state.user;
    if (!targetUser) return false;
    
    // This is a simplified implementation based on user type
    // In a production app, this would check against roles stored with the user
    const userType = targetUser.userType;
    
    switch (userType) {
      case UserType.CREATOR:
        return role === 'creator_owner';
      case UserType.BRAND:
        return role === 'brand_owner';
      case UserType.ADMIN:
        return role === 'system_admin';
      default:
        return false;
    }
  }, [state.user]);
  
  // Create memoized wrapper for hasPermission function
  const hasPermission = useCallback((permission: string, user?: User): boolean => {
    const targetUser = user || state.user;
    if (!targetUser) return false;
    
    // This is a simplified implementation based on user type
    // In a production app, this would check against permissions stored with the user
    const userType = targetUser.userType;
    
    // Define permissions by user type
    const creatorPermissions = [
      'view_analytics', 
      'manage_content', 
      'manage_partnerships', 
      'manage_platforms'
    ];
    
    const brandPermissions = [
      'view_campaigns', 
      'manage_campaigns', 
      'manage_partnerships'
    ];
    
    switch (userType) {
      case UserType.CREATOR:
        return creatorPermissions.includes(permission);
      case UserType.BRAND:
        return brandPermissions.includes(permission);
      case UserType.ADMIN:
        return true; // Admin has all permissions
      default:
        return false;
    }
  }, [state.user]);
  
  // Return the authentication API
  return {
    // State
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    mfaEnabled: state.mfaEnabled,
    mfaVerified: state.mfaVerified,
    
    // Methods
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    setupMFA,
    verifyMFA,
    disableMFA,
    oauthLogin,
    
    // Authorization helpers
    getUserType,
    hasRole,
    hasPermission
  };
};

export default useAuth;