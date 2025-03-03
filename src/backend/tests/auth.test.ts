import { AuthService } from '../src/services/auth';
import userModel from '../src/models/user';
import { supabaseClient } from '../src/config/supabase';
import { UserType } from '../src/types/user';
import { authController } from '../src/controllers/auth';
import { AppError } from '../src/utils/errors';
import { setupTestDatabase, setupMocks } from './setup';
import request from 'supertest'; // version specified: ^6.3.3
import express from 'express'; // version specified: ^4.18.2
import { NextFunction, Request, Response } from 'express';
import { globalMocks } from './setup';
import { LoginCredentials, SignupData } from '../src/types/user';

// Default test user object used across multiple tests
const testUser = {
  email: 'test@example.com',
  password: 'P@$$wOrd123',
  fullName: 'Test User',
  userType: UserType.CREATOR,
};

// Test creator user object for creator-specific tests
const testCreator = {
  email: 'creator@example.com',
  password: 'P@$$wOrd123',
  fullName: 'Test Creator',
  userType: UserType.CREATOR,
};

// Test brand user object for brand-specific tests
const testBrand = {
  email: 'brand@example.com',
  password: 'P@$$wOrd123',
  fullName: 'Test Brand',
  userType: UserType.BRAND,
};

// Factory function for generating mock Express request objects
const mockRequest = (body: any = {}, params: any = {}, query: any = {}): Request => {
  const req = {
    body: body,
    params: params,
    query: query,
  } as Request;
  return req;
};

// Factory function for generating mock Express response objects with jest.fn() spy methods
const mockResponse = (): Response => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res as Response;
};

// Mock Express next function with jest.fn() for testing middleware
const mockNext: NextFunction = jest.fn();

describe('Auth Service', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('Should register a new creator user successfully', async () => {
    const authService = new AuthService();
    const signupData: SignupData = {
      email: 'newcreator@example.com',
      password: 'P@$$wOrd123',
      fullName: 'New Creator',
      userType: UserType.CREATOR,
    };
    const { user, session } = await authService.signup(signupData);
    expect(user).toBeDefined();
    expect(user.email).toBe(signupData.email);
  });

  it('Should register a new brand user successfully', async () => {
    const authService = new AuthService();
    const signupData: SignupData = {
      email: 'newbrand@example.com',
      password: 'P@$$wOrd123',
      fullName: 'New Brand',
      userType: UserType.BRAND,
    };
    const { user, session } = await authService.signup(signupData);
    expect(user).toBeDefined();
    expect(user.email).toBe(signupData.email);
  });

  it('Should reject registration with existing email', async () => {
    const authService = new AuthService();
    const signupData: SignupData = {
      email: 'test@example.com',
      password: 'P@$$wOrd123',
      fullName: 'Test User',
      userType: UserType.CREATOR,
    };
    await expect(authService.signup(signupData)).rejects.toThrow('Email already in use.');
  });

  it('Should reject registration with weak password', async () => {
    const authService = new AuthService();
    const signupData: SignupData = {
      email: 'weakpassword@example.com',
      password: 'weak',
      fullName: 'Weak Password User',
      userType: UserType.CREATOR,
    };
    await expect(authService.signup(signupData)).rejects.toThrow('Password must be at least 10 characters');
  });

  it('Should authenticate user with valid credentials', async () => {
    const authService = new AuthService();
    const credentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'P@$$wOrd123',
    };
    const { user, session } = await authService.login(credentials);
    expect(user).toBeDefined();
    expect(user.email).toBe(credentials.email);
  });

  it('Should reject authentication with invalid credentials', async () => {
    const authService = new AuthService();
    const credentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };
    await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
  });

  it('Should verify email with valid token', async () => {
    const authService = new AuthService();
    const token = 'valid-token';
    await expect(authService.verifyEmail(token)).resolves.toBeUndefined();
  });

  it('Should reject email verification with invalid token', async () => {
    const authService = new AuthService();
    const token = 'invalid-token';
    await expect(authService.verifyEmail(token)).rejects.toThrow('Invalid or expired token');
  });

  it('Should process password reset request', async () => {
    const authService = new AuthService();
    const email = 'test@example.com';
    await expect(authService.resetPassword(email)).resolves.toBeUndefined();
  });

  it('Should reset password with valid token', async () => {
    const authService = new AuthService();
    const token = 'valid-token';
    const newPassword = 'NewP@$$wOrd123';
    await expect(authService.verifyPasswordReset(token, newPassword)).resolves.toBeUndefined();
  });

  it('Should reject password reset with invalid token', async () => {
    const authService = new AuthService();
    const token = 'invalid-token';
    const newPassword = 'NewP@$$wOrd123';
    await expect(authService.verifyPasswordReset(token, newPassword)).rejects.toThrow('Invalid or expired token');
  });

  it('Should refresh access token with valid refresh token', async () => {
    const authService = new AuthService();
    const refreshToken = 'valid-refresh-token';
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(refreshToken);
    expect(accessToken).toBeDefined();
    expect(newRefreshToken).toBeDefined();
  });

  it('Should generate MFA setup data', async () => {
    const authService = new AuthService();
    const userId = 'test-user-id';
    const { secret, qrCode } = await authService.setupMfa(userId);
    expect(secret).toBeDefined();
    expect(qrCode).toBeDefined();
  });

  it('Should verify and enable MFA with valid code', async () => {
    const authService = new AuthService();
    const userId = 'test-user-id';
    const verificationCode = '123456';
    await expect(authService.verifyMfa(userId, verificationCode)).resolves.toBeUndefined();
  });

  it('Should reject MFA verification with invalid code', async () => {
    const authService = new AuthService();
    const userId = 'test-user-id';
    const verificationCode = 'invalid-code';
    await expect(authService.verifyMfa(userId, verificationCode)).rejects.toThrow();
  });
});

describe('Auth Controllers', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('Should handle login request with valid credentials', async () => {
    const req = mockRequest({ email: 'test@example.com', password: 'P@$$wOrd123' });
    const res = mockResponse();
    await authController.login(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('Should reject login with invalid credentials', async () => {
    const req = mockRequest({ email: 'test@example.com', password: 'wrongpassword' });
    const res = mockResponse();
    await authController.login(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('Should handle user registration request', async () => {
    const req = mockRequest({ email: 'newuser@example.com', password: 'P@$$wOrd123', fullName: 'New User', userType: UserType.CREATOR });
    const res = mockResponse();
    await authController.register(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('Should handle email verification request', async () => {
    const req = mockRequest({}, { token: 'valid-token' });
    const res = mockResponse();
    await authController.verifyEmail(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('Should handle password reset request', async () => {
    const req = mockRequest({ email: 'test@example.com' });
    const res = mockResponse();
    await authController.requestPasswordReset(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('Should handle password reset verification', async () => {
    const req = mockRequest({ token: 'valid-token', newPassword: 'NewP@$$wOrd123' });
    const res = mockResponse();
    await authController.resetPassword(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('Should handle logout request', async () => {
    const req = mockRequest();
    req.cookies = { refresh_token: 'test-refresh-token' };
    const res = mockResponse();
    await authController.logout(req, res, mockNext);
    expect(res.clearCookie).toHaveBeenCalledWith('access_token');
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('Should handle token refresh request', async () => {
    const req = mockRequest();
    req.cookies = { refresh_token: 'test-refresh-token' };
    const res = mockResponse();
    await authController.refreshToken(req, res, mockNext);
    expect(res.cookie).toHaveBeenCalledWith('access_token', expect.any(String), expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('Authentication Edge Cases', () => {
  beforeEach(() => {
    setupMocks();
  });

  it('Should handle account lockout after multiple failed attempts', async () => {
    // TODO: Implement account lockout test
  });

  it('Should prevent registration with incomplete data', async () => {
    // TODO: Implement incomplete registration data test
  });

  it('Should handle concurrent authentication requests', async () => {
    // TODO: Implement concurrent authentication test
  });

  it('Should maintain session data during token refresh', async () => {
    // TODO: Implement session data persistence test
  });

  it('Should properly invalidate all sessions on password change', async () => {
    // TODO: Implement session invalidation test
  });
});

function generateTestUser(overrides: Partial<typeof testUser> = {}): typeof testUser {
  // Create default user object
  const defaultUser = {
    email: 'test@example.com',
    password: 'P@$$wOrd123',
    fullName: 'Test User',
    userType: UserType.CREATOR,
  };

  // Override default properties with any provided in the overrides parameter
  return { ...defaultUser, ...overrides };
}