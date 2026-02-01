# 🔴 Redis Documentation

Complete guide to Redis caching strategy, key patterns, and data management in Typo server.

---

## Table of Contents
- [Overview](#overview)
- [Connection Management](#connection-management)
- [Key Patterns](#key-patterns)
- [Operations](#operations)
- [TTL Strategy](#ttl-strategy)
- [Use Cases](#use-cases)

---

## Overview

Typo uses **Redis** (via ioredis) as an in-memory cache for:
- ⚡ Username availability tracking (prevent race conditions)
- 🔐 OTP storage with automatic expiration
- 📊 User analytics caching for fast leaderboard access
- ⏱️ Temporary data with TTL (Time-To-Live)

### Redis Statistics
- **Host:** Configurable (local/cloud based on NODE_ENV)
- **Port:** 6379 (default)
- **Connection:** Single persistent connection (connection pooling)
- **Persistence:** Optional (can be disabled for pure cache)

---

## Connection Management

### Connection Configuration

**File:** `init/redis.js`

```javascript
import Redis from 'ioredis';
import { env } from './env.js';

let client = null;

export const connectRedis = async () => {
  if (client && client.status === 'ready') {
    return client;
  }

  client = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  client.on('error', (err) => {
    console.error('Redis error:', err);
  });

  return client;
};

export const stopRedis = async () => {
  if (client) {
    await client.quit();
    client = null;
    console.log('Redis connection closed');
  }
};
```

### Connection Features
- ✅ Singleton pattern (single connection reused)
- ✅ Auto-reconnection with exponential backoff
- ✅ Graceful shutdown on SIGINT/SIGTERM
- ✅ Error event handling
- ✅ Environment-based configuration

---

## Key Patterns

Redis uses **namespaced keys** to organize data by type:

### Key Namespace Structure

```
typo_db:
├── username:{username}        → Username availability cache
├── otp:{email}                → Password reset OTPs
└── leaderboard                → Cached leaderboard array
```

### Key Naming Convention

| Pattern | Example | Purpose | TTL |
|---------|---------|---------|-----|
| `username:{username}` | `username:johndoe` | Track username availability | 1 hour (3600s) |
| `otp:{email}` | `otp:john@example.com` | Store OTP for password reset | 120 seconds |
| `leaderboard` | `leaderboard` | Cached top users array | No expiry (manual invalidation) |

---

## Operations

### 1. Username Operations

**File:** `redis/user.js`

#### Check Username Presence

```javascript
const isUsernamePresent = async (username) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  const exists = await redis.exists(key);
  return exists === 1;
};
```

**Usage:** Check if username is recently checked or taken

**Response:**
- `1` (true): Username key exists in Redis
- `0` (false): Username key not in Redis

---

#### Set Username (with TTL)

```javascript
const setUsername = async (username, ttlSeconds = 60 * 60) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  await redis.set(key, 1, "EX", ttlSeconds);
  return 1;
};
```

**Usage:** Cache username availability check result

**Parameters:**
- `username`: Username to cache
- `ttlSeconds`: Time-to-live (default: 3600 = 1 hour)

**Storage:**
```
Key: username:johndoe
Value: 1
TTL: 3600 seconds
```

**Purpose:** Prevent race conditions during registration
- User checks "johndoe" → Available
- Redis caches "johndoe" for 1 hour
- Another user checks "johndoe" → Sees it's cached (likely being registered)

---

#### Delete Username Key

```javascript
const deleteUsernameKey = async (username) => {
  const redis = await connectRedis();
  const key = `username:${username}`;
  await redis.del(key);
  console.log(`Deleted key: ${key}`);
};
```

**Usage:** Manual cache invalidation (rarely used)

---

### 2. OTP Operations

**File:** `redis/otp.js`

#### Set OTP

```javascript
const setOtp = async (email, otp, ttlSeconds = 120) => {
  const redis = await connectRedis();
  const key = `otp:${email}`;
  const payload = {
    otp,
    attempts: 0
  };
  await redis.set(key, JSON.stringify(payload), "EX", ttlSeconds);
  return payload;
};
```

**Usage:** Store OTP for password reset

**Parameters:**
- `email`: User's email
- `otp`: 6-digit OTP code
- `ttlSeconds`: Expiry time (default: 120 = 2 minutes)

**Storage:**
```
Key: otp:john@example.com
Value: {"otp":"123456","attempts":0}
TTL: 120 seconds
```

**Automatic Expiration:** Redis deletes key after 120 seconds

---

#### Get OTP

```javascript
const getOtp = async (email) => {
  const redis = await connectRedis();
  const key = `otp:${email}`;
  const raw = await redis.get(key);
  
  if (!raw) return null;
  
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};
```

**Usage:** Retrieve OTP for verification

**Response:**
```javascript
{
  otp: "123456",
  attempts: 2
}
```

or `null` if expired/not found

---

#### Increment OTP Attempts

```javascript
const incrementOtpAttempts = async (email) => {
  const redis = await connectRedis();
  const key = `otp:${email}`;
  const raw = await redis.get(key);
  
  if (!raw) return null;
  
  let payload = JSON.parse(raw);
  payload.attempts = (payload.attempts || 0) + 1;
  
  const ttl = await redis.ttl(key);
  const ttlSeconds = ttl > 0 ? ttl : 120;
  
  await redis.set(key, JSON.stringify(payload), "EX", ttlSeconds);
  return payload;
};
```

**Usage:** Track wrong OTP attempts (max 3)

**Flow:**
1. User enters wrong OTP
2. Increment attempts counter
3. Preserve remaining TTL
4. If attempts >= 3, block further attempts

**Example:**
```javascript
// Initial: {otp: "123456", attempts: 0}
await incrementOtpAttempts(email);
// Result: {otp: "123456", attempts: 1}

await incrementOtpAttempts(email);
// Result: {otp: "123456", attempts: 2}

await incrementOtpAttempts(email);
// Result: {otp: "123456", attempts: 3}
// Now max attempts reached, controller returns 429 error
```

---

#### Delete OTP

```javascript
const deleteOtp = async (email) => {
  const redis = await connectRedis();
  const key = `otp:${email}`;
  await redis.del(key);
};
```

**Usage:** Remove OTP after successful reset or max attempts

---

### 4. Leaderboard Operations

#### Set Leaderboard

```javascript
const setLeaderboard = async (arrayValue) => {
  const redis = await connectRedis();
  const key = 'leaderboard';
  
  if (!Array.isArray(arrayValue)) {
    throw new Error('Leaderboard value must be an array');
  }
  
  await redis.set(key, JSON.stringify(arrayValue));
  return arrayValue;
};
```

**Usage:** Cache sorted leaderboard data

**Parameters:**
- `arrayValue`: Array of user objects sorted by WPM

**Storage:**
```
Key: leaderboard
Value: [
  {"username":"user1","wpm":95,"accuracy":98},
  {"username":"user2","wpm":88,"accuracy":96},
  ...
]
```

---

#### Get Leaderboard

```javascript
const getLeaderboard = async () => {
  const redis = await connectRedis();
  const key = 'leaderboard';
  const raw = await redis.get(key);
  
  if (!raw) return [];
  
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
};
```

**Usage:** Fetch cached leaderboard (avoids DB query)

**Response:**
```javascript
[
  {
    rank: 1,
    userId: "507f1f77bcf86cd799439011",
    username: "speedtyper",
    wpm: 95.5,
    accuracy: 98.2,
    weightedScore: 95.11
  },
  {
    rank: 2,
    userId: "507f1f77bcf86cd799439012",
    username: "fastfingers",
    wpm: 88.3,
    accuracy: 96.1,
    weightedScore: 87.52
  },
  ...
]
```

### Leaderboard Generation

**File:** `helper/leaderboardHelper.js`

```javascript
import { generateLeaderboard } from "./helper/leaderboardHelper.js";

// Called on server startup and via cron job (every 30 minutes)
const leaderboard = await generateLeaderboard();

// Returns top 10 users ranked by weighted score
// Formula: Score = (WPM * 0.7) + (Accuracy * 0.3)
```

**Implementation:**
```javascript
// 1. Fetch top 10 analytics sorted by WPM and accuracy
const analyticsList = await Analytics
  .find()
  .sort({ wpm: -1, accuracy: -1 })
  .limit(10)
  .lean();

// 2. For each analytics entry, fetch associated user
for (let analytics of analyticsList) {
  const user = await User.findById(analytics.userId).lean();
  // Calculate rank and weighted score...
}

// 3. Store in Redis for fast access
await setLeaderboard(leaderboard);
```

**Features:**
- ✅ Simple and readable query approach
- ✅ Sorts by WPM (primary) and accuracy (secondary)
- ✅ Fetches usernames from User collection
- ✅ Automatic caching in Redis
- ✅ Called on server startup + periodic refresh via cron
- ✅ Weighted scoring: WPM (70%) + Accuracy (30%)

---

## TTL Strategy

### Key Expiration Policies

| Key Type | TTL | Reason | Invalidation |
|----------|-----|--------|--------------|
| `username:{username}` | 1 hour (3600s) | Prevent registration race conditions | Auto-expire |
| `otp:{email}` | 2 minutes (120s) | Security (OTP valid briefly) | Auto-expire + manual delete |
| `leaderboard` | None | Persistent until refresh | Manual (cron job or on-demand) |

### Auto-Expiration (TTL)

Redis automatically deletes keys when TTL expires:

```javascript
// Set key with 120-second TTL
await redis.set("otp:user@example.com", "123456", "EX", 120);

// After 120 seconds, key is automatically deleted
const otp = await redis.get("otp:user@example.com"); // null
```

**Benefits:**
- No manual cleanup needed
- Memory-efficient
- Perfect for temporary data (OTP, sessions)

### Manual Invalidation

For persistent keys without TTL:

```javascript
// Leaderboard updates independently
const topUsers = await User.find()
  .sort({ wpm: -1 })
  .limit(100)
  .lean();

// Invalidate cached leaderboard
await setLeaderboard(topUsers);
```

**Cache Invalidation Triggers:**
- Leaderboard recalculation → Update `leaderboard`

---

## Use Cases

### 1. Username Availability Check

**Problem:** Race condition during registration
- User A checks "johndoe" → Available
- User B checks "johndoe" → Available
- Both try to register → Duplicate error

**Solution:** Cache username for 1 hour
```javascript
// User A checks username
const exists = await checkUsernameExists("johndoe"); // false
await setUsername("johndoe"); // Cache for 1 hour

// User B checks username 10 seconds later
const cached = await isUsernamePresent("johndoe"); // true
// User B sees it's likely being registered
```

**Benefits:**
- ✅ Prevents race conditions
- ✅ Fast checks (Redis < 1ms vs DB query ~10ms)
- ✅ Auto-cleanup after 1 hour

---

### 2. OTP Password Reset

**Problem:** Need temporary OTP with expiration and attempt tracking

**Solution:** Store OTP in Redis with 120s TTL
```javascript
// Send OTP
const otp = generateOtp(); // "123456"
await setOtp(email, otp); // Auto-expire in 120s

// Verify OTP
const stored = await getOtp(email);
if (!stored) {
  return "OTP expired";
}
if (stored.attempts >= 3) {
  return "Max attempts exceeded";
}
if (stored.otp !== userOtp) {
  await incrementOtpAttempts(email);
  return "Invalid OTP";
}

// Success: delete OTP
await deleteOtp(email);
```

**Benefits:**
- ✅ Automatic expiration (2 minutes)
- ✅ Attempt tracking (max 3)
- ✅ No database pollution
- ✅ Fast verification (<1ms)

---

### 3. Leaderboard Caching

**Problem:** Leaderboard query is expensive (sorting, aggregating)

**Solution:** Cache sorted leaderboard in Redis
```javascript
// Update leaderboard (background job every 5 minutes)
const topUsers = await User.find()
  .sort({ wpm: -1 })
  .limit(100)
  .lean();

await setLeaderboard(topUsers);

// Get leaderboard (instant from cache)
const leaderboard = await getLeaderboard(); // <1ms
```

**Benefits:**
- ✅ Fast access (cache read vs DB query)
- ✅ Reduces DB load
- ✅ Can update independently of requests

---

## TTL Strategy

```javascript
retryStrategy: (times) => {
  if (times > 10) {
    return null; // Stop retrying after 10 attempts
  }
  const delay = Math.min(times * 50, 2000);
  return delay; // Exponential backoff
}
```

**Retry Delays:**
- Attempt 1: 50ms
- Attempt 2: 100ms
- Attempt 3: 150ms
- ...
- Attempt 10+: 2000ms (capped)

### Graceful Degradation

If Redis is unavailable, API still works:

```javascript
// error/errorHandler.js
if (err.name === "RedisError") {
  return new AppError("Redis error occurred", 503);
}
```

**Fallback Behavior:**
- Username checks → Query database directly
- OTP → Store in database (less efficient but functional)
- Leaderboard → Query database on demand

---

## Performance Metrics

### Typical Operation Times

| Operation | Redis | MongoDB | Speedup |
|-----------|-------|---------|---------|
| Get username | <1ms | ~10ms | 10x |
| Get OTP | <1ms | ~10ms | 10x |
| Get leaderboard | <1ms | ~50ms | 50x |

### Memory Usage

| Key Type | Value Size | Quantity Estimate | Total Memory |
|----------|------------|-------------------|--------------|
| `username:{username}` | ~20 bytes | 1000 active | ~20 KB |
| `otp:{email}` | ~50 bytes | 100 active | ~5 KB |
| `leaderboard` | ~10 KB | 1 | ~10 KB |

**Total Estimated Memory:** ~50 KB for typical workload

---

## Best Practices

### ✅ Do's

1. **Use TTL for temporary data**
   ```javascript
   await redis.set(key, value, "EX", 120); // Auto-expire
   ```

2. **Namespace keys**
   ```javascript
   const key = `username:${username}`; // Clear purpose
   ```

3. **Handle connection errors**
   ```javascript
   try {
     await redis.get(key);
   } catch (err) {
     // Fallback to database
   }
   ```

4. **Use JSON for complex data**
   ```javascript
   await redis.set(key, JSON.stringify(data));
   const data = JSON.parse(await redis.get(key));
   ```

5. **Monitor memory usage**
   ```bash
   redis-cli info memory
   ```

---

### ❌ Don'ts

1. **Don't store large values**
   ```javascript
   // Bad: Storing entire user document
   await redis.set(`user:${id}`, JSON.stringify(largeUserObject));
   
   // Good: Store only needed fields
   await redis.set(`user:${id}`, JSON.stringify({ wpm, accuracy }));
   ```

2. **Don't forget TTL for temporary data**
   ```javascript
   // Bad: OTP without expiration
   await redis.set(`otp:${email}`, otp);
   
   // Good: OTP with 120s TTL
   await redis.set(`otp:${email}`, otp, "EX", 120);
   ```

3. **Don't rely on Redis for critical data**
   - Redis is a cache, not primary storage
   - Always have database as source of truth

4. **Don't use blocking commands**
   ```javascript
   // Bad: Blocking operations
   await redis.blpop(key, 0);
   
   // Good: Non-blocking operations
   await redis.get(key);
   ```

---

## Redis CLI Commands

### Useful Commands for Debugging

```bash
# Connect to Redis
redis-cli

# List all keys
KEYS *

# Get key value
GET username:johndoe

# Check key TTL
TTL otp:john@example.com

# Delete key
DEL username:johndoe

# Flush all data (CAUTION!)
FLUSHALL

# Monitor all commands in real-time
MONITOR

# Get memory stats
INFO memory
```

---

## Configuration

### Development vs Production

```javascript
// init/env.js
redis: {
  host: isDevelopment 
    ? process.env.LOCAL_REDIS_HOST 
    : process.env.CLOUD_REDIS_HOST,
  port: isDevelopment 
    ? process.env.LOCAL_REDIS_PORT 
    : process.env.CLOUD_REDIS_PORT,
  password: isDevelopment 
    ? process.env.LOCAL_REDIS_PASSWORD 
    : process.env.CLOUD_REDIS_PASSWORD
}
```

**Development:**
- Host: `localhost`
- Port: `6379`
- Password: None (optional)

**Production:**
- Host: Cloud Redis endpoint (e.g., AWS ElastiCache, Redis Cloud)
- Port: `6379` or custom
- Password: Required

---

**Last Updated:** Febuary 1, 2026  
**Redis Version:** 7.0+  
**ioredis Version:** 5.9.2
