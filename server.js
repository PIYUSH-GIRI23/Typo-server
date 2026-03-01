import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import { env } from './init/env.js';
import { connectDB, setupDBSignalHandlers, closeConnection } from './init/db.js';
import { connectRedis, setupRedisSignalHandlers , stopRedis } from './init/redis.js';
import leaderboard  from './helper/leaderboardHelper.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.clientUrl,
  credentials: true
}));
app.use(express.json());

app.get('/', async(req, res) => {
  console.log('Generating leaderboard on / request...');
  await leaderboard.generateLeaderboard(); // use crom job later
  console.log('Leaderboard generated successfully.');
  res.json({ 
    status: 'ok', 
    message: 'Typo Server is running', 
    timestamp: new Date().toISOString() 
  });
});

app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(errorMiddleware);

const startServer = async () => {
  try {
    console.log('Connecting to services...');
    await connectDB();
    await connectRedis();
    console.log('All services connected successfully');

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

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down redis server...');
  await stopRedis();
  console.log('✅ Redis server stopped successfully');
  console.log('🛑 Shutting down database connection...');
  await closeConnection();
  console.log('✅ Database connection closed successfully');
  process.exit(0);
});
startServer();