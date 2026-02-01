# 🛡️ Middleware & Error Handling Documentation

Complete guide to middleware architecture, JWT authentication, and error handling in Typo server.

---

## Table of Contents
- [Overview](#overview)
- [JWT Authentication Middleware](#jwt-authentication-middleware)
- [Error Middleware](#error-middleware)
- [Error Handler](#error-handler)
- [Custom Error Class](#custom-error-class)
- [Request Flow](#request-flow)

---

## Overview

Typo implements **layered middleware** for request processing:
1. **Express.json()** - Parse JSON request bodies
2. **Route Middleware** - JWT authentication on protected routes
3. **Controller Logic** - Request handling and validation
4. **Error Middleware** - Global error handling

---

## JWT Authentication Middleware

**File:** `middleware/middleware.js`

### Purpose
Protect routes requiring user authentication by:
- ✅ Verifying JWT access token
- ✅ Automatically refreshing expired tokens
- ✅ Extracting userId from token payload
- ✅ Blocking invalid/expired tokens

---

### Implementation

```javascript
import jwtHelper from '../auth/jwt.js';

const middleware = async (req, res, next) => {
  try {
    // Extract token from headers
    const token = JSON.parse(req.headers['token']);
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Unauthorized - No token provided' 
      });
    }
    
    // Verify access token
    let verification = await jwtHelper.verifyToken(token.access_token);
    
    // If expired, attempt token refresh
    if (!verification.valid && verification.expired) {
      try {
        const newTokens = await jwtHelper.renewJWT(token.refresh_token);
        
        // Send new tokens in response headers
        res.set('New-Access-Token', newTokens.accessToken);
        res.set('New-Refresh-Token', newTokens.refreshToken);
      }
      catch (error) {
        return res.status(401).json({
          error: 'Session expired. Please sign in again.',
          code: 'SESSION_EXPIRED'
        });
      }
    }
    // If invalid (not expired), reject
    else if (!verification.valid) {
      return res.status(403).json({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    // Attach userId to request object
    req.userId = verification.decoded.userId;
    
    // Continue to next middleware/controller
    next();
  }
  catch (err) {
    return res.status(500).json({ 
      message: 'Internal Server Error' 
    });
  }
};

export default middleware;
```

---

### Token Flow

```
┌───────────────────────────────────────────────────────────────────────┐
│  CLIENT REQUEST                                                       │
│  Headers: { token: JSON.stringify({ access_token, refresh_token }) }  │
└───────────────────────┬───────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  1. EXTRACT TOKEN                                           │
│     Parse JSON from headers['token']                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  2. VERIFY ACCESS TOKEN                                     │
│     jwtHelper.verifyToken(access_token)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
┌───────────▼──────────┐ ┌──────────▼─────────────────────────┐
│  VALID               │ │  EXPIRED                           │
│  ✓ Extract userId    │ │  ↓ Try refresh with refresh_token  │
│  ✓ req.userId = ...  │ │  ↓ jwtHelper.renewJWT()            │
│  ✓ next()            │ │  ↓ Send new tokens in headers      │
└──────────────────────┘ │  ✓ req.userId = decoded.userId     │
                         │  ✓ next()                          │
                         └────────────────────────────────────┘
            │
┌───────────▼──────────┐
│  INVALID             │
│  ✗ Return 403        │
│  error: Invalid token│
└──────────────────────┘
```

---

### Usage in Routes

```javascript
import middleware from '../middleware/middleware.js';
import userController from '../controllers/userController.js';

// Public route (no middleware)
router.post('/login', authController.loginUser);

// Protected route (with middleware)
router.put('/update-username', middleware, userController.changeUsername);
router.delete('/delete-account', middleware, userController.deleteAccount);
```

**Protected Routes:**
- PUT `/api/users/update-username`
- DELETE `/api/users/delete-account`
- GET `/api/analytics/user-analytics`
- GET `/api/analytics/account-analytics/:username`
- POST `/api/analytics/update-analytics`
- PUT `/api/analytics/reset-analytics`

**Public Routes:**
- POST `/api/users/register`
- POST `/api/users/login`
- POST `/api/users/send-otp`
- POST `/api/users/reset-password`
- GET `/api/users/check-username`

---

### Token Structure

**Request Headers:**
```json
{
  "token": "{\"access_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",\"refresh_token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"}"
}
```

**Token Payload:**
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

### Token Refresh Response

When access token expires but refresh token is valid:

**Response Headers:**
```
New-Access-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
New-Refresh-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Client Responsibility:** Update stored tokens with new values

---

### Error Responses

#### 1. No Token Provided
```json
{
  "message": "Unauthorized - No token provided"
}
```
**Status:** 401 Unauthorized

---

#### 2. Expired Session (Refresh Token Invalid)
```json
{
  "error": "Session expired. Please sign in again.",
  "code": "SESSION_EXPIRED"
}
```
**Status:** 401 Unauthorized

**Action:** Client should redirect to login page

---

#### 3. Invalid Token
```json
{
  "error": "Invalid token",
  "code": "TOKEN_INVALID"
}
```
**Status:** 403 Forbidden

**Reason:** Token is malformed or signature doesn't match

---

## Error Middleware

**File:** `middleware/errorMiddleware.js`

### Purpose
Global error handler for all unhandled errors in controllers.

---

### Implementation

```javascript
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorMiddleware;
```

---

### Features
- ✅ Standardized error response format
- ✅ Custom status codes
- ✅ Stack trace in development only
- ✅ Always returns JSON

---

### Usage

```javascript
// server.js
import errorMiddleware from './middleware/errorMiddleware.js';

app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error middleware MUST be last
app.use(errorMiddleware);
```

**Important:** Error middleware must be registered **after all routes**.

---

### Error Response Format

**Production:**
```json
{
  "success": false,
  "message": "User not found",
  "statusCode": 404
}
```

**Development:**
```json
{
  "success": false,
  "message": "User not found",
  "statusCode": 404,
  "stack": "Error: User not found\n    at userController.js:42:15\n    ..."
}
```

---

## Error Handler

**File:** `error/errorHandler.js`

### Purpose
Transform various error types into **AppError** instances with appropriate status codes and messages.

---

### Supported Error Types

#### 1. Cast Error (Invalid ObjectId)
```javascript
if (err.name === "CastError") {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
}
```

**Example:**
```
Input: userId = "invalid-id"
Output: "Invalid _id: invalid-id" (400)
```

---

#### 2. Validation Error (Mongoose Schema)
```javascript
if (err.name === "ValidationError") {
  const messages = Object.values(err.errors)
    .map((error) => error.message)
    .join(", ");
  return new AppError(messages, 400);
}
```

**Example:**
```
Input: username = "ab" (min: 3)
Output: "Username must be at least 3 characters" (400)
```

---

#### 3. Duplicate Key Error (Unique Constraint)
```javascript
if (err.code === 11000) {
  const field = Object.keys(err.keyPattern)[0];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  return new AppError(message, 409);
}
```

**Example:**
```
Input: email = "existing@example.com"
Output: "Email already exists" (409)
```

---

#### 4. JWT Errors

**Invalid Token:**
```javascript
if (err.name === "JsonWebTokenError") {
  return new AppError("Invalid token", 401);
}
```

**Expired Token:**
```javascript
if (err.name === "TokenExpiredError") {
  return new AppError("Token expired", 401);
}
```

---

#### 5. MongoDB Errors

**Connection Error:**
```javascript
if (err.name === "MongoServerError") {
  if (err.message.includes("connection")) {
    return new AppError("Database connection error", 503);
  }
}
```

**Permission Denied:**
```javascript
if (err.code === 13) {
  return new AppError("Permission denied on database operation", 403);
}
```

---

#### 6. Redis Errors

```javascript
if (err.name === "ReplyError" || err.name === "RedisError") {
  return new AppError("Redis error occurred", 503);
}

if (err.code === "ECONNREFUSED" && err.message.includes("redis")) {
  return new AppError("Redis connection refused", 503);
}
```

---

#### 7. RabbitMQ Errors

```javascript
if (err.message.includes("amqp")) {
  return new AppError("RabbitMQ error occurred", 503);
}

if (err.code === "ECONNREFUSED" && err.message.includes("rabbit")) {
  return new AppError("RabbitMQ connection refused", 503);
}
```

---

### Complete Implementation

```javascript
import AppError from "./AppError.js";

const errorHandler = (err) => {
  // Cast Error
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
  }

  // Validation Error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
    return new AppError(messages, 400);
  }

  // Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return new AppError(message, 409);
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    return new AppError("Invalid token", 401);
  }
  if (err.name === "TokenExpiredError") {
    return new AppError("Token expired", 401);
  }

  // MongoDB Errors
  if (err.name === "MongoServerError") {
    if (err.message.includes("connection")) {
      return new AppError("Database connection error", 503);
    }
    if (err.code === 13) {
      return new AppError("Permission denied on database operation", 403);
    }
    return new AppError("Database error occurred", 500);
  }

  // Redis Errors
  if (err.name === "ReplyError" || err.name === "RedisError") {
    return new AppError("Redis error occurred", 503);
  }

  // RabbitMQ Errors
  if (err.message && err.message.includes("amqp")) {
    return new AppError("RabbitMQ error occurred", 503);
  }

  // Return as is if already AppError
  if (err instanceof AppError) {
    return err;
  }

  // Generic fallback
  return new AppError(err.message || "An error occurred", err.statusCode || 500);
};

export default errorHandler;
```

---

## Custom Error Class

**File:** `error/AppError.js`

### Purpose
Standardized error class for operational errors (expected errors that should be handled gracefully).

---

### Implementation

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
```

---

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `message` | String | Human-readable error message |
| `statusCode` | Number | HTTP status code (400, 401, 404, etc.) |
| `isOperational` | Boolean | True for expected errors, false for programmer errors |
| `stack` | String | Stack trace (inherited from Error) |

---

### Usage in Controllers

```javascript
import AppError from '../error/AppError.js';

const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.userId;
    
    if (!password) {
      return next(new AppError("Password is required", 400));
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    
    const isMatch = await passwordHash.decryptPassword(password, user.password);
    if (!isMatch) {
      return next(new AppError("Invalid password", 401));
    }
    
    await userService.deleteUserAccount(userId);
    
    res.status(200).json({
      success: true,
      message: "Account deleted successfully"
    });
  }
  catch (err) {
    next(errorHandler(err));
  }
};
```

---

### Error Flow

```
┌─────────────────────────────────────────────────────────────┐
│  CONTROLLER                                                 │
│  try {                                                      │
│    if (!user) {                                             │
│      return next(new AppError("User not found", 404));      │
│    }                                                        │
│  } catch (err) {                                            │
│    next(errorHandler(err));                                 │
│  }                                                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  ERROR HANDLER                                              │
│  Transform error into AppError if needed                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  ERROR MIDDLEWARE                                           │
│  res.status(err.statusCode).json({                          │
│    success: false,                                          │
│    message: err.message,                                    │
│    statusCode: err.statusCode                               │
│  })                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Request Flow

### Complete Request Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. CLIENT REQUEST                                          │
│     POST /api/users/update-username                         │
│     Headers: { token: "..." }                               │
│     Body: { newUsername: "johndoe123" }                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  2. EXPRESS.JSON() MIDDLEWARE                               │
│     Parse JSON body → req.body = { newUsername: "..." }     │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  3. ROUTE MATCHING                                          │
│     Match route: PUT /api/users/update-username             │
│     Middleware chain: [middleware, userController.changeUsername]│
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  4. JWT MIDDLEWARE (middleware.js)                          │
│     • Verify token                                          │
│     • Refresh if expired                                    │
│     • Attach userId to req.userId                           │
│     • Call next()                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  5. CONTROLLER (userController.js)                          │
│     • Validate input (Zod)                                  │
│     • Check business rules                                  │
│     • Call service layer                                    │
│     • Format response                                       │
│     • If error: next(errorHandler(err))                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
┌───────────▼──────────┐ ┌─────────▼──────────────────────────┐
│  SUCCESS PATH        │ │  ERROR PATH                        │
│  res.status(200)     │ │  next(new AppError(...))           │
│  .json({ ... })      │ │         ↓                          │
└──────────────────────┘ │  errorHandler(err)                 │
                         │         ↓                          │
                         │  errorMiddleware                   │
                         │         ↓                          │
                         │  res.status(err.statusCode)        │
                         │  .json({ success: false, ... })    │
                         └────────────────────────────────────┘
```

---

## Common Error Scenarios

### Scenario 1: Invalid Input (Zod Validation)

**Request:**
```json
POST /api/users/register
{
  "email": "invalid-email",
  "username": "ab",
  "password": "weak"
}
```

**Response:**
```json
{
  "success": false,
  "message": "Invalid email format",
  "statusCode": 400
}
```

---

### Scenario 2: Unauthorized (No Token)

**Request:**
```
PUT /api/users/update-username
Headers: {} (missing token)
```

**Response:**
```json
{
  "message": "Unauthorized - No token provided"
}
```
**Status:** 401

---

### Scenario 3: Expired Session

**Request:**
```
PUT /api/users/update-username
Headers: { token: "{access_token: expired, refresh_token: expired}" }
```

**Response:**
```json
{
  "error": "Session expired. Please sign in again.",
  "code": "SESSION_EXPIRED"
}
```
**Status:** 401

---

### Scenario 4: Duplicate Entry

**Request:**
```json
POST /api/users/register
{
  "email": "existing@example.com",
  "username": "existinguser",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": false,
  "message": "Email already exists",
  "statusCode": 409
}
```

---

### Scenario 5: Service Unavailable

**Request:**
```
POST /api/users/send-otp
(Redis is down)
```

**Response:**
```json
{
  "success": false,
  "message": "Redis error occurred",
  "statusCode": 503
}
```

---

## Best Practices

### ✅ Do's

1. **Always use try-catch in controllers**
   ```javascript
   const controller = async (req, res, next) => {
     try {
       // Logic
     } catch (err) {
       next(errorHandler(err));
     }
   };
   ```

2. **Use AppError for expected errors**
   ```javascript
   if (!user) {
     return next(new AppError("User not found", 404));
   }
   ```

3. **Pass errors to next() middleware**
   ```javascript
   return next(new AppError(message, statusCode));
   ```

4. **Validate inputs before processing**
   ```javascript
   const validation = validateInput(req.body);
   if (!validation.success) {
     return next(new AppError(validation.message, 400));
   }
   ```

5. **Use appropriate status codes**
   - 400: Bad Request (validation errors)
   - 401: Unauthorized (authentication failed)
   - 403: Forbidden (insufficient permissions)
   - 404: Not Found (resource doesn't exist)
   - 409: Conflict (duplicate entry)
   - 500: Internal Server Error
   - 503: Service Unavailable (external service down)

---

### ❌ Don'ts

1. **Don't throw errors directly**
   ```javascript
   // Bad
   throw new Error("Something went wrong");
   
   // Good
   return next(new AppError("Something went wrong", 500));
   ```

2. **Don't send responses after calling next()**
   ```javascript
   // Bad
   next(new AppError("Error", 400));
   res.status(200).json({ ... });  // This will cause error
   
   // Good
   return next(new AppError("Error", 400));
   ```

3. **Don't expose sensitive information**
   ```javascript
   // Bad
   return next(new AppError(`Database password: ${dbPassword}`, 500));
   
   // Good
   return next(new AppError("Database error occurred", 503));
   ```

4. **Don't forget error middleware**
   ```javascript
   // server.js
   app.use('/api/users', userRoutes);
   app.use(errorMiddleware);  // Must be last
   ```

---

**Last Updated:** Febuary 1, 2026   
**Express Version:** 5.2.1  
**JWT Version:** 9.0.3
