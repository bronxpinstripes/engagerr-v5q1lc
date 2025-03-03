import React from 'react'; // React v18.0+
import { render, screen, waitFor, fireEvent } from '@testing-library/react'; // React Testing Library for rendering and interacting with components
import userEvent from '@testing-library/user-event'; // User event simulation for form interactions
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // Jest testing functions and matchers
import { mockRouter } from 'next-router-mock'; // Mock Next.js router for testing redirects

import LoginForm from '../components/auth/LoginForm'; // Component to test login functionality
import RegisterForm from '../components/auth/RegisterForm'; // Component to test registration functionality
import OAuthButtons from '../components/auth/OAuthButtons'; // Component to test OAuth authentication buttons
import { AuthContext, AuthProvider } from '../context/AuthContext'; // Auth context to mock for testing authentication state
import useAuth from '../hooks/useAuth'; // Hook to test or mock for auth functionality
import { UserType } from '../types/user'; // User type enum for testing registration
import { LoginCredentials, RegisterCredentials, OAuthProvider } from '../types/auth'; // Type definitions for authentication data

// Mock the useRouter hook from next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the toast notifications
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  toast: jest.fn(),
  dismiss: jest.fn(),
  update: jest.fn(),
  clearAll: jest.fn(),
};

// Mock the useToast hook
jest.mock('../hooks/useToast', () => ({
  __esModule: true,
  default: jest.fn(() => mockToast),
}));

// Mock the auth-related API functions
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockOAuthLogin = jest.fn();

// Mock the useAuth hook
jest.mock('../hooks/useAuth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    mfaEnabled: false,
    mfaVerified: false,
    login: mockLogin,
    register: mockRegister,
    logout: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    setupMFA: jest.fn(),
    verifyMFA: jest.fn(),
    disableMFA: jest.fn(),
    oauthLogin: mockOAuthLogin,
    getUserType: jest.fn(),
    hasRole: jest.fn(),
    hasPermission: jest.fn(),
  })),
}));

/**
 * Sets up common mocks used across authentication tests
 */
const setupMocks = () => {
  // Mock the useRouter hook from next/navigation
  const mockUseRouter = require('next/navigation').useRouter;
  mockUseRouter.mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  });

  // Create a mock for the toast notifications
  const mockUseToast = require('../hooks/useToast').default;
  mockUseToast.mockReturnValue(mockToast);

  // Create mocks for auth-related API functions
  const mockUseAuth = require('../hooks/useAuth').default;
  mockUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    mfaEnabled: false,
    mfaVerified: false,
    login: mockLogin,
    register: mockRegister,
    logout: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    setupMFA: jest.fn(),
    verifyMFA: jest.fn(),
    disableMFA: jest.fn(),
    oauthLogin: mockOAuthLogin,
    getUserType: jest.fn(),
    hasRole: jest.fn(),
    hasPermission: jest.fn(),
  });

  return { mockUseRouter, mockUseToast, mockUseAuth, mockLogin, mockRegister, mockOAuthLogin };
};

/**
 * Helper function to render components with mocked AuthContext values
 */
const renderWithAuthContext = (ui: React.ReactNode, contextValue: Partial<AuthContextType> = {}) => {
  // Create default mock auth context with isAuthenticated=false
  const defaultContextValue: AuthContextType = {
    state: {
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      mfaEnabled: false,
      mfaVerified: false,
    },
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    sendMagicLink: jest.fn(),
    setupMFA: jest.fn(),
    verifyMFA: jest.fn(),
    disableMFA: jest.fn(),
  };

  // Merge with provided context values
  const mergedContextValue: AuthContextType = {
    ...defaultContextValue,
    ...contextValue,
  };

  // Render component wrapped in AuthContext.Provider with the mock value
  return render(<AuthContext.Provider value={mergedContextValue}>{ui}</AuthContext.Provider>);
};

describe('LoginForm', () => {
  let mocks: any;

  beforeEach(() => {
    mocks = setupMocks();
    mockRouter.mock();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRouter.destroy();
  });

  it('should render login form (inputs, labels, buttons)', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    render(<LoginForm />);
    const loginButton = screen.getByRole('button', { name: 'Login' });
    await userEvent.click(loginButton);
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email format', async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'invalid-email');
    const loginButton = screen.getByRole('button', { name: 'Login' });
    await userEvent.click(loginButton);
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should submit form with valid credentials', async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(mocks.mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should display error when login API returns an error', async () => {
    mocks.mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginForm />);
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should display loading state during form submission', async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    userEvent.click(loginButton);

    expect(screen.getByRole('button', { name: 'Logging in...' })).toBeInTheDocument();
  });

  it('should navigate to register page', async () => {
    render(<LoginForm />);
    const registerLink = screen.getByRole('link', { name: 'Register' });
    await userEvent.click(registerLink);
    expect(mocks.mockUseRouter().push).toHaveBeenCalledWith('/auth/register');
  });
});

describe('RegisterForm', () => {
  let mocks: any;

  beforeEach(() => {
    mocks = setupMocks();
    mockRouter.mock();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRouter.destroy();
  });

  it('should render registration form (inputs, radio buttons, labels)', () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Account Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    render(<RegisterForm />);
    const createAccountButton = screen.getByRole('button', { name: 'Create Account' });
    await userEvent.click(createAccountButton);
    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });
  });

  it('should show password requirements validation', async () => {
    render(<RegisterForm />);
    const passwordInput = screen.getByLabelText('Password');
    await userEvent.type(passwordInput, 'weak');
    const createAccountButton = screen.getByRole('button', { name: 'Create Account' });
    await userEvent.click(createAccountButton);
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 10 characters')).toBeInTheDocument();
    });
  });

  it('should submit form with valid creator credentials', async () => {
    render(<RegisterForm />);
    const fullNameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const createAccountButton = screen.getByRole('button', { name: 'Create Account' });

    await userEvent.type(fullNameInput, 'Test User');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'Password123!');
    await userEvent.type(confirmPasswordInput, 'Password123!');
    await userEvent.click(createAccountButton);

    await waitFor(() => {
      expect(mocks.mockRegister).toHaveBeenCalledWith({
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'Password123!',
        userType: UserType.CREATOR,
      });
    });
  });

  it('should submit form with valid brand credentials', async () => {
    render(<RegisterForm />);
    const fullNameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const brandRadio = screen.getByLabelText('Brand');
    const createAccountButton = screen.getByRole('button', { name: 'Create Account' });

    await userEvent.type(fullNameInput, 'Test Brand');
    await userEvent.type(emailInput, 'brand@example.com');
    await userEvent.type(passwordInput, 'Password123!');
    await userEvent.type(confirmPasswordInput, 'Password123!');
    await userEvent.click(brandRadio);
    await userEvent.click(createAccountButton);

    await waitFor(() => {
      expect(mocks.mockRegister).toHaveBeenCalledWith({
        email: 'brand@example.com',
        fullName: 'Test Brand',
        password: 'Password123!',
        userType: UserType.BRAND,
      });
    });
  });

  it('should display error when registration API returns an error', async () => {
    mocks.mockRegister.mockRejectedValue(new Error('Registration failed'));
    render(<RegisterForm />);
    const fullNameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const createAccountButton = screen.getByRole('button', { name: 'Create Account' });

    await userEvent.type(fullNameInput, 'Test User');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'Password123!');
    await userEvent.type(confirmPasswordInput, 'Password123!');
    await userEvent.click(createAccountButton);

    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });
  });

  it('should display loading state during form submission', async () => {
    render(<RegisterForm />);
    const fullNameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const createAccountButton = screen.getByRole('button', { name: 'Create Account' });

    await userEvent.type(fullNameInput, 'Test User');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'Password123!');
    await userEvent.type(confirmPasswordInput, 'Password123!');
    userEvent.click(createAccountButton);

    expect(screen.getByRole('button', { name: 'Create Account', disabled: true })).toBeInTheDocument();
  });

  it('should navigate to login page for existing users', async () => {
    render(<RegisterForm />);
    const loginLink = screen.getByRole('link', { name: 'Log In' });
    await userEvent.click(loginLink);
    expect(mocks.mockUseRouter().push).toHaveBeenCalledWith('/login');
  });
});

describe('OAuthButtons', () => {
  let mocks: any;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render Google and Apple OAuth buttons', () => {
    render(<OAuthButtons />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeInTheDocument();
  });

  it('should call OAuth login function with correct provider when Google button is clicked', async () => {
    render(<OAuthButtons />);
    const googleButton = screen.getByRole('button', { name: 'Continue with Google' });
    await userEvent.click(googleButton);
    expect(mocks.mockOAuthLogin).toHaveBeenCalledWith(OAuthProvider.GOOGLE);
  });

  it('should call OAuth login function with correct provider when Apple button is clicked', async () => {
    render(<OAuthButtons />);
    const appleButton = screen.getByRole('button', { name: 'Continue with Apple' });
    await userEvent.click(appleButton);
    expect(mocks.mockOAuthLogin).toHaveBeenCalledWith(OAuthProvider.APPLE);
  });

  it('should display loading state during OAuth authentication', () => {
    mocks.mockUseAuth.mockReturnValue({
      ...mocks.mockUseAuth(),
      isLoading: true,
    });
    render(<OAuthButtons />);
    expect(screen.getByRole('button', { name: 'Continue with Google', disabled: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Apple', disabled: true })).toBeInTheDocument();
  });

  it('should handle error for OAuth authentication failures', async () => {
    mocks.mockOAuthLogin.mockRejectedValue(new Error('OAuth failed'));
    render(<OAuthButtons />);
    const googleButton = screen.getByRole('button', { name: 'Continue with Google' });
    await userEvent.click(googleButton);
    expect(mocks.mockUseToast().error).toHaveBeenCalledWith('OAuth login not available', 'This feature is not currently implemented in the context');
  });
});

describe('AuthContext', () => {
  let mocks: any;

  beforeEach(() => {
    mocks = setupMocks();
    mockRouter.mock();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRouter.destroy();
  });

  it('should provide initial unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should update authentication state correctly on login', async () => {
    const mockUser = { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.CREATOR, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: false, lastLoginAt: new Date(), createdAt: new Date() };
    mocks.mockLogin.mockResolvedValue({ user: mockUser, session: { accessToken: 'token', refreshToken: 'token', expiresAt: Date.now(), user: mockUser }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await result.current.login({ email: 'test@example.com', password: 'password' });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should clear authentication state on logout', async () => {
    const mockUser = { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.CREATOR, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: false, lastLoginAt: new Date(), createdAt: new Date() };
    mocks.mockLogin.mockResolvedValue({ user: mockUser, session: { accessToken: 'token', refreshToken: 'token', expiresAt: Date.now(), user: mockUser }, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await result.current.login({ email: 'test@example.com', password: 'password' });
    await result.current.logout();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should retrieve session on mount', async () => {
    const mockUser = { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.CREATOR, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: false, lastLoginAt: new Date(), createdAt: new Date() };
    const mockSession = { accessToken: 'token', refreshToken: 'token', expiresAt: Date.now(), user: mockUser };
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it('should determine user type', () => {
    const mockUser = { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.CREATOR, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: false, lastLoginAt: new Date(), createdAt: new Date() };
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    const userType = result.current.getUserType(mockUser);
    expect(userType).toBe(UserType.CREATOR);
  });

  it('should check role and permission', () => {
    const mockUser = { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.CREATOR, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: false, lastLoginAt: new Date(), createdAt: new Date() };
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    const hasCreatorRole = result.current.hasRole('creator_owner', mockUser);
    const hasAnalyticsPermission = result.current.hasPermission('view_analytics', mockUser);
    expect(hasCreatorRole).toBe(true);
    expect(hasAnalyticsPermission).toBe(true);
  });

  it('should handle MFA-related functionality', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    // Mock MFA setup, verification, and disable functions
    const mockSetupMFA = jest.fn().mockResolvedValue({ secret: 'secret', qrCode: 'qrCode' });
    const mockVerifyMFA = jest.fn().mockResolvedValue({ user: { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.CREATOR, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: true, lastLoginAt: new Date(), createdAt: new Date() }, session: null, error: null });
    const mockDisableMFA = jest.fn().mockResolvedValue({ user: { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.CREATOR, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: false, lastLoginAt: new Date(), createdAt: new Date() }, session: null, error: null });

    // Replace the original functions with the mocks
    mocks.mockUseAuth.mockReturnValue({
      ...mocks.mockUseAuth(),
      setupMFA: mockSetupMFA,
      verifyMFA: mockVerifyMFA,
      disableMFA: mockDisableMFA,
    });

    // Call the functions and check the results
    await result.current.setupMFA('totp');
    expect(mockSetupMFA).toHaveBeenCalled();

    await result.current.verifyMFA({ code: '123456' });
    expect(mockVerifyMFA).toHaveBeenCalledWith({ code: '123456' });

    await result.current.disableMFA();
    expect(mockDisableMFA).toHaveBeenCalled();
  });
});

describe('Integration', () => {
  let mocks: any;

  beforeEach(() => {
    mocks = setupMocks();
    mockRouter.mock();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRouter.destroy();
  });

  it('should test complete login flow from form submission to redirect', async () => {
    const mockUser = { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.CREATOR, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: false, lastLoginAt: new Date(), createdAt: new Date() };
    mocks.mockLogin.mockResolvedValue({ user: mockUser, session: { accessToken: 'token', refreshToken: 'token', expiresAt: Date.now(), user: mockUser }, error: null });
    render(<LoginForm />);
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(mocks.mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mocks.mockUseRouter().push).toHaveBeenCalledWith('/creator/dashboard');
    });
  });

  it('should test complete registration flow from form submission to verification', async () => {
    const mockUser = { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.CREATOR, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: false, lastLoginAt: new Date(), createdAt: new Date() };
    mocks.mockRegister.mockResolvedValue({ user: mockUser, session: { accessToken: 'token', refreshToken: 'token', expiresAt: Date.now(), user: mockUser }, error: null });
    render(<RegisterForm />);
    const fullNameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const createAccountButton = screen.getByRole('button', { name: 'Create Account' });

    await userEvent.type(fullNameInput, 'Test User');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'Password123!');
    await userEvent.type(confirmPasswordInput, 'Password123!');
    await userEvent.click(createAccountButton);

    await waitFor(() => {
      expect(mocks.mockRegister).toHaveBeenCalledWith({
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'Password123!',
        userType: UserType.CREATOR,
      });
      expect(mocks.mockUseRouter().push).toHaveBeenCalledWith('/creator/onboarding');
    });
  });

  it('should test OAuth authentication flow', async () => {
    render(<OAuthButtons />);
    const googleButton = screen.getByRole('button', { name: 'Continue with Google' });
    await userEvent.click(googleButton);
    expect(mocks.mockOAuthLogin).toHaveBeenCalledWith(OAuthProvider.GOOGLE);
  });

  it('should test proper redirection based on user type', async () => {
    const mockUser = { id: '123', email: 'test@example.com', fullName: 'Test User', userType: UserType.BRAND, avatar: null, authProvider: 'email', isVerified: true, mfaEnabled: false, lastLoginAt: new Date(), createdAt: new Date() };
    mocks.mockLogin.mockResolvedValue({ user: mockUser, session: { accessToken: 'token', refreshToken: 'token', expiresAt: Date.now(), user: mockUser }, error: null });
    render(<LoginForm />);
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(mocks.mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mocks.mockUseRouter().push).toHaveBeenCalledWith('/brand/dashboard');
    });
  });
});