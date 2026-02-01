# 📡 API Routes Documentation

Complete reference for all API endpoints in the Typo server application.

---

## Table of Contents
- [Authentication Routes](#authentication-routes)
- [User Management Routes](#user-management-routes)
- [Password Recovery Routes](#password-recovery-routes)
- [Analytics Routes](#analytics-routes)
- [Status Codes Reference](#status-codes-reference)

---

## Authentication Routes

Base Path: `/api/users`

### 1. Register User

**Endpoint:** `POST /api/users/register`

**Description:** Create a new user account with email, username, and password.

**Authentication:** None required

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "rememberMe": false
}
```

**Field Validation:**
- `email`: Valid email format (validated by Zod)
- `username`: 3-20 characters, alphanumeric with underscore
- `password`: Min 8 characters, must contain uppercase, lowercase, number, special char
- `confirmPassword`: Must match password
- `firstName`: 2-30 characters
- `lastName`: 2-30 characters
- `rememberMe`: Boolean (optional, default: false)

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "email": "user@example.com"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7 days"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed (invalid email/username/password format)
- `400 Bad Request`: Passwords do not match
- `409 Conflict`: Email or username already exists
- `500 Internal Server Error`: Server error

**Side Effects:**
- Creates User document in MongoDB
- Creates Analytics document for user
- Sets username in Redis (1 hour TTL)
- Pushes signup email to mail queue (priority 8)

---

### 2. Login User

**Endpoint:** `POST /api/users/login`

**Description:** Authenticate existing user with email/username and password.

**Authentication:** None required

**Request Body:**
```json
{
  "identifier": "johndoe",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Field Validation:**
- `identifier`: Can be email or username (Zod validates format)
- `password`: Required string
- `rememberMe`: Boolean (optional, default: false)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "email": "user@example.com"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "30 days"
    }
  }
}
```

**Token Expiry:**
- `rememberMe: false` → Access token: 7 days, Refresh token: 90 days
- `rememberMe: true` → Access token: 30 days, Refresh token: 90 days

**Error Responses:**
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Invalid credentials (user not found or wrong password)
- `500 Internal Server Error`: Server error

**Side Effects:**
- Updates `lastLogin` timestamp in User document

---

## User Management Routes

Base Path: `/api/users`

### 3. Check Username Availability

**Endpoint:** `GET /api/users/check-username`

**Description:** Check if a username is available before registration.

**Authentication:** None required

**Query Parameters:**
```
?username=johndoe
```

**Success Response (200) - Available:**
```json
{
  "success": true,
  "available": true,
  "message": "Username is available"
}
```

**Success Response (200) - Taken:**
```json
{
  "success": true,
  "available": false,
  "message": "Username is already taken"
}
```

**Error Responses:**
- `400 Bad Request`: Username is required or invalid format
- `500 Internal Server Error`: Server error

**Side Effects:**
- If available, sets username in Redis with 1 hour TTL (prevents race conditions)

---

### 4. Update Username

**Endpoint:** `PUT /api/users/update-username`

**Description:** Change the username of an authenticated user.

**Authentication:** Required (JWT middleware)

**Request Headers:**
```json
{
  "token": "{\"access_token\":\"...\",\"refresh_token\":\"...\"}"
}
```

**Request Body:**
```json
{
  "newUsername": "johndoe123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Username updated successfully",
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe123",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400 Bad Request`: New username is required or invalid format
- `401 Unauthorized`: No token provided or invalid token
- `403 Forbidden`: Invalid token
- `404 Not Found`: User not found
- `409 Conflict`: Username is already taken
- `500 Internal Server Error`: Server error

**Side Effects:**
- Updates username in User document
- Updates username in Analytics document
- Sets new username in Redis (1 hour TTL)

---

### 5. Delete Account

**Endpoint:** `DELETE /api/users/delete-account`

**Description:** Permanently delete user account and all associated data.

**Authentication:** Required (JWT middleware)

**Request Headers:**
```json
{
  "token": "{\"access_token\":\"...\",\"refresh_token\":\"...\"}"
}
```

**Request Body:**
```json
{
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed or passwords do not match
- `401 Unauthorized`: No token provided or invalid password
- `403 Forbidden`: Invalid token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**Side Effects:**
- Deletes User document from MongoDB
- Deletes Analytics document (cascading delete)
- Pushes delete confirmation email to mail queue (priority 5)

---

## Password Recovery Routes

Base Path: `/api/users`

### 6. Send OTP

**Endpoint:** `POST /api/users/send-otp`

**Description:** Send a 6-digit OTP to user's email for password reset.

**Authentication:** None required

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email format
- `404 Not Found`: Email not found in database
- `500 Internal Server Error`: Server error

**Side Effects:**
- Generates 6-digit random OTP
- Stores OTP in Redis with 120 seconds TTL
- OTP structure: `{otp: "123456", attempts: 0}`
- Pushes OTP email to mail queue (priority 10 - highest)

**OTP Constraints:**
- TTL: 120 seconds (2 minutes)
- Max Attempts: 3
- Key Pattern: `otp:{email}`

---

### 7. Reset Password

**Endpoint:** `POST /api/users/reset-password`

**Description:** Reset user password using OTP verification.

**Authentication:** None required

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed, passwords don't match, invalid OTP, or OTP expired
- `404 Not Found`: User not found
- `429 Too Many Requests`: Maximum OTP attempts exceeded (3 attempts)
- `500 Internal Server Error`: Server error

**Side Effects:**
- Hashes new password with bcrypt
- Updates password in User document
- Deletes OTP from Redis (successful or max attempts)
- Increments attempt counter on wrong OTP

**OTP Validation Flow:**
1. Check if OTP exists in Redis
2. Verify attempt count < 3
3. Compare OTP values
4. If wrong: increment attempts
5. If correct: hash password, update DB, delete OTP

---

## Analytics Routes

Base Path: `/api/analytics`

### 8. Get User Analytics

**Endpoint:** `GET /api/analytics/user-analytics`

**Description:** Retrieve detailed analytics for authenticated user with populated user data.

**Authentication:** Required (JWT middleware)

**Request Headers:**
```json
{
  "token": "{\"access_token\":\"...\",\"refresh_token\":\"...\"}"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "userData": {
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "email": "user@example.com",
      "lastLogin": {
        "date": "31-01-2026",
        "time": "14:30:45",
        "dateTime": "31-01-2026 14:30:45"
      }
    },
    "analyticsData": {
      "wpm": 85.5,
      "accuracy": 96.8,
      "testTimings": 60,
      "lastTestTaken": {
        "date": "31-01-2026",
        "time": "14:25:12",
        "dateTime": "31-01-2026 14:25:12"
      },
      "totalPar": 42,
      "maxStreak": 7
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: No token provided or invalid token
- `403 Forbidden`: Invalid token
- `404 Not Found`: Analytics not found
- `500 Internal Server Error`: Server error

---

### 9. Get Account Analytics

**Endpoint:** `GET /api/analytics/account-analytics`

**Description:** Retrieve public analytics for any user by username.

**Authentication:** Required (JWT middleware)

**Request Parameters:**
```
/api/analytics/account-analytics/:username
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "wpm": 85.5,
    "accuracy": 96.8,
    "totalPar": 42
  }
}
```

**Error Responses:**
- `401 Unauthorized`: No token provided or invalid token
- `403 Forbidden`: Invalid token
- `404 Not Found`: User or analytics not found
- `500 Internal Server Error`: Server error

---

### 10. Update Analytics

**Endpoint:** `POST /api/analytics/update-analytics`

**Description:** Update user's typing test analytics with daily progress tracking.

**Authentication:** Required (JWT middleware)

**Request Headers:**
```json
{
  "token": "{\"access_token\":\"...\",\"refresh_token\":\"...\"}"
}
```

**Request Body:**
```json
{
  "wpm": 88.5,
  "accuracy": 97.2,
  "testTimings": 60,
  "maxStreak": 8,
  "lastTestTaken": 1738336512000
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Analytics updated successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "wpm": 88.5,
    "accuracy": 97.2,
    "testTimings": 60,
    "maxStreak": 8,
    "lastTestTaken": 1738336512000,
    "totalPar": 43,
    "progress": [
      {
        "date": "2026-01-31",
        "wpm": 86.7,
        "accuracy": 96.9,
        "count": 3
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: No token provided or invalid token
- `403 Forbidden`: Invalid token
- `404 Not Found`: Analytics not found
- `500 Internal Server Error`: Server error

**Progress Tracking Logic:**
- Stores last 10 days of progress
- **Same Day**: Calculates cumulative average
  - `newWpm = (oldWpm * oldCount + newWpm) / (oldCount + 1)`
  - Increments count
- **New Day**: Adds new entry, removes oldest if > 10 days
- Increments `totalPar` by 1

**Cumulative Average Formula:**
```
newValue = (oldValue × oldCount + newValue) / (oldCount + 1)
```

---

### 11. Reset Analytics

**Endpoint:** `PUT /api/analytics/reset-analytics`

**Description:** Reset all analytics to default values for authenticated user.

**Authentication:** Required (JWT middleware)

**Request Headers:**
```json
{
  "token": "{\"access_token\":\"...\",\"refresh_token\":\"...\"}"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Analytics reset successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "wpm": 0,
    "accuracy": 0,
    "testTimings": 0,
    "lastTestTaken": null,
    "totalPar": 0,
    "maxStreak": 0,
    "progress": []
  }
}
```

**Error Responses:**
- `401 Unauthorized`: No token provided or invalid token
- `403 Forbidden`: Invalid token
- `404 Not Found`: Analytics not found
- `500 Internal Server Error`: Server error

---

## Status Codes Reference

### Success Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE requests |
| 201 | Created | Successful POST request creating a resource |

### Client Error Codes

| Code | Meaning | Common Scenarios |
|------|---------|------------------|
| 400 | Bad Request | Validation errors, missing fields, passwords don't match |
| 401 | Unauthorized | Invalid credentials, no token, wrong password |
| 403 | Forbidden | Invalid JWT token (not expired, but malformed) |
| 404 | Not Found | User not found, analytics not found, email not found |
| 409 | Conflict | Username/email already exists, duplicate entry |
| 429 | Too Many Requests | Max OTP attempts exceeded (3 attempts) |

### Server Error Codes

| Code | Meaning | Common Scenarios |
|------|---------|------------------|
| 500 | Internal Server Error | Database errors, unhandled exceptions |
| 503 | Service Unavailable | Redis/RabbitMQ connection issues |

---

## Common Response Patterns

### Success Response Structure
```json
{
  "success": true,
  "message": "Operation description",
  "data": { /* response payload */ }
}
```

### Error Response Structure
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

### Token Refresh Flow
When access token expires but refresh token is valid:
- Response includes new tokens in headers:
  - `New-Access-Token`: New access token
  - `New-Refresh-Token`: New refresh token
- Client should update stored tokens

---

## Authentication Flow

### Token Structure
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Sending Tokens
All protected routes require tokens in header:
```javascript
headers: {
  "token": JSON.stringify({
    access_token: "...",
    refresh_token: "..."
  })
}
```

### Token Payload
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "type": "access",
  "iat": 1738336512,
  "exp": 1738941312,
  "iss": "typo"
}
```

---

## Rate Limiting & Constraints

| Feature | Limit | Description |
|---------|-------|-------------|
| OTP TTL | 120 seconds | OTP expires after 2 minutes |
| OTP Attempts | 3 | Maximum verification attempts |
| Username Cache | 1 hour | Redis TTL for username availability |
| Progress History | 10 days | Maximum days stored in progress array |
| Token Expiry (Standard) | 7 days | Access token without rememberMe |
| Token Expiry (Remember) | 30 days | Access token with rememberMe |
| Refresh Token | 90 days | Universal refresh token expiry |

---

## Queue Priorities

| Queue Type | Action | Priority |
|------------|--------|----------|
| Mail Queue | reset-otp | 10 (Highest) |
| Mail Queue | signup | 8 |
| Mail Queue | delete | 5 |
| Paragraph Queue | load-content | 3 |

**Priority Scale:** 1 (lowest) to 10 (highest)

---

## Timestamp Format

All timestamps use Unix milliseconds:
```javascript
Date.now() // 1738336512000
```

Formatted timestamps (via `formatDateTime` utility):
```json
{
  "date": "31-01-2026",
  "time": "14:30:45",
  "dateTime": "31-01-2026 14:30:45"
}
```

---

**Last Updated:** Febuary 1, 2026  
**API Version:** 1.0.0  
**Base URL:** `http://localhost:8080`
