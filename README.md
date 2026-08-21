# 🚀 Typo Server API

**A modern, production-ready Node.js/Express REST API for a typing test application with real-time analytics, JWT authentication, and async message processing.**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Overview

Typo Server is a comprehensive backend solution for a typing test application built with Node.js and Express. It provides secure user authentication, real-time performance analytics with daily progress tracking, and efficient asynchronous operations using Redis caching and RabbitMQ message queuing.

### Key Highlights

- ✅ **Secure Authentication**: JWT-based auth with automatic token refresh
- ✅ **Real-time Analytics**: Track WPM, accuracy, and daily progress with cumulative averaging
- ✅ **Performance Optimized**: Redis caching for sub-millisecond data access
- ✅ **Async Processing**: RabbitMQ message queues for email delivery and background jobs
- ✅ **Type-Safe Validation**: Zod schemas for runtime input validation
- ✅ **Comprehensive Error Handling**: Standardized error responses with proper HTTP codes
- ✅ **Production Ready**: Graceful shutdown, connection pooling, and monitoring

---

## ✨ Features

### 🔐 Authentication & Authorization

- User registration with email/username
- Secure login with bcrypt password hashing (salt=10)
- JWT access tokens (7-30 days) + refresh tokens (90 days)
- Automatic token refresh on expiry
- OTP-based password reset (2-minute TTL, 3 max attempts)

### 📊 Analytics & Progress Tracking

- Real-time typing performance metrics (WPM, accuracy)
- Daily progress tracking with cumulative averaging
- 10-day rolling window history
- Public user profile analytics
- Analytics reset functionality

### 👤 User Management

- Username availability checking with race condition prevention
- Username updates with Redis cache invalidation
- Account deletion with cascading data removal
- Input validation with Zod schemas

### ⚡ Performance & Caching

- Redis caching for username presence (1 hour TTL)
- OTP storage with automatic expiration
- Leaderboard caching for fast access

### 📧 Async Operations

- RabbitMQ message queues with priority support
- Background email delivery (signup, login, reset password, OTP, delete account)

- Paragraph content pre-loading on startup

---

## 🛠️ Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express.js** | 5.2.1 | Web framework |
| **MongoDB** | 9.1.5 (Mongoose) | Primary database |
| **Redis** | 5.9.2 (ioredis) | Caching layer |
| **RabbitMQ** | 0.10.9 (amqplib) | Message broker |

### Security & Validation

| Library | Version | Purpose |
|---------|---------|---------|
| **jsonwebtoken** | 9.0.3 | JWT tokens |
| **bcryptjs** | 3.0.3 | Password hashing |
| **zod** | 4.3.6 | Input validation |

### Utilities

| Library | Version | Purpose |
|---------|---------|---------|
| **dotenv** | 17.2.3 | Environment config |
| **node-cron** | (optional) | Scheduled tasks (cron jobs) |

---

## ⏰ Scheduled Tasks (Cron Jobs)

### Leaderboard Refresh

**Schedule:** Every 30 minutes (on-demand or via cron job)

```javascript
// Cron schedule patterns:
'0,30 * * * *'    // Every 30 minutes
'0 * * * *'       // Every hour
'0 2 * * *'       // Every day at 2 AM
```

**Purpose:**
- Recalculate top 10 users based on latest WPM and accuracy
- Query analytics sorted by WPM (descending), then accuracy
- Fetch usernames from User collection
- Calculate weighted score: (WPM × 0.7) + (Accuracy × 0.3)
- Update Redis cache for instant leaderboard access

**Implementation:** See `helper/leaderboardHelper.js` and uncomment in `server.js`

---

## 🏗️ Architecture

Typo follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│           CLIENT REQUEST                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          ROUTES LAYER                   │
│   • HTTP method mapping                 │
│   • Middleware application              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│        CONTROLLER LAYER                 │
│   • Input validation (Zod)              │
│   • Request/Response handling           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         SERVICE LAYER                   │
│   • Business logic                      │
│   • Database operations                 │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      MODEL/SCHEMA LAYER                 │
│   • Mongoose models                     │
│   • Data validation                     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         DATABASE (MongoDB)              │
└─────────────────────────────────────────┘
```

**Parallel Services:** Redis (caching), RabbitMQ (queuing)

👉 [Full Architecture Documentation](docs/ARCHITECTURE.md)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** 6.0+ ([Download](https://www.mongodb.com/try/download/community))
- **Redis** 7.0+ ([Download](https://redis.io/download))
- **RabbitMQ** 3.12+ ([Download](https://www.rabbitmq.com/download.html))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Typo/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (see [Environment Variables](#environment-variables))

5. **Start external services**
   ```bash
   # Start MongoDB (example for local)
   mongod --dbpath /data/db
   
   # Start Redis
   redis-server
   
   # Start RabbitMQ
   rabbitmq-server
   ```

6. **Start the server**
   ```bash
   # Development (with nodemon)
   npm run dev
   
   # Production
   npm start
   ```

7. **Verify server is running**
   ```
   ✓ Server running on port 8080
   Database connected successfully
   RabbitMQ connected
   Redis connected
   ✓ Loaded 50 paragraphs to queue
   ```

---

## 🔧 Environment Variables

### Required Variables

```env
# Server
NODE_ENV=development
PORT=8080

# MongoDB
LOCAL_MONGO_URI=mongodb://localhost:27017/typo
CLOUD_MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/typo

# JWT
JWT_SECRET=your-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE=7d
ACCESS_TOKEN_LONG_EXPIRE=30d
REFRESH_TOKEN_EXPIRE=90d
TOKEN_ISSUER=typo

# Redis
LOCAL_REDIS_HOST=localhost
LOCAL_REDIS_PORT=6379
LOCAL_REDIS_PASSWORD=
CLOUD_REDIS_HOST=redis-cloud-endpoint
CLOUD_REDIS_PORT=6379
CLOUD_REDIS_PASSWORD=your-redis-password

# RabbitMQ
LOCAL_RABBITMQ_HOST=localhost
LOCAL_RABBITMQ_PORT=5672
LOCAL_RABBITMQ_USER=guest
LOCAL_RABBITMQ_PASSWORD=guest
CLOUD_RABBITMQ_HOST=rabbitmq-cloud-endpoint
CLOUD_RABBITMQ_PORT=5672
CLOUD_RABBITMQ_USER=your-user
CLOUD_RABBITMQ_PASSWORD=your-password

# Paragraphs
MAX_PARA=10
QUOTE_KEY=qo
WORD_KEY_EASY_SHORT=wes
WORD_KEY_EASY_LONG=wel
WORD_KEY_HARD_SHORT=whs
WORD_KEY_HARD_LONG=whl

# Mail Service & Queue Mode Configuration
isQueueEnabled=true # Set to 'true' to use RabbitMQ queue mode, 'false' for direct HTTP API calls
MAIL_SERVICE_URL=http://localhost:8081 # Auxiliary mail server endpoint, required when isQueueEnabled is false
```

### Queue Mode vs. Direct REST API Mode

Typo Server supports dual mail dispatch mechanisms controlled by `isQueueEnabled`:

1. **Queue Mode (`isQueueEnabled=true`)**:
   - Initializes RabbitMQ connection on server startup.
   - Pushes email tasks asynchronously to `mailQueue`.
   - Pre-loads paragraph data into `paragraphQueue`.

2. **Direct REST API Mode (`isQueueEnabled=false`)**:
   - Skips RabbitMQ initialization completely on startup.
   - Dispatches email payloads directly via HTTP POST requests to `${MAIL_SERVICE_URL}/api/mail/send`.

### Environment Switching

The app automatically switches between local and cloud services based on `NODE_ENV`:
- `development`: Uses local services (MongoDB, Redis, RabbitMQ)
- `production`: Uses cloud services


---

## 📚 API Documentation

### Base URL
```
http://localhost:8080
```

### API Routes

#### Authentication
- `POST /api/users/register` - Create new user account
- `POST /api/users/login` - Authenticate user

#### User Management
- `GET /api/users/check-username` - Check username availability
- `PUT /api/users/update-username` 🔒 - Update username
- `DELETE /api/users/delete-account` 🔒 - Delete account

#### Password Recovery
- `POST /api/users/send-otp` - Send password reset OTP
- `POST /api/users/reset-password` - Reset password with OTP

#### Analytics
- `GET /api/analytics/user-analytics` 🔒 - Get user analytics with details
- `GET /api/analytics/account-analytics/:username` 🔒 - Get public user analytics
- `POST /api/analytics/update-analytics` 🔒 - Update typing test results
- `PUT /api/analytics/reset-analytics` 🔒 - Reset all analytics

🔒 = Requires JWT authentication

### Example Request

**Register User:**
```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**
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

👉 [Complete API Reference](docs/API_ROUTES.md)

---

## 📁 Project Structure

```
server/
├── server.js                # Application entry point
├── package.json             # Dependencies
│
├── auth/                    # Authentication
│   └── jwt.js               # JWT operations
│
├── controllers/             # Request handlers
│   ├── authController.js
│   ├── userController.js
│   ├── passwordController.js
│   └── analyticsController.js
│
├── services/                # Business logic
│   ├── auth.service.js
│   ├── user.service.js
│   ├── password.service.js
│   └── analytics.service.js
│
├── models/                  # Mongoose models
│   ├── user.model.js
│   └── analytics.model.js
│
├── schemas/                 # Mongoose schemas
│   ├── user.schema.js
│   └── analytics.schema.js
│
├── routes/                  # API routes
│   ├── userRoutes.js
│   └── analyticsRoutes.js
│
├── middleware/              # Express middleware
│   ├── middleware.js        # JWT auth
│   └── errorMiddleware.js   # Error handler
│
├── error/                   # Error handling
│   ├── AppError.js
│   └── errorHandler.js
│
├── init/                    # Service initialization
│   ├── env.js               # Environment config
│   ├── db.js                # MongoDB connection
│   ├── redis.js             # Redis connection
│   └── queue.js             # RabbitMQ connection
│
├── redis/                   # Redis operations
│   ├── user.js
│   └── otp.js
│
├── queue/                   # RabbitMQ operations
│   ├── mailQueue.js
│   └── paragraphQueue.js
│
├── utils/                   # Utilities
│   ├── authValidation.js    # Zod schemas
│   ├── passwordHash.js
│   ├── otpUtil.js
│   ├── formatDateTIme.js
│   └── regexValidation.js
│
├── helper/
│   └── paragraphLoader.js   # Content loader
│
├── data/                    # Static content
│   ├── quote.js
│   └── paragraph.js
│
└── docs/                    # Documentation
    ├── API_ROUTES.md        # API reference
    ├── ARCHITECTURE.md      # System design
    ├── DATABASE.md          # Schema details
    ├── REDIS.md             # Caching strategy
    ├── QUEUE.md             # Message patterns
    └── MIDDLEWARE.md        # Error handling
```

---

## 📖 Documentation

### Comprehensive Guides

- **[API Routes](docs/API_ROUTES.md)** - Complete API endpoint reference with request/response examples
- **[Architecture](docs/ARCHITECTURE.md)** - System design, design patterns, and folder structure
- **[Database](docs/DATABASE.md)** - MongoDB schemas, relationships, and indexes
- **[Redis](docs/REDIS.md)** - Caching strategy, key patterns, and TTL management
- **[RabbitMQ](docs/QUEUE.md)** - Message queue patterns and async operations
- **[Middleware](docs/MIDDLEWARE.md)** - JWT authentication and error handling

---

## 🔨 Development

### Running in Development Mode

```bash
npm run dev
```

Uses nodemon for auto-restart on file changes.

### Running Tests

```bash
npm test
```

*(Tests to be implemented)*

### Linting

```bash
npm run lint
```

*(ESLint configuration to be added)*

### Database Migrations

No migrations needed (MongoDB is schemaless). Schema changes are handled by Mongoose defaults.

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use cloud database (MongoDB Atlas)
- [ ] Use cloud Redis (AWS ElastiCache, Redis Cloud)
- [ ] Use cloud RabbitMQ (CloudAMQP, AWS MQ)
- [ ] Set strong `JWT_SECRET` (min 32 chars)
- [ ] Enable HTTPS
- [ ] Set up logging (Winston, Pino)
- [ ] Configure monitoring (PM2, New Relic)
- [ ] Set up CI/CD pipeline
- [ ] Enable database backups

### Deploy with PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name typo-api

# Monitor
pm2 monit

# View logs
pm2 logs typo-api

# Restart
pm2 restart typo-api

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### Docker Deployment

```dockerfile
# Dockerfile (example)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
```

```bash
# Build image
docker build -t typo-api .

# Run container
docker run -p 8080:8080 --env-file .env typo-api
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature"
   ```
4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Create a Pull Request**

### Commit Convention

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation update
- `refactor:` Code refactoring
- `test:` Test updates
- `chore:` Build/tooling updates

---

## 📝 License

ISC License

---

## 👥 Support

For questions or issues:
- Open an issue on GitHub
- Check [documentation](docs/)
- Review [API reference](docs/API_ROUTES.md)

---

## 🎉 Acknowledgments

Built with:
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)
- [RabbitMQ](https://www.rabbitmq.com/)
- [JWT](https://jwt.io/)
- [Zod](https://zod.dev/)

---

**Last Updated:** Febuary 2026 
**Version:** 1.0.0  
**Node.js:** 18+
