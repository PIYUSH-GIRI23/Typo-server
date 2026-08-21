import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import { env } from './init/env.js';
import { connectDB, setupDBSignalHandlers } from './init/db.js';
import { connectMQ, setupMQSignalHandlers } from './init/queue.js';
import { connectRedis, setupRedisSignalHandlers } from './init/redis.js';
import { loadParagraphsToQueue } from './helper/paragraphLoader.js';
import leaderboard  from './helper/leaderboardHelper.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

// 1. Hide framework details
app.disable('x-powered-by');

// 2. Set security headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:", "http:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    frameguard: { action: 'deny' },
  })
);

// 3. Prevent search engine crawlers from indexing API endpoints
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  next();
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /');
});

// 4. Strict CORS configuration
// Only requests from the client (env.clientUrl, default https://typo.piyx.me) are permitted by default.
// TO ALLOW LOCALHOST / DEV TESTING: Set CLIENT_URL=http://localhost:3000 in your .env file or add local origins below.
const allowedOrigins = [
  'https://typo.piyx.me',
  env.clientUrl ? env.clientUrl.trim().replace(/\/$/, '') : null
].filter(Boolean);


app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy: Origin not allowed.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token'],
  credentials: true,
  maxAge: 86400,
}));

// 5. Payload size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Typo Server is running', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/leaderboard', async (req, res, next) => { // ALTHOUGH , THERE IS A CRON JOB BUT YOU CAN ALSO USE THIS ROUTE TO POPULATE LEADERBOARD
  try {
    const data = await leaderboard.generateLeaderboard();
    res.status(200).json({ 
      status: 'ok', 
      data 
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global 404 Handler
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/leaderboard') {
    return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
  next();
});

app.use(errorMiddleware);


const startServer = async () => {
  try {
    console.log('Connecting to services...');
    await connectDB();
    if (env.isQueueEnabled) {
      await connectMQ();
    } else {
      console.log('⚠️ RabbitMQ connection skipped because isQueueEnabled is false');
    }
    await connectRedis();
    console.log('All services connected successfully');

    setupDBSignalHandlers();
    if (env.isQueueEnabled) {
      setupMQSignalHandlers();
    }
    setupRedisSignalHandlers();

    if (env.isQueueEnabled) {
      console.log('Loading paragraphs into the queue...');
      await loadParagraphsToQueue();
      console.log('Paragraphs loaded into the queue successfully');
    } else {
      console.log('⚠️ Paragraph loading skipped because isQueueEnabled is false');
    }



    // Setup Cron Job for periodic leaderboard refresh
    // Run leaderboard update every 30 minutes (0 and 30 minute mark each hour)
    // cron.schedule('0,30 * * * *', async () => {
    //   try {
    //     console.log('[CRON] Updating leaderboard...');
    //     await leaderboard.generateLeaderboard();
    //   } catch (error) {
    //     console.error('[CRON] Failed to update leaderboard:', error.message);
    //   }
    // });

    // console.log('✓ Cron job scheduled: Leaderboard updates every 30 minutes');

    app.listen(env.port, () => {
      console.log(`✓ Server running on port ${env.port}`);
    });
  } 
  catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();