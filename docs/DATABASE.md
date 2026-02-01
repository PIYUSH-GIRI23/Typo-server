# 🗄️ Database Documentation

Complete guide to MongoDB schemas, models, relationships, and data management in Typo server.

---

## Table of Contents
- [Overview](#overview)
- [Database Connection](#database-connection)
- [Collections](#collections)
- [Schemas](#schemas)
- [Relationships](#relationships)
- [Indexes](#indexes)
- [Data Lifecycle](#data-lifecycle)

---

## Overview

Typo uses **MongoDB** as the primary database with **Mongoose** as the ODM (Object-Document Mapping) library. The database stores user accounts and their typing analytics with a one-to-one relationship.

### Database Statistics
- **Collections:** 2 (users, analytics)
- **Relationships:** 1:1 (User → Analytics)
- **Indexes:** 3 unique indexes
- **Storage Format:** BSON documents

---

## Database Connection

### Connection Configuration

**File:** `init/db.js`

```javascript
import mongoose from 'mongoose';
import { env } from './env.js';

let client = null;

export const connectDB = async () => {
  try {
    if (client) return client;
    
    client = await mongoose.connect(env.mongoURI, {
      dbName: 'typo'
    });
    
    console.log('Database connected successfully');
    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};
```

### Connection String Format

**Local Development:**
```
mongodb://localhost:27017/typo
```

**Cloud (MongoDB Atlas):**
```
mongodb+srv://username:password@cluster.mongodb.net/typo
```

### Connection Features
- ✅ Connection pooling (automatic by Mongoose)
- ✅ Auto-reconnection on failure
- ✅ Graceful shutdown on SIGINT/SIGTERM
- ✅ Environment-based URI switching

---

## Collections

### 1. Users Collection

**Collection Name:** `users`

**Purpose:** Store user account information, credentials, and metadata.

**Document Count:** Variable (grows with registrations)

**Indexes:**
- `username` (unique)
- `email` (unique)

---

### 2. Analytics Collection

**Collection Name:** `analytics`

**Purpose:** Store typing test statistics and daily progress for each user.

**Document Count:** Equal to users count (1:1 relationship)

**Indexes:**
- `userId` (unique reference to users._id)

---

## Schemas

### User Schema

**File:** `schemas/user.schema.js`

```javascript
import mongoose from "mongoose";
import regex from "../utils/regexValidation.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30
    },
    
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30
    },
    
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      validate: {
        validator: (value) => regex.USERNAME_REGEX.test(value),
        message: (props) => `${props.value} is not a valid username!`
      }
    },
    
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => regex.EMAIL_REGEX.test(value),
        message: (props) => `${props.value} is not a valid email!`
      }
    },
    
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 50,
      validate: {
        validator: (value) => regex.PASSWORD_REGEX.test(value),
        message: () => `Password does not meet complexity rules!`
      }
    },
    
    lastLogin: {
      type: Number,      // Unix timestamp in milliseconds
      default: null
    },
    
    dateOfJoining: {
      type: Number,      // Unix timestamp in milliseconds
      default: () => Date.now()
    }
  },
  {
    timestamps: false    // We use Unix timestamps instead
  }
);

export default userSchema;
```

#### Field Details

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `firstName` | String | Required, 2-30 chars | User's first name |
| `lastName` | String | Required, 2-30 chars | User's last name |
| `username` | String | Required, unique, 3-20 chars, alphanumeric + underscore | Unique identifier |
| `email` | String | Required, unique, valid email format | User's email address |
| `password` | String | Required, 8-50 chars, bcrypt hash | Hashed password (never plain text) |
| `lastLogin` | Number | Optional, Unix timestamp | Last successful login time |
| `dateOfJoining` | Number | Auto-generated, Unix timestamp | Account creation time |

#### Validation Rules

**Username Regex:**
```regex
^[a-zA-Z0-9_]{3,20}$
```
- 3-20 characters
- Alphanumeric and underscore only
- No spaces or special characters

**Email Regex:**
```regex
^[^\s@]+@[^\s@]+\.[^\s@]+$
```
- Valid email format
- No whitespace
- Contains @ and domain

**Password Regex:**
```regex
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$
```
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

---

### Analytics Schema

**File:** `schemas/analytics.schema.js`

```javascript
import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    
    wpm: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    
    accuracy: { 
      type: Number, 
      default: 0, 
      min: 0, 
      max: 100 
    },
    
    testTimings: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    
    lastTestTaken: { 
      type: Number,           // Unix timestamp in milliseconds
      default: null 
    },
    
    totalPar: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    
    maxStreak: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    
    progress: [
      {
        date: {
          type: String,       // YYYY-MM-DD format
          required: true
        },
        wpm: {
          type: Number,
          default: 0,
          min: 0
        },
        accuracy: {
          type: Number,
          default: 0,
          min: 0,
          max: 100
        },
        count: {
          type: Number,
          default: 1,
          min: 1
        }
      }
    ]
  },
  {
    timestamps: false
  }
);

analyticsSchema.index({ userId: 1 }, { unique: true });

export default analyticsSchema;
```

#### Field Details

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `userId` | ObjectId | Required, unique, references User | Foreign key to users collection |
| `wpm` | Number | Default: 0, min: 0 | Latest words per minute score |
| `accuracy` | Number | Default: 0, min: 0, max: 100 | Latest accuracy percentage |
| `testTimings` | Number | Default: 0, min: 0 | Test duration in seconds |
| `lastTestTaken` | Number | Optional, Unix timestamp | Last test completion time |
| `totalPar` | Number | Default: 0, min: 0 | Total paragraphs completed |
| `maxStreak` | Number | Default: 0, min: 0 | Longest consecutive days |
| `progress` | Array | Max 10 entries | Daily progress history |

#### Progress Array Structure

Each entry in the `progress` array represents one day's aggregated performance:

```javascript
{
  date: "2026-01-31",    // ISO date string (YYYY-MM-DD)
  wpm: 86.7,             // Cumulative average WPM for this day
  accuracy: 96.9,        // Cumulative average accuracy for this day
  count: 3               // Number of tests taken on this day
}
```

**Cumulative Average Calculation:**

When a user takes multiple tests on the same day:
```javascript
newWpm = (oldWpm × oldCount + newWpm) / (oldCount + 1)
newAccuracy = (oldAccuracy × oldCount + newAccuracy) / (oldCount + 1)
count = oldCount + 1
```

**Example:**
```javascript
// First test of the day
Day 1: { date: "2026-01-31", wpm: 85, accuracy: 95, count: 1 }

// Second test (wpm: 90, accuracy: 98)
Day 1: { 
  date: "2026-01-31", 
  wpm: (85 × 1 + 90) / 2 = 87.5,
  accuracy: (95 × 1 + 98) / 2 = 96.5,
  count: 2 
}

// Third test (wpm: 88, accuracy: 97)
Day 1: { 
  date: "2026-01-31", 
  wpm: (87.5 × 2 + 88) / 3 = 87.67,
  accuracy: (96.5 × 2 + 97) / 3 = 96.67,
  count: 3 
}
```

**Rolling Window (10 Days):**

When progress array reaches 10 entries and a new day arrives:
```javascript
// Before (10 entries)
progress = [
  { date: "2026-01-21", ... },  // Oldest entry
  { date: "2026-01-22", ... },
  // ... 8 more entries
  { date: "2026-01-30", ... }   // Most recent
]

// After new day (still 10 entries)
progress = [
  { date: "2026-01-22", ... },  // Oldest entry removed
  { date: "2026-01-23", ... },
  // ... 8 more entries
  { date: "2026-01-31", ... }   // New day added
]
```

---

## Relationships

### User ↔ Analytics (1:1)

```
┌─────────────────────────────────────┐
│          users Collection           │
├─────────────────────────────────────┤
│ _id: ObjectId("507f1f77...")        │
│ username: "johndoe"                 │
│ email: "john@example.com"           │
│ password: "$2a$10$hashed..."        │
│ firstName: "John"                   │
│ lastName: "Doe"                     │
│ lastLogin: 1738336512000            │
│ dateOfJoining: 1738250000000        │
└──────────────┬──────────────────────┘
               │
               │ 1:1 relationship
               │
┌──────────────▼──────────────────────┐
│       analytics Collection          │
├─────────────────────────────────────┤
│ _id: ObjectId("507f1f78...")        │
│ userId: ObjectId("507f1f77...")     │  ← References users._id
│ wpm: 85.5                           │
│ accuracy: 96.8                      │
│ testTimings: 60                     │
│ lastTestTaken: 1738336512000        │
│ totalPar: 42                        │
│ maxStreak: 7                        │
│ progress: [...]                     │
└─────────────────────────────────────┘
```

### Cascading Delete

When a user is deleted, their analytics are also deleted:

```javascript
// services/user.service.js
const deleteUserAccount = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  
  if (user) {
    await Analytics.deleteOne({ userId });  // Cascade delete
  }
  
  return user;
};
```

---

## Indexes

### Primary Indexes (_id)

Every document has a default unique `_id` index (ObjectId):
- users._id
- analytics._id

### Unique Indexes

#### 1. Username Index
```javascript
// Automatically created by unique: true
{ username: 1 }  // Ascending index
```

**Purpose:** Fast lookup by username, prevent duplicates

**Queries Optimized:**
```javascript
User.findOne({ username: "johndoe" })
```

---

#### 2. Email Index
```javascript
// Automatically created by unique: true
{ email: 1 }  // Ascending index
```

**Purpose:** Fast lookup by email, prevent duplicates

**Queries Optimized:**
```javascript
User.findOne({ email: "john@example.com" })
```

---

#### 3. UserId Index (Analytics)
```javascript
// Defined in schema
analyticsSchema.index({ userId: 1 }, { unique: true });
```

**Purpose:** Enforce 1:1 relationship, fast user analytics lookup

**Queries Optimized:**
```javascript
Analytics.findOne({ userId: ObjectId("507f1f77...") })
```

---

### Index Performance

| Index | Cardinality | Size Estimate | Query Time |
|-------|-------------|---------------|------------|
| users._id | Unique | ~12 bytes/doc | O(log n) |
| users.username | Unique | ~20 bytes/doc | O(log n) |
| users.email | Unique | ~30 bytes/doc | O(log n) |
| analytics._id | Unique | ~12 bytes/doc | O(log n) |
| analytics.userId | Unique | ~12 bytes/doc | O(log n) |

---

## Data Lifecycle

### 1. User Registration

```javascript
// Step 1: Create User document
const user = await User.create({
  email: "john@example.com",
  username: "johndoe",
  password: "$2a$10$hashed...",  // Bcrypt hash
  firstName: "John",
  lastName: "Doe",
  lastLogin: Date.now(),
  dateOfJoining: Date.now()
});

// Step 2: Create Analytics document
const analytics = await Analytics.create({
  userId: user._id,
  wpm: 0,
  accuracy: 0,
  testTimings: 0,
  lastTestTaken: null,
  totalPar: 0,
  maxStreak: 0,
  progress: []
});
```

**MongoDB Transactions:** Not required (non-critical if analytics creation fails)

---

### 2. Login Flow

```javascript
// Query user by email or username
const user = await User.findOne({
  $or: [
    { email: "john@example.com" },
    { username: "johndoe" }
  ]
});

// Update lastLogin timestamp
await User.findByIdAndUpdate(
  user._id,
  { lastLogin: Date.now() },
  { new: true }
);
```

**Index Used:** username or email (depending on identifier)

---

### 3. Analytics Update

```javascript
// Fetch current analytics
const analytics = await Analytics.findOne({ userId });

// Calculate progress
const today = new Date().toISOString().split('T')[0];
const lastEntry = analytics.progress[analytics.progress.length - 1];

let updatedProgress = [...analytics.progress];

if (!lastEntry || lastEntry.date !== today) {
  // New day: add entry
  if (updatedProgress.length >= 10) {
    updatedProgress.shift();  // Remove oldest
  }
  updatedProgress.push({ date: today, wpm, accuracy, count: 1 });
} else {
  // Same day: cumulative average
  const existingEntry = updatedProgress[updatedProgress.length - 1];
  const newCount = existingEntry.count + 1;
  
  existingEntry.wpm = (existingEntry.wpm * existingEntry.count + wpm) / newCount;
  existingEntry.accuracy = (existingEntry.accuracy * existingEntry.count + accuracy) / newCount;
  existingEntry.count = newCount;
}

// Update analytics
await Analytics.findOneAndUpdate(
  { userId },
  {
    wpm,
    accuracy,
    testTimings,
    maxStreak,
    lastTestTaken,
    progress: updatedProgress,
    $inc: { totalPar: 1 }
  },
  { new: true, runValidators: true }
);
```

**Array Operations:**
- `shift()`: Remove first element (oldest day)
- `push()`: Add new element (new day)
- In-place update: Modify last element (same day)

---

### 4. Get Analytics with User Data

```javascript
const analytics = await Analytics.findOne({ userId })
  .populate({
    path: 'userId',
    as: 'userData',
    select: 'firstName lastName username email lastLogin'
  });

// Result structure
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),      // Original reference
  userData: {                   // Populated user data
    firstName: "John",
    lastName: "Doe",
    username: "johndoe",
    email: "john@example.com",
    lastLogin: 1738336512000
  },
  wpm: 85.5,
  accuracy: 96.8,
  // ... rest of analytics
}
```

**Population:**
- `path: 'userId'`: Field to populate
- `as: 'userData'`: Rename in result
- `select`: Only fetch specified fields

---

### 5. Account Deletion

```javascript
// Delete user (cascade analytics)
const user = await User.findByIdAndDelete(userId);

if (user) {
  await Analytics.deleteOne({ userId });
}
```

**Cascade Order:**
1. Delete from users collection
2. Delete from analytics collection

**No transactions needed:** Analytics can be orphaned temporarily without data integrity issues

---

## Data Validation

### Schema-Level Validation

Mongoose automatically validates:
- ✅ Required fields
- ✅ Data types
- ✅ Min/max values
- ✅ String lengths
- ✅ Custom validators (regex)

### Application-Level Validation

Zod schemas provide additional validation before DB operations:
```javascript
// utils/authValidation.js
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  // ...
});
```

**Two-Layer Validation Benefits:**
1. **Zod (Controller):** Fast fail, clear error messages
2. **Mongoose (Model):** Data integrity guarantee

---

## Backup & Recovery

### Backup Strategy

**Recommended:** Daily automated backups

```bash
# MongoDB dump command
mongodump --uri="mongodb://localhost:27017/typo" --out=/backup/typo-$(date +%F)

# Restore command
mongorestore --uri="mongodb://localhost:27017/typo" /backup/typo-2026-01-31
```

### Data Retention

| Data Type | Retention Policy |
|-----------|------------------|
| User accounts | Indefinite (until deleted) |
| Analytics | Indefinite (tied to user) |
| Progress history | 10 days (rolling window) |

---

## Performance Optimization

### Query Optimization Tips

✅ **Do:**
```javascript
// Use indexed fields in queries
User.findOne({ username: "johndoe" })  // Fast (indexed)

// Select only needed fields
User.findOne({ username }).select('firstName lastName email')

// Use lean() for read-only operations
User.findOne({ username }).lean()  // Returns plain JS object
```

❌ **Don't:**
```javascript
// Avoid full collection scans
User.find({ firstName: "John" })  // Slow (no index on firstName)

// Don't fetch unnecessary data
User.findOne({ username })  // Returns all fields
```

### Monitoring Queries

Enable query logging in development:
```javascript
mongoose.set('debug', true);
```

---

## Common Queries

### 1. Find User by Email or Username
```javascript
const user = await User.findOne({
  $or: [
    { email: identifier.toLowerCase() },
    { username: identifier }
  ]
});
```

### 2. Update Analytics with Progress
```javascript
const analytics = await Analytics.findOneAndUpdate(
  { userId },
  {
    wpm,
    accuracy,
    progress: updatedProgress,
    $inc: { totalPar: 1 }
  },
  { new: true, runValidators: true }
);
```

### 3. Get Public User Analytics
```javascript
const user = await User.findOne({ username }).select('_id firstName lastName username');
const analytics = await Analytics.findOne({ userId: user._id }).select('wpm accuracy totalPar');
```

### 4. Reset Analytics
```javascript
await Analytics.findOneAndUpdate(
  { userId },
  {
    wpm: 0,
    accuracy: 0,
    testTimings: 0,
    lastTestTaken: null,
    totalPar: 0,
    maxStreak: 0,
    progress: []
  },
  { new: true }
);
```

---

## Migration Guide

### Schema Changes

When adding new fields:

```javascript
// Add field with default value
const userSchema = new mongoose.Schema({
  // ... existing fields
  
  newField: {
    type: String,
    default: "default-value"
  }
});
```

**Existing documents:** Will automatically get default value on first access

### Data Migration Script

```javascript
// scripts/migrate.js
import User from './models/user.model.js';

const addNewField = async () => {
  await User.updateMany(
    { newField: { $exists: false } },
    { $set: { newField: "default-value" } }
  );
  
  console.log('Migration complete');
};

addNewField();
```

---

**Last Updated:** Febuary 1, 2026   
**Database Version:** MongoDB 6.0+  
**Schema Version:** 1.0.0
