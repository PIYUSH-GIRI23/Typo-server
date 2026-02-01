# 🏗️ Architecture Documentation

Comprehensive guide to the Typo server architecture, design patterns, and folder structure.

---

## Table of Contents
- [Overview](#overview)
- [Architecture Pattern](#architecture-pattern)
- [Folder Structure](#folder-structure)
- [Design Patterns](#design-patterns)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)

---

## Overview

Typo Server is a **Node.js/Express RESTful API** built with a clean, layered architecture following industry best practices. The application manages user authentication, typing test analytics, and real-time data processing using MongoDB, Redis, and RabbitMQ.

### Core Features
- ✅ User authentication with JWT tokens
- ✅ Password recovery via OTP
- ✅ Real-time analytics tracking with daily progress
- ✅ Redis caching for performance
- ✅ RabbitMQ message queuing for async operations
- ✅ Comprehensive error handling
- ✅ Input validation with Zod

---

## Architecture Pattern

### Layered Architecture (MVC + Service Layer)

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT REQUEST                       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 1. ROUTES LAYER                         │
│              (routes/userRoutes.js)                     │
│   • Maps HTTP methods to controller functions           │
│   • Applies middleware (JWT auth)                       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              2. MIDDLEWARE LAYER                        │
│           (middleware/middleware.js)                    │
│   • JWT token verification                              │
│   • Token refresh if expired                            │
│   • Extracts userId from token                          │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              3. CONTROLLER LAYER                        │
│        (controllers/authController.js)                  │
│   • Input validation (Zod schemas)                      │
│   • Request/Response handling                           │
│   • Timestamp formatting                                │
│   • Error forwarding to error middleware                │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│               4. SERVICE LAYER                          │
│         (services/auth.service.js)                      │
│   • Business logic implementation                       │
│   • Database operations                                 │
│   • Data transformation                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│               5. MODEL LAYER                            │
│          (models/user.model.js)                         │
│   • Mongoose model definitions                          │
│   • Schema validation rules                             │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│             6. DATABASE (MongoDB)                        │
│   • Persistent data storage                             │
│   • Collections: Users, Analytics                       │
└──────────────────────────────────────────────────────────┘

       ┌────────────────────────────────────┐
       │      PARALLEL OPERATIONS           │
       │                                    │
       │  ┌──────────────────────────────┐ │
       │  │   Redis Cache                │ │
       │  │   • Username presence        │ │
       │  │   • OTP storage              │ │
       │  │   • User data caching        │ │
       │  └──────────────────────────────┘ │
       │                                    │
       │  ┌──────────────────────────────┐ │
       │  │   RabbitMQ Queues            │ │
       │  │   • Mail queue (email)       │ │
       │  │                              │ │
       │  │   • Paragraph queue (data)   │ │
       │  └──────────────────────────────┘ │
       └────────────────────────────────────┘
```

---

## Folder Structure

### Complete Directory Tree

```
server/
├── server.js                    # Application entry point
├── package.json                 # Dependencies and scripts
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
│
├── auth/                        # Authentication utilities
│   └── jwt.js                   # JWT token generation/verification
│
├── controllers/                 # Request handlers
│   ├── authController.js        # Login, register
│   ├── userController.js        # Username, delete account
│   ├── passwordController.js    # OTP, password reset
│   └── analyticsController.js   # Analytics CRUD operations
│
├── services/                    # Business logic
│   ├── auth.service.js          # User lookup, creation
│   ├── user.service.js          # Username management
│   ├── password.service.js      # Password operations
│   └── analytics.service.js     # Analytics calculations
│
├── models/                      # Mongoose models
│   ├── user.model.js            # User model wrapper
│   └── analytics.model.js       # Analytics model wrapper
│
├── schemas/                     # Mongoose schemas
│   ├── user.schema.js           # User schema definition
│   └── analytics.schema.js      # Analytics schema with progress
│
├── routes/                      # API route definitions
│   ├── userRoutes.js            # /api/users routes
│   └── analyticsRoutes.js       # /api/analytics routes
│
├── middleware/                  # Express middleware
│   ├── middleware.js            # JWT authentication middleware
│   └── errorMiddleware.js       # Global error handler
│
├── error/                       # Error handling
│   ├── AppError.js              # Custom error class
│   └── errorHandler.js          # Error transformer
│
├── init/                        # Service initialization
│   ├── env.js                   # Environment configuration
│   ├── db.js                    # MongoDB connection
│   ├── redis.js                 # Redis connection
│   └── queue.js                 # RabbitMQ connection
│
├── redis/                       # Redis operations
│   ├── user.js                  # Username cache, leaderboard
│   └── otp.js                   # OTP storage and validation
│
├── queue/                       # RabbitMQ operations
│   ├── mailQueue.js             # Email notification queue
│   └── paragraphQueue.js        # Content delivery queue
│
├── utils/                       # Utility functions
│   ├── authValidation.js        # Zod validation schemas
│   ├── passwordHash.js          # Bcrypt operations
│   ├── otpUtil.js               # OTP generation
│   ├── formatDateTIme.js        # Timestamp formatting
│   └── regexValidation.js       # Regex patterns
│
├── helper/                      # Helper functions
│   └── paragraphLoader.js       # Load test content to queue
│
├── data/                        # Static test content
│   ├── quote.js                 # Quote paragraphs (10 items)
│   └── paragraph.js             # Typing test paragraphs
│
└── docs/                        # Documentation
    ├── API_ROUTES.md            # API endpoint reference
    ├── ARCHITECTURE.md          # This file
    ├── DATABASE.md              # Schema documentation
    ├── REDIS.md                 # Caching strategy
    ├── QUEUE.md                 # Message queue patterns
    └── MIDDLEWARE.md            # Error handling guide
```

---

## Design Patterns

### 1. Service Layer Pattern

**Purpose:** Separate business logic from request handling.

**Implementation:**
```javascript
// Controller (thin layer)
const loginUser = async (req, res, next) => {
  try {
    const user = await authService.findUserByEmailOrUsername(identifier);
    // ... response logic
  } catch (err) {
    next(errorHandler(err));
  }
};

// Service (business logic)
const findUserByEmailOrUsername = async (identifier) => {
  const isEmail = regex.EMAIL_REGEX.test(identifier);
  return User.findOne({ $or: [{ email }, { username }] });
};
```

**Benefits:**
- Controllers remain thin and focused on HTTP
- Services can be reused across controllers
- Easier to test business logic

---

### 2. Repository Pattern

**Purpose:** Abstract database operations behind a consistent interface.

**Implementation:**
```javascript
// models/user.model.js (Repository)
import userSchema from '../schemas/user.schema.js';
const User = mongoose.model('User', userSchema);
export default User;

// Usage in services
import User from '../models/user.model.js';
const user = await User.findOne({ username });
```

**Benefits:**
- Decouples business logic from database implementation
- Easy to swap database technologies
- Centralized query logic

---

### 3. Factory Pattern (Queue Connections)

**Purpose:** Manage singleton connections to external services.

**Implementation:**
```javascript
// init/queue.js
let connection = null;
let channel = null;

export const connectMQ = async () => {
  if (channel) return channel; // Reuse existing connection
  
  connection = await amqp.connect(url);
  channel = await connection.createChannel();
  return channel;
};
```

**Benefits:**
- Single connection per service
- Connection reuse across requests
- Proper resource management

---

### 4. Error Handling Pattern

**Purpose:** Centralized error transformation and HTTP response.

**Implementation:**
```javascript
// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Error transformer
const errorHandler = (err) => {
  if (err.name === "CastError") {
    return new AppError(`Invalid ${err.path}`, 400);
  }
  return err;
};

// Global error middleware
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message
  });
});
```

**Benefits:**
- Consistent error responses
- Proper HTTP status codes
- Operational vs programmer errors

---

### 5. Middleware Chain Pattern

**Purpose:** Compose reusable request processing functions.

**Implementation:**
```javascript
// routes/userRoutes.js
router.put('/update-username', 
  middleware,                    // JWT verification
  userController.changeUsername  // Route handler
);

// middleware/middleware.js
const middleware = async (req, res, next) => {
  const token = JSON.parse(req.headers['token']);
  const verification = await jwtHelper.verifyToken(token.access_token);
  
  if (!verification.valid && verification.expired) {
    const newTokens = await jwtHelper.renewJWT(token.refresh_token);
    res.set('New-Access-Token', newTokens.accessToken);
  }
  
  req.userId = verification.decoded.userId;
  next();
};
```

**Benefits:**
- Separation of concerns
- Reusable authentication logic
- Clear request flow

---

### 6. Dependency Injection

**Purpose:** Pass dependencies explicitly to reduce coupling.

**Implementation:**
```javascript
// Bad: Direct import
import { connectRedis } from '../init/redis.js';
const redis = await connectRedis();

// Good: Dependency injection
const setUsername = async (username, redis = await connectRedis()) => {
  await redis.set(`username:${username}`, 1);
};
```

**Benefits:**
- Easier testing (mock dependencies)
- Flexible configuration
- Reduced tight coupling

---

## Data Flow

### 1. User Registration Flow

```
┌──────────────────────────────────────────────────────────────┐
│  POST /api/users/register                                    │
│  Body: { email, username, password, firstName, lastName }    │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  1. CONTROLLER: Validate input with Zod                      │
│     • Check email format                                     │
│     • Validate username (3-20 chars, alphanumeric)           │
│     • Check password complexity                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  2. SERVICE: Check for existing user                         │
│     • Query: User.findOne({ $or: [{ email }, { username }] })│
│     • If exists → Return 409 Conflict                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  3. UTIL: Hash password with bcrypt (salt=10)                │
│     • bcrypt.hash(password, 10)                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  4. DATABASE: Create user document                           │
│     • User.create({ email, username, password, ... })        │
│     • Analytics.create({ userId: user._id })                 │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  5. REDIS: Cache username (TTL: 1 hour)                      │
│     • redis.set("username:{username}", 1, "EX", 3600)        │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  6. QUEUE: Push signup email (priority 8)                    │
│     • mailQueue.push({ mailId, type: "signup", datetime })   │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  7. AUTH: Generate JWT tokens                                │
│     • accessToken: 7 days (or 30 with rememberMe)            │
│     • refreshToken: 90 days                                  │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  RESPONSE: 201 Created                                       │
│  { success: true, data: { user, tokens } }                   │
└──────────────────────────────────────────────────────────────┘
```

---

### 2. Analytics Update Flow (Daily Progress)

```
┌──────────────────────────────────────────────────────────────┐
│  POST /api/analytics/update-analytics                        │
│  Body: { wpm: 88, accuracy: 97, testTimings: 60, ... }       │
│  Headers: { token: { access_token, refresh_token } }         │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  1. MIDDLEWARE: Verify JWT token                             │
│     • Extract userId from token payload                      │
│     • Refresh token if expired                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  2. SERVICE: Fetch current analytics                         │
│     • Analytics.findOne({ userId })                          │
│     • Extract existing progress array                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  3. CALCULATION: Determine if same day or new day            │
│     • today = new Date().toISOString().split('T')[0]         │
│     • lastEntry = progress[progress.length - 1]              │
│     • isFirstTestToday = !lastEntry || lastEntry.date!==today│
└────────────────────────┬─────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
┌───────────▼──────────┐   ┌─────────▼──────────────────────┐
│  NEW DAY             │   │  SAME DAY                      │
│  • Create new entry  │   │  • Calculate cumulative avg    │
│  • If >10 days,      │   │    newWpm = (oldWpm × count    │
│    remove oldest     │   │    + newWpm) / (count + 1)     │
│  • Push to array     │   │  • Increment count             │
└───────────┬──────────┘   └─────────┬──────────────────────┘
            │                         │
            └────────────┬────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  4. DATABASE: Update analytics document                      │
│     • Analytics.findOneAndUpdate(                            │
│         { userId },                                          │
│         { wpm, accuracy, progress, $inc: { totalPar: 1 } }   │
│       )                                                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  RESPONSE: 200 OK                                            │
│  { success: true, data: updatedAnalytics }                   │
└──────────────────────────────────────────────────────────────┘
```

---

### 3. Password Reset Flow (OTP)

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 1: Send OTP                                           │
│  POST /api/users/send-otp                                    │
│  Body: { email: "user@example.com" }                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  1. UTIL: Generate 6-digit OTP                               │
│     • Math.floor(100000 + Math.random() * 900000)            │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  2. REDIS: Store OTP with TTL                                │
│     • redis.set("otp:{email}",                               │
│         JSON.stringify({ otp, attempts: 0 }),                │
│         "EX", 120)                                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  3. QUEUE: Push OTP email (priority 10 - highest)            │
│     • mailQueue.push({ mailId, type: "reset-otp", ... })     │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  RESPONSE: 200 OK { message: "OTP sent successfully" }       │
└──────────────────────────────────────────────────────────────┘

                    ⏱️  USER HAS 120 SECONDS
                    
┌──────────────────────────────────────────────────────────────┐
│  PHASE 2: Reset Password                                     │
│  POST /api/users/reset-password                              │
│  Body: { email, otp: "123456", password, confirmPassword }   │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  1. REDIS: Fetch OTP data                                    │
│     • const stored = redis.get("otp:{email}")                │
│     • If !stored → Return 400 "OTP expired"                  │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  2. VALIDATE: Check attempt count                            │
│     • If stored.attempts >= 3 → Return 429 "Max attempts"    │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  3. VERIFY: Compare OTP                                      │
│     • If stored.otp !== otp:                                 │
│       - Increment attempts in Redis                          │
│       - Return 400 "Invalid OTP"                             │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  4. UTIL: Hash new password                                  │
│     • bcrypt.hash(password, 10)                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  5. DATABASE: Update user password                           │
│     • User.findOneAndUpdate({ email }, { password })         │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  6. REDIS: Delete OTP                                        │
│     • redis.del("otp:{email}")                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  RESPONSE: 200 OK { message: "Password reset successfully" } │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express.js** | 5.2.1 | Web framework |
| **MongoDB** | 9.1.5 (Mongoose) | Primary database |
| **Redis** | 5.9.2 (ioredis) | Caching and temporary storage |
| **RabbitMQ** | 0.10.9 (amqplib) | Message queue |

### Authentication & Security

| Library | Purpose |
|---------|---------|
| **jsonwebtoken** | JWT token generation/verification |
| **bcryptjs** | Password hashing (salt=10) |
| **zod** | Input validation and sanitization |

### Utilities

| Library | Purpose |
|---------|---------|
| **dotenv** | Environment variable management |

---

## Configuration Management

### Environment Variables (init/env.js)

```javascript
export const env = {
  env: 'development',           // NODE_ENV
  port: 8080,                   // Server port
  
  mongoURI: 'mongodb://...',    // DB connection (local/cloud)
  
  jwt: {
    secret: '...',              // JWT signing secret
    accessTokenExpire: '7d',    // Standard token expiry
    accessTokenLongExpire: '30d', // Remember me expiry
    refreshTokenExpire: '90d',  // Refresh token expiry
    issuer: 'typo'              // Token issuer
  },
  
  para: {
    max: 10,                    // Max paragraphs per type
    quote: 'qo',                // Quote prefix
    wordEasyShort: 'wes',       // Easy short word prefix
    // ... more prefixes
  },
  
  redis: {
    host: '...',                // Redis host (local/cloud)
    port: 6379,                 // Redis port
    password: '...'             // Redis password
  },
  
  rabbitmq: {
    host: '...',                // RabbitMQ host (local/cloud)
    port: 5672,                 // RabbitMQ port
    user: '...',                // RabbitMQ username
    password: '...'             // RabbitMQ password
  }
};
```

---

## Server Initialization Sequence

```javascript
// server.js startup flow
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    console.log('Database connected successfully');
    
    // 2. Connect to RabbitMQ
    await connectMQ();
    console.log('RabbitMQ connected');
    
    // 3. Connect to Redis
    await connectRedis();
    console.log('Redis connected');
    
    // 4. Setup signal handlers for graceful shutdown
    setupDBSignalHandlers();
    setupMQSignalHandlers();
    setupRedisSignalHandlers();
    
    // 5. Load paragraph content to queue
    await loadParagraphsToQueue();
    console.log('✓ Loaded 50 paragraphs to queue');
    
    // 6. Initialize leaderboard cache
    await generateLeaderboard();
    console.log('✓ Leaderboard cached in Redis');
    
    // 7. Start Express server
    app.listen(env.port, () => {
      console.log(`✓ Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};
```

### Periodic Tasks (Cron Jobs)

**Leaderboard Refresh Cron Job** (optional, currently runs on server startup)

```javascript
import cron from 'node-cron';
import leaderboard from './helper/leaderboardHelper.js';

// Run every 30 minutes (at :00 and :30 of each hour)
cron.schedule('0,30 * * * *', async () => {
  try {
    console.log('[CRON] Updating leaderboard...');
    await leaderboard.generateLeaderboard();
  } catch (error) {
    console.error('[CRON] Failed to update leaderboard:', error);
  }
});

// Alternative schedules:
// '*/5 * * * *'    → Every 5 minutes
// '0 * * * *'      → Every hour
// '0 2 * * *'      → Every day at 2 AM
// '0 0 * * 0'      → Every Sunday at midnight (weekly)
```

**Leaderboard Generation Process:**
1. Query top 10 analytics sorted by WPM (descending) and accuracy
2. Fetch username for each user from User collection
3. Calculate weighted score: `(WPM × 0.7) + (Accuracy × 0.3)`
4. Store in Redis under key `leaderboard`

**Location:** `server.js` (currently commented, uncomment to enable)

### Graceful Shutdown

All services implement signal handlers for SIGINT/SIGTERM:

```javascript
process.on('SIGINT', async () => {
  await closeConnection();  // MongoDB
  await stopMQ();            // RabbitMQ
  await stopRedis();         // Redis
  process.exit(0);
});
```

---

## Key Design Decisions

### 1. Why Service Layer?
- **Separation of Concerns**: Controllers handle HTTP, services handle business logic
- **Reusability**: Services can be called from multiple controllers or scripts
- **Testability**: Business logic can be tested without HTTP overhead

### 2. Why Redis for OTP?
- **TTL Support**: Automatic expiration after 120 seconds
- **Atomic Operations**: Increment attempts without race conditions
- **Fast Access**: Sub-millisecond lookups for real-time validation

### 3. Why RabbitMQ for Emails?
- **Async Processing**: Don't block API responses waiting for email delivery
- **Priority Queue**: Critical emails (OTP) processed first
- **Reliability**: Persistent messages survive server restarts

### 4. Why Zod for Validation?
- **Type Safety**: Runtime validation with TypeScript-like types
- **Composability**: Reuse validation schemas across controllers
- **Error Messages**: Clear, specific validation errors

### 5. Why Mongoose Schemas Separate from Models?
- **Flexibility**: Same schema can have multiple models (e.g., soft-deleted users)
- **Organization**: Clear separation of structure (schema) vs. operations (model)
- **Migration**: Easy to version schemas independently

---

## Performance Optimizations

### 1. Connection Pooling
- MongoDB: Mongoose maintains connection pool automatically
- Redis: Single connection reused across all operations
- RabbitMQ: Single channel per queue type

### 2. Index Strategy
- Users: Indexed on `username` and `email` (unique)
- Analytics: Indexed on `userId` (unique)

### 3. Redis Caching Patterns
- Username availability: 1 hour TTL (reduces DB queries)
- Leaderboard: Cached JSON array

### 4. Async Operations
- Email sending via queue (non-blocking)
- Paragraph loading via Promise.all (parallel)

---

## Security Measures

### 1. Authentication
- ✅ JWT with short expiry (7-30 days)
- ✅ Refresh token rotation on renewal
- ✅ Token verification middleware on protected routes

### 2. Input Validation
- ✅ Zod schemas for all user inputs
- ✅ Regex validation for email, username, password
- ✅ Type checking at service layer

### 3. Password Security
- ✅ Bcrypt hashing with salt=10
- ✅ Password complexity requirements
- ✅ Confirmation password match

### 4. Rate Limiting (OTP)
- ✅ Max 3 attempts per OTP
- ✅ 120-second TTL
- ✅ Auto-deletion after max attempts

### 5. Error Handling
- ✅ Never expose stack traces in production
- ✅ Generic error messages for auth failures
- ✅ Detailed logging for debugging

---

## Scalability Considerations

### Horizontal Scaling
- **Stateless API**: No session storage, all state in JWT
- **External Services**: DB, Redis, RabbitMQ can scale independently
- **Load Balancer Ready**: No in-memory state

### Vertical Scaling
- **Connection Pooling**: Efficient resource usage
- **Async Operations**: Non-blocking I/O
- **Indexed Queries**: Fast database lookups

### Future Enhancements
- [ ] Add rate limiting middleware (express-rate-limit)
- [ ] Implement Redis cluster for high availability
- [ ] Add database read replicas for analytics queries
- [ ] Implement WebSocket for real-time leaderboard updates

---

**Last Updated:** Febuary 1, 2026 
**Architecture Version:** 1.0.0
