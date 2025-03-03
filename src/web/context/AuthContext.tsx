import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import { 
  AuthState, 
  AuthContextType, 
  LoginCredentials, 
  RegisterCredentials, 
  AuthResponse, 
  Session, 
  MFASetupResponse, 
  MFAVerificationCredentials, 
  ResetPasswordCredentials,
  UpdatePasswordCredentials,
  OAuthProvider,
  MFAType
} from '../types/auth';
import { User, UserRole, UserType, Permission } from '../types/user';
import { 
  login, 
  register, 
  logout, 
  oauthLogin, 
  resetPassword, 
  updatePassword, 
  getCurrentUser, 
  getCurrentSession, 
  refreshSession, 
  setupMFA, 
  verifyMFA, 
  disableMFA, 
  hasRole, 
  hasPermission, 
  getUserType,
  getRedirectPath,
  DEFAULT_AUTH_STATE
} from '../lib/auth';
import { USER_TYPES, ROUTES } from '../lib/constants';
import { useToastContext } from './ToastContext';

/**
 * Authentication context providing auth-related state and functions
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider component that manages authentication state and provides auth functions
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Authentication state
  const [state, setState] = useState<AuthState>(DEFAULT_AUTH_STATE);
  
  // NextJS router for navigation after auth events
  const router = useRouter();
  
  // Toast notifications for auth feedback
  const { addToast } = useToastContext();
  
  /**
   * Authenticates a user with email and password
   * @param credentials Login credentials with email and password
   * @returns Authentication response with user and session data
   */
  const handleLogin = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Attempt login with provided credentials
      const response = await login(credentials);
      
      // Update auth state with response data
      if (response.user && response.session) {
        setState({
          user: response.user,
          session: response.session,
          isLoading: false,
          isAuthenticated: true,
          mfaEnabled: response.user.mfaEnabled,
          mfaVerified: false // MFA needs verification after login
        });
        
        // If MFA is enabled, redirect to MFA verification
        if (response.user.mfaEnabled) {
          router.push(ROUTES.MFA_VERIFY);
        } else {
          // Otherwise redirect to the appropriate dashboard based on user type
          const redirectPath = getRedirectPath(response.user);
          router.push(redirectPath);
        }
      } else {
        // Reset state if login failed
        setState(prev => ({ ...prev, isLoading: false }));
      }
      
      return response;
    } catch (error) {
      // Handle errors
      setState(prev => ({ ...prev, isLoading: false }));
      addToast('Login failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred', 
        { type: 'error' }
      );
      return { user: null, session: null, error: error instanceof Error ? error : new Error('Login failed') };
    }
  }, [router, addToast]);
  
  /**
   * Registers a new user with the system
   * @param credentials Registration credentials with user details
   * @returns Authentication response with user and session data
   */
  const handleRegister = useCallback(async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Attempt registration with provided credentials
      const response = await register(credentials);
      
      // Update auth state with response data
      if (response.user && response.session) {
        setState({
          user: response.user,
          session: response.session,
          isLoading: false,
          isAuthenticated: true,
          mfaEnabled: false,
          mfaVerified: false
        });
        
        // Redirect to the appropriate dashboard based on user type
        const redirectPath = getRedirectPath(response.user);
        router.push(redirectPath);
      } else {
        // Reset state if registration failed
        setState(prev => ({ ...prev, isLoading: false }));
      }
      
      return response;
    } catch (error) {
      // Handle errors
      setState(prev => ({ ...prev, isLoading: false }));
      addToast('Registration failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred', 
        { type: 'error' }
      );
      return { user: null, session: null, error: error instanceof Error ? error : new Error('Registration failed') };
    }
  }, [router, addToast]);
  
  /**
   * Signs out the current user and clears session data
   */
  const handleLogout = useCallback(async (): Promise<void> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Attempt logout
      await logout();
      
      // Reset auth state to defaults
      setState(DEFAULT_AUTH_STATE);
      
      // Redirect to home page
      router.push(ROUTES.HOME);
    } catch (error) {
      // Handle errors
      setState(prev => ({ ...prev, isLoading: false }));
      addToast('Logout failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred', 
        { type: 'error' }
      );
    }
  }, [router, addToast]);
  
  /**
   * Initiates OAuth authentication with the specified provider
   * @param provider OAuth provider (Google, Apple, etc.)
   */
  const handleOAuthLogin = useCallback(async (provider: OAuthProvider): Promise<void> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Initiate OAuth flow
      await oauthLogin(provider);
      
      // Note: The actual auth state update happens after the OAuth redirect
      // in the handleOAuthCallback function which is called by the OAuth redirect handler
    } catch (error) {
      // Handle errors
      setState(prev => ({ ...prev, isLoading: false }));
      addToast('OAuth login failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred', 
        { type: 'error' }
      );
    }
  }, [addToast]);
  
  /**
   * Sends a password reset email to the user
   * @param credentials Object containing user's email
   * @returns Authentication response
   */
  const handleResetPassword = useCallback(async (credentials: ResetPasswordCredentials): Promise<AuthResponse> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Request password reset
      const response = await resetPassword(credentials);
      
      // Reset loading state
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Show success message
      if (!response.error) {
        addToast(
          'Password reset email sent',
          'Check your inbox for instructions to reset your password',
          { type: 'success' }
        );
      }
      
      return response;
    } catch (error) {
      // Handle errors
      setState(prev => ({ ...prev, isLoading: false }));
      addToast('Password reset failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred', 
        { type: 'error' }
      );
      return { user: null, session: null, error: error instanceof Error ? error : new Error('Password reset failed') };
    }
  }, [addToast]);
  
  /**
   * Updates the user's password
   * @param credentials Object containing new password and reset token
   * @returns Authentication response
   */
  const handleUpdatePassword = useCallback(async (credentials: UpdatePasswordCredentials): Promise<AuthResponse> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Update password
      const response = await updatePassword(credentials);
      
      // Reset loading state
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Show success message and redirect to login
      if (!response.error) {
        addToast(
          'Password updated',
          'Your password has been successfully updated',
          { type: 'success' }
        );
        router.push(ROUTES.LOGIN);
      }
      
      return response;
    } catch (error) {
      // Handle errors
      setState(prev => ({ ...prev, isLoading: false }));
      addToast('Password update failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred', 
        { type: 'error' }
      );
      return { user: null, session: null, error: error instanceof Error ? error : new Error('Password update failed') };
    }
  }, [router, addToast]);
  
  /**
   * Sets up multi-factor authentication for the user
   * @param type MFA type (TOTP, SMS, etc.)
   * @returns MFA setup response with QR code and secret
   */
  const handleSetupMFA = useCallback(async (type: MFAType): Promise<MFASetupResponse | null> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Set up MFA
      const response = await setupMFA(type);
      
      // If setup was successful, update state to reflect MFA is enabled but not verified
      if (response) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          mfaEnabled: true,
          mfaVerified: false
        }));
        
        addToast(
          'MFA setup initiated',
          'Follow the instructions to complete setup',
          { type: 'success' }
        );
      } else {
        // Reset loading state if unsuccessful
        setState(prev => ({ ...prev, isLoading: false }));
      }
      
      return response;
    } catch (error) {
      // Handle errors
      setState(prev => ({ ...prev, isLoading: false }));
      addToast('MFA setup failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred', 
        { type: 'error' }
      );
      return null;
    }
  }, [addToast]);
  
  /**
   * Verifies a multi-factor authentication code
   * @param credentials Object containing verification code
   * @returns Authentication response
   */
  const handleVerifyMFA = useCallback(async (credentials: MFAVerificationCredentials): Promise<AuthResponse> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Verify MFA code
      const response = await verifyMFA(credentials);
      
      // If verification was successful, update state to reflect MFA is verified
      if (response.user && !response.error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          mfaEnabled: true,
          mfaVerified: true,
          user: response.user || prev.user
        }));
        
        addToast(
          'MFA verification successful',
          'Your account is now secured with MFA',
          { type: 'success' }
        );
        
        // Redirect to appropriate dashboard if this was post-login verification
        if (!state.isAuthenticated && response.user) {
          const redirectPath = getRedirectPath(response.user);
          router.push(redirectPath);
        }
      } else {
        // Reset loading state if unsuccessful
        setState(prev => ({ ...prev, isLoading: false }));
      }
      
      return response;
    } catch (error) {
      // Handle errors
      setState(prev => ({ ...prev, isLoading: false }));
      addToast('MFA verification failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred', 
        { type: 'error' }
      );
      return { user: null, session: null, error: error instanceof Error ? error : new Error('MFA verification failed') };
    }
  }, [state.isAuthenticated, router, addToast]);
  
  /**
   * Disables multi-factor authentication for the current user
   * @returns Authentication response
   */
  const handleDisableMFA = useCallback(async (): Promise<AuthResponse> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Disable MFA
      const response = await disableMFA();
      
      // If successful, update state to reflect MFA is disabled
      if (!response.error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          mfaEnabled: false,
          mfaVerified: false,
          user: response.user || prev.user
        }));
        
        addToast(
          'MFA disabled',
          'Multi-factor authentication has been turned off',
          { type: 'success' }
        );
      } else {
        // Reset loading state if unsuccessful
        setState(prev => ({ ...prev, isLoading: false }));
      }
      
      return response;
    } catch (error) {
      // Handle errors
      setState(prev => ({ ...prev, isLoading: false }));
      addToast('MFA disable failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred', 
        { type: 'error' }
      );
      return { user: null, session: null, error: error instanceof Error ? error : new Error('MFA disable failed') };
    }
  }, [addToast]);
  
  /**
   * Checks for an existing user session and refreshes it if needed
   * This is used on initial app load and after page refreshes
   */
  const checkSession = useCallback(async (): Promise<void> => {
    // Set loading state
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Get current user and session
      const user = await getCurrentUser();
      const session = await getCurrentSession();
      
      if (user && session) {
        // Update auth state with current user and session
        setState({
          user,
          session,
          isLoading: false,
          isAuthenticated: true,
          mfaEnabled: user.mfaEnabled,
          mfaVerified: true // Assume verified if we have a valid session
        });
        
        // Check if session is close to expiry and refresh if needed
        const now = Date.now();
        const expiresAt = session.expiresAt;
        const timeUntilExpiry = expiresAt - now;
        
        // Refresh if less than 10 minutes until expiry
        if (timeUntilExpiry < 10 * 60 * 1000) {
          const refreshedSession = await refreshSession();
          if (refreshedSession) {
            setState(prev => ({ ...prev, session: refreshedSession }));
          }
        }
      } else {
        // No user or session, ensure state is reset
        setState(prev => ({ 
          ...DEFAULT_AUTH_STATE,
          isLoading: false
        }));
      }
    } catch (error) {
      // Handle errors silently (don't show toast for session checks)
      setState(prev => ({ 
        ...DEFAULT_AUTH_STATE,
        isLoading: false
      }));
      console.error('Session check failed:', error);
    }
  }, []);
  
  // Check for existing session on component mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);
  
  // Define context value
  const contextValue: AuthContextType = {
    state,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
    sendMagicLink: async (email: string) => ({ error: new Error('Not implemented') }),
    setupMFA: handleSetupMFA,
    verifyMFA: handleVerifyMFA,
    disableMFA: handleDisableMFA,
  };
  
  // Provide auth context to children
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access the authentication context
 * @throws Error if used outside AuthProvider
 * @returns The auth context containing state and methods
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}