# ⚡ Rate Limiter Documentation

Complete reference for the Redis-backed rate limiting implementation in Typo Server.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture & Design](#architecture--design)
- [Configuration](#configuration)
- [Implementation Details](#implementation-details)
  - [Redis Storage & Key Format](#redis-storage--key-format)
  - [Middleware Integration](#middleware-integration)
- [Protected Routes](#protected-routes)
- [Error & HTTP Response Format](#error--http-response-format)
- [Fail-Open Error Handling](#fail-open-error-handling)

---

## 🎯 Overview

Typo Server uses **Redis-backed rate limiting** to protect sensitive authentication, password reset, user management, and analytics endpoints against abuse, brute-force attacks, and denial-of-service attempts.

The rate limiting algorithm follows the **Sliding/Fixed Expiration Window** pattern stored directly in Redis with automatic Time-To-Live (TTL) handling.

---

## 🏗️ Architecture & Design

```
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                 EXPRESS ROUTE MIDDLEWARE                    │
│                 (redisRateLimiter)                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│             IDENTIFIER CALCULATOR                           │
│  • Authenticated User: user:<userId>                        │
│  • Unauthenticated IP: ip:<clientIp>                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               REDIS RATE LIMIT CHECK                        │
│  Key Format: typo:ratelimit:<route>:<identifier>            │
│  1. INCR key                                                │
│  2. If new key, set TTL to windowSeconds                    │
│  3. Check count <= limit                                    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
        Count <= Limit                 Count > Limit
               │                              │
               ▼                              ▼
        [ Next Middleware ]            [ HTTP 429 Too Many Requests ]
                                       {
                                         "success": false,
                                         "error": "Too many requests...",
                                         "retryAfterSeconds": 45
                                       }
```

---

## 🔧 Configuration

Rate limiter settings are fully configurable via `.env` variables:

```ini
# Rate Limiter Limits
AUTH_RATE_LIMIT=5                     # Max requests per window for Auth routes
ANALYTICS_RATE_LIMIT=20               # Max requests per window for Analytics routes
RATE_LIMIT_WINDOW_SECONDS=60          # Time window duration in seconds (1 minute)

# Redis Key Prefix
REDIS_RATE_LIMIT_KEY_PREFIX=typo:ratelimit:
```

---

## 🛠️ Implementation Details

### Redis Storage & Key Format

**File:** `redis/rateLimiter.js`

- **Key Format:** `${REDIS_RATE_LIMIT_KEY_PREFIX}${route}:${cleanIdentifier}`
- **Examples:**
  - `typo:ratelimit:auth:ip:127.0.0.1`
  - `typo:ratelimit:auth:user:60d5ec49f1a2c80015f8b1a1`
  - `typo:ratelimit:analytics:user:60d5ec49f1a2c80015f8b1a1`

```javascript
import { connectRedis } from "../init/redis.js";

export const rateLimitCheck = async (identifier, route = "global", limit = 60, windowSeconds = 60) => {
  if (!identifier) return { allowed: true, ttl: 0 };
  const cleanIdentifier = String(identifier).trim().replace(/[^a-zA-Z0-9_.:-]/g, "");
  const prefix = process.env.REDIS_RATE_LIMIT_KEY_PREFIX || "typo:ratelimit:";
  const key = `${prefix}${route}:${cleanIdentifier}`;

  try {
    const redis = await connectRedis();
    if (!redis) return { allowed: true, ttl: 0 };

    const newCount = await redis.incr(key);
    if (newCount === 1) {
      await redis.expire(key, windowSeconds);
    }
    let ttl = await redis.ttl(key);
    if (ttl < 0) {
      await redis.expire(key, windowSeconds);
      ttl = windowSeconds;
    }
    return {
      allowed: newCount <= limit,
      ttl: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (err) {
    console.error(`Redis rate limit check error (${route}):`, err && err.message ? err.message : err);
    return { allowed: true, ttl: 0 }; // Fail open
  }
};
```

---

### Middleware Integration

**File:** `middleware/redisRateLimiter.js`

The middleware dynamically extracts user identity or IP address and evaluates limit compliance:

```javascript
import { rateLimitCheck } from "../redis/rateLimiter.js";

export const redisRateLimiter = ({
  route = "auth",
  limitEnvVar = "AUTH_RATE_LIMIT",
  defaultLimit = 5,
  windowSecondsEnvVar = "RATE_LIMIT_WINDOW_SECONDS",
  defaultWindowSeconds = 60,
  message = "Too many requests, please try again later.",
} = {}) => {
  return async (req, res, next) => {
    try {
      const envLimit = process.env[limitEnvVar];
      const limit = envLimit ? parseInt(envLimit, 10) : defaultLimit;

      const envWindow = process.env[windowSecondsEnvVar];
      const windowSeconds = envWindow ? parseInt(envWindow, 10) : defaultWindowSeconds;

      const rawIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket?.remoteAddress || req.ip || "unknown";
      const identifier = req.userId ? `user:${req.userId}` : `ip:${rawIp}`;

      const { allowed, ttl } = await rateLimitCheck(identifier, route, limit, windowSeconds);
      if (!allowed) {
        return res.status(429).json({
          success: false,
          error: message,
          retryAfterSeconds: ttl,
        });
      }
      next();
    } catch (err) {
      console.error(`Redis rate limiter error (${route}):`, err);
      next(); // Fail open if an unexpected error occurs
    }
  };
};
```

---

## 🛡️ Protected Routes

### 1. Auth & Sensitive Operations (`userRoutes.js`)

Limit: `AUTH_RATE_LIMIT` (Default: 5 requests / 60s)

| Endpoint | Method | Protected Route |
|----------|--------|-----------------|
| `/api/users/register` | `POST` | User registration |
| `/api/users/login` | `POST` | User login |
| `/api/users/send-otp` | `POST` | OTP generation & delivery |
| `/api/users/reset-password` | `POST` | Password reset execution |
| `/api/users/delete-account` | `DELETE` | Permanent account deletion |

### 2. Analytics Endpoints (`analyticsRoutes.js`)

Limit: `ANALYTICS_RATE_LIMIT` (Default: 20 requests / 60s)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/user-analytics` | `GET` | Get user analytics |
| `/api/analytics/account-analytics` | `GET` | Get account analytics |
| `/api/analytics/update-analytics` | `PUT` | Update typing test results |
| `/api/analytics/reset-analytics` | `PUT` | Reset user statistics |

---

## ❌ Error & HTTP Response Format

When a user or IP address exceeds the limit, the server responds with **HTTP 429 Too Many Requests**:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
```

```json
{
  "success": false,
  "error": "Too many requests, please try again later.",
  "retryAfterSeconds": 48
}
```

---

## 🟢 Fail-Open Error Handling

If Redis becomes unreachable or throws an exception during execution:
1. An error log is recorded: `Redis rate limit check error (auth): ...`
2. The function returns `{ allowed: true, ttl: 0 }`.
3. The request is allowed to proceed to downstream handlers without breaking server availability.
