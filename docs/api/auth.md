# Authentication API Reference

## Overview

This document provides comprehensive documentation for the Authentication API endpoints in the Engagerr platform. The authentication system is built on Supabase Auth with enhanced security controls to support both creator and brand accounts.

Engagerr implements a robust authentication framework with JWT-based access tokens, secure HTTP-only refresh tokens, and optional multi-factor authentication (MFA). The system supports email/password authentication, social login via OAuth providers (Google, Apple), and secure session management.

## Base URL

All authentication endpoints are prefixed with:

```
/api/auth
```

## Authentication Endpoints

### Register User

Creates a new user account (creator or brand).

**Endpoint:** `POST /register`

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| email | string | Required. Valid email address |
| password | string | Required. Must meet password complexity requirements |
| fullName | string | Required. User's full name |
| userType | string | Required. Either 'CREATOR' or 'BRAND' |
| inviteToken | string | Optional. Team invitation token if joining an existing team |

**Response Codes:**

| Code | Description |
|------|-------------|
| 201 | Account created successfully, verification email sent |
| 400 | Validation error in request data |
| 409 | Email already in use |

**Example Request:**

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "creator@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Creator",
  "userType": "CREATOR"
}
```

**Example Response:**

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "message": "Registration successful. Please check your email to verify your account.",
    "userId": "12345678-1234-1234-1234-123456789012"
  },
  "meta": {
    "timestamp": "2023-10-16T10:30:00Z"
  }
}
```

### Login

Authenticates a user with email and password.

**Endpoint:** `POST /login`

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| email | string | Required. User's email address |
| password | string | Required. User's password |
| mfaCode | string | Optional. Required if MFA is enabled for the account |

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | Authentication successful, returns user data and tokens |
| 400 | Validation error in request data |
| 401 | Invalid credentials or MFA code required |
| 403 | Account locked due to too many failed attempts |

**Example Request:**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "creator@example.com",
  "password": "SecurePassword123!"
}
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Set-Cookie: refresh_token=eyJh....; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=2592000

{
  "data": {
    "user": {
      "id": "12345678-1234-1234-1234-123456789012",
      "email": "creator@example.com",
      "fullName": "John Creator",
      "userType": "CREATOR",
      "isVerified": true,
      "mfaEnabled": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": {
    "timestamp": "2023-10-16T10:35:00Z"
  }
}
```

### Verify Email

Verifies a user's email address using the token sent in verification email.

**Endpoint:** `GET /verify-email/:token`

**URL Parameters:**

| Parameter | Description |
|-----------|-------------|
| token | Required. Email verification token |

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | Email successfully verified |
| 400 | Invalid token format |
| 404 | Token not found or expired |

**Example Request:**

```http
GET /api/auth/verify-email/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "message": "Email successfully verified.",
    "redirectUrl": "/login"
  },
  "meta": {
    "timestamp": "2023-10-16T11:00:00Z"
  }
}
```

### Forgot Password

Initiates password reset process by sending email with reset link.

**Endpoint:** `POST /forgot-password`

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| email | string | Required. User's registered email address |

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | Password reset email sent (returns 200 even if email not found for security) |
| 400 | Validation error in request data |
| 429 | Rate limit exceeded for password reset requests |

**Example Request:**

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "creator@example.com"
}
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "message": "If a matching account was found, a password reset email has been sent."
  },
  "meta": {
    "timestamp": "2023-10-16T11:30:00Z"
  }
}
```

### Reset Password

Sets new password using reset token.

**Endpoint:** `POST /reset-password`

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| token | string | Required. Password reset token received via email |
| newPassword | string | Required. New password that meets complexity requirements |

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | Password successfully reset |
| 400 | Invalid token or password does not meet requirements |
| 404 | Token not found or expired |

**Example Request:**

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePassword456!"
}
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "message": "Password successfully reset. You can now log in with your new password.",
    "redirectUrl": "/login"
  },
  "meta": {
    "timestamp": "2023-10-16T12:00:00Z"
  }
}
```

### OAuth Callback

OAuth callback endpoint for social login providers.

**Endpoint:** `GET /oauth/callback/:provider`

**URL Parameters:**

| Parameter | Description |
|-----------|-------------|
| provider | Required. OAuth provider (google, apple) |

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| code | Authorization code from OAuth provider |
| state | State parameter for CSRF protection |
| error | Error information if OAuth flow failed |

**Response Codes:**

| Code | Description |
|------|-------------|
| 302 | Redirect to frontend with success or error |
| 400 | Invalid OAuth request parameters |
| 401 | OAuth authentication failed |

**Example Request:**

```http
GET /api/auth/oauth/callback/google?code=4/0AWtgzh4bxmsDpPRvU...&state=af0ifjsldkj
```

**Example Response:**

```http
HTTP/1.1 302 Found
Location: https://engagerr.com/auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Set-Cookie: refresh_token=eyJh....; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=2592000
```

### Logout

Logs out current user by invalidating tokens.

**Endpoint:** `POST /logout`

**Authentication:** Requires valid JWT token

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | Successfully logged out |
| 401 | Not authenticated |

**Example Request:**

```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=0

{
  "data": {
    "message": "Successfully logged out"
  },
  "meta": {
    "timestamp": "2023-10-16T14:00:00Z"
  }
}
```

### Refresh Token

Refreshes authentication tokens with a valid refresh token.

**Endpoint:** `POST /refresh-token`

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| refreshToken | string | Optional. Refresh token if not provided in HTTP-only cookie |

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | New access and refresh tokens |
| 401 | Invalid or expired refresh token |

**Example Request:**

```http
POST /api/auth/refresh-token
Cookie: refresh_token=eyJh....
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Set-Cookie: refresh_token=eyJh....; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=2592000

{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": {
    "timestamp": "2023-10-16T14:30:00Z"
  }
}
```

### Get Current User

Retrieves current authenticated user information.

**Endpoint:** `GET /me`

**Authentication:** Requires valid JWT token

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | Current user data including profile type |
| 401 | Not authenticated |

**Example Request:**

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "user": {
      "id": "12345678-1234-1234-1234-123456789012",
      "email": "creator@example.com",
      "fullName": "John Creator",
      "userType": "CREATOR",
      "isVerified": true,
      "mfaEnabled": true,
      "lastLogin": "2023-10-16T10:35:00Z",
      "createdAt": "2023-10-01T09:00:00Z"
    }
  },
  "meta": {
    "timestamp": "2023-10-16T15:00:00Z"
  }
}
```

### MFA Setup

Initiates multi-factor authentication setup.

**Endpoint:** `POST /mfa/setup`

**Authentication:** Requires valid JWT token

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | MFA secret and QR code for authenticator app |
| 401 | Not authenticated |
| 409 | MFA already enabled |

**Example Request:**

```http
POST /api/auth/mfa/setup
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "message": "Scan this QR code with your authenticator app, then verify setup with the generated code."
  },
  "meta": {
    "timestamp": "2023-10-16T15:30:00Z"
  }
}
```

### MFA Verify

Verifies and activates MFA setup.

**Endpoint:** `POST /mfa/verify`

**Authentication:** Requires valid JWT token

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| code | string | Required. Verification code from authenticator app |

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | MFA successfully activated with recovery codes |
| 400 | Invalid verification code |
| 401 | Not authenticated |

**Example Request:**

```http
POST /api/auth/mfa/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "code": "123456"
}
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "message": "MFA successfully activated.",
    "recoveryCodes": [
      "ABCD-EFGH-IJKL-MNOP",
      "QRST-UVWX-YZ12-3456",
      "7890-ABCD-EFGH-IJKL",
      "MNOP-QRST-UVWX-YZ12",
      "3456-7890-ABCD-EFGH",
      "IJKL-MNOP-QRST-UVWX"
    ],
    "recoveryCodesWarning": "Store these recovery codes in a secure location. Each code can only be used once to restore access if you lose your authenticator device."
  },
  "meta": {
    "timestamp": "2023-10-16T15:35:00Z"
  }
}
```

### MFA Disable

Disables MFA for user account.

**Endpoint:** `POST /mfa/disable`

**Authentication:** Requires valid JWT token

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| password | string | Required. Current password for security verification |

**Response Codes:**

| Code | Description |
|------|-------------|
| 200 | MFA successfully disabled |
| 400 | Invalid password |
| 401 | Not authenticated |

**Example Request:**

```http
POST /api/auth/mfa/disable
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "password": "SecurePassword123!"
}
```

**Example Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "message": "MFA has been successfully disabled for your account."
  },
  "meta": {
    "timestamp": "2023-10-16T16:00:00Z"
  }
}
```

## Error Handling

All API endpoints follow a standardized error response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error context information",
    "path": "/api/auth/endpoint",
    "timestamp": "2023-10-16T12:30:45Z",
    "validationErrors": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| BAD_REQUEST | Invalid request format or validation failure |
| UNAUTHORIZED | Missing or invalid authentication |
| FORBIDDEN | Valid authentication but insufficient permissions |
| NOT_FOUND | Requested resource not found |
| VALIDATION_ERROR | Request failed specific validation rules |
| CONFLICT | Request conflicts with existing data |
| RATE_LIMIT_EXCEEDED | Too many requests in specified time period |
| INTERNAL_SERVER_ERROR | Server encountered unexpected error |

## Security Considerations

### Token Handling

Access tokens should be stored securely and included in the Authorization header for all authenticated requests. Refresh tokens are automatically handled via HTTP-only cookies.

```javascript
// Example of setting the Authorization header for authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`
  };
  
  return fetch(url, {
    ...options,
    headers
  });
};
```

### MFA Best Practices

Multi-factor authentication is recommended for all accounts and required for financial operations or team administrator roles. When implementing MFA in your client application:

1. Guide users through the setup process with clear instructions
2. Emphasize the importance of securely storing recovery codes
3. Provide easy access to disable MFA if needed (with appropriate security verification)
4. Present clear error messages for invalid MFA codes

### Rate Limiting

All authentication endpoints implement rate limiting to prevent abuse. Excessive failed attempts will temporarily lock an account.

Current rate limits:
- Login: 5 attempts per 15 minutes per IP address
- Password reset: 3 attempts per 60 minutes per account
- MFA verification: 5 attempts per 15 minutes per account

### Session Management

Sessions automatically expire after 4 hours of inactivity. Users can have multiple active sessions which can be viewed and managed through the profile settings.

The refresh token mechanism allows for maintaining long-term sessions (30 days) without requiring frequent re-authentication, while the shorter-lived access token (4 hours) limits the impact of token theft.